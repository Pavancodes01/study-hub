// Renders concept.html and design.html from content data.
(function(){
  var esc = HLD.esc, fmt = HLD.fmt, S = HLD.store;
  function paras(list){ return (list || []).map(function(p){ return '<p>' + fmt(p) + '</p>'; }).join(''); }
  function sec(id, title, lead, body, num){
    return '<section class="s" id="' + id + '"><h2>' + (num ? '<span class="fnum">' + num + '</span>' : '') + esc(title) + '</h2>' + (lead ? '<p class="lead">' + fmt(lead) + '</p>' : '') + body + '</section>';
  }
  function chips(list, cls){ return '<ul class="chips ' + (cls || '') + '">' + list.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>'; }
  function say(list){ return list && list.length ? '<h3>Say it in the interview</h3><ul class="say">' + list.map(function(s){ return '<li>' + fmt(s) + '</li>'; }).join('') + '</ul>' : ''; }
  function nums(list){ return list && list.length ? '<h3>Numbers to remember</h3><div class="nums">' + list.map(function(n){ return '<b>' + esc(n[0]) + '</b><span>' + fmt(n[1]) + (n[2] ? '<small>' + fmt(n[2]) + '</small>' : '') + '</span>'; }).join('') + '</div>' : ''; }
  function checklist(p){
    if (!p.checklist || !p.checklist.length) return '';
    return sec('check', 'Check yourself', 'Tick a line only when you can say it out loud without looking.',
      '<ul class="checks">' + p.checklist.map(function(c, i){
        var id = 'ck-' + p.slug + '-' + i;
        return '<li><label for="' + id + '"><input type="checkbox" id="' + id + '" data-i="' + i + '"' + (S.isChecked(p.slug, i) ? ' checked' : '') + '><span>' + fmt(c) + '</span></label></li>';
      }).join('') + '</ul>');
  }
  function pitfalls(list){ return '<ul class="pitfalls">' + list.map(function(x){ return '<li><b>' + fmt(x[0]) + '</b><span>' + fmt(x[1]) + '</span></li>'; }).join('') + '</ul>'; }
  function probe(list){ return '<div class="probe">' + list.map(function(x){ return '<details><summary>' + fmt(x[0]) + '</summary><div class="a">' + paras([].concat(x[1])) + '</div></details>'; }).join('') + '</div>'; }
  function toc(items){ return '<ul class="toc">' + items.map(function(t){ return '<li><a href="#' + t[0] + '">' + esc(t[1]) + '</a></li>'; }).join('') + '</ul>'; }
  function pager(list, p, page){
    var i = list.indexOf(p), a = list[i - 1], b = list[i + 1];
    return '<div class="pager">' + (a ? '<a class="btn" href="' + page + '?' + page.charAt(0) + '=' + a.slug + '">Previous: ' + esc(a.title) + '</a>' : '<span></span>') +
      (b ? '<a class="btn go" href="' + page + '?' + page.charAt(0) + '=' + b.slug + '">Next: ' + esc(b.title) + '</a>' : '<a class="btn go" href="index.html">Back to the board</a>') + '</div>';
  }
  function wire(root, p){
    root.querySelectorAll('.checks input').forEach(function(cb){ cb.addEventListener('change', function(){ S.setChecked(p.slug, +cb.dataset.i, cb.checked); }); });
    Drills.all(root.querySelector('#drillhost'), p);
    if (location.hash){ var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  window.renderConcept = function(c, list){
    document.title = c.title + ' · System design';
    var t = [['picture', 'The idea'], ['how', 'How it works'], ['options', 'Options'], ['pitfalls', 'Mistakes'], ['seen', 'In real systems'], ['deeper', 'Follow-ups'], ['check', 'Check yourself'], ['practice', 'Practice']];
    var main =
      sec('picture', 'The picture in your head', null,
        '<div class="picture">' + paras(c.picture) + '</div><div class="twocol"><div><h3>Reach for it when</h3>' + chips(c.use, 'yes') + '</div><div><h3>Think twice when</h3>' + chips(c.avoid, 'no') + '</div></div>') +
      sec('how', 'How it works', c.howLead, '<div class="prose">' + c.how.map(function(h){ return '<h3>' + esc(h.name) + '</h3>' + paras(h.text) + (h.code ? HLD.code(h.code) : ''); }).join('') + '</div>') +
      sec('options', c.compare.title, c.compare.lead, HLD.table(c.compare.head, c.compare.rows)) +
      sec('pitfalls', 'Mistakes that cost points', null, pitfalls(c.pitfalls)) +
      sec('seen', 'Where you see it', null, HLD.table(['System', 'How it uses this'], c.seen)) +
      sec('deeper', 'What the interviewer asks next', 'Answer out loud first, then open the answer.', probe(c.probe)) +
      checklist(c) +
      sec('practice', 'Practice', 'Progress saves in this browser.', '<div id="drillhost"></div>') + pager(list, c, 'concept.html');
    var root = document.getElementById('app');
    root.innerHTML = '<div class="page"><div class="head"><p class="kind">Building block</p><h1>' + esc(c.title) + '</h1><p class="one">' + fmt(c.one) + '</p></div>' +
      '<div id="board"></div>' + toc(t) +
      '<div class="cols"><div class="main">' + main + '</div><aside class="margin">' + say(c.say) + nums(c.numbers) + '</aside></div></div>';
    Board.mount(document.getElementById('board'), c.flows);
    wire(root, c);
  };

  window.renderDesign = function(d, list){
    document.title = d.title + ' · System design';
    var R = d.reqs, E = d.estimate;
    var t = [['reqs', 'Requirements'], ['est', 'Estimation'], ['api', 'API'], ['data', 'Data model'], ['hld', 'Architecture'], ['deep', 'Deep dives'], ['bottle', 'Bottlenecks'], ['trade', 'Trade-offs'], ['probe', 'Follow-ups'], ['practice', 'Practice']];
    var main =
      sec('reqs', 'Clarify the requirements', 'Ask before you draw. Agree on scope out loud, then write it in a corner of the board.',
        '<h3>Questions to ask</h3><ul class="prose">' + d.questions.map(function(q){ return '<li>' + fmt(q) + '</li>'; }).join('') + '</ul>' +
        '<div class="twocol"><div><h3>Functional</h3><ul class="prose">' + R.func.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div><h3>Non-functional</h3><ul class="prose">' + R.nonfunc.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul></div></div>' +
        '<h3>In scope now</h3>' + chips(R.mvp, 'yes') + '<h3>Say "later" to</h3>' + chips(R.later, 'no'), 1) +
      sec('est', 'Back-of-envelope estimation', E.lead, '<h3>Assume</h3><ul class="prose">' + E.assume.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>' +
        HLD.table(['What', 'Math', 'Result'], E.rows) + (E.so ? '<div class="picture"><p>' + fmt(E.so) + '</p></div>' : ''), 2) +
      sec('api', 'API', d.apiLead, d.api.map(function(a){ return '<div class="api"><div class="sig"><b>' + esc(a[0]) + '</b>' + esc(a[1]) + '</div><p>' + fmt(a[2]) + '</p>' + (a[3] ? HLD.code(a[3]) : '') + '</div>'; }).join(''), 3) +
      sec('data', 'Data model', d.dataLead, '<div class="datatbl">' + d.data.map(function(tb){
        return '<h3>' + esc(tb.name) + ' <span class="where">in ' + esc(tb.store) + '</span></h3>' + HLD.table(['Field', 'Type', 'Why'], tb.cols) + (tb.why ? '<p>' + fmt(tb.why) + '</p>' : '');
      }).join('') + '</div>', 4) +
      sec('hld', 'High-level design', 'Use the board at the top: the first tab adds one box per step and says which problem it solves. The other tabs trace a request.',
        '<div class="prose">' + paras(d.hld) + '</div>', 5) +
      sec('deep', 'Deep dives', 'Pick the one or two the interviewer cares about. Each is a 5-minute conversation.',
        '<div class="deep">' + d.deep.map(function(x, i){ return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(x.name) + '</summary><div class="prose">' + paras(x.text) + (x.code ? HLD.code(x.code) : '') + (x.diagram ? '<div class="still" data-i="' + i + '"></div>' : '') + '</div></details>'; }).join('') + '</div>', 6) +
      sec('bottle', 'Bottlenecks and fixes', null, HLD.table(['What breaks first', 'Fix'], d.bottlenecks), 7) +
      sec('trade', 'Trade-offs you chose', 'Interviewers score the reasons, not the boxes.', HLD.table(['Decision', 'Chose', 'Because', 'Gave up'], d.tradeoffs), 8) +
      sec('probe', 'What the interviewer asks next', 'Answer out loud first, then open the answer.', probe(d.probe), 9) +
      checklist(d) +
      sec('practice', 'Practice', 'Progress saves in this browser.', '<div id="drillhost"></div>') + pager(list, d, 'design.html');
    var root = document.getElementById('app');
    root.innerHTML = '<div class="page"><div class="head"><p class="kind">Case study</p><h1>' + esc(d.title) + '</h1><p class="one">' + fmt(d.one) + '</p></div>' +
      '<div id="board"></div>' + toc(t) +
      '<div class="cols"><div class="main">' + main + '</div><aside class="margin">' + say(d.say) + nums(d.numbers) + '</aside></div></div>';
    Board.mount(document.getElementById('board'), d.flows);
    root.querySelectorAll('.still').forEach(function(s){ var x = d.deep[+s.dataset.i]; Board.still(s, x.diagram, x.step); });
    wire(root, d);
  };
})();
