// UML stage: class and sequence diagrams that build step by step next to linked Java code.
//
// Class diagram:  { kind: 'class', w, h, classes: [{ id, name, stereo, x, y, w, fields: [], methods: [] }],
//                   rels: [{ from, to, type, label, fm, tm, via: [[x, y]] }] }
//   type: inherits | implements | composition | aggregation | association | dependency
//   composition / aggregation: from = whole (diamond end), to = part.  inherits / implements: from = child, to = parent.
// Sequence diagram: { kind: 'seq', w, parts: [{ id, name }], msgs: [{ from, to, label, ret, title, text, code }] }
// Flow: { name, title, diagram, steps, progressive, code, file }
//   class step: { title, text, add: [ids], on: [ids], bad: [ids], rels: ['a-b'], code: [line numbers or text snippets], note: { cls, text } }
//   sequence steps come from msgs (one step per message).
(function(){
  var NS = 'http://www.w3.org/2000/svg';
  var LINE = 17, HDR = 30, ST = 14, PAD = 6, CW = 196;
  function el(tag, a, p){ var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function txt(p, x, y, s, cls, anchor){ var t = el('text', { x: x, y: y, 'class': cls, 'text-anchor': anchor || 'start' }, p); t.textContent = s; return t; }
  function r1(n){ return Math.round(n * 10) / 10; }

  // Box size: header (+ stereotype line), fields compartment, methods compartment.
  function size(c){
    var f = (c.fields || []).length, m = (c.methods || []).length;
    var h = HDR + (c.stereo ? ST : 0) + PAD + (f ? f * LINE : 8) + PAD + PAD + (m ? m * LINE : 8) + PAD;
    return { w: c.w || CW, h: h };
  }
  function center(c){ var s = size(c); return [c.x + s.w / 2, c.y + s.h / 2]; }
  // Point where the line from the box centre toward (tx, ty) leaves the box.
  function edgePoint(c, tx, ty){
    var s = size(c), cx = c.x + s.w / 2, cy = c.y + s.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    var t = Math.min(dx ? (s.w / 2) / Math.abs(dx) : Infinity, dy ? (s.h / 2) / Math.abs(dy) : Infinity);
    return [cx + dx * t, cy + dy * t];
  }
  function key(a, b){ return a < b ? a + '-' + b : b + '-' + a; }

  function drawClass(g, c, state){
    var s = size(c), y = c.y;
    var grp = el('g', { 'class': 'cls' + state }, g);
    el('rect', { 'class': 'box', x: c.x, y: c.y, width: s.w, height: s.h, rx: 3 }, grp);
    var hh = HDR + (c.stereo ? ST : 0);
    el('rect', { 'class': 'hdr', x: c.x + .7, y: c.y + .7, width: s.w - 1.4, height: hh - 1, rx: 2.5 }, grp);
    if (c.stereo) txt(grp, c.x + s.w / 2, y + 15, '«' + c.stereo + '»', 'stereo', 'middle');
    txt(grp, c.x + s.w / 2, y + hh - 10, c.name, 'cname' + (c.stereo === 'abstract' || c.stereo === 'interface' ? ' it' : ''), 'middle');
    y += hh;
    el('line', { 'class': 'sep', x1: c.x, y1: y, x2: c.x + s.w, y2: y }, grp);
    var f = c.fields || [], m = c.methods || [];
    var yy = y + PAD;
    f.forEach(function(line){ yy += LINE; txt(grp, c.x + 9, yy - 4, line, 'mem' + (/^[-+#~]?\s*static /.test(line) ? ' static' : '')); });
    yy = y + PAD + (f.length ? f.length * LINE : 8) + PAD;
    el('line', { 'class': 'sep', x1: c.x, y1: yy, x2: c.x + s.w, y2: yy }, grp);
    yy += PAD;
    m.forEach(function(line){ yy += LINE; txt(grp, c.x + 9, yy - 4, line, 'mem'); });
    return grp;
  }

  function drawRel(g, r, byId, state){
    var a = byId[r.from], b = byId[r.to];
    var pts = [center(a)].concat(r.via || []).concat([center(b)]);
    var p0 = edgePoint(a, pts[1][0], pts[1][1]);
    var pn = edgePoint(b, pts[pts.length - 2][0], pts[pts.length - 2][1]);
    pts[0] = p0; pts[pts.length - 1] = pn;
    var grp = el('g', { 'class': 'rg' + state }, g);
    var type = r.type;
    // direction at each end
    function dir(p, q){ var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.sqrt(dx * dx + dy * dy) || 1; return [dx / l, dy / l]; }
    var dEnd = dir(pts[pts.length - 2], pn);      // pointing into "to"
    var dStart = dir(pts[1], p0);                 // pointing into "from"
    var line = pts.slice();
    var head = null;
    if (type === 'inherits' || type === 'implements'){
      var L = 15, W = 8, tip = pn, base = [tip[0] - dEnd[0] * L, tip[1] - dEnd[1] * L];
      head = [tip, [base[0] - dEnd[1] * W, base[1] + dEnd[0] * W], [base[0] + dEnd[1] * W, base[1] - dEnd[0] * W]];
      line[line.length - 1] = base;
    } else if (type === 'composition' || type === 'aggregation'){
      var L2 = 20, W2 = 6.5, tip2 = p0, mid = [tip2[0] - dStart[0] * L2 / 2, tip2[1] - dStart[1] * L2 / 2], back = [tip2[0] - dStart[0] * L2, tip2[1] - dStart[1] * L2];
      head = [tip2, [mid[0] - dStart[1] * W2, mid[1] + dStart[0] * W2], back, [mid[0] + dStart[1] * W2, mid[1] - dStart[0] * W2]];
      line[0] = back;
    }
    el('polyline', { 'class': 'rel ' + type, points: line.map(function(p){ return r1(p[0]) + ',' + r1(p[1]); }).join(' ') }, grp);
    if (head) el('polygon', { 'class': 'head ' + type, points: head.map(function(p){ return r1(p[0]) + ',' + r1(p[1]); }).join(' ') }, grp);
    if (type === 'association' || type === 'dependency'){
      var t3 = pn, L3 = 11, W3 = 6;
      var bb = [t3[0] - dEnd[0] * L3, t3[1] - dEnd[1] * L3];
      el('polyline', { 'class': 'head ' + type, points: r1(bb[0] - dEnd[1] * W3) + ',' + r1(bb[1] + dEnd[0] * W3) + ' ' + r1(t3[0]) + ',' + r1(t3[1]) + ' ' + r1(bb[0] + dEnd[1] * W3) + ',' + r1(bb[1] - dEnd[0] * W3) }, grp);
    }
    function nearLabel(p, d, s, off){
      var x = p[0] - d[0] * 18 + (-d[1]) * (off || 11), y = p[1] - d[1] * 18 + d[0] * (off || 11) + 4;
      txt(grp, r1(x), r1(y), s, 'mult', 'middle');
    }
    if (r.fm) nearLabel(p0, dStart, r.fm);
    if (r.tm) nearLabel(pn, dEnd, r.tm);
    if (r.label){
      var mi = Math.floor((line.length - 1) / 2), A = line[mi], B = line[mi + 1];
      txt(grp, r1((A[0] + B[0]) / 2), r1((A[1] + B[1]) / 2 - 6), r.label, 'rlbl', 'middle');
    }
  }

  function drawClassDiagram(svg, flow, si, prevVis){
    var dg = flow.diagram, st = flow.steps[si] || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + dg.w + ' ' + dg.h);
    svg.style.minWidth = Math.min(dg.w, 640) + 'px';
    var vis = {};
    if (flow.progressive){ for (var i = 0; i <= si; i++) (flow.steps[i].add || []).forEach(function(id){ vis[id] = 1; }); }
    else dg.classes.forEach(function(c){ vis[c.id] = 1; });
    var byId = {}; dg.classes.forEach(function(c){ byId[c.id] = c; });
    var on = st.on || [], bad = st.bad || [], hot = (st.rels || []).map(function(k){ var p = k.split('-'); return key(p[0], p[1]); });
    var gR = el('g', {}, svg), gC = el('g', {}, svg);
    (dg.rels || []).forEach(function(r){
      if (!vis[r.from] || !vis[r.to]) return;
      var isNew = prevVis && (!prevVis[r.from] || !prevVis[r.to]);
      drawRel(gR, r, byId, (hot.indexOf(key(r.from, r.to)) >= 0 ? ' on' : '') + (isNew ? ' new' : ''));
    });
    dg.classes.forEach(function(c){
      if (!vis[c.id]) return;
      var state = (on.indexOf(c.id) >= 0 ? ' on' : '') + (bad.indexOf(c.id) >= 0 ? ' bad' : '') + (st.dim && on.indexOf(c.id) < 0 ? ' dim' : '') + (prevVis && !prevVis[c.id] ? ' new' : '');
      drawClass(gC, c, state);
    });
    if (st.note && byId[st.note.cls]){
      var c = byId[st.note.cls], s = size(c);
      txt(svg, c.x + s.w / 2 + (st.note.dx || 0), c.y + (st.note.dy === undefined ? -8 : st.note.dy), st.note.text, 'note', 'middle');
    }
    return vis;
  }

  function seqLayout(dg){
    var n = dg.parts.length, gap = (dg.w - 40) / n;
    var xs = {}; dg.parts.forEach(function(p, i){ xs[p.id] = p.x || Math.round(20 + gap * (i + .5)); });
    return { xs: xs, top: 20, h: 36, y0: 92, step: 44 };
  }
  function drawSeq(svg, flow, si){
    var dg = flow.diagram, L = seqLayout(dg), H = L.y0 + dg.msgs.length * L.step + 24;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + dg.w + ' ' + H);
    svg.style.minWidth = Math.min(dg.w, 600) + 'px';
    var cur = dg.msgs[si];
    dg.parts.forEach(function(p){
      var x = L.xs[p.id], w = Math.max(96, p.name.length * 8.6 + 22);
      el('line', { 'class': 'life', x1: x, y1: L.top + L.h, x2: x, y2: H - 8 }, svg);
      var active = cur && (cur.from === p.id || cur.to === p.id);
      el('rect', { 'class': 'pbox' + (active ? ' on' : ''), x: x - w / 2, y: L.top, width: w, height: L.h, rx: 3 }, svg);
      txt(svg, x, L.top + 23, p.name, 'cname', 'middle');
    });
    var curLine = null;
    dg.msgs.forEach(function(m, i){
      if (i > si) return;
      var y = L.y0 + i * L.step, x1 = L.xs[m.from], x2 = L.xs[m.to], isCur = i === si;
      var cls = (m.ret ? ' ret' : '') + (isCur ? ' cur' : '');
      var g = el('g', {}, svg);
      var d;
      if (m.from === m.to){
        d = 'M' + x1 + ' ' + (y - 8) + ' h34 v18 h-34';
        el('path', { 'class': 'msg' + cls, d: d }, g);
        el('polygon', { 'class': 'mhead' + cls, points: x1 + ',' + (y + 10) + ' ' + (x1 + 10) + ',' + (y + 5) + ' ' + (x1 + 10) + ',' + (y + 15) }, g);
        txt(g, x1 + 42, y + 4, m.label, 'mlbl' + (isCur ? ' cur' : ''));
      } else {
        var dir = x2 > x1 ? 1 : -1;
        d = 'M' + x1 + ' ' + y + ' L' + (x2 - dir * 2) + ' ' + y;
        el('path', { 'class': 'msg' + cls, d: d }, g);
        if (m.ret) el('polyline', { 'class': 'mhead' + cls, points: (x2 - dir * 10) + ',' + (y - 5) + ' ' + x2 + ',' + y + ' ' + (x2 - dir * 10) + ',' + (y + 5) }, g);
        else el('polygon', { 'class': 'mhead' + cls, points: (x2 - dir * 10) + ',' + (y - 5) + ' ' + x2 + ',' + y + ' ' + (x2 - dir * 10) + ',' + (y + 5) }, g);
        txt(g, (x1 + x2) / 2, y - 7, m.label, 'mlbl' + (isCur ? ' cur' : ''), 'middle');
      }
      txt(g, Math.min(x1, x2) - 8, y + 4, String(i + 1), 'mnum', 'end');
      if (isCur) curLine = { x1: x1, x2: m.from === m.to ? x1 + 34 : x2, y: y };
    });
    return curLine;
  }
  function pulse(svg, line){
    if (!line || LLD.reduced()) return function(){};
    var dot = el('circle', { 'class': 'pulse', r: 5, cx: line.x1, cy: line.y }, svg), start = null, raf;
    function frame(t){
      if (start === null) start = t;
      var u = ((t - start) % 1400) / 1100; if (u > 1) u = 1;
      dot.setAttribute('cx', r1(line.x1 + (line.x2 - line.x1) * u));
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function(){ cancelAnimationFrame(raf); };
  }

  function seqSteps(flow){
    return flow.diagram.msgs.map(function(m, i){ return { title: m.title || (i + 1) + '. ' + m.label, text: m.text || '', code: m.code || [] }; });
  }

  function mount(root, flows){
    flows.forEach(function(f){ if (f.diagram.kind === 'seq') f.steps = seqSteps(f); });
    var fi = 0, si = 0, prevVis = null, stop = function(){}, timer = null;
    root.className = 'stage';
    var leg = '<div class="legend" aria-hidden="true">' +
      '<span><svg width="34" height="12"><line x1="0" y1="6" x2="22" y2="6" stroke="var(--teal)" stroke-width="1.5"/><polygon points="22,0 34,6 22,12" fill="var(--sheet)" stroke="var(--teal)" stroke-width="1.5"/></svg>extends</span>' +
      '<span><svg width="34" height="12"><line x1="0" y1="6" x2="22" y2="6" stroke="var(--teal)" stroke-width="1.5" stroke-dasharray="4 3"/><polygon points="22,0 34,6 22,12" fill="var(--sheet)" stroke="var(--teal)" stroke-width="1.5"/></svg>implements</span>' +
      '<span><svg width="34" height="12"><polygon points="0,6 8,1 16,6 8,11" fill="var(--violet)"/><line x1="16" y1="6" x2="34" y2="6" stroke="var(--violet)" stroke-width="1.5"/></svg>owns (composition)</span>' +
      '<span><svg width="34" height="12"><polygon points="0,6 8,1 16,6 8,11" fill="var(--sheet)" stroke="var(--violet)" stroke-width="1.5"/><line x1="16" y1="6" x2="34" y2="6" stroke="var(--violet)" stroke-width="1.5"/></svg>has (aggregation)</span>' +
      '<span><svg width="34" height="12"><line x1="0" y1="6" x2="32" y2="6" stroke="var(--ink)" stroke-width="1.5"/><polyline points="24,1 33,6 24,11" fill="none" stroke="var(--ink)" stroke-width="1.5"/></svg>uses (association)</span>' +
      '<span><svg width="34" height="12"><line x1="0" y1="6" x2="32" y2="6" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="4 3"/><polyline points="24,1 33,6 24,11" fill="none" stroke="var(--amber)" stroke-width="1.5"/></svg>depends on</span></div>';
    root.innerHTML = (flows.length > 1 ? '<div class="stage-tabs" role="group" aria-label="Choose a diagram">' + flows.map(function(f, i){
        return '<button type="button" aria-pressed="' + (i === 0) + '">' + LLD.esc(f.name) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="stage-body"><div class="canvas" tabindex="0" aria-label="Diagram. Left and right arrow keys step through it."><div class="scroll"><svg class="uml" role="img"></svg></div></div>' +
      '<div class="codepane"><div class="fname"></div><pre aria-label="Code for this diagram"></pre></div></div>' +
      '<div class="caption"><div><p class="n"></p><h4></h4><p class="t" aria-live="polite"></p></div>' +
      '<div class="ctrls"><button class="btn sm" type="button" data-a="back">Back</button><button class="btn pri sm" type="button" data-a="next">Next step</button>' +
      '<button class="btn sm" type="button" data-a="play">Play</button><button class="btn sm" type="button" data-a="reset">Start over</button></div></div>';
    var svg = root.querySelector('svg'), pre = root.querySelector('pre'), fname = root.querySelector('.fname');
    var cap = root.querySelector('.caption'), back = root.querySelector('[data-a=back]'), next = root.querySelector('[data-a=next]'), play = root.querySelector('[data-a=play]');
    var lastCode = null;

    function renderCode(fl){
      if (lastCode === fl) return;
      lastCode = fl;
      fname.textContent = fl.file || 'Example.java';
      var html = LLD.java((fl.code || '').replace(/^\n+|\s+$/g, ''));
      // split highlighted html into lines, keeping spans balanced per line
      var lines = html.split('\n'), open = [];
      pre.innerHTML = lines.map(function(l, i){
        var prefix = open.join('');
        var tags = l.match(/<span class="[^"]+">|<\/span>/g) || [];
        tags.forEach(function(t){ if (t === '</span>') open.pop(); else open.push(t); });
        return '<span class="ln" data-n="' + (i + 1) + '">' + prefix + l + open.map(function(){ return '</span>'; }).join('') + '</span>';
      }).join('');
    }
    function render(){
      var fl = flows[fi], st = fl.steps[si];
      stop();
      renderCode(fl);
      if (fl.diagram.kind === 'seq'){ var line = drawSeq(svg, fl, si); stop = pulse(svg, line); }
      else { prevVis = drawClassDiagram(svg, fl, si, prevVis); }
      svg.setAttribute('aria-label', fl.title + '. Step ' + (si + 1) + ': ' + st.title);
      cap.querySelector('.n').textContent = fl.title + ': step ' + (si + 1) + ' of ' + fl.steps.length;
      cap.querySelector('h4').textContent = st.title;
      cap.querySelector('.t').innerHTML = LLD.fmt(st.text || '');
      // step.code: line numbers, or text snippets (the first line containing the snippet)
      var plain = (fl.code || '').replace(/^\n+|\s+$/g, '').split('\n');
      var want = (st.code || []).map(function(c){
        if (typeof c === 'number') return c;
        for (var k = 0; k < plain.length; k++) if (plain[k].indexOf(c) >= 0) return k + 1;
        return -1;
      });
      var lns = pre.querySelectorAll('.ln'), first = null;
      lns.forEach(function(x, i){ var on = want.indexOf(i + 1) >= 0; x.classList.toggle('hot', on); if (on && !first) first = x; });
      if (first) pre.scrollTop = Math.max(0, pre.scrollTop + first.getBoundingClientRect().top - pre.getBoundingClientRect().top - pre.clientHeight / 3);
      back.disabled = si === 0;
      next.disabled = si === fl.steps.length - 1;
    }
    function go(i){ si = Math.max(0, Math.min(flows[fi].steps.length - 1, i)); render(); }
    function pause(){ if (timer){ clearInterval(timer); timer = null; play.textContent = 'Play'; } }
    back.addEventListener('click', function(){ pause(); go(si - 1); });
    next.addEventListener('click', function(){ pause(); go(si + 1); });
    root.querySelector('[data-a=reset]').addEventListener('click', function(){ pause(); prevVis = null; go(0); });
    play.addEventListener('click', function(){
      if (timer){ pause(); return; }
      if (si === flows[fi].steps.length - 1){ prevVis = null; go(0); }
      play.textContent = 'Pause';
      timer = setInterval(function(){ if (si >= flows[fi].steps.length - 1) pause(); else go(si + 1); }, 3400);
    });
    root.querySelector('.canvas').addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight'){ e.preventDefault(); pause(); go(si + 1); }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); pause(); go(si - 1); }
    });
    root.querySelectorAll('.stage-tabs button').forEach(function(b, i){
      b.addEventListener('click', function(){
        pause();
        root.querySelectorAll('.stage-tabs button').forEach(function(x, j){ x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        fi = i; si = 0; prevVis = null; render();
      });
    });
    var lg = document.createElement('div'); lg.innerHTML = leg; root.parentNode.insertBefore(lg.firstChild, root.nextSibling);
    render();
  }

  window.UML = { mount: mount, size: size };
})();
