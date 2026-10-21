// Live playground: type values, press operations, watch the structure change.
// A structure file supplies play = {
//   title, hint, inputs:[{ph, type:'number'|'text', def}], varName,
//   init() -> state (plain JSON),
//   ops:[{ id, label, args:0|1|2, use:[input indexes, default 0..args-1], cost, run(state, a, b) -> {msg, java, ret, hl, err} }],
//   view(state, hl) -> [Viz panels],
//   random(state) -> [[opId, a, b], ...]   (optional, for "Random fill")
// }
// run() changes state in place. Returning err leaves the state untouched (it is restored from a copy).
(function(){
  var esc = DSA.esc;
  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function rnd(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  function mount(root, play){
    var inputs = play.inputs || [{ ph: 'value', type: 'number' }];
    root.className = 'play';
    root.innerHTML =
      '<div class="play-main"><div class="play-h"><h2>' + esc(play.title || 'Playground') + '</h2>' +
      '<p class="sub">' + DSA.fmt(play.hint || 'Type a value, then press an operation.') + '</p></div>' +
      '<div class="play-ctl"><div class="play-in">' + inputs.map(function(f, i){
        return '<input type="text" data-i="' + i + '" aria-label="' + esc(f.ph) + '" placeholder="' + esc(f.ph) + '" spellcheck="false" autocomplete="off" autocapitalize="off"' +
          (f.type === 'number' ? ' inputmode="numeric"' : '') + (f.def !== undefined ? ' value="' + esc(f.def) + '"' : '') + '>';
      }).join('') + '</div>' +
      '<div class="play-ops">' + play.ops.map(function(o){
        return '<button class="btn sm op" type="button" data-op="' + esc(o.id) + '">' + esc(o.label) + (o.cost ? '<i>' + esc(o.cost) + '</i>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="play-util"><button class="btn sm" type="button" data-a="undo">Undo</button>' +
      '<button class="btn sm" type="button" data-a="rand">Random fill</button>' +
      '<button class="btn sm" type="button" data-a="reset">Reset</button></div></div>' +
      '<div class="stage"></div><div class="msg" aria-live="polite"></div></div>' +
      '<div class="play-log"><div class="code"><button class="copy" type="button">Copy</button><div class="lg-h">Java you ran</div><pre><code></code></pre></div></div>';

    var stage = root.querySelector('.stage'), msg = root.querySelector('.msg');
    var logCode = root.querySelector('.play-log code');
    var ins = root.querySelectorAll('.play-in input');
    var undoBtn = root.querySelector('[data-a=undo]');
    var state, hist, log, hl;

    function draw(){
      Viz.renderPanels(stage, play.view(state, hl || {}));
      logCode.textContent = log.length ? log.join('\n') : '// operations you press show up here';
      undoBtn.disabled = !hist.length;
    }
    function reset(){
      state = play.init(); hist = []; log = (play.setup ? [play.setup] : []); hl = {};
      msg.className = 'msg';
      msg.innerHTML = DSA.fmt(play.start || 'Empty. Try an operation.');
      draw();
    }
    function readArg(i){
      var f = inputs[i] || inputs[0], raw = (ins[i] || ins[0]).value.trim();
      if (raw === '') return { err: 'Type a value in the **' + f.ph + '** box first.' };
      if (f.type === 'number'){
        if (!/^-?\d+$/.test(raw)) return { err: '**' + f.ph + '** must be a whole number.' };
        var n = parseInt(raw, 10);
        if (Math.abs(n) > 999) return { err: 'Keep numbers between -999 and 999 so they fit in the picture.' };
        return { v: n };
      }
      if (raw.length > 12) return { err: 'Keep text to 12 characters or fewer.' };
      return { v: raw };
    }
    function apply(op, a, b, quiet){
      var before = clone(state);
      var r = op.run(state, a, b) || {};
      if (r.err){
        state = before;
        if (!quiet){ msg.className = 'msg bad'; msg.innerHTML = DSA.fmt(r.err); }
        return false;
      }
      hist.push(before);
      if (hist.length > 60) hist.shift();
      if (r.java) log.push(r.java + (r.ret !== undefined ? '   // → ' + r.ret : ''));
      if (log.length > 40) log.splice(play.setup ? 1 : 0, 1);
      hl = r.hl || {};
      if (!quiet){ msg.className = 'msg' + (r.ok ? ' found' : ''); msg.innerHTML = DSA.fmt(r.msg || ''); }
      return true;
    }
    function press(id){
      var op = play.ops.filter(function(o){ return o.id === id; })[0];
      var args = [], use = op.use || [0, 1].slice(0, op.args || 0);
      for (var k = 0; k < use.length; k++){
        var i = use[k], r = readArg(i);
        if (r.err){ msg.className = 'msg bad'; msg.innerHTML = DSA.fmt(r.err); (ins[i] || ins[0]).focus(); return; }
        args.push(r.v);
      }
      apply(op, args[0], args[1]);
      draw();
      if (op.args){
        ins.forEach(function(x, i){ var f = inputs[i]; if (f.type === 'number' && !f.keep) x.value = ''; });
        ins[0].focus();
      }
    }
    root.querySelectorAll('[data-op]').forEach(function(b){
      b.addEventListener('click', function(){ press(b.dataset.op); });
    });
    ins.forEach(function(inp){
      inp.addEventListener('keydown', function(e){
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var first = play.ops.filter(function(o){ return o.args; })[0];
        if (first) press(first.id);
      });
    });
    undoBtn.addEventListener('click', function(){
      if (!hist.length) return;
      state = hist.pop();
      if (log.length > (play.setup ? 1 : 0)) log.pop();
      hl = {};
      msg.className = 'msg';
      msg.innerHTML = 'Undid the last operation.';
      draw();
    });
    root.querySelector('[data-a=reset]').addEventListener('click', reset);
    root.querySelector('[data-a=rand]').addEventListener('click', function(){
      var list = play.random ? play.random(state, rnd) : [0, 0, 0, 0].map(function(){ return [play.ops[0].id, rnd(1, 99)]; });
      var n = 0;
      list.forEach(function(x){
        var op = play.ops.filter(function(o){ return o.id === x[0]; })[0];
        if (op && apply(op, x[1], x[2], true)) n++;
      });
      hl = {};
      msg.className = 'msg';
      msg.innerHTML = DSA.fmt(n ? 'Ran ' + n + ' random operation' + (n === 1 ? '' : 's') + '. Each one is in the Java log on the right.' : 'Nothing to add right now.');
      draw();
    });
    DSA.wireCopy(root);
    reset();
  }

  window.Playground = { mount: mount };
})();
