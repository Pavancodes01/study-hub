/* Practice page: every drill, filterable. */
(function () {
  'use strict';
  var S = window.SDD;
  S.nav('practice');
  var main = document.getElementById('main');
  var PAGE = 8;
  S.loadLessons(S.manifest, function () {
    var all = [];
    S.ordered().forEach(function (l) {
      S.TYPES.forEach(function (t) { (l.drills[t] || []).forEach(function (d, i) { all.push({ l: l, t: t, i: i, id: l.slug + ':' + t + ':' + i }); }); });
    });
    var t = S.el('div', 'title');
    t.innerHTML = '<h1>Practice</h1><p class="one">' + all.length + ' drills from every lesson. Filter by track and type, or show only the ones you have <mark>not passed</mark> yet.</p>';
    main.appendChild(t);
    var saved = S.get('pfilter', {});
    var f = S.el('div', 'filters');
    function sel(label, key, opts) {
      var lab = S.el('label', null, label + ' '), s = document.createElement('select');
      opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
      if (saved[key]) s.value = saved[key];
      lab.appendChild(s); f.appendChild(lab);
      return s;
    }
    var sTrack = sel('Track', 'track', [['', 'All tracks']].concat(S.tracks.map(function (x) { return [x.id, x.name]; })));
    var sType = sel('Type', 'type', [['', 'All types']].concat(S.TYPES.map(function (x) { return [x, S.KIND[x]]; })));
    var sState = sel('Show', 'state', [['', 'All drills'], ['open', 'Not passed yet']]);
    var bShuffle = S.el('button', 'btn sm', 'Shuffle');
    bShuffle.type = 'button';
    f.appendChild(bShuffle);
    main.appendChild(f);
    var count = S.el('p', 'crumb');
    main.appendChild(count);
    var list = S.el('div');
    list.style.maxWidth = '80ch';
    main.appendChild(list);
    var more = S.el('button', 'btn', 'Show more');
    more.type = 'button';
    main.appendChild(more);
    var order = all.slice(), shown = 0, pool = [];
    function filter() {
      S.set('pfilter', { track: sTrack.value, type: sType.value, state: sState.value });
      pool = order.filter(function (x) {
        return (!sTrack.value || x.l.track === sTrack.value) && (!sType.value || x.t === sType.value) && (!sState.value || !S.passed(x.id));
      });
      count.textContent = pool.length + ' drills · ' + pool.filter(function (x) { return S.passed(x.id); }).length + ' passed';
      list.innerHTML = '';
      shown = 0;
      if (!pool.length) list.appendChild(S.el('p', null, sState.value ? 'Everything here is passed. Nice work.' : 'No drills match.'));
      page();
    }
    function page() {
      pool.slice(shown, shown + PAGE).forEach(function (x) {
        list.appendChild(S.el('p', 'from', '<a href="lesson.html?l=' + x.l.slug + '#practice">' + S.esc(x.l.title) + '</a>'));
        S.drill(list, x.l, x.t, x.i);
      });
      shown += PAGE;
      more.hidden = shown >= pool.length;
    }
    [sTrack, sType, sState].forEach(function (s) { s.addEventListener('change', filter); });
    more.addEventListener('click', page);
    bShuffle.addEventListener('click', function () {
      for (var k = order.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), tmp = order[k]; order[k] = order[j]; order[j] = tmp; }
      filter();
    });
    filter();
  });
})();
