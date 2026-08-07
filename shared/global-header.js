/**
 * Global dev-site switcher bar.
 * Reads <body data-site="..." data-root="..."> to know which tab is
 * active and how to reach the repo root from the current page.
 *
 * Add to every page:
 *   <body data-site="community" data-root="..">
 *   <link rel="stylesheet" href="../shared/global-header.css">
 *   <script src="../shared/global-header.js" defer></script>
 */
(function () {
  var current = document.body.getAttribute('data-site') || '';
  var root = document.body.getAttribute('data-root') || '.';
  var STORAGE_KEY = 'gh-bar-collapsed';

  // サイトを追加する場合はここに1行足すだけでOK
  var sites = [
    { id: 'community', label: 'コミュニティ', href: root + '/community/index.html' },
    { id: 'dev1',      label: 'worldSHiFT member central',       href: root + '/dev1/index.html' },
    { id: 'dev2',      label: '開発②',       href: root + '/dev2/index.html' }
  ];

  var bar = document.createElement('div');
  bar.className = 'gh-bar';

  var html = '<span class="gh-label">DEV SITES</span>';
  sites.forEach(function (s) {
    var cls = s.id === current ? ' is-active' : '';
    html += '<a href="' + s.href + '" class="' + cls.trim() + '">' + s.label + '</a>';
  });
  html += '<span class="gh-spacer"></span><span class="gh-status">' + (current || 'index') + '</span>';
  html += '<button type="button" class="gh-toggle" aria-label="切り替えバーを閉じる">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>' +
          '</button>';

  bar.innerHTML = html;
  document.body.insertBefore(bar, document.body.firstChild);

  var reopen = document.createElement('button');
  reopen.type = 'button';
  reopen.className = 'gh-reopen';
  reopen.setAttribute('aria-label', '切り替えバーを開く');
  reopen.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>DEV SITES';
  document.body.insertBefore(reopen, bar.nextSibling);

  var toggleBtn = bar.querySelector('.gh-toggle');

  function applyState(collapsed) {
    bar.classList.toggle('is-collapsed', collapsed);
    reopen.classList.toggle('is-visible', collapsed);
    document.documentElement.style.setProperty('--gh-h', collapsed ? '0px' : '34px');
  }

  var collapsed = false;
  try { collapsed = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}
  applyState(collapsed);

  function toggle() {
    collapsed = !collapsed;
    applyState(collapsed);
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) {}
  }

  toggleBtn.addEventListener('click', toggle);
  reopen.addEventListener('click', toggle);
})();
