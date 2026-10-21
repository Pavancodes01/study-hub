// Shared helpers: pattern registry, data loader, page chrome, code blocks, tabs, copy, highlight.
(function(){
  var DSA = {
    patterns: [],
    // Data files, in study order. Each one calls registerPattern({...}).
    FILES: [
      'two-pointers', 'sliding-window', 'prefix-sum', 'hashing', 'binary-search',
      'stack', 'linked-list', 'heap', 'intervals', 'trees', 'graphs',
      'backtracking', 'dp', 'greedy'
    ],
    structures: [],
    // Data structure files, in study order. Each one calls registerStructure({...}).
    DS_FILES: [
      'array', 'arraylist', 'string', 'linked-list', 'stack', 'queue-deque',
      'hashmap', 'hashset', 'linkedhashmap', 'heap', 'binary-tree', 'bst-treemap',
      'trie', 'graph', 'union-find', 'segment-tree', 'fenwick'
    ],
    // Groups shown on the structures index, in order.
    DS_GROUPS: [
      ['linear', 'Linear: items in a row'],
      ['hash', 'Hash based: find by key'],
      ['tree', 'Trees and heaps: items in a hierarchy'],
      ['adv', 'Graphs and range tools']
    ]
  };
  window.registerPattern = function(p){ DSA.patterns.push(p); };
  window.registerStructure = function(d){ DSA.structures.push(d); };
  DSA.sortedDS = function(){ return DSA.structures.slice().sort(function(a, b){ return a.order - b.order; }); };
  DSA.getDS = function(slug){ return DSA.structures.filter(function(d){ return d.slug === slug; })[0]; };
  DSA.dsFiles = function(base){ return DSA.DS_FILES.map(function(f){ return (base || '') + 'data/structures/' + f + '.js'; }); };
  // Store keys for structure drills and problems use this prefix so they never clash with pattern slugs.
  DSA.dsKey = function(d){ return 'ds-' + d.slug; };
  DSA.sorted = function(){ return DSA.patterns.slice().sort(function(a, b){ return a.order - b.order; }); };
  DSA.get = function(slug){ return DSA.patterns.filter(function(p){ return p.slug === slug; })[0]; };

  // Load data files one by one with script tags (works from file:// with no server).
  DSA.boot = function(base, extra, done){
    var list = DSA.FILES.map(function(f){ return base + 'data/patterns/' + f + '.js'; }).concat(extra || []);
    var i = 0;
    (function next(){
      if (i >= list.length) { done(); return; }
      var s = document.createElement('script');
      s.src = list[i++];
      s.onload = next;
      s.onerror = function(){ console.error('Could not load ' + s.src); next(); };
      document.head.appendChild(s);
    })();
  };

  DSA.param = function(name){
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  };

  DSA.esc = function(s){
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  // Tiny inline format: `code`, **bold**. Input is escaped first.
  DSA.fmt = function(s){
    return DSA.esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  };

  DSA.codeBlock = function(code, out){
    return '<div class="code"><button class="copy" type="button">Copy</button><pre><code class="language-java">' +
      DSA.esc(code.replace(/^\n+|\s+$/g, '')) + '</code></pre>' +
      (out !== undefined ? '<div class="out"><span>Output</span><pre>' + DSA.esc(String(out).replace(/^\n+|\s+$/g, '')) + '</pre></div>' : '') + '</div>';
  };

  DSA.wireTabs = function(root){
    (root || document).querySelectorAll('.tabs').forEach(function(t){
      if (t.dataset.wired) return;
      t.dataset.wired = '1';
      var btns = t.querySelectorAll(':scope > [role=tablist] > [role=tab]');
      var panels = t.querySelectorAll(':scope > .panel');
      btns.forEach(function(b, i){
        b.addEventListener('click', function(){
          btns.forEach(function(x, j){ x.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
          panels.forEach(function(p, j){ p.hidden = j !== i; });
        });
      });
    });
  };

  DSA.wireCopy = function(root){
    (root || document).querySelectorAll('.code').forEach(function(box){
      var b = box.querySelector('.copy');
      if (!b || b.dataset.wired) return;
      b.dataset.wired = '1';
      b.addEventListener('click', function(){
        var txt = box.querySelector('code').textContent;
        function done(ok){
          b.textContent = ok ? 'Copied' : 'Select to copy';
          setTimeout(function(){ b.textContent = 'Copy'; }, 1500);
        }
        function fallback(){
          var ok = false;
          try {
            var ta = document.createElement('textarea');
            ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            ok = document.execCommand('copy');
            ta.remove();
          } catch(e){}
          done(ok);
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(txt).then(function(){ done(true); }, fallback);
          } else fallback();
        } catch(e){ fallback(); }
      });
    });
  };

  DSA.highlight = function(root){
    try {
      if (window.Prism && Prism.highlightElement){
        (root || document).querySelectorAll('pre code.language-java').forEach(function(c){ Prism.highlightElement(c); });
      }
    } catch(e){}
  };

  // ---------- theme ----------
  function applyTheme(t){
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(window.Store ? Store.get('theme', null) : null);
  function currentTheme(){
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // ---------- top bar ----------
  DSA.topbar = function(active, base){
    base = base || '';
    var links = [['home', 'index.html', 'Patterns'], ['ds', 'structures.html', 'Structures'], ['practice', 'practice.html', 'Drills'], ['java', 'java.html', 'Java<span class="wide-only"> toolbox</span>']];
    var h = document.createElement('header');
    h.className = 'topbar';
    h.innerHTML = '<div class="in"><a class="brand" href="' + base + 'index.html">DSA <i>in</i> Java<span> · patterns</span></a>' +
      '<nav class="topnav" aria-label="Main">' + links.map(function(l){
        return '<a href="' + base + l[1] + '"' + (l[0] === active ? ' class="on" aria-current="page"' : '') + '>' + l[2] + '</a>';
      }).join('') + '</nav><button class="themebtn" type="button" aria-label="Toggle dark mode"></button></div>';
    document.body.insertBefore(h, document.body.firstChild);
    var tb = h.querySelector('.themebtn');
    function label(){ tb.textContent = currentTheme() === 'dark' ? 'Light' : 'Dark'; }
    label();
    tb.addEventListener('click', function(){
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      if (window.Store) Store.set('theme', next);
      label();
    });
  };

  // Highlight the TOC link of the section in view.
  DSA.tocSpy = function(){
    var links = document.querySelectorAll('nav.toc a');
    var map = {};
    links.forEach(function(a){ map[a.getAttribute('href').slice(1)] = a; });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        links.forEach(function(a){ a.classList.remove('active'); });
        var a = map[e.target.id];
        if (!a) return;
        a.classList.add('active');
        if (window.matchMedia('(max-width: 820px)').matches){
          try { var nv = document.querySelector('nav.toc'); nv.scrollTo({left: Math.max(0, a.offsetLeft - 30), behavior: 'smooth'}); } catch(err){}
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('section.sec').forEach(function(s){ io.observe(s); });
  };

  DSA.lcLink = function(num){ return 'https://leetcode.com/problemset/?search=' + encodeURIComponent(num); };

  window.DSA = DSA;
})();
