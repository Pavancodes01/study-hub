// LLD app core: content registry, loader, progress store, page chrome, Java highlighting.
(function(){
  var LLD = {
    basics: [], patterns: [], designs: [],
    BASICS: ['oop-pillars', 'srp', 'ocp', 'lsp', 'isp', 'dip', 'composition', 'uml', 'concurrency'],
    PATTERNS: ['singleton', 'factory-method', 'abstract-factory', 'builder', 'prototype',
      'adapter', 'decorator', 'facade', 'proxy', 'composite',
      'strategy', 'observer', 'command', 'state', 'template-method', 'chain-of-responsibility'],
    DESIGNS: ['parking-lot', 'elevator', 'vending-machine', 'movie-booking', 'splitwise', 'chess',
      'lru-cache', 'logger', 'atm', 'library', 'snake-ladder', 'food-delivery'],
    READY: ['home', 'approach', 'practice'],
    VERSION: '1'
  };
  window.registerBasic = function(x){ x.type = 'basic'; LLD.basics.push(x); };
  window.registerPattern = function(x){ x.type = 'pattern'; LLD.patterns.push(x); };
  window.registerDesign = function(x){ x.type = 'design'; LLD.designs.push(x); };
  LLD.byOrder = function(list){ return list.slice().sort(function(a, b){ return a.order - b.order; }); };
  LLD.find = function(list, slug){ return list.filter(function(x){ return x.slug === slug; })[0]; };

  // Load content with plain script tags, one after another, so the site works from disk.
  LLD.boot = function(done, only){
    var sets = [['basics', LLD.BASICS], ['patterns', LLD.PATTERNS], ['designs', LLD.DESIGNS]];
    var files = [];
    sets.forEach(function(s){ if (!only || only.indexOf(s[0]) >= 0) s[1].forEach(function(f){ files.push('data/' + s[0] + '/' + f + '.js'); }); });
    var i = 0, http = location.protocol.indexOf('http') === 0;
    (function next(){
      if (i >= files.length){ done(); return; }
      var s = document.createElement('script');
      s.src = files[i++] + (http ? '?v=' + LLD.VERSION : '');
      s.onload = next;
      s.onerror = function(){ console.error('Missing content file: ' + s.src); next(); };
      document.head.appendChild(s);
    })();
  };

  LLD.param = function(n){ var m = new RegExp('[?&]' + n + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : null; };
  LLD.esc = function(s){ return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  // Inline format: `code`, **bold**, ==key phrase==
  LLD.fmt = function(s){
    return LLD.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/==([^=]+)==/g, '<strong>$1</strong>');
  };
  LLD.paras = function(list){ return (list || []).map(function(p){ return '<p>' + LLD.fmt(p) + '</p>'; }).join(''); };
  LLD.table = function(head, rows){
    return '<div class="tbl"><table><thead><tr>' + head.map(function(h){ return '<th>' + LLD.esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function(r){ return '<tr>' + r.map(function(c){ return '<td>' + LLD.fmt(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  };

  // Small Java highlighter: comments, strings, keywords, types, numbers, annotations.
  var KW = 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static super switch synchronized this throw throws transient try var void volatile while record sealed permits yield true false null'.split(' ');
  LLD.java = function(src){
    var out = '', i = 0, n = src.length;
    while (i < n){
      var c = src[i], rest = src.slice(i), m;
      if ((m = /^\/\/[^\n]*/.exec(rest)) || (m = /^\/\*[\s\S]*?\*\//.exec(rest))) { out += '<span class="tok-c">' + LLD.esc(m[0]) + '</span>'; i += m[0].length; continue; }
      if ((m = /^"(?:\\.|[^"\\])*"/.exec(rest)) || (m = /^'(?:\\.|[^'\\])'/.exec(rest))) { out += '<span class="tok-s">' + LLD.esc(m[0]) + '</span>'; i += m[0].length; continue; }
      if ((m = /^@[A-Za-z]+/.exec(rest))) { out += '<span class="tok-a">' + m[0] + '</span>'; i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
        var w = m[0];
        if (KW.indexOf(w) >= 0) out += '<span class="tok-k">' + w + '</span>';
        else if (/^[A-Z]/.test(w)) out += '<span class="tok-t">' + w + '</span>';
        else out += w;
        i += w.length; continue;
      }
      if ((m = /^[0-9][0-9_.]*[LlDdFf]?/.exec(rest))) { out += '<span class="tok-n">' + m[0] + '</span>'; i += m[0].length; continue; }
      out += LLD.esc(c); i++;
    }
    return out;
  };
  LLD.codeBlock = function(src){
    return '<div class="code"><button class="copy" type="button">Copy</button><pre><code>' + LLD.java(src.replace(/^\n+|\s+$/g, '')) + '</code></pre></div>';
  };
  LLD.wireCopy = function(root){
    (root || document).querySelectorAll('.code .copy').forEach(function(b){
      if (b.dataset.w) return; b.dataset.w = '1';
      b.addEventListener('click', function(){
        var t = b.parentNode.querySelector('code').textContent;
        function done(ok){ b.textContent = ok ? 'Copied' : 'Select to copy'; setTimeout(function(){ b.textContent = 'Copy'; }, 1400); }
        try { navigator.clipboard.writeText(t).then(function(){ done(true); }, function(){ done(false); }); } catch(e){ done(false); }
      });
    });
  };

  // ---------- progress ----------
  var PREFIX = 'lld:', mem = {};
  function ls(){ try { return window.localStorage; } catch(e){ return null; } }
  var Store = {
    get: function(k, d){ try { var s = ls(), v = s ? s.getItem(PREFIX + k) : mem[k]; return v === null || v === undefined ? d : JSON.parse(v); } catch(e){ return d; } },
    set: function(k, v){ var j = JSON.stringify(v); mem[k] = j; try { var s = ls(); if (s) s.setItem(PREFIX + k, j); } catch(e){} },
    del: function(k){ delete mem[k]; try { var s = ls(); if (s) s.removeItem(PREFIX + k); } catch(e){} },
    clearAll: function(){ mem = {}; try { var s = ls(); if (!s) return; var ks = []; for (var i = 0; i < s.length; i++){ var k = s.key(i); if (k && k.indexOf(PREFIX) === 0 && k !== PREFIX + 'theme') ks.push(k); } ks.forEach(function(k){ s.removeItem(k); }); } catch(e){} },
    isTicked: function(slug, i){ return !!Store.get('tick:' + slug + ':' + i, false); },
    setTicked: function(slug, i, on){ if (on) Store.set('tick:' + slug + ':' + i, true); else Store.del('tick:' + slug + ':' + i); },
    passed: function(slug, id){ return !!Store.get('drill:' + slug + ':' + id, false); },
    pass: function(slug, id){ Store.set('drill:' + slug + ':' + id, true); },
    drillsOf: function(p){ var d = p.drills || {}; return [].concat(d.mcq || [], d.order || [], d.code || [], d.classes ? [d.classes] : []); },
    progress: function(p){
      var dr = Store.drillsOf(p), ch = p.checklist || [];
      var a = dr.filter(function(d){ return Store.passed(p.slug, d.id); }).length;
      var b = ch.filter(function(_, i){ return Store.isTicked(p.slug, i); }).length;
      var t = dr.length + ch.length;
      return { pct: t ? Math.round(100 * (a + b) / t) : 0, passed: a, drills: dr.length };
    }
  };
  LLD.store = Store;

  // ---------- theme + top bar ----------
  function apply(t){ if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  function theme(){ var t = document.documentElement.getAttribute('data-theme'); if (t) return t; return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  apply(Store.get('theme', null));
  LLD.bar = function(active){
    var links = [['home', 'index.html', 'Overview'], ['approach', 'approach.html', 'Approach'], ['practice', 'practice.html', 'Drills']]
      .filter(function(l){ return LLD.READY.indexOf(l[0]) >= 0; });
    var h = document.createElement('header');
    h.className = 'top';
    h.innerHTML = '<div class="in"><a class="mark" href="index.html" aria-label="Object design home">' +
      '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="1.5" y="1.5" width="23" height="23" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="1.5" y1="9" x2="24.5" y2="9" stroke="currentColor" stroke-width="1.4"/><line x1="1.5" y1="16" x2="24.5" y2="16" stroke="currentColor" stroke-width="1.4"/><rect x="1.5" y="1.5" width="23" height="7.5" fill="var(--teal)" opacity=".35"/></svg>' +
      '<span>Object design</span></a><nav class="links" aria-label="Main">' +
      links.map(function(l){ return '<a href="' + l[1] + '"' + (l[0] === active ? ' aria-current="page"' : '') + '>' + l[2] + '</a>'; }).join('') +
      '</nav><button class="mode" type="button"></button></div>';
    document.body.insertBefore(h, document.body.firstChild);
    var b = h.querySelector('.mode');
    function lab(){ b.textContent = theme() === 'dark' ? 'Light theme' : 'Dark theme'; }
    lab();
    b.addEventListener('click', function(){ var t = theme() === 'dark' ? 'light' : 'dark'; apply(t); Store.set('theme', t); lab(); });
  };
  LLD.reduced = function(){ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };

  window.LLD = LLD;
})();
