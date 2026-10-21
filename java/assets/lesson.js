/* Lesson page: one renderer for every lesson file. */
(function () {
  'use strict';
  var J = window.JDD;
  J.nav('course');
  var slug = J.qs('l') || J.manifest[0];
  var main = document.getElementById('main');

  if (J.manifest.indexOf(slug) < 0) {
    main.innerHTML = '<div class="title"><h1>Lesson not found</h1><p><a href="index.html">Back to the course</a></p></div>';
    return;
  }

  J.loadLessons([slug], function () {
    var l = J.lessons[slug];
    if (!l) {
      main.innerHTML = '<div class="title"><h1>Lesson not written yet</h1><p><a href="index.html">Back to the course</a></p></div>';
      return;
    }
    document.title = l.title + ' · Java Deep Dive';
    J.set('last', slug);
    var tr = J.tracks.filter(function (t) { return t.id === l.track; })[0];
    var pos = J.manifest.indexOf(slug);

    var t = J.el('div', 'title');
    t.innerHTML = '<p class="crumb"><a href="index.html#' + tr.id + '">' + J.esc(tr.name) + '</a> · Lesson ' + (pos + 1) + ' of ' + J.manifest.length + '</p>' +
      '<h1>' + J.esc(l.title) + '</h1><p class="one">' + J.inl(l.one).replace(/\*(.+?)\*/g, '<mark>$1</mark>') + '</p>';
    var jumps = [['watch', 'Watch it run'], ['learn', 'Explained'], ['traps', 'Traps'], ['qa', 'Interview'], ['practice', 'Practice']];
    var ul = J.el('ul', 'jump');
    jumps.forEach(function (j) { ul.appendChild(J.el('li', null, '<a href="#' + j[0] + '">' + j[1] + '</a>')); });
    t.appendChild(ul);
    main.appendChild(t);

    var cols = J.el('div', 'cols');
    var m = J.el('div', 'main'), rail = J.el('aside', 'rail');
    cols.appendChild(m); cols.appendChild(rail);

    function sec(id, h, lead) {
      var s = J.el('section', 's');
      s.id = id;
      s.appendChild(J.el('h2', null, J.esc(h)));
      if (lead) s.appendChild(J.el('p', 'lead', J.inl(lead)));
      return s;
    }

    /* idea */
    var idea = J.el('div', 'idea prose');
    l.idea.forEach(function (p) { idea.appendChild(J.el('p', null, J.inl(p))); });
    idea.style.marginTop = '22px';
    t.appendChild(idea);

    /* stage: full width, outside the reading column */
    var sw = sec('watch', 'Watch it run', 'Step through the code. The left column is the call stack, the right is the heap. Arrows are references.');
    sw.style.maxWidth = 'none';
    J.stage(sw, l.stages);

    /* explained */
    var sl = sec('learn', 'Explained');
    l.sections.forEach(function (x) {
      sl.appendChild(J.el('h3', null, J.inl(x.name)));
      var pr = J.el('div', 'prose');
      x.text.forEach(function (p) {
        if (Array.isArray(p)) {
          var u = J.el('ul');
          p.forEach(function (q) { u.appendChild(J.el('li', null, J.inl(q))); });
          pr.appendChild(u);
        } else pr.appendChild(J.el('p', null, J.inl(p)));
      });
      sl.appendChild(pr);
      if (x.code) sl.appendChild(J.codeBox(x.code));
    });
    if (l.table) {
      var tb = '<div class="tbl"><table><thead><tr>' + l.table.head.map(function (h) { return '<th>' + J.inl(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
      l.table.rows.forEach(function (r) { tb += '<tr>' + r.map(function (c) { return '<td>' + J.inl(c) + '</td>'; }).join('') + '</tr>'; });
      sl.appendChild(J.el('div', null, tb + '</tbody></table></div>'));
    }
    m.appendChild(sl);

    var st = sec('traps', 'Traps');
    var tu = J.el('ul', 'traps');
    l.pitfalls.forEach(function (p) { tu.appendChild(J.el('li', null, '<b>' + J.inl(p[0]) + '</b><span>' + J.inl(p[1]) + '</span>')); });
    st.appendChild(tu);
    m.appendChild(st);

    var sq = sec('qa', 'Interview questions', 'Answer out loud before you open each one.');
    var qa = J.el('div', 'qa');
    l.interview.forEach(function (x) {
      var d = J.el('details');
      d.appendChild(J.el('summary', null, J.inl(x[0])));
      var a = J.el('div', 'a');
      [].concat(x[1]).forEach(function (p) { a.appendChild(J.el('p', null, J.inl(p))); });
      d.appendChild(a);
      qa.appendChild(d);
    });
    sq.appendChild(qa);
    m.appendChild(sq);

    var sp = sec('practice', 'Practice', 'Predict first, then check. Showing the answer does not count as a pass.');
    var score = J.el('p', 'crumb');
    function upd() { var s = J.lessonScore(l); score.textContent = s.done + ' of ' + s.total + ' drills passed'; }
    upd();
    sp.appendChild(score);
    J.drills(sp, l, upd);
    m.appendChild(sp);

    /* rail */
    rail.appendChild(J.el('h3', null, 'Say this in the interview'));
    var say = J.el('ul', 'say');
    l.say.forEach(function (x) { say.appendChild(J.el('li', null, J.inl(x))); });
    rail.appendChild(say);
    rail.appendChild(J.el('h3', null, 'Can you…'));
    var ck = J.el('ul', 'ticks');
    var saved = J.get('check:' + slug, {});
    l.checklist.forEach(function (c, i) {
      var li = J.el('li');
      var lab = J.el('label');
      var inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.checked = !!saved[i];
      inp.addEventListener('change', function () { saved[i] = inp.checked ? 1 : 0; J.set('check:' + slug, saved); });
      lab.appendChild(inp);
      lab.appendChild(J.el('span', null, J.inl(c)));
      li.appendChild(lab);
      ck.appendChild(li);
    });
    rail.appendChild(ck);

    main.appendChild(sw);
    main.appendChild(cols);

    var pg = J.el('div', 'pager');
    var pv = J.manifest[pos - 1], nx = J.manifest[pos + 1];
    pg.innerHTML = (pv ? '<a class="btn" href="lesson.html?l=' + pv + '">Previous lesson</a>' : '<span></span>') +
      (nx ? '<a class="btn pri" href="lesson.html?l=' + nx + '">Next lesson</a>' : '<a class="btn pri" href="practice.html">Mixed practice</a>');
    main.appendChild(pg);
    if (location.hash) { var h = document.querySelector(location.hash); if (h) h.scrollIntoView(); }
  });
})();
