# Cali River Biomonitoring — Ecological Water Quality Modelling

Modelling of the hydrobiological water quality of the **Cali River** using aquatic
macroinvertebrates as bioindicators. This repository contains a cleaned and
restructured set of Jupyter notebooks from an undergraduate thesis, comparing
several modelling techniques (fuzzy logic, logistic regression, classification
trees, support vector regression, and negative binomial regression) for predicting
the **BMWP/Col** water quality index and the presence of two pollution-sensitive
bioindicator taxa (*Perlidae* and *Helicopsychidae*).

## Study context

The Cali River is an urban tropical river in **Valle del Cauca, Colombia**. As it
flows from its headwaters into the city of Cali, it is subjected to increasing
anthropogenic pressure, reflected in deteriorating physicochemical conditions and a
simplified benthic macroinvertebrate community. This work explores whether the
water quality of the river — summarised through the BMWP/Col index and through the
presence of pollution-sensitive taxa — can be predicted from routine physicochemical
measurements under severe data scarcity (n = 14–18 sampling stations).

## Data

- **Source:** CVC — *Corporación Autónoma Regional del Valle del Cauca*.
- **Sample size:** n ≈ 14–18 observations depending on target and outlier removal.
  This is a hard constraint that shapes every modelling decision and must be kept in
  mind when reading any performance metric.
- **Two datasets** (placed in `data/`, not version-controlled):
  - `DB - Macroinvertebrados.xlsx` — physicochemical predictors plus binary
    presence/absence of `Perlidae` and `Trichoptera` (Helicopsychidae).
  - `Database - BMWP.xlsx` — physicochemical predictors plus the continuous
    `BMWP` index per sampling station.
- **Predictors used** (original column names preserved): `OD` (dissolved oxygen),
  `DBO5` (BOD₅), `SDT` (TDS), `Turbiedad` (turbidity), `Conductividad`
  (conductivity), `COT` (TOC), `Dureza` (total hardness), `Magnesio` (magnesium),
  `Caudal` (flow rate).

## Bioindicators and target variables

- **Bioindicators:** *Trichoptera: Helicopsychidae* and *Plecoptera: Perlidae* —
  sensitive taxa associated with good-to-acceptable water quality.
- **Target index:** **BMWP/Col** (Biological Monitoring Working Party, adapted for
  Colombia), with the standard Roldán quality classes:

  | Range | Class |
  |-------|-------|
  | 0 – 15 | Muy crítica |
  | 16 – 35 | Crítica |
  | 36 – 60 | Dudosa |
  | 61 – 100 | Aceptable |
  | 101 – 120 | Buena |

---

## Key findings

All winning models were validated under **Nested Leave-One-Out Cross-Validation
(Nested LOOCV)**, which performs predictor selection inside each training fold to
prevent data leakage.

### BMWP/Col numerical prediction — ε-SVR (RBF kernel)

The best-performing BMWP regression model is an ε-SVR with an RBF kernel and a
single predictor, **Dureza** (total hardness, mg/L CaCO₃).

| Metric | Value |
|--------|-------|
| Nested LOOCV MAE | ±23.7 BMWP points |
| RMSE | 31.6 |
| Spearman ρ | 0.43 |
| R² | −0.028 |
| Class accuracy (κ) | 0.556 (κ = 0.258) |

**Interpretation.** R² is near zero because the regression problem is poorly
determined with n = 18 and one predictor. However, the Spearman correlation
(ρ = 0.43) indicates a moderate monotonic relationship that linear R² misses,
and the absolute MAE of ~24 points is meaningful on the 0–120 BMWP scale.
These results are best read as an ordinal signal — the model captures the
*direction* of quality degradation rather than its exact value.

**Under critical data scarcity, this is the most tractable approach** for BMWP
numerical prediction: SVR with a radial kernel tolerates small samples better
than deep neural networks or ensemble methods, AIC-guided predictor selection
inside each fold prevents overfitting to the calibration set, and the nonlinear
kernel recovers a signal that no parametric model achieved with these data.
The model should be understood as a decision-support tool that flags likely
quality class transitions, not as a substitute for in-field biological sampling.

### Perlidae presence/absence — Fuzzy Mamdani (Approach E, FCM membership)

The redesigned Mamdani system with FCM-derived membership functions and three
predictors — **Turbiedad, DBO5, SDT** — is the winning classifier for *Perlidae*.

| Metric | Value |
|--------|-------|
| Nested LOOCV accuracy | 72.2 % |
| F1 | 0.768 |
| Cohen's κ | 0.516 |

A κ of 0.516 indicates moderate-to-substantial agreement beyond chance — the
strongest result across all three targets. The use of FCM membership functions
(fitted per fold inside Nested LOOCV) instead of hand-tuned triangular functions
was the critical design choice.

### Helicopsychidae presence/absence — Logistic regression

A balanced-class logistic regression with **Caudal** (flow rate, m³/s) as the
sole predictor.

| Metric | Value |
|--------|-------|
| Nested LOOCV accuracy | 55.6 % |
| F1 | 0.500 |
| Cohen's κ | 0.111 |

**Interpretation.** κ = 0.111 is slight agreement — the model is only marginally
better than the balanced-chance baseline. *Helicopsychidae* presence shows weak,
possibly nonlinear dependence on the available physicochemical variables at this
sample size. The model is nonetheless useful as a lower-bound reference: it
establishes that flow rate carries detectable information for this taxon, but
that information alone is insufficient for reliable prediction.

### Overall model comparison

| Target | Winning model | Predictor(s) | Accuracy | κ |
|--------|--------------|--------------|----------|---|
| BMWP (numerical + class) | ε-SVR (RBF) | Dureza | 55.6 % | 0.258 |
| Perlidae (presence/absence) | Fuzzy Mamdani (FCM) | Turbiedad, DBO5, SDT | 72.2 % | 0.516 |
| Helicopsychidae (presence/absence) | Logistic regression | Caudal | 55.6 % | 0.111 |

**Hardness (Dureza) and flow rate (Caudal) emerged as the most informative
single predictors** for their respective targets across all validation folds —
a finding consistent with ecological expectations: hardness correlates with
catchment geology and moderate upstream dilution; flow influences sediment
dynamics and substrate quality that bioindicators depend on.

---

## Possible applications and limitations

### Possible applications

1. **Rapid decision support under data scarcity.** When full biological surveys
   are infeasible — due to cost, timing, or access — the interface can flag whether
   a routine water-quality sample is consistent with critical or acceptable BMWP
   conditions, supporting triage decisions by environmental managers.

2. **Ordinal quality screening (BMWP model).** Even with a near-zero R², the SVR
   output correlates monotonically with true BMWP (ρ = 0.43). For stations where
   the physicochemical data place Dureza in clearly high or low ranges, the model
   provides a useful orientation about the probable quality class.

3. **Bioindicator early warning (Perlidae model).** With κ = 0.516 and F1 = 0.768,
   the Perlidae fuzzy model can credibly signal suitable habitat conditions for this
   pollution-sensitive taxon — useful for conservation or restoration prioritisation.

4. **Baseline for future data collection.** The models identify the most informative
   predictors per target (Dureza, Turbiedad, DBO5, SDT, Caudal). Future monitoring
   campaigns can prioritise these measurements to improve model performance as n grows.

5. **Methodological template.** Nested LOOCV with within-fold predictor selection is
   a rigorous protocol for tiny ecological datasets. The code can be adapted to other
   small-n river biomonitoring datasets in the Andean region.

### Critical limitations

- **Very small sample size** (n = 14–18). Metrics have wide uncertainty intervals;
  a single observation can shift a κ value by > 0.1. Results are indicative, not
  conclusive.
- **No temporal or spatial transfer.** Models are calibrated on a single river under
  the available CVC sampling campaigns; they should not be applied to other systems
  without recalibration.
- **BMWP regression is weakly determined.** R² ≈ 0 means the SVR does not reliably
  predict the absolute numerical value of BMWP. Use the class output and the ±24-pt
  MAE band as bounds, not the point estimate.
- **In-sample fuzzy evaluation (original notebooks 01a–01c).** The original rule
  bases are derived from and evaluated on the same data, so their metrics reflect
  internal fit only. The redesigned system (`01b_fuzzy_final`) with Nested LOOCV
  supersedes them for any publication use.
- **Outlier removal** uses a tolerant IQR rule (2.5× upper bound) to retain
  variability — a pragmatic choice driven by sample size, not a standard procedure.

---

## Notebooks

| Notebook | Technique | Target | Validation |
|----------|-----------|--------|------------|
| `01_fuzzy_logic/01a_fuzzy_BMWP` | Fuzzy logic (original) | BMWP class | In-sample* |
| `01_fuzzy_logic/01b_fuzzy_Perlidae` | Fuzzy logic (original) | Perlidae | In-sample* |
| `01_fuzzy_logic/01c_fuzzy_Helicopsychidae` | Fuzzy logic (original) | Helicopsychidae | In-sample* |
| `01_fuzzy_logic/01d_fuzzy_LOOCV` | Fuzzy logic baseline | All three | LOOCV |
| `01_fuzzy_logic/01e_fuzzy_redesign_comparison` | 8 redesign approaches compared | All three | LOOCV |
| **`01_fuzzy_logic/01b_fuzzy_final`** | **Fuzzy Mamdani (FCM) — FINAL** | **All three** | **Nested LOOCV** |
| `02_logistic_regression` | Logistic regression | Perlidae & Helicopsychidae | Nested LOOCV |
| `03_classification_trees/03b_classification_trees_LOOCV` | Classification trees | Perlidae & Helicopsychidae | LOOCV |
| `04_negative_binomial` | Negative binomial GLM | BMWP | Nested LOOCV |
| **`05_svr_bmwp/05_svr_bmwp`** | **ε-SVR (RBF) — FINAL** | **BMWP** | **Nested LOOCV** |
| `06_bmwp_simulation` | Spearman correlation | BMWP | In-sample + LOOCV |

*In-sample: not evidence of out-of-sample generalisation.

---

## Repository structure

```
cali-river-biomonitoring/
├── README.md
├── requirements.txt
├── .gitignore
│
├── data/                         # Input .xlsx datasets (not version-controlled)
│   ├── DB - Macroinvertebrados.xlsx
│   └── Database - BMWP.xlsx
│
├── notebooks/
│   ├── 01_fuzzy_logic/
│   │   ├── 01a_fuzzy_BMWP.ipynb
│   │   ├── 01b_fuzzy_final.ipynb          ← WINNING MODEL: Perlidae (FCM fuzzy)
│   │   ├── 01c_fuzzy_Helicopsychidae.ipynb
│   │   ├── 01d_fuzzy_LOOCV.ipynb
│   │   └── 01e_fuzzy_redesign_comparison.ipynb
│   ├── 02_logistic_regression/
│   │   └── 02_logistic_regression.ipynb   ← WINNING MODEL: Helicopsychidae (LR)
│   ├── 03_classification_trees/
│   ├── 04_negative_binomial/
│   ├── 05_svr_bmwp/
│   │   └── 05_svr_bmwp.ipynb              ← WINNING MODEL: BMWP (ε-SVR)
│   └── 06_bmwp_simulation/
│
├── models/                       # Serialised models (generated by notebooks)
│   ├── svr_bmwp.pkl              # Pipeline(StandardScaler + SVR RBF)
│   ├── svr_bmwp_meta.json        # Predictor ranges, metrics, BMWP class thresholds
│   ├── fuzzy_perlidae.pkl        # skfuzzy ControlSystem (Mamdani, FCM MFs)
│   ├── fuzzy_perlidae_meta.json
│   ├── lr_helicopsychidae.pkl    # Pipeline(StandardScaler + LogisticRegression)
│   └── lr_helicopsychidae_meta.json
│
├── Interface/                    # Prediction web interface (Flask + HTML/CSS/JS)
│   ├── app.py                    # Flask backend: auto-reloads .pkl on mtime change
│   ├── index.html                # Single-page app (liquid glass design)
│   ├── requirements.txt
│   └── static/
│       ├── css/style.css         # Glassmorphism, animated waves, BMWP colour scale
│       └── js/app.js             # Dynamic sliders, prediction fetch, result reveal
│
├── outputs/                      # Generated artefacts (CSVs, validation tables)
└── figures/                      # Exported plots
```

The files in `models/` are generated by running the final cell (*"Model Export for
the Interface"*) in each of the three winning notebooks. Re-running a notebook
automatically updates the `.pkl`; the Flask server detects the change on the next
prediction request and reloads the model without restarting.

---

## Prediction interface

A local web interface lets users input physicochemical measurements and obtain
model predictions in real time.

```bash
pip install -r Interface/requirements.txt
python Interface/app.py      # → http://localhost:5000
```

The interface provides:
- **Step 1** — select prediction target (BMWP index, Perlidae, or Helicopsychidae).
- **Step 2** — adjust input sliders (ranges derived from the training data).
- **Step 3** — animated result panel. BMWP shows the numerical estimate and the
  Roldán quality class with a colour-coded label (red → green). Presence/absence
  models show the class chip and a confidence bar.

---

## How to run the notebooks

1. Create and activate a virtual environment, then install dependencies:

   ```bash
   python -m venv .venv
   # Windows:  .venv\Scripts\activate
   # Unix:     source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Place the two source datasets in `data/`:
   - `data/DB - Macroinvertebrados.xlsx`
   - `data/Database - BMWP.xlsx`

3. Launch Jupyter and run the notebooks in order:

   ```bash
   jupyter lab
   ```

   Each notebook reads its data with relative paths (`../../data/...`) and writes
   plots to `figures/`. Run the final cell of each winning notebook to regenerate
   the model files in `models/`.

---

## Citation

> Quiñónez, S. (2026). *Modelamiento ecológico de la calidad hidrobiológica del
> río Cali mediante macroinvertebrados acuáticos como bioindicadores.*
> Trabajo de grado. [Institución].
