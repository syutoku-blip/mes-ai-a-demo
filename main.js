/**************************************************************
 * main.js
 * - MES-AI-A 詳細ビュー
 **************************************************************/

const $ = (sel, root = document) => root.querySelector(sel);
const FX_RATE = 155;

const fmtJPY = (n) => "￥" + Number(n || 0).toLocaleString("ja-JP");
const num = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const fmtKg = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(x) || x === 0) return "－";
  return x.toFixed(2) + "kg";
};

/* =========================
   指標（候補）
========================= */
const METRICS_ALL = [
  { id: "過去3月FBA最安値", label: "過去3ヶ月FBA最安値", sourceKey: "過去3月FBA最安値" },
  { id: "FBA最安値", label: "FBA最安値", sourceKey: "FBA最安値" },

  { id: "粗利益率予測", label: "粗利益率予測", sourceKey: "粗利益率予測" },
  { id: "入金額予測", label: "入金額予測（円）", sourceKey: "入金額予測" },
  { id: "粗利益予測", label: "粗利益予測（1個）", sourceKey: "粗利益予測" },

  { id: "粗利益", label: "粗利益", sourceKey: "粗利益" },
  { id: "粗利益率", label: "粗利益率", sourceKey: "粗利益率" },

  { id: "販売額（ドル）", label: "販売額（USD）", sourceKey: "販売額（ドル）" },
  { id: "入金額（円）", label: "入金額（円）", sourceKey: "入金額（円）" },
  { id: "入金額計（円）", label: "入金額計（円）", sourceKey: "入金額計（円）" },

  { id: "30日販売数", label: "30日販売数（実績）", sourceKey: "30日販売数" },
  { id: "90日販売数", label: "90日販売数（実績）", sourceKey: "90日販売数" },
  { id: "180日販売数", label: "180日販売数（実績）", sourceKey: "180日販売数" },
  { id: "予測30日販売数", label: "予測30日販売数", sourceKey: "予測30日販売数" },

  { id: "複数在庫指数45日分", label: "複数在庫指数45日分", sourceKey: "複数在庫指数45日分" },
  { id: "複数在庫指数60日分", label: "複数在庫指数60日分", sourceKey: "複数在庫指数60日分" },

  { id: "ライバル偏差1", label: "ライバル偏差1", sourceKey: "ライバル偏差1" },
  { id: "ライバル偏差2", label: "ライバル偏差2", sourceKey: "ライバル偏差2" },
  { id: "ライバル増加率", label: "ライバル増加率", sourceKey: "ライバル増加率" },

  { id: "在庫数", label: "在庫数", sourceKey: "在庫数" },
  { id: "返品率", label: "返品率", sourceKey: "返品率" },

  { id: "日本最安値", label: "日本最安値", sourceKey: "日本最安値" },

  { id: "仕入れ目安単価", label: "仕入れ目安単価", sourceKey: "仕入れ目安単価" },
  { id: "想定送料", label: "想定送料", sourceKey: "想定送料" },
  { id: "送料", label: "送料", sourceKey: "送料" },
  { id: "関税", label: "関税", sourceKey: "関税" }
];
const METRIC_BY_ID = Object.fromEntries(METRICS_ALL.map((m) => [m.id, m]));

/* =========================
   商品情報（項目）候補
========================= */
const INFO_FIELDS_ALL = [
  { id: "商品名", label: "商品名", kind: "computedTitle" },
  { id: "ブランド", label: "ブランド", kind: "text", sourceKey: "ブランド" },
  { id: "評価", label: "評価", kind: "text", sourceKey: "レビュー評価" },

  { id: "各種ASIN", label: "各種ASIN", kind: "computed" },
  { id: "JAN", label: "JAN", kind: "text", sourceKey: "JAN" },
  { id: "SKU", label: "SKU", kind: "text", sourceKey: "SKU" },

  { id: "サイズ", label: "サイズ", kind: "computed" },
  { id: "重量（容積重量）", label: "重量（容積重量）", kind: "computed" },

  { id: "カテゴリ", label: "カテゴリ", kind: "computed" },
  { id: "注意事項", label: "注意事項", kind: "computedTags" },
  { id: "材質", label: "材質", kind: "text", sourceKey: "材質" }
];
const INFO_BY_ID = Object.fromEntries(INFO_FIELDS_ALL.map((f) => [f.id, f]));

/* =========================
   token
========================= */
const tokM = (id) => `M:${id}`;
const tokI = (id) => `I:${id}`;

function parseToken(token) {
  const [t, ...rest] = String(token).split(":");
  const id = rest.join(":");
  return { type: t, id };
}
function labelOf(token) {
  const { type, id } = parseToken(token);
  if (type === "M") return METRIC_BY_ID[id]?.label || id;
  if (type === "I") return INFO_BY_ID[id]?.label || id;
  return id;
}

/* =========================
   初期配置
========================= */
const DEFAULT_ZONES = {
  pool: [
    ...METRICS_ALL.map((m) => tokM(m.id)),
    ...INFO_FIELDS_ALL.map((f) => tokI(f.id))
  ],
  info: [
    tokI("商品名"),
    tokI("ブランド"),
    tokI("評価"),
    tokI("各種ASIN"),
    tokI("JAN"),
    tokI("SKU"),
    tokI("サイズ"),
    tokI("重量（容積重量）"),
    tokI("カテゴリ"),
    tokI("注意事項"),
    tokI("材質")
  ],
  center: [
    tokM("過去3月FBA最安値"),
    tokM("FBA最安値"),
    tokM("入金額予測"),
    tokM("180日販売数"),
    tokM("90日販売数"),
    tokM("粗利益率予測"),
    tokM("30日販売数"),
    tokM("日本最安値"),
    tokM("粗利益予測")
  ],
  table: [
    tokM("在庫数"),
    tokM("想定送料"),
    tokM("返品率"),
    tokM("仕入れ目安単価"),
    tokM("販売額（ドル）"),
    tokM("送料"),
    tokM("関税"),
    tokM("予測30日販売数"),
    tokM("入金額（円）")
  ],
  hidden: []
};

function normalizeDefaultZones() {
  const used = new Set([...DEFAULT_ZONES.info, ...DEFAULT_ZONES.center, ...DEFAULT_ZONES.table, ...DEFAULT_ZONES.hidden]);
  DEFAULT_ZONES.pool = DEFAULT_ZONES.pool.filter((t) => !used.has(t));
}
normalizeDefaultZones();

const zoneState = {
  pool: [...DEFAULT_ZONES.pool],
  info: [...DEFAULT_ZONES.info],
  center: [...DEFAULT_ZONES.center],
  table: [...DEFAULT_ZONES.table],
  hidden: [...DEFAULT_ZONES.hidden]
};

const cardState = new Map();
const cart = new Map();

/* ===== DOM refs ===== */
const metricsBar = $("#metricsBar");

const zonePool = $("#metricsPoolZone");
const zoneInfo = $("#metricsInfoZone");
const zoneCenter = $("#metricsCenterZone");
const zoneTable = $("#metricsTableZone");
const zoneHidden = $("#metricsHiddenZone");

/* buttons */
const metricsCollapseBtn = $("#metricsCollapseBtn");
const resetBtn = $("#resetCurrentBtn");
const clearCardsBtn = $("#clearCardsBtn");
const clearCartBtn = $("#clearCartBtn");

/* catalog */
const asinCatalog = $("#asinCatalog");
const itemsContainer = $("#itemsContainer");
const emptyState = $("#emptyState");
const headerStatus = $("#headerStatus");

/* cart */
const cartTotalCost = $("#cartTotalCost");
const cartTotalRevenue = $("#cartTotalRevenue");
const cartTotalProfit = $("#cartTotalProfit");
const cartAsinCount = $("#cartAsinCount");
const cartItemCount = $("#cartItemCount");

/* sort */
const sortBar = $("#sortBar");
const sortControls = $("#sortControls");
const addSortRuleBtn = $("#addSortRuleBtn");
const applySortBtn = $("#applySortBtn");
const clearSortBtn = $("#clearSortBtn");
let sortRules = [];

/* =========================
   メモ / 重要視条件（追加）
========================= */
const MEMO_STORAGE_KEY = "mesMemoByAsin_v1";
const IMPORTANT_STORAGE_KEY = "mesImportantRules_v1";

function loadMemoMap() {
  try { return JSON.parse(localStorage.getItem(MEMO_STORAGE_KEY) || "{}") || {}; }
  catch { return {}; }
}
function saveMemoMap(map) {
  try { localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(map || {})); } catch {}
}
function getMemo(asin) {
  const m = loadMemoMap();
  return String(m?.[asin] ?? "");
}
function setMemo(asin, text) {
  const m = loadMemoMap();
  m[asin] = String(text ?? "");
  saveMemoMap(m);
}

function loadImportantRules() {
  try {
    const v = JSON.parse(localStorage.getItem(IMPORTANT_STORAGE_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function saveImportantRules(rules) {
  try { localStorage.setItem(IMPORTANT_STORAGE_KEY, JSON.stringify(rules || [])); } catch {}
}

let importantRules = loadImportantRules();

/** rule:
 * { id, token, op, value, enabled }
 * token is "M:<metricId>" （プールに存在する指標のみ選択可）
 */

function isMetricToken(token) {
  const { type } = parseToken(token);
  return type === "M";
}

function getSelectableImportantTokens() {
  // 「プールにある全指標」= 現在 pool に置かれている「指標」だけ
  return (zoneState.pool || []).filter((t) => isMetricToken(t));
}

function evalRuleOnData(rule, data) {
  if (!rule?.enabled) return false;
  if (!rule.token) return false;

  const { type, id } = parseToken(rule.token);
  if (type !== "M") return false;

  const m = METRIC_BY_ID[id];
  if (!m) return false;

  const left = num(data?.[m.sourceKey]);
  const right = num(rule.value);

  switch (rule.op) {
    case ">":  return left > right;
    case ">=": return left >= right;
    case "<":  return left < right;
    case "<=": return left <= right;
    case "=":
    case "==": return left === right;
    default:   return false;
  }
}

function clearImportantMarks(cardEl) {
  if (!cardEl) return;
  cardEl.querySelectorAll(".important-hit").forEach((el) => el.classList.remove("important-hit"));
  cardEl.querySelectorAll(".important-flame").forEach((el) => el.remove());
}

function applyImportantToCard(cardEl, asin, data) {
  if (!cardEl) return;
  clearImportantMarks(cardEl);

  if (!importantRules || importantRules.length === 0) return;

  const hits = new Set();
  for (const r of importantRules) {
    if (!r?.enabled) continue;
    if (evalRuleOnData(r, data)) {
      const { type, id } = parseToken(r.token);
      if (type === "M") hits.add(id);
    }
  }
  if (!hits.size) return;

  hits.forEach((metricId) => {
    const els = cardEl.querySelectorAll(`[data-metric-id="${CSS.escape(metricId)}"]`);
    els.forEach((el) => {
      el.classList.add("important-hit");
      if (!el.querySelector(".important-flame")) {
        const flame = document.createElement("span");
        flame.className = "important-flame";
        flame.textContent = "🔥";
        el.appendChild(flame);
      }
    });
  });
}

function applyImportantAllCards() {
  cardState.forEach((v) => {
    applyImportantToCard(v.el, v.el.dataset.asin, v.data);
  });
}

/* --- 重要視条件 UI（配置カスタマイズの直下に表示） --- */
let importantPanelEl = null;
let importantInlineEl = null;

function initImportantUI() {
  const bar = $("#metricsBar");
  if (!bar) return;

  const head = bar.querySelector(".metrics-bar-head");
  if (!head) return;

  if (!importantInlineEl) {
    importantInlineEl = document.createElement("div");
    importantInlineEl.className = "important-inline";
    importantInlineEl.innerHTML = `
      <div class="important-inline__left">
        <div class="important-inline__title">重要視条件</div>
        <div class="important-inline__help">プールにある指標から条件を作成 → 合致したASINの該当枠に🔥</div>
      </div>
      <div class="important-inline__right">
        <button type="button" class="important-btn js-importantBtn">設定する</button>
      </div>
    `;

    head.insertAdjacentElement("afterend", importantInlineEl);

    importantInlineEl.querySelector(".js-importantBtn")?.addEventListener("click", openImportantPanel);
  }
}

function openImportantPanel() {
  if (!importantPanelEl) {
    importantPanelEl = document.createElement("div");
    importantPanelEl.className = "important-panel";
    importantPanelEl.innerHTML = `
      <div class="important-panel__backdrop js-impClose"></div>
      <div class="important-panel__card card">
        <div class="important-panel__head">
          <div class="t">重要視条件</div>
          <button type="button" class="x js-impClose">×</button>
        </div>

        <div class="important-panel__desc">
          「プールに存在する指標」から条件を作れます。条件に合致したASINは、該当指標の枠に🔥が付き、軽く光ります。
        </div>

        <div class="important-panel__body">
          <div class="important-list js-impList"></div>

          <div class="important-actions">
            <button type="button" class="btn js-impAdd">条件を追加</button>
            <button type="button" class="btn ghost js-impApply">適用</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(importantPanelEl);

    importantPanelEl.querySelectorAll(".js-impClose").forEach((b) => b.addEventListener("click", closeImportantPanel));
    importantPanelEl.querySelector(".js-impAdd")?.addEventListener("click", () => {
      const selectable = getSelectableImportantTokens();
      if (!selectable.length) {
        return alert("現在プールに指標がありません。上部の枠から指標を戻して、プールに指標を置いてください。");
      }
      const firstToken = selectable[0];
      importantRules.push({
        id: String(Date.now()) + "_" + Math.random().toString(16).slice(2),
        token: firstToken,
        op: ">=",
        value: "",
        enabled: true
      });
      renderImportantRules();
    });

    importantPanelEl.querySelector(".js-impApply")?.addEventListener("click", () => {
      saveImportantRules(importantRules);
      applyImportantAllCards();
      closeImportantPanel();
    });
  }

  renderImportantRules();
  importantPanelEl.classList.add("open");
}

function closeImportantPanel() {
  importantPanelEl?.classList.remove("open");
}

function renderImportantRules() {
  if (!importantPanelEl) return;
  const listEl = importantPanelEl.querySelector(".js-impList");
  if (!listEl) return;

  const selectable = getSelectableImportantTokens();

  listEl.innerHTML = "";

  if (!importantRules.length) {
    const empty = document.createElement("div");
    empty.className = "important-empty";
    empty.textContent = "条件がまだありません。";
    listEl.appendChild(empty);
    return;
  }

  importantRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "important-row";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!r.enabled;
    chk.className = "important-chk";
    chk.addEventListener("change", () => { r.enabled = chk.checked; });

    const sel = document.createElement("select");
    sel.className = "important-sel";

    selectable.forEach((tok) => {
      const { id } = parseToken(tok);
      const opt = document.createElement("option");
      opt.value = tok;
      opt.textContent = METRIC_BY_ID[id]?.label || labelOf(tok);
      if (r.token === opt.value) opt.selected = true;
      sel.appendChild(opt);
    });

    if (r.token && !selectable.includes(r.token)) {
      const opt = document.createElement("option");
      opt.value = r.token;
      opt.textContent = labelOf(r.token) + "（※プール外）";
      opt.selected = true;
      sel.insertBefore(opt, sel.firstChild);
    }

    sel.addEventListener("change", () => { r.token = sel.value; });

    const op = document.createElement("select");
    op.className = "important-op";
    op.innerHTML = `
      <option value=">">＞</option>
      <option value=">=">≧</option>
      <option value="<">＜</option>
      <option value="<=">≦</option>
      <option value="=">＝</option>
    `;
    op.value = r.op || ">=";
    op.addEventListener("change", () => { r.op = op.value; });

    const val = document.createElement("input");
    val.type = "number";
    val.step = "0.01";
    val.placeholder = "値";
    val.className = "important-val";
    val.value = r.value ?? "";
    val.addEventListener("input", () => { r.value = val.value; });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "important-del";
    del.textContent = "×";
    del.addEventListener("click", () => {
      importantRules.splice(idx, 1);
      renderImportantRules();
    });

    row.appendChild(chk);
    row.appendChild(sel);
    row.appendChild(op);
    row.appendChild(val);
    row.appendChild(del);

    listEl.appendChild(row);
  });
}

/* =========================
   init
========================= */
init();

function init() {
  initPoolUI();
  initCatalog();
  initSortUI();
  initActions();
  initImportantUI();
  updateCartSummary();
  updateHeaderStatus();
  renderTopZones();
}

function initPoolUI() {
  attachZoneDnD(zonePool, { zoneKey: "pool" });
  attachZoneDnD(zoneInfo, { zoneKey: "info" });
  attachZoneDnD(zoneCenter, { zoneKey: "center" });
  attachZoneDnD(zoneTable, { zoneKey: "table" });
  attachZoneDnD(zoneHidden, { zoneKey: "hidden" });
}

function initActions() {
  metricsCollapseBtn?.addEventListener("click", () => {
    metricsBar.classList.toggle("collapsed");
    metricsCollapseBtn.textContent = metricsBar.classList.contains("collapsed") ? "展開する" : "折りたたむ";
  });

  resetBtn?.addEventListener("click", () => {
    zoneState.pool = [...DEFAULT_ZONES.pool];
    zoneState.info = [...DEFAULT_ZONES.info];
    zoneState.center = [...DEFAULT_ZONES.center];
    zoneState.table = [...DEFAULT_ZONES.table];
    zoneState.hidden = [...DEFAULT_ZONES.hidden];

    sortRules = [];
    renderSortControls();
    renderTopZones();
    rerenderAllCards();
  });

  clearCardsBtn?.addEventListener("click", () => {
    cardState.forEach((v) => {
      if (v.chart) v.chart.destroy();
      v.el.remove();
    });
    cardState.clear();
    itemsContainer.innerHTML = "";
    emptyState.style.display = "block";
    updateHeaderStatus();
  });

  clearCartBtn?.addEventListener("click", () => {
    cart.clear();
    updateCartSummary();
  });
}

function initCatalog() {
  const asins = Object.keys(window.ASIN_DATA || {});
  asinCatalog.innerHTML = "";
  asins.forEach((asin) => {
    const b = document.createElement("button");
    b.className = "asin-pill";
    b.type = "button";
    b.textContent = asin;
    b.addEventListener("click", () => addOrFocusCard(asin));
    asinCatalog.appendChild(b);
  });
}

function addOrFocusCard(asin) {
  const data = (window.ASIN_DATA || {})[asin];
  if (!data) return alert("データがありません: " + asin);

  if (cardState.has(asin)) {
    cardState.get(asin).el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const card = createProductCard(asin, data);
  itemsContainer.appendChild(card);

  emptyState.style.display = "none";
  cardState.set(asin, { el: card, data, chart: card.__chart || null });

  updateHeaderStatus();
}

function updateHeaderStatus() {
  const count = cardState.size;
  headerStatus.textContent = count ? `表示中: ${count} ASIN` : "";
}

/* =========================
   上部5枠：レンダリング
========================= */
function renderTopZones() {
  zonePool.innerHTML = "";
  zoneInfo.innerHTML = "";
  zoneCenter.innerHTML = "";
  zoneTable.innerHTML = "";
  zoneHidden.innerHTML = "";

  zoneState.pool.forEach((t) => zonePool.appendChild(makePill(t)));
  zoneState.info.forEach((t) => zoneInfo.appendChild(makePill(t)));
  zoneState.center.forEach((t) => zoneCenter.appendChild(makePill(t)));
  zoneState.table.forEach((t) => zoneTable.appendChild(makePill(t)));
  zoneState.hidden.forEach((t) => zoneHidden.appendChild(makePill(t)));

  refreshSortRuleOptions();

  if (importantPanelEl && importantPanelEl.classList.contains("open")) {
    renderImportantRules();
  }
}

function makePill(token) {
  const pill = document.createElement("div");
  pill.className = "metric-pill";
  pill.draggable = true;
  pill.dataset.token = token;
  pill.textContent = labelOf(token);

  pill.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", `item:${token}`);
    e.dataTransfer.effectAllowed = "move";
  });

  return pill;
}

/* =========================
   DnD（共通5枠）重複不可
   ★枠内の並び替え（挿入位置）に対応
========================= */
function getDropBeforeToken(zoneEl, clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;

  const pill = el.closest?.(".metric-pill");
  if (!pill || !zoneEl.contains(pill)) return null;

  const rect = pill.getBoundingClientRect();
  const isRow = rect.width >= rect.height;
  const before =
    isRow
      ? clientX < rect.left + rect.width / 2
      : clientY < rect.top + rect.height / 2;

  if (before) return pill.dataset.token;

  const next = pill.nextElementSibling?.classList?.contains("metric-pill") ? pill.nextElementSibling : null;
  return next ? next.dataset.token : null;
}

function attachZoneDnD(zoneEl, { zoneKey }) {
  if (!zoneEl) return;

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("text/plain") || "";
    if (!payload.startsWith("item:")) return;

    const token = payload.slice(5);

    const fromKey = findZoneOf(token);
    if (!fromKey) return;

    zoneState[fromKey] = zoneState[fromKey].filter((t) => t !== token);

    const beforeToken = getDropBeforeToken(zoneEl, e.clientX, e.clientY);

    if (beforeToken) {
      const idx = zoneState[zoneKey].indexOf(beforeToken);
      if (idx >= 0) zoneState[zoneKey].splice(idx, 0, token);
      else zoneState[zoneKey].push(token);
    } else {
      zoneState[zoneKey].push(token);
    }

    renderTopZones();
    rerenderAllCards();
  });
}

function findZoneOf(token) {
  for (const k of Object.keys(zoneState)) {
    if (zoneState[k].includes(token)) return k;
  }
  return null;
}

/* =========================
   sort UI
========================= */
function initSortUI() {
  renderSortControls();

  addSortRuleBtn?.addEventListener("click", () => {
    sortRules.push({ token: tokM(METRICS_ALL[0].id), dir: "desc" });
    renderSortControls();
  });

  applySortBtn?.addEventListener("click", () => {
    applySortToCards();
  });

  clearSortBtn?.addEventListener("click", () => {
    sortRules = [];
    renderSortControls();
  });
}

function refreshSortRuleOptions() {
  renderSortControls();
}

function renderSortControls() {
  if (!sortControls) return;
  sortControls.innerHTML = "";

  if (!sortRules.length) {
    sortBar.style.display = "none";
    return;
  }
  sortBar.style.display = "block";

  sortRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const sel = document.createElement("select");
    sel.className = "sort-sel";

    METRICS_ALL.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = tokM(m.id);
      opt.textContent = m.label;
      if (r.token === opt.value) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener("change", () => {
      r.token = sel.value;
    });

    const dir = document.createElement("select");
    dir.className = "sort-dir";
    dir.innerHTML = `
      <option value="desc">降順</option>
      <option value="asc">昇順</option>
    `;
    dir.value = r.dir;
    dir.addEventListener("change", () => {
      r.dir = dir.value;
    });

    const del = document.createElement("button");
    del.className = "sort-del";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      renderSortControls();
    });

    row.appendChild(sel);
    row.appendChild(dir);
    row.appendChild(del);
    sortControls.appendChild(row);
  });
}

function applySortToCards() {
  if (!sortRules.length) return;

  const cards = Array.from(itemsContainer.querySelectorAll(".product-card"));

  const getMetricVal = (data, metricToken) => {
    const { type, id } = parseToken(metricToken);
    if (type !== "M") return 0;
    const m = METRIC_BY_ID[id];
    if (!m) return 0;
    return num(data[m.sourceKey]);
  };

  cards.sort((a, b) => {
    const aData = (window.ASIN_DATA || {})[a.dataset.asin] || {};
    const bData = (window.ASIN_DATA || {})[b.dataset.asin] || {};

    for (const r of sortRules) {
      const va = getMetricVal(aData, r.token);
      const vb = getMetricVal(bData, r.token);
      if (va === vb) continue;
      return r.dir === "asc" ? va - vb : vb - va;
    }
    return 0;
  });

  cards.forEach((c) => itemsContainer.appendChild(c));
}

/* =========================
   token value resolve
========================= */
function resolveTokenValue(token, ctx, data) {
  const { type, id } = parseToken(token);

  if (type === "M") {
    const m = METRIC_BY_ID[id];
    return { kind: "text", label: m?.label || id, text: data?.[m?.sourceKey] ?? "－" };
  }

  if (type === "I") {
    const rv = resolveInfoValueById(id, ctx);
    if (rv.type === "tags") return { kind: "tags", label: INFO_BY_ID[id]?.label || id, html: rv.html };
    return { kind: "text", label: INFO_BY_ID[id]?.label || id, text: rv.text };
  }

  return { kind: "text", label: id, text: "－" };
}

function renderWarningTags(raw) {
  const str = String(raw || "").trim();
  if (!str) return "－";

  const parts = str
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!parts.length) return "－";

  const clsOf = (t) => {
    if (/輸出不可|出荷禁止|禁止/.test(t)) return "tag danger";
    if (/知財|IP|権利/.test(t)) return "tag info";
    if (/大型|危険|要承認|承認要/.test(t)) return "tag warn";
    if (/バリエーション/.test(t)) return "tag primary";
    return "tag";
  };

  return parts.map((t) => `<span class="${clsOf(t)}">${t}</span>`).join("");
}

function resolveInfoValueById(id, ctx) {
  const f = INFO_BY_ID[id];
  if (!f) return { type: "text", text: "－" };

  const { jpAsin, usAsin, size, weight, data } = ctx;

  const computed = {
    商品名: data["品名"] || data["商品名"] || data["商品タイトル"] || "－",
    各種ASIN: `日本: ${jpAsin} / US: ${usAsin}`,
    サイズ: size,
    "重量（容積重量）": weight,
    カテゴリ: `${data["親カテゴリ"] || "－"} / ${data["サブカテゴリ"] || "－"}`,
    注意事項: renderWarningTags(data["注意事項（警告系）"])
  };

  if (f.kind === "computedTags") return { type: "tags", html: computed[id] || "－" };
  if (f.kind === "computed" || f.kind === "computedTitle") return { type: "text", text: computed[id] || "－" };

  const sourceKey = f.sourceKey || f.id;
  return { type: "text", text: data[sourceKey] ?? "－" };
}

/* =========================
   Info / Center / Table build
========================= */
function buildInfoGrid(container, ctx, data, tokens) {
  if (!container) return;

  container.scrollTop = 0;
  container.scrollLeft = 0;

  container.innerHTML = "";

  const list = tokens ?? zoneState.info;
  if (!list || list.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "grid";
  container.style.overflowX = "hidden";

  list.forEach((tok) => {
    const v = resolveTokenValue(tok, ctx, data);

    const k = document.createElement("div");
    k.className = "k";
    k.textContent = v.label;

    const val = document.createElement("div");
    val.className = "v";

    if (v.kind === "tags") {
      val.classList.add("v-tags");
      val.innerHTML = v.html;
    } else {
      val.textContent = v.text;
    }

    container.appendChild(k);
    container.appendChild(val);
  });

  container.scrollTop = 0;
  container.scrollLeft = 0;
}

function buildInfoGridSplit(containerA, containerB, ctx, data) {
  const tokens = [...zoneState.info];
  const mid = Math.ceil(tokens.length / 2);
  const first = tokens.slice(0, mid);
  const second = tokens.slice(mid);

  buildInfoGrid(containerA, ctx, data, first);
  buildInfoGrid(containerB, ctx, data, second);
}

function buildCenterList(listEl, ctx, data) {
  if (!listEl) return;
  listEl.innerHTML = "";

  zoneState.center.forEach((token) => {
    const { type, id } = parseToken(token);
    if (type !== "M") return;

    const m = METRIC_BY_ID[id];
    if (!m) return;

    const row = document.createElement("div");
    row.className = "center-row";
    row.dataset.metricId = id;

    const k = document.createElement("div");
    k.className = "k";
    k.textContent = m.label;

    const v = document.createElement("div");
    v.className = "v";
    const raw = data[m.sourceKey];
    v.textContent = raw == null || raw === "" ? "－" : String(raw);

    row.appendChild(k);
    row.appendChild(v);
    listEl.appendChild(row);
  });
}

function buildCenterCards(container, ctx, data) {
  if (!container) return;
  container.innerHTML = "";

  zoneState.center.forEach((token) => {
    const { type, id } = parseToken(token);
    if (type !== "M") return;
    const m = METRIC_BY_ID[id];
    if (!m) return;

    const card = document.createElement("div");
    card.className = "center-card";
    card.dataset.metricId = id;

    const k = document.createElement("div");
    k.className = "k";
    k.textContent = m.label;

    const v = document.createElement("div");
    v.className = "v";
    const raw = data[m.sourceKey];
    v.textContent = raw == null || raw === "" ? "－" : String(raw);

    card.appendChild(k);
    card.appendChild(v);
    container.appendChild(card);
  });
}

function buildDetailTable(tableEl, ctx, data) {
  if (!tableEl) return;

  const theadRow = tableEl.querySelector("thead tr");
  const tbodyRow = tableEl.querySelector("tbody tr");
  theadRow.innerHTML = "";
  tbodyRow.innerHTML = "";

  zoneState.table.forEach((token) => {
    const { type, id } = parseToken(token);
    if (type !== "M") return;
    const m = METRIC_BY_ID[id];
    if (!m) return;

    const th = document.createElement("th");
    th.textContent = m.label;
    th.dataset.metricId = id;
    theadRow.appendChild(th);

    const td = document.createElement("td");
    td.dataset.metricId = id;

    const raw = data[m.sourceKey];
    const v = raw == null || raw === "" ? "－" : String(raw);

    if (/^https?:\/\//.test(v)) {
      const a = document.createElement("a");
      a.href = v;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = "リンク";
      td.appendChild(a);
    } else {
      const span = document.createElement("span");
      span.textContent = v;
      td.appendChild(span);
    }

    tbodyRow.appendChild(td);
  });
}

function rerenderAllCards() {
  const isThird = document.body.classList.contains("third-layout");
  const isFourth = document.body.classList.contains("fourth-layout");

  cardState.forEach((v) => {
    const asin = v.el.dataset.asin;

    const jpAsin = v.data["日本ASIN"] || "－";
    const usAsin = v.data["アメリカASIN"] || asin || "－";

    const realW = v.data["重量kg"] ?? v.data["重量（kg）"] ?? v.data["重量"] ?? "";
    const volW = v.data["容積重量"] ?? "";
    const size = v.data["サイズ"] || "－";
    const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;

    const ctx = { asin, jpAsin, usAsin, size, weight, data: v.data };

    if (isThird) {
      buildInfoGridSplit(
        v.el.querySelector(".js-infoGridA"),
        v.el.querySelector(".js-infoGridB"),
        ctx,
        v.data
      );
    } else {
      buildInfoGrid(v.el.querySelector(".js-infoGrid"), ctx, v.data);
    }

    if (isFourth) {
      buildCenterCards(v.el.querySelector(".js-centerCards"), ctx, v.data);
    } else {
      buildCenterList(v.el.querySelector(".js-center"), ctx, v.data);
    }
    buildDetailTable(v.el.querySelector(".js-detailTable"), ctx, v.data);

    applyImportantToCard(v.el, asin, v.data);
  });
}

/* =========================
   チャート（既存）
========================= */
function renderChart(canvas) {
  const labels = Array.from({ length: 180 }, (_, i) => `${180 - i}日`);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const rank = [];
  const sellers = [];
  const price = [];

  let r = 58000 + (Math.random() - 0.5) * 12000;
  let s = Math.max(1, Math.round(3 + Math.random() * 4));
  const basePrice = 30 + (Math.random() - 0.5) * 6;
  let p = basePrice;

  let nextPriceChangeIn = 1 + Math.floor(Math.random() * 4);

  for (let i = 0; i < labels.length; i++) {
    const prevR = r;

    const meanR = 60000;
    r += (meanR - r) * 0.06 + (Math.random() - 0.5) * 3500;

    if (Math.random() < 0.04) {
      r += (Math.random() < 0.5 ? -1 : 1) * (2500 + Math.random() * 3500);
    }

    r = clamp(r, 3000, 180000);

    const improved = r < prevR;
    const diff = Math.abs(r - prevR);

    let ds = 0;
    const incProb = clamp(0.08 + diff / 30000, 0.05, 0.35);
    const decProb = clamp(0.06 + diff / 40000, 0.04, 0.30);

    if (improved) {
      if (Math.random() < incProb) ds += 1;
      if (Math.random() < incProb * 0.25) ds += 1;
    } else {
      if (Math.random() < decProb) ds -= 1;
    }

    s = Math.round(clamp(s + ds, 1, 18));

    nextPriceChangeIn -= 1;
    if (nextPriceChangeIn <= 0) {
      nextPriceChangeIn = 2 + Math.floor(Math.random() * 6);

      const sellerPressure = (s - 3) * 0.55;
      const rankSignal = clamp((meanR - r) / 50000, -0.6, 0.6) * 0.9;
      const noise = (Math.random() - 0.5) * 0.6;

      const target = basePrice - sellerPressure - rankSignal + noise;

      p += (target - p) * 0.6;

      p = Math.round(p / 0.05) * 0.05;
      p = clamp(p, basePrice * 0.65, basePrice * 1.25);
    }

    rank.push(Math.round(r));
    sellers.push(s);
    price.push(Number(p.toFixed(2)));
  }

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "ランキング", data: rank, yAxisID: "y", tension: 0.25 },
        { label: "セラー数", data: sellers, yAxisID: "y1", tension: 0.25 },
        { label: "価格(USD)", data: price, yAxisID: "y2", tension: 0.25 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true } },
      scales: {
        y: { position: "left" },
        y1: { position: "right", grid: { drawOnChartArea: false } },
        y2: { position: "right", grid: { drawOnChartArea: false } }
      }
    }
  });

  return chart;
}

function updateChartVisibility(chart, showDS, showSP) {
  chart.data.datasets.forEach((ds) => {
    if (ds.label === "ランキング") ds.hidden = !showDS;
    if (ds.label === "セラー数") ds.hidden = !(showDS || showSP);
    if (ds.label === "価格(USD)") ds.hidden = !showSP;
  });
  chart.update();
}

/* =========================
   カート
========================= */
function updateCartSummary() {
  let totalCost = 0;
  let totalRevenueJPY = 0;
  let asinCount = cart.size;
  let itemCount = 0;

  cart.forEach((v) => {
    const qty = Math.max(1, Number(v.qty || 1));
    const sellUSD = Number(v.sellUSD || 0);
    const costJPY = Number(v.costJPY || 0);

    itemCount += qty;
    totalCost += costJPY * qty;
    totalRevenueJPY += sellUSD * FX_RATE * qty;
  });

  const profit = totalRevenueJPY - totalCost;

  cartTotalCost.textContent = fmtJPY(totalCost);
  cartTotalRevenue.textContent = fmtJPY(totalRevenueJPY);
  cartTotalProfit.textContent = fmtJPY(profit);
  cartAsinCount.textContent = String(asinCount);
  cartItemCount.textContent = String(itemCount);
}

/* =========================
   カード生成（既存 + メモ/重要視条件）
========================= */
function createProductCard(asin, data) {
  const card = document.createElement("section");
  card.className = "product-card card";
  card.dataset.asin = asin;

  const isAltLayout = document.body.classList.contains("alt-layout");
  const isThirdLayout = document.body.classList.contains("third-layout");
  const isFourthLayout = document.body.classList.contains("fourth-layout");

  if (isThirdLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="card-top-left">
          <div class="title">ASIN: ${asin}</div>
          <input class="memo-input js-memoInput" type="text" placeholder="メモ" />
        </div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout3-grid">
        <div class="l3-image l3-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <div class="l3-infoA l3-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGridA"></div>
        </div>

        <div class="l3-infoB l3-block">
          <div class="head">商品情報②</div>
          <div class="info-grid js-infoGridB"></div>
        </div>

        <div class="l3-center l3-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="l3-buy">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button">カートに入れる</button>
        </div>

        <div class="l3-graph l3-block">
          <div class="head">グラフ（180日）</div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">その他項目</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  } else if (isFourthLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="card-top-left">
          <div class="title">ASIN: ${asin}</div>
          <input class="memo-input js-memoInput" type="text" placeholder="メモ" />
        </div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout4-grid">
        <div class="l4-image l4-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <div class="l4-info l4-block">
          <div class="head">商品情報</div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <div class="l4-center l4-block">
          <div class="head">主要項目</div>
          <div class="center-cards js-centerCards"></div>
        </div>

        <div class="l4-buy l4-block">
          <div class="head">カート</div>
          <div class="buy-inner">
            <div class="buy-title">数量</div>
            <select class="js-qty">
              <option value="1" selected>1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>

            <div class="buy-title">販売価格（$）</div>
            <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

            <div class="buy-title">仕入れ額（￥）</div>
            <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

            <button class="cart-btn js-addCart" type="button">カートに入れる</button>
          </div>
        </div>

        <div class="l4-keepa l4-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

        <div class="l4-mes l4-block">
          <div class="head">需要供給グラフ（180日）</div>

          <div class="graph-options js-graphOptions" style="margin-bottom:10px;">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="mes-big">
            <canvas class="js-chart"></canvas>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">その他項目</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    card.innerHTML = isAltLayout
      ? `
      <div class="card-top">
        <div class="card-top-left">
          <div class="title">ASIN: ${asin}</div>
          <input class="memo-input js-memoInput" type="text" placeholder="メモ" />
        </div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="alt-grid">
        <div class="alt-left">
          <div class="alt-image image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>

          <div class="alt-info info-box">
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="alt-center center-box">
          <div class="center-head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="alt-graph graph-box">
          <div class="graph-head">
            <div class="graph-title">グラフ（180日）</div>
          </div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="keepa-wrap js-keepaWrap">
              <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
            </div>

            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
          </div>
        </div>

        <div class="alt-buy buy-box">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button">カートに入れる</button>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">その他項目</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `
      : `
      <div class="card-top">
        <div class="card-top-left">
          <div class="title">ASIN: ${asin}</div>
          <input class="memo-input js-memoInput" type="text" placeholder="メモ" />
        </div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="summary-row">
        <div class="left-wrap">
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />

            <div class="field">
              <label>数量</label>
              <select class="js-qty">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>

              <label>販売価格（$）</label>
              <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

              <label>仕入れ額（￥）</label>
              <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

              <button class="cart-btn js-addCart" type="button">カートに入れる</button>
            </div>
          </div>

          <div class="info-box">
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="center-box">
          <div class="center-head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="graph-box">
          <div class="graph-head">
            <div class="graph-title">グラフ（180日）</div>
            <div class="switch">
              <button type="button" class="js-btnMes active">MES-AI-A</button>
              <button type="button" class="js-btnKeepa">Keepa</button>
            </div>
          </div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
            <div class="keepa-wrap js-keepaWrap" style="display:none;">
              <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">その他項目</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  }

  // remove
  card.querySelector(".remove").addEventListener("click", () => {
    if (cart.has(asin)) {
      cart.delete(asin);
      updateCartSummary();
    }
    if (card.__chart) card.__chart.destroy();
    card.remove();
    cardState.delete(asin);

    if (cardState.size === 0) emptyState.style.display = "block";
    updateHeaderStatus();
  });

  // メモ（ASINごとに保存）
  const memoInput = card.querySelector(".js-memoInput");
  if (memoInput) {
    memoInput.value = getMemo(asin);
    let memoT = null;
    const save = () => setMemo(asin, memoInput.value);
    memoInput.addEventListener("input", () => {
      if (memoT) clearTimeout(memoT);
      memoT = setTimeout(save, 250);
    });
    memoInput.addEventListener("blur", save);
  }

  // inputs
  const sellInput = card.querySelector(".js-sell");
  const costInput = card.querySelector(".js-cost");

  if (data["販売額（ドル）"]) {
    const s = String(data["販売額（ドル）"]).replace(/[^\d.]/g, "");
    if (s) sellInput.value = s;
  }
  if (data["仕入れ目安単価"]) {
    const c = String(data["仕入れ目安単価"]).replace(/[^\d]/g, "");
    if (c) costInput.value = c;
  }

  card.querySelector(".js-addCart").addEventListener("click", () => {
    const qty = Math.max(1, Number(card.querySelector(".js-qty").value || 1));
    const sellUSD = num(sellInput.value);
    const costJPY = num(costInput.value);

    if (sellUSD <= 0) return alert("販売価格（$）を入力してください");
    if (costJPY <= 0) return alert("仕入れ額（￥）を入力してください");

    cart.set(asin, { qty, sellUSD, costJPY });
    updateCartSummary();
  });

  // ctx
  const jpAsin = data["日本ASIN"] || "－";
  const usAsin = data["アメリカASIN"] || asin;
  const realW = data["重量kg"] ?? data["重量（kg）"] ?? data["重量"] ?? "";
  const volW = data["容積重量"] ?? "";
  const size = data["サイズ"] || "－";
  const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;
  const ctx = { asin, jpAsin, usAsin, size, weight, data };

  // info
  if (isThirdLayout) {
    buildInfoGridSplit(card.querySelector(".js-infoGridA"), card.querySelector(".js-infoGridB"), ctx, data);
  } else {
    buildInfoGrid(card.querySelector(".js-infoGrid"), ctx, data);
  }

  // center / table
  if (isFourthLayout) {
    buildCenterCards(card.querySelector(".js-centerCards"), ctx, data);
  } else {
    buildCenterList(card.querySelector(".js-center"), ctx, data);
  }
  buildDetailTable(card.querySelector(".js-detailTable"), ctx, data);

  // 重要視条件（🔥）
  applyImportantToCard(card, asin, data);

  // chart
  const canvas = card.querySelector(".js-chart");
  const chart = renderChart(canvas);
  card.__chart = chart;

  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");
  const refreshVis = () => updateChartVisibility(chart, chkDS.checked, chkSP.checked);
  chkDS?.addEventListener("change", refreshVis);
  chkSP?.addEventListener("change", refreshVis);
  updateChartVisibility(chart, true, false);

  // keepa
  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame) keepaFrame.src = `https://keepa.com/#!product/1-${asin}`;

  // 通常レイアウトのみ：トグル維持
  if (!isAltLayout && !isThirdLayout && !isFourthLayout) {
    const keepaWrap = card.querySelector(".js-keepaWrap");
    const mesWrap = card.querySelector(".js-mesWrap");
    const graphOptions = card.querySelector(".js-graphOptions");
    const btnMes = card.querySelector(".js-btnMes");
    const btnKeepa = card.querySelector(".js-btnKeepa");

    function setMode(mode) {
      if (mode === "MES") {
        btnMes.classList.add("active");
        btnKeepa.classList.remove("active");
        graphOptions.style.display = "flex";
        mesWrap.style.display = "block";
        keepaWrap.style.display = "none";
      } else {
        btnKeepa.classList.add("active");
        btnMes.classList.remove("active");
        graphOptions.style.display = "none";
        mesWrap.style.display = "none";
        keepaWrap.style.display = "block";
      }
    }
    btnMes.addEventListener("click", () => setMode("MES"));
    btnKeepa.addEventListener("click", () => setMode("KEEPA"));
    setMode("MES");
  }

  return card;
}
