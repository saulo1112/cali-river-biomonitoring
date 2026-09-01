# Cali River Biomonitoring — Ecological Water Quality Modelling

Machine learning models for predicting the hydrobiological water quality of the
**Cali River** (Valle del Cauca, Colombia) from routine physicochemical
measurements, using aquatic macroinvertebrates as bioindicators. This repository
holds the complete analysis behind the article *"A comparative machine learning
framework for water quality and habitat suitability modelling under severe data
scarcity in the Cali River, Colombia"* (Quiñones-Góngora & Holguín-González,
Universidad Autónoma de Occidente) — five modelling techniques, one validation
protocol, three prediction targets, evaluated on 18 records from 9 monitoring
stations.

**The analysis is finished.** Every notebook has been run to completion, the
three winning models are exported and served through a working prediction
interface, and the results below are the ones reported in the manuscript
(`docs/`).

## Table of contents

- [Study context](#study-context)
- [Data](#data)
- [What was predicted](#what-was-predicted)
- [Why "nested" cross-validation](#why-nested-cross-validation)
- [Results](#results)
- [What the models are (and are not) good for](#what-the-models-are-and-are-not-good-for)
- [Notebooks](#notebooks)
- [Repository structure](#repository-structure)
- [Prediction interface](#prediction-interface)
- [Reproducing the analysis](#reproducing-the-analysis)
- [Citation](#citation)

---

## Study context

The Cali River is an urban tropical river in Valle del Cauca, Colombia. As it
descends from the Farallones de Cali into the city, it comes under increasing
pressure from human activity, visible in both its physicochemical condition and
in a simplified benthic macroinvertebrate community. This project asks a
practical question on behalf of a resource-constrained monitoring programme:
**given only routine physicochemical measurements, and only a handful of
monitoring stations, can water quality and the presence of pollution-sensitive
species be predicted well enough to be useful?**

The honest answer, established by measurement rather than assumption, differs
by target — see [Results](#results).

## Data

- **Source:** Corporación Autónoma Regional del Valle del Cauca (CVC), collected
  under the Cali River Water Resource Management Plan (2021–2022).
- **Sample size: n = 18 records from 9 monitoring stations**, each sampled once
  in the dry season and once in the rainy season. This is the hard constraint
  that shapes every methodological decision in this project — see
  [Why "nested" cross-validation](#why-nested-cross-validation).
- **Two datasets** go in `data/` (not version-controlled; request from the
  authors or CVC):
  - `DB - Macroinvertebrados.xlsx` — physicochemical predictors plus binary
    presence/absence of `Perlidae` and `Trichoptera` (Helicopsychidae).
  - `Database - BMWP.xlsx` — physicochemical predictors plus the continuous
    `BMWP` index per station.
- **Candidate predictors** (original column names, all directly measured
  quantities — no derived or composite variables are used): `OD` (dissolved
  oxygen), `DBO5` (BOD₅), `SDT` (total dissolved solids), `Turbiedad`
  (turbidity), `Conductividad` (conductivity), `COT` (total organic carbon),
  `Dureza` (total hardness), `Magnesio` (magnesium), `Caudal` (flow rate).

## What was predicted

- **Two bioindicator taxa** (binary presence/absence): *Plecoptera: Perlidae*
  (present in 6 of 18 records) and *Trichoptera: Helicopsychidae* (present in
  3 of 18) — pollution-sensitive families selected for their high BMWP/Col
  sensitivity scores.
- **The BMWP/Col index** (Biological Monitoring Working Party, Colombian
  adaptation), treated two ways: as a continuous 0–120 value, and as the five
  ordered Roldán quality classes:

  | Range | Class |
  |-------|-------|
  | 0 – 15 | Very Critical |
  | 16 – 35 | Critical |
  | 36 – 60 | Doubtful |
  | 61 – 100 | Acceptable |
  | 101 – 120 | Good |

Five techniques were compared under one shared protocol: Mamdani **fuzzy
inference**, **logistic regression**, **classification trees**, **negative
binomial regression**, and **ε-support vector regression (ε-SVR)**.

## Why "nested" cross-validation

With only 18 records, the biggest risk to an honest result is not a weak model —
it's a validation shortcut. If a predictor is chosen by looking at *all* 18
records, and the model is then tested on those same records, the test is no
longer a fair one: the model has already been shaped by the very data used to
judge it.

**Nested leave-one-out cross-validation (nested LOOCV)** avoids this. For each
of the 18 stations in turn, that one record is set aside, and *every*
data-dependent decision — which predictors to use, how to shape a fuzzy rule,
which hyperparameters to tune — is made using only the other 17 records. Only
then is the held-out record predicted. This is repeated 18 times so every
station gets exactly one honest, out-of-sample prediction.

This project also measured what the shortcut would have cost: re-running the
same models with predictors chosen once on all 18 records (instead of inside
each fold) inflated Cohen's κ by up to **0.214** in five of six matched
comparisons — a difference large enough to change which technique looks best.
That gap is reported in the manuscript as a result in its own right, not just
a methodological footnote.

## Results

All headline numbers below come from nested LOOCV — the honest, out-of-sample
estimate — and match the manuscript exactly.

### BMWP/Col — ε-SVR (RBF kernel)

The strongest BMWP model is an ε-SVR with a single predictor, **total hardness**
(`Dureza`, mg/L CaCO₃).

| Metric | Value |
|--------|-------|
| MAE | 23.71 BMWP points |
| RMSE | 31.60 |
| R² | −0.028 |
| Spearman ρₛ | 0.430 (p = 0.075) |
| 5-class accuracy | 55.6 % (κ = 0.258) |

**How to read this.** R² near zero means the model does **not** reproduce the
exact numerical value of BMWP/Col — with 18 records and one predictor, that
problem is essentially unsolvable, and no other technique tested did better
(negative binomial regression scored R² = −0.270). What the model *does*
recover is the **ordering** of stations along the pollution gradient
(ρₛ = 0.430): it can rank sites from most to least degraded well enough to help
decide where a full biological survey is worth the cost, even though it cannot
be trusted to output a precise index value. Five-class BMWP/Col prediction
itself is structurally out of reach at this sample size — see
[Limitations](#what-the-models-are-and-are-not-good-for).

### Perlidae presence/absence — Fuzzy Mamdani inference (Approach C)

A fuzzy rule-based system with membership functions fitted per fold via Fuzzy
C-Means, using three predictors: **turbidity, BOD₅, and total dissolved
solids**.

| Metric | Value |
|--------|-------|
| Accuracy | 72.2 % |
| F1 | 0.768 |
| Cohen's κ | 0.516 |

This is the strongest result across all three targets, and the most credible
one: two other, unrelated techniques (logistic regression and classification
trees) independently converge on κ between 0.483 and 0.500 using the exact
same three predictors, selected unanimously in all 18 cross-validation folds.
Agreement of that kind across three different model families is unlikely to be
a coincidence at this sample size.

### Helicopsychidae presence/absence — Logistic regression

A single-predictor logistic regression on **flow rate** (`Caudal`, m³/s), with
class-balanced weighting.

| Metric | Value |
|--------|-------|
| Accuracy | 55.6 % |
| F1 | 0.500 |
| Cohen's κ | 0.111 |

κ = 0.111 is only *slight* agreement — this is the weakest of the three
results, and is reported as the best *available* answer for a taxon present in
just 3 of 18 records, not as an adequate one. A classification tree on the same
data reaches 77.8 % accuracy but κ = −0.091: it has simply learned to always
predict "absent", which happens to be right most of the time under this
imbalance. This contrast — high accuracy with negative κ — is the clearest
illustration in the whole study of why **Cohen's κ, not accuracy, is the
primary metric** whenever classes are imbalanced.

### Overall comparison

| Target | Winning technique | Predictor(s) | Accuracy | κ |
|--------|-------------------|--------------|----------|---|
| BMWP/Col (numerical + class) | ε-SVR (RBF) | Hardness | 55.6 % | 0.258 |
| Perlidae (presence/absence) | Fuzzy Mamdani | Turbidity, BOD₅, TDS | 72.2 % | 0.516 |
| Helicopsychidae (presence/absence) | Logistic regression | Flow rate | 55.6 % | 0.111 |

No single technique won across every target — matching the model to the
problem mattered more than picking a "best" algorithm. Hardness and flow rate
were the two most consistently informative predictors across every technique
that used them.

## What the models are (and are not) good for

**Reasonable uses:**
- **Screening / triage.** Flagging whether a routine physicochemical sample is
  consistent with critical or acceptable water quality, to help prioritise
  which stations warrant a full (expensive, slow) biological survey next.
- **Habitat-suitability signal for *Perlidae*.** κ = 0.516 with three
  independently converging techniques is a credible, moderate-agreement signal
  for conservation or restoration prioritisation.
- **Identifying where monitoring effort pays off.** The predictors that
  survived nested selection — hardness, flow, BOD₅, turbidity, total dissolved
  solids — are the variables future sampling campaigns should prioritise
  measuring consistently.
- **A transferable protocol**, not just a set of models. The nested LOOCV
  procedure used here requires no specialised infrastructure and can be applied
  to any small-n river-monitoring dataset by substituting the response and
  predictor columns.

**Known limits — read before using the models for anything operational:**
- **n = 18 is not n = 18 independent stations.** They are 9 stations sampled
  twice; the number of truly independent units is 9. Reported metrics should be
  read as upper bounds, not unbiased estimates.
- **Five-class BMWP/Col prediction is not achievable at this sample size.**
  With only one "Good"-class station, no model can learn a class it has never
  seen; the models tested predict at most 3–4 of the 5 classes. Use the
  numerical estimate and its ±23.7-point band, not a hard class label, for
  anything downstream.
- **No spatial or temporal transfer.** These models are calibrated on one
  river, over one year. Do not apply them to a different basin, season, or
  year without recalibration.
- **A single reclassified record can move κ by more than 0.10** at this sample
  size. Comparative statements in the manuscript are directional, not
  statistically established — no confidence intervals are reported, because at
  n = 18 they would be uninformatively wide.
- **The Perlidae logistic model uses 3 predictors on 6 presence events**
  (EPV = 2.0, well below the conventional floor of 5–10); its coefficients are
  not interpretable as effect sizes.

The full discussion of these limitations — eight in total — is in Section 5 of
the manuscript.

---

## Notebooks

Each notebook documents its own methodology and is independently reproducible
(relative paths, fixed random seeds). The three marked **FINAL** are the ones
whose output is exported to `models/` and served by the prediction interface.

| Notebook | Technique | Target(s) | Role |
|----------|-----------|------------|------|
| `01_fuzzy_logic/01a_fuzzy_design_comparison.ipynb` | Fuzzy inference | BMWP, Perlidae, Helicopsychidae | Compares 4 leakage-controlled fuzzy configurations (A–D) to select the antecedent design |
| `01_fuzzy_logic/01b_fuzzy_final.ipynb` | Fuzzy Mamdani (FCM) | BMWP, Perlidae, Helicopsychidae | **FINAL** — winning model for **Perlidae** |
| `02_logistic_regression/02_logistic_regression.ipynb` | Logistic regression | Perlidae, Helicopsychidae | **FINAL** — winning model for **Helicopsychidae** |
| `03_classification_trees/03_classification_trees.ipynb` | CART (depth 3) | Perlidae, Helicopsychidae | Comparison technique — modal-fold trees shown for interpretation |
| `04_negative_binomial/04_negative_binomial_regression.ipynb` | Negative binomial GLM | BMWP | Comparison technique for BMWP numerical prediction |
| `05_svr_bmwp/05_svr_bmwp.ipynb` | ε-SVR (RBF kernel) | BMWP | **FINAL** — winning model for **BMWP/Col** |
| `06_bmwp_simulation/05_bmwp_spearman_validation.ipynb` | Spearman rank correlation | BMWP | Supplementary exploratory notebook; its in-sample comparison is **not** part of the manuscript's reported results |

All five comparative techniques were evaluated under the same nested LOOCV
protocol described [above](#why-nested-cross-validation); the specific
predictor-selection criterion used per technique (Spearman rank screening,
exhaustive AIC, or the fuzzy hybrid of both) is documented in each notebook and
in Section 2.5 of the manuscript.

## Repository structure

```
cali-river-biomonitoring/
├── README.md
├── requirements.txt
├── .gitignore
│
├── data/                              # Input .xlsx datasets (not version-controlled)
│   ├── DB - Macroinvertebrados.xlsx
│   └── Database - BMWP.xlsx
│
├── notebooks/
│   ├── 01_fuzzy_logic/
│   │   ├── 01a_fuzzy_design_comparison.ipynb
│   │   └── 01b_fuzzy_final.ipynb          ← FINAL: Perlidae (fuzzy Mamdani)
│   ├── 02_logistic_regression/
│   │   └── 02_logistic_regression.ipynb   ← FINAL: Helicopsychidae (logistic)
│   ├── 03_classification_trees/
│   │   └── 03_classification_trees.ipynb
│   ├── 04_negative_binomial/
│   │   └── 04_negative_binomial_regression.ipynb
│   ├── 05_svr_bmwp/
│   │   └── 05_svr_bmwp.ipynb               ← FINAL: BMWP/Col (ε-SVR)
│   └── 06_bmwp_simulation/
│       └── 05_bmwp_spearman_validation.ipynb   (supplementary)
│
├── models/                             # Serialised models (regenerated by the notebooks)
│   ├── svr_bmwp.pkl               + svr_bmwp_meta.json
│   ├── fuzzy_perlidae.pkl         + fuzzy_perlidae_meta.json
│   └── lr_helicopsychidae.pkl     + lr_helicopsychidae_meta.json
│
├── outputs/                            # Generated CSVs and diagnostic plots
│   └── figures/article/                # Publication-ready figures (Figures 2–11)
│
├── Interface/                          # Prediction web app (Flask + HTML/CSS/JS)
│   ├── app.py                          # Flask backend — auto-reloads .pkl on change
│   ├── index.html
│   ├── requirements.txt
│   └── static/
│       ├── css/style.css
│       └── js/app.js
│
└── docs/                                # Manuscript and article-figure package
```

`models/` is generated, not hand-written: running the final export cell in each
of the three FINAL notebooks (re)writes its `.pkl` + `_meta.json` pair. The
Flask server watches the `.pkl` modification time and reloads automatically, so
re-running a notebook is enough to update the live interface — no restart
needed.

## Prediction interface

A local web app lets anyone enter physicochemical measurements and get a live
prediction from the three exported models.

```bash
pip install -r Interface/requirements.txt
python Interface/app.py      # → http://localhost:5000
```

Three steps: pick a target (BMWP/Col index, *Perlidae*, or *Helicopsychidae*),
adjust input sliders (ranges are bounded to the observed calibration data, so
you can't silently extrapolate beyond it), and read the result — a numerical
estimate plus Roldán class and uncertainty band for BMWP, or a presence/absence
class for the two taxa. Reference links to family-level taxonomic pages are
included for the two bioindicators.

## Reproducing the analysis

1. Create an environment and install dependencies:

   ```bash
   python -m venv .venv
   # Windows:  .venv\Scripts\activate
   # Unix:     source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Request the two source datasets from CVC / the authors and place them in
   `data/`:
   - `data/DB - Macroinvertebrados.xlsx`
   - `data/Database - BMWP.xlsx`

3. Launch Jupyter and run any notebook — each reads its data with relative
   paths (`../../data/...`) and writes its outputs to `../../outputs/`:

   ```bash
   jupyter lab
   ```

   Run the whole notebook top to bottom; the three FINAL notebooks end with a
   "Model Export for the Interface" cell that (re)writes the corresponding file
   in `models/`.

## Citation

> Quiñones-Góngora, S., & Holguín-González, J. E. (2026). *A comparative
> machine learning framework for water quality and habitat suitability
> modelling under severe data scarcity in the Cali River, Colombia.*
> Universidad Autónoma de Occidente.

Monitoring data were provided by the Corporación Autónoma Regional del Valle
del Cauca (CVC) and are subject to that institution's data-sharing conditions.
Analysis code and intermediate outputs are in this repository.
