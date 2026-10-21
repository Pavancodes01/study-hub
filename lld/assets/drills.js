// Drills: scenario / which-pattern questions, order the steps, Java fill-in-the-blank, design the classes.
(function(){
  var esc = LLD.esc, fmt = LLD.fmt, S = LLD.store;
  function shuffle(a){ var b = a.slice(); for (var i = b.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
  function head(d, kind, slug){
    return '<div class="drill-h"><h4>' + esc(d.title) + '</h4><span class="k">' + kind + '</span><span class="ok">' + (S.passed(slug, d.id) ? 'Passed' : '') + '</span></div>' +
      (d.ask ? '<p class="q">' + fmt(d.ask) + '</p>' : '');
  }
  function win(box, slug, id){ S.pass(slug, id); box.querySelector('.ok').textContent = 'Passed'; document.dispatchEvent(new CustomEvent('lld:progress')); }

  // options: [[text, isRight, why]]
  function mcq(box, d, slug){
    box.className = 'drill';
    var opts = shuffle(d.options.map(function(o){ return { t: o[0], ok: !!o[1], why: o[2] || '' }; }));
    box.innerHTML = head(d, d.kind || 'Scenario', slug) + '<div class="opts">' + opts.map(function(o, k){
      return '<button type="button" data-k="' + k + '">' + fmt(o.t) + '<span class="why" hidden></span></button>'; }).join('') + '</div>' +
      '<div class="row"><span class="res" aria-live="polite"></span><button class="btn sm" type="button" data-a="again" hidden>Try again</button></div>';
    var bs = box.querySelectorAll('.opts button'), res = box.querySelector('.res'), again = box.querySelector('[data-a=again]');
    bs.forEach(function(b){
      b.addEventListener('click', function(){
        var o = opts[+b.dataset.k];
        bs.forEach(function(x){
          var ox = opts[+x.dataset.k]; x.disabled = true;
          if (ox.ok) x.classList.add('right');
          if (x === b && !ox.ok) x.classList.add('wrong');
          if (ox.why && (ox.ok || x === b)){ var w = x.querySelector('.why'); w.innerHTML = fmt(ox.why); w.hidden = false; }
        });
        if (o.ok){ res.textContent = 'Right.'; res.className = 'res good'; win(box, slug, d.id); }
        else { res.textContent = 'Not this one. Read why, then try again.'; res.className = 'res bad'; again.hidden = false; }
      });
    });
    again.addEventListener('click', function(){ mcq(box, d, slug); });
  }

  // steps: right order; extra: steps that do not belong
  function order(box, d, slug){
    box.className = 'drill';
    var right = d.steps, all = right.concat(d.extra || []), pool, ans, shown;
    function reset(){ shown = false; ans = []; pool = shuffle(all); if (pool.join() === all.join()) pool.reverse(); }
    reset();
    box.innerHTML = head(d, 'Order the steps' + (d.extra && d.extra.length ? ', one does not belong' : ''), slug) +
      '<ol class="olist ans"></ol><p class="q" style="margin:14px 0 6px;color:var(--soft)">Steps to place (click to add)</p><ul class="olist src"></ul>' +
      '<div class="row"><button class="btn pri sm" type="button" data-a="check">Check order</button><button class="btn sm" type="button" data-a="show">Show answer</button>' +
      '<button class="btn sm" type="button" data-a="reset">Start over</button><span class="res" aria-live="polite"></span></div>';
    var A = box.querySelector('.ans'), P = box.querySelector('.src'), res = box.querySelector('.res');
    function draw(){
      P.innerHTML = '';
      pool.forEach(function(t){
        var li = document.createElement('li'); li.innerHTML = '<span class="t"></span>'; li.querySelector('.t').innerHTML = fmt(t);
        li.tabIndex = 0; li.setAttribute('role', 'button');
        function add(){ pool.splice(pool.indexOf(t), 1); ans.push(t); res.textContent = ''; draw(); }
        li.addEventListener('click', add);
        li.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); add(); } });
        P.appendChild(li);
      });
      if (!pool.length) P.innerHTML = '<li style="border-style:dashed;color:var(--soft)">All steps placed.</li>';
      A.innerHTML = '';
      ans.forEach(function(t, i){
        var li = document.createElement('li'); li.dataset.i = i;
        li.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"></span><button class="mv" type="button" aria-label="Move up">↑</button><button class="mv" type="button" aria-label="Move down">↓</button><button class="mv" type="button" aria-label="Remove">✕</button>';
        li.querySelector('.t').innerHTML = fmt(t);
        var m = li.querySelectorAll('.mv');
        m[0].addEventListener('click', function(){ swap(i, i - 1); });
        m[1].addEventListener('click', function(){ swap(i, i + 1); });
        m[2].addEventListener('click', function(){ ans.splice(i, 1); pool.push(t); draw(); });
        drag(li, i);
        A.appendChild(li);
      });
      if (!ans.length) A.innerHTML = '<li style="border-style:dashed;color:var(--soft)">Click the steps below in the order you would do them.</li>';
    }
    function swap(i, j){ if (j < 0 || j >= ans.length) return; var t = ans[i]; ans[i] = ans[j]; ans[j] = t; draw(); }
    function drag(li, i){
      var h = li.querySelector('.t');
      h.addEventListener('pointerdown', function(e){
        if (e.button !== 0) return; e.preventDefault();
        var to = i; li.classList.add('drag');
        try { h.setPointerCapture(e.pointerId); } catch(err){}
        function mv(ev){ var hit = document.elementFromPoint(ev.clientX, ev.clientY); hit = hit && hit.closest && hit.closest('.ans > li');
          A.querySelectorAll('li').forEach(function(x){ x.classList.remove('over'); }); if (hit && hit.dataset.i !== undefined){ to = +hit.dataset.i; hit.classList.add('over'); } }
        function up(){ h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
          if (to !== i){ var x = ans.splice(i, 1)[0]; ans.splice(to, 0, x); } draw(); }
        h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      });
    }
    box.querySelector('[data-a=check]').addEventListener('click', function(){
      var good = 0, lis = A.querySelectorAll('li[data-i]');
      ans.forEach(function(t, i){ var ok = right[i] === t; if (ok) good++; if (lis[i]){ lis[i].classList.toggle('good', ok); lis[i].classList.toggle('bad', !ok); } });
      var full = good === right.length && ans.length === right.length;
      if (full && shown){ res.textContent = 'Matches, but the answer was shown. Start over to pass.'; res.className = 'res'; }
      else if (full){ res.textContent = 'Right order.'; res.className = 'res good'; win(box, slug, d.id); }
      else { res.textContent = good + ' of ' + right.length + ' in place.' + (ans.length > right.length ? ' A step that does not belong is in your list.' : ans.length < right.length ? ' ' + (right.length - ans.length) + ' more to place.' : ''); res.className = 'res bad'; }
    });
    box.querySelector('[data-a=show]').addEventListener('click', function(){ shown = true; ans = right.slice(); pool = (d.extra || []).slice(); draw(); res.textContent = 'Answer shown. Start over and build it to pass.'; res.className = 'res'; });
    box.querySelector('[data-a=reset]').addEventListener('click', function(){ reset(); res.textContent = ''; draw(); });
    draw();
  }

  // Java with blanks: [[answer|other accepted]]. Whitespace and a trailing semicolon are ignored.
  var BLANK = /\[\[(.+?)\]\](?!\])/g;
  function code(box, d, slug){
    box.className = 'drill fillcode';
    var answers = [], html = '', last = 0, src = d.code.replace(/^\n+|\s+$/g, ''), m;
    BLANK.lastIndex = 0;
    while ((m = BLANK.exec(src))){
      html += esc(src.slice(last, m.index));
      var alts = m[1].split('|');
      html += '<input type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Blank ' + (answers.length + 1) + '" style="width:' + (Math.max.apply(null, alts.map(function(a){ return a.length; })) + 2) + 'ch">';
      answers.push(alts); last = m.index + m[0].length;
    }
    html += esc(src.slice(last));
    box.innerHTML = head(d, 'Fill the Java', slug) + '<pre>' + html + '</pre>' +
      '<div class="row"><button class="btn pri sm" type="button" data-a="check">Check</button><button class="btn sm" type="button" data-a="hint">Hint</button>' +
      '<button class="btn sm" type="button" data-a="show">Show answers</button><button class="btn sm" type="button" data-a="clear">Clear</button><span class="res" aria-live="polite"></span></div>';
    var ins = box.querySelectorAll('input'), res = box.querySelector('.res'), shown = false;
    function norm(s){ return String(s).replace(/\s+/g, '').replace(/;+$/, ''); }
    function ok(i){ return answers[i].some(function(a){ return norm(a) === norm(ins[i].value); }); }
    function check(){
      var good = 0;
      ins.forEach(function(inp, i){ var y = ok(i); inp.classList.toggle('good', y); inp.classList.toggle('bad', !y); if (y) good++; });
      if (good === ins.length && !shown){ res.textContent = 'All correct.'; res.className = 'res good'; win(box, slug, d.id); }
      else if (good === ins.length){ res.textContent = 'Matches, but the answers were shown. Clear and type them yourself.'; res.className = 'res'; }
      else { res.textContent = good + ' of ' + ins.length + ' correct.'; res.className = 'res bad'; }
    }
    box.querySelector('[data-a=check]').addEventListener('click', check);
    box.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); check(); } });
    box.querySelector('[data-a=hint]').addEventListener('click', function(){
      for (var i = 0; i < ins.length; i++){
        if (!ok(i)){ var a = answers[i][0], n = 0, v = ins[i].value; while (n < v.length && v[n] === a[n]) n++;
          ins[i].value = a.slice(0, Math.min(a.length, n + Math.max(1, Math.ceil(a.length / 4)))); ins[i].classList.remove('good', 'bad'); ins[i].focus();
          res.textContent = 'Blank ' + (i + 1) + ' started for you.'; res.className = 'res'; return; }
      }
      res.textContent = 'All blanks look right. Press Check.';
    });
    box.querySelector('[data-a=show]').addEventListener('click', function(){ shown = true; ins.forEach(function(inp, i){ inp.value = answers[i][0]; inp.classList.remove('bad'); }); res.textContent = ''; });
    box.querySelector('[data-a=clear]').addEventListener('click', function(){ shown = false; ins.forEach(function(inp){ inp.value = ''; inp.classList.remove('good', 'bad'); }); res.textContent = ''; });
  }

  // Design the classes: pick classes / interfaces / patterns. parts: [[label, 'must'|'good'|'no', why]]
  function classes(box, d, slug){
    box.className = 'drill';
    var picked = {}, key = 'notes:' + slug + ':' + d.id;
    box.innerHTML = head(d, 'Design the classes', slug) + '<ul class="reqs">' + d.reqs.map(function(r){ return '<li>' + fmt(r) + '</li>'; }).join('') + '</ul>' +
      '<p class="q" style="margin:0 0 4px;color:var(--soft)">Pick what belongs in your design:</p><div class="picks">' +
      shuffle(d.parts.map(function(_, i){ return i; })).map(function(i){ return '<button type="button" aria-pressed="false" data-i="' + i + '">' + esc(d.parts[i][0]) + '</button>'; }).join('') + '</div>' +
      '<label for="n-' + d.id + '" class="q" style="display:block;margin:6px 0 4px;color:var(--soft)">Your reasoning (saved in this browser, not graded)</label><textarea id="n-' + d.id + '"></textarea>' +
      '<div class="row"><button class="btn pri sm" type="button" data-a="check">Compare with reference</button><button class="btn sm" type="button" data-a="reset">Start over</button><span class="res" aria-live="polite"></span></div><ul class="verdict"></ul>';
    var ta = box.querySelector('textarea'), res = box.querySelector('.res'), out = box.querySelector('.verdict');
    ta.value = S.get(key, ''); ta.addEventListener('input', function(){ S.set(key, ta.value); });
    box.querySelectorAll('.picks button').forEach(function(b){ b.addEventListener('click', function(){ var i = +b.dataset.i; picked[i] = !picked[i]; b.setAttribute('aria-pressed', picked[i] ? 'true' : 'false'); }); });
    box.querySelector('[data-a=check]').addEventListener('click', function(){
      var miss = 0, extra = 0, items = [];
      d.parts.forEach(function(p, i){
        var on = !!picked[i], b = box.querySelector('.picks button[data-i="' + i + '"]'); b.classList.remove('need', 'xtra');
        if (p[1] === 'must'){ b.classList.add('need'); if (on) items.push(['hit', '`' + p[0] + '`: ' + p[2]]); else { miss++; items.push(['miss', 'Missed `' + p[0] + '`. ' + p[2]]); } }
        else if (p[1] === 'no'){ if (on){ extra++; b.classList.add('xtra'); items.push(['extra', '`' + p[0] + '` does not belong. ' + p[2]]); } }
        else items.push(['opt', '`' + p[0] + '`' + (on ? ' (picked)' : '') + ': optional. ' + p[2]]);
      });
      out.innerHTML = items.map(function(x){ return '<li class="' + x[0] + '">' + fmt(x[1]) + '</li>'; }).join('');
      if (!miss && !extra){ res.textContent = 'Matches the reference design.'; res.className = 'res good'; win(box, slug, d.id); }
      else { res.textContent = miss + ' missing, ' + extra + ' not needed.'; res.className = 'res bad'; }
    });
    box.querySelector('[data-a=reset]').addEventListener('click', function(){ classes(box, d, slug); });
  }

  function all(host, p){
    var d = p.drills || {};
    function group(t, list, fn){
      if (!list || !list.length) return;
      var h = document.createElement('h3'); h.textContent = t; host.appendChild(h);
      list.forEach(function(x){ var b = document.createElement('div'); host.appendChild(b); fn(b, x, p.slug); });
    }
    group('Scenarios', d.mcq, mcq);
    group('Write the Java', d.code, code);
    group('Order the steps', d.order, order);
    if (d.classes) group('Design the classes', [d.classes], classes);
  }

  window.Drills = { mcq: mcq, order: order, code: code, classes: classes, all: all, BLANK: BLANK };
})();
