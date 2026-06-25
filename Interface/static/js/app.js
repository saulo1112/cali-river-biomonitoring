/* ===========================================================================
   Cali River Biomonitoring — frontend logic
   Loads model metadata, builds dynamic sliders, requests predictions.
   Every prediction hits the server fresh, so a re-trained .pkl (notebook
   re-run) is picked up automatically by the Flask auto-reload cache.
   =========================================================================== */

const CARD_STYLE = {
  svr_bmwp:           { icon: "💧", sub: "Índice BMWP/Col · valor numérico + clase de calidad" },
  fuzzy_perlidae:     { icon: "🐛", sub: "Presencia / ausencia del macroinvertebrado Perlidae" },
  lr_helicopsychidae: { icon: "🪰", sub: "Presencia / ausencia del macroinvertebrado Helicopsychidae" },
};

const CLASS_TO_CSS = {
  "Muy crítica": "q-muy-critica", "Crítica": "q-critica", "Dudosa": "q-dudosa",
  "Aceptable": "q-aceptable", "Buena": "q-buena",
  "Presencia": "q-presencia", "Ausencia": "q-ausencia",
};

let MODELS = {};
let activeModel = null;

const el = (id) => document.getElementById(id);

/* ---------- Floating bubbles ------------------------------------------- */
function spawnBubbles() {
  const host = el("bubbles");
  const n = 12;
  for (let i = 0; i < n; i++) {
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 6 + Math.random() * 26;
    b.style.width = b.style.height = `${size}px`;
    b.style.left = `${Math.random() * 100}%`;
    b.style.animationDuration = `${10 + Math.random() * 16}s`;
    b.style.animationDelay = `${-Math.random() * 18}s`;
    host.appendChild(b);
  }
}

/* ---------- Boot ------------------------------------------------------- */
async function boot() {
  spawnBubbles();
  try {
    const res = await fetch("/api/models");
    MODELS = await res.json();
  } catch (e) {
    el("modelCards").innerHTML = errorBox("No se pudo conectar con el servidor.");
    return;
  }
  renderCards();
}

function renderCards() {
  const host = el("modelCards");
  host.innerHTML = "";
  for (const [name, meta] of Object.entries(MODELS)) {
    const style = CARD_STYLE[name] || { icon: "🔬", sub: "" };
    const card = document.createElement("div");
    card.className = "card" + (meta ? "" : " disabled");
    card.dataset.model = name;
    if (meta) {
      const k = meta.metrics && meta.metrics.kappa != null ? meta.metrics.kappa : "—";
      card.innerHTML = `
        <span class="icon">${style.icon}</span>
        <div class="card-title">${meta.target}</div>
        <div class="card-sub">${style.sub}</div>
      `;
      card.addEventListener("click", () => selectModel(name, card));
    } else {
      card.innerHTML = `
        <span class="icon">${style.icon}</span>
        <div class="card-title">${name}</div>
        <div class="card-sub">Modelo no disponible · ejecuta el notebook primero</div>`;
    }
    host.appendChild(card);
  }
}

/* ---------- Select a model -> build sliders ---------------------------- */
function selectModel(name, card) {
  activeModel = name;
  document.querySelectorAll(".card").forEach((c) => c.classList.remove("active"));
  card.classList.add("active");

  const meta = MODELS[name];
  el("inputNote").textContent =
    `Modelo: ${meta.display_name}. Ajusta los ${meta.predictors.length} ` +
    `predictor(es) y pulsa Predecir.`;

  const host = el("inputFields");
  host.innerHTML = "";
  for (const p of meta.predictors) {
    host.appendChild(buildField(p, meta));
  }
  el("inputPanel").classList.remove("hidden");
  el("resultPanel").classList.add("hidden");
  el("modelStamp").textContent =
    `${meta.display_name} · validación Nested LOOCV`;
  el("inputPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function buildField(p, meta) {
  const [min, max] = meta.ranges[p];
  const unit = (meta.units && meta.units[p]) || "";
  const start = +(min + (max - min) * 0.5).toFixed(2);
  const step = (max - min) / 200;

  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `
    <label>
      <span class="f-name">${p} <span class="f-unit">${unit}</span></span>
      <span class="f-value" data-for="${p}">${start}</span>
    </label>
    <div class="slider-row">
      <div class="range-wrap">
        <input type="range" min="${min}" max="${max}" step="${step}"
               value="${start}" data-p="${p}" />
      </div>
      <input type="number" class="num-input" min="${min}" max="${max}"
             step="${step}" value="${start}" data-num="${p}" />
    </div>
    <div class="f-range-labels"><span>${min}</span><span>${max}</span></div>`;

  const range = wrap.querySelector("input[type=range]");
  const num = wrap.querySelector(".num-input");
  const out = wrap.querySelector(".f-value");

  const setFill = (v) => {
    const pct = ((v - min) / (max - min)) * 100;
    range.style.setProperty("--fill", `${pct}%`);
  };
  const sync = (v, fromNum) => {
    v = Math.min(max, Math.max(min, +v || min));
    out.textContent = +v.toFixed(2);
    if (!fromNum) num.value = +v.toFixed(2);
    range.value = v;
    setFill(v);
  };
  range.addEventListener("input", () => sync(range.value, false));
  num.addEventListener("input", () => sync(num.value, true));
  setFill(start);
  return wrap;
}

/* ---------- Predict ---------------------------------------------------- */
async function predict() {
  if (!activeModel) return;
  const meta = MODELS[activeModel];
  const inputs = {};
  document.querySelectorAll("#inputFields input[type=range]").forEach((r) => {
    inputs[r.dataset.p] = parseFloat(r.value);
  });

  const btn = el("predictBtn");
  btn.classList.add("loading");
  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: activeModel, inputs }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error de predicción");
    renderResult(data, meta);
  } catch (e) {
    el("resultInner").innerHTML = errorBox(e.message);
    el("resultPanel").classList.remove("hidden");
  } finally {
    btn.classList.remove("loading");
  }
}

function renderResult(data, meta) {
  const cssClass = CLASS_TO_CSS[data.class] || "q-aceptable";
  let html = `<div class="result-label">Resultado · ${data.display_name}</div>`;

  if (data.value !== undefined) {
    // BMWP regression: numerical value + quality class
    html += `
      <div class="result-main">
        <div class="result-value ${cssClass}">${data.value}</div>
        <div class="result-class-chip ${cssClass}">
          <span class="swatch"></span>${data.class}
        </div>
      </div>
      <div class="result-meta">
        <span>Escala BMWP/Col <b>0 – 120</b></span>
        <span>MAE validación <b>±${meta.metrics.mae}</b> pts</span>
        <span>κ <b>${meta.metrics.kappa}</b></span>
      </div>
      <div class="result-note">
        Predicción puntual del índice BMWP/Col y su clase de calidad (Roldán).
        El R² de validación es bajo (${meta.metrics.r2}); interpretar como
        estimación orientativa, no como medición exacta.
      </div>`;
  } else {
    // Binary presence/absence
    const pct = Math.round((data.score ?? 0) * 100);
    const icon = data.positive ? "✓" : "○";
    html += `
      <div class="result-main">
        <div class="result-class-chip ${cssClass}" style="font-size:1.4rem">
          <span class="swatch"></span>${icon} ${data.class}
        </div>
      </div>
      <div class="score-bar"><div class="score-fill" style="width:0%"></div></div>
      <div class="result-meta">
        <span>Confianza del modelo <b>${pct}%</b></span>
        <span>κ <b>${meta.metrics.kappa}</b> · F1 <b>${meta.metrics.f1}</b></span>
      </div>
      <div class="result-note">
        ${data.positive
          ? "Condiciones fisicoquímicas compatibles con la presencia del taxón."
          : "Condiciones poco favorables para la presencia del taxón."}
      </div>`;
  }

  const inner = el("resultInner");
  inner.innerHTML = html;
  // re-trigger reveal animation
  inner.style.animation = "none"; void inner.offsetWidth; inner.style.animation = "";
  el("resultPanel").classList.remove("hidden");

  const fill = inner.querySelector(".score-fill");
  if (fill) {
    const pct = Math.round((data.score ?? 0) * 100);
    requestAnimationFrame(() => { fill.style.width = `${pct}%`; });
  }
  el("resultPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function errorBox(msg) {
  return `<div class="result-label">Error</div>
          <div class="result-note" style="color:var(--q-muy-critica)">${msg}</div>`;
}

el("predictBtn").addEventListener("click", predict);
boot();
