(function () {
  const OC = ['id', 'order_date', 'status', 'total'];
  const O = [[101, '2024-06-01', 'shipped', 11], [102, '2024-06-15', 'shipped', 30], [103, '2024-06-03', 'cancelled', 9], [104, '2024-06-20', 'shipped', 55],
    [105, '2024-07-02', 'pending', null], [106, '2024-07-05', 'shipped', 6], [107, '2024-07-09', 'shipped', 25]];
  const OQ = 'SELECT id, order_date, status, total FROM orders';

  registerLesson({
    slug: 'aggregates',
    track: 'agg',
    title: 'Aggregate functions',
    one: 'An aggregate turns *many rows into one value*. All of them except `COUNT(*)` *ignore NULLs*.',
    tables: ['orders', 'enrollments', 'products', 'order_items', 'employees'],
    idea: [
      '`COUNT`, `SUM`, `AVG`, `MIN` and `MAX` read a whole set of rows and return a single value. Without GROUP BY, the whole (filtered) table is one set, so the result is exactly one row.',
      'NULLs are skipped: `SUM` adds the non-NULL values, `AVG` divides by the number of non-NULL values, `COUNT(col)` counts non-NULL values. Only `COUNT(*)` counts rows regardless of content.',
      'On an empty set, `COUNT` returns 0 while the others return NULL.'
    ],
    stages: [
      {
        title: 'One row out',
        sql: `SELECT COUNT(*) AS n, COUNT(total) AS with_total, SUM(total) AS revenue,
       MIN(total) AS smallest, MAX(order_date) AS latest
FROM orders
WHERE status <> 'cancelled';`,
        steps: [
          { clause: 'FROM', hl: 'FROM orders', label: 'orders (some columns)', text: 'Seven orders.', cols: OC, rows: O, q: OQ },
          { clause: 'WHERE', hl: "WHERE status <> 'cancelled'", text: 'The cancelled order is filtered out first.', m: '  d', q: OQ + " WHERE status <> 'cancelled'" },
          { clause: 'SELECT', hl: 'COUNT(*) AS n, COUNT(total) AS with_total, SUM(total) AS revenue', label: 'one big group', text: 'With no GROUP BY, all remaining rows form a single group. Order 105 has a NULL total.',
            rows: [O[0], O[1], O[3], O[4], O[5], O[6]], g: [0, 0, 0, 0, 0, 0], m: '   h', hot: [3] },
          { clause: 'SELECT', hl: 'MIN(total) AS smallest, MAX(order_date) AS latest', text: 'Six rows collapse into one. `COUNT(*)` = 6, but `COUNT(total)` = 5 and `SUM` adds only the five known totals. `MAX` works on text dates too.',
            cols: ['n', 'with_total', 'revenue', 'smallest', 'latest'], rows: [[6, 5, 127, 6, '2024-07-09']], g: null, m: '', hot: [0, 1, 2, 3, 4] }
        ]
      },
      {
        title: 'AVG skips NULL',
        sql: `SELECT AVG(grade) AS avg_graded,
       AVG(COALESCE(grade, 0)) AS avg_all
FROM enrollments
WHERE course_id = 3;`,
        steps: [
          { clause: 'FROM', hl: 'FROM enrollments', text: 'All enrollments.', cols: ['student_id', 'course_id', 'grade'], rows: [[1, 1, 90], [1, 2, 85], [2, 1, 72], [3, 3, null], [4, 1, 88], [4, 3, 95]], q: 'SELECT * FROM enrollments' },
          { clause: 'WHERE', hl: 'WHERE course_id = 3', text: 'Stats only: Kai (no grade yet) and Lea (95).', m: 'ddd d' },
          { clause: 'SELECT', hl: 'AVG(grade) AS avg_graded', text: '`AVG(grade)` divides 95 by **1**, the number of non-NULL grades. Counting Kai as 0 instead halves it. Which one is right depends on what the NULL means.',
            cols: ['avg_graded', 'avg_all'], rows: [[95, 47.5]], m: '', hot: [0, 1] }
        ]
      }
    ],
    sections: [
      {
        name: 'Aggregates on an empty set',
        text: ['No rows match, yet you still get one row back.'],
        sql: `SELECT COUNT(*) AS n, SUM(total) AS s, MAX(total) AS m
FROM orders
WHERE 1 = 0;`,
        out: { cols: ['n', 's', 'm'], rows: [[0, null, null]] }
      },
      {
        name: 'Joining strings',
        text: [
          'Concatenating values across rows: `string_agg` (standard-ish, PostgreSQL, SQLite 3.44+), `group_concat` (SQLite, MySQL), `LISTAGG` (Oracle). Add ORDER BY inside to control the order.'
        ],
        sql: `SELECT string_agg(name, ', ' ORDER BY name) AS berliners
FROM customers
WHERE city = 'Berlin';`,
        out: { cols: ['berliners'], rows: [['Ben, Fay']] }
      },
      {
        name: 'Integer averages',
        text: [
          'In SQLite, `AVG` always returns a real number. In PostgreSQL, `AVG` of integers returns a numeric; but `SUM(x) / COUNT(x)` on integers does integer division everywhere. Use `AVG` or multiply by `1.0`.'
        ]
      }
    ],
    table: {
      head: ['Function', 'NULLs', 'Empty set'],
      rows: [
        ['`COUNT(*)`', 'counted (it counts rows)', '0'],
        ['`COUNT(col)`', 'skipped', '0'],
        ['`SUM(col)`', 'skipped', 'NULL'],
        ['`AVG(col)`', 'skipped (also from the divisor)', 'NULL'],
        ['`MIN` / `MAX`', 'skipped', 'NULL']
      ]
    },
    pitfalls: [
      ['Expecting SUM of nothing to be 0', 'It is NULL. Use `COALESCE(SUM(x), 0)`.'],
      ['AVG with missing values', 'Missing values are excluded from both sum and count. Decide whether they mean "unknown" or "zero".'],
      ['Mixing aggregates with plain columns', 'Without GROUP BY that is an error in most databases (SQLite returns an arbitrary row\'s value).'],
      ['`COUNT(col)` when you meant rows', 'Undercounts rows with NULL in that column.']
    ],
    interview: [
      ['COUNT(*) vs COUNT(1) vs COUNT(col)?', ['`COUNT(*)` and `COUNT(1)` both count rows and perform the same. `COUNT(col)` counts non-NULL values of col.']],
      ['How do aggregates treat NULL?', ['They ignore NULL inputs. AVG divides by the number of non-NULL values. Only COUNT(*) is unaffected.']],
      ['What does SUM return when no rows match?', ['NULL (COUNT returns 0). Wrap in COALESCE if you need 0.']]
    ],
    say: [
      'Aggregates collapse many rows into one value.',
      'All aggregates except COUNT(*) skip NULLs.',
      'SUM/AVG/MIN/MAX of nothing is NULL; COUNT is 0.'
    ],
    checklist: [
      'Compute five aggregates in one query.',
      'Explain AVG with NULLs.',
      'Predict aggregates on an empty set.',
      'Concatenate names across rows.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(*) AS n, SUM(qty) AS units
FROM order_items
WHERE product_id = 3;`,
          tables: ['order_items'],
          answer: { cols: ['n', 'units'], rows: [[2, 3]] },
          why: 'Two lines for the Mug, with quantities 1 and 2.'
        },
        {
          sql: `SELECT MIN(name) AS first, MAX(name) AS last
FROM customers;`,
          tables: ['customers'],
          answer: { cols: ['first', 'last'], rows: [['Ana', 'Fay']] },
          why: 'MIN and MAX on text use alphabetical order.'
        },
        {
          sql: `SELECT SUM(total) AS s, COUNT(*) AS n
FROM orders
WHERE status = 'pending';`,
          tables: ['orders'],
          answer: { cols: ['s', 'n'], rows: [[null, 1]] },
          why: 'One pending order whose total is NULL: SUM of only NULLs is NULL, but there is still one row.'
        },
        {
          sql: `SELECT AVG(salary) AS a
FROM employees
WHERE dept_id = 2;`,
          tables: ['employees'],
          answer: { cols: ['a'], rows: [[70]] },
          why: '(80 + 60 + 70) / 3 = 70.'
        }
      ],
      fill: [
        {
          q: 'Most expensive kitchen product price.',
          sql: `SELECT [[MAX]](price) AS top
FROM products
WHERE category = 'kitchen';`,
          tables: ['products'],
          answer: { cols: ['top'], rows: [[25]] },
          why: 'Mug 9, Kettle 25.'
        },
        {
          q: 'How many employees earn more than 70?',
          sql: `SELECT [[COUNT(*)|COUNT(id)|COUNT(salary)]] AS n
FROM employees
WHERE salary > 70;`,
          tables: ['employees'],
          answer: { cols: ['n'], rows: [[4]] },
          why: 'Mia, Noah, Omar and Pia.'
        }
      ],
      write: [
        {
          task: 'In one row, show the number of products, the lowest price, the highest price, and the average price rounded to 2 decimals.',
          tables: ['products'],
          solution: `SELECT COUNT(*) AS n, MIN(price) AS lowest, MAX(price) AS highest, ROUND(AVG(price), 2) AS average
FROM products;`,
          why: 'Several aggregates can be computed in a single pass.'
        },
        {
          task: 'Show the total quantity of items sold across all order lines.',
          tables: ['order_items'],
          solution: `SELECT SUM(qty) AS units
FROM order_items;`,
          why: 'A single SUM over the whole table.'
        }
      ]
    }
  });
})();
