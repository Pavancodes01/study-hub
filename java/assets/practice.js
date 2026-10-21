/* Practice page: every drill from every lesson, filterable. */
(function () {
  'use strict';
  var J = window.JDD;
  J.nav('practice');
  var main = document.getElementById('main');
  var PAGE = 10;

  J.loadLessons(J.manifest, function () {
    var all = [];
    J.ordered().forEach(function (l) {
      ['predict', 'fill', 'bug'].forEach(function (t) {
        (l.drills[t] || []).forEach(function (d, i) { all.push({ l: l, t: t, i: i, id: l.slug + ':' + t + ':' + i }); });
      });
    });

    var t = J.el('div', 'title');
    t.innerHTML = '<h1>Practice</h1><p class="one">' + all.length + ' drills from every lesson. Filter by track and type, or show only the ones you have <mark>not passed</mark> yet.</p>';
    main.appendChild(t);

    var saved = J.get('pfilter', {});
    var f = J.el('div', 'filters');
    function sel(label, key, opts) {
      var lab = J.el('label', null, label + ' ');
      var s = document.createElement('select');
      opts.forEach(function (o) {
        var op = document.createElement('option');
        op.value = o[0]; op.textContent = o[1];
        s.appendChild(op);
      });
      if (saved[key]) s.value = saved[key];
      lab.appendChild(s);
      f.appendChild(lab);
      return s;
    }
    var sTrack = sel('Track', 'track', [['', 'All tracks']].concat(J.tracks.map(function (x) { return [x.id, x.name]; })));
    var sType = sel('Type', 'type', [['', 'All types'], ['predict', J.KIND.predict], ['fill', J.KIND.fill], ['bug', J.KIND.bug]]);
    var sState = sel('Show', 'state', [['', 'All drills'], ['open', 'Not passed yet']]);
    var bShuffle = J.el('button', 'btn sm', 'Shuffle');
    bShuffle.type = 'button';
    f.appendChild(bShuffle);
    main.appendChild(f);
    var count = J.el('p', 'crumb');
    main.appendChild(count);
    var list = J.el('div');
    list.style.maxWidth = '76ch';
    main.appendChild(list);
    var more = J.el('button', 'btn', 'Show more');
    more.type = 'button';
    main.appendChild(more);

    var order = all.slice(), shown = 0, pool = [];
    function filter() {
      J.set('pfilter', { track: sTrack.value, type: sType.value, state: sState.value });
      pool = order.filter(function (x) {
        return (!sTrack.value || x.l.track === sTrack.value) &&
          (!sType.value || x.t === sType.value) &&
          (!sState.value || !J.passed(x.id));
      });
      var passed = pool.filter(function (x) { return J.passed(x.id); }).length;
      count.textContent = pool.length + ' drills · ' + passed + ' passed';
      list.innerHTML = '';
      shown = 0;
      if (!pool.length) list.appendChild(J.el('p', null, sState.value ? 'Everything here is passed. Nice work.' : 'No drills match.'));
      page();
    }
    function page() {
      pool.slice(shown, shown + PAGE).forEach(function (x) {
        list.appendChild(J.el('p', 'from', '<a href="lesson.html?l=' + x.l.slug + '#practice">' + J.esc(x.l.title) + '</a>'));
        J.drill(list, x.l, x.t, x.i);
      });
      shown += PAGE;
      more.hidden = shown >= pool.length;
    }
    [sTrack, sType, sState].forEach(function (s) { s.addEventListener('change', filter); });
    more.addEventListener('click', page);
    bShuffle.addEventListener('click', function () {
      for (var k = order.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1));
        var tmp = order[k]; order[k] = order[j]; order[j] = tmp;
      }
      filter();
    });
    filter();
  });
})();
