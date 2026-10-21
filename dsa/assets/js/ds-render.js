// Builds structure.html from one data structure's data.
(function(){
  var esc = DSA.esc, fmt = DSA.fmt;

  function table(head, rows, cls){
    return '<div class="tbl' + (cls ? ' ' + cls : '') + '"><table><thead><tr>' + head.map(function(h){ return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function(r){
        return '<tr>' + r.map(function(c){ return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function section(id, title, intro, body){
    return '<section class="sec" id="' + id + '"><h2>' + esc(title) + '</h2>' + (intro ? '<p class="intro">' + fmt(intro) + '</p>' : '') + body + '</section>';
  }
  // Colour a Big-O by how cheap it is.
  function bigO(t){
    var s = String(t), k = 'o-mid';
    if (/^O\(1\)/.test(s) || /amortized/.test(s) && /O\(1\)/.test(s)) k = 'o-good';
    else if (/^O\(log/.test(s) || /^O\(α/.test(s)) k = 'o-good2';
    else if (/^O\(n\)|^O\(n\s?\+|^O\(L\)|^O\(V\s?\+/.test(s)) k = 'o-mid';
    else if (/^O\(n log|^O\(n²|^O\(n\^2|^O\(V²/.test(s)) k = 'o-bad';
    else if (s === '—' || s === 'n/a') k = 'o-na';
    return '<span class="bo ' + k + '">' + esc(s) + '</span>';
  }
  DSA.bigO = bigO;

  window.renderStructure = function(d, all){
    document.title = d.title + ' in Java · Data structures';
    var key = DSA.dsKey(d);
    var idx = all.indexOf(d), prev = all[idx - 1], next = all[idx + 1];
    var toc = [], secs = [];

    // ---- Understand ----
    toc.push(['grp', 'Understand']);
    toc.push(['how', 'How it works']);
    secs.push(section('how', 'How it works', d.howIntro || 'The picture to hold in your head, then the mechanism step by step.',
      '<div class="idea">' + d.idea.map(function(s){ return '<p>' + fmt(s) + '</p>'; }).join('') + '</div>' +
      (d.anatomy ? '<h3>' + esc(d.anatomy.title || 'Inside the memory') + '</h3><div class="anat"><div class="anat-v"></div>' +
        (d.anatomy.notes ? '<ul class="anat-n">' + d.anatomy.notes.map(function(n){ return '<li>' + fmt(n) + '</li>'; }).join('') + '</ul>' : '') + '</div>' : '') +
      (d.demo ? '<h3>Step through it</h3><div id="dsdemo"></div>' : '')));

    toc.push(['cost', 'Operations & cost']);
    secs.push(section('cost', 'Operations and their cost', d.costIntro || 'What each operation costs, and the reason behind the number. The reason is what you should remember.',
      table(['Operation', 'Java', 'Time', 'Why'], d.ops.map(function(o){
        return [fmt(o[0]), '<code>' + esc(o[1]) + '</code>', bigO(o[2]), fmt(o[3])];
      }), 'ops')));

    toc.push(['when', 'When to use']);
    secs.push(section('when', 'When to use it', 'Reach for it when the problem needs one of these.',
      '<ul class="clues">' + d.when.map(function(c){ return '<li>' + fmt(c) + '</li>'; }).join('') + '</ul>' +
      (d.whenNot && d.whenNot.length ? '<h3>When something else is better</h3>' + table(['If you need…', 'Use instead'], d.whenNot.map(function(w){
        var o = w[2] && DSA.getDS(w[2]);
        return [fmt(w[0]), o ? '<a href="structure.html?d=' + o.slug + '">' + fmt(w[1]) + '</a>' : fmt(w[1])];
      })) : '') +
      (d.classes && d.classes.length ? '<h3>Which Java class?</h3>' + table(['Class', 'Pick it when'], d.classes.map(function(c){ return ['<code>' + esc(c[0]) + '</code>', fmt(c[1])]; })) : '')));

    // ---- Code ----
    toc.push(['grp', 'Code']);
    toc.push(['api', 'Java API']);
    secs.push(section('api', 'Using it in Java', d.apiIntro || 'Ready-to-use snippets. Each one runs as is inside `main`; the box under it is the real output.',
      '<div class="tabs"><div role="tablist">' + d.api.map(function(t, i){
        return '<button role="tab" type="button" aria-selected="' + (i === 0) + '">' + esc(t.name) + '</button>';
      }).join('') + '</div>' + d.api.map(function(t, i){
        return '<div class="panel"' + (i ? ' hidden' : '') + '>' + DSA.codeBlock(t.code, t.out) + (t.note ? '<p class="note">' + fmt(t.note) + '</p>' : '') + '</div>';
      }).join('') + '</div>'));

    if (d.build){
      toc.push(['build', 'Build it yourself']);
      secs.push(section('build', 'Build it yourself', d.build.intro,
        '<div class="pat bld"><div>' + DSA.codeBlock(d.build.code) + '</div><div>' +
        (d.build.notes ? '<dl class="rules">' + d.build.notes.map(function(n){ return '<dt>' + esc(n[0]) + '</dt><dd>' + fmt(n[1]) + '</dd>'; }).join('') + '</dl>' : '') +
        (d.build.demo ? '<h3>Try it</h3>' + DSA.codeBlock(d.build.demo, d.build.out) : '') + '</div></div>'));
    }

    toc.push(['gotchas', 'Gotchas']);
    secs.push(section('gotchas', 'Gotchas', 'Mistakes that compile fine and then bite you.',
      '<div class="bugs">' + d.gotchas.map(function(b){
        return '<div class="bug"><b>' + esc(b[0]) + '</b><p>' + fmt(b[1]) + '</p>' + (b[2] ? '<p>Fix: ' + fmt(b[2]) + '</p>' : '') + '</div>';
      }).join('') + '</div>'));

    // ---- Practice ----
    toc.push(['grp', 'Practice']);
    toc.push(['drills', 'Drills']);
    secs.push(section('drills', 'Drills', 'Fill the blanks, then build the code from the plain-English idea. Progress saves in this browser.', '<div id="drillBox"></div>'));

    toc.push(['used', 'Where it shows up']);
    var pats = (d.patterns || []).map(function(s){ return DSA.get(s); }).filter(Boolean);
    function plist(arr){
      return '<ul class="plist">' + arr.map(function(x){
        var id = 'pb-' + key + '-' + x[0];
        return '<li><label for="' + id + '"><input type="checkbox" id="' + id + '" data-num="' + esc(x[0]) + '"' + (Store.isSolved(key, x[0]) ? ' checked' : '') + '>' +
          '<span class="num">' + esc(x[0]) + '</span><span>' + esc(x[1]) + '</span>' +
          '<a class="lc" href="' + DSA.lcLink(x[0]) + '" target="_blank" rel="noopener">LeetCode ↗</a></label></li>';
      }).join('') + '</ul>';
    }
    secs.push(section('used', 'Where it shows up', 'Patterns that lean on this structure, and problems that make you build or use it directly.',
      (pats.length ? '<div class="uses">' + pats.map(function(p){
        return '<a class="use" href="pattern.html?p=' + p.slug + '"><b>' + esc(p.title) + '</b><span>' + fmt((d.patternWhy && d.patternWhy[p.slug]) || p.oneLiner.split('. ')[0]) + '</span></a>';
      }).join('') + '</div>' : '') +
      (d.problems && d.problems.length ? '<h3>Problems</h3>' + plist(d.problems) : '') +
      '<div class="pager">' + (prev ? '<a class="btn" href="structure.html?d=' + prev.slug + '">← ' + esc(prev.title) + '</a>' : '<a class="btn" href="structures.html">← All structures</a>') +
      (next ? '<a class="btn primary" href="structure.html?d=' + next.slug + '">' + esc(next.title) + ' →</a>' : '<a class="btn primary" href="compare.html">Compare them all →</a>') + '</div>'));

    // ---- Hero ----
    var c = d.compare || {};
    var chips = [['Access', c.access], ['Search', c.search], ['Insert', c.insert], ['Delete', c.remove]].filter(function(x){ return x[1]; });
    var grp = (DSA.DS_GROUPS.filter(function(g){ return g[0] === d.group; })[0] || ['', ''])[1].split(':')[0];
    var hero = '<header class="hero"><p class="eyebrow">Structure ' + (idx + 1) + ' of ' + all.length + (grp ? ' · ' + esc(grp) : '') + '</p><h1>' + esc(d.title) + '</h1>' +
      '<p class="lede">' + fmt(d.oneLiner) + '</p>' +
      (chips.length ? '<div class="chips">' + chips.map(function(x){ return '<span class="chip"><em>' + esc(x[0]) + '</em>' + bigO(x[1]) + '</span>'; }).join('') +
        (c.java ? '<span class="chip"><em>Java</em><code>' + esc(c.java) + '</code></span>' : '') + '</div>' : '') +
      (d.legend ? '<div class="legend">' + d.legend.map(function(l){ return '<span><i class="dot ' + l[0] + '"></i>' + esc(l[1]) + '</span>'; }).join('') + '</div>' : '') +
      (d.play ? '<div id="play"></div>' : '') + '</header>';

    var tocHtml = '<nav class="toc" aria-label="Sections"><p>On this page</p><ol>' + toc.map(function(t){
      if (t[0] === 'grp') return '<li class="grp">' + esc(t[1]) + '</li>';
      return '<li><a href="#' + t[0] + '">' + esc(t[1]) + '</a></li>';
    }).join('') + '</ol></nav>';

    var root = document.getElementById('app');
    root.innerHTML = hero + '<div class="wrap">' + tocHtml + '<main>' + secs.join('') + '</main></div>';

    if (d.play) Playground.mount(document.getElementById('play'), d.play);
    if (d.anatomy) Viz.renderPanels(root.querySelector('.anat-v'), d.anatomy.panels);
    if (d.demo) Viz.mountDemo(document.getElementById('dsdemo'), d.demo);

    var dbox = document.getElementById('drillBox');
    var fb = (d.drills && d.drills.fillBlank) || [], od = (d.drills && d.drills.order) || [];
    if (fb.length){ var h = document.createElement('h3'); h.textContent = 'Fill in the blanks'; dbox.appendChild(h); }
    fb.forEach(function(x){ var b = document.createElement('div'); dbox.appendChild(b); Drills.fillBlank(b, x, key); });
    if (od.length){ var h2 = document.createElement('h3'); h2.textContent = 'Idea to code: put the lines in order'; dbox.appendChild(h2); }
    od.forEach(function(x){ var b = document.createElement('div'); dbox.appendChild(b); Drills.order(b, x, key); });

    root.querySelectorAll('.plist input').forEach(function(cb){
      cb.addEventListener('change', function(){ Store.setSolved(key, cb.dataset.num, cb.checked); });
    });

    DSA.wireTabs(root);
    DSA.wireCopy(root);
    DSA.highlight(root);
    DSA.tocSpy();
    if (location.hash){ var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  };

  // Progress for one structure: drills passed + problems ticked.
  DSA.dsProgress = function(d){
    return Store.progress({ slug: DSA.dsKey(d), practice: { easy: d.problems || [], next: [] }, drills: d.drills || {} });
  };
})();
