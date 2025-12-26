/* =========================
   MES-AI-A 商品分析  main.js
   ※修正：需要供給グラフ（180日）を「現実寄り」生成（価格=段階/ランキング=相関/セラー数=段階）
========================= */

// ------------------------------------------------------
// Constants
// ------------------------------------------------------
const FX_RATE = 155; // 固定為替（ダミー）
const STORAGE_KEY_METRICS_LAYOUT = "mesai_metrics_layout_v6";
const STORAGE_KEY_SORT_RULES = "mesai_sort_rules_v6";
const STORAGE_KEY_CART = "mesai_cart_v1";

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
function num(v) {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function fmtJPY(n) {
  return "￥" + Math.round(n).toLocaleString("ja-JP");
}
function fmtKg(v) {
  const n = num(v);
  if (!n) return "－";
  return `${n.toFixed(2)}kg`;
}
function uniq(arr) {
  return Array.from(new Set(arr));
}
function safeText(v) {
  return String(v ?? "－");
}
function escHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ------------------------------------------------------
// Globals
// ------------------------------------------------------
const asinCatalog = $("#asinCatalog");
const itemsContainer = $("#itemsContainer");
const emptyState = $("#emptyState");
const headerStatus = $("#headerStatus");

const metricsPoolZone = $("#metricsPoolZone");
const metricsInfoZone = $("#metricsInfoZone");
const metricsCenterZone = $("#metricsCenterZone");
const metricsTableZone = $("#metricsTableZone");
const metricsHiddenZone = $("#metricsHiddenZone");

const resetCurrentBtn = $("#resetCurrentBtn");
const clearCardsBtn = $("#clearCardsBtn");
const clearCartBtn = $("#clearCartBtn");
const metricsCollapseBtn = $("#metricsCollapseBtn");

const sortControls = $("#sortControls");
const addSortRuleBtn = $("#addSortRuleBtn");
const applySortBtn = $("#applySortBtn");
const clearSortBtn = $("#clearSortBtn");

const cartSummary = $("#cartSummary");
const cartTotalCost = $("#cartTotalCost");
const cartTotalRevenue = $("#cartTotalRevenue");
const cartTotalProfit = $("#cartTotalProfit");
const cartAsinCount = $("#cartAsinCount");
const cartItemCount = $("#cartItemCount");

const cardState = new Map(); // asin -> { el, data }
const cart = new Map(); // asin -> { qty, sellUSD, costJPY }

const ALL_METRICS = [
  "商品画像",
  "品名",
  "注意事項（警告系）",
  "親カテゴリ",
  "サブカテゴリ",
  "ブランド",
  "レビュー評価",
  "レビュー数推移グラフ",
  "アメリカASIN",
  "日本ASIN",
  "JAN",
  "SKU",
  "個数",
  "粗利益率予測",
  "入金額予測",
  "粗利益予測",
  "粗利益",
  "粗利益率",
  "販売額（ドル）",
  "入金額（円）",
  "入金額計（円）",
  "需給推移",
  "30日販売数",
  "90日販売数",
  "180日販売数",
  "予測30日販売数",
  "複数在庫指数45日分",
  "複数在庫指数60日分",
  "ライバル偏差1",
  "ライバル偏差2",
  "ライバル増加率",
  "在庫数",
  "Keepaリンク",
  "FBA出品",
  "返品率",
  "過去3月FBA最安値",
  "カートボックス価格",
  "FBA最安値",
  "日本最安値",
  "日本FBA最安値",
  "日本自己発送最安値",
  "仕入れ目安単価",
  "仕入合計",
  "仕入計",
  "重量kg",
  "サイズ",
  "サイズ感",
  "容積重量",
  "材質",
  "大型",
  "請求重量",
  "想定送料",
  "送料",
  "関税"
];

// 初期配置（従来のまま）
const DEFAULT_LAYOUT = {
  pool: [
    "粗利益率予測",
    "粗利益予測",
    "入金額予測",
    "販売額（ドル）",
    "在庫数",
    "ライバル増加率",
    "30日販売数",
    "90日販売数",
    "180日販売数",
    "FBA最安値",
    "カートボックス価格",
    "過去3月FBA最安値",
    "返品率",
    "FBA出品",
    "注意事項（警告系）",
    "親カテゴリ",
    "サブカテゴリ",
    "ブランド",
    "レビュー評価"
  ],
  info: ["品名", "アメリカASIN", "日本ASIN", "JAN", "SKU", "サイズ", "重量kg"],
  center: ["粗利益率予測", "粗利益予測", "入金額予測", "販売額（ドル）", "在庫数", "ライバル増加率"],
  table: ALL_METRICS.filter(
    (k) =>
      ![
        "品名",
        "アメリカASIN",
        "日本ASIN",
        "JAN",
        "SKU",
        "サイズ",
        "重量kg",
        "粗利益率予測",
        "粗利益予測",
        "入金額予測",
        "販売額（ドル）",
        "在庫数",
        "ライバル増加率"
      ].includes(k)
  ),
  hidden: []
};

// ------------------------------------------------------
// Layout persistence
// ------------------------------------------------------
function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_METRICS_LAYOUT);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    const obj = JSON.parse(raw);

    // 防御：欠けていても埋める
    const all = uniq(
      ([]).concat(obj.pool || [], obj.info || [], obj.center || [], obj.table || [], obj.hidden || [])
    );

    // ALL_METRICS に無いものを除外し、足りないものは pool に補完
    const cleaned = {
      pool: (obj.pool || []).filter((k) => ALL_METRICS.includes(k)),
      info: (obj.info || []).filter((k) => ALL_METRICS.includes(k)),
      center: (obj.center || []).filter((k) => ALL_METRICS.includes(k)),
      table: (obj.table || []).filter((k) => ALL_METRICS.includes(k)),
      hidden: (obj.hidden || []).filter((k) => ALL_METRICS.includes(k))
    };

    const missing = ALL_METRICS.filter((k) => !all.includes(k));
    cleaned.pool = uniq(cleaned.pool.concat(missing));

    // 重複排除（ゾーン間重複を防止）
    const used = new Set();
    ["info", "center", "table", "hidden", "pool"].forEach((zone) => {
      cleaned[zone] = cleaned[zone].filter((k) => {
        if (used.has(k)) return false;
        used.add(k);
        return true;
      });
    });

    return cleaned;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  }
}

function saveLayout(layout) {
  localStorage.setItem(STORAGE_KEY_METRICS_LAYOUT, JSON.stringify(layout));
}

// ------------------------------------------------------
// Metrics UI
// ------------------------------------------------------
let currentLayout = loadLayout();
let metricsCollapsed = false;

function metricChip(label) {
  const d = document.createElement("div");
  d.className = "metric-chip";
  d.draggable = true;
  d.dataset.metric = label;
  d.textContent = label;
  return d;
}

function renderMetricsBar() {
  metricsPoolZone.innerHTML = "";
  metricsInfoZone.innerHTML = "";
  metricsCenterZone.innerHTML = "";
  metricsTableZone.innerHTML = "";
  metricsHiddenZone.innerHTML = "";

  currentLayout.pool.forEach((k) => metricsPoolZone.appendChild(metricChip(k)));
  currentLayout.info.forEach((k) => metricsInfoZone.appendChild(metricChip(k)));
  currentLayout.center.forEach((k) => metricsCenterZone.appendChild(metricChip(k)));
  currentLayout.table.forEach((k) => metricsTableZone.appendChild(metricChip(k)));
  currentLayout.hidden.forEach((k) => metricsHiddenZone.appendChild(metricChip(k)));

  setupDnD();
}

function setupDnD() {
  const zones = [
    metricsPoolZone,
    metricsInfoZone,
    metricsCenterZone,
    metricsTableZone,
    metricsHiddenZone
  ];

  zones.forEach((z) => {
    z.addEventListener("dragover", (e) => {
      e.preventDefault();
      z.classList.add("drag-over");
    });
    z.addEventListener("dragleave", () => z.classList.remove("drag-over"));
    z.addEventListener("drop", (e) => {
      e.preventDefault();
      z.classList.remove("drag-over");
      const metric = e.dataTransfer.getData("text/plain");
      if (!metric) return;

      moveMetricToZone(metric, z.id);
    });
  });

  $all(".metric-chip").forEach((chip) => {
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", chip.dataset.metric);
      e.dataTransfer.effectAllowed = "move";
    });
  });
}

function moveMetricToZone(metric, zoneId) {
  const zoneMap = {
    metricsPoolZone: "pool",
    metricsInfoZone: "info",
    metricsCenterZone: "center",
    metricsTableZone: "table",
    metricsHiddenZone: "hidden"
  };
  const to = zoneMap[zoneId];
  if (!to) return;

  // まず全ゾーンから削除（重複排除）
  Object.keys(currentLayout).forEach((k) => {
    currentLayout[k] = currentLayout[k].filter((x) => x !== metric);
  });
  currentLayout[to].push(metric);

  saveLayout(currentLayout);
  renderMetricsBar();
  rerenderAllCards();
}

// ------------------------------------------------------
// Sort rules
// ------------------------------------------------------
function loadSortRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SORT_RULES);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => ({
        metric: r.metric || "",
        dir: r.dir === "asc" ? "asc" : "desc"
      }))
      .filter((r) => r.metric);
  } catch (e) {
    return [];
  }
}
function saveSortRules(rules) {
  localStorage.setItem(STORAGE_KEY_SORT_RULES, JSON.stringify(rules));
}

let sortRules = loadSortRules();

function renderSortControls() {
  sortControls.innerHTML = "";

  sortRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const sel = document.createElement("select");
    ALL_METRICS.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      if (m === r.metric) opt.selected = true;
      sel.appendChild(opt);
    });

    const dir = document.createElement("select");
    [{ v: "desc", t: "大きい順" }, { v: "asc", t: "小さい順" }].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.v;
      opt.textContent = o.t;
      if (o.v === r.dir) opt.selected = true;
      dir.appendChild(opt);
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      saveSortRules(sortRules);
      renderSortControls();
    });

    sel.addEventListener("change", () => {
      r.metric = sel.value;
      saveSortRules(sortRules);
    });
    dir.addEventListener("change", () => {
      r.dir = dir.value;
      saveSortRules(sortRules);
    });

    row.appendChild(sel);
    row.appendChild(dir);
    row.appendChild(del);
    sortControls.appendChild(row);
  });
}

// ------------------------------------------------------
// Card rendering & sorting
// ------------------------------------------------------
function getSortValue(data, key) {
  const v = data[key];
  if (v == null) return null;

  // 数値っぽいものは数値で返す
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  if (Number.isFinite(n) && String(v).match(/\d/)) return n;

  return String(v);
}

function sortAsins(asins) {
  if (!sortRules.length) return asins;

  const arr = asins.slice();
  arr.sort((a, b) => {
    const da = cardState.get(a)?.data || {};
    const db = cardState.get(b)?.data || {};

    for (const rule of sortRules) {
      const va = getSortValue(da, rule.metric);
      const vb = getSortValue(db, rule.metric);

      if (va == null && vb == null) continue;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === "number" && typeof vb === "number") {
        if (va === vb) continue;
        return rule.dir === "asc" ? va - vb : vb - va;
      } else {
        const sa = String(va);
        const sb = String(vb);
        if (sa === sb) continue;
        return rule.dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
    }
    return 0;
  });

  return arr;
}

function updateHeaderStatus() {
  headerStatus.textContent = `表示中：${cardState.size}件 / カート：${cart.size}件`;
}

// ------------------------------------------------------
// UI - Catalog
// ------------------------------------------------------
function renderCatalog() {
  asinCatalog.innerHTML = "";
  const asins = Object.keys(ASIN_DATA || {});
  asins.forEach((asin) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asin-btn";
    btn.textContent = asin;
    btn.addEventListener("click", () => addCard(asin));
    asinCatalog.appendChild(btn);
  });
}

// ------------------------------------------------------
// Cart persistence
// ------------------------------------------------------
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CART);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return;
    Object.entries(obj).forEach(([asin, v]) => {
      if (!asin) return;
      cart.set(asin, {
        qty: Math.max(1, Number(v.qty || 1)),
        sellUSD: Number(v.sellUSD || 0),
        costJPY: Number(v.costJPY || 0)
      });
    });
  } catch (e) {}
}
function saveCart() {
  const obj = {};
  cart.forEach((v, asin) => {
    obj[asin] = v;
  });
  localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(obj));
}

// ------------------------------------------------------
// Build grids (info / center / table)
// ------------------------------------------------------
function buildInfoGrid(root, ctx, data) {
  if (!root) return;
  root.innerHTML = "";

  const keys = currentLayout.info || [];
  keys.forEach((k) => {
    const row = document.createElement("div");
    row.className = "info-row";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = k;

    const value = document.createElement("div");
    value.className = "value";

    const v = data[k];
    if (k === "商品画像") {
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = v || "";
      img.alt = "商品画像";
      img.onerror = () => (img.style.display = "none");
      value.appendChild(img);
    } else if (k === "Keepaリンク") {
      const a = document.createElement("a");
      a.href = v || "#";
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = v ? "keepaを開く" : "－";
      value.appendChild(a);
    } else {
      value.textContent = safeText(v);
    }

    row.appendChild(label);
    row.appendChild(value);
    root.appendChild(row);
  });
}

function buildInfoGridSplit(rootA, rootB, ctx, data) {
  if (!rootA || !rootB) return;
  rootA.innerHTML = "";
  rootB.innerHTML = "";

  // infoの半分ずつ
  const keys = currentLayout.info || [];
  const mid = Math.ceil(keys.length / 2);
  const aKeys = keys.slice(0, mid);
  const bKeys = keys.slice(mid);

  const build = (root, ks) => {
    ks.forEach((k) => {
      const row = document.createElement("div");
      row.className = "info-row";

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = k;

      const value = document.createElement("div");
      value.className = "value";

      const v = data[k];
      if (k === "Keepaリンク") {
        const a = document.createElement("a");
        a.href = v || "#";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = v ? "keepaを開く" : "－";
        value.appendChild(a);
      } else {
        value.textContent = safeText(v);
      }

      row.appendChild(label);
      row.appendChild(value);
      root.appendChild(row);
    });
  };

  build(rootA, aKeys);
  build(rootB, bKeys);
}

function buildCenterList(root, ctx, data) {
  if (!root) return;
  root.innerHTML = "";

  const keys = currentLayout.center || [];
  keys.forEach((k) => {
    const li = document.createElement("div");
    li.className = "center-item";
    li.innerHTML = `<span>${escHtml(k)}</span><b>${escHtml(safeText(data[k]))}</b>`;
    root.appendChild(li);
  });
}

function buildCenterCards(root, ctx, data) {
  if (!root) return;
  root.innerHTML = "";

  const keys = currentLayout.center || [];
  keys.forEach((k) => {
    const c = document.createElement("div");
    c.className = "center-card";
    c.innerHTML = `
      <div class="label">${escHtml(k)}</div>
      <div class="value">${escHtml(safeText(data[k]))}</div>
    `;
    root.appendChild(c);
  });
}

function buildDetailTable(root, ctx, data) {
  if (!root) return;

  const theadRow = root.querySelector("thead tr");
  const tbodyRow = root.querySelector("tbody tr");
  if (!theadRow || !tbodyRow) return;

  theadRow.innerHTML = "";
  tbodyRow.innerHTML = "";

  const keys = currentLayout.table || [];
  keys.forEach((k) => {
    const th = document.createElement("th");
    th.textContent = k;
    theadRow.appendChild(th);

    const td = document.createElement("td");
    td.className = "info-td";

    const v = data[k];

    if (k === "Keepaリンク") {
      if (v) {
        td.innerHTML = `<a href="${escHtml(v)}" target="_blank" rel="noopener">keepaを開く</a>`;
      } else {
        td.textContent = "－";
      }
    } else if (k === "注意事項（警告系）") {
      // 文字が長い想定
      td.innerHTML = `<div class="info-td-scroll">${escHtml(safeText(v))}</div>`;
    } else {
      td.textContent = safeText(v);
    }

    tbodyRow.appendChild(td);
  });
}

// ------------------------------------------------------
// Rerender all cards (after layout change / sorting)
// ------------------------------------------------------
function rerenderAllCards() {
  if (!itemsContainer) return;
  const asins = sortAsins(Array.from(cardState.keys()));

  // 並べ替えのために一旦 detach
  const fragments = document.createDocumentFragment();
  asins.forEach((asin) => {
    const v = cardState.get(asin);
    if (!v) return;
    fragments.appendChild(v.el);
  });
  itemsContainer.innerHTML = "";
  itemsContainer.appendChild(fragments);

  // 各カード内の表示領域を再構築
  asins.forEach((asin) => {
    const v = cardState.get(asin);
    if (!v) return;

    const isThird = document.body.classList.contains("third-layout");
    const isFourth = document.body.classList.contains("fourth-layout");

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
  });

  updateHeaderStatus();
}

// ------------------------------------------------------
// Chart (需要供給/価格)
// ------------------------------------------------------
function renderChart(canvas, ctx = {}) {
  const DAYS = 180;

  // base hints (ASINデータがあればそれを優先)
  const basePrice =
    Number(ctx.sellUSD || 0) ||
    Number(String(ctx.data?.["販売額（ドル）"] || "").replace(/[^\d.]/g, "")) ||
    29.99;

  const sales180 = Number(ctx.data?.["180日販売数"] || 0) || 0;

  // 売れ行きが強いほどランキングが良くなる想定（※あくまでダミーの現実寄り生成）
  const baseRank = (() => {
    // sales180: 0..800 くらいを想定し、rank: 8,000..150,000 へマッピング
    const s = Math.max(0, Math.min(800, sales180));
    const t = s / 800; // 0..1
    const r = 150000 - t * 142000; // 150k -> 8k
    return Math.round(r);
  })();

  // 180日分の日付ラベル（古い→新しい）
  const today = new Date();
  const labels = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${m}/${dd}`;
  });

  // 乱数
  const rand = () => Math.random();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // 需要（=ランキングの逆）を滑らかに変動させるための潜在スコア
  let demand = 1.0 + rand() * 0.6; // 1.0〜1.6
  let sellers = Math.max(2, Math.round(4 + rand() * 5));
  let price = basePrice * (0.92 + rand() * 0.12);

  // keepaっぽい「価格は段階的に変わる」挙動
  let nextPriceChangeIn = 1 + Math.floor(rand() * 6); // 1〜6日

  const rankSeries = [];
  const sellerSeries = [];
  const priceSeries = [];

  for (let i = 0; i < DAYS; i++) {
    // demand: ゆっくりランダムウォーク＋平均回帰
    const mean = 1.15 + (sales180 ? (sales180 / 800) * 0.55 : 0.15); // 売れ行き強いほど平均需要↑
    demand += (mean - demand) * 0.06 + (rand() - 0.5) * 0.10;
    demand = clamp(demand, 0.65, 2.2);

    // ランキング：需要が高いほど小さい（良い）。ときどきスパイク（セール/在庫切れ想定）
    let rank = baseRank / demand + (rand() - 0.5) * 4500;
    // スパイク（悪化）: 低頻度
    if (rand() < 0.02) rank *= 1.8 + rand() * 0.6;
    // スパイク（改善）: 低頻度
    if (rand() < 0.02) rank *= 0.55 + rand() * 0.2;
    rank = Math.round(clamp(rank, 500, 250000));

    // セラー数：価格が高め・ランキングが良いとじわっと増え、悪いと減る（上限あり）
    const rankScore = clamp((60000 - rank) / 60000, -1, 1); // +なら良い
    const priceScore = clamp((price - basePrice) / basePrice, -0.5, 0.5);

    // 参入/撤退は「段階的」になりやすいので、確率で±1〜2
    let sellerDrift = 0;
    const entryProb = clamp(0.06 + rankScore * 0.08 + priceScore * 0.05, 0.01, 0.20);
    const exitProb = clamp(0.04 - rankScore * 0.05 - priceScore * 0.03, 0.01, 0.20);

    if (rand() < entryProb) sellerDrift += 1;
    if (rand() < entryProb * 0.25) sellerDrift += 1;
    if (rand() < exitProb) sellerDrift -= 1;

    sellers = clamp(sellers + sellerDrift, 1, 18);
    sellers = Math.round(sellers);

    // 価格：ランキングが良いと上がりやすいが、セラー増で下がりやすい（段階的に更新）
    nextPriceChangeIn -= 1;
    if (nextPriceChangeIn <= 0) {
      nextPriceChangeIn = 2 + Math.floor(rand() * 7); // 2〜8日ごとに更新

      const compPressure = Math.max(0, sellers - 4) * 0.012; // セラーが増えると下げ圧
      const demandLift = clamp(rankScore, -0.4, 0.7) * 0.10; // 需要で上げ圧
      const noise = (rand() - 0.5) * 0.03;

      const target = basePrice * (1 + demandLift - compPressure + noise);
      // 価格は急変しにくいので、目標へゆっくり
      price += (target - price) * 0.55;

      // keepaっぽく 0.05刻みで丸め
      price = Math.round(price / 0.05) * 0.05;
      price = clamp(price, basePrice * 0.65, basePrice * 1.35);
    }

    rankSeries.push(rank);
    sellerSeries.push(sellers);
    priceSeries.push(Number(price.toFixed(2)));
  }

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "価格(USD)",
          data: priceSeries,
          yAxisID: "yPrice",
          tension: 0,
          stepped: true,
          borderColor: "#f97316",
          pointRadius: 0,
          borderWidth: 2
        },
        {
          label: "ランキング",
          data: rankSeries,
          yAxisID: "yRank",
          tension: 0,
          borderColor: "#22c55e",
          pointRadius: 0,
          borderWidth: 2
        },
        {
          label: "セラー数",
          data: sellerSeries,
          yAxisID: "ySellers",
          tension: 0,
          stepped: true,
          borderColor: "#8b5cf6",
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true } },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            callback: (value, index) => (index % 10 === 0 ? labels[index] : "")
          },
          grid: { display: false }
        },
        yPrice: {
          position: "left",
          title: { display: true, text: "Price ($)" },
          grid: { color: "rgba(148,163,184,0.18)" }
        },
        yRank: {
          position: "right",
          reverse: true,
          title: { display: true, text: "Rank" },
          grid: { drawOnChartArea: false }
        },
        ySellers: {
          position: "right",
          offset: true,
          title: { display: true, text: "Sellers" },
          grid: { drawOnChartArea: false },
          suggestedMin: 0
        }
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

  saveCart();
}

/* =========================
   カード生成
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
      <div class="card-head">
        <div class="left">
          <div class="asin">ASIN: <b>${escHtml(asin)}</b></div>
          <div class="name">${escHtml(safeText(data["品名"]))}</div>
        </div>
        <button class="remove" type="button">×</button>
      </div>

      <div class="layout3-grid">
        <!-- 画像 -->
        <div class="l3-image l3-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img class="thumb main" src="${escHtml(data["商品画像"] || "")}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <!-- 情報A -->
        <div class="l3-infoA l3-block">
          <div class="head">商品情報</div>
          <div class="info-grid js-infoGridA"></div>
        </div>

        <!-- 情報B -->
        <div class="l3-infoB l3-block">
          <div class="head">商品情報（続き）</div>
          <div class="info-grid js-infoGridB"></div>
        </div>

        <!-- カート -->
        <div class="l3-buy">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title" style="margin-top:10px;">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title" style="margin-top:10px;">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button" style="margin-top:12px;">カートに入れる</button>

          <div style="margin-top:14px; border-top:1px solid rgba(229,231,235,0.8); padding-top:12px;">
            <div class="buy-title">グラフ（180日）</div>

            <div class="graph-options js-graphOptions">
              <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
              <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
            </div>

            <div class="graph-body" style="padding:10px 0 0;">
              <div class="canvas-wrap js-mesWrap" style="height:220px;">
                <canvas class="js-chart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- 中央 -->
        <div class="l3-center l3-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
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
    const imgSrc = escHtml(data["商品画像"] || "");
    card.innerHTML = `
      <div class="card-head">
        <div class="left">
          <div class="asin">ASIN: <b>${escHtml(asin)}</b></div>
          <div class="name">${escHtml(safeText(data["品名"]))}</div>
        </div>
        <button class="remove" type="button">×</button>
      </div>

      <div class="layout4-grid">
        <!-- 画像 -->
        <div class="l4-image l4-block">
          <div class="head">商品画像</div>
          <div class="image-grid">
            <img class="thumb main" src="${imgSrc}" alt="商品画像" onerror="this.style.display='none';" />
            <img class="thumb" src="${imgSrc}" alt="商品画像" onerror="this.style.display='none';" />
            <img class="thumb" src="${imgSrc}" alt="商品画像" onerror="this.style.display='none';" />
            <img class="thumb" src="${imgSrc}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <!-- 商品情報 -->
        <div class="l4-info l4-block">
          <div class="head">商品情報</div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <!-- 主要項目 -->
        <div class="l4-center l4-block">
          <div class="head">主要項目</div>
          <div class="center-cards js-centerCards"></div>
        </div>

        <!-- カート（右縦） -->
        <div class="l4-buy">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title" style="margin-top:10px;">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title" style="margin-top:10px;">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button" style="margin-top:12px;">カートに入れる</button>
        </div>

        <!-- keepa（小） -->
        <div class="l4-keepa l4-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

        <!-- 需要供給（大） -->
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
  } else if (isAltLayout) {
    card.innerHTML = `
      <div class="card-head">
        <div class="left">
          <div class="asin">ASIN: <b>${escHtml(asin)}</b></div>
          <div class="name">${escHtml(safeText(data["品名"]))}</div>
        </div>
        <button class="remove" type="button">×</button>
      </div>

      <div class="alt-grid">
        <div class="alt-left">
          <div class="alt-image card">
            <div class="image-box">
              <img class="thumb" src="${escHtml(data["商品画像"] || "")}" alt="商品画像" onerror="this.style.display='none';" />
            </div>
          </div>

          <div class="alt-info card">
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
    `;
  } else {
    card.innerHTML = `
      <div class="card-head">
        <div class="left">
          <div class="asin">ASIN: <b>${escHtml(asin)}</b></div>
          <div class="name">${escHtml(safeText(data["品名"]))}</div>
        </div>
        <button class="remove" type="button">×</button>
      </div>

      <div class="card-body">
        <div class="left">
          <div class="image-box">
            <img class="thumb" src="${escHtml(data["商品画像"] || "")}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <div class="right">
          <div class="center-box">
            <div class="center-head">主要項目</div>
            <div class="center-list js-center"></div>
          </div>

          <div class="graph-box">
            <div class="graph-head">
              <div class="graph-title">グラフ（180日）</div>
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

  // info / center / table
  if (isThirdLayout) {
    buildInfoGridSplit(
      card.querySelector(".js-infoGridA"),
      card.querySelector(".js-infoGridB"),
      ctx,
      data
    );
  } else {
    buildInfoGrid(card.querySelector(".js-infoGrid"), ctx, data);
  }

  if (isFourthLayout) {
    buildCenterCards(card.querySelector(".js-centerCards"), ctx, data);
  } else {
    buildCenterList(card.querySelector(".js-center"), ctx, data);
  }
  buildDetailTable(card.querySelector(".js-detailTable"), ctx, data);

  // chart
  const canvas = card.querySelector(".js-chart");
  const chart = renderChart(canvas, ctx);
  card.__chart = chart;

  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");

  const updateVisibility = () => {
    updateChartVisibility(chart, chkDS.checked, chkSP.checked);

    // 通常レイアウトは keepa iframe を使っていないので、そのまま
    // alt-layout では keepa と canvas を並べている（従来通り）
    // fourth-layout は keepa(小) と MES(大) のため、ここも従来通り
    // ※表示制御は既存仕様を維持
  };

  chkDS?.addEventListener("change", updateVisibility);
  chkSP?.addEventListener("change", updateVisibility);
  updateVisibility();

  // keepa
  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame) {
    // ダミー：実運用はASIN等からURL生成
    const keepaUrl = data["Keepaリンク"] || "";
    if (keepaUrl && keepaUrl.startsWith("http")) {
      keepaFrame.src = keepaUrl;
    } else {
      keepaFrame.src = "";
    }
  }

  return card;
}

// ------------------------------------------------------
// Add card
// ------------------------------------------------------
function addCard(asin) {
  if (cardState.has(asin)) return;

  const data = ASIN_DATA[asin];
  if (!data) return alert("ASINデータがありません");

  const card = createProductCard(asin, data);
  itemsContainer.appendChild(card);
  cardState.set(asin, { el: card, data });

  emptyState.style.display = "none";

  // ソート適用状態を維持
  rerenderAllCards();
}

// ------------------------------------------------------
// Metrics bar actions
// ------------------------------------------------------
resetCurrentBtn?.addEventListener("click", () => {
  currentLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  saveLayout(currentLayout);
  renderMetricsBar();
  rerenderAllCards();
});

clearCardsBtn?.addEventListener("click", () => {
  $all(".product-card").forEach((c) => {
    if (c.__chart) c.__chart.destroy();
    c.remove();
  });
  cardState.clear();
  emptyState.style.display = "block";
  updateHeaderStatus();
});

clearCartBtn?.addEventListener("click", () => {
  cart.clear();
  updateCartSummary();
});

metricsCollapseBtn?.addEventListener("click", () => {
  metricsCollapsed = !metricsCollapsed;
  const bar = $("#metricsBar");
  if (!bar) return;
  bar.classList.toggle("collapsed", metricsCollapsed);
  metricsCollapseBtn.textContent = metricsCollapsed ? "展開する" : "折りたたむ";
});

// ------------------------------------------------------
// Sort actions
// ------------------------------------------------------
addSortRuleBtn?.addEventListener("click", () => {
  sortRules.push({ metric: ALL_METRICS[0], dir: "desc" });
  saveSortRules(sortRules);
  renderSortControls();
});

applySortBtn?.addEventListener("click", () => {
  rerenderAllCards();
});

clearSortBtn?.addEventListener("click", () => {
  sortRules = [];
  saveSortRules(sortRules);
  renderSortControls();
  rerenderAllCards();
});

// ------------------------------------------------------
// Init
// ------------------------------------------------------
function init() {
  renderCatalog();
  renderMetricsBar();
  renderSortControls();
  loadCart();
  updateCartSummary();
  updateHeaderStatus();
}
init();
