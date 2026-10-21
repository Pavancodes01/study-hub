/* Playground: free SQL against the sample data. */
(function () {
  'use strict';
  var S = window.SDD;
  S.nav('play');
  var main = document.getElementById('main');
  var t = S.el('div', 'title');
  t.innerHTML = '<h1>Playground</h1><p class="one">Run any SQL against the sample tables. Every run starts from a <mark>fresh copy</mark>, so you can UPDATE and DELETE freely.</p>';
  main.appendChild(t);
  var box = S.el('div', 'play');
  box.style.maxWidth = '90ch';
  var ta = S.el('textarea');
  ta.spellcheck = false;
  ta.setAttribute('autocapitalize', 'off');
  ta.setAttribute('aria-label', 'SQL query');
  ta.value = S.get('play', 'SELECT c.name, COUNT(o.id) AS orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name\nORDER BY orders DESC;');
  ta.addEventListener('input', function () { S.set('play', ta.value); });
  box.appendChild(ta);
  var row = S.el('div', 'row');
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin:10px 0';
  var run = S.el('button', 'btn pri', 'Run');
  run.type = 'button';
  var msg = S.el('span', 'res');
  row.appendChild(run);
  row.appendChild(S.el('span', 'hint', 'Ctrl/⌘ + Enter'));
  row.appendChild(msg);
  box.appendChild(row);
  var out = S.el('div');
  box.appendChild(out);
  main.appendChild(box);
  main.appendChild(S.el('h3', null, 'Tables'));
  main.appendChild(S.tablePreviews(Object.keys(window.SDD_DATA.tables)));
  function go() {
    msg.className = 'res'; msg.textContent = 'Running…';
    S.runSql(ta.value).then(function (r) {
      msg.textContent = r.rows.length + ' row' + (r.rows.length === 1 ? '' : 's');
      out.innerHTML = r.cols.length ? S.grid(r.cols, r.rows) : '<p class="hint">Done. The last statement returned no result set.</p>';
    }).catch(function (e) {
      msg.className = 'res bad'; msg.textContent = 'Error';
      out.innerHTML = '<div class="err">' + S.esc(e.message || String(e)) + '</div>';
    });
  }
  run.addEventListener('click', go);
  ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go(); } });
})();
