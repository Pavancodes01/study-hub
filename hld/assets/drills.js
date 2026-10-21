// Practice engines: scenario questions, order the steps, fill the trade-off sentence, design it yourself.
(function(){
  var esc = HLD.esc, fmt = HLD.fmt, S = HLD.store;

  function head(d, type, slug){
    return '<div class="drill-h"><h3>' + esc(d.title) + '</h3><span class="type">' + type + '</span><span class="done">' + (S.drillDone(slug, d.id) ? 'Passed' : '') + '</span></div>' +
      (d.ask ? '<p class="q">' + fmt(d.ask) + '</p>' : '');
  }
  function pass(box, slug, id){
    S.setDrill(slug, id);
    box.querySelector('.done').textContent = 'Passed';
    document.dispatchEvent(new CustomEvent('hld:progress'));
  }
  function shuffle(a){ var b = a.slice(); for (var i = b.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b; }

  // Scenario question. options: [[text, isRight, why]]. First pick counts.
  function mcq(box, d, slug){
    box.className = 'drill';
    var opts = shuffle(d.options.map(function(o, i){ return { t: o[0], ok: !!o[1], why: o[2] || '', i: i }; }));
    box.innerHTML = head(d, 'Scenario', slug) + '<div class="opts">' + opts.map(function(o, k){
      return '<button type="button" data-k="' + k + '">' + fmt(o.t) + '<span class="why" hidden></span></button>'; }).join('') + '</div>' +
      '<div class="row"><span class="res" aria-live="polite"></span><button class="btn sm" type="button" data-a="again" hidden>Try again</button></div>';
    var btns = box.querySelectorAll('.opts button'), res = box.querySelector('.res'), again = box.querySelector('[data-a=again]');
    btns.forEach(function(b){
      b.addEventListener('click', function(){
        var o = opts[+b.dataset.k];
        btns.forEach(function(x){
          var ox = opts[+x.dataset.k];
          x.disabled = true;
          if (ox.ok) x.classList.add('ok');
          if (x === b && !ox.ok) x.classList.add('bad');
          var w = x.querySelector('.why');
          if (ox.why && (ox.ok || x === b)){ w.innerHTML = fmt(ox.why); w.hidden = false; }
        });
        if (o.ok){ res.textContent = 'Right.'; res.className = 'res ok'; pass(box, slug, d.id); }
        else { res.textContent = 'Not this one. Read why, then try again.'; res.className = 'res bad'; again.hidden = false; }
      });
    });
    again.addEventListener('click', function(){ mcq(box, d, slug); });
  }

  // Put the steps in order. d.steps is the right order; d.extra are steps that do not belong.
  function order(box, d, slug){
    box.className = 'drill';
    var right = d.steps, all = right.concat(d.extra || []);
    var pool, ans, revealed;
    function reset(){ revealed = false; ans = []; pool = shuffle(all); if (pool.join() === all.join()) pool.reverse(); }
    reset();
    box.innerHTML = head(d, 'Order the steps' + (d.extra && d.extra.length ? ', one step does not belong' : ''), slug) +
      '<p class="why" style="margin:0 0 6px">Your order (drag, or use the arrows)</p><ol class="ordl ans"></ol>' +
      '<p class="why" style="margin:14px 0 6px">Steps to place (click to add)</p><ul class="ordl src"></ul>' +
      '<div class="row"><button class="btn go sm" type="button" data-a="check">Check order</button><button class="btn sm" type="button" data-a="show">Show answer</button>' +
      '<button class="btn sm" type="button" data-a="reset">Start over</button><span class="res" aria-live="polite"></span></div>';
    var A = box.querySelector('.ans'), P = box.querySelector('.src'), res = box.querySelector('.res');
    function draw(){
      P.innerHTML = '';
      pool.forEach(function(t){
        var li = document.createElement('li');
        li.innerHTML = '<span class="t"></span>'; li.querySelector('.t').innerHTML = fmt(t);
        li.tabIndex = 0; li.setAttribute('role', 'button');
        function add(){ pool.splice(pool.indexOf(t), 1); ans.push(t); res.textContent = ''; draw(); }
        li.addEventListener('click', add);
        li.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); add(); } });
        P.appendChild(li);
      });
      if (!pool.length) P.innerHTML = '<li style="border-style:dashed;color:var(--soft)">All steps placed.</li>';
      A.innerHTML = '';
      ans.forEach(function(t, i){
        var li = document.createElement('li');
        li.dataset.i = i;
        li.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"></span><button class="mv" type="button" aria-label="Move up">↑</button><button class="mv" type="button" aria-label="Move down">↓</button><button class="mv" type="button" aria-label="Remove">✕</button>';
        li.querySelector('.t').innerHTML = fmt(t);
        var m = li.querySelectorAll('.mv');
        m[0].addEventListener('click', function(){ swap(i, i - 1); });
        m[1].addEventListener('click', function(){ swap(i, i + 1); });
        m[2].addEventListener('click', function(){ ans.splice(i, 1); pool.push(t); draw(); });
        drag(li, i);
        A.appendChild(li);
      });
      if (!ans.length) A.innerHTML = '<li style="border-style:dashed;color:var(--soft)">Click steps below to build the sequence.</li>';
    }
    function swap(i, j){ if (j < 0 || j >= ans.length) return; var t = ans[i]; ans[i] = ans[j]; ans[j] = t; draw(); }
    function drag(li, i){
      var h = li.querySelector('.t');
      h.addEventListener('pointerdown', function(e){
        if (e.button !== 0) return;
        e.preventDefault();
        var to = i; li.classList.add('drag');
        try { h.setPointerCapture(e.pointerId); } catch(err){}
        function mv(ev){
          var hit = document.elementFromPoint(ev.clientX, ev.clientY);
          hit = hit && hit.closest && hit.closest('.ans > li');
          A.querySelectorAll('li').forEach(function(x){ x.classList.remove('over'); });
          if (hit && hit.dataset.i !== undefined){ to = +hit.dataset.i; hit.classList.add('over'); }
        }
        function up(){
          h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
          if (to !== i){ var x = ans.splice(i, 1)[0]; ans.splice(to, 0, x); }
          draw();
        }
        h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      });
    }
    box.querySelector('[data-a=check]').addEventListener('click', function(){
      var good = 0, lis = A.querySelectorAll('li[data-i]');
      ans.forEach(function(t, i){ var ok = right[i] === t; if (ok) good++; if (lis[i]){ lis[i].classList.toggle('ok', ok); lis[i].classList.toggle('bad', !ok); } });
      var full = good === right.length && ans.length === right.length;
      if (full && revealed){ res.textContent = 'Matches, but the answer was shown. Start over and rebuild it to pass.'; res.className = 'res'; }
      else if (full){ res.textContent = 'Right order.'; res.className = 'res ok'; pass(box, slug, d.id); }
      else if (ans.length < right.length){ res.textContent = good + ' in the right place. ' + (right.length - ans.length) + ' more step(s) to place.'; res.className = 'res bad'; }
      else { res.textContent = good + ' of ' + right.length + ' in the right place.' + (ans.length > right.length ? ' A step that does not belong is in your list.' : ''); res.className = 'res bad'; }
    });
    box.querySelector('[data-a=show]').addEventListener('click', function(){ revealed = true; ans = right.slice(); pool = (d.extra || []).slice(); draw(); res.textContent = 'Answer shown. Start over and build it yourself to pass.'; res.className = 'res'; });
    box.querySelector('[data-a=reset]').addEventListener('click', function(){ reset(); res.textContent = ''; draw(); });
    draw();
  }

  // Fill the sentence. Blanks are [[answer|other accepted]]. Case and spaces are ignored.
  function fill(box, d, slug){
    box.className = 'drill fill';
    var answers = [], html = '', last = 0, re = /\[\[(.+?)\]\]/g, m;
    while ((m = re.exec(d.text))){
      html += fmt(d.text.slice(last, m.index));
      var alts = m[1].split('|');
      html += '<input type="text" spellcheck="false" autocomplete="off" aria-label="Blank ' + (answers.length + 1) + '" style="width:' + (Math.max.apply(null, alts.map(function(a){ return a.length; })) + 3) + 'ch">';
      answers.push(alts);
      last = m.index + m[0].length;
    }
    html += fmt(d.text.slice(last));
    box.innerHTML = head(d, 'Fill the trade-off', slug) + '<p class="sentence">' + html + '</p>' +
      '<div class="row"><button class="btn go sm" type="button" data-a="check">Check</button><button class="btn sm" type="button" data-a="show">Show answer</button>' +
      '<button class="btn sm" type="button" data-a="clear">Clear</button><span class="res" aria-live="polite"></span></div>' + (d.why ? '<p class="why" hidden data-why>' + fmt(d.why) + '</p>' : '');
    var ins = box.querySelectorAll('input'), res = box.querySelector('.res'), why = box.querySelector('[data-why]'), revealed = false;
    function norm(s){ return String(s).toLowerCase().replace(/[\s\-_.]+/g, ''); }
    function check(){
      var good = 0;
      ins.forEach(function(inp, i){ var ok = answers[i].some(function(a){ return norm(a) === norm(inp.value); }); inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok); if (ok) good++; });
      if (good === ins.length && !revealed){ res.textContent = 'Right.'; res.className = 'res ok'; pass(box, slug, d.id); if (why) why.hidden = false; }
      else if (good === ins.length){ res.textContent = 'Matches, but the answer was shown. Clear it and try from memory.'; res.className = 'res'; }
      else { res.textContent = good + ' of ' + ins.length + ' right.'; res.className = 'res bad'; }
    }
    box.querySelector('[data-a=check]').addEventListener('click', check);
    box.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); check(); } });
    box.querySelector('[data-a=show]').addEventListener('click', function(){ revealed = true; ins.forEach(function(inp, i){ inp.value = answers[i][0]; inp.classList.remove('bad'); }); if (why) why.hidden = false; res.textContent = ''; });
    box.querySelector('[data-a=clear]').addEventListener('click', function(){ revealed = false; ins.forEach(function(inp){ inp.value = ''; inp.classList.remove('ok', 'bad'); }); res.textContent = ''; if (why) why.hidden = true; });
  }

  // Design it yourself: pick parts from a palette, write why, compare with the reference.
  // parts: [[label, 'must' | 'good' | 'no', why]]
  function palette(box, d, slug){
    box.className = 'drill';
    var picked = {};
    var key = 'notes:' + slug + ':' + d.id;
    box.innerHTML = head(d, 'Design it yourself', slug) +
      '<ul class="reqs">' + d.reqs.map(function(r){ return '<li>' + fmt(r) + '</li>'; }).join('') + '</ul>' +
      '<p class="why" style="margin:0 0 4px">Pick the parts you would put on the board:</p><div class="palette">' +
      shuffle(d.parts.map(function(_, i){ return i; })).map(function(i){ return '<button type="button" aria-pressed="false" data-i="' + i + '">' + esc(d.parts[i][0]) + '</button>'; }).join('') + '</div>' +
      '<label class="why" for="n-' + d.id + '" style="display:block;margin:6px 0 4px">Your reasoning (saved in this browser, not graded)</label><textarea id="n-' + d.id + '"></textarea>' +
      '<div class="row"><button class="btn go sm" type="button" data-a="check">Compare with reference</button><button class="btn sm" type="button" data-a="reset">Start over</button><span class="res" aria-live="polite"></span></div><ul class="verdict"></ul>';
    var ta = box.querySelector('textarea'), res = box.querySelector('.res'), out = box.querySelector('.verdict');
    ta.value = S.get(key, '');
    ta.addEventListener('input', function(){ S.set(key, ta.value); });
    box.querySelectorAll('.palette button').forEach(function(b){
      b.addEventListener('click', function(){ var i = +b.dataset.i; picked[i] = !picked[i]; b.setAttribute('aria-pressed', picked[i] ? 'true' : 'false'); });
    });
    box.querySelector('[data-a=check]').addEventListener('click', function(){
      var miss = 0, extra = 0, items = [];
      d.parts.forEach(function(p, i){
        var on = !!picked[i], btn = box.querySelector('.palette button[data-i="' + i + '"]');
        btn.classList.remove('must', 'wrong');
        if (p[1] === 'must'){ btn.classList.add('must'); if (on) items.push(['hit', p[0] + ': ' + p[2]]); else { miss++; items.push(['miss', 'Missed ' + p[0] + '. ' + p[2]]); } }
        else if (p[1] === 'no'){ if (on){ extra++; btn.classList.add('wrong'); items.push(['extra', p[0] + ' is not needed here. ' + p[2]]); } }
        else items.push(['opt', p[0] + (on ? ' (you picked it)' : '') + ': nice to have. ' + p[2]]);
      });
      out.innerHTML = items.map(function(x){ return '<li class="' + x[0] + '">' + fmt(x[1]) + '</li>'; }).join('');
      if (!miss && !extra){ res.textContent = 'Your board matches the reference.'; res.className = 'res ok'; pass(box, slug, d.id); }
      else { res.textContent = miss + ' missing, ' + extra + ' not needed. Read the notes, then start over.'; res.className = 'res bad'; }
    });
    box.querySelector('[data-a=reset]').addEventListener('click', function(){ palette(box, d, slug); });
  }

  // Render every drill of a page into host, grouped by type.
  function all(host, p){
    var d = p.drills || {};
    function group(title, list, fn){
      if (!list || !list.length) return;
      var h = document.createElement('h3'); h.textContent = title; host.appendChild(h);
      list.forEach(function(x){ var b = document.createElement('div'); host.appendChild(b); fn(b, x, p.slug); });
    }
    group('Scenarios', d.mcq, mcq);
    group('Order the steps', d.order, order);
    group('Say the trade-off', d.fill, fill);
    if (d.palette) group('Design it yourself', [d.palette], palette);
  }

  window.Drills = { mcq: mcq, order: order, fill: fill, palette: palette, all: all };
})();
