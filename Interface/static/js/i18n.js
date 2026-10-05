/* ===========================================================================
   Cali River Biomonitoring — translations (Spanish / English).
   Static text in index.html is tagged with data-i18n="key" (textContent) or
   data-i18n-html="key" (innerHTML, trusted strings only). Dynamic text built
   in app.js uses I18N.t(key, vars).
   =========================================================================== */
const I18N = (() => {
  const SUPPORTED = ["es", "en"];

  const DICT = {
    es: {
      "page.title": "Biomonitoreo del Río Cali",
      "page.description": "Predicción en el navegador de la calidad hidrobiológica del Río Cali (BMWP/Col y presencia de Perlidae y Helicopsychidae) a partir de variables fisicoquímicas.",
      "lang.label": "Idioma",
      "hero.badge": "Río Cali · Biomonitoreo",
      "hero.title": "Predicción de la calidad ecológica del agua",
      "hero.subtitle": "Modelos validados con LOOCV anidado para el índice BMWP/Col y la presencia de macroinvertebrados bioindicadores.",
      "hero.refNote": "Para imágenes taxonómicas de referencia de las familias bioindicadoras, consulte los recursos externos a continuación.",
      "step1.title": "¿Qué desea predecir?",
      "step2.title": "Parámetros fisicoquímicos",
      "predict": "Predecir",

      "card.svr_bmwp.title": "Índice BMWP/Col",
      "card.svr_bmwp.sub": "Valor numérico + clase de calidad",
      "card.fuzzy_perlidae.title": "Perlidae",
      "card.lr_helicopsychidae.title": "Helicopsychidae",
      "card.binary.sub": "Presencia / ausencia",

      "model.svr_bmwp": "ε-SVR — Índice BMWP/Col",
      "model.fuzzy_perlidae": "Lógica difusa de Mamdani — Perlidae",
      "model.lr_helicopsychidae": "Regresión logística — Helicopsychidae",

      "pred.Dureza": "Dureza total",
      "pred.Turbiedad": "Turbiedad",
      "pred.DBO5": "DBO₅",
      "pred.Caudal": "Caudal",
      "pred.SDT": "SDT",
      "pred.OD": "OD",
      "pred.Magnesio": "Magnesio",
      "pred.COT": "COT",

      "input.note": "Modelo: {model}. Ajuste los predictores y pulse «Predecir». Los rangos corresponden a los datos de calibración, por lo que no es posible extrapolar.",
      "foot.stamp": "{model} · Validación LOOCV anidada",

      "result.label": "Resultado · {model}",
      "result.interval": "Rango estimado: {lo} – {hi}",
      "result.caption": "Basado en el error validado del modelo (± MAE); trate la clase como aproximada.",
      "result.score.prob": "Probabilidad de presencia: <b>{score}</b>",
      "result.score.fuzzy": "Salida difusa (0 = ausente, 1 = presente): <b>{score}</b>",
      "result.metrics.numeric": "Desempeño validado (LOOCV anidado): MAE <b>{mae}</b> · ρₛ de Spearman <b>{rs}</b> · exactitud en 5 clases <b>{acc} %</b>",
      "result.metrics.binary": "Desempeño validado (LOOCV anidado): κ de Cohen <b>{kappa}</b> · exactitud <b>{acc} %</b> · F1 <b>{f1}</b>",
      "result.undetermined.title": "Indeterminado",
      "result.undetermined.body": "Ninguna regla difusa se activa con esta combinación de valores: queda fuera de la cobertura de la base de reglas calibrada con 18 registros. Pruebe otra combinación.",

      "class.veryCritical": "Muy crítica",
      "class.critical": "Crítica",
      "class.doubtful": "Dudosa",
      "class.acceptable": "Aceptable",
      "class.good": "Buena",
      "class.present": "Presencia",
      "class.absent": "Ausencia",

      "error.title": "Error",
      "error.load": "No se pudieron cargar los modelos. Si abrió el archivo directamente (file://), sírvalo con un servidor HTTP, p. ej. «python -m http.server» dentro de Interface/.",

      "foot.disclaimer": "Herramienta de investigación para tamizaje, calibrada con n = 18 registros de 9 estaciones del Río Cali (2021–2022). No debe usarse en otras cuencas, épocas o años sin recalibración, ni como sustituto de un muestreo biológico completo.",
      "foot.links": "Código, notebooks y resultados",
      "foot.paper": "Cita: Quiñones-Góngora & Holguín-González (2026), Universidad Autónoma de Occidente.",
    },

    en: {
      "page.title": "Cali River Biomonitoring",
      "page.description": "In-browser prediction of the hydrobiological water quality of the Cali River (BMWP/Col and presence of Perlidae and Helicopsychidae) from physicochemical variables.",
      "lang.label": "Language",
      "hero.badge": "Cali River · Biomonitoring",
      "hero.title": "Ecological Water Quality Prediction",
      "hero.subtitle": "Models validated with nested LOOCV for the BMWP/Col index and the presence of bioindicator macroinvertebrates.",
      "hero.refNote": "For taxonomic reference images of the bioindicator families, consult the external resources below.",
      "step1.title": "What do you want to predict?",
      "step2.title": "Physicochemical parameters",
      "predict": "Predict",

      "card.svr_bmwp.title": "BMWP/Col Index",
      "card.svr_bmwp.sub": "Numerical value + quality class",
      "card.fuzzy_perlidae.title": "Perlidae",
      "card.lr_helicopsychidae.title": "Helicopsychidae",
      "card.binary.sub": "Presence / absence",

      "model.svr_bmwp": "ε-SVR — BMWP/Col Index",
      "model.fuzzy_perlidae": "Mamdani fuzzy inference — Perlidae",
      "model.lr_helicopsychidae": "Logistic regression — Helicopsychidae",

      "pred.Dureza": "Total hardness",
      "pred.Turbiedad": "Turbidity",
      "pred.DBO5": "BOD₅",
      "pred.Caudal": "Flow rate",
      "pred.SDT": "TDS",
      "pred.OD": "DO",
      "pred.Magnesio": "Magnesium",
      "pred.COT": "TOC",

      "input.note": "Model: {model}. Adjust the predictors and click “Predict”. Ranges match the calibration data, so extrapolation is not possible.",
      "foot.stamp": "{model} · Nested LOOCV validation",

      "result.label": "Result · {model}",
      "result.interval": "Estimated range: {lo} – {hi}",
      "result.caption": "Based on the validated model error (± MAE); treat the class label as approximate.",
      "result.score.prob": "Probability of presence: <b>{score}</b>",
      "result.score.fuzzy": "Fuzzy output (0 = absent, 1 = present): <b>{score}</b>",
      "result.metrics.numeric": "Validated performance (nested LOOCV): MAE <b>{mae}</b> · Spearman ρₛ <b>{rs}</b> · 5-class accuracy <b>{acc} %</b>",
      "result.metrics.binary": "Validated performance (nested LOOCV): Cohen’s κ <b>{kappa}</b> · accuracy <b>{acc} %</b> · F1 <b>{f1}</b>",
      "result.undetermined.title": "Undetermined",
      "result.undetermined.body": "No fuzzy rule fires for this combination of values: it lies outside the coverage of the rule base calibrated on 18 records. Try a different combination.",

      "class.veryCritical": "Very Critical",
      "class.critical": "Critical",
      "class.doubtful": "Doubtful",
      "class.acceptable": "Acceptable",
      "class.good": "Good",
      "class.present": "Present",
      "class.absent": "Absent",

      "error.title": "Error",
      "error.load": "Could not load the models. If you opened the file directly (file://), serve it over HTTP, e.g. “python -m http.server” inside Interface/.",

      "foot.disclaimer": "Research screening tool calibrated on n = 18 records from 9 Cali River stations (2021–2022). Do not use it for other basins, seasons or years without recalibration, or as a substitute for a full biological survey.",
      "foot.links": "Code, notebooks and results",
      "foot.paper": "Cite: Quiñones-Góngora & Holguín-González (2026), Universidad Autónoma de Occidente.",
    },
  };

  const STORAGE_KEY = "cali-biomonitoring-lang";
  let lang = "en";

  function detect() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.includes(saved)) return saved;
    } catch (_) { /* storage unavailable */ }
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : "en";
  }

  function t(key, vars) {
    const raw = (DICT[lang] && DICT[lang][key]) ?? DICT.en[key] ?? key;
    return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`)) : raw;
  }

  /** Locale-aware number formatting (decimal comma in Spanish). */
  function num(value, digits = 2) {
    return new Intl.NumberFormat(lang, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
  }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = t("page.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("page.description"));
    document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((n) => { n.innerHTML = t(n.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-aria]").forEach((n) => { n.setAttribute("aria-label", t(n.dataset.i18nAria)); });
    document.querySelectorAll(".lang-btn").forEach((b) => {
      const on = b.dataset.lang === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function set(next, onChange) {
    if (!SUPPORTED.includes(next)) return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* ignore */ }
    applyStatic();
    if (onChange) onChange(lang);
  }

  function init() { lang = detect(); applyStatic(); }

  return { init, set, t, num, get lang() { return lang; } };
})();
