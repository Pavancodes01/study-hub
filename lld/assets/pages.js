// Renders basics.html, pattern.html and design.html from content data.
(function(){
  var esc = LLD.esc, fmt = LLD.fmt, paras = LLD.paras, S = LLD.store;
  function sec(id, title, lead, body, num){
    return '<section class="s" id="' + id + '"><h2>' + (num ? num + '. ' : '') + esc(title) + '</h2>' + (lead ? '<p class="lead">' + fmt(lead) + '</p>' : '') + body + '</section>';
  }
  function chips(list, cls){ return '<ul class="chips ' + (cls || '') + '">' + list.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>'; }
  function list(items){ return '<ul class="prose">' + items.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>'; }
  function warn(items){ return '<ul class="warn">' + items.map(function(x){ return '<li><b>' + fmt(x[0]) + '</b><span>' + fmt(x[1]) + '</span></li>'; }).join('') + '</ul>'; }
  function qa(items){ return '<div class="qa">' + items.map(function(x){ return '<details><summary>' + fmt(x[0]) + '</summary><div class="a">' + paras([].concat(x[1])) + '</div></details>'; }).join('') + '</div>'; }
  function rail(p){
    return (p.say && p.say.length ? '<h3>Say it in the interview</h3><ul class="lines-say">' + p.say.map(function(s){ return '<li>' + fmt(s) + '</li>'; }).join('') + '</ul>' : '') +
      (p.facts && p.facts.length ? '<h3>Remember</h3><div class="facts">' + p.facts.map(function(f){ return '<b>' + esc(f[0]) + '</b><span>' + fmt(f[1]) + '</span>'; }).join('') + '</div>' : '');
  }
  function ticks(p){
    if (!p.checklist || !p.checklist.length) return '';
    return sec('check', 'Check yourself', 'Tick a line only when you can do it without looking.', '<ul class="ticks">' + p.checklist.map(function(c, i){
      var id = 't-' + p.slug + '-' + i;
      return '<li><label for="' + id + '"><input type="checkbox" id="' + id + '" data-i="' + i + '"' + (S.isTicked(p.slug, i) ? ' checked' : '') + '><span>' + fmt(c) + '</span></label></li>';
    }).join('') + '</ul>');
  }
  function jump(items){ return '<ul class="jump">' + items.map(function(t){ return '<li><a href="#' + t[0] + '">' + esc(t[1]) + '</a></li>'; }).join('') + '</ul>'; }
  function pager(lst, p, page, key){
    var i = lst.indexOf(p), a = lst[i - 1], b = lst[i + 1];
    return '<div class="pager">' + (a ? '<a class="btn" href="' + page + '?' + key + '=' + a.slug + '">Previous: ' + esc(a.title) + '</a>' : '<span></span>') +
      (b ? '<a class="btn pri" href="' + page + '?' + key + '=' + b.slug + '">Next: ' + esc(b.title) + '</a>' : '<a class="btn pri" href="index.html">Back to overview</a>') + '</div>';
  }
  function shell(p, crumb, main, flows){
    var root = document.getElementById('app');
    root.innerHTML = '<div class="page"><div class="title"><p class="crumb"><a href="index.html">Overview</a> / ' + esc(crumb) + '</p><h1>' + esc(p.title) + '</h1><p class="one">' + fmt(p.one) + '</p></div>' +
      (flows && flows.length ? '<div id="stage"></div>' : '') + main.jump +
      '<div class="cols"><div class="main">' + main.body + '</div><aside class="rail">' + rail(p) + '</aside></div></div>';
    if (flows && flows.length) UML.mount(document.getElementById('stage'), flows);
    root.querySelectorAll('.ticks input').forEach(function(cb){ cb.addEventListener('change', function(){ S.setTicked(p.slug, +cb.dataset.i, cb.checked); }); });
    var host = root.querySelector('#drillhost'); if (host) Drills.all(host, p);
    LLD.wireCopy(root);
    if (location.hash){ var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }
  // flows may say code: '@main' to show the page's main code listing
  function resolve(flows, src, file){
    return (flows || []).map(function(f){ var g = Object.assign({}, f); if (g.code === '@main'){ g.code = src; g.file = g.file || file; } return g; });
  }

  window.renderBasic = function(b, all){
    document.title = b.title + ' · Object design';
    var body =
      sec('idea', 'The idea', null, '<div class="analogy">' + paras(b.picture) + '</div>') +
      sec('detail', 'In detail', b.detailLead, '<div class="prose">' + b.sections.map(function(x){
        return '<h3>' + esc(x.name) + '</h3>' + paras(x.text) +
          (x.bad && x.good ? '<div class="pair"><div class="bad"><h3>' + esc(x.badLabel || 'Before') + '</h3>' + LLD.codeBlock(x.bad) + '</div><div class="good"><h3>' + esc(x.goodLabel || 'After') + '</h3>' + LLD.codeBlock(x.good) + '</div></div>' : '') +
          (x.code ? LLD.codeBlock(x.code) : '');
      }).join('') + '</div>') +
      (b.table ? sec('compare', b.table.title, b.table.lead, LLD.table(b.table.head, b.table.rows)) : '') +
      sec('mistakes', 'Mistakes', null, warn(b.pitfalls)) +
      sec('followups', 'What the interviewer asks next', 'Answer out loud first, then open the answer.', qa(b.probe)) +
      ticks(b) + sec('practice', 'Practice', 'Progress saves in this browser.', '<div id="drillhost"></div>') + pager(all, b, 'basics.html', 'b');
    shell(b, b.group, { jump: jump([['idea', 'The idea'], ['detail', 'In detail'], ['mistakes', 'Mistakes'], ['followups', 'Follow-ups'], ['practice', 'Practice']]), body: body }, resolve(b.flows, b.mainCode, b.mainFile));
  };

  window.renderPattern = function(p, all){
    document.title = p.title + ' pattern · Object design';
    var body =
      sec('idea', 'The idea', null, '<div class="analogy">' + paras(p.analogy) + '</div><div class="twocol"><div><h3>Use it when</h3>' + chips(p.use, 'yes') + '</div><div><h3>Skip it when</h3>' + chips(p.avoid, 'no') + '</div></div>') +
      sec('problem', 'The problem it solves', null, '<div class="prose">' + paras(p.problem.text) + '</div>' + LLD.codeBlock(p.problem.code)) +
      sec('solution', 'The solution', null, '<div class="prose">' + paras(p.solution.text) + '</div>' + LLD.codeBlock(p.solution.code)) +
      sec('jdk', 'Where you have already seen it', null, LLD.table(['Where', 'How'], p.jdk)) +
      sec('related', 'Related patterns', null, LLD.table(['Pattern', 'Difference'], p.related)) +
      sec('mistakes', 'Mistakes', null, warn(p.pitfalls)) +
      sec('followups', 'What the interviewer asks next', 'Answer out loud first, then open the answer.', qa(p.probe)) +
      ticks(p) + sec('practice', 'Practice', 'Progress saves in this browser.', '<div id="drillhost"></div>') + pager(all, p, 'pattern.html', 'p');
    shell(p, p.kind + ' pattern', { jump: jump([['idea', 'The idea'], ['problem', 'Problem'], ['solution', 'Solution'], ['jdk', 'In the JDK'], ['related', 'Related'], ['mistakes', 'Mistakes'], ['followups', 'Follow-ups'], ['practice', 'Practice']]), body: body },
      resolve(p.flows, p.solution.code, p.solution.file));
  };

  window.renderDesign = function(d, all){
    document.title = d.title + ' · Object design';
    var body =
      sec('clarify', 'Clarify the requirements', 'Ask first. Agree on what is in and out of scope.', '<h3>Questions to ask</h3>' + list(d.questions) +
        '<div class="twocol"><div><h3>Must do</h3>' + list(d.reqs.func) + '</div><div><h3>Qualities</h3>' + list(d.reqs.nonfunc) + '</div></div><h3>Out of scope for now</h3>' + chips(d.reqs.out, 'no'), 1) +
      sec('entities', 'Find the entities', 'Underline the nouns in the requirements. Each important noun with its own data or behaviour becomes a class or an enum.', LLD.table(['Noun', 'Becomes', 'Responsible for'], d.entities), 2) +
      sec('diagram', 'Class diagram', 'Use the stage at the top: the first tab builds the class diagram one decision at a time, with the matching code on the right.', '<div class="prose">' + paras(d.diagramNotes) + '</div>', 3) +
      sec('flows', 'Key flows', 'The other tabs on the stage are sequence diagrams: one method call per step.', '<div class="prose">' + paras(d.flowNotes) + '</div>', 4) +
      sec('patterns', 'Patterns used', null, LLD.table(['Pattern', 'Where', 'Why'], d.patterns), 5) +
      sec('code', 'The code', 'Compiles as one file. Run it with `java ' + esc(d.code.file) + '`.', LLD.codeBlock(d.code.src) + (d.code.expect ? '<h3>Output</h3><div class="code"><pre><code>' + esc(d.code.expect) + '</code></pre></div>' : ''), 6) +
      sec('concurrency', 'Concurrency', null, LLD.table(['Risk', 'How the design handles it'], d.concurrency), 7) +
      sec('extend', 'What if…', 'Good designs absorb new requirements by adding classes, not editing many old ones.', LLD.table(['New requirement', 'Change'], d.extensions), 8) +
      sec('followups', 'What the interviewer asks next', 'Answer out loud first, then open the answer.', qa(d.probe)) +
      ticks(d) + sec('practice', 'Practice', 'Progress saves in this browser.', '<div id="drillhost"></div>') + pager(all, d, 'design.html', 'd');
    shell(d, 'Case study', { jump: jump([['clarify', 'Requirements'], ['entities', 'Entities'], ['diagram', 'Classes'], ['flows', 'Flows'], ['patterns', 'Patterns'], ['code', 'Code'], ['concurrency', 'Concurrency'], ['extend', 'What if'], ['followups', 'Follow-ups'], ['practice', 'Practice']]), body: body },
      resolve(d.flows, d.code.src, d.code.file));
  };
})();
