// Export Lab シードデータ：アカウント一覧・フォーラム投稿一覧
// このファイルを書き換えるだけで、会員一覧・フォーラムの初期投稿を管理できます。
window.EL_CATEGORY_LABEL = {"amazon-ops": "Amazon販売・運用", "fba-inventory": "FBA・在庫管理", "amazon-account": "Amazon規制・アカウント", "amazon-sourcing": "Amazon仕入れ・商品選定", "fba-logistics": "FBA物流", "intl-logistics": "国際物流・通関", "ior": "IOR・輸入者", "overseas-warehouse": "海外倉庫・3PL", "fda-food": "FDA・食品規制", "fsvp": "FSVP", "food-label": "食品ラベル・表示", "fda-inspection": "FDA査察・違反対応", "food-safety": "食品安全・製造管理", "mocra": "MoCRA・化粧品規制", "overseas-ec": "海外EC・自社EC", "overseas-wholesale": "海外卸・BtoB", "overseas-sales": "海外営業・販路開拓", "biz-consulting": "経営・事業相談", "chat": "情報交換・雑談"};

// カテゴリのキー→表示ラベル変換（未登録のキー・自由入力の旧データはそのままの文字列を返す＝後方互換）。
// フォーラム・コミュニティで共通のカテゴリ一覧として使う。
window.EL_getCategoryLabel = function (key) {
  if (!key) return '';
  return window.EL_CATEGORY_LABEL[key] || key;
};

window.EL_ACCOUNTS = [];

// スプレッドシート連携：フォーラムの投稿データはすべて「フォーラム投稿」シートが唯一のソースです
// （デモ投稿46件もシート側へ移行済み）。ここでは毎回シートから最新の一覧を取得し、
// window.EL_TOPICS をまるごと差し替えます。各ページはこの関数のコールバック内でEL_TOPICSを
// 使った描画処理を行うことで、常に最新の投稿（デモ分＋新規投稿分）を反映できます。
window.EL_loadLiveTopics = function (callback) {
  var API_URL = 'https://script.google.com/macros/s/AKfycbxmuN59Cuokl597j9IZo3HIuYxFK4uZ-t17UFF6IZmBcz7s89-CLTy2stf0bOmVi-z1/exec';
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'listTopics' })
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var live = (data.ok ? data.items : []).map(function (t) {
        return {
          id: t.id, title: t.title, body: t.body, category: t.category, tags: t.tags || [],
          author: t.authorName || 'ゲスト', date: (t.createdAt || '').slice(0, 10),
          views: t.views || 0, recency: Date.parse(t.createdAt || '') || 0, status: t.status || 'unsolved',
          // ベストアンサーが選ばれているのにstatusが古いまま（未同期）の既存投稿でも「解決」と
          // 判定できるよう、bestAnswerCommentIdも一緒に持ち回す（board.html/forum.html/index.htmlの
          // 各解決バッジ表示側で、statusだけでなくこちらもフォールバックとして見る）。
          bestAnswerCommentId: t.bestAnswerCommentId || '',
          visibility: t.visibility || 'general', comments: new Array(t.commentCount || 0)
        };
      });
      window.EL_TOPICS = live;
      callback();
    })
    .catch(function () { callback(); });
};

window.EL_TOPICS = [];

// ハッシュタグの表示ルール：誰でも自由にハッシュタグを作成でき、使われているものは
// 件数に関わらずすべて絞り込み・ハッシュタグ一覧・新規投稿の候補に表示する。

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

// コミュニティの参加状態（参加中／申請中）：バックエンドにメンバーシップを記録するシートが
// 無いため、このブラウザでの参加操作をlocalStorageに記録して管理する
// （マーケットのお気に入り機能（el-market-favorites）と同じ、ブラウザ単位の実データという考え方）。
// { [groupId]: 'joined' | 'pending' } の形で保持する。
window.EL_getCommunityMemberships = function () {
  try { return JSON.parse(localStorage.getItem('el-community-memberships') || '{}'); } catch (e) { return {}; }
};
window.EL_setCommunityMembership = function (groupId, status) {
  if (!groupId) return;
  try {
    var map = window.EL_getCommunityMemberships();
    if (status) map[groupId] = status;
    else delete map[groupId];
    localStorage.setItem('el-community-memberships', JSON.stringify(map));
  } catch (e) {}
};

// 使われているタグをすべて、件数の多い順で返す
window.EL_getVisibleTags = function () {
  var counts = window.EL_getTagCounts();
  return Object.keys(counts)
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
