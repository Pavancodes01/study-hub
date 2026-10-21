/* Pipeline stage: steps through a query in logical execution order and shows the working table.
   stage = { title, sql, chips?, steps: [{ clause, hl, text, cols?, rows?, m?, g?, src?, hot?, key? }] }
   m: one char per row (' ' normal, 'd' dropped, 'n' new, 'h' highlighted). g: group number per row.
   src: one char per column ('a' / 'b' join source). hot: new column indexes. Omitted cols/rows carry over. */
(function () {
  'use strict';
  var S = window.SDD;
  var ORDER = ['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'WINDOW', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'];

  function present(sql) {
    var u = ' ' + sql.toUpperCase().replace(/'(?:[^']|'')*'/g, "''").replace(/\s+/g, ' ') + ' ';
    return {
      'FROM': / FROM /.test(u), 'JOIN': / JOIN /.test(u), 'WHERE': / WHERE /.test(u), 'GROUP BY': / GROUP BY /.test(u),
      'HAVING': / HAVING /.test(u), 'SELECT': true, 'WINDOW': / OVER ?\(/.test(u), 'DISTINCT': / DISTINCT /.test(u),
      'ORDER BY': / ORDER BY /.test(u.replace(/OVER ?\([^)]*\)/g, '')), 'LIMIT': / LIMIT /.test(u)
    };
  }
  function marked(sql, hl) {
    var ranges = [];
    [].concat(hl || []).forEach(function (h) {
      var i = sql.indexOf(h);
      if (i >= 0) ranges.push([i, i + h.length]);
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    ranges.forEach(function (r) {
      if (r[0] < pos) return;
      out += S.hlBlock(sql.slice(pos, r[0])) + '<mark>' + S.hlBlock(sql.slice(r[0], r[1])) + '</mark>';
      pos = r[1];
    });
    return out + S.hlBlock(sql.slice(pos));
  }
  function fill(steps) {
    var prev = { cols: [], rows: [] };
    return steps.map(function (s) {
      var f = Object.assign({}, s);
      if (!f.cols) { f.cols = prev.cols; if (!f.src) f.src = prev.src; if (!f.key) f.key = prev.key; }
      if (!f.rows) f.rows = prev.rows;
      prev = f;
      return f;
    });
  }

  S.stage = function (host, stages) {
    var wrap = S.el('div', 'stage');
    wrap.tabIndex = 0;
    wrap.setAttribute('aria-label', 'Query pipeline. Use the left and right arrow keys to step.');
    var tabs = null;
    if (stages.length > 1) { tabs = S.el('div', 'stage-tabs'); wrap.appendChild(tabs); }
    var chips = S.el('div', 'rail-chips');
    wrap.appendChild(chips);
    var body = S.el('div', 'stage-body');
    var src = S.el('div', 'qsrc');
    var pre = S.el('pre');
    src.appendChild(pre);
    var tv = S.el('div', 'tview');
    var meta = S.el('div', 'tmeta');
    var tbl = S.el('div');
    tv.appendChild(meta); tv.appendChild(tbl);
    body.appendChild(src); body.appendChild(tv);
    wrap.appendChild(body);
    var bar = S.el('div', 'bar');
    var left = S.el('div');
    var count = S.el('p', 'n');
    var narr = S.el('p', 'narr');
    narr.setAttribute('aria-live', 'polite');
    left.appendChild(count); left.appendChild(narr);
    var ctr = S.el('div', 'ctrls');
    function mk(t, cls) { var b = S.el('button', 'btn sm' + (cls ? ' ' + cls : ''), t); b.type = 'button'; ctr.appendChild(b); return b; }
    var bReset = mk('Reset'), bBack = mk('Back'), bNext = mk('Next', 'pri');
    bar.appendChild(left); bar.appendChild(ctr);
    wrap.appendChild(bar);
    host.appendChild(wrap);
    host.appendChild(S.el('div', 'key',
      '<span><i style="background:var(--amber)"></i>current clause</span>' +
      '<span><i style="background:var(--brick-t);border:1px solid var(--brick)"></i>row removed</span>' +
      '<span><i style="background:var(--teal-t);border:1px solid var(--teal)"></i>row added / kept</span>' +
      '<span><i style="background:var(--srcA)"></i><i style="background:var(--srcB)"></i>join sources</span>'));

    var cur, steps, i = 0, has, chipList;
    function pick(n) {
      cur = stages[n];
      steps = fill(cur.steps);
      i = 0;
      has = present(cur.sql);
      chipList = cur.chips || ORDER.filter(function (c) { return has[c]; });
      if (tabs) Array.prototype.forEach.call(tabs.children, function (b, k) { b.setAttribute('aria-pressed', k === n ? 'true' : 'false'); });
      draw();
    }
    function draw() {
      var s = steps[i];
      count.textContent = 'Step ' + (i + 1) + ' of ' + steps.length + (cur.title && !tabs ? ' · ' + cur.title : '');
      narr.innerHTML = S.inl(s.text);
      bBack.disabled = i === 0;
      bNext.disabled = i === steps.length - 1;
      var at = chipList.indexOf(s.clause);
      chips.innerHTML = '';
      chipList.forEach(function (c, k) {
        if (k) chips.appendChild(S.el('span', 'chip-sep'));
        var cls = 'chip' + (k === at ? ' now' : (at >= 0 && k < at) || (at < 0 && i === steps.length - 1) ? ' done' : '');
        chips.appendChild(S.el('span', cls, S.esc(c)));
      });
      pre.innerHTML = marked(cur.sql, s.hl);
      var m = s.m || '', kept = 0, dropped = 0;
      s.rows.forEach(function (r, k) { if (m.charAt(k) === 'd') dropped++; else kept++; });
      meta.innerHTML = '<span>' + S.esc(s.label || 'working table') + '</span><span><b>' + kept + '</b> row' + (kept === 1 ? '' : 's') +
        (dropped ? ' kept · <b>' + dropped + '</b> removed' : '') + '</span>';
      tbl.innerHTML = S.grid(s.cols, s.rows, { marks: m, groups: s.g, src: s.src, hot: s.hot, key: s.key });
      tbl.firstChild.classList.add('flash');
      var mk = pre.querySelector('mark');
      if (mk) pre.scrollTop = Math.max(0, mk.offsetTop - pre.clientHeight / 3);
    }
    function go(n) { if (n < 0 || n >= steps.length) return; i = n; draw(); }
    bNext.addEventListener('click', function () { go(i + 1); });
    bBack.addEventListener('click', function () { go(i - 1); });
    bReset.addEventListener('click', function () { go(0); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); }
    });
    if (tabs) stages.forEach(function (st, n) {
      var b = S.el('button', null, S.esc(st.title));
      b.type = 'button';
      b.addEventListener('click', function () { pick(n); });
      tabs.appendChild(b);
    });
    pick(0);
  };
})();
