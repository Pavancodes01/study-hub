(function () {
  const P = [[1, 'Pen', 'office', 2.5], [2, 'Notebook', 'office', 6], [3, 'Mug', 'kitchen', 9], [4, 'Lamp', 'home', 30], [5, 'Kettle', 'kitchen', 25], [6, 'Desk', 'home', 150]];

  registerLesson({
    slug: 'dml',
    track: 'design',
    title: 'INSERT, UPDATE, DELETE and UPSERT',
    one: 'UPDATE and DELETE touch *every row their WHERE matches*, and without a WHERE that is every row. Run the WHERE as a SELECT first.',
    tables: ['products', 'orders', 'employees', 'customers', 'order_items'],
    idea: [
      '`INSERT` adds rows (from VALUES or from a SELECT). `UPDATE ... SET ... WHERE` changes columns in matching rows. `DELETE ... WHERE` removes matching rows.',
      'The WHERE of UPDATE and DELETE behaves exactly like a SELECT\'s WHERE, including the NULL rules. A good habit: write `SELECT * ... WHERE <condition>` first, check the rows, then turn it into the UPDATE/DELETE, inside a transaction.',
      '**UPSERT** (`INSERT ... ON CONFLICT DO UPDATE`) inserts a row or, if the key already exists, updates it instead, in one atomic statement.'
    ],
    stages: [
      {
        title: 'Update, then delete',
        chips: ['before', 'UPDATE', 'DELETE', 'SELECT'],
        sql: `UPDATE products SET price = price * 1.1 WHERE category = 'kitchen';
DELETE FROM products WHERE price > 100;
SELECT id, name, price FROM products;`,
        steps: [
          { clause: 'before', hl: 'UPDATE products', label: 'products', text: 'The table before any change.', cols: ['id', 'name', 'category', 'price'], rows: P, q: 'SELECT * FROM products' },
          { clause: 'UPDATE', hl: "UPDATE products SET price = price * 1.1 WHERE category = 'kitchen';", label: 'products', text: 'Only rows matching WHERE change. `price * 1.1` uses each row\'s own old price.',
            rows: P.map(r => (r[2] === 'kitchen' ? [r[0], r[1], r[2], Math.round(r[3] * 1.1 * 100) / 100] : r)), m: '  h h', hot: [3] },
          { clause: 'DELETE', hl: 'DELETE FROM products WHERE price > 100;', label: 'products', text: 'DELETE removes whole rows. The Desk goes.', m: '     d', hot: [] },
          { clause: 'SELECT', hl: 'SELECT id, name, price FROM products;', label: 'result', text: 'Five products remain, kitchen items 10% dearer.', cols: ['id', 'name', 'price'], rows: [[1, 'Pen', 2.5], [2, 'Notebook', 6], [3, 'Mug', 9.9], [4, 'Lamp', 30], [5, 'Kettle', 27.5]], m: '' }
        ]
      },
      {
        title: 'UPSERT: insert or add',
        chips: ['CREATE', 'INSERT', 'UPSERT', 'SELECT'],
        sql: `CREATE TABLE stock (product_id INTEGER PRIMARY KEY, qty INTEGER NOT NULL);
INSERT INTO stock VALUES (1, 10), (2, 5);
INSERT INTO stock VALUES (2, 3), (3, 7)
  ON CONFLICT (product_id) DO UPDATE SET qty = qty + excluded.qty;
SELECT * FROM stock;`,
        steps: [
          { clause: 'CREATE', hl: 'CREATE TABLE stock (product_id INTEGER PRIMARY KEY, qty INTEGER NOT NULL);', label: 'stock', text: 'A stock table keyed by product.', cols: ['product_id', 'qty'], rows: [] },
          { clause: 'INSERT', hl: 'INSERT INTO stock VALUES (1, 10), (2, 5);', label: 'stock', text: 'Two products in stock.', rows: [[1, 10], [2, 5]], m: 'nn' },
          { clause: 'UPSERT', hl: 'ON CONFLICT (product_id) DO UPDATE SET qty = qty + excluded.qty', label: 'stock', text: 'Product 2 already exists, so instead of failing, the UPDATE runs: `excluded.qty` is the value we tried to insert (3), added to the stored 5. Product 3 is new and is simply inserted.',
            rows: [[1, 10], [2, 8], [3, 7]], m: ' hn', hot: [1] },
          { clause: 'SELECT', hl: 'SELECT * FROM stock;', label: 'result', text: 'One statement, no "check then insert" race.', m: '', hot: [] }
        ]
      }
    ],
    sections: [
      {
        name: 'INSERT ... SELECT and RETURNING',
        text: [
          'Insert the result of a query, and get the affected rows back with `RETURNING` (PostgreSQL, SQLite 3.35+; SQL Server uses OUTPUT).'
        ],
        sql: `DELETE FROM orders
WHERE status = 'cancelled'
RETURNING id, customer_id;`,
        out: { cols: ['id', 'customer_id'], rows: [[103, 2]] }
      },
      {
        name: 'Updating from another table',
        text: ['A correlated subquery (or `UPDATE ... FROM` in PostgreSQL/SQLite 3.33+) sets values based on related rows.'],
        sql: `UPDATE orders
SET total = (SELECT SUM(p.price * oi.qty)
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = orders.id)
WHERE total IS NULL;
SELECT id, total FROM orders WHERE id = 105;`,
        out: { cols: ['id', 'total'], rows: [[105, 18]] }
      },
      {
        name: 'DELETE vs TRUNCATE vs DROP',
        text: [
          [
            '`DELETE FROM t WHERE ...`: removes chosen rows; logged per row; can be rolled back; fires triggers.',
            '`TRUNCATE t` (not in SQLite): removes all rows fast; minimal logging.',
            '`DROP TABLE t`: removes the table itself, structure included.'
          ]
        ]
      }
    ],
    pitfalls: [
      ['UPDATE or DELETE without WHERE', 'Affects every row. Preview with SELECT, use transactions.'],
      ['`WHERE col = NULL` in UPDATE/DELETE', 'Matches nothing. Use IS NULL.'],
      ['Check-then-insert in application code', 'Two clients can both see "missing" and both insert. Use UPSERT or a unique constraint.'],
      ['Updating a key used elsewhere', 'Foreign keys may block it or cascade it. Prefer immutable surrogate keys.']
    ],
    interview: [
      ['How do you make an "insert or update" safe under concurrency?', ['Use a single atomic statement: `INSERT ... ON CONFLICT DO UPDATE` (PostgreSQL/SQLite), `INSERT ... ON DUPLICATE KEY UPDATE` (MySQL) or `MERGE` (SQL Server/Oracle), backed by a unique constraint.']],
      ['DELETE vs TRUNCATE?', ['DELETE removes rows that match a condition, row by row, with full logging and triggers. TRUNCATE removes all rows quickly by deallocating pages and usually resets identity counters.']],
      ['How do you update rows based on another table?', ['A correlated subquery in SET, or a join-style UPDATE (`UPDATE ... FROM` / `UPDATE ... JOIN` depending on the database).']]
    ],
    say: [
      'UPDATE/DELETE affect exactly what WHERE matches: preview with SELECT.',
      'UPSERT replaces racy check-then-insert.',
      'RETURNING gives back the rows you changed.'
    ],
    checklist: [
      'Write an UPDATE using the old value.',
      'Write an UPSERT that adds quantities.',
      'Delete rows and return them.',
      'Explain DELETE vs TRUNCATE vs DROP.'
    ],
    drills: {
      predict: [
        {
          sql: `UPDATE employees SET salary = salary + 5 WHERE dept_id = 3;
SELECT name, salary FROM employees WHERE dept_id = 3;`,
          tables: ['employees'],
          answer: { cols: ['name', 'salary'], rows: [['Sam', 60]] },
          why: 'Sam was the only Support employee.'
        },
        {
          sql: `DELETE FROM order_items WHERE qty > 1;
SELECT COUNT(*) AS n FROM order_items;`,
          tables: ['order_items'],
          answer: { cols: ['n'], rows: [[7]] },
          why: 'Two lines had quantity 2.'
        },
        {
          sql: `UPDATE customers SET city = 'Porto' WHERE city = NULL;
SELECT COUNT(*) AS n FROM customers WHERE city = 'Porto';`,
          tables: ['customers'],
          answer: { cols: ['n'], rows: [[0]] },
          why: '`city = NULL` matches no row, so nothing was updated.'
        },
        {
          sql: `INSERT INTO products (id, name, category, price)
SELECT id + 10, name || ' XL', category, price * 2
FROM products WHERE category = 'office';
SELECT COUNT(*) AS n, MAX(price) AS m FROM products WHERE id > 10;`,
          tables: ['products'],
          answer: { cols: ['n', 'm'], rows: [[2, 12]] },
          why: 'Two office products were copied with doubled prices (5 and 12).'
        }
      ],
      fill: [
        {
          q: 'Mark order 105 as shipped.',
          sql: `UPDATE orders [[SET]] status = 'shipped' [[WHERE]] id = 105;
SELECT status FROM orders WHERE id = 105;`,
          tables: ['orders'],
          answer: { cols: ['status'], rows: [['shipped']] },
          why: 'UPDATE table SET column = value WHERE condition.'
        },
        {
          q: 'Insert, or update the price if the id exists.',
          sql: `INSERT INTO products (id, name, category, price) VALUES (1, 'Pen', 'office', 3)
ON CONFLICT (id) DO [[UPDATE]] SET price = [[excluded.price]];
SELECT price FROM products WHERE id = 1;`,
          tables: ['products'],
          answer: { cols: ['price'], rows: [[3]] },
          why: '`excluded` refers to the row that failed to insert.'
        }
      ],
      write: [
        {
          task: 'Give every Sales employee (dept_id 2) a 10% raise, then show the names and new salaries of all Sales employees.',
          tables: ['employees'],
          solution: `UPDATE employees SET salary = salary * 1.1 WHERE dept_id = 2;
SELECT name, salary FROM employees WHERE dept_id = 2;`,
          why: 'Run the change, then a SELECT to see the result.'
        },
        {
          task: 'Delete customers who have no orders, then return the names of the remaining customers.',
          tables: ['customers', 'orders'],
          solution: `DELETE FROM customers
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = customers.id);
SELECT name FROM customers;`,
          why: 'A correlated NOT EXISTS in the WHERE of a DELETE.'
        }
      ]
    }
  });
})();
