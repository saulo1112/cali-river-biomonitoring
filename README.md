# Cali River Biomonitoring — Ecological Water Quality Modelling

Modelling of the hydrobiological water quality of the **Cali River** using aquatic
macroinvertebrates as bioindicators. This repository contains a cleaned and
restructured set of Jupyter notebooks from an undergraduate thesis, comparing
several modelling techniques (fuzzy logic, logistic regression, classification
trees and negative binomial regression) for predicting the **BMWP/Col** water
quality index and the presence of two sensitive bioindicator taxa.

## Study context

The Cali River is an urban tropical river in **Valle del Cauca, Colombia**. As it
flows from its headwaters into the city of Cali, it is subjected to increasing
anthropogenic pressure, which is reflected in its physicochemical conditions and
in the composition of its benthic macroinvertebrate community. This work explores
whether the water quality of the river — summarised through the BMWP/Col index and
through the presence of pollution-sensitive taxa — can be predicted from routine
physicochemical measurements.

## Data

- **Source:** CVC — *Corporación Autónoma Regional del Valle del Cauca*.
- **Sample size:** small (n ≈ 14–18 observations depending on the dataset and on
  outlier removal). This is a hard constraint that shapes every modelling decision
  below and should be kept in mind when reading any performance metric.
- **Two datasets** (placed in `data/`, not version-controlled):
  - `DB - Macroinvertebrados.xlsx` — physicochemical predictors plus the binary
    presence/absence of `Perlidae` and `Trichoptera`.
  - `Database - BMWP.xlsx` — physicochemical predictors plus the continuous
    `BMWP` index per sampling station.
- **Predictors used** (original column names preserved): `OD` (dissolved oxygen),
  `DBO5` (BOD₅), `SDT` (TDS), `Turbiedad` (turbidity), `Conductividad`
  (conductivity), `COT` (TOC), `Dureza` (total hardness), `Magnesio` (magnesium),
  `Caudal` (flow rate).

## Bioindicators and target variable

- **Bioindicators:** *Trichoptera: Helicopsychidae* and *Plecoptera: Perlidae* —
  pollution-sensitive taxa whose presence is associated with good water quality.
- **Target index:** **BMWP/Col** (Biological Monitoring Working Party, adapted for
  Colombia), with the standard quality classes: *Muy crítica*, *Crítica*,
  *Dudosa*, *Aceptable*, *Buena*.

## Models

| Notebook | Technique | Target | Validation |
|----------|-----------|--------|------------|
| `01_fuzzy_logic/01a_fuzzy_BMWP` | Fuzzy logic (original, in-sample) | BMWP class | In-sample* |
| `01_fuzzy_logic/01b_fuzzy_Perlidae` | Fuzzy logic (original, in-sample) | Perlidae presence | In-sample* |
| `01_fuzzy_logic/01c_fuzzy_Helicopsychidae` | Fuzzy logic (original, in-sample) | Helicopsychidae presence | In-sample* |
| `01_fuzzy_logic/01d_fuzzy_LOOCV` | Fuzzy logic LOOCV baseline | All three targets | LOOCV (original rules) |
| `01_fuzzy_logic/01e_fuzzy_redesign_comparison` | Fuzzy redesign: 8 approaches compared | All three targets | LOOCV |
| **`01_fuzzy_logic/01f_fuzzy_final`** | **Fuzzy logic (redesigned) — FINAL** | **All three targets** | **Nested LOOCV** |
| `02_logistic_regression` | Logistic regression | Perlidae & Helicopsychidae | Nested LOOCV |
| **`03_classification_trees/03b_classification_trees_LOOCV`** | **Classification trees — FINAL** | **Perlidae & Helicopsychidae** | **LOOCV** |
| `04_negative_binomial` | Negative binomial GLM | BMWP | Nested LOOCV |
| **`05_svr_bmwp/05_svr_bmwp`** | **ε-SVR (RBF kernel)** | **BMWP** | **Nested LOOCV** |
| `06_bmwp_simulation` | Spearman correlation | BMWP | In-sample + LOOCV comparison |

*In-sample: performance metrics reflect internal fit only — not evidence
of out-of-sample generalisation. See 01f for the publication-ready results.

Key modelling choices, faithfully kept from the original work:

- **Fuzzy logic:** triangular membership functions defined from the literature and
  expert criteria; the rule base is generated **automatically**, one rule per
  observation in the (outlier-trimmed, n = 14) dataset.
- **Logistic regression:** candidate predictors screened exhaustively by AIC;
  the selected model uses **`DBO5`** alone, validated with leave-one-out
  cross-validation.
- **Classification trees:** seven physicochemical predictors; depth-3 trees were
  preferred on ecological grounds.
- **Negative binomial regression:** chosen over Poisson because BMWP is heavily
  over-dispersed (variance ≈ 17× the mean); AIC selects **`Dureza`** (total
  hardness) as the predictor.

## Limitations

- **In-sample fuzzy evaluation (original notebooks 01a–01c).** The original fuzzy
  rule bases are derived from the same observations later used to evaluate them, so
  their metrics reflect **in-sample fit** and must **not** be read as evidence of
  out-of-sample generalisation. The redesigned system (`01f_fuzzy_final`) addresses
  this with a leakage-reduced LOOCV evaluation and supersedes the original notebooks
  for the publication results.
- **Nested LOOCV implemented for AIC-based models.** Predictor selection
  by AIC is now performed inside each LOOCV fold for fuzzy logic,
  logistic regression, negative binomial regression, and ε-SVR. This
  eliminates the residual leakage from full-dataset predictor selection
  that was present in the earlier implementation. Classification trees
  use all available predictors and are not affected.
- **Very small sample size** (n ≈ 14–18). With so few observations, every metric
  has wide uncertainty, single observations can dominate a class (e.g. only one
  observation in the BMWP *Buena* class), and complex models cannot be expected to
  generalise. Results are indicative, not conclusive.
- **Outlier removal** uses a tolerant IQR rule (upper bound at 2.5× IQR) to retain
  variability; this is a pragmatic choice driven by the small sample, not a
  standard procedure.
- **Geographic / temporal scope** is limited to the available CVC sampling
  campaigns on a single river; the models are not transferable as-is to other
  systems.

## Repository structure

```
cali-river-biomonitoring/
├── README.md
├── requirements.txt
├── .gitignore
├── data/                 # input .xlsx datasets (not version-controlled)
├── notebooks/
│   ├── 01_fuzzy_logic/
│   ├── 02_logistic_regression/
│   ├── 03_classification_trees/
│   ├── 04_negative_binomial/
│   ├── 05_svr_bmwp/      # ε-SVR regression for BMWP (new)
│   └── 06_bmwp_simulation/
├── outputs/              # generated artifacts (CSVs, plots)
└── figures/             # exported plots
```

## How to run

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
   jupyter lab   # or: jupyter notebook
   ```

   Each notebook reads its data with relative paths (`../../data/...`) and writes
   plots to `figures/`, so they can be run from their location without changes.

## Citation

> *(Citation placeholder — add the thesis / article reference here.)*
>
> Quiñónez, S. (year). *Ecological modelling of the hydrobiological water quality
> of the Cali River using aquatic macroinvertebrates as bioindicators.*
> Undergraduate thesis. [Institution].
