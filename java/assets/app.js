/* Java Deep Dive: registry, loader, progress store, nav, theme, Java highlighter. */
(function () {
  'use strict';
  var J = window.JDD = {};
  J.version = '1';

  J.tracks = [
    { id: 'basics', name: 'Basics', d: 'Primitives, methods, arrays and Strings, watched in memory.' },
    { id: 'oop', name: 'OOP in Java', d: 'Classes, inheritance, polymorphism and the contracts every object keeps.' },
    { id: 'core', name: 'Core APIs', d: 'Wrappers, exceptions, generics and the collections interviewers love.' },
    { id: 'func', name: 'Functional Java', d: 'Lambdas, method references, Streams and Optional.' },
    { id: 'conc', name: 'Concurrency', d: 'Threads, locks, visibility and the tools in java.util.concurrent.' },
    { id: 'jvm', name: 'JVM & modern Java', d: 'Memory, GC, class loading and the features from Java 14 to 21.' }
  ];

  /* Every lesson file, in course order. Slug = file name. */
  J.manifest = [
    'primitives', 'operators', 'control-flow', 'pass-by-value', 'arrays', 'strings', 'stringbuilder',
    'classes', 'static', 'inheritance', 'polymorphism', 'interfaces', 'equals-hashcode', 'access', 'nested', 'enums',
    'wrappers', 'exceptions', 'generics', 'collections', 'lists', 'hashmap', 'sets-maps', 'comparators', 'iterators', 'immutability',
    'lambdas', 'method-refs', 'streams', 'collectors', 'optional',
    'threads', 'synchronized', 'volatile', 'executors', 'completablefuture', 'locks-atomics', 'concurrent-collections', 'deadlock',
    'memory-model', 'gc', 'classloading', 'records', 'sealed', 'pattern-matching', 'var-textblocks', 'virtual-threads'
  ];

  J.lessons = {};
  window.registerLesson = function (l) { J.lessons[l.slug] = l; };

  J.qs = function (k) { return new URLSearchParams(location.search).get(k); };
  J.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* Inline markup for prose: `code`, **bold**. Escapes everything else. */
  J.inl = function (s) {
    return J.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  };
  J.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  /* Load scripts one after another (works from file://). */
  J.load = function (paths, done) {
    var bust = location.protocol === 'file:' ? '' : '?v=' + J.version;
    var i = 0;
    (function next() {
      if (i >= paths.length) { done(); return; }
      var s = document.createElement('script');
      s.src = paths[i++] + bust;
      s.onload = next;
      s.onerror = next;
      document.head.appendChild(s);
    })();
  };
  J.loadLessons = function (slugs, done) {
    J.load(slugs.map(function (s) { return 'data/lessons/' + s + '.js'; }), done);
  };
  J.ordered = function () {
    return J.manifest.map(function (s) { return J.lessons[s]; }).filter(Boolean);
  };

  /* Progress store. */
  var P = 'jdd:';
  J.get = function (k, d) {
    try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  };
  J.set = function (k, v) {
    try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* storage off */ }
  };
  J.passed = function (id) { return !!J.get('pass', {})[id]; };
  J.pass = function (id) { var m = J.get('pass', {}); m[id] = 1; J.set('pass', m); };
  J.lessonScore = function (l) {
    var ids = J.drillIds(l), done = ids.filter(J.passed).length;
    return { done: done, total: ids.length };
  };
  J.drillIds = function (l) {
    var out = [], d = l.drills || {};
    ['predict', 'fill', 'bug'].forEach(function (t) {
      (d[t] || []).forEach(function (x, i) { out.push(l.slug + ':' + t + ':' + i); });
    });
    return out;
  };

  /* Theme. */
  J.theme = function () {
    var t = J.get('theme', null);
    if (t) document.documentElement.setAttribute('data-theme', t);
    var b = document.querySelector('.mode');
    if (!b) return;
    function label() {
      var cur = document.documentElement.getAttribute('data-theme') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      b.textContent = cur === 'dark' ? 'Light mode' : 'Dark mode';
      return cur;
    }
    label();
    b.addEventListener('click', function () {
      var next = label() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      J.set('theme', next);
      label();
      document.dispatchEvent(new Event('jdd:theme'));
    });
  };

  /* Java highlighter: returns HTML for one line or a block. */
  var KW = 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record sealed permits non-sealed yield true false null';
  var KWS = {};
  KW.split(' ').forEach(function (k) { KWS[k] = 1; });
  var TOK = /(\/\/.*$|\/\*.*?\*\/|"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|@\w+|\b\d[\d_]*(?:\.\d+)?[LlFfDd]?\b|\b[A-Za-z_]\w*\b)/g;
  J.hl = function (src) {
    var out = '', last = 0;
    src.replace(TOK, function (m, _g, idx) {
      out += J.esc(src.slice(last, idx));
      var c = null;
      if (m.indexOf('//') === 0 || m.indexOf('/*') === 0) c = 'c';
      else if (m[0] === '"' || m[0] === "'") c = 's';
      else if (m[0] === '@') c = 'a';
      else if (/^\d/.test(m)) c = 'n';
      else if (KWS[m]) c = 'k';
      else if (/^[A-Z]/.test(m)) c = 't';
      out += c ? '<span class="tk-' + c + '">' + J.esc(m) + '</span>' : J.esc(m);
      last = idx + m.length;
      return m;
    });
    return out + J.esc(src.slice(last));
  };
  J.hlBlock = function (src) {
    return src.split('\n').map(J.hl).join('\n');
  };
  J.codeBox = function (src) {
    var box = J.el('div', 'code');
    var pre = J.el('pre', null, '<code>' + J.hlBlock(src) + '</code>');
    var b = J.el('button', 'copy', 'Copy');
    b.type = 'button';
    b.addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(src).then(function () {
          b.textContent = 'Copied';
          setTimeout(function () { b.textContent = 'Copy'; }, 1200);
        });
      } catch (e) { /* no clipboard */ }
    });
    box.appendChild(pre);
    box.appendChild(b);
    return box;
  };

  /* Top bar. */
  J.nav = function (cur) {
    var items = [['index.html', 'Course', 'course'], ['practice.html', 'Practice', 'practice']];
    var h = '<div class="in"><a class="brand" href="index.html">java<i>.</i>deep(dive)</a><nav class="links" aria-label="Main">';
    items.forEach(function (x) {
      h += '<a href="' + x[0] + '"' + (cur === x[2] ? ' aria-current="page"' : '') + '>' + x[1] + '</a>';
    });
    h += '</nav><button class="mode" type="button">Dark mode</button></div>';
    var top = document.querySelector('header.top');
    top.innerHTML = h;
    J.theme();
  };
})();
