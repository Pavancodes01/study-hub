/* Drills.
   predict: { q?, sql, tables, answer: { cols, rows }, ordered?, why }
   fill:    { q, sql with [[answer|alt]] blanks, tables, answer: { cols, rows }, why }
   write:   { task, tables, solution, ordered?, hint?, why? }  (checked live with sql.js) */
(function () {
  'use strict';
  var S = window.SDD;
  var BLANK = /\[\[(.+?)\]\](?!\])/g;
  S.KIND = { predict: 'Predict the result', fill: 'Fill in the blank', write: 'Write the query' };

  function head(box, title, kind, id) {
    var h = S.el('div', 'drill-h');
    h.appendChild(S.el('h4', null, S.inl(title)));
    h.appendChild(S.el('span', 'k', kind));
    var ok = S.el('span', 'ok', S.passed(id) ? 'Passed' : '');
    h.appendChild(ok);
    box.appendChild(h);
    return ok;
  }
  function win(id, ok, onPass) { S.pass(id); ok.textContent = 'Passed'; if (onPass) onPass(); }
  function btn(t, cls) { var b = S.el('button', 'btn sm' + (cls ? ' ' + cls : ''), t); b.type = 'button'; return b; }
  function controls(box, labels) {
    var r = S.el('div', 'row'), out = {};
    labels.forEach(function (l) { out[l[0]] = btn(l[1], l[2]); r.appendChild(out[l[0]]); });
    out.res = S.el('span', 'res');
    r.appendChild(out.res);
    box.appendChild(r);
    out.why = S.el('div', 'why');
    out.why.hidden = true;
    box.appendChild(out.why);
    return out;
  }
  function isOrdered(d, sql) { return d.ordered != null ? d.ordered : /\border\s+by\b/i.test(sql.replace(/over\s*\([^)]*\)/gi, '')); }

  function predict(box, d, id, onPass) {
    var ok = head(box, d.q || 'What does this query return?', S.KIND.predict, id);
    if (d.tables) box.appendChild(S.tablePreviews(d.tables));
    box.appendChild(S.el('pre', 'c', S.hlBlock(d.sql)));
    var lab = S.el('label', null, '<span style="font-weight:500;font-size:.9rem">Result rows: one per line, values separated by commas. Write NULL for nulls.</span>');
    var ta = S.el('textarea');
    ta.spellcheck = false;
    ta.setAttribute('autocapitalize', 'off');
    lab.appendChild(ta);
    box.appendChild(lab);
    box.appendChild(S.el('p', 'hint', 'Columns: ' + S.esc(d.answer.cols.join(', ')) + (d.answer.rows.length === 0 ? '' : '') + '. Leave the box empty if you think no rows come back.'));
    var c = controls(box, [['check', 'Check', 'pri'], ['show', 'Show answer']]);
    function reveal() {
      c.why.innerHTML = '<b>Result</b>' + S.grid(d.answer.cols, d.answer.rows) + '<p style="margin:8px 0 0">' + S.inl(d.why) + '</p>';
      c.why.hidden = false;
    }
    c.check.addEventListener('click', function () {
      var typed = S.parseTyped(ta.value);
      if (typed.length && typed[0].join(',').toLowerCase() === d.answer.cols.join(',').toLowerCase()) typed.shift();
      if (S.sameRows(typed, d.answer.rows, isOrdered(d, d.sql))) {
        c.res.className = 'res good'; c.res.textContent = 'Correct.';
        reveal(); win(id, ok, onPass);
      } else {
        c.res.className = 'res bad';
        c.res.textContent = typed.length !== d.answer.rows.length
          ? 'Not quite. Check how many rows come back.' : 'Right number of rows, but some values differ.';
      }
    });
    c.show.addEventListener('click', function () { reveal(); c.res.className = 'res'; c.res.textContent = 'Answer shown, so this one is not marked passed.'; });
  }

  function fillIn(box, d, id, onPass) {
    box.classList.add('fill');
    var ok = head(box, d.q, S.KIND.fill, id);
    if (d.tables) box.appendChild(S.tablePreviews(d.tables));
    var pre = S.el('pre', 'c');
    var answers = [], last = 0, html = '', m;
    BLANK.lastIndex = 0;
    while ((m = BLANK.exec(d.sql))) {
      html += S.hlBlock(d.sql.slice(last, m.index));
      var alts = m[1].split('|');
      answers.push(alts);
      html += '<input type="text" spellcheck="false" autocapitalize="off" aria-label="Blank ' + answers.length + '" size="' + Math.max(4, alts[0].length + 1) + '">';
      last = m.index + m[0].length;
    }
    pre.innerHTML = html + S.hlBlock(d.sql.slice(last));
    box.appendChild(pre);
    var ins = pre.querySelectorAll('input');
    var c = controls(box, [['check', 'Check', 'pri'], ['show', 'Show answers']]);
    function sq(s) { return String(s).replace(/\s+/g, ' ').trim().toLowerCase(); }
    function reveal() {
      c.why.innerHTML = '<p style="margin:0">' + S.inl(d.why) + '</p><div class="result"><p class="lbl">Result</p>' + S.grid(d.answer.cols, d.answer.rows) + '</div>';
      c.why.hidden = false;
    }
    c.check.addEventListener('click', function () {
      var good = 0;
      Array.prototype.forEach.call(ins, function (inp, k) {
        var hit = answers[k].some(function (a) { return sq(a) === sq(inp.value); });
        inp.className = hit ? 'good' : 'bad';
        if (hit) good++;
      });
      if (good === ins.length) { c.res.className = 'res good'; c.res.textContent = 'All blanks right.'; reveal(); win(id, ok, onPass); }
      else { c.res.className = 'res bad'; c.res.textContent = good + ' of ' + ins.length + ' right.'; }
    });
    c.show.addEventListener('click', function () {
      Array.prototype.forEach.call(ins, function (inp, k) { inp.value = answers[k][0]; inp.className = ''; });
      reveal(); c.res.className = 'res'; c.res.textContent = 'Answers shown, so this one is not marked passed.';
    });
  }

  function write(box, d, id, onPass) {
    var ok = head(box, d.task, S.KIND.write, id);
    if (d.tables) box.appendChild(S.tablePreviews(d.tables));
    var ta = S.el('textarea');
    ta.spellcheck = false;
    ta.setAttribute('autocapitalize', 'off');
    ta.placeholder = 'SELECT ...';
    var draftKey = 'draft:' + id;
    ta.value = S.get(draftKey, '');
    ta.addEventListener('input', function () { S.set(draftKey, ta.value); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(true); } });
    box.appendChild(ta);
    if (d.hint) box.appendChild(S.el('p', 'hint', 'Hint: ' + S.inl(d.hint)));
    var c = controls(box, [['run', 'Run'], ['check', 'Check', 'pri'], ['show', 'Show solution']]);
    var out = S.el('div', 'result');
    box.insertBefore(out, c.why);
    function show(r) {
      out.innerHTML = '<p class="lbl">Your result · ' + r.rows.length + ' row' + (r.rows.length === 1 ? '' : 's') + '</p>' + S.grid(r.cols, r.rows);
    }
    function fail(e) { out.innerHTML = '<div class="err">' + S.esc(e.message || String(e)) + '</div>'; }
    function run(andCheck) {
      if (!ta.value.trim()) { c.res.className = 'res bad'; c.res.textContent = 'Write a query first.'; return; }
      c.res.className = 'res'; c.res.textContent = 'Running…';
      S.runSql(ta.value).then(function (mine) {
        show(mine);
        c.res.textContent = '';
        if (!andCheck) return;
        return S.runSql(d.solution).then(function (want) {
          var ordered = isOrdered(d, d.solution);
          if (mine.cols.length === want.cols.length && S.sameRows(mine.rows, want.rows, ordered)) {
            c.res.className = 'res good'; c.res.textContent = 'Matches the expected result.';
            if (d.why) { c.why.innerHTML = S.inl(d.why); c.why.hidden = false; }
            win(id, ok, onPass);
          } else {
            c.res.className = 'res bad';
            c.res.textContent = mine.cols.length !== want.cols.length
              ? 'Expected ' + want.cols.length + ' column' + (want.cols.length === 1 ? '' : 's') + ', got ' + mine.cols.length + '.'
              : (mine.rows.length !== want.rows.length ? 'Expected ' + want.rows.length + ' rows, got ' + mine.rows.length + '.' :
                (ordered ? 'Same size, but different values or order.' : 'Same size, but different values.'));
          }
        });
      }).catch(function (e) { c.res.className = 'res bad'; c.res.textContent = 'Error'; fail(e); });
    }
    c.run.addEventListener('click', function () { run(false); });
    c.check.addEventListener('click', function () { run(true); });
    c.show.addEventListener('click', function () {
      c.why.innerHTML = '<b>One solution</b><pre>' + S.hlBlock(d.solution) + '</pre>' + (d.why ? '<p style="margin:8px 0 0">' + S.inl(d.why) + '</p>' : '');
      c.why.hidden = false;
      c.res.className = 'res'; c.res.textContent = 'Solution shown, so this one is not marked passed.';
    });
  }

  S.drill = function (host, lesson, type, idx, onPass) {
    var d = lesson.drills[type][idx];
    var box = S.el('div', 'drill');
    ({ predict: predict, fill: fillIn, write: write })[type](box, d, lesson.slug + ':' + type + ':' + idx, onPass);
    host.appendChild(box);
    return box;
  };
  S.drills = function (host, lesson, onPass) {
    S.TYPES.forEach(function (t) { (lesson.drills[t] || []).forEach(function (d, i) { S.drill(host, lesson, t, i, onPass); }); });
  };
})();
