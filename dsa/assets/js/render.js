// Builds pattern.html from one pattern's data.
(function(){
  var esc = DSA.esc, fmt = DSA.fmt;

  function ddHtml(v){
    if (Array.isArray(v)) return '<ul>' + v.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>';
    return fmt(v);
  }

  function tabsHtml(tabs){
    if (!tabs || !tabs.length) return '';
    return '<div class="tabs"><div role="tablist">' + tabs.map(function(t, i){
      return '<button role="tab" type="button" aria-selected="' + (i === 0) + '">' + esc(t.name) + '</button>';
    }).join('') + '</div>' + tabs.map(function(t, i){
      return '<div class="panel"' + (i ? ' hidden' : '') + '>' + DSA.codeBlock(t.code) + (t.note ? '<p class="note">' + fmt(t.note) + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function table(head, rows){
    return '<div class="tbl"><table><thead><tr>' + head.map(function(h){ return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function(r){
        return '<tr>' + r.map(function(c){ return '<td>' + fmt(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function section(id, title, intro, body){
    return '<section class="sec" id="' + id + '"><h2>' + esc(title) + '</h2>' + (intro ? '<p class="intro">' + fmt(intro) + '</p>' : '') + body + '</section>';
  }

  window.renderPattern = function(p, all){
    document.title = p.title + ' in Java · DSA patterns';
    var idx = all.indexOf(p);
    var prev = all[idx - 1], next = all[idx + 1];
    var toc = [];
    var secs = [];

    // When to use
    toc.push(['when', 'When to use']);
    secs.push(section('when', 'When to use it', 'Spot these clues in the problem statement.',
      '<ul class="clues">' + p.clues.map(function(c){ return '<li>' + fmt(c) + '</li>'; }).join('') + '</ul>' +
      '<h3>The picture in your head</h3><div class="idea">' + p.idea.map(function(s){ return '<p>' + fmt(s) + '</p>'; }).join('') + '</div>' +
      (p.pick ? '<h3>Which version?</h3>' + table(['If the problem says…', 'Use', 'Start with'], p.pick) : '')));

    // Idea to code
    var fq = p.fourQuestions;
    toc.push(['idea', 'Idea to code']);
    secs.push(section('idea', 'Idea to code', 'Stuck between "I know how" and "I can write it"? Answer these in order. Each answer becomes one or two lines.',
      '<ol class="steps">' + fq.map(function(q){ return '<li><b>' + esc(q[0]) + '</b><span>' + fmt(q[1]) + '</span></li>'; }).join('') + '</ol>'));

    // Variants
    toc.push(['grp', 'Templates']);
    p.variants.forEach(function(v){
      toc.push([v.id, v.short || v.name]);
      secs.push('<section class="sec" id="' + v.id + '"><h2>' + esc(v.name) + '</h2><p class="intro">' + fmt(v.intro) + '</p>' +
        (v.start ? '<div class="start">' + esc(v.start) + '</div>' : '') +
        '<div class="vstrips" data-v="' + v.id + '"></div>' +
        '<div class="pat"><dl class="rules">' + v.rules.map(function(r){ return '<dt>' + esc(r[0]) + '</dt><dd>' + ddHtml(r[1]) + '</dd>'; }).join('') +
        (v.probs ? '<dd class="probs"><b>Practice:</b> ' + fmt(v.probs) + '</dd>' : '') + '</dl>' + tabsHtml(v.tabs) + '</div></section>');
    });

    // Reference
    toc.push(['grp', 'Reference']);
    toc.push(['java', 'Java you need']);
    secs.push(section('java', 'Java you need', 'The exact methods and syntax this pattern uses. If one looks unfamiliar, practice it in the Java toolbox quiz.',
      '<div class="jgrid">' + p.javaUsed.map(function(j){
        return '<div class="jcard"><code>' + esc(j[0]) + '</code><p>' + fmt(j[1]) + '</p>' + (j[2] ? '<p class="why">' + fmt(j[2]) + '</p>' : '') + '</div>';
      }).join('') + '</div>'));

    if (p.concepts && p.concepts.length){
      toc.push(['concepts', 'Concepts']);
      secs.push(section('concepts', 'Concepts behind the code', 'The Java and algorithm ideas that make the template work.',
        '<div class="concepts">' + p.concepts.map(function(c){
          return '<div class="concept"><b>' + esc(c.name) + '</b><p>' + fmt(c.text) + '</p>' + (c.code ? DSA.codeBlock(c.code) : '') + '</div>';
        }).join('') + '</div>'));
    }

    if (p.loops && p.loops.length){
      toc.push(['loops', 'Loop conditions']);
      secs.push(section('loops', 'Loop conditions', p.loopsIntro || 'Most off-by-one bugs live in the loop condition.', table(['Condition', 'Meaning', 'Used in'], p.loops)));
    }
    if (p.moves && p.moves.length){
      toc.push(['moves', p.movesTitle || 'Key moves']);
      secs.push(section('moves', p.movesTitle || 'Key moves', p.movesIntro || 'The lines you write again and again.', table(['Code', 'What it does', 'When'], p.moves)));
    }

    toc.push(['bugs', 'Common bugs']);
    secs.push(section('bugs', 'Common bugs', 'Check these before you hit Submit.',
      '<div class="bugs">' + p.bugs.map(function(b){
        return '<div class="bug"><b>' + esc(b[0]) + '</b><p>' + fmt(b[1]) + '</p>' + (b[2] ? '<p>Fix: ' + fmt(b[2]) + '</p>' : '') + '</div>';
      }).join('') + '</div>'));

    toc.push(['grp', 'Practice']);
    toc.push(['drills', 'Code drills']);
    secs.push(section('drills', 'Code drills', 'Fill the blanks, then build full solutions from a plain-English idea. This is the "I know it but can\'t write it" gym. Progress saves in this browser.',
      '<div id="drillBox"></div>'));

    toc.push(['practice', 'Problems']);
    function plist(arr){
      return '<ul class="plist">' + arr.map(function(x){
        var id = 'pb-' + p.slug + '-' + x[0];
        return '<li><label for="' + id + '"><input type="checkbox" id="' + id + '" data-num="' + esc(x[0]) + '"' + (Store.isSolved(p.slug, x[0]) ? ' checked' : '') + '>' +
          '<span class="num">' + esc(x[0]) + '</span><span>' + esc(x[1]) + '</span>' +
          '<a class="lc" href="' + DSA.lcLink(x[0]) + '" target="_blank" rel="noopener">LeetCode ↗</a></label></li>';
      }).join('') + '</ul>';
    }
    secs.push(section('practice', 'Problems to solve', 'Do them in order. Solve each once, then again the next day without looking. The second solve builds the muscle memory. Tick a box when you solve it on your own.',
      '<div class="pcols"><div><h3>Start here</h3>' + plist(p.practice.easy) + '</div><div><h3>Then try</h3>' + plist(p.practice.next) + '</div></div>' +
      '<div class="pager">' + (prev ? '<a class="btn" href="pattern.html?p=' + prev.slug + '">← ' + esc(prev.title) + '</a>' : '<span></span>') +
      (next ? '<a class="btn primary" href="pattern.html?p=' + next.slug + '">' + esc(next.title) + ' →</a>' : '<a class="btn primary" href="practice.html">Mixed drills →</a>') + '</div>'));

    // Hero
    var hero = '<header class="hero"><p class="eyebrow">Pattern ' + (idx + 1) + ' of ' + all.length + '</p><h1>' + esc(p.title) + '</h1>' +
      '<p class="lede">' + fmt(p.oneLiner) + '</p>' +
      (p.legend ? '<div class="legend">' + p.legend.map(function(l){ return '<span><i class="dot ' + l[0] + '"></i>' + esc(l[1]) + '</span>'; }).join('') + '</div>' : '') +
      (p.demo ? '<div id="demo"></div>' : '') + '</header>';

    var tocHtml = '<nav class="toc" aria-label="Sections"><p>On this page</p><ol>' + toc.map(function(t){
      if (t[0] === 'grp') return '<li class="grp">' + esc(t[1]) + '</li>';
      return '<li><a href="#' + t[0] + '">' + esc(t[1]) + '</a></li>';
    }).join('') + '</ol></nav>';

    var root = document.getElementById('app');
    root.innerHTML = hero + '<div class="wrap">' + tocHtml + '<main>' + secs.join('') + '</main></div>';

    // Static strips per variant
    p.variants.forEach(function(v){
      var host = root.querySelector('.vstrips[data-v="' + v.id + '"]');
      if (host && v.panels) Viz.renderPanels(host, v.panels);
    });
    if (p.demo) Viz.mountDemo(document.getElementById('demo'), p.demo);

    // Drills
    var dbox = document.getElementById('drillBox');
    var fb = (p.drills && p.drills.fillBlank) || [], od = (p.drills && p.drills.order) || [];
    if (fb.length){ var h = document.createElement('h3'); h.textContent = 'Fill in the blanks'; dbox.appendChild(h); }
    fb.forEach(function(d){ var b = document.createElement('div'); dbox.appendChild(b); Drills.fillBlank(b, d, p.slug); });
    if (od.length){ var h2 = document.createElement('h3'); h2.textContent = 'Idea to code: put the lines in order'; dbox.appendChild(h2); }
    od.forEach(function(d){ var b = document.createElement('div'); dbox.appendChild(b); Drills.order(b, d, p.slug); });

    root.querySelectorAll('.plist input').forEach(function(cb){
      cb.addEventListener('change', function(){ Store.setSolved(p.slug, cb.dataset.num, cb.checked); });
    });

    DSA.wireTabs(root);
    DSA.wireCopy(root);
    DSA.highlight(root);
    DSA.tocSpy();
    if (location.hash){ var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  };
})();
