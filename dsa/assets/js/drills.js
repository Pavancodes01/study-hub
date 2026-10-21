// Practice engines: fill-in-the-blank code and idea-to-code line ordering.
// Fill blank code marks a blank as [[answer]] or [[answer|other accepted answer]].
(function(){
  var esc = function(s){ return DSA.esc(s); };
  var BLANK = /\[\[(.+?)\]\](?!\])/g;

  function norm(s){ return String(s).replace(/\s+/g, '').replace(/;+$/, ''); }

  function header(d, kind, done){
    return '<div class="drill-h"><h3>' + esc(d.title) + '</h3><span class="tag">' + kind + '</span>' +
      '<span class="state">' + (done ? 'Passed' : '') + '</span></div>' +
      (d.ask ? '<p class="ask">' + DSA.fmt(d.ask) + '</p>' : '');
  }

  function markPassed(box, slug, id){
    Store.setDrill(slug, id);
    box.querySelector('.state').textContent = 'Passed';
    document.dispatchEvent(new CustomEvent('dsa:progress'));
  }

  function fillBlank(box, d, slug){
    box.className = 'drill';
    var answers = [];
    var html = '';
    var last = 0;
    var code = d.code.replace(/^\n+|\s+$/g, '');
    code.replace(BLANK, function(m, inner, off){
      html += esc(code.slice(last, off));
      var alts = inner.split('|');
      var w = Math.max.apply(null, alts.map(function(a){ return a.length; }));
      html += '<input type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Blank ' + (answers.length + 1) + '" data-i="' + answers.length + '" style="width:' + (w + 2) + 'ch">';
      answers.push(alts);
      last = off + m.length;
      return m;
    });
    html += esc(code.slice(last));
    box.innerHTML = header(d, 'fill in the blanks', Store.drillDone(slug, d.id)) +
      '<div class="fb"><pre>' + html + '</pre></div>' +
      '<div class="row"><button class="btn primary sm" type="button" data-a="check">Check</button>' +
      '<button class="btn sm" type="button" data-a="hint">Hint</button>' +
      '<button class="btn sm" type="button" data-a="show">Show answers</button>' +
      '<button class="btn sm" type="button" data-a="clear">Clear</button><span class="res" aria-live="polite"></span></div>';
    var inputs = box.querySelectorAll('input');
    var res = box.querySelector('.res');
    var revealed = false;     // answers shown: a correct check does not count as passed
    function check(){
      var good = 0;
      inputs.forEach(function(inp, i){
        var ok = answers[i].some(function(a){ return norm(a) === norm(inp.value); });
        inp.classList.toggle('ok', ok);
        inp.classList.toggle('bad', !ok);
        if (ok) good++;
      });
      if (good === inputs.length && revealed){
        res.textContent = 'Matches, but the answers were shown. Press Clear and do it from memory to pass.';
        res.className = 'res';
      } else if (good === inputs.length){
        res.textContent = 'All correct. Now type the whole thing from memory once.';
        res.className = 'res ok';
        markPassed(box, slug, d.id);
      } else {
        res.textContent = good + ' of ' + inputs.length + ' correct. Red boxes need another look.';
        res.className = 'res bad';
      }
    }
    box.querySelector('[data-a=check]').addEventListener('click', check);
    box.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); check(); } });
    box.querySelector('[data-a=hint]').addEventListener('click', function(){
      for (var i = 0; i < inputs.length; i++){
        var inp = inputs[i];
        if (!answers[i].some(function(a){ return norm(a) === norm(inp.value); })){
          var a = answers[i][0];
          var have = inp.value;
          var n = 0;
          while (n < have.length && n < a.length && have[n] === a[n]) n++;
          inp.value = a.slice(0, Math.min(a.length, n + Math.max(1, Math.ceil(a.length / 4))));
          inp.classList.remove('ok', 'bad');
          inp.focus();
          res.textContent = 'Blank ' + (i + 1) + ': started it for you.';
          res.className = 'res';
          return;
        }
      }
      res.textContent = 'Every blank looks right. Press Check.';
    });
    box.querySelector('[data-a=show]').addEventListener('click', function(){
      revealed = true;
      inputs.forEach(function(inp, i){ inp.value = answers[i][0]; inp.classList.remove('bad'); inp.classList.add('ok'); });
      res.textContent = 'Answers shown. Clear and try again without looking.';
      res.className = 'res';
    });
    box.querySelector('[data-a=clear]').addEventListener('click', function(){
      revealed = false;
      inputs.forEach(function(inp){ inp.value = ''; inp.classList.remove('ok', 'bad'); });
      res.textContent = '';
      if (inputs[0]) inputs[0].focus();
    });
  }

  function shuffle(a){
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }

  function order(box, d, slug){
    box.className = 'drill';
    var correct = d.lines.map(function(l){ return l.replace(/\s+$/, ''); });
    var all = correct.concat(d.extra || []).map(function(t, i){ return { id: i, text: t }; });
    var pool, ans, revealed = false;
    function reset(){
      revealed = false;
      pool = shuffle(all);
      if (all.length > 2 && pool.every(function(x, i){ return x.id === i; })) pool.reverse();
      ans = [];
    }
    reset();
    box.innerHTML = header(d, 'idea to code' + (d.extra && d.extra.length ? ' · has wrong lines' : ''), Store.drillDone(slug, d.id)) +
      '<div class="ord"><div><p class="ord-sub">The idea, in plain English</p><ol class="idea-steps">' +
      d.ideaSteps.map(function(s){ return '<li>' + DSA.fmt(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div><p class="ord-sub">Your code (drag or use arrows to reorder)</p><ul class="lines ans"></ul>' +
      '<div class="pool"><p class="ord-sub" style="margin-top:12px">Lines to use (click to add' + (d.extra && d.extra.length ? '; some lines are traps' : '') + ')</p><ul class="lines src"></ul></div></div></div>' +
      '<div class="row"><button class="btn primary sm" type="button" data-a="check">Check</button>' +
      '<button class="btn sm" type="button" data-a="show">Show answer</button>' +
      '<button class="btn sm" type="button" data-a="reset">Start over</button><span class="res" aria-live="polite"></span></div>';
    var ansEl = box.querySelector('.ans'), srcEl = box.querySelector('.src'), res = box.querySelector('.res');

    function draw(){
      srcEl.innerHTML = '';
      pool.forEach(function(x){
        var li = document.createElement('li');
        li.innerHTML = '<span class="t"></span>';
        li.querySelector('.t').textContent = x.text;
        li.tabIndex = 0;
        li.setAttribute('role', 'button');
        li.addEventListener('click', function(){ move(x, true); });
        li.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); move(x, true); } });
        srcEl.appendChild(li);
      });
      if (!pool.length) srcEl.innerHTML = '<li style="background:transparent;color:var(--muted)">All lines placed.</li>';
      ansEl.innerHTML = '';
      ans.forEach(function(x, i){
        var li = document.createElement('li');
        li.dataset.i = i;
        li.innerHTML = '<span class="t"></span><button class="mv" type="button" aria-label="Move up">↑</button>' +
          '<button class="mv" type="button" aria-label="Move down">↓</button><button class="mv" type="button" aria-label="Remove">✕</button>';
        li.querySelector('.t').textContent = x.text;
        var b = li.querySelectorAll('.mv');
        b[0].addEventListener('click', function(){ swap(i, i - 1); });
        b[1].addEventListener('click', function(){ swap(i, i + 1); });
        b[2].addEventListener('click', function(){ move(x, false); });
        dragify(li, i);
        ansEl.appendChild(li);
      });
      if (!ans.length) ansEl.innerHTML = '<li style="background:transparent;color:#8D99B0">Click lines below to build your solution.</li>';
    }
    function move(x, toAns){
      if (toAns){ pool = pool.filter(function(y){ return y !== x; }); ans.push(x); }
      else { ans = ans.filter(function(y){ return y !== x; }); pool.push(x); }
      res.textContent = '';
      draw();
    }
    function swap(i, j){
      if (j < 0 || j >= ans.length) return;
      var t = ans[i]; ans[i] = ans[j]; ans[j] = t;
      draw();
      var btn = ansEl.children[j] && ansEl.children[j].querySelectorAll('.mv')[i < j ? 1 : 0];
      if (btn) btn.focus();
    }
    // Pointer drag inside the answer list.
    function dragify(li, i){
      var t = li.querySelector('.t');
      t.addEventListener('pointerdown', function(e){
        if (e.button !== 0) return;
        e.preventDefault();
        var from = i, to = i;
        li.classList.add('drag');
        try { t.setPointerCapture(e.pointerId); } catch(err){}
        function over(ev){
          var el = document.elementFromPoint(ev.clientX, ev.clientY);
          var hit = el && el.closest && el.closest('.ans > li');
          ansEl.querySelectorAll('li').forEach(function(x){ x.classList.remove('over'); });
          if (hit && hit.dataset.i !== undefined){ to = +hit.dataset.i; hit.classList.add('over'); }
        }
        function up(){
          t.removeEventListener('pointermove', over);
          t.removeEventListener('pointerup', up);
          t.removeEventListener('pointercancel', up);
          if (to !== from){ var x = ans.splice(from, 1)[0]; ans.splice(to, 0, x); }
          draw();
        }
        t.addEventListener('pointermove', over);
        t.addEventListener('pointerup', up);
        t.addEventListener('pointercancel', up);
      });
    }
    box.querySelector('[data-a=check]').addEventListener('click', function(){
      var lis = ansEl.querySelectorAll('li[data-i]');
      var good = 0;
      ans.forEach(function(x, i){
        var ok = i < correct.length && x.text.trim() === correct[i].trim();
        if (ok) good++;
        if (lis[i]){ lis[i].classList.toggle('ok', ok); lis[i].classList.toggle('bad', !ok); }
      });
      if (good === correct.length && ans.length === correct.length && revealed){
        res.textContent = 'Matches, but the answer was shown. Press Start over and rebuild it to pass.';
        res.className = 'res';
      } else if (good === correct.length && ans.length === correct.length){
        res.textContent = 'Correct order. Read it once more and say what each line does.';
        res.className = 'res ok';
        markPassed(box, slug, d.id);
      } else if (ans.length < correct.length){
        res.textContent = good + ' lines in the right place. ' + (correct.length - ans.length) + ' more line(s) needed.';
        res.className = 'res bad';
      } else {
        res.textContent = good + ' of ' + correct.length + ' in the right place.' + (ans.length > correct.length ? ' You used a trap line.' : '');
        res.className = 'res bad';
      }
    });
    box.querySelector('[data-a=show]').addEventListener('click', function(){
      revealed = true;
      ans = correct.map(function(_, i){ return all[i]; });
      pool = all.slice(correct.length);
      draw();
      res.textContent = 'Answer shown. Press Start over and rebuild it yourself.';
      res.className = 'res';
    });
    box.querySelector('[data-a=reset]').addEventListener('click', function(){ reset(); res.textContent = ''; draw(); });
    draw();
  }

  window.Drills = { fillBlank: fillBlank, order: order, norm: norm, BLANK: BLANK };
})();
