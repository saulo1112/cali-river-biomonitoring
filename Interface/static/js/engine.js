/* ===========================================================================
   Cali River Biomonitoring — in-browser inference engine.

   Re-implements, from the parameters in static/data/models.json, the three
   deployed models so the interface runs without a Python backend:

     SVR            sklearn Pipeline(StandardScaler, SVR(rbf, gamma='auto'))
     Logistic       sklearn Pipeline(StandardScaler, LogisticRegression)
     FuzzyMamdani   scikit-fuzzy ControlSystem (min AND, max aggregation,
                    centroid defuzzification)

   Parity with the Python models is checked by tests/test_parity.js.
   =========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const BMWP_CLASSES = [
    { max: 15, key: "veryCritical" },
    { max: 35, key: "critical" },
    { max: 60, key: "doubtful" },
    { max: 100, key: "acceptable" },
    { max: 120, key: "good" },
  ];

  /** BMWP/Col value -> Roldán quality class key (integer ranges 0-15, 16-35, ...;
   *  the value is rounded first so fractional predictions don't fall in the gaps). */
  function bmwpClass(value) {
    const v = Math.round(value);
    for (const c of BMWP_CLASSES) if (v <= c.max) return c.key;
    return "good";
  }

  /* ---- SVR (RBF) -------------------------------------------------------- */
  function predictSVR(p, x) {
    const z = x.map((v, i) => (v - p.mean[i]) / p.scale[i]);
    let sum = p.intercept;
    for (let i = 0; i < p.support_vectors.length; i++) {
      let d2 = 0;
      for (let j = 0; j < z.length; j++) d2 += (z[j] - p.support_vectors[i][j]) ** 2;
      sum += p.dual_coef[i] * Math.exp(-p.gamma * d2);
    }
    return sum;
  }

  /* ---- Logistic regression: P(class = 1) -------------------------------- */
  function predictLogistic(p, x) {
    let s = p.intercept;
    for (let i = 0; i < x.length; i++) s += p.coef[i] * ((x[i] - p.mean[i]) / p.scale[i]);
    return 1 / (1 + Math.exp(-s));
  }

  /* ---- Fuzzy Mamdani ---------------------------------------------------- */
  // Linear interpolation of a sampled membership function (skfuzzy interp_membership).
  function membership(ant, term, x) {
    const [lo, hi, step] = ant.universe;
    const mf = ant.terms[term];
    x = Math.min(hi, Math.max(lo, x));
    const pos = (x - lo) / step;
    const i = Math.min(mf.length - 2, Math.floor(pos));
    const f = pos - i;
    return mf[i] + (mf[i + 1] - mf[i]) * f;
  }

  // skfuzzy.defuzzify.centroid (trapezoid-exact moments).
  function centroid(x, y) {
    let moment = 0, area = 0;
    for (let i = 1; i < x.length; i++) {
      const x1 = x[i - 1], x2 = x[i], y1 = y[i - 1], y2 = y[i];
      if ((y1 === 0 && y2 === 0) || x1 === x2) continue;
      let m, a;
      if (y1 === y2) { m = 0.5 * (x1 + x2); a = (x2 - x1) * y1; }
      else if (y1 === 0) { m = (2 * (x2 - x1)) / 3 + x1; a = 0.5 * (x2 - x1) * y2; }
      else if (y2 === 0) { m = (x2 - x1) / 3 + x1; a = 0.5 * (x2 - x1) * y1; }
      else {
        m = (2 * (x2 - x1) * (y2 + 0.5 * y1)) / (3 * (y1 + y2)) + x1;
        a = 0.5 * (x2 - x1) * (y1 + y2);
      }
      moment += m * a; area += a;
    }
    return area === 0 ? null : moment / area;
  }

  // Universe points where a membership function crosses level y
  // (skfuzzy _interp_universe_fast).
  function cutPoints(u, mf, y) {
    const pts = [];
    for (let i = 0; i < u.length - 1; i++) {
      const crosses = y === 0 ? (mf[i] > y) !== (mf[i + 1] > y) : (mf[i] >= y) !== (mf[i + 1] >= y);
      if (crosses) pts.push(u[i] + ((y - mf[i]) * (u[i + 1] - u[i])) / (mf[i + 1] - mf[i]));
    }
    return pts;
  }

  /** Crisp output in [0,1], or null when no rule fires (rule base is sparse). */
  function predictFuzzy(p, x) {
    const u = p.consequent.universe;
    // Activation: AND = min over antecedents; accumulation per output term = max over rules.
    const cuts = {};
    for (const rule of p.rules) {
      let w = Infinity;
      rule.if.forEach((term, i) => {
        w = Math.min(w, membership(p.antecedents[p.inputs[i]], term, x[i]));
      });
      cuts[rule.then] = Math.max(cuts[rule.then] === undefined ? 0 : cuts[rule.then], w);
    }
    // skfuzzy refines the output universe with the points where each clipped
    // term meets its cut, so the centroid is exact for the trapezoid shapes.
    const grid = new Set(u);
    for (const [term, cut] of Object.entries(cuts)) {
      for (const pt of cutPoints(u, p.consequent.terms[term], cut)) grid.add(pt);
    }
    const xs = Array.from(grid).sort((a, b) => a - b);
    const ys = xs.map((xv) => {
      let y = 0;
      for (const [term, cut] of Object.entries(cuts)) {
        y = Math.max(y, Math.min(cut, membership({ universe: [u[0], u[u.length - 1], u[1] - u[0]], terms: p.consequent.terms }, term, xv)));
      }
      return y;
    });
    return centroid(xs, ys);
  }

  /**
   * Predict with one exported model.
   * @param {object} model  entry of models.json
   * @param {object} inputs {predictor: value}
   * @returns raw output: BMWP value | probability | fuzzy crisp (null = undetermined)
   */
  function predictRaw(model, inputs) {
    const x = model.predictors.map((n) => Number(inputs[n]));
    switch (model.model_type) {
      case "SVR": return predictSVR(model.params, x);
      case "LogisticRegression": return predictLogistic(model.params, x);
      case "FuzzyMamdani": return predictFuzzy(model.params, x);
      default: throw new Error(`Unknown model type: ${model.model_type}`);
    }
  }

  /** Language-neutral prediction result consumed by the UI. */
  function predict(model, inputs) {
    const raw = predictRaw(model, inputs);
    if (model.model_type === "SVR") {
      const value = Math.max(0, Math.min(120, raw));
      const mae = model.metrics.mae;
      return {
        kind: "numeric",
        value: Math.round(value * 10) / 10,
        interval: [Math.max(0, value - mae), Math.min(120, value + mae)].map((v) => Math.round(v * 10) / 10),
        classKey: bmwpClass(value),
      };
    }
    if (raw === null) return { kind: "binary", undetermined: true };
    const threshold = model.params.threshold !== undefined ? model.params.threshold : 0.5;
    return {
      kind: "binary",
      score: Math.round(raw * 1000) / 1000,
      positive: raw >= threshold,
    };
  }

  return { predict, predictRaw, bmwpClass };
});
