// HLD app core: content registry, loader, progress store, page chrome.
(function(){
  var HLD = {
    concepts: [], designs: [],
    // Content files in study order. Each calls registerConcept / registerDesign.
    CONCEPTS: ['scaling', 'load-balancing', 'caching', 'databases', 'replication', 'sharding', 'consistent-hashing', 'cap',
      'indexes', 'queues', 'async-outbox', 'rate-limiting', 'api-design', 'unique-ids', 'search', 'blob-storage',
      'observability', 'reliability', 'microservices', 'two-phase-commit', 'saga', 'cqrs', 'event-sourcing',
      'api-gateway', 'service-discovery', 'service-mesh', 'strangler-fig'],
    DESIGNS: ['url-shortener', 'rate-limiter', 'key-value-store', 'distributed-cache', 'notifications', 'news-feed', 'chat',
      'typeahead', 'web-crawler', 'video-streaming', 'ride-matching', 'ticket-booking'],
    // Pages built so far; the nav only links to these.
    READY: ['home', 'approach', 'estimate', 'practice'],
    // Bump when content changes so browsers do not reuse stale content files.
    VERSION: '3'
  };
  window.registerConcept = function(c){ c.type = 'concept'; HLD.concepts.push(c); };
  window.registerDesign = function(d){ d.type = 'design'; HLD.designs.push(d); };
  HLD.byOrder = function(list){ return list.slice().sort(function(a, b){ return a.order - b.order; }); };
  HLD.find = function(list, slug){ return list.filter(function(x){ return x.slug === slug; })[0]; };

  // Plain script tags, so the site works when opened straight from disk.
  // They download in parallel; async = false makes them run in study order.
  HLD.boot = function(done){
    var files = HLD.CONCEPTS.map(function(f){ return 'data/concepts/' + f + '.js'; })
      .concat(HLD.DESIGNS.map(function(f){ return 'data/designs/' + f + '.js'; }));
    var left = files.length, v = location.protocol.indexOf('http') === 0 ? '?v=' + HLD.VERSION : '';
    if (!left){ done(); return; }
    files.forEach(function(f){
      var s = document.createElement('script');
      s.src = f + v;
      s.async = false;
      s.onload = function(){ if (--left === 0) done(); };
      s.onerror = function(){ console.error('Missing content file: ' + s.src); if (--left === 0) done(); };
      document.head.appendChild(s);
    });
  };

  HLD.param = function(name){
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  };
  HLD.esc = function(s){
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  // Inline format for content strings: `code`, **bold**, ==highlight==.
  HLD.fmt = function(s){
    return HLD.esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/==([^=]+)==/g, '<em>$1</em>');
  };
  HLD.code = function(text){ return '<div class="code"><pre><code>' + HLD.esc(text.replace(/^\n+|\s+$/g, '')) + '</code></pre></div>'; };
  HLD.table = function(head, rows){
    return '<div class="tbl"><table><thead><tr>' + head.map(function(h){ return '<th>' + HLD.esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function(r){ return '<tr>' + r.map(function(c){ return '<td>' + HLD.fmt(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  };

  // ---------- progress store ----------
  var PREFIX = 'hld:', mem = {};
  function ls(){ try { return window.localStorage; } catch(e){ return null; } }
  var Store = {
    get: function(k, d){ try { var s = ls(), v = s ? s.getItem(PREFIX + k) : mem[k]; return v === null || v === undefined ? d : JSON.parse(v); } catch(e){ return d; } },
    set: function(k, v){ var j = JSON.stringify(v); mem[k] = j; try { var s = ls(); if (s) s.setItem(PREFIX + k, j); } catch(e){} },
    del: function(k){ delete mem[k]; try { var s = ls(); if (s) s.removeItem(PREFIX + k); } catch(e){} },
    clearAll: function(){
      mem = {};
      try { var s = ls(); if (!s) return; var ks = [];
        for (var i = 0; i < s.length; i++){ var k = s.key(i); if (k && k.indexOf(PREFIX) === 0 && k !== PREFIX + 'theme') ks.push(k); }
        ks.forEach(function(k){ s.removeItem(k); }); } catch(e){}
    },
    isChecked: function(slug, i){ return !!Store.get('check:' + slug + ':' + i, false); },
    setChecked: function(slug, i, on){ if (on) Store.set('check:' + slug + ':' + i, true); else Store.del('check:' + slug + ':' + i); },
    drillDone: function(slug, id){ return !!Store.get('drill:' + slug + ':' + id, false); },
    setDrill: function(slug, id){ Store.set('drill:' + slug + ':' + id, true); },
    drillsOf: function(p){ var d = p.drills || {}; return [].concat(d.mcq || [], d.order || [], d.fill || [], d.palette ? [d.palette] : []); },
    progress: function(p){
      var dr = Store.drillsOf(p), ch = p.checklist || [];
      var passed = dr.filter(function(d){ return Store.drillDone(p.slug, d.id); }).length;
      var ticked = ch.filter(function(_, i){ return Store.isChecked(p.slug, i); }).length;
      var total = dr.length + ch.length;
      return { passed: passed, drills: dr.length, ticked: ticked, checks: ch.length, pct: total ? Math.round(100 * (passed + ticked) / total) : 0 };
    }
  };
  HLD.store = Store;

  // ---------- theme ----------
  function applyTheme(t){ if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  function theme(){ var t = document.documentElement.getAttribute('data-theme'); if (t) return t; return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  applyTheme(Store.get('theme', null));

  // ---------- top bar ----------
  HLD.bar = function(active){
    var links = [['home', 'index.html', 'Board'], ['approach', 'approach.html', 'How to approach'], ['estimate', 'estimate.html', 'Estimation'], ['practice', 'practice.html', 'Drills']];
    links = [['hub', '../index.html', '\u2190 Home']].concat(links.filter(function(l){ return HLD.READY.indexOf(l[0]) >= 0; }));
    var h = document.createElement('header');
    h.className = 'bar';
    h.innerHTML = '<div class="in"><a class="logo" href="index.html">system <span>design</span></a><nav class="nav" aria-label="Main">' +
      links.map(function(l){ return '<a href="' + l[1] + '"' + (l[0] === active ? ' aria-current="page"' : '') + '>' + l[2] + '</a>'; }).join('') +
      '</nav><button class="theme" type="button"></button></div>';
    document.body.insertBefore(h, document.body.firstChild);
    var b = h.querySelector('.theme');
    function label(){ b.textContent = theme() === 'dark' ? 'Light board' : 'Dark board'; }
    label();
    b.addEventListener('click', function(){ var n = theme() === 'dark' ? 'light' : 'dark'; applyTheme(n); Store.set('theme', n); label(); document.dispatchEvent(new CustomEvent('hld:theme')); });
  };

  HLD.reducedMotion = function(){ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };

  window.HLD = HLD;
})();
