// Export Lab シードデータ：アカウント一覧・フォーラム投稿一覧
// このファイルを書き換えるだけで、会員一覧・フォーラムの初期投稿を管理できます。
window.EL_CATEGORY_LABEL = {"amazon-ops": "Amazon販売・運用", "fba-inventory": "FBA・在庫管理", "amazon-account": "Amazon規制・アカウント", "amazon-sourcing": "Amazon仕入れ・商品選定", "fba-logistics": "FBA物流", "intl-logistics": "国際物流・通関", "ior": "IOR・輸入者", "overseas-warehouse": "海外倉庫・3PL", "fda-food": "FDA・食品規制", "fsvp": "FSVP", "food-label": "食品ラベル・表示", "fda-inspection": "FDA査察・違反対応", "food-safety": "食品安全・製造管理", "mocra": "MoCRA・化粧品規制", "overseas-ec": "海外EC・自社EC", "overseas-wholesale": "海外卸・BtoB", "overseas-sales": "海外営業・販路開拓", "biz-consulting": "経営・事業相談", "chat": "情報交換・雑談"};

window.EL_ACCOUNTS = [];

window.EL_TOPICS = [];

// ハッシュタグの表示ルール：サイト全体で10件以上使われているハッシュタグだけを
// 絞り込み・ハッシュタグ一覧・新規投稿の候補に表示する。
// 誰でも自由にハッシュタグを作成できるが、この基準を満たすまでは一覧には出てこない。
window.EL_TAG_THRESHOLD = 10;

window.EL_getTagCounts = function () {
  var extra = [];
  try { extra = JSON.parse(localStorage.getItem('el-user-topics') || '[]'); } catch (e) {}
  var allTopics = (window.EL_TOPICS || []).concat(extra);
  var counts = {};
  allTopics.forEach(function (t) {
    (t.tags || []).forEach(function (tag) {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return counts;
};

// 表示条件（10件以上）を満たしているタグのIDだけを、件数の多い順で返す
window.EL_getVisibleTags = function () {
  var counts = window.EL_getTagCounts();
  var threshold = window.EL_TAG_THRESHOLD;
  return Object.keys(counts)
    .filter(function (tag) { return counts[tag] >= threshold; })
    .sort(function (a, b) { return counts[b] - counts[a]; })
    .map(function (tag) { return { tag: tag, count: counts[tag] }; });
};

// 既知のハッシュタグの表示ラベル（無い場合は "#タグID" をそのまま使う）
window.EL_TAG_LABELS = {
  fba: '#FBA',
  'facility-registration': '#施設登録・更新',
  label: '#ラベル',
  'us-agent': '#米国代理人',
  'customs-docs': '#通関書類',
  research: '#リサーチ',
  warehouse: '#倉庫選定'
};

window.EL_getTagLabel = function (tag) {
  return window.EL_TAG_LABELS[tag] || ('#' + tag);
};
