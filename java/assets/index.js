/* Course page: tracks, lessons, progress. */
(function () {
  'use strict';
  var J = window.JDD;
  J.nav('course');
  var main = document.getElementById('main');
  J.loadLessons(J.manifest, function () {
    var all = J.ordered(), done = 0, total = 0;
    all.forEach(function (l) { var s = J.lessonScore(l); done += s.done; total += s.total; });
    var last = J.get('last', null);
    var t = J.el('div', 'title');
    t.innerHTML = '<p class="crumb">Java 21 · basics to advanced · interview-focused</p>' +
      '<h1>Watch Java run.</h1>' +
      '<p class="one">Every lesson steps through real code and shows the <mark>stack</mark>, the <mark>heap</mark> and every reference between them. ' +
      'Then you predict output, fill in code and hunt bugs until it sticks.</p>' +
      '<p class="from">' + all.length + ' lessons in ' + J.tracks.length + ' tracks · ' + done + ' of ' + total + ' drills passed</p>' +
      '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">' +
      '<a class="btn pri" href="lesson.html?l=' + (last && J.lessons[last] ? last : all[0].slug) + '">' + (last ? 'Continue: ' + J.esc(J.lessons[last] ? J.lessons[last].title : all[0].title) : 'Start with lesson 1') + '</a>' +
      '<a class="btn" href="practice.html">Mixed practice</a></div>';
    main.appendChild(t);
    J.tracks.forEach(function (tr, ti) {
      var ls = all.filter(function (l) { return l.track === tr.id; });
      var s = J.el('section', 'track');
      s.id = tr.id;
      s.innerHTML = '<h3>' + (ti + 1) + ' / ' + J.esc(tr.name) + '</h3><p class="d">' + J.esc(tr.d) + '</p>';
      var ul = J.el('ul', 'lessons');
      ul.style.counterReset = 'l ' + J.manifest.indexOf(ls[0] ? ls[0].slug : '') ;
      ls.forEach(function (l) {
        var sc = J.lessonScore(l);
        ul.appendChild(J.el('li', null, '<a href="lesson.html?l=' + l.slug + '"><span>' + J.esc(l.title) + '</span>' +
          (sc.done ? '<em>' + sc.done + '/' + sc.total + '</em>' : '') + '</a>'));
      });
      s.appendChild(ul);
      main.appendChild(s);
    });
  });
})();
