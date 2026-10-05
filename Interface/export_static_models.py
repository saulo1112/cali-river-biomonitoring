"""
Export the three deployed models to plain JSON so the interface can run
entirely in the browser (GitHub Pages has no Python backend).

Reads  ../models/<name>.pkl + <name>_meta.json   (written by the FINAL notebooks)
Writes static/data/models.json                   (parameters used by engine.js)
       tests/parity_cases.json                   (Python reference predictions)

Run again whenever a notebook re-exports a model:

    python Interface/export_static_models.py
    node Interface/tests/test_parity.js           # JS engine == Python models
"""

import json
import os
import warnings

import joblib
import numpy as np
from skfuzzy import control as ctrl

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "models"))
OUT_MODELS = os.path.join(BASE_DIR, "static", "data", "models.json")
OUT_PARITY = os.path.join(BASE_DIR, "tests", "parity_cases.json")

MODEL_NAMES = ["svr_bmwp", "fuzzy_perlidae", "lr_helicopsychidae"]
N_PARITY = 40  # random test inputs per model
rng = np.random.default_rng(42)


def load(name):
    with open(os.path.join(MODELS_DIR, f"{name}_meta.json"), encoding="utf-8") as fh:
        meta = json.load(fh)
    return joblib.load(os.path.join(MODELS_DIR, f"{name}.pkl")), meta


def num(a, ndigits=9):
    return [round(float(v), ndigits) for v in np.ravel(a)]


def export_svr(pipe, meta):
    scaler, svr = pipe.named_steps["scaler"], pipe.named_steps["svr"]
    assert svr.kernel == "rbf" and svr.gamma == "auto", "engine.js implements RBF, gamma='auto'"
    return {
        "mean": num(scaler.mean_), "scale": num(scaler.scale_),
        "gamma": 1.0 / svr.n_features_in_,
        "support_vectors": [num(v) for v in svr.support_vectors_],
        "dual_coef": num(svr.dual_coef_), "intercept": float(svr.intercept_[0]),
    }


def export_logistic(pipe, meta):
    scaler, lr = pipe.named_steps["scaler"], pipe.named_steps["lr"]
    return {
        "mean": num(scaler.mean_), "scale": num(scaler.scale_),
        "coef": num(lr.coef_), "intercept": float(lr.intercept_[0]),
    }


def export_fuzzy(system, meta):
    """Sampled membership functions + rule base (min/max inference, centroid)."""
    def terms(var):
        return {t: num(v.mf, 6) for t, v in var.terms.items()}

    order = list(meta["predictors"])
    ants = {a.label: {"universe": [float(a.universe.min()), float(a.universe.max()),
                                   float(a.universe[1] - a.universe[0])],
                      "terms": terms(a)} for a in system.antecedents}
    assert set(ants) == set(order)
    cons = next(iter(system.consequents))
    rules = []
    for r in system.rules:
        antecedent = {t.parent.label: t.label for t in r.antecedent_terms}
        assert set(antecedent) == set(order), "engine.js supports AND-only rules (one term per input)"
        assert r.consequent[0].weight == 1.0, "engine.js assumes unit rule weights"
        rules.append({"if": [antecedent[o] for o in order], "then": r.consequent[0].term.label})
    return {
        "inputs": order,
        "antecedents": ants,
        "consequent": {"universe": num(cons.universe, 6), "terms": terms(cons)},
        "rules": rules,
        "present_term": "Presente",
        "threshold": meta.get("threshold", 0.5),
    }


def python_predict(name, model, meta, inputs):
    """Reference prediction, mirrors app.py."""
    xs = [inputs[p] for p in meta["predictors"]]
    if meta["model_type"] == "FuzzyMamdani":
        sim = ctrl.ControlSystemSimulation(model)
        for p, x in zip(meta["predictors"], xs):
            sim.input[p] = x
        sim.compute()
        # No rule fires for some inputs (sparse rule base): skfuzzy sets no output.
        out = sim.output.get(meta["consequent_name"])
        return None if out is None else float(out)
    X = np.array([xs])
    if meta["model_type"] == "LogisticRegression":
        return float(model.predict_proba(X)[0, 1])
    return float(model.predict(X)[0])


def main():
    out, parity = {}, {}
    for name in MODEL_NAMES:
        model, meta = load(name)
        exporter = {"SVR": export_svr, "LogisticRegression": export_logistic,
                    "FuzzyMamdani": export_fuzzy}[meta["model_type"]]
        out[name] = {
            "model_type": meta["model_type"], "target": meta["target"],
            "predictors": meta["predictors"], "units": meta["units"],
            "ranges": meta["ranges"], "metrics": meta["metrics"],
            "params": exporter(model, meta),
        }
        cases = []
        for _ in range(N_PARITY):
            inputs = {p: float(rng.uniform(*meta["ranges"][p])) for p in meta["predictors"]}
            cases.append({"inputs": inputs, "expected": python_predict(name, model, meta, inputs)})
        parity[name] = cases
        print(f"exported {name:20s} ({meta['model_type']})")

    os.makedirs(os.path.dirname(OUT_MODELS), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_PARITY), exist_ok=True)
    with open(OUT_MODELS, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
    with open(OUT_PARITY, "w", encoding="utf-8") as fh:
        json.dump(parity, fh, indent=1)
    print(f"-> {OUT_MODELS} ({os.path.getsize(OUT_MODELS) / 1024:.0f} KB)")
    print(f"-> {OUT_PARITY}")


if __name__ == "__main__":
    main()
