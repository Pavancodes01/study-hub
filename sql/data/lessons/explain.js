(function () {
  registerLesson({
    slug: 'explain',
    track: 'perf',
    title: 'Reading query plans and sargable queries',
    one: '`EXPLAIN QUERY PLAN` shows *how* the database will run a query. SCAN means read everything; SEARCH means jump through an index.',
    tables: ['orders', 'employees', 'customers', 'products'],
    idea: [
      'The optimiser chooses a plan: which index to use, in which order to join, whether to sort. Prefix a query with `EXPLAIN QUERY PLAN` (SQLite), `EXPLAIN` (MySQL) or `EXPLAIN ANALYZE` (PostgreSQL, which also runs it) to see that plan.',
      'The key words: **SCAN** (read every row), **SEARCH ... USING INDEX** (seek), **COVERING INDEX** (no table access needed), **USE TEMP B-TREE** (an extra sort).',
      'An index helps only if the condition is **sargable** (Search ARGument ABLE): the bare indexed column compared with a value. Wrapping the column in a function or arithmetic hides it from the index.'
    ],
    stages: [
      {
        title: 'Adding an index changes the plan',
        chips: ['without index', 'with index'],
        sql: `CREATE INDEX idx_orders_customer ON orders(customer_id);
EXPLAIN QUERY PLAN
SELECT id, total FROM orders WHERE customer_id = 3;`,
        steps: [
          { clause: 'without index', hl: 'SELECT id, total FROM orders WHERE customer_id = 3;', label: 'plan', text: 'Before the index exists, the only way is to read the whole table and test every row.',
            cols: ['detail'], rows: [['SCAN orders']], q: 'EXPLAIN QUERY PLAN SELECT id, total FROM orders WHERE customer_id = 3' },
          { clause: 'with index', hl: 'CREATE INDEX idx_orders_customer ON orders(customer_id);', label: 'plan', text: 'With the index, SQLite **searches** it for `customer_id = ?` and fetches only matching rows.',
            rows: [['SEARCH orders USING INDEX idx_orders_customer (customer_id=?)']], m: 'h' }
        ]
      },
      {
        title: 'Same question, sargable or not',
        chips: ['function on column', 'range on column'],
        sql: `CREATE INDEX idx_emp_hired ON employees(hired);
EXPLAIN QUERY PLAN
SELECT name FROM employees
WHERE hired >= '2021-01-01' AND hired < '2022-01-01';`,
        steps: [
          { clause: 'function on column', hl: "WHERE hired >= '2021-01-01' AND hired < '2022-01-01'", label: "plan for WHERE substr(hired, 1, 4) = '2021'", text: 'Asking "year of hired = 2021" via `substr(hired, 1, 4)` gives the same rows, but the index is sorted by `hired`, not by `substr(hired...)`, so SQLite must scan.',
            cols: ['detail'], rows: [['SCAN employees']], q: "CREATE INDEX idx_emp_hired ON employees(hired); EXPLAIN QUERY PLAN SELECT name FROM employees WHERE substr(hired, 1, 4) = '2021'" },
          { clause: 'range on column', hl: "hired >= '2021-01-01' AND hired < '2022-01-01'", label: 'plan', text: 'Rewritten as a range on the bare column, the index can seek to 2021-01-01 and stop before 2022.',
            rows: [['SEARCH employees USING INDEX idx_emp_hired (hired>? AND hired<?)']], m: 'h' }
        ]
      }
    ],
    sections: [
      {
        name: 'Covering index',
        text: ['The index holds both the filter column and the selected column, so the table is never touched.'],
        sql: `CREATE INDEX idx_city_name ON customers(city, name);
EXPLAIN QUERY PLAN
SELECT name FROM customers WHERE city = 'Lisbon';`,
        out: { cols: ['detail'], rows: [['SEARCH customers USING COVERING INDEX idx_city_name (city=?)']] }
      },
      {
        name: 'An extra sort',
        text: ['Ordering by a column without a suitable index needs a temporary sort structure.'],
        sql: `EXPLAIN QUERY PLAN
SELECT name FROM customers ORDER BY joined;`,
        out: { cols: ['detail'], rows: [['SCAN customers'], ['USE TEMP B-TREE FOR ORDER BY']] }
      },
      {
        name: 'Making predicates sargable',
        text: [
          [
            '`WHERE substr(d, 1, 4) = \'2021\'` → `WHERE d >= \'2021-01-01\' AND d < \'2022-01-01\'`',
            '`WHERE price * 2 > 50` → `WHERE price > 25`',
            '`WHERE lower(email) = ?` → store emails lower-cased, or create an **expression index** `ON users(lower(email))`',
            '`WHERE name LIKE \'%x\'` → full-text search, or a reversed-string column',
            '`WHERE a = ? OR b = ?` → often better as two indexed queries combined with UNION'
          ]
        ]
      },
      {
        name: 'Other databases',
        text: [
          'PostgreSQL: `EXPLAIN ANALYZE` shows estimated vs actual rows and time per node (Seq Scan, Index Scan, Bitmap Heap Scan, Hash Join, Sort). MySQL: `EXPLAIN` shows `type` (ALL = full scan, ref/range = index), `key` and `rows`. The ideas are identical: look for full scans on big tables, unexpected sorts, and bad row estimates.'
        ]
      }
    ],
    table: {
      head: ['Plan line', 'Meaning'],
      rows: [
        ['`SCAN t`', 'reads every row of t'],
        ['`SEARCH t USING INDEX i (col=?)`', 'seeks through index i'],
        ['`... USING COVERING INDEX`', 'answered from the index alone'],
        ['`... USING INTEGER PRIMARY KEY (rowid=?)`', 'direct lookup by primary key'],
        ['`USE TEMP B-TREE FOR ORDER BY`', 'extra sort step']
      ]
    },
    pitfalls: [
      ['Functions or arithmetic on indexed columns', 'Prevents index seeks. Move the work to the constant side.'],
      ['Implicit type conversions', 'Comparing a text column with a number can disable the index in some databases.'],
      ['Trusting a plan on a tiny test table', 'With 6 rows a scan is cheapest; plans change with real data volumes.'],
      ['Only reading EXPLAIN, never measuring', 'Use EXPLAIN ANALYZE (or timing) to confirm.']
    ],
    interview: [
      ['How do you find out why a query is slow?', ['Look at the execution plan (EXPLAIN / EXPLAIN ANALYZE) for full scans on large tables, missing or unused indexes, expensive sorts, bad join orders, and estimate vs actual row mismatches; then check indexes and statistics.']],
      ['What does sargable mean?', ['A predicate written so an index can be used for a seek: the bare indexed column compared with a constant or parameter, without wrapping functions or arithmetic.']],
      ['Index scan vs index seek?', ['A seek navigates the B-tree directly to matching keys; a scan reads the whole index (or table) from start to end.']]
    ],
    say: [
      'EXPLAIN shows the plan: SCAN reads all, SEARCH seeks.',
      'Keep indexed columns bare in WHERE (sargable).',
      'Covering indexes avoid touching the table.'
    ],
    checklist: [
      'Read SCAN vs SEARCH in a plan.',
      'Rewrite three non-sargable predicates.',
      'Spot an extra sort in a plan.',
      'Explain what a covering index removes.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT name
FROM employees
WHERE hired >= '2021-01-01' AND hired < '2022-01-01'
ORDER BY name;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Omar'], ['Sam']] },
          why: 'The sargable range returns the same rows as `substr(hired, 1, 4) = \'2021\'`.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM products
WHERE price * 2 > 50;`,
          tables: ['products'],
          answer: { cols: ['n'], rows: [[2]] },
          why: 'Same as `price > 25`: Lamp and Desk.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM customers
WHERE name LIKE 'C%';`,
          tables: ['customers'],
          answer: { cols: ['n'], rows: [[1]] },
          why: 'A prefix pattern like `C%` is index-friendly; only Cara matches.'
        },
        {
          sql: `SELECT id
FROM orders
WHERE order_date >= '2024-07-01' AND order_date < '2024-08-01'
ORDER BY id;`,
          tables: ['orders'],
          answer: { cols: ['id'], rows: [[105], [106], [107]] },
          why: 'A half-open range covers the whole month.'
        }
      ],
      fill: [
        {
          q: 'Employees hired in 2020, written sargably.',
          sql: `SELECT name
FROM employees
WHERE hired [[>=]] '2020-01-01' AND hired [[<]] '2021-01-01';`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Noah'], ['Pia']] },
          why: 'Inclusive start, exclusive end: no function on the column.'
        },
        {
          q: 'Rewrite `price * 2 > 50` without touching the column.',
          sql: `SELECT name
FROM products
WHERE price > [[25]];`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Lamp'], ['Desk']] },
          why: 'Move the arithmetic to the constant side.'
        }
      ],
      write: [
        {
          task: 'List the names of customers who joined in March 2024, without applying any function to the joined column.',
          tables: ['customers'],
          solution: `SELECT name
FROM customers
WHERE joined >= '2024-03-01' AND joined < '2024-04-01';`,
          why: 'Cara and Dev. A half-open date range keeps the column bare.'
        },
        {
          task: 'List the ids of orders placed in June 2024 using a range condition on order_date.',
          tables: ['orders'],
          solution: `SELECT id
FROM orders
WHERE order_date >= '2024-06-01' AND order_date < '2024-07-01';`,
          why: 'Orders 101 to 104.'
        }
      ]
    }
  });
})();
