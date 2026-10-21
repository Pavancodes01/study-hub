// Whiteboard engine: hand-drawn architecture diagrams with moving request dots.
//
// diagram: { w, h, nodes: [{ id, label, sub, kind, x, y, w }], edges: [[from, to, { label, bend, arrow, unless }]] }
//   kind: client | lb | service | cache | db | queue | worker | cdn | blob | ext | key (small pill) | note (text only)
//   step.set: { nodeId: { label, sub } } changes a node's text for that step (counters, lag, tokens)
// step: { title, text, add: [ids], on: [ids], bad: [ids], edges: ['a-b'], badEdges: ['a-b'],
//         dots: [{ from, to, label, kind: 'req' | 'res' | 'err' | 'evt' }], anno: [{ node, text, dx, dy }] }
// flow: { name, title, diagram, steps, progressive }
(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var NW = 112, NH = 54;
  var SIZE = { key: [64, 32], note: [10, 10] };
  var GROUP = { db: 'k-data', cache: 'k-data', blob: 'k-data', cdn: 'k-data', queue: 'k-async', worker: 'k-async', ext: 'k-ext', key: 'k-key' };

  // Small seeded random so a shape looks the same every time it is drawn.
  function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function el(tag, attrs, parent){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function f(n){ return Math.round(n * 10) / 10; }

  // A marker line: slightly bowed, ends wobble a little.
  function line(r, x1, y1, x2, y2, j){
    j = j === undefined ? 1.6 : j;
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var bow = (r() - .5) * Math.min(6, len / 30);
    var cx = mx - dy / len * bow, cy = my + dx / len * bow;
    return 'M' + f(x1 + (r() - .5) * j) + ' ' + f(y1 + (r() - .5) * j) + ' Q' + f(cx) + ' ' + f(cy) + ' ' + f(x2 + (r() - .5) * j) + ' ' + f(y2 + (r() - .5) * j);
  }
  function poly(r, pts, closed){
    var d = '';
    for (var i = 0; i < pts.length - (closed ? 0 : 1); i++){ var a = pts[i], b = pts[(i + 1) % pts.length]; d += line(r, a[0], a[1], b[0], b[1]) + ' '; }
    return d;
  }
  function ellipse(r, cx, cy, rx, ry, part){
    // part: 'full' | 'top' | 'bottom'
    var k = .5523, d = '', jr = function(){ return (r() - .5) * 1.4; };
    var p = [[cx + rx, cy], [cx, cy + ry], [cx - rx, cy], [cx, cy - ry]];
    var segs = part === 'bottom' ? [0, 1] : part === 'top' ? [2, 3] : [0, 1, 2, 3];
    segs.forEach(function(i, n){
      var a = p[i], b = p[(i + 1) % 4];
      var c1, c2;
      if (i === 0){ c1 = [cx + rx, cy + ry * k]; c2 = [cx + rx * k, cy + ry]; }
      if (i === 1){ c1 = [cx - rx * k, cy + ry]; c2 = [cx - rx, cy + ry * k]; }
      if (i === 2){ c1 = [cx - rx, cy - ry * k]; c2 = [cx - rx * k, cy - ry]; }
      if (i === 3){ c1 = [cx + rx * k, cy - ry]; c2 = [cx + rx, cy - ry * k]; }
      d += (n === 0 ? 'M' + f(a[0] + jr()) + ' ' + f(a[1] + jr()) : '') + ' C' + f(c1[0] + jr()) + ' ' + f(c1[1] + jr()) + ' ' + f(c2[0] + jr()) + ' ' + f(c2[1] + jr()) + ' ' + f(b[0] + jr()) + ' ' + f(b[1] + jr());
    });
    return d;
  }

  // Outline path for each kind of component. Drawn twice for the marker look.
  function dims(n){ var d = SIZE[n.kind] || [NW, NH]; return [n.w || d[0], n.h || d[1]]; }
  function shape(n, r){
    var w = dims(n)[0], h = dims(n)[1], x = n.x - w / 2, y = n.y - h / 2, X = x + w, Y = y + h;
    var rect = [[x, y], [X, y], [X, Y], [x, Y]];
    switch (n.kind){
      case 'key': return ellipse(r, n.x, n.y, w / 2, h / 2, 'full');
      case 'note': return '';
      case 'lb': return poly(r, [[x + 14, y], [X - 14, y], [X, n.y], [X - 14, Y], [x + 14, Y], [x, n.y]], true);
      case 'db': {
        var ry = 8;
        return ellipse(r, n.x, y + ry, w / 2, ry, 'full') + ' ' + line(r, x, y + ry, x, Y - ry) + ' ' + line(r, X, y + ry, X, Y - ry) + ' ' + ellipse(r, n.x, Y - ry, w / 2, ry, 'bottom');
      }
      case 'cdn': return ellipse(r, n.x, n.y + 4, w / 2, h / 2 - 2, 'full') + ' ' + ellipse(r, n.x - w / 6, y + 8, w / 5, 10, 'top') + ' ' + ellipse(r, n.x + w / 7, y + 6, w / 4, 12, 'top');
      case 'blob': return poly(r, [[x, y + 6], [X, y + 6], [X - 10, Y], [x + 10, Y]], true) + ' ' + ellipse(r, n.x, y + 6, w / 2, 6, 'full');
      case 'queue': {
        var d = poly(r, rect, true);
        for (var i = 1; i <= 3; i++) d += ' ' + line(r, X - i * 12, Y - 12, X - i * 12, Y - 2, .8);
        return d;
      }
      case 'client': return poly(r, rect, true) + ' ' + line(r, n.x - 14, Y + 7, n.x + 14, Y + 7) + ' ' + line(r, n.x, Y, n.x, Y + 7, .6);
      case 'cache': return poly(r, rect, true) + ' ' + poly(r, [[x + 12, y + 6], [x + 6, y + 16], [x + 12, y + 16], [x + 7, y + 26]], false);
      case 'worker': return poly(r, rect, true) + ' ' + ellipse(r, X - 12, y + 12, 5, 5, 'full');
      default: return poly(r, rect, true);
    }
  }

  function box(n){ var d = dims(n); return { w: d[0] / 2 + 6, h: d[1] / 2 + (n.kind === 'client' ? 10 : 6) }; }
  function trim(n, tx, ty){
    var b = box(n), dx = tx - n.x, dy = ty - n.y;
    if (!dx && !dy) return [n.x, n.y];
    var t = Math.min(dx ? b.w / Math.abs(dx) : Infinity, dy ? b.h / Math.abs(dy) : Infinity);
    return [n.x + dx * t, n.y + dy * t];
  }
  function ek(a, b){ return a < b ? a + '-' + b : b + '-' + a; }

  // Draw one frame of a flow into an <svg>. Returns the edge paths so dots can follow them.
  function draw(svg, flow, si, prevVisible){
    var dg = flow.diagram, st = flow.steps[si] || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + dg.w + ' ' + dg.h);
    var byId = {};
    dg.nodes.forEach(function(n){
      var o = st.set && st.set[n.id];
      byId[n.id] = o ? Object.assign({}, n, o) : n;
    });

    var visible = {};
    if (flow.progressive){ for (var i = 0; i <= si; i++) (flow.steps[i].add || []).forEach(function(id){ visible[id] = true; }); }
    else dg.nodes.forEach(function(n){ visible[n.id] = true; });

    var on = st.on || [], bad = st.bad || [];
    var hotE = (st.edges || []).map(function(s){ var p = s.split('-'); return ek(p[0], p[1]); });
    var badE = (st.badEdges || []).map(function(s){ var p = s.split('-'); return ek(p[0], p[1]); });
    (st.dots || []).forEach(function(d){ var k = ek(d.from, d.to); if (hotE.indexOf(k) < 0) hotE.push(k); });

    var gE = el('g', {}, svg), gN = el('g', {}, svg), gA = el('g', {}, svg);
    var paths = {};
    dg.edges.forEach(function(e){
      var a = byId[e[0]], b = byId[e[1]], o = e[2] || {};
      if (!a || !b || !visible[a.id] || !visible[b.id]) return;
      if (o.unless && visible[o.unless]) return;   // edge replaced once that node appears
      var r = rng(hash(a.id + b.id));
      var p1 = trim(a, b.x, b.y), p2 = trim(b, a.x, a.y);
      var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var bend = o.bend !== undefined ? o.bend : (r() - .5) * 10;
      var cx = mx - dy / len * bend, cy = my + dx / len * bend;
      var d = 'M' + f(p1[0]) + ' ' + f(p1[1]) + ' Q' + f(cx) + ' ' + f(cy) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
      var k = ek(a.id, b.id);
      var cls = 'edge' + (hotE.indexOf(k) >= 0 ? ' on' : '') + (badE.indexOf(k) >= 0 ? ' bad' : '');
      var g = el('g', {}, gE);
      var path = el('path', { d: d, 'class': cls + (o.dash ? ' dash' : '') }, g);
      // arrow head at the target end (tangent from control point)
      if (o.arrow !== false){
        var tx = p2[0] - cx, ty = p2[1] - cy, tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
        var ah = 'M' + f(p2[0] - tx * 11 - ty * 5) + ' ' + f(p2[1] - ty * 11 + tx * 5) + ' L' + f(p2[0]) + ' ' + f(p2[1]) + ' L' + f(p2[0] - tx * 11 + ty * 5) + ' ' + f(p2[1] - ty * 11 - tx * 5);
        el('path', { d: ah, 'class': cls }, g);
      }
      if (o.label){
        var t = el('text', { x: f(cx), y: f(cy - 6), 'text-anchor': 'middle', 'class': 'elbl' }, g);
        t.textContent = o.label;
      }
      paths[k] = { el: path, from: a.id };
    });

    dg.nodes.forEach(function(n0){
      var n = byId[n0.id];
      if (!visible[n.id]) return;
      var r = rng(hash(n.id));
      var cls = 'node ' + (GROUP[n.kind] || '') + (on.indexOf(n.id) >= 0 ? ' on' : '') + (bad.indexOf(n.id) >= 0 ? ' bad' : '') +
        (st.dim && on.indexOf(n.id) < 0 ? ' dim' : '') + (prevVisible && !prevVisible[n.id] ? ' new' : '');
      var g = el('g', { 'class': cls }, gN);
      var w = dims(n)[0], h = dims(n)[1];
      // highlighter swipe behind an active node: one filled, slightly skewed quad
      el('path', { 'class': 'hl', d: 'M' + f(n.x - w / 2 - 7) + ' ' + f(n.y - h / 2 - 2) + ' L' + f(n.x + w / 2 + 6) + ' ' + f(n.y - h / 2 + 2) +
        ' L' + f(n.x + w / 2 + 4) + ' ' + f(n.y + h / 2 + 5) + ' L' + f(n.x - w / 2 - 5) + ' ' + f(n.y + h / 2 + 1) + ' Z' }, g);
      if (n.kind === 'note'){
        var nt = el('text', { x: n.x, y: n.y + 5, 'text-anchor': 'middle', 'class': 'lbl note-t' }, g); nt.textContent = n.label;
        if (n.sub){ var ns = el('text', { x: n.x, y: n.y + 21, 'text-anchor': 'middle', 'class': 'sub' }, g); ns.textContent = n.sub; }
        return;
      }
      if (n.kind !== 'cdn' && n.kind !== 'key') el('rect', { 'class': 'fillbg', x: n.x - w / 2 + 2, y: n.y - h / 2 + 2, width: w - 4, height: h - 4, rx: 4 }, g);
      var d1 = shape(n, r), d2 = shape(n, rng(hash(n.id) + 7));
      el('path', { 'class': 'stroke', d: d1 }, g);
      el('path', { 'class': 'stroke', d: d2, opacity: .55 }, g);
      var t = el('text', { x: n.x, y: n.y + (n.sub ? -1 : 5), 'text-anchor': 'middle', 'class': 'lbl' }, g);
      t.textContent = n.label;
      if (n.sub){ var s = el('text', { x: n.x, y: n.y + 15, 'text-anchor': 'middle', 'class': 'sub' }, g); s.textContent = n.sub; }
    });

    (st.anno || []).forEach(function(a){
      var n = byId[a.node]; if (!n) return;
      var x = n.x + (a.dx || 0), y = n.y + (a.dy === undefined ? -48 : a.dy);
      var t = el('text', { x: x, y: y, 'text-anchor': 'middle', 'class': 'anno' }, gA);
      t.textContent = a.text;
    });
    return { paths: paths, visible: visible };
  }

  // Dots travel their edges one after another, then the sequence repeats.
  function animate(svg, flow, si, paths){
    var st = flow.steps[si] || {}, dots = st.dots || [];
    if (!dots.length) return function(){};
    var items = dots.map(function(d){
      var k = ek(d.from, d.to), p = paths[k];
      if (!p) return null;
      var g = el('g', {}, svg);
      var c = el('circle', { r: 7, 'class': 'dot ' + (d.kind || 'req') }, g);
      var t = null;
      if (d.label){ t = el('text', { 'class': 'dlbl ' + (d.kind || 'req'), 'text-anchor': 'middle' }, g); t.textContent = d.label; }
      return { g: g, c: c, t: t, path: p.el, len: p.el.getTotalLength(), rev: p.from !== d.from };
    }).filter(Boolean);
    function place(it, u){
      var L = it.rev ? (1 - u) * it.len : u * it.len;
      var pt = it.path.getPointAtLength(L);
      it.c.setAttribute('cx', f(pt.x)); it.c.setAttribute('cy', f(pt.y));
      if (it.t){ it.t.setAttribute('x', f(pt.x)); it.t.setAttribute('y', f(pt.y - 12)); }
    }
    if (HLD.reducedMotion()){
      items.forEach(function(it){ place(it, .55); });
      return function(){};
    }
    var DUR = 1000, GAP = 250, PAUSE = 900, total = items.length * (DUR + GAP) + PAUSE, start = null, raf;
    function frame(ts){
      if (start === null) start = ts;
      var tt = (ts - start) % total;
      items.forEach(function(it, i){
        var t0 = i * (DUR + GAP), u = (tt - t0) / DUR;
        if (u < 0){ it.g.style.opacity = 0; return; }
        it.g.style.opacity = 1;
        u = Math.min(1, u);
        place(it, u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
      });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function(){ cancelAnimationFrame(raf); };
  }

  // A board with tabs (one per flow), the tray of controls, and the sticky note.
  function mount(root, flows){
    var fi = 0, si = 0, stop = function(){}, timer = null, prevVisible = null;
    root.className = 'boardwrap';
    root.innerHTML =
      '<div>' + (flows.length > 1 ? '<div class="tabsrow" role="group" aria-label="Choose a flow">' + flows.map(function(fl, i){
        return '<button type="button" aria-pressed="' + (i === 0) + '">' + HLD.esc(fl.name) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="board" tabindex="0" aria-label="Diagram. Use left and right arrow keys to step."><p class="title"></p><p class="swipe">Swipe the board sideways to see all of it.</p>' +
      '<div class="svgbox" style="overflow-x:auto"><svg class="wb" role="img" style="min-width:600px"></svg></div>' +
      '<div class="tray"><button class="btn sm" type="button" data-a="back">Back</button><button class="btn go sm" type="button" data-a="next">Next step</button>' +
      '<button class="btn sm" type="button" data-a="play">Play</button><button class="btn sm" type="button" data-a="reset">Start over</button><span class="count"></span></div></div></div>' +
      '<aside><div class="note" aria-live="polite"><p class="step"></p><h4></h4><p class="txt"></p></div><ol class="hops"></ol></aside>';
    var svg = root.querySelector('svg'), title = root.querySelector('.title'), count = root.querySelector('.count');
    var note = root.querySelector('.note'), hops = root.querySelector('.hops');
    var back = root.querySelector('[data-a=back]'), next = root.querySelector('[data-a=next]'), play = root.querySelector('[data-a=play]');

    function render(){
      var fl = flows[fi], st = fl.steps[si];
      stop();
      var res = draw(svg, fl, si, prevVisible);
      prevVisible = res.visible;
      follow(fl, st);
      stop = animate(svg, fl, si, res.paths);
      svg.setAttribute('aria-label', fl.title + '. Step ' + (si + 1) + ': ' + st.title);
      title.textContent = fl.title;
      note.querySelector('.step').textContent = 'Step ' + (si + 1) + ' of ' + fl.steps.length;
      note.querySelector('h4').textContent = st.title;
      note.querySelector('.txt').innerHTML = HLD.fmt(st.text || '');
      count.textContent = (si + 1) + ' / ' + fl.steps.length;
      back.disabled = si === 0;
      next.disabled = si === fl.steps.length - 1;
      hops.innerHTML = fl.steps.map(function(s, i){ return '<li><button type="button" data-i="' + i + '"' + (i === si ? ' aria-current="step"' : '') + '>' + HLD.esc(s.title) + '</button></li>'; }).join('');
    }
    // On narrow screens the board scrolls sideways; keep the active part in view.
    var box = root.querySelector('.svgbox');
    function follow(fl, st){
      if (box.scrollWidth <= box.clientWidth + 2) return;
      var ids = (st.on || []).concat((st.dots || []).map(function(d){ return d.to; }));
      var xs = fl.diagram.nodes.filter(function(n){ return ids.indexOf(n.id) >= 0; }).map(function(n){ return n.x; });
      if (!xs.length) return;
      var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2 / fl.diagram.w * box.scrollWidth;
      try { box.scrollTo({ left: Math.max(0, cx - box.clientWidth / 2), behavior: HLD.reducedMotion() ? 'auto' : 'smooth' }); } catch(e){ box.scrollLeft = cx - box.clientWidth / 2; }
    }
    function go(i){ var n = flows[fi].steps.length; si = Math.max(0, Math.min(n - 1, i)); render(); }
    function pause(){ if (timer){ clearInterval(timer); timer = null; play.textContent = 'Play'; } }
    back.addEventListener('click', function(){ pause(); go(si - 1); });
    next.addEventListener('click', function(){ pause(); go(si + 1); });
    root.querySelector('[data-a=reset]').addEventListener('click', function(){ pause(); prevVisible = null; go(0); });
    play.addEventListener('click', function(){
      if (timer){ pause(); return; }
      if (si === flows[fi].steps.length - 1){ prevVisible = null; go(0); }
      play.textContent = 'Pause';
      timer = setInterval(function(){ if (si >= flows[fi].steps.length - 1) pause(); else go(si + 1); }, 3600);
    });
    hops.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b){ pause(); go(+b.dataset.i); } });
    root.querySelector('.board').addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight'){ e.preventDefault(); pause(); go(si + 1); }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); pause(); go(si - 1); }
    });
    root.querySelectorAll('.tabsrow button').forEach(function(b, i){
      b.addEventListener('click', function(){
        pause();
        root.querySelectorAll('.tabsrow button').forEach(function(x, j){ x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        fi = i; si = 0; prevVisible = null; render();
      });
    });
    render();
  }

  // A still diagram (no steps), e.g. inside a deep dive.
  function still(root, diagram, opts){
    root.innerHTML = '<div class="board"><div class="svgbox" style="overflow-x:auto"><svg class="wb" role="img" style="min-width:560px"></svg></div></div>';
    var flow = { diagram: diagram, steps: [opts || {}] };
    var res = draw(root.querySelector('svg'), flow, 0, null);
    animate(root.querySelector('svg'), flow, 0, res.paths);
    root.querySelector('svg').setAttribute('aria-label', (opts && opts.title) || 'Diagram');
  }

  window.Board = { mount: mount, still: still };
})();
