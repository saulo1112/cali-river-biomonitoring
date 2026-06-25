# Interfaz de predicción — Biomonitoreo Río Cali

Interfaz web (Flask + HTML/CSS/JS, diseño *liquid glass*) para los tres modelos
de mayor desempeño del estudio:

| Objetivo | Modelo | Archivo | Salida |
|----------|--------|---------|--------|
| BMWP/Col | ε-SVR (RBF) | `models/svr_bmwp.pkl` | Valor numérico (0–120) + clase de calidad |
| Perlidae | Lógica difusa (Enfoque E) | `models/fuzzy_perlidae.pkl` | Presencia / ausencia |
| Helicopsychidae | Regresión logística | `models/lr_helicopsychidae.pkl` | Presencia / ausencia |

## Cómo ejecutar

```bash
pip install -r Interface/requirements.txt
python Interface/app.py
```

Abrir <http://localhost:5000>.

## Recarga automática de modelos

Cada `.pkl` se cachea en memoria con su fecha de modificación (`mtime`). Si vuelves
a ejecutar un notebook y se regenera el `.pkl`, la próxima predicción detecta el
cambio y recarga el modelo **sin reiniciar el servidor**. No es necesario tocar la
interfaz cuando se reentrena un modelo.

## Estructura

```
Interface/
├── app.py                 # Backend Flask: /api/models, /api/meta/<m>, /api/predict
├── index.html             # SPA: selector de objetivo + sliders + resultado
├── requirements.txt
└── static/
    ├── css/style.css      # Diseño liquid glass (frosted glass, olas, burbujas)
    └── js/app.js          # Carga metadatos, construye sliders, anima resultados
```

Los modelos se generan desde las celdas finales de los notebooks
`05_svr_bmwp`, `01b_fuzzy_final` y `02_logistic_regression` (sección
*"Model Export for the Interface"*), que escriben `<modelo>.pkl` + `<modelo>_meta.json`
en `models/`.
