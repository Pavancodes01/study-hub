/* Drills: predict the output, fill the blank, spot the bug.
   predict: { q?, code, answer, why }            answer = exact stdout
   fill:    { q, code, why }                     blanks written [[answer|alt]]
   bug:     { q, code, line, fix, why }          line = 1-based buggy line, fix = corrected line */
(function () {
  'use strict';
  var J = window.JDD;
  var BLANK = /\[\[(.+?)\]\](?!\])/g;
  var KIND = { predict: 'What does this print?', fill: 'Fill in the blank', bug: 'Spot the bug' };

  function norm(s) {
    return String(s).replace(/\r/g, '').split('\n').map(function (l) { return l.replace(/\s+$/, ''); })
      .join('\n').replace(/^\n+|\n+$/g, '');
  }
  function squash(s) { return String(s).replace(/\s+/g, ''); }

  function head(box, title, kind, id) {
    var h = J.el('div', 'drill-h');
    h.appendChild(J.el('h4', null, J.inl(title)));
    h.appendChild(J.el('span', 'k', kind));
    var ok = J.el('span', 'ok', J.passed(id) ? 'Passed' : '');
    h.appendChild(ok);
    box.appendChild(h);
    return ok;
  }
  function win(id, ok, onPass) {
    J.pass(id);
    ok.textContent = 'Passed';
    if (onPass) onPass();
  }
  function btn(t, cls) { var b = J.el('button', 'btn sm' + (cls ? ' ' + cls : ''), t); b.type = 'button'; return b; }

  function predict(box, d, id, onPass) {
    var ok = head(box, d.q || KIND.predict, d.q ? KIND.predict : 'Trace it in your head, then type the output.', id);
    box.appendChild(J.el('pre', 'c', J.hlBlock(d.code)));
    var lab = J.el('label', null, '<span style="font-weight:600;font-size:.9rem">Exact output, one line per println</span>');
    var ta = J.el('textarea');
    ta.spellcheck = false;
    ta.setAttribute('autocapitalize', 'off');
    lab.appendChild(ta);
    box.appendChild(lab);
    var r = J.el('div', 'row');
    var bc = btn('Check', 'pri'), bs = btn('Show answer');
    var res = J.el('span', 'res');
    r.appendChild(bc); r.appendChild(bs); r.appendChild(res);
    box.appendChild(r);
    var why = J.el('div', 'why');
    why.hidden = true;
    box.appendChild(why);
    function reveal() {
      why.innerHTML = '<b>Output</b><pre>' + J.esc(d.answer) + '</pre><p style="margin:8px 0 0">' + J.inl(d.why) + '</p>';
      why.hidden = false;
    }
    bc.addEventListener('click', function () {
      if (!ta.value.trim()) { res.className = 'res bad'; res.textContent = 'Type what you expect first.'; return; }
      if (norm(ta.value) === norm(d.answer)) {
        res.className = 'res good'; res.textContent = 'Correct.';
        reveal(); win(id, ok, onPass);
      } else {
        res.className = 'res bad'; res.textContent = 'Not quite. Trace it on paper, then try again.';
      }
    });
    bs.addEventListener('click', function () {
      reveal();
      res.className = 'res'; res.textContent = 'Answer shown, so this one is not marked passed.';
    });
  }

  function fillIn(box, d, id, onPass) {
    box.classList.add('fill');
    var ok = head(box, d.q, KIND.fill, id);
    var pre = J.el('pre', 'c');
    var answers = [], last = 0, html = '', m;
    BLANK.lastIndex = 0;
    while ((m = BLANK.exec(d.code))) {
      html += J.hlBlock(d.code.slice(last, m.index));
      var alts = m[1].split('|');
      answers.push(alts);
      var w = Math.max(4, alts[0].length + 1);
      html += '<input type="text" spellcheck="false" autocapitalize="off" aria-label="Blank ' + answers.length + '" size="' + w + '">';
      last = m.index + m[0].length;
    }
    html += J.hlBlock(d.code.slice(last));
    pre.innerHTML = html;
    box.appendChild(pre);
    var ins = pre.querySelectorAll('input');
    var r = J.el('div', 'row');
    var bc = btn('Check', 'pri'), bs = btn('Show answers');
    var res = J.el('span', 'res');
    r.appendChild(bc); r.appendChild(bs); r.appendChild(res);
    box.appendChild(r);
    var why = J.el('div', 'why');
    why.hidden = true;
    box.appendChild(why);
    bc.addEventListener('click', function () {
      var good = 0;
      Array.prototype.forEach.call(ins, function (inp, k) {
        var hit = answers[k].some(function (a) { return squash(a) === squash(inp.value); });
        inp.className = hit ? 'good' : 'bad';
        if (hit) good++;
      });
      if (good === ins.length) {
        res.className = 'res good'; res.textContent = 'All blanks right.';
        why.innerHTML = J.inl(d.why); why.hidden = false;
        win(id, ok, onPass);
      } else {
        res.className = 'res bad'; res.textContent = good + ' of ' + ins.length + ' right.';
      }
    });
    bs.addEventListener('click', function () {
      Array.prototype.forEach.call(ins, function (inp, k) { inp.value = answers[k][0]; inp.className = ''; });
      why.innerHTML = J.inl(d.why); why.hidden = false;
      res.className = 'res'; res.textContent = 'Answers shown, so this one is not marked passed.';
    });
  }

  function bug(box, d, id, onPass) {
    box.classList.add('bug');
    var ok = head(box, d.q, KIND.bug, id);
    box.appendChild(J.el('p', 'q', 'Click the line with the bug, then check.'));
    var pre = J.el('pre', 'c');
    var picked = 0;
    var spans = d.code.split('\n').map(function (t, k) {
      var s = J.el('span', 'bl', J.hl(t) || ' ');
      s.setAttribute('role', 'button');
      s.tabIndex = 0;
      function choose() {
        picked = k + 1;
        spans.forEach(function (x) { x.classList.remove('pick', 'right', 'wrong'); });
        s.classList.add('pick');
      }
      s.addEventListener('click', choose);
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { choose(); e.preventDefault(); } });
      pre.appendChild(s);
      return s;
    });
    box.appendChild(pre);
    var r = J.el('div', 'row');
    var bc = btn('Check', 'pri'), bs = btn('Show answer');
    var res = J.el('span', 'res');
    r.appendChild(bc); r.appendChild(bs); r.appendChild(res);
    box.appendChild(r);
    var why = J.el('div', 'why');
    why.hidden = true;
    box.appendChild(why);
    function reveal() {
      spans[d.line - 1].classList.add('right');
      why.innerHTML = '<p style="margin:0">' + J.inl(d.why) + '</p><b style="display:block;margin-top:8px">Fix</b><pre>' + J.hl(d.fix.trim()) + '</pre>';
      why.hidden = false;
    }
    bc.addEventListener('click', function () {
      if (!picked) { res.className = 'res bad'; res.textContent = 'Pick a line first.'; return; }
      spans.forEach(function (x) { x.classList.remove('pick', 'right', 'wrong'); });
      if (picked === d.line) {
        res.className = 'res good'; res.textContent = 'Found it.';
        reveal(); win(id, ok, onPass);
      } else {
        spans[picked - 1].classList.add('wrong');
        res.className = 'res bad'; res.textContent = 'That line is fine. Look again.';
      }
    });
    bs.addEventListener('click', function () {
      spans.forEach(function (x) { x.classList.remove('pick', 'wrong'); });
      reveal();
      res.className = 'res'; res.textContent = 'Answer shown, so this one is not marked passed.';
    });
  }

  J.KIND = KIND;
  J.drill = function (host, lesson, type, idx, onPass) {
    var d = lesson.drills[type][idx];
    var id = lesson.slug + ':' + type + ':' + idx;
    var box = J.el('div', 'drill');
    box.id = 'd-' + type + '-' + idx;
    ({ predict: predict, fill: fillIn, bug: bug })[type](box, d, id, onPass);
    host.appendChild(box);
    return box;
  };
  J.drills = function (host, lesson, onPass) {
    ['predict', 'fill', 'bug'].forEach(function (t) {
      (lesson.drills[t] || []).forEach(function (d, i) { J.drill(host, lesson, t, i, onPass); });
    });
  };
})();
