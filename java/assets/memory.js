/* Memory stage: code on the left; stack, heap and console on the right.
   A stage is { title, code, steps: [{ line, text, stack?, heap?, out? }] }.
   stack: [{ frame, vars: [{ name, value } | { name, ref }] }]   (last frame = running)
   heap:  [{ id, type, fields?: [{ name, value } | { name, ref }], cells?: [v | { ref }],
            val?, gone?, pool?, row? }]
   A step that leaves out stack, heap or out keeps the previous one. */
(function () {
  'use strict';
  var J = window.JDD;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function fill(steps) {
    var prev = { stack: [], heap: [], out: '' };
    return steps.map(function (s) {
      var f = {
        line: s.line, text: s.text,
        stack: s.stack || prev.stack, heap: s.heap || prev.heap,
        out: s.out != null ? s.out : prev.out
      };
      prev = f;
      return f;
    });
  }

  function shown(x) {
    if ('ref' in x) return x.ref == null ? { t: 'null', c: 'n' } : { t: '→', c: 'r' };
    if (x.value === null) return { t: 'null', c: 'n' };
    return { t: String(x.value), c: '' };
  }

  function prevVal(step, frameIdx, name) {
    if (!step) return undefined;
    var f = step.stack[frameIdx];
    if (!f) return undefined;
    for (var i = 0; i < f.vars.length; i++) {
      if (f.vars[i].name === name) return JSON.stringify(f.vars[i]);
    }
    return undefined;
  }
  function prevObj(step, id) {
    if (!step) return null;
    for (var i = 0; i < step.heap.length; i++) if (step.heap[i].id === id) return step.heap[i];
    return null;
  }

  J.stage = function (host, stages) {
    var wrap = J.el('div', 'stage');
    wrap.tabIndex = 0;
    wrap.setAttribute('aria-label', 'Memory stage. Use left and right arrow keys to step.');
    var tabs = null;
    if (stages.length > 1) {
      tabs = J.el('div', 'stage-tabs');
      wrap.appendChild(tabs);
    }
    var body = J.el('div', 'stage-body');
    var src = J.el('div', 'src');
    var pre = J.el('pre');
    src.appendChild(pre);
    var mem = J.el('div', 'mem');
    var colS = J.el('div', 'col-stack', '<h4>STACK</h4>');
    var frames = J.el('div', 'frames');
    colS.appendChild(frames);
    var colH = J.el('div', 'col-heap', '<h4>HEAP</h4>');
    var objs = J.el('div', 'objs');
    colH.appendChild(objs);
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'arrows');
    svg.setAttribute('aria-hidden', 'true');
    mem.appendChild(svg);
    mem.appendChild(colS);
    mem.appendChild(colH);
    var con = J.el('div', 'console');
    con.setAttribute('aria-live', 'polite');
    body.appendChild(src);
    body.appendChild(mem);
    body.appendChild(con);
    wrap.appendChild(body);

    var bar = J.el('div', 'bar');
    var left = J.el('div');
    var count = J.el('p', 'n');
    var narr = J.el('p', 'narr');
    narr.setAttribute('aria-live', 'polite');
    left.appendChild(count);
    left.appendChild(narr);
    var ctr = J.el('div', 'ctrls');
    function mk(t, cls) { var b = J.el('button', 'btn sm' + (cls ? ' ' + cls : ''), t); b.type = 'button'; ctr.appendChild(b); return b; }
    var bReset = mk('Reset'), bBack = mk('Back'), bNext = mk('Next', 'pri');
    bar.appendChild(left);
    bar.appendChild(ctr);
    wrap.appendChild(bar);
    var key = J.el('div', 'key',
      '<span><i style="background:var(--stack)"></i>stack frame</span>' +
      '<span><i style="background:var(--ref)"></i>reference</span>' +
      '<span><i style="background:var(--val)"></i>value</span>' +
      '<span><i style="border:1.5px dashed var(--gone)"></i>garbage</span>');
    host.appendChild(wrap);
    host.appendChild(key);

    var cur = null, steps = [], i = 0, lines = [];

    function pick(n) {
      cur = stages[n];
      steps = fill(cur.steps);
      i = 0;
      if (tabs) {
        Array.prototype.forEach.call(tabs.children, function (b, k) { b.setAttribute('aria-pressed', k === n ? 'true' : 'false'); });
      }
      pre.innerHTML = '';
      lines = cur.code.split('\n').map(function (t, k) {
        var s = J.el('span', 'ln', J.hl(t) || ' ');
        s.setAttribute('data-n', k + 1);
        pre.appendChild(s);
        return s;
      });
      draw(false);
    }

    function row(k, x, frameIdx, prev, isField) {
      var v = shown(x);
      var a = J.el('span', 'k', J.esc(x.name));
      var b = J.el('span', 'v' + (v.c ? ' ' + v.c : ''), J.esc(v.t));
      if (x.ref) b.setAttribute('data-ref', x.ref);
      if (!isField && prev && prevVal(prev, frameIdx, x.name) !== JSON.stringify(x)) {
        a.classList.add('flash'); b.classList.add('flash');
      }
      k.appendChild(a); k.appendChild(b);
    }

    function draw(anim) {
      var s = steps[i], prev = anim && i > 0 ? steps[i - 1] : null;
      count.textContent = 'Step ' + (i + 1) + ' of ' + steps.length + (cur.title && !tabs ? ' · ' + cur.title : '');
      narr.innerHTML = J.inl(s.text);
      bBack.disabled = i === 0;
      bNext.disabled = i === steps.length - 1;
      var hot = [].concat(s.line || []);
      lines.forEach(function (l, k) { l.classList.toggle('hot', hot.indexOf(k + 1) >= 0); });
      if (hot.length && lines[hot[0] - 1]) {
        var first = lines[hot[0] - 1];
        var top = pre.scrollTop + first.getBoundingClientRect().top - pre.getBoundingClientRect().top - pre.clientHeight / 3;
        pre.scrollTop = Math.max(0, top);
      }

      frames.innerHTML = '';
      if (!s.stack.length) frames.appendChild(J.el('div', 'empty', 'no frames yet'));
      s.stack.forEach(function (f, fi) {
        var fr = J.el('div', 'frame' + (fi === s.stack.length - 1 ? ' top-frame' : '') + (f.thread && f.thread !== 'main' ? ' other' : ''));
        fr.appendChild(J.el('div', 'fn', (f.thread ? '<span class="th">' + J.esc(f.thread) + '</span> ' : '') + J.esc(f.frame) + (f.state ? ' <span class="st">' + J.esc(f.state) + '</span>' : '')));
        var vs = J.el('div', 'vars');
        if (!f.vars.length) vs.appendChild(J.el('span', 'k', '(no locals)'));
        f.vars.forEach(function (x) { row(vs, x, fi, prev, false); });
        fr.appendChild(vs);
        frames.appendChild(fr);
      });

      objs.innerHTML = '';
      if (!s.heap.length) objs.appendChild(J.el('div', 'empty', 'empty'));
      var rowBox = null, rowKey = null;
      s.heap.forEach(function (o) {
        var po = prevObj(prev, o.id);
        var box = J.el('div', 'obj' + (o.gone ? ' gone' : '') + (o.pool ? ' pool' : '') + (prev && !po ? ' new' : ''));
        box.setAttribute('data-id', o.id);
        box.appendChild(J.el('div', 'ot', J.esc(o.type) + (o.pool ? ' <em>pool</em>' : '')));
        if (o.val != null) {
          var fv = J.el('div', 'fl');
          var vv = J.el('span', 'v', J.esc(o.val));
          vv.style.gridColumn = '1 / -1';
          vv.style.textAlign = 'left';
          fv.appendChild(vv);
          box.appendChild(fv);
        }
        if (o.fields) {
          var fl = J.el('div', 'fl');
          o.fields.forEach(function (x) {
            row(fl, x, 0, null, true);
            if (po && po.fields) {
              var old = po.fields.filter(function (p) { return p.name === x.name; })[0];
              if (!old || JSON.stringify(old) !== JSON.stringify(x)) {
                fl.lastChild.classList.add('flash'); fl.lastChild.previousSibling.classList.add('flash');
              }
            }
          });
          box.appendChild(fl);
        }
        if (o.cells) {
          var cs = J.el('div', 'cells');
          o.cells.forEach(function (c, ci) {
            var isRef = c && typeof c === 'object';
            var t = isRef ? (c.ref ? '→' : 'null') : String(c);
            var sp = J.el('span', isRef && c.ref ? 'r' : '', '<i>' + ci + '</i>' + J.esc(t));
            if (isRef && c.ref) sp.setAttribute('data-ref', c.ref);
            if (po && po.cells && JSON.stringify(po.cells[ci]) !== JSON.stringify(c)) sp.classList.add('flash');
            cs.appendChild(sp);
          });
          box.appendChild(cs);
        }
        if (o.row != null) {
          if (rowKey !== o.row) {
            rowBox = J.el('div', 'hrow');
            objs.appendChild(rowBox);
            rowKey = o.row;
          }
          var into = rowBox;
          if (o.col != null) {
            into = rowBox.querySelector('[data-col="' + o.col + '"]');
            if (!into) {
              into = J.el('div', 'hcol');
              into.setAttribute('data-col', o.col);
              rowBox.appendChild(into);
            }
          }
          into.appendChild(box);
        } else {
          rowKey = null;
          objs.appendChild(box);
        }
      });

      var out = s.out || '', was = prev ? prev.out || '' : out;
      if (prev && out.indexOf(was) === 0 && out.length > was.length) {
        con.innerHTML = J.esc(was) + '<b>' + J.esc(out.slice(was.length)) + '</b>';
      } else {
        con.textContent = out;
      }
      arrows(prev);
    }

    function arrows(prev) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var base = mem.getBoundingClientRect();
      Array.prototype.forEach.call(mem.querySelectorAll('[data-ref]'), function (from) {
        var to = mem.querySelector('.obj[data-id="' + from.getAttribute('data-ref') + '"]');
        if (!to) return;
        var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        var isCell = from.tagName === 'SPAN' && from.parentNode.classList.contains('cells');
        var x1, y1, x2, y2, d;
        if (isCell) {
          x1 = a.left + a.width / 2 - base.left; y1 = a.bottom - base.top;
          x2 = b.left + Math.min(20, b.width / 2) - base.left; y2 = b.top - base.top;
          d = 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + 24) + ' ' + x2 + ' ' + (y2 - 24) + ' ' + x2 + ' ' + y2;
        } else {
          x1 = a.right - base.left - 2; y1 = a.top + a.height / 2 - base.top;
          if (b.left - base.left > x1 + 6) {
            x2 = b.left - base.left; y2 = b.top + 12 - base.top;
            var mx = (x1 + x2) / 2;
            d = 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2;
          } else if (b.top > a.bottom + 4 && b.right - base.left > x1 - 40) {
            y2 = b.top - base.top;
            x2 = Math.max(b.left - base.left + 18, Math.min(b.right - base.left - 18, x1 - 8));
            d = 'M' + x1 + ' ' + y1 + ' C' + (x1 + 12) + ' ' + y1 + ' ' + x2 + ' ' + (y2 - 26) + ' ' + x2 + ' ' + y2;
          } else {
            x2 = b.right - base.left; y2 = b.top + 12 - base.top;
            var ox = Math.max(x1, x2) + 34;
            d = 'M' + x1 + ' ' + y1 + ' C' + ox + ' ' + y1 + ' ' + ox + ' ' + y2 + ' ' + x2 + ' ' + y2;
          }
        }
        var p = document.createElementNS(SVGNS, 'path');
        p.setAttribute('d', d);
        if (from.classList.contains('flash')) p.setAttribute('class', 'new');
        if (to.classList.contains('gone')) p.style.opacity = '.4';
        svg.appendChild(p);
        var c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', x2); c.setAttribute('cy', y2); c.setAttribute('r', 3);
        svg.appendChild(c);
      });
    }

    function go(n) { if (n < 0 || n >= steps.length) return; i = n; draw(true); }
    bNext.addEventListener('click', function () { go(i + 1); });
    bBack.addEventListener('click', function () { go(i - 1); });
    bReset.addEventListener('click', function () { i = 0; draw(false); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); }
    });
    if (tabs) {
      stages.forEach(function (st, n) {
        var b = J.el('button', null, J.esc(st.title));
        b.type = 'button';
        b.addEventListener('click', function () { pick(n); });
        tabs.appendChild(b);
      });
    }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { arrows(null); }, 80); });
    document.addEventListener('jdd:theme', function () { arrows(null); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { arrows(null); });
    pick(0);
  };
})();
