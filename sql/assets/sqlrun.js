/* Live SQL in the browser: sql.js (SQLite compiled to WebAssembly) from cdnjs, loaded on first use. */
(function () {
  'use strict';
  var S = window.SDD;
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/';
  var ready = null;

  S.sqlReady = function () {
    if (ready) return ready;
    ready = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = CDN + 'sql-wasm.js';
      s.onload = function () {
        window.initSqlJs({ locateFile: function (f) { return CDN + f; } }).then(resolve, reject);
      };
      s.onerror = function () { reject(new Error('Could not load the SQL engine. Check your internet connection.')); };
      document.head.appendChild(s);
    });
    ready.catch(function () { ready = null; });
    return ready;
  };

  /* Run SQL on a fresh copy of the sample data. Resolves { cols, rows } of the last result set. */
  S.runSql = function (sql) {
    return S.sqlReady().then(function (SQL) {
      var db = new SQL.Database();
      try {
        db.exec(window.SDD_DATA.seed());
        var res = db.exec(sql);
        var last = res[res.length - 1];
        return last ? { cols: last.columns, rows: last.values } : { cols: [], rows: [] };
      } finally {
        db.close();
      }
    });
  };

  function norm(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return 'n' + (Math.round(v * 1e6) / 1e6);
    var t = String(v).trim();
    if (/^-?\d+(\.\d+)?$/.test(t)) return 'n' + (Math.round(parseFloat(t) * 1e6) / 1e6);
    if (/^null$/i.test(t)) return 'NULL';
    return 's' + t;
  }
  S.normRow = function (r) { return r.map(norm).join('\u0001'); };
  S.sameRows = function (a, b, ordered) {
    if (a.length !== b.length) return false;
    var x = a.map(S.normRow), y = b.map(S.normRow);
    if (!ordered) { x.sort(); y.sort(); }
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  };
  /* Parse what a learner typed: one row per line, values split by comma, tab or |. */
  S.parseTyped = function (text) {
    return text.replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      return l.replace(/^\||\|$/g, '').split(/\s*[,|\t]\s*/).map(function (v) { return v.trim().replace(/^'(.*)'$/, '$1'); });
    });
  };
})();
