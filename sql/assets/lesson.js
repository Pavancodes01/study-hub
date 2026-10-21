/* Lesson page: one renderer for every lesson file. */
(function () {
  'use strict';
  var S = window.SDD;
  S.nav('course');
  var slug = S.qs('l') || S.manifest[0];
  var main = document.getElementById('main');
  function missing(t) { main.innerHTML = '<div class="title"><h1>' + t + '</h1><p><a href="index.html">Back to the course</a></p></div>'; }
  if (S.manifest.indexOf(slug) < 0) { missing('Lesson not found'); return; }

  S.loadLessons([slug], function () {
    var l = S.lessons[slug];
    if (!l) { missing('Lesson not written yet'); return; }
    document.title = l.title + ' · SQL Deep Dive';
    S.set('last', slug);
    var tr = S.tracks.filter(function (t) { return t.id === l.track; })[0];
    var pos = S.manifest.indexOf(slug);

    var t = S.el('div', 'title');
    t.innerHTML = '<p class="crumb"><a href="index.html#' + tr.id + '">' + S.esc(tr.name) + '</a> · Lesson ' + (pos + 1) + ' of ' + S.manifest.length + '</p>' +
      '<h1>' + S.esc(l.title) + '</h1><p class="one">' + S.inl(l.one).replace(/\*(.+?)\*/g, '<mark>$1</mark>') + '</p>';
    var idea = S.el('div', 'idea prose');
    l.idea.forEach(function (p) { idea.appendChild(S.el('p', null, S.inl(p))); });
    t.appendChild(idea);
    var ul = S.el('ul', 'jump');
    [['watch', 'Watch it run'], ['learn', 'Explained'], ['traps', 'Traps'], ['qa', 'Interview'], ['practice', 'Practice']].forEach(function (j) {
      ul.appendChild(S.el('li', null, '<a href="#' + j[0] + '">' + j[1] + '</a>'));
    });
    t.appendChild(ul);
    main.appendChild(t);

    function sec(id, h, lead) {
      var s = S.el('section', 's');
      s.id = id;
      s.appendChild(S.el('h2', null, S.esc(h)));
      if (lead) s.appendChild(S.el('p', 'lead', S.inl(lead)));
      return s;
    }

    var sw = sec('watch', 'Watch it run', 'Step through the query in the order the database actually evaluates it, which is not the order you write it.');
    if (l.tables && l.tables.length) {
      sw.appendChild(S.el('p', 'crumb', 'Sample tables used here (click to open):'));
      var tp = S.tablePreviews(l.tables);
      tp.style.margin = '0 0 16px';
      sw.appendChild(tp);
    }
    S.stage(sw, l.stages);
    main.appendChild(sw);

    var cols = S.el('div', 'cols');
    var m = S.el('div', 'main'), rail = S.el('aside', 'rail');
    cols.appendChild(m); cols.appendChild(rail);

    var sl = sec('learn', 'Explained');
    l.sections.forEach(function (x) {
      if (x.name) sl.appendChild(S.el('h3', null, S.inl(x.name)));
      var pr = S.el('div', 'prose');
      (x.text || []).forEach(function (p) {
        if (Array.isArray(p)) {
          var u = S.el('ul');
          p.forEach(function (q) { u.appendChild(S.el('li', null, S.inl(q))); });
          pr.appendChild(u);
        } else pr.appendChild(S.el('p', null, S.inl(p)));
      });
      sl.appendChild(pr);
      if (x.sql) sl.appendChild(S.codeBox(x.sql));
      if (x.out) {
        var o = S.el('div', 'out');
        o.innerHTML = '<p class="lbl">Result</p>' + S.grid(x.out.cols, x.out.rows);
        sl.appendChild(o);
      }
    });
    if (l.table) {
      var tb = '<div class="tbl"><table class="t"><thead><tr>' + l.table.head.map(function (h) { return '<th>' + S.inl(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
      l.table.rows.forEach(function (r) { tb += '<tr>' + r.map(function (c) { return '<td>' + S.inl(c) + '</td>'; }).join('') + '</tr>'; });
      sl.appendChild(S.el('div', null, tb + '</tbody></table></div>'));
    }
    m.appendChild(sl);

    var st = sec('traps', 'Traps');
    var tu = S.el('ul', 'traps');
    l.pitfalls.forEach(function (p) { tu.appendChild(S.el('li', null, '<b>' + S.inl(p[0]) + '</b><span>' + S.inl(p[1]) + '</span>')); });
    st.appendChild(tu);
    m.appendChild(st);

    var sq = sec('qa', 'Interview questions', 'Answer out loud before you open each one.');
    var qa = S.el('div', 'qa');
    l.interview.forEach(function (x) {
      var d = S.el('details');
      d.appendChild(S.el('summary', null, S.inl(x[0])));
      var a = S.el('div', 'a');
      [].concat(x[1]).forEach(function (p) { a.appendChild(S.el('p', null, S.inl(p))); });
      d.appendChild(a);
      qa.appendChild(d);
    });
    sq.appendChild(qa);
    m.appendChild(sq);

    var sp = sec('practice', 'Practice', 'Predict first, then check. "Write the query" drills run real SQL in your browser. Showing an answer does not count as a pass.');
    var score = S.el('p', 'crumb');
    function upd() { var s = S.lessonScore(l); score.textContent = s.done + ' of ' + s.total + ' drills passed'; }
    upd();
    sp.appendChild(score);
    S.drills(sp, l, upd);
    m.appendChild(sp);

    rail.appendChild(S.el('h3', null, 'Say this in the interview'));
    var say = S.el('ul', 'say');
    l.say.forEach(function (x) { say.appendChild(S.el('li', null, S.inl(x))); });
    rail.appendChild(say);
    rail.appendChild(S.el('h3', null, 'Can you…'));
    var ck = S.el('ul', 'ticks');
    var saved = S.get('check:' + slug, {});
    l.checklist.forEach(function (c, i) {
      var li = S.el('li'), lab = S.el('label'), inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.checked = !!saved[i];
      inp.addEventListener('change', function () { saved[i] = inp.checked ? 1 : 0; S.set('check:' + slug, saved); });
      lab.appendChild(inp); lab.appendChild(S.el('span', null, S.inl(c)));
      li.appendChild(lab); ck.appendChild(li);
    });
    rail.appendChild(ck);
    main.appendChild(cols);

    var pg = S.el('div', 'pager');
    var pv = S.manifest[pos - 1], nx = S.manifest[pos + 1];
    pg.innerHTML = (pv ? '<a class="btn" href="lesson.html?l=' + pv + '">Previous lesson</a>' : '<span></span>') +
      (nx ? '<a class="btn pri" href="lesson.html?l=' + nx + '">Next lesson</a>' : '<a class="btn pri" href="practice.html">Mixed practice</a>');
    main.appendChild(pg);
    if (location.hash) { var h = document.querySelector(location.hash); if (h) h.scrollIntoView(); }
  });
})();
