/* Course page. */
(function () {
  'use strict';
  var S = window.SDD;
  S.nav('course');
  var main = document.getElementById('main');
  S.loadLessons(S.manifest, function () {
    var all = S.ordered(), done = 0, total = 0;
    all.forEach(function (l) { var s = S.lessonScore(l); done += s.done; total += s.total; });
    var last = S.get('last', null);
    var start = last && S.lessons[last] ? S.lessons[last] : all[0];
    var t = S.el('div', 'title');
    t.innerHTML = '<p class="crumb">Standard SQL · runs on SQLite · basics to interview</p>' +
      '<h1>See every query <i style="color:var(--amber)">think</i>.</h1>' +
      '<p class="one">Each lesson replays a query clause by clause, in the order the database really runs it: rows <mark>filtered</mark>, tables <mark>joined</mark>, groups <mark>collapsed</mark>. ' +
      'Then you predict results, fill in clauses and write real queries that run in your browser.</p>' +
      '<p class="from">' + all.length + ' lessons in ' + S.tracks.length + ' tracks · ' + done + ' of ' + total + ' drills passed</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">' +
      '<a class="btn pri" href="lesson.html?l=' + start.slug + '">' + (last ? 'Continue: ' + S.esc(start.title) : 'Start with lesson 1') + '</a>' +
      '<a class="btn" href="practice.html">Mixed practice</a><a class="btn" href="playground.html">Playground</a></div>';
    main.appendChild(t);
    S.tracks.forEach(function (tr, ti) {
      var ls = all.filter(function (l) { return l.track === tr.id; });
      var s = S.el('section', 'track');
      s.id = tr.id;
      s.innerHTML = '<h3>' + (ti + 1) + '. ' + S.esc(tr.name) + '</h3><p class="d">' + S.esc(tr.d) + '</p>';
      var ul = S.el('ul', 'lessons');
      ls.forEach(function (l) {
        var sc = S.lessonScore(l), n = S.manifest.indexOf(l.slug) + 1;
        ul.appendChild(S.el('li', null, '<a href="lesson.html?l=' + l.slug + '"><b>' + (n < 10 ? '0' : '') + n + '</b><span>' + S.esc(l.title) + '</span>' +
          (sc.done ? '<em>' + sc.done + '/' + sc.total + '</em>' : '') + '</a>'));
      });
      s.appendChild(ul);
      main.appendChild(s);
    });
  });
})();
