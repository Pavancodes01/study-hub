(function () {
  const IX = [[null, 4], ['Berlin', 2], ['Berlin', 6], ['Lisbon', 1], ['Lisbon', 3], ['Paris', 5]];
  const EX = [[null, 50, 8], [1, 95, 2], [1, 95, 3], [1, 120, 1], [2, 60, 5], [2, 70, 6], [2, 80, 4], [3, 55, 7]];

  registerLesson({
    slug: 'indexes',
    track: 'perf',
    title: 'Indexes and B-trees',
    one: 'An index is a *sorted copy* of some columns plus a pointer to each row. Sorted means the database can *jump* to a value instead of reading every row.',
    tables: ['customers', 'employees', 'orders', 'products'],
    idea: [
      'Without an index, `WHERE city = \'Lisbon\'` must read every row (a **full scan**). With an index on `city`, the database keeps the city values in sorted order with each row\'s id, so it can binary-search to "Lisbon", read the matching entries, and fetch just those rows.',
      'Real indexes are **B-trees**: wide, shallow trees of sorted pages. Even with billions of rows a lookup touches only 3–4 pages, and because the leaves are sorted and linked, range scans (`BETWEEN`, `>`, `ORDER BY`) are cheap too.',
      'Indexes are not free: each one takes space and must be updated on every INSERT, UPDATE and DELETE. Index the columns you search, join and sort by, not everything.'
    ],
    stages: [
      {
        title: 'Seek instead of scan',
        chips: ['table', 'index', 'seek', 'fetch rows'],
        sql: `CREATE INDEX idx_customers_city ON customers(city);
SELECT name FROM customers WHERE city = 'Lisbon';`,
        steps: [
          { clause: 'table', hl: 'customers', label: 'customers (stored in id order)', text: 'The table is stored by row id. Lisbon customers are scattered: finding them without help means reading all six rows.',
            cols: ['id', 'name', 'city'], rows: [[1, 'Ana', 'Lisbon'], [2, 'Ben', 'Berlin'], [3, 'Cara', 'Lisbon'], [4, 'Dev', null], [5, 'Eli', 'Paris'], [6, 'Fay', 'Berlin']], q: 'SELECT id, name, city FROM customers' },
          { clause: 'index', hl: 'CREATE INDEX idx_customers_city ON customers(city);', label: 'idx_customers_city (leaf entries)', text: 'The index stores (city, row id) pairs **sorted by city**. Equal cities sit next to each other.',
            cols: ['city', 'row id'], rows: IX, q: 'SELECT city, id FROM customers ORDER BY city, id' },
          { clause: 'seek', hl: "WHERE city = 'Lisbon'", label: 'idx_customers_city', text: 'Binary search (walking down the B-tree) lands on the first "Lisbon" entry; reading forward stops at "Paris". Only two entries are touched.', m: '   hh' },
          { clause: 'fetch rows', hl: 'SELECT name FROM customers', label: 'result', text: 'The row ids 1 and 3 point straight to the rows, which supply `name`.', cols: ['name'], rows: [['Ana'], ['Cara']], m: '' }
        ]
      },
      {
        title: 'Composite index: leftmost prefix',
        chips: ['index', 'seek', 'fetch rows'],
        sql: `CREATE INDEX idx_emp_dept_salary ON employees(dept_id, salary);
SELECT name FROM employees WHERE dept_id = 2 AND salary > 60;`,
        steps: [
          { clause: 'index', hl: 'CREATE INDEX idx_emp_dept_salary ON employees(dept_id, salary);', label: 'idx_emp_dept_salary', text: 'Entries are sorted by `dept_id` first, then by `salary` **within** each department, like a phone book sorted by surname, then first name.',
            cols: ['dept_id', 'salary', 'row id'], rows: EX, g: [0, 1, 1, 1, 2, 2, 2, 3], q: 'SELECT dept_id, salary, id FROM employees ORDER BY dept_id, salary, id' },
          { clause: 'seek', hl: 'WHERE dept_id = 2 AND salary > 60', label: 'idx_emp_dept_salary', text: 'Jump to department 2, then to salary > 60 inside it: one contiguous range. A query on `salary` alone could not seek: salaries over 60 are spread across every department\'s block.', m: '     hh' },
          { clause: 'fetch rows', hl: 'SELECT name FROM employees', label: 'result', text: 'Rows 6 and 4: Rosa and Pia.', cols: ['name'], rows: [['Rosa'], ['Pia']], m: '', g: null }
        ]
      }
    ],
    sections: [
      {
        name: 'What a composite index can serve',
        text: [
          'An index on `(a, b, c)` helps conditions on `a`, on `a, b`, and on `a, b, c`: a **leftmost prefix**. It does not help `b` or `c` alone. Put equality columns first and the range column last.',
          [
            '`WHERE a = ?` ✔',
            '`WHERE a = ? AND b > ?` ✔',
            '`WHERE a = ? ORDER BY b` ✔ (no sort needed)',
            '`WHERE b = ?` ✘ (needs its own index)'
          ]
        ]
      },
      {
        name: 'Covering indexes',
        text: [
          'If an index contains **every** column the query needs, the database answers from the index alone and never visits the table. An index on `(city, name)` covers `SELECT name FROM customers WHERE city = ?`.'
        ]
      },
      {
        name: 'Unique indexes',
        text: ['A UNIQUE index both speeds up lookups and enforces uniqueness; primary keys and UNIQUE constraints create one automatically.'],
        sql: `CREATE UNIQUE INDEX ux_products_name ON products(name);
INSERT OR IGNORE INTO products (id, name, category, price) VALUES (9, 'Pen', 'office', 1);
SELECT COUNT(*) AS n FROM products;`,
        out: { cols: ['n'], rows: [[6]] }
      }
    ],
    table: {
      head: ['Good index candidates', 'Poor candidates'],
      rows: [
        ['foreign keys used in joins', 'columns never filtered or sorted on'],
        ['selective WHERE columns (email, order_date)', 'low-selectivity flags (is_active) on their own'],
        ['ORDER BY / GROUP BY columns', 'small tables (a scan is cheap)'],
        ['columns of frequent range queries', 'write-heavy tables with rare reads']
      ]
    },
    pitfalls: [
      ['Wrong column order in a composite index', 'An index on (salary, dept_id) cannot seek on dept_id alone.'],
      ['Indexing everything', 'Every index slows writes and uses space.'],
      ['Functions on the indexed column', '`WHERE lower(email) = ?` cannot use an index on `email` (see the next lesson).'],
      ['Leading wildcard', "`LIKE '%son'` cannot use the sort order."]
    ],
    interview: [
      ['How does a B-tree index work?', ['It keeps keys sorted in a balanced tree of pages. Internal pages route by key ranges; leaf pages hold the keys with row pointers and are linked for range scans. Lookups are O(log n) with a very high fan-out, so only a few page reads.']],
      ['What is a composite index and the leftmost prefix rule?', ['An index on several columns sorted by the first, then the second within it, etc. It can be used for conditions on any leftmost prefix of its columns, but not for later columns alone.']],
      ['What is a covering index?', ['An index containing all columns a query needs, so the query is answered from the index without reading the table rows.']],
      ['Why not index every column?', ['Each index costs storage and makes inserts, updates and deletes slower, and the optimiser can only use a few per table access anyway.']]
    ],
    say: [
      'An index is a sorted copy of columns plus row pointers: seek instead of scan.',
      'Composite indexes work on their leftmost prefix.',
      'Indexes speed reads and slow writes.'
    ],
    checklist: [
      'Explain seek vs scan with a phone book.',
      'Choose column order for a composite index.',
      'Name what a covering index is.',
      'List good and bad index candidates.'
    ],
    drills: {
      predict: [
        {
          sql: `CREATE INDEX i ON products(price);
SELECT name FROM products
WHERE price BETWEEN 5 AND 30
ORDER BY price;`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Notebook'], ['Mug'], ['Kettle'], ['Lamp']] },
          why: 'An index changes speed, never results.'
        },
        {
          sql: `CREATE INDEX i1 ON orders(customer_id);
CREATE INDEX i2 ON orders(status, order_date);
SELECT COUNT(*) AS n FROM sqlite_master
WHERE type = 'index' AND tbl_name = 'orders';`,
          tables: ['orders'],
          answer: { cols: ['n'], rows: [[2]] },
          why: 'Two indexes were created; the INTEGER PRIMARY KEY uses the row id and needs no separate index.'
        },
        {
          sql: `SELECT city, id
FROM customers
ORDER BY city, id
LIMIT 3;`,
          tables: ['customers'],
          answer: { cols: ['city', 'id'], rows: [[null, 4], ['Berlin', 2], ['Berlin', 6]] },
          why: 'This is the order in which an index on city stores its first entries (NULL first in SQLite).'
        },
        {
          sql: `CREATE INDEX i ON employees(dept_id, salary);
SELECT name FROM employees
WHERE dept_id = 1
ORDER BY salary DESC
LIMIT 1;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Mia']] },
          why: 'The index can read department 1\'s entries backwards and stop at the first.'
        }
      ],
      fill: [
        {
          q: 'Index orders by customer.',
          sql: `CREATE [[INDEX]] idx_orders_customer [[ON]] orders(customer_id);
SELECT COUNT(*) AS n FROM orders WHERE customer_id = 2;`,
          tables: ['orders'],
          answer: { cols: ['n'], rows: [[2]] },
          why: 'CREATE INDEX name ON table(columns).'
        },
        {
          q: 'Make product names unique.',
          sql: `CREATE [[UNIQUE]] INDEX ux_name ON products(name);
INSERT OR IGNORE INTO products (id, name) VALUES (9, 'Pen');
SELECT COUNT(*) AS n FROM products;`,
          tables: ['products'],
          answer: { cols: ['n'], rows: [[6]] },
          why: 'The duplicate "Pen" is rejected (and ignored).'
        }
      ],
      write: [
        {
          task: 'Create an index that supports searching orders by status and then date, then select the ids of shipped orders placed in June 2024.',
          tables: ['orders'],
          solution: `CREATE INDEX idx_orders_status_date ON orders(status, order_date);
SELECT id FROM orders
WHERE status = 'shipped' AND order_date >= '2024-06-01' AND order_date < '2024-07-01';`,
          why: 'Equality column first, range column second.'
        },
        {
          task: 'Create an index on employees(manager_id), then list the names of Pia\'s direct reports (Pia\'s id is 4).',
          tables: ['employees'],
          solution: `CREATE INDEX idx_emp_manager ON employees(manager_id);
SELECT name FROM employees WHERE manager_id = 4;`,
          why: 'Self-referencing foreign keys deserve an index too.'
        }
      ]
    }
  });
})();
