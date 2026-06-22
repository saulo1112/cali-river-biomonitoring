# data/

Input datasets for the notebooks. These `.xlsx` files are **not version-controlled**
(see `.gitignore`) because they contain the underlying monitoring data; place them
here manually before running the notebooks.

## Expected files

| File | Used by | Contents |
|------|---------|----------|
| `DB - Macroinvertebrados.xlsx` | fuzzy (Perlidae, Helicopsychidae), logistic regression, classification trees | Physicochemical predictors + binary presence of `Perlidae` and `Trichoptera` |
| `Database - BMWP.xlsx` | fuzzy (BMWP), negative binomial regression | Physicochemical predictors + station + continuous `BMWP` index |

## Source

CVC — *Corporación Autónoma Regional del Valle del Cauca*. Cali River sampling
campaigns. Approximately 14–18 observations per dataset.

## Column reference (original names, kept verbatim in code)

`COT` (TOC), `DBO5` (BOD₅), `Dureza` (total hardness), `Magnesio` (magnesium),
`Turbiedad` (turbidity), `OD` (dissolved oxygen), `SDT` (TDS),
`Conductividad` (conductivity), `Caudal` (flow rate), `Estación` (station),
`Perlidae`, `Trichoptera`, `BMWP`.
