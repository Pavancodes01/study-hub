/* SQL Deep Dive: registry, loader, progress store, nav, theme, SQL highlighter, table renderer. */
(function () {
  'use strict';
  var S = window.SDD = {};
  S.version = '1';

  S.tracks = [
    { id: 'basics', name: 'Basics', d: 'Reading data: filtering, NULL, sorting and expressions.' },
    { id: 'joins', name: 'Joins', d: 'Combining tables, and the row counts that surprise people.' },
    { id: 'agg', name: 'Aggregation', d: 'GROUP BY, HAVING and pivots with conditional aggregates.' },
    { id: 'sub', name: 'Subqueries & CTEs', d: 'Queries inside queries, EXISTS, WITH and recursion.' },
    { id: 'win', name: 'Window functions', d: 'Rankings, running totals and row-to-row comparisons.' },
    { id: 'design', name: 'Data & design', d: 'Tables, keys, changing data and normalization.' },
    { id: 'perf', name: 'Performance & transactions', d: 'Indexes, query plans, ACID and isolation.' },
    { id: 'classic', name: 'Interview classics', d: 'The problems that come up again and again.' }
  ];
  S.manifest = [
    'select', 'where', 'null', 'order-limit', 'distinct', 'expressions',
    'inner-join', 'left-join', 'full-cross', 'self-join', 'join-cardinality', 'set-ops',
    'aggregates', 'group-by', 'having', 'conditional-agg',
    'subqueries', 'exists', 'ctes', 'recursive',
    'window-basics', 'ranking', 'running-totals', 'lag-lead', 'ntile-percentiles',
    'ddl', 'dml', 'normalization', 'relationships',
    'indexes', 'explain', 'transactions', 'isolation',
    'nth-highest', 'duplicates', 'gaps-islands', 'median', 'retention'
  ];

  S.lessons = {};
  window.registerLesson = function (l) { S.lessons[l.slug] = l; };
  S.qs = function (k) { return new URLSearchParams(location.search).get(k); };
  S.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  S.inl = function (s) {
    return S.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  };
  S.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  S.load = function (paths, done) {
    var bust = location.protocol === 'file:' ? '' : '?v=' + S.version, i = 0;
    (function next() {
      if (i >= paths.length) { done(); return; }
      var s = document.createElement('script');
      s.src = paths[i++] + bust;
      s.onload = next; s.onerror = next;
      document.head.appendChild(s);
    })();
  };
  S.loadLessons = function (slugs, done) { S.load(slugs.map(function (s) { return 'data/lessons/' + s + '.js'; }), done); };
  S.ordered = function () { return S.manifest.map(function (s) { return S.lessons[s]; }).filter(Boolean); };

  var P = 'sdd:';
  S.get = function (k, d) { try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  S.set = function (k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* storage off */ } };
  S.passed = function (id) { return !!S.get('pass', {})[id]; };
  S.pass = function (id) { var m = S.get('pass', {}); m[id] = 1; S.set('pass', m); };
  S.TYPES = ['predict', 'fill', 'write'];
  S.drillIds = function (l) {
    var out = [];
    S.TYPES.forEach(function (t) { (l.drills[t] || []).forEach(function (x, i) { out.push(l.slug + ':' + t + ':' + i); }); });
    return out;
  };
  S.lessonScore = function (l) { var ids = S.drillIds(l); return { done: ids.filter(S.passed).length, total: ids.length }; };

  S.theme = function () {
    var b = document.querySelector('.mode');
    function cur() {
      return document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    function label() { b.textContent = cur() === 'dark' ? 'Light mode' : 'Dark mode'; }
    label();
    b.addEventListener('click', function () {
      var next = cur() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      S.set('theme', next);
      label();
    });
  };
  S.nav = function (cur) {
    var items = [['index.html', 'Course', 'course'], ['practice.html', 'Practice', 'practice'], ['playground.html', 'Playground', 'play']];
    var h = '<div class="in"><a class="brand" href="index.html">SQL <i>deep dive</i></a><nav class="links" aria-label="Main">';
    items.forEach(function (x) { h += '<a href="' + x[0] + '"' + (cur === x[2] ? ' aria-current="page"' : '') + '>' + x[1] + '</a>'; });
    h += '</nav><button class="mode" type="button">Dark mode</button></div>';
    document.querySelector('header.top').innerHTML = h;
    S.theme();
  };

  /* SQL highlighter */
  var KW = ('select from where and or not in is null as on join inner left right full outer cross group by having order asc desc limit offset ' +
    'distinct union all intersect except case when then else end with recursive insert into values update set delete create table ' +
    'primary key foreign references unique check default index drop alter add column if exists between like over partition rows range ' +
    'preceding following current row unbounded begin commit rollback transaction view natural using returning conflict do nothing ' +
    'filter window explain query plan true false collate integer text real autoincrement savepoint release cascade').split(' ');
  var KWS = {}; KW.forEach(function (k) { KWS[k] = 1; });
  var TOK = /(--.*$|'(?:[^']|'')*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z_0-9]*\b(?=\s*\()|\b[A-Za-z_][A-Za-z_0-9]*\b)/g;
  S.hl = function (line) {
    var out = '', last = 0;
    line.replace(TOK, function (m, _g, idx) {
      out += S.esc(line.slice(last, idx));
      var c = null;
      if (m.indexOf('--') === 0) c = 'c';
      else if (m[0] === "'") c = 's';
      else if (/^\d/.test(m)) c = 'n';
      else if (KWS[m.toLowerCase()]) c = 'k';
      else if (/\(/.test(line.slice(idx + m.length).replace(/^\s*/, '').charAt(0))) c = 'f';
      out += c ? '<span class="tk-' + c + '">' + S.esc(m) + '</span>' : S.esc(m);
      last = idx + m.length;
      return m;
    });
    return out + S.esc(line.slice(last));
  };
  S.hlBlock = function (src) { return src.split('\n').map(S.hl).join('\n'); };
  S.codeBox = function (src) {
    var box = S.el('div', 'code');
    box.appendChild(S.el('pre', null, '<code>' + S.hlBlock(src) + '</code>'));
    var b = S.el('button', 'copy', 'Copy');
    b.type = 'button';
    b.addEventListener('click', function () {
      try { navigator.clipboard.writeText(src).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1200); }); } catch (e) { /* no clipboard */ }
    });
    box.appendChild(b);
    return box;
  };

  /* Result tables */
  S.fmt = function (v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 1e6) / 1e6);
    return String(v);
  };
  S.grid = function (cols, rows, opt) {
    opt = opt || {};
    var h = '<table class="grid"><thead><tr>';
    cols.forEach(function (c, i) {
      var cls = [];
      if (opt.src && opt.src[i] && opt.src[i] !== ' ') cls.push(opt.src[i]);
      if (opt.hot && opt.hot.indexOf(i) >= 0) cls.push('hot');
      h += '<th' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + S.esc(c) + '</th>';
    });
    h += '</tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="' + cols.length + '" class="nul">(no rows)</td></tr>';
    var lastG = null;
    rows.forEach(function (r, ri) {
      var cls = [];
      var m = opt.marks ? opt.marks.charAt(ri) : ' ';
      if (m === 'd') cls.push('d'); else if (m === 'n') cls.push('n'); else if (m === 'h') cls.push('h');
      if (opt.groups) {
        var g = opt.groups[ri];
        if (g % 2 === 1) cls.push('g1');
        if (lastG !== null && g !== lastG) cls.push('gs');
        lastG = g;
      }
      h += '<tr' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>';
      r.forEach(function (v, ci) {
        var c = [];
        if (v === null) c.push('nul'); else if (typeof v === 'number') c.push('num');
        if (opt.hot && opt.hot.indexOf(ci) >= 0) c.push('hot');
        if (opt.key && opt.key.indexOf(ci) >= 0) c.push('gk');
        h += '<td' + (c.length ? ' class="' + c.join(' ') + '"' : '') + '>' + S.esc(S.fmt(v)) + '</td>';
      });
      h += '</tr>';
    });
    return '<div class="gwrap">' + h + '</tbody></table></div>';
  };
  /* Collapsible previews of the sample tables a lesson uses. */
  S.tablePreviews = function (names, open) {
    var box = S.el('div', 'tables');
    names.forEach(function (n) {
      var t = window.SDD_DATA.tables[n];
      if (!t) return;
      var d = S.el('details');
      if (open) d.open = true;
      d.innerHTML = '<summary>' + S.esc(n) + ' <span>' + t.rows.length + ' rows</span></summary>' + S.grid(window.SDD_DATA.colNames(n), t.rows);
      box.appendChild(d);
    });
    return box;
  };
})();
