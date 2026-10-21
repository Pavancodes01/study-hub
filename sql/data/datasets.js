/* Sample data shared by every lesson. Each table: columns with types, and rows.
   The same data seeds the in-browser database and the offline checker. */
(function (root) {
  var T = {};
  function table(name, cols, rows, extra) { T[name] = { name: name, cols: cols, rows: rows, extra: extra || '' }; }

  table('customers', ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'city TEXT', 'joined TEXT'], [
    [1, 'Ana', 'Lisbon', '2024-01-05'],
    [2, 'Ben', 'Berlin', '2024-02-11'],
    [3, 'Cara', 'Lisbon', '2024-03-02'],
    [4, 'Dev', null, '2024-03-20'],
    [5, 'Eli', 'Paris', '2024-04-15'],
    [6, 'Fay', 'Berlin', '2024-05-01']
  ]);
  table('products', ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'category TEXT', 'price REAL'], [
    [1, 'Pen', 'office', 2.5],
    [2, 'Notebook', 'office', 6],
    [3, 'Mug', 'kitchen', 9],
    [4, 'Lamp', 'home', 30],
    [5, 'Kettle', 'kitchen', 25],
    [6, 'Desk', 'home', 150]
  ]);
  table('orders', ['id INTEGER PRIMARY KEY', 'customer_id INTEGER REFERENCES customers(id)', 'order_date TEXT', 'status TEXT', 'total REAL'], [
    [101, 1, '2024-06-01', 'shipped', 11],
    [102, 1, '2024-06-15', 'shipped', 30],
    [103, 2, '2024-06-03', 'cancelled', 9],
    [104, 3, '2024-06-20', 'shipped', 55],
    [105, 3, '2024-07-02', 'pending', null],
    [106, 5, '2024-07-05', 'shipped', 6],
    [107, 2, '2024-07-09', 'shipped', 25]
  ]);
  table('order_items', ['order_id INTEGER REFERENCES orders(id)', 'product_id INTEGER REFERENCES products(id)', 'qty INTEGER'], [
    [101, 1, 2], [101, 2, 1], [102, 4, 1], [103, 3, 1], [104, 5, 1], [104, 4, 1], [105, 3, 2], [106, 2, 1], [107, 5, 1]
  ]);
  table('departments', ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'budget INTEGER'], [
    [1, 'Engineering', 500], [2, 'Sales', 300], [3, 'Support', 150], [4, 'Legal', 100]
  ]);
  table('employees', ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'dept_id INTEGER REFERENCES departments(id)', 'manager_id INTEGER REFERENCES employees(id)', 'salary INTEGER', 'hired TEXT'], [
    [1, 'Mia', 1, null, 120, '2019-03-01'],
    [2, 'Noah', 1, 1, 95, '2020-07-15'],
    [3, 'Omar', 1, 1, 95, '2021-01-10'],
    [4, 'Pia', 2, 1, 80, '2020-02-01'],
    [5, 'Quinn', 2, 4, 60, '2022-05-20'],
    [6, 'Rosa', 2, 4, 70, '2023-03-03'],
    [7, 'Sam', 3, 1, 55, '2021-09-09'],
    [8, 'Tara', null, 1, 50, '2024-01-15']
  ]);
  table('students', ['id INTEGER PRIMARY KEY', 'name TEXT NOT NULL', 'year INTEGER'], [
    [1, 'Ivy', 1], [2, 'Jon', 2], [3, 'Kai', 1], [4, 'Lea', 3]
  ]);
  table('courses', ['id INTEGER PRIMARY KEY', 'title TEXT NOT NULL', 'credits INTEGER'], [
    [1, 'SQL', 4], [2, 'Java', 4], [3, 'Stats', 3]
  ]);
  table('enrollments', ['student_id INTEGER REFERENCES students(id)', 'course_id INTEGER REFERENCES courses(id)', 'grade INTEGER'], [
    [1, 1, 90], [1, 2, 85], [2, 1, 72], [3, 3, null], [4, 1, 88], [4, 3, 95]
  ], 'PRIMARY KEY (student_id, course_id)');
  table('logins', ['user_id INTEGER', 'day TEXT'], [
    [1, '2024-03-01'], [1, '2024-03-02'], [1, '2024-03-03'], [1, '2024-03-05'], [1, '2024-03-06'],
    [2, '2024-03-01'], [2, '2024-03-03'], [2, '2024-03-04'],
    [3, '2024-03-02']
  ]);
  table('sales', ['day TEXT', 'region TEXT', 'amount INTEGER'], [
    ['2024-01-01', 'north', 100], ['2024-01-02', 'north', 150], ['2024-01-03', 'north', 120], ['2024-01-04', 'north', 180],
    ['2024-01-01', 'south', 80], ['2024-01-02', 'south', 60], ['2024-01-03', 'south', 90], ['2024-01-04', 'south', 90]
  ]);

  function lit(v) {
    if (v === null) return 'NULL';
    if (typeof v === 'number') return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }
  function seed() {
    var out = [];
    Object.keys(T).forEach(function (k) {
      var t = T[k];
      out.push('CREATE TABLE ' + t.name + ' (' + t.cols.concat(t.extra ? [t.extra] : []).join(', ') + ');');
      t.rows.forEach(function (r) { out.push('INSERT INTO ' + t.name + ' VALUES (' + r.map(lit).join(', ') + ');'); });
    });
    return out.join('\n');
  }
  root.SDD_DATA = { tables: T, seed: seed, colNames: function (t) { return T[t].cols.map(function (c) { return c.split(' ')[0]; }); } };
})(typeof window !== 'undefined' ? window : globalThis);
