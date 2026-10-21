(function () {
  const E = [['Mia', 120], ['Noah', 95], ['Omar', 95], ['Pia', 80], ['Quinn', 60], ['Rosa', 70], ['Sam', 55], ['Tara', 50]];
  const SORTED = [['Mia', 120], ['Noah', 95], ['Omar', 95], ['Pia', 80], ['Rosa', 70], ['Quinn', 60], ['Sam', 55], ['Tara', 50]];

  registerLesson({
    slug: 'order-limit',
    track: 'basics',
    title: 'ORDER BY, LIMIT and OFFSET',
    one: 'Without ORDER BY, row order is *not guaranteed*. ORDER BY runs near the end, and LIMIT/OFFSET cut the sorted list last.',
    tables: ['employees', 'customers', 'orders', 'products'],
    idea: [
      'A table has no built-in order. If you need rows in a particular order, you must say so with `ORDER BY`; otherwise the database may return them in any order, and that order can change.',
      'Sort by several columns to break ties: `ORDER BY salary DESC, name`. Each column has its own direction, ASC (default) or DESC.',
      '`LIMIT n` keeps the first n rows of the **sorted** result and `OFFSET k` skips k rows first. Without a deterministic ORDER BY, "the first 3 rows" is meaningless.'
    ],
    stages: [
      {
        title: 'Second page of top earners',
        sql: `SELECT name, salary
FROM employees
ORDER BY salary DESC, name
LIMIT 3 OFFSET 1;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (name, salary)', text: 'Eight employees, in whatever order the table happens to store them.', cols: ['name', 'salary'], rows: E, q: 'SELECT name, salary FROM employees' },
          { clause: 'SELECT', hl: 'SELECT name, salary', text: 'Only two columns are kept.' },
          { clause: 'ORDER BY', hl: 'ORDER BY salary DESC, name', text: 'Highest salary first. Noah and Omar both earn 95; the second key, `name`, decides between them.', rows: SORTED, key: [1], q: 'SELECT name, salary FROM employees ORDER BY salary DESC, name' },
          { clause: 'LIMIT', hl: 'LIMIT 3 OFFSET 1', text: '`OFFSET 1` skips Mia, then `LIMIT 3` keeps the next three. Everything else is cut.', m: 'd   dddd' }
        ]
      },
      {
        title: 'Where do NULLs go?',
        sql: `SELECT name, city
FROM customers
ORDER BY city, name;`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers', label: 'customers (name, city)', text: 'Six customers; Dev has no city.', cols: ['name', 'city'], rows: [['Ana', 'Lisbon'], ['Ben', 'Berlin'], ['Cara', 'Lisbon'], ['Dev', null], ['Eli', 'Paris'], ['Fay', 'Berlin']], q: 'SELECT name, city FROM customers' },
          { clause: 'ORDER BY', hl: 'ORDER BY city, name', text: 'SQLite and MySQL sort NULL **first** in ascending order; PostgreSQL and Oracle put it **last**. Say `NULLS FIRST` or `NULLS LAST` to be explicit.',
            rows: [['Dev', null], ['Ben', 'Berlin'], ['Fay', 'Berlin'], ['Ana', 'Lisbon'], ['Cara', 'Lisbon'], ['Eli', 'Paris']], key: [1] }
        ]
      }
    ],
    sections: [
      {
        name: 'NULLS FIRST / LAST',
        text: ['Standard SQL (and SQLite since 3.30) lets you choose:'],
        sql: `SELECT id, total
FROM orders
ORDER BY total DESC NULLS LAST
LIMIT 3;`,
        out: { cols: ['id', 'total'], rows: [[104, 55], [102, 30], [107, 25]] }
      },
      {
        name: 'Pagination',
        text: [
          '`LIMIT 10 OFFSET 20` is page 3 of size 10. It is simple but slow for deep pages: the database still reads and discards the skipped rows. For large tables, **keyset pagination** remembers the last key seen: `WHERE id > :last_id ORDER BY id LIMIT 10`.',
          'Other spellings: `FETCH FIRST 10 ROWS ONLY` (standard, PostgreSQL, Oracle), `TOP 10` (SQL Server).'
        ],
        sql: `SELECT id, name
FROM customers
WHERE id > 3          -- last id seen on the previous page
ORDER BY id
LIMIT 2;`,
        out: { cols: ['id', 'name'], rows: [[4, 'Dev'], [5, 'Eli']] }
      }
    ],
    pitfalls: [
      ['Relying on "natural" order', 'Without ORDER BY there is no order. It may look stable in testing and change later.'],
      ['LIMIT without a unique sort key', 'Ties make the selected rows unpredictable. Add a tie-breaker such as the id.'],
      ['Deep OFFSET pages', 'Cost grows with the offset. Use keyset pagination.'],
      ['Assuming NULL placement', 'It differs by database. Use NULLS FIRST/LAST.']
    ],
    interview: [
      ['Is the order of rows guaranteed without ORDER BY?', ['No. SQL results are sets; the order depends on the execution plan and can change between runs, versions or data sizes.']],
      ['How do you get the top 3 per group?', ['Not with LIMIT alone: LIMIT applies to the whole result. Use a window function like ROW_NUMBER() OVER (PARTITION BY ...) and filter on it (Window functions track).']],
      ['Why is OFFSET pagination slow, and what is the alternative?', ['The database has to produce and skip all earlier rows. Keyset (seek) pagination filters on the last seen sort key and uses an index to jump straight there.']]
    ],
    say: [
      'No ORDER BY, no order.',
      'Add a tie-breaker so LIMIT is deterministic.',
      'Prefer keyset pagination for deep pages.'
    ],
    checklist: [
      'Sort by two columns in different directions.',
      'Get page 2 with LIMIT and OFFSET.',
      'Control where NULLs go.',
      'Write a keyset pagination query.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT name
FROM products
ORDER BY price DESC
LIMIT 2;`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Desk'], ['Lamp']] },
          why: 'The two most expensive: 150 and 30.'
        },
        {
          sql: `SELECT name, city
FROM customers
ORDER BY city DESC, name
LIMIT 3;`,
          tables: ['customers'],
          answer: { cols: ['name', 'city'], rows: [['Eli', 'Paris'], ['Ana', 'Lisbon'], ['Cara', 'Lisbon']] },
          why: 'Descending text order; in SQLite NULL goes last when descending.'
        },
        {
          sql: `SELECT id
FROM orders
ORDER BY total NULLS LAST, id
LIMIT 2 OFFSET 4;`,
          tables: ['orders'],
          answer: { cols: ['id'], rows: [[102], [104]] },
          why: 'Sorted totals: 6, 9, 11, 25, 30, 55, NULL. Skip four, take two.'
        },
        {
          sql: `SELECT name
FROM employees
ORDER BY dept_id, salary DESC, name
LIMIT 3;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Tara'], ['Mia'], ['Noah']] },
          why: 'Tara\'s NULL department sorts first; then department 1 by salary, with name breaking the 95 tie.'
        }
      ],
      fill: [
        {
          q: 'The single most expensive product.',
          sql: `SELECT name
FROM products
ORDER BY price [[DESC]]
LIMIT [[1]];`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Desk']] },
          why: 'Sort high to low and keep one row.'
        },
        {
          q: 'Page 2 of customers, two per page.',
          sql: `SELECT name
FROM customers
ORDER BY id
LIMIT 2 [[OFFSET]] 2;`,
          tables: ['customers'],
          answer: { cols: ['name'], rows: [['Cara'], ['Dev']] },
          why: 'Skip the first page (2 rows), then take 2.'
        }
      ],
      write: [
        {
          task: 'Show the name and price of the three cheapest products, cheapest first.',
          tables: ['products'],
          solution: `SELECT name, price
FROM products
ORDER BY price
LIMIT 3;`,
          why: 'Ascending is the default direction.'
        },
        {
          task: 'Show the name and hire date of the two most recently hired employees, newest first.',
          tables: ['employees'],
          solution: `SELECT name, hired
FROM employees
ORDER BY hired DESC
LIMIT 2;`,
          why: 'ISO dates sort chronologically as text.'
        }
      ]
    }
  });
})();
