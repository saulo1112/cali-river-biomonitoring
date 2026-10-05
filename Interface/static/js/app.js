/* ===========================================================================
   Cali River Biomonitoring — frontend logic
   Loads the exported model parameters (static/data/models.json), builds the
   predictor sliders and runs inference in the browser (engine.js), so the page
   works on any static host such as GitHub Pages. Text is bilingual (i18n.js).
   =========================================================================== */

const MODEL_ORDER = ["svr_bmwp", "fuzzy_perlidae", "lr_helicopsychidae"];
const BINARY_MODELS = new Set(["fuzzy_perlidae", "lr_helicopsychidae"]);

const CLASS_TO_CSS = {
  veryCritical: "q-muy-critica", critical: "q-critica", doubtful: "q-dudosa",
  acceptable: "q-aceptable", good: "q-buena",
  present: "q-presencia", absent: "q-ausencia",
};

let MODELS = {};
let activeModel = null;
let lastResult = null; // re-rendered when the language changes

const el = (id) => document.getElementById(id);
const t = (k, v) => I18N.t(k, v);

/* ---------- Floating bubbles ------------------------------------------- */
function spawnBubbles() {
  const host = el("bubbles");
  for (let i = 0; i < 12; i++) {
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
  I18N.init();
  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.addEventListener("click", () => I18N.set(b.dataset.lang, renderDynamic)));
  spawnBubbles();
  try {
    const res = await fetch("static/data/models.json");
    if (!res.ok) throw new Error(res.status);
    MODELS = await res.json();
  } catch (e) {
    el("modelCards").innerHTML = errorBox(t("error.load"));
    return;
  }
  renderCards();
}

/** Re-render everything that JS built, after a language switch. */
function renderDynamic() {
  if (!Object.keys(MODELS).length) return;
  renderCards();
  if (activeModel) {
    document.querySelector(`.card[data-model="${activeModel}"]`)?.classList.add("active");
    refreshFieldLabels();
    el("inputNote").textContent = t("input.note", { model: t(`model.${activeModel}`) });
    el("modelStamp").textContent = t("foot.stamp", { model: t(`model.${activeModel}`) });
  }
  if (lastResult) renderResult(lastResult.result, lastResult.model);
}

function renderCards() {
  const host = el("modelCards");
  host.innerHTML = "";
  for (const name of MODEL_ORDER) {
    if (!MODELS[name]) continue;
    const sub = BINARY_MODELS.has(name) ? t("card.binary.sub") : t(`card.${name}.sub`);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.dataset.model = name;
    card.innerHTML = `
      <div class="card-title">${t(`card.${name}.title`)}</div>
      <div class="card-sub">${sub}</div>`;
    card.addEventListener("click", () => selectModel(name, card));
    host.appendChild(card);
  }
}

/* ---------- Select a model -> build sliders ---------------------------- */
function selectModel(name, card) {
  activeModel = name;
  lastResult = null;
  document.querySelectorAll(".card").forEach((c) => c.classList.remove("active"));
  card.classList.add("active");

  const meta = MODELS[name];
  el("inputNote").textContent = t("input.note", { model: t(`model.${name}`) });

  const host = el("inputFields");
  host.innerHTML = "";
  for (const p of meta.predictors) host.appendChild(buildField(p, meta));

  el("inputPanel").classList.remove("hidden");
  el("resultPanel").classList.add("hidden");
  el("modelStamp").textContent = t("foot.stamp", { model: t(`model.${name}`) });
  el("inputPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function refreshFieldLabels() {
  document.querySelectorAll("#inputFields .field").forEach((f) => {
    const p = f.dataset.p;
    f.querySelector(".f-label").textContent = t(`pred.${p}`);
    f.querySelector(".f-value").textContent = I18N.num(+f.querySelector("input[type=range]").value);
    const [min, max] = MODELS[activeModel].ranges[p];
    const labels = f.querySelectorAll(".f-range-labels span");
    labels[0].textContent = I18N.num(min);
    labels[1].textContent = I18N.num(max);
  });
}

function buildField(p, meta) {
  const [min, max] = meta.ranges[p];
  const unit = (meta.units && meta.units[p]) || "";
  const start = +(min + (max - min) * 0.5).toFixed(2);
  const step = (max - min) / 200;

  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.dataset.p = p;
  wrap.innerHTML = `
    <label>
      <span class="f-name"><span class="f-label">${t(`pred.${p}`)}</span> <span class="f-unit">${unit}</span></span>
      <span class="f-value">${I18N.num(start)}</span>
    </label>
    <div class="slider-row">
      <div class="range-wrap">
        <input type="range" min="${min}" max="${max}" step="${step}"
               value="${start}" data-p="${p}" aria-label="${t(`pred.${p}`)}" />
      </div>
      <input type="number" class="num-input" min="${min}" max="${max}"
             step="${step}" value="${start}" data-num="${p}" aria-label="${t(`pred.${p}`)}" />
    </div>
    <div class="f-range-labels"><span>${I18N.num(min)}</span><span>${I18N.num(max)}</span></div>`;

  const range = wrap.querySelector("input[type=range]");
  const num = wrap.querySelector(".num-input");
  const out = wrap.querySelector(".f-value");

  const setFill = (v) => range.style.setProperty("--fill", `${((v - min) / (max - min)) * 100}%`);
  const sync = (v, fromNum) => {
    v = Math.min(max, Math.max(min, +v || min));
    out.textContent = I18N.num(v);
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
function predict() {
  if (!activeModel) return;
  const model = MODELS[activeModel];
  const inputs = {};
  document.querySelectorAll("#inputFields input[type=range]").forEach((r) => {
    inputs[r.dataset.p] = parseFloat(r.value);
  });
  try {
    const result = Engine.predict(model, inputs);
    lastResult = { result, model: activeModel };
    renderResult(result, activeModel);
  } catch (e) {
    el("resultInner").innerHTML = errorBox(e.message);
    el("resultPanel").classList.remove("hidden");
  }
}

function renderResult(result, modelName) {
  const model = MODELS[modelName];
  let html = `<div class="result-label">${t("result.label", { model: t(`model.${modelName}`) })}</div>`;

  if (result.kind === "numeric") {
    const css = CLASS_TO_CSS[result.classKey];
    const m = model.metrics;
    html += `
      <div class="result-main">
        <div class="result-value ${css}">${I18N.num(result.value, 1)}</div>
        <div class="result-class-chip ${css}"><span class="swatch"></span>${t(`class.${result.classKey}`)}</div>
      </div>
      <div class="result-interval">${t("result.interval", { lo: I18N.num(result.interval[0], 1), hi: I18N.num(result.interval[1], 1) })}</div>
      <div class="result-caption">${t("result.caption")}</div>
      <div class="result-note">${t("result.metrics.numeric", {
        mae: I18N.num(m.mae, 1), rs: I18N.num(m.rs, 3), acc: I18N.num(m.accuracy * 100, 1) })}</div>`;
  } else if (result.undetermined) {
    html += `
      <div class="result-main">
        <div class="result-class-chip" style="font-size:1.4rem; color:var(--q-dudosa)">
          <span class="swatch"></span>? ${t("result.undetermined.title")}
        </div>
      </div>
      <div class="result-note">${t("result.undetermined.body")}</div>`;
  } else {
    const key = result.positive ? "present" : "absent";
    const scoreKey = model.model_type === "LogisticRegression" ? "result.score.prob" : "result.score.fuzzy";
    const m = model.metrics;
    html += `
      <div class="result-main">
        <div class="result-class-chip ${CLASS_TO_CSS[key]}" style="font-size:1.4rem">
          <span class="swatch"></span>${result.positive ? "✓" : "○"} ${t(`class.${key}`)}
        </div>
      </div>
      <div class="result-interval">${t(scoreKey, { score: I18N.num(result.score, 3) })}</div>
      <div class="result-note">${t("result.metrics.binary", {
        kappa: I18N.num(m.kappa, 3), acc: I18N.num(m.accuracy * 100, 1), f1: I18N.num(m.f1, 3) })}</div>`;
  }

  const inner = el("resultInner");
  inner.innerHTML = html;
  inner.style.animation = "none"; void inner.offsetWidth; inner.style.animation = "";
  el("resultPanel").classList.remove("hidden");
  el("resultPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function errorBox(msg) {
  return `<div class="result-label">${t("error.title")}</div>
          <div class="result-note" style="color:var(--q-muy-critica)">${msg}</div>`;
}

el("predictBtn").addEventListener("click", predict);
boot();
