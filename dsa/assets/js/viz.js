// Step demo engine and static strips.
// A step is { panels:[...], msg, line, ok, vars:{} }. Panel types:
//   array : { type, name, vals, marks:[{i,label,c}], cls:{i:'on-l'|'gone'|'win'|'empty'}, ix:true }
//   list  : { type, name, vals, marks }               (linked list, arrows between cells)
//   stack : { type, name, vals }                      (bottom first, drawn bottom-up)
//   map   : { type, name, entries:[[k,v]] }
//   grid  : { type, name, rows:[[...]], cls:{'r,c':cls}, rowHeads, colHeads }
//   tree  : { type, name, vals:[level order, null for gaps], cls:{i:cls}, marks:{i:label} }
//   graph : { type, name, nodes:[{id,x,y,label}], edges:[[a,b]], directed, cls:{id:cls}, hot:['a-b'] }
//   text  : { type, name, text }
(function(){
  var esc = function(s){ return DSA.esc(s); };
  var SVGNS = 'http://www.w3.org/2000/svg';

  function cell(v, i, marks, cls, showIx){
    var c = document.createElement('div');
    c.className = 'cell';
    var val = document.createElement('span');
    val.textContent = (v === null || v === undefined) ? '' : v;
    c.appendChild(val);
    if (showIx){
      var ix = document.createElement('span');
      ix.className = 'ix';
      ix.textContent = i;
      c.appendChild(ix);
    }
    var ms = (marks || []).filter(function(m){ return m.i === i; });
    if (ms.length){
      c.classList.add('on-' + ms[0].c);
      var box = document.createElement('div');
      box.className = 'mks';
      ms.forEach(function(m){
        var t = document.createElement('span');
        t.className = 'mk c-' + m.c;
        t.textContent = m.label;
        box.appendChild(t);
      });
      c.appendChild(box);
    }
    if (cls && cls[i]) cls[i].split(' ').forEach(function(k){ c.classList.add(k); });
    return c;
  }

  function stripEl(p, isList){
    var s = document.createElement('div');
    s.className = 'strip' + (p.ix !== false && !isList ? ' has-ix' : '');
    var marks = p.marks || [];
    var stacked = (p.vals || []).some(function(_, i){ return marks.filter(function(m){ return m.i === i; }).length > 1; });
    if (stacked) s.style.paddingBottom = '62px';
    if (!marks.length) s.style.paddingBottom = '6px';
    var arrow = p.type === 'dlist' ? '⇄' : '→';
    function nullCap(){ var nc = document.createElement('span'); nc.className = 'link nul'; nc.textContent = 'null'; s.appendChild(nc); }
    if (isList && p.nulls && p.type === 'dlist' && (p.vals || []).length){ nullCap(); var a0 = document.createElement('span'); a0.className = 'link'; a0.textContent = '←'; s.appendChild(a0); }
    (p.vals || []).forEach(function(v, i){
      if (isList && i > 0){
        var a = document.createElement('span');
        a.className = 'link';
        a.textContent = arrow;
        a.setAttribute('aria-hidden', 'true');
        s.appendChild(a);
      }
      s.appendChild(cell(v, i, marks, p.cls, p.ix !== false && !isList));
    });
    if (isList && p.nulls && (p.vals || []).length){ var a1 = document.createElement('span'); a1.className = 'link'; a1.textContent = '→'; s.appendChild(a1); nullCap(); }
    if (!(p.vals || []).length){
      var e = document.createElement('div');
      e.className = 'cell empty';
      e.textContent = 'empty';
      s.appendChild(e);
    }
    return s;
  }

  function labelled(name, node){
    var w = document.createElement('div');
    if (name){
      var l = document.createElement('p');
      l.className = 'stage-lbl';
      l.textContent = name;
      w.appendChild(l);
    }
    w.appendChild(node);
    return w;
  }

  function treeSvg(p){
    var vals = p.vals || [];
    var depth = 0;
    while ((1 << depth) - 1 < vals.length) depth++;
    var W = Math.max(260, Math.pow(2, depth - 1) * 46), H = depth * 62 + 10;
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('class', 'tree');
    svg.style.maxWidth = '100%';
    function pos(i){
      var d = Math.floor(Math.log2(i + 1));
      var k = i - ((1 << d) - 1);
      var slots = 1 << d;
      return { x: (k + .5) * W / slots, y: 26 + d * 62 };
    }
    vals.forEach(function(v, i){
      if (v === null || i === 0) return;
      var par = Math.floor((i - 1) / 2);
      if (vals[par] === null) return;
      var a = pos(par), b = pos(i);
      var ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      ln.setAttribute('class', 'edge');
      svg.appendChild(ln);
    });
    vals.forEach(function(v, i){
      if (v === null) return;
      var q = pos(i);
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', q.x); c.setAttribute('cy', q.y); c.setAttribute('r', 17);
      c.setAttribute('class', 'node ' + ((p.cls && p.cls[i]) || ''));
      svg.appendChild(c);
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', q.x); t.setAttribute('y', q.y + 4.5); t.setAttribute('text-anchor', 'middle');
      t.textContent = v;
      svg.appendChild(t);
      if (p.marks && p.marks[i] !== undefined){
        var m = document.createElementNS(SVGNS, 'text');
        m.setAttribute('x', q.x + 21); m.setAttribute('y', q.y - 12);
        m.setAttribute('style', 'font-size:11px;fill:var(--A)');
        m.textContent = p.marks[i];
        svg.appendChild(m);
      }
    });
    return svg;
  }

  function graphSvg(p){
    var W = p.w || 300, H = p.h || 200;
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('class', 'graph');
    svg.style.maxWidth = '100%';
    var byId = {};
    p.nodes.forEach(function(n){ byId[n.id] = n; });
    if (p.directed){
      var defs = document.createElementNS(SVGNS, 'defs');
      defs.innerHTML = '<marker id="arw" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--line2)"/></marker>';
      svg.appendChild(defs);
    }
    var hot = p.hot || [];
    p.edges.forEach(function(e){
      var a = byId[e[0]], b = byId[e[1]];
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', a.x + dx / len * 18); ln.setAttribute('y1', a.y + dy / len * 18);
      ln.setAttribute('x2', b.x - dx / len * 19); ln.setAttribute('y2', b.y - dy / len * 19);
      var on = hot.indexOf(e[0] + '-' + e[1]) >= 0 || (!p.directed && hot.indexOf(e[1] + '-' + e[0]) >= 0);
      ln.setAttribute('class', 'edge' + (on ? ' on' : ''));
      if (p.directed) ln.setAttribute('marker-end', 'url(#arw)');
      svg.appendChild(ln);
      if (e[2] !== undefined){
        var wt = document.createElementNS(SVGNS, 'text');
        wt.setAttribute('x', (a.x + b.x) / 2 - dy / len * 10); wt.setAttribute('y', (a.y + b.y) / 2 + dx / len * 10 + 4);
        wt.setAttribute('text-anchor', 'middle'); wt.setAttribute('class', 'elbl');
        wt.textContent = e[2];
        svg.appendChild(wt);
      }
    });
    p.nodes.forEach(function(n){
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', 17);
      c.setAttribute('class', 'node ' + ((p.cls && p.cls[n.id]) || ''));
      svg.appendChild(c);
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', n.x); t.setAttribute('y', n.y + 4.5); t.setAttribute('text-anchor', 'middle');
      t.textContent = n.label !== undefined ? n.label : n.id;
      svg.appendChild(t);
    });
    return svg;
  }

  function gridEl(p){
    var rows = p.rows || [];
    var cols = rows.length ? rows[0].length : 0;
    var g = document.createElement('div');
    g.className = 'grid';
    var hasR = !!p.rowHeads, hasC = !!p.colHeads;
    g.style.gridTemplateColumns = 'repeat(' + (cols + (hasR ? 1 : 0)) + ', auto)';
    if (hasC){
      if (hasR) g.appendChild(document.createElement('span'));
      p.colHeads.forEach(function(h){ var s = document.createElement('span'); s.className = 'hd'; s.textContent = h; g.appendChild(s); });
    }
    rows.forEach(function(r, ri){
      if (hasR){ var s = document.createElement('span'); s.className = 'hd'; s.textContent = p.rowHeads[ri]; g.appendChild(s); }
      r.forEach(function(v, ci){
        var c = document.createElement('div');
        c.className = 'cell';
        c.textContent = (v === null || v === undefined) ? '' : v;
        var k = p.cls && p.cls[ri + ',' + ci];
        if (k) k.split(' ').forEach(function(x){ c.classList.add(x); });
        g.appendChild(c);
      });
    });
    return g;
  }

  // ---------- panels used by the data structure pages ----------
  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function addCls(node, k){ if (k) String(k).split(' ').forEach(function(x){ if (x) node.classList.add(x); }); }

  // mem: { vals, base, size, cls } array cells with index above and byte address below.
  function memEl(p){
    var row = el('div', 'mem');
    var base = p.base === undefined ? 1000 : p.base, size = p.size || 4;
    (p.vals || []).forEach(function(v, i){
      var col = el('div', 'mcol');
      col.appendChild(el('span', 'mi', '[' + i + ']'));
      var c = el('div', 'cell', v === null || v === undefined ? '' : v);
      addCls(c, p.cls && p.cls[i]);
      col.appendChild(c);
      col.appendChild(el('span', 'ma', '@' + (base + i * size)));
      row.appendChild(col);
    });
    return row;
  }

  // refs: { rows:[{name, val, cls, note}] } a variable box pointing at an object.
  function refsEl(p){
    var box = el('div', 'refs');
    (p.rows || []).forEach(function(r){
      var row = el('div', 'ref');
      row.appendChild(el('span', 'rv', r.name));
      row.appendChild(el('span', 'ra', '→'));
      var o = el('span', 'cell', r.val);
      addCls(o, r.cls);
      row.appendChild(o);
      if (r.note) row.appendChild(el('span', 'rn', r.note));
      box.appendChild(row);
    });
    return box;
  }

  // buckets: { rows:[[{t, cls}]], rowCls:{i:cls}, label } hash table with chained entries.
  function bucketsEl(p){
    var box = el('div', 'bk');
    (p.rows || []).forEach(function(chain, i){
      var row = el('div', 'bk-row');
      addCls(row, p.rowCls && p.rowCls[i]);
      row.appendChild(el('span', 'bk-i', p.heads ? p.heads[i] : i));
      if (!chain.length) row.appendChild(el('span', 'bk-null', p.emptyText || 'null'));
      chain.forEach(function(e, j){
        if (j) row.appendChild(el('span', 'link', p.arrow || '→'));
        var c = el('span', 'cell', typeof e === 'object' ? e.t : e);
        if (typeof e === 'object') addCls(c, e.cls);
        row.appendChild(c);
      });
      box.appendChild(row);
    });
    return box;
  }

  // ring: { vals (null = free slot), head, tail, cls } circular buffer drawn as a ring.
  function ringSvg(p){
    var n = (p.vals || []).length, R = Math.max(84, n * 14), cx = R + 56, cy = R + 40;
    var W = cx * 2, H = cy * 2;
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('class', 'ring');
    svg.style.maxWidth = '100%';
    function at(i, r){ var a = -Math.PI / 2 + 2 * Math.PI * i / n; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }
    var guide = document.createElementNS(SVGNS, 'circle');
    guide.setAttribute('cx', cx); guide.setAttribute('cy', cy); guide.setAttribute('r', R);
    guide.setAttribute('class', 'guide');
    svg.appendChild(guide);
    (p.vals || []).forEach(function(v, i){
      var q = at(i, R);
      var r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('x', q.x - 18); r.setAttribute('y', q.y - 18); r.setAttribute('width', 36); r.setAttribute('height', 36); r.setAttribute('rx', 8);
      r.setAttribute('class', 'node ' + (v === null || v === undefined ? 'free ' : '') + ((p.cls && p.cls[i]) || ''));
      svg.appendChild(r);
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', q.x); t.setAttribute('y', q.y + 4.5); t.setAttribute('text-anchor', 'middle');
      t.textContent = v === null || v === undefined ? '' : v;
      svg.appendChild(t);
      var ix = at(i, R - 32);
      var it = document.createElementNS(SVGNS, 'text');
      it.setAttribute('x', ix.x); it.setAttribute('y', ix.y + 4); it.setAttribute('text-anchor', 'middle'); it.setAttribute('class', 'sm');
      it.textContent = i;
      svg.appendChild(it);
      var tags = [];
      if (p.head === i) tags.push(['head', 'c-l']);
      if (p.tail === i) tags.push(['tail', 'c-r']);
      tags.forEach(function(tg, k){
        var o = at(i, R + 34 + k * 14);
        var tt = document.createElementNS(SVGNS, 'text');
        tt.setAttribute('x', o.x); tt.setAttribute('y', o.y + 4); tt.setAttribute('text-anchor', 'middle'); tt.setAttribute('class', 'tag ' + tg[1]);
        tt.textContent = tg[0];
        svg.appendChild(tt);
      });
    });
    return svg;
  }

  // ntree: general tree. { nodes:[{id, label, parent, side:'L'|'R', sub, cls, edge, end, mark}], bin, up, sx }
  //   bin: binary tree, x position = in-order rank (so BSTs read left to right in sorted order).
  //   up: draw edges as arrows to the parent (union-find).
  function ntreeSvg(p){
    var nodes = p.nodes || [], byId = {}, kids = {}, roots = [];
    nodes.forEach(function(n){ byId[n.id] = n; kids[n.id] = []; });
    nodes.forEach(function(n){
      if (n.parent === null || n.parent === undefined || !byId[n.parent]) roots.push(n);
      else kids[n.parent].push(n);
    });
    var pos = {}, slot = 0, maxD = 0;
    function place(n, d){
      maxD = Math.max(maxD, d);
      var ks = kids[n.id];
      if (p.bin){
        var L = ks.filter(function(k){ return k.side === 'L'; })[0], R = ks.filter(function(k){ return k.side !== 'L'; })[0];
        if (L) place(L, d + 1);
        pos[n.id] = { x: slot++, d: d };
        if (R) place(R, d + 1);
        return;
      }
      if (!ks.length){ pos[n.id] = { x: slot++, d: d }; return; }
      ks.forEach(function(k){ place(k, d + 1); });
      pos[n.id] = { x: (pos[ks[0].id].x + pos[ks[ks.length - 1].id].x) / 2, d: d };
    }
    roots.forEach(function(r, i){ if (i) slot += 0.4; place(r, 0); });
    var sx = p.sx || 46, sy = p.sy || (nodes.some(function(n){ return n.sub; }) ? 72 : 60);
    var W = Math.max(120, slot * sx + 20), H = (maxD + 1) * sy + (nodes.some(function(n){ return n.sub; }) ? 22 : 8);
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('class', 'tree');
    svg.style.maxWidth = '100%';
    function xy(id){ return { x: 10 + (pos[id].x + .5) * sx, y: 24 + pos[id].d * sy }; }
    if (p.up){
      var defs = document.createElementNS(SVGNS, 'defs');
      defs.innerHTML = '<marker id="arwU" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--line2)"/></marker>';
      svg.appendChild(defs);
    }
    nodes.forEach(function(n){
      if (!pos[n.id] || n.parent === null || n.parent === undefined || !byId[n.parent]) return;
      var a = xy(n.parent), b = xy(n.id);
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ln = document.createElementNS(SVGNS, 'line');
      if (p.up){
        ln.setAttribute('x1', b.x - dx / len * 18); ln.setAttribute('y1', b.y - dy / len * 18);
        ln.setAttribute('x2', a.x + dx / len * 19); ln.setAttribute('y2', a.y + dy / len * 19);
        ln.setAttribute('marker-end', 'url(#arwU)');
      } else {
        ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      }
      ln.setAttribute('class', 'edge' + (n.hotEdge ? ' on' : ''));
      svg.appendChild(ln);
      if (n.edge !== undefined){
        var et = document.createElementNS(SVGNS, 'text');
        et.setAttribute('x', (a.x + b.x) / 2 + (dx < 0 ? -9 : 9)); et.setAttribute('y', (a.y + b.y) / 2 + 2);
        et.setAttribute('text-anchor', 'middle'); et.setAttribute('class', 'elbl');
        et.textContent = n.edge;
        svg.appendChild(et);
      }
    });
    nodes.forEach(function(n){
      if (!pos[n.id]) return;
      var q = xy(n.id);
      if (n.end){
        var ring = document.createElementNS(SVGNS, 'circle');
        ring.setAttribute('cx', q.x); ring.setAttribute('cy', q.y); ring.setAttribute('r', 21);
        ring.setAttribute('class', 'endring');
        svg.appendChild(ring);
      }
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', q.x); c.setAttribute('cy', q.y); c.setAttribute('r', 17);
      c.setAttribute('class', 'node ' + (n.cls || ''));
      svg.appendChild(c);
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', q.x); t.setAttribute('y', q.y + 4.5); t.setAttribute('text-anchor', 'middle');
      t.textContent = n.label === undefined ? n.id : n.label;
      svg.appendChild(t);
      if (n.sub !== undefined){
        var st = document.createElementNS(SVGNS, 'text');
        st.setAttribute('x', q.x); st.setAttribute('y', q.y + 33); st.setAttribute('text-anchor', 'middle'); st.setAttribute('class', 'sm');
        st.textContent = n.sub;
        svg.appendChild(st);
      }
      if (n.mark !== undefined){
        var m = document.createElementNS(SVGNS, 'text');
        m.setAttribute('x', q.x + 21); m.setAttribute('y', q.y - 13);
        m.setAttribute('class', 'tag c-a');
        m.textContent = n.mark;
        svg.appendChild(m);
      }
    });
    return svg;
  }

  // ranges: { n, vals (index 1..n), items:[{l, r, row, label, cls}], cls } bars over index columns (Fenwick).
  function rangesEl(p){
    var n = p.n, g = el('div', 'rng');
    g.style.gridTemplateColumns = 'repeat(' + n + ', 46px)';
    for (var i = 1; i <= n; i++){
      var h = el('span', 'hd', i);
      h.style.gridColumn = i; h.style.gridRow = 1;
      g.appendChild(h);
      if (p.vals){
        var c = el('div', 'cell', p.vals[i] === undefined ? '' : p.vals[i]);
        addCls(c, p.cls && p.cls[i]);
        c.style.gridColumn = i; c.style.gridRow = 2;
        g.appendChild(c);
      }
    }
    (p.items || []).forEach(function(it){
      var b = el('div', 'bar-r', it.label);
      addCls(b, it.cls);
      b.style.gridColumn = it.l + ' / ' + (it.r + 1);
      b.style.gridRow = (p.vals ? 3 : 2) + (it.row || 0);
      g.appendChild(b);
    });
    return g;
  }

  function panelEl(p){
    switch (p.type){
      case 'array': return labelled(p.name, stripEl(p, false));
      case 'list': case 'dlist': return labelled(p.name, stripEl(p, true));
      case 'mem': return labelled(p.name, memEl(p));
      case 'refs': return labelled(p.name, refsEl(p));
      case 'buckets': return labelled(p.name, bucketsEl(p));
      case 'ring': return labelled(p.name, ringSvg(p));
      case 'ntree': return labelled(p.name, ntreeSvg(p));
      case 'ranges': return labelled(p.name, rangesEl(p));
      case 'stack': {
        var st = document.createElement('div');
        st.className = 'vstack';
        if (!p.vals.length){ var e = document.createElement('div'); e.className = 'cell empty'; e.textContent = 'empty'; st.appendChild(e); }
        p.vals.forEach(function(v, i){
          var c = document.createElement('div');
          c.className = 'cell' + (i === p.vals.length - 1 ? ' on-a' : '');
          c.textContent = v;
          st.appendChild(c);
        });
        return labelled(p.name + (p.vals.length ? '  (top ↑)' : ''), st);
      }
      case 'map': {
        var s = document.createElement('div');
        s.className = 'strip';
        s.style.paddingBottom = '6px';
        if (!p.entries.length){ var e2 = document.createElement('div'); e2.className = 'cell empty'; e2.textContent = '{ }'; s.appendChild(e2); }
        p.entries.forEach(function(kv){
          var c = document.createElement('div');
          c.className = 'cell' + (kv[2] ? ' ' + kv[2] : '');
          c.textContent = kv[0] + '→' + kv[1];
          s.appendChild(c);
        });
        return labelled(p.name, s);
      }
      case 'grid': return labelled(p.name, gridEl(p));
      case 'tree': return labelled(p.name, treeSvg(p));
      case 'graph': return labelled(p.name, graphSvg(p));
      default: {
        var t = document.createElement('div');
        t.className = 'start';
        t.style.margin = '0';
        t.textContent = p.text;
        return labelled(p.name, t);
      }
    }
  }

  function renderPanels(target, panels){
    target.innerHTML = '';
    var row = document.createElement('div');
    row.className = 'stage-row';
    (panels || []).forEach(function(p){
      var el = panelEl(p);
      if (p.full) el.style.flexBasis = '100%';
      row.appendChild(el);
    });
    target.appendChild(row);
  }

  // Build an interactive demo inside `root` from demo data.
  function mountDemo(root, demo){
    var steps = typeof demo.steps === 'function' ? demo.steps() : demo.steps;
    root.className = 'demo';
    root.innerHTML =
      '<div><h2>' + esc(demo.title) + '</h2><p class="sub">' + DSA.fmt(demo.sub || '') + '</p>' +
      '<div class="stage"></div><div class="vars"></div><div class="msg" aria-live="polite"></div>' +
      '<div class="controls"><button class="btn" type="button" data-a="back">Back</button>' +
      '<button class="btn primary" type="button" data-a="next">Next step</button>' +
      '<button class="btn" type="button" data-a="reset">Restart</button><span class="stepc"></span></div></div>' +
      '<div class="mini" aria-label="Code for this demo"></div>';
    var stage = root.querySelector('.stage'), msg = root.querySelector('.msg'), vars = root.querySelector('.vars');
    var codeBox = root.querySelector('.mini'), count = root.querySelector('.stepc');
    var back = root.querySelector('[data-a=back]'), next = root.querySelector('[data-a=next]');
    demo.code.forEach(function(l){ var d = document.createElement('div'); d.textContent = l; codeBox.appendChild(d); });
    var cur = 0;
    function render(){
      var st = steps[cur];
      renderPanels(stage, st.panels);
      msg.innerHTML = DSA.fmt(st.msg || '');
      msg.className = 'msg' + (st.ok ? ' found' : '');
      var v = st.vars || {};
      vars.innerHTML = Object.keys(v).map(function(k){ return '<span>' + esc(k) + ' = ' + esc(v[k]) + '</span>'; }).join('');
      vars.hidden = !Object.keys(v).length;
      Array.prototype.forEach.call(codeBox.children, function(d, i){
        var on = Array.isArray(st.line) ? st.line.indexOf(i) >= 0 : i === st.line;
        d.className = on ? ('hot' + (st.ok ? ' ok' : '')) : '';
      });
      count.textContent = 'Step ' + (cur + 1) + ' of ' + steps.length;
      back.disabled = cur === 0;
      next.disabled = cur === steps.length - 1;
    }
    back.addEventListener('click', function(){ if (cur > 0){ cur--; render(); } });
    next.addEventListener('click', function(){ if (cur < steps.length - 1){ cur++; render(); } });
    root.querySelector('[data-a=reset]').addEventListener('click', function(){ cur = 0; render(); });
    render();
  }

  window.Viz = { renderPanels: renderPanels, panelEl: panelEl, mountDemo: mountDemo };
})();
