// Progress storage. Every access is wrapped: the app must work when storage is blocked.
(function(){
  var PREFIX = 'dsa-java:';
  var mem = {};
  function raw(){ try { return window.localStorage; } catch(e){ return null; } }
  var Store = {
    get: function(k, def){
      var ls = raw();
      try {
        var v = ls ? ls.getItem(PREFIX + k) : mem[k];
        if (v === null || v === undefined) return def;
        return JSON.parse(v);
      } catch(e){ return def; }
    },
    set: function(k, v){
      var s = JSON.stringify(v);
      mem[k] = s;
      var ls = raw();
      try { if (ls) ls.setItem(PREFIX + k, s); } catch(e){}
    },
    del: function(k){
      delete mem[k];
      var ls = raw();
      try { if (ls) ls.removeItem(PREFIX + k); } catch(e){}
    },
    clearAll: function(){
      mem = {};
      var ls = raw();
      try {
        if (!ls) return;
        var ks = [];
        for (var i = 0; i < ls.length; i++){ var k = ls.key(i); if (k && k.indexOf(PREFIX) === 0 && k !== PREFIX + 'theme') ks.push(k); }
        ks.forEach(function(k){ ls.removeItem(k); });
      } catch(e){}
    },

    isSolved: function(slug, num){ return !!Store.get('solved:' + slug + ':' + num, false); },
    setSolved: function(slug, num, on){ if (on) Store.set('solved:' + slug + ':' + num, true); else Store.del('solved:' + slug + ':' + num); },
    drillDone: function(slug, id){ return !!Store.get('drill:' + slug + ':' + id, false); },
    setDrill: function(slug, id){ Store.set('drill:' + slug + ':' + id, true); },
    quiz: function(id){ return Store.get('quiz:' + id, {seen:0, ok:0}); },
    setQuiz: function(id, ok){
      var q = Store.quiz(id);
      q.seen++; if (ok) q.ok++;
      q.last = ok;
      Store.set('quiz:' + id, q);
    },

    // Summary for one pattern: solved problems and passed drills.
    progress: function(p){
      var probs = [].concat((p.practice && p.practice.easy) || [], (p.practice && p.practice.next) || []);
      var drills = [].concat((p.drills && p.drills.fillBlank) || [], (p.drills && p.drills.order) || []);
      var solved = probs.filter(function(x){ return Store.isSolved(p.slug, x[0]); }).length;
      var passed = drills.filter(function(d){ return Store.drillDone(p.slug, d.id); }).length;
      var total = probs.length + drills.length;
      return { solved: solved, probs: probs.length, passed: passed, drills: drills.length, pct: total ? Math.round(100 * (solved + passed) / total) : 0 };
    }
  };
  window.Store = Store;
})();
