"""
Cali River Biomonitoring — prediction interface (Flask backend).

Serves three deployed models exported from the analysis notebooks:
    - svr_bmwp           : ε-SVR, BMWP/Col index (numerical + quality class)
    - fuzzy_perlidae     : Fuzzy logic (Approach E), Perlidae presence/absence
    - lr_helicopsychidae : Logistic regression, Helicopsychidae presence/absence

Models live in ../models as <name>.pkl + <name>_meta.json. Each artefact is
cached in memory and AUTOMATICALLY RELOADED whenever its .pkl file is modified
(e.g. after re-executing a notebook), so the interface always serves the latest
trained model without restarting the server.
"""

import os
import json

import numpy as np
import joblib
from flask import Flask, request, jsonify, send_from_directory
from skfuzzy import control as ctrl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "models"))

# Registry of deployable models (file stem -> human label fallback)
MODEL_NAMES = ["svr_bmwp", "fuzzy_perlidae", "lr_helicopsychidae"]

app = Flask(__name__, static_folder="static")

# In-memory cache: name -> {model, meta, mtime}
_cache = {}


def _paths(name):
    return (os.path.join(MODELS_DIR, f"{name}.pkl"),
            os.path.join(MODELS_DIR, f"{name}_meta.json"))


def load(name):
    """Load a model + metadata, reloading from disk if the .pkl changed."""
    if name not in MODEL_NAMES:
        raise KeyError(name)
    pkl_path, meta_path = _paths(name)
    if not os.path.exists(pkl_path):
        raise FileNotFoundError(pkl_path)
    mtime = os.path.getmtime(pkl_path)
    cached = _cache.get(name)
    if cached is None or cached["mtime"] != mtime:
        with open(meta_path, "r", encoding="utf-8") as fh:
            meta = json.load(fh)
        _cache[name] = {"model": joblib.load(pkl_path), "meta": meta, "mtime": mtime}
    return _cache[name]


def classify_bmwp(value, classes):
    """Map a continuous BMWP value to its quality-class label using meta ranges."""
    for rng, label in classes.items():
        lo, hi = (float(x) for x in rng.split("-"))
        if lo <= value <= hi:
            return label
    return "Fuera de rango"


def predict_fuzzy(control_system, meta, inputs):
    """Run a fresh fuzzy simulation (skfuzzy sims accumulate state per call)."""
    sim = ctrl.ControlSystemSimulation(control_system)
    for p in meta["predictors"]:
        sim.input[p] = float(inputs[p])
    sim.compute()
    crisp = float(sim.output[meta["consequent_name"]])
    present = crisp >= meta.get("threshold", 0.5)
    return crisp, present


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/api/models")
def api_models():
    """Return metadata for every available model (drives the UI cards/sliders)."""
    out = {}
    for name in MODEL_NAMES:
        try:
            out[name] = load(name)["meta"]
        except FileNotFoundError:
            out[name] = None  # notebook not yet executed
    return jsonify(out)


@app.route("/api/meta/<name>")
def api_meta(name):
    try:
        return jsonify(load(name)["meta"])
    except (KeyError, FileNotFoundError):
        return jsonify({"error": f"Model '{name}' not available. Run its notebook first."}), 404


@app.route("/api/predict", methods=["POST"])
def api_predict():
    data = request.get_json(force=True)
    name = data.get("model")
    inputs = data.get("inputs", {})
    try:
        entry = load(name)
    except (KeyError, FileNotFoundError):
        return jsonify({"error": f"Model '{name}' not available. Run its notebook first."}), 404

    model, meta = entry["model"], entry["meta"]

    # Validate inputs
    missing = [p for p in meta["predictors"] if p not in inputs or inputs[p] in ("", None)]
    if missing:
        return jsonify({"error": f"Faltan valores para: {', '.join(missing)}"}), 400

    result = {"target": meta["target"], "display_name": meta.get("display_name", meta["target"])}

    if meta["model_type"] == "FuzzyMamdani":
        crisp, present = predict_fuzzy(model, meta, inputs)
        result["score"] = round(crisp, 3)
        result["class"] = meta["classes"]["1"] if present else meta["classes"]["0"]
        result["positive"] = bool(present)

    elif meta["model_type"] == "LogisticRegression":
        X = np.array([[float(inputs[p]) for p in meta["predictors"]]])
        pred = int(model.predict(X)[0])
        proba = float(model.predict_proba(X)[0, 1])
        result["score"] = round(proba, 3)
        result["class"] = meta["classes"][str(pred)]
        result["positive"] = bool(pred == 1)

    else:  # SVR (regression) -> numerical BMWP + quality class
        X = np.array([[float(inputs[p]) for p in meta["predictors"]]])
        raw = float(model.predict(X)[0])
        raw = max(0.0, min(120.0, raw))  # clamp to BMWP/Col scale
        result["value"] = round(raw, 1)
        result["class"] = classify_bmwp(raw, meta["classes"])

    return jsonify(result)


if __name__ == "__main__":
    print("Models directory:", MODELS_DIR)
    print("Available:", [n for n in MODEL_NAMES if os.path.exists(_paths(n)[0])])
    app.run(debug=True, port=5000)
