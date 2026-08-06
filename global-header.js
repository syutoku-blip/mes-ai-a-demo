/**
 * Global dev-site switcher bar.
 * Reads <body data-site="..." data-root="..."> to know which tab is
 * active and how to reach the repo root from the current page.
 *
 * Add to every page:
 *   <body data-site="community" data-root="..">
 *   <link rel="stylesheet" href="../header/global-header.css">
 *   <script src="../header/global-header.js" defer></script>
 */
(function () {
  var current = document.body.getAttribute('data-site') || '';
  var root = document.body.getAttribute('data-root') || '.';

  // サイトを追加する場合はここに1行足すだけでOK
  var sites = [
    { id: 'community', label: 'コミュニティ', href: root + '/community/index.html' },
    { id: 'dev1',      label: '開発①',       href: root + '/dev1/index.html' },
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

  bar.innerHTML = html;
  document.body.insertBefore(bar, document.body.firstChild);
})();
