/* ===========================================================================
   Cali River Biomonitoring — frontend logic
   Loads model metadata, builds dynamic sliders, requests predictions.
   Every prediction hits the server fresh, so a re-trained .pkl (notebook
   re-run) is picked up automatically by the Flask auto-reload cache.
   =========================================================================== */

const CARD_STYLE = {
  svr_bmwp:           { title: "BMWP/Col Index",  sub: "Numerical value + quality class" },
  fuzzy_perlidae:     { title: "Perlidae",         sub: "Presence / absence" },
  lr_helicopsychidae: { title: "Helicopsychidae",  sub: "Presence / absence" },
};

const CLASS_TO_CSS = {
  "Very Critical": "q-muy-critica", "Critical": "q-critica", "Doubtful": "q-dudosa",
  "Acceptable": "q-aceptable", "Good": "q-buena",
  "Present": "q-presencia", "Absent": "q-ausencia",
};

const PRED_EN = {
  Dureza: "Hardness", Turbiedad: "Turbidity", DBO5: "BOD5",
  Caudal: "Flow rate", OD: "DO", Magnesio: "Magnesium",
  COT: "TOC", SDT: "TDS",
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
    el("modelCards").innerHTML = errorBox("Could not connect to the server.");
    return;
  }
  renderCards();
}

function renderCards() {
  const host = el("modelCards");
  host.innerHTML = "";
  for (const [name, meta] of Object.entries(MODELS)) {
    const style = CARD_STYLE[name] || { title: name, sub: "" };
    const card = document.createElement("div");
    card.className = "card" + (meta ? "" : " disabled");
    card.dataset.model = name;
    if (meta) {
      card.innerHTML = `
        <div class="card-title">${style.title || meta.display_name || meta.target}</div>
        <div class="card-sub">${style.sub}</div>
      `;
      card.addEventListener("click", () => selectModel(name, card));
    } else {
      card.innerHTML = `
        <div class="card-title">${style.title || name}</div>
        <div class="card-sub">Model not available · run the notebook first</div>`;
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
    `Model: ${meta.display_name}. Adjust the predictors and click "Predict".`;

  const host = el("inputFields");
  host.innerHTML = "";
  for (const p of meta.predictors) {
    host.appendChild(buildField(p, meta));
  }
  el("inputPanel").classList.remove("hidden");
  el("resultPanel").classList.add("hidden");
  el("modelStamp").textContent =
    `${meta.display_name} · Nested LOOCV validation`;
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
      <span class="f-name">${PRED_EN[p] || p} <span class="f-unit">${unit}</span></span>
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
  let html = `<div class="result-label">Result · ${data.display_name}</div>`;

  if (data.value !== undefined) {
    // BMWP regression: numerical value + quality class
    const intervalHtml = data.interval
      ? `<div class="result-interval">Estimated range: ${data.interval[0]} – ${data.interval[1]}</div>
         <div class="result-caption">Based on validated model error; treat the class label as approximate.</div>`
      : "";
    html += `
      <div class="result-main">
        <div class="result-value ${cssClass}">${data.value}</div>
        <div class="result-class-chip ${cssClass}">
          <span class="swatch"></span>${data.class}
        </div>
      </div>
      ${intervalHtml}`;
  } else {
    // Binary presence/absence
    const icon = data.positive ? "✓" : "○";
    html += `
      <div class="result-main">
        <div class="result-class-chip ${cssClass}" style="font-size:1.4rem">
          <span class="swatch"></span>${icon} ${data.class}
        </div>
      </div>`;
  }

  const inner = el("resultInner");
  inner.innerHTML = html;
  // re-trigger reveal animation
  inner.style.animation = "none"; void inner.offsetWidth; inner.style.animation = "";
  el("resultPanel").classList.remove("hidden");
  el("resultPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function errorBox(msg) {
  return `<div class="result-label">Error</div>
          <div class="result-note" style="color:var(--q-muy-critica)">${msg}</div>`;
}

el("predictBtn").addEventListener("click", predict);
boot();
