(function () {
  const CUST = [[1, 'Ana'], [2, 'Ben'], [3, 'Cara'], [4, 'Dev'], [5, 'Eli'], [6, 'Fay']];
  const JC = ['c.id', 'c.name', 'o.id', 'o.customer_id', 'o.total'];
  const JR = [
    [1, 'Ana', 101, 1, 11], [1, 'Ana', 102, 1, 30], [2, 'Ben', 103, 2, 9], [2, 'Ben', 107, 2, 25],
    [3, 'Cara', 104, 3, 55], [3, 'Cara', 105, 3, null], [4, 'Dev', null, null, null], [5, 'Eli', 106, 5, 6], [6, 'Fay', null, null, null]
  ];
  const JQ = 'SELECT c.id, c.name, o.id, o.customer_id, o.total FROM customers c LEFT JOIN orders o ON o.customer_id = c.id';

  registerLesson({
    slug: 'left-join',
    track: 'joins',
    title: 'LEFT JOIN and the anti-join',
    one: 'A LEFT JOIN keeps *every row of the left table*. Where nothing matches, the right side is filled with NULLs, and that is how you find what is *missing*.',
    tables: ['customers', 'orders', 'products', 'order_items'],
    idea: [
      'An INNER JOIN returns only pairs that match. A **LEFT JOIN** returns those pairs too, plus one row for each left row that matched nothing, with every right-hand column set to NULL.',
      'Those NULL-padded rows are the key to a classic question: "which customers have **no** orders?" Join, then keep only rows where a right-side column that can never be NULL in a real match (like its primary key) is NULL. This is called an **anti-join**.',
      'Where you put a condition matters. In `ON` it decides what counts as a match; in `WHERE` it filters the joined rows afterwards and can undo the LEFT JOIN.'
    ],
    stages: [
      {
        title: 'Every customer, matched or not',
        sql: `SELECT c.name, o.id AS order_id, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers c', label: 'customers (id, name shown)', text: 'The left table: all six customers.', cols: ['c.id', 'c.name'], rows: CUST, src: 'aa', q: 'SELECT id, name FROM customers' },
          { clause: 'JOIN', hl: 'LEFT JOIN orders o ON o.customer_id = c.id', text: 'Each customer is paired with every order whose `customer_id` matches. Ana, Ben and Cara have two orders each, so they appear twice. Dev and Fay match nothing, so they get **one row padded with NULLs**.',
            cols: JC, rows: JR, src: 'aabbb', m: '      n n', q: JQ },
          { clause: 'SELECT', hl: 'SELECT c.name, o.id AS order_id, o.total', text: 'Pick the columns. 9 rows from 6 customers and 7 orders: both "more" and "fewer" than you might guess.',
            cols: ['name', 'order_id', 'total'], rows: JR.map(r => [r[1], r[2], r[4]]), src: 'abb' }
        ]
      },
      {
        title: 'Anti-join: who never ordered?',
        sql: `SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers c', label: 'customers (id, name shown)', text: 'All customers again.', cols: ['c.id', 'c.name'], rows: CUST, src: 'aa', q: 'SELECT id, name FROM customers' },
          { clause: 'JOIN', hl: 'LEFT JOIN orders o ON o.customer_id = c.id', text: 'Same LEFT JOIN: Dev and Fay come out with NULLs on the order side.', cols: JC, rows: JR, src: 'aabbb', m: '      n n', q: JQ },
          { clause: 'WHERE', hl: 'WHERE o.id IS NULL', text: '`o.id` is the orders primary key, so it is NULL **only** on padded rows. Keeping those rows leaves exactly the customers with no orders.',
            m: 'dddddd d ', q: JQ + ' WHERE o.id IS NULL' },
          { clause: 'SELECT', hl: 'SELECT c.name', text: 'Dev and Fay never ordered.', cols: ['name'], rows: [['Dev'], ['Fay']], src: 'a' }
        ]
      }
    ],
    sections: [
      {
        name: 'A filter in ON vs in WHERE',
        text: [
          'Put a condition on the **right** table into `ON` to say "join only shipped orders"; customers without one still appear. Put it into `WHERE` and the padded rows (status is NULL) fail the test, which quietly turns your LEFT JOIN into an INNER JOIN.'
        ],
        sql: `SELECT c.name, o.id AS order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'shipped'
ORDER BY c.name, order_id;`,
        out: { cols: ['name', 'order_id'], rows: [['Ana', 101], ['Ana', 102], ['Ben', 107], ['Cara', 104], ['Dev', null], ['Eli', 106], ['Fay', null]] }
      },
      {
        name: '',
        text: ['The same condition in WHERE drops Dev and Fay:'],
        sql: `SELECT c.name, o.id AS order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'shipped'
ORDER BY c.name, order_id;`,
        out: { cols: ['name', 'order_id'], rows: [['Ana', 101], ['Ana', 102], ['Ben', 107], ['Cara', 104], ['Eli', 106]] }
      },
      {
        name: 'Counting with a LEFT JOIN',
        text: [
          'To show zeros, count a column from the right table. `COUNT(*)` counts the padded row too and reports 1 for customers with nothing.'
        ],
        sql: `SELECT c.name, COUNT(o.id) AS orders, COUNT(*) AS wrong
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;`,
        out: { cols: ['name', 'orders', 'wrong'], rows: [['Ana', 2, 2], ['Ben', 2, 2], ['Cara', 2, 2], ['Dev', 0, 1], ['Eli', 1, 1], ['Fay', 0, 1]] }
      },
      {
        name: 'RIGHT JOIN',
        text: [
          '`A RIGHT JOIN B` keeps every row of B. It is the same as `B LEFT JOIN A`, so most people always write LEFT JOIN and put the "keep everything" table first. (SQLite supports RIGHT and FULL joins since version 3.39.)'
        ],
        sql: `SELECT p.name
FROM order_items oi
RIGHT JOIN products p ON oi.product_id = p.id
WHERE oi.product_id IS NULL;`,
        out: { cols: ['name'], rows: [['Desk']] }
      }
    ],
    table: {
      head: ['Join', 'Returns'],
      rows: [
        ['`A INNER JOIN B`', 'only matching pairs'],
        ['`A LEFT JOIN B`', 'matching pairs + unmatched A rows (B side NULL)'],
        ['`A RIGHT JOIN B`', 'matching pairs + unmatched B rows (A side NULL)'],
        ['`A LEFT JOIN B … WHERE B.key IS NULL`', 'A rows with no match (anti-join)']
      ]
    },
    pitfalls: [
      ['Filtering the right table in WHERE', 'Removes the NULL-padded rows and turns the LEFT JOIN into an INNER JOIN. Move the condition into ON.'],
      ['Anti-join on a nullable column', 'Test a column that is never NULL in a real match, typically the right table\'s primary key or join key.'],
      ['`COUNT(*)` after a LEFT JOIN', 'Counts the padded row. Use `COUNT(right.id)`.'],
      ['Expecting one row per left row', 'A left row matching several right rows appears several times.']
    ],
    interview: [
      ['How do you find rows in A with no match in B?', ['`LEFT JOIN B ON ... WHERE B.id IS NULL`, or `WHERE NOT EXISTS (SELECT 1 FROM B WHERE B.a_id = A.id)`. Avoid `NOT IN` when B\'s column can be NULL.']],
      ['What is the difference between a condition in ON and in WHERE for an outer join?', ['ON decides which rows match; unmatched left rows are still kept. WHERE runs after the join and removes rows, including NULL-padded ones, so a right-table condition in WHERE behaves like an inner join.']],
      ['Can a LEFT JOIN return more rows than the left table?', ['Yes. Every match produces a row, so a left row with three matches appears three times.']]
    ],
    say: [
      'LEFT JOIN keeps all left rows and pads missing matches with NULL.',
      'Anti-join: LEFT JOIN, then WHERE right.key IS NULL.',
      'Right-table filters go in ON, not WHERE.'
    ],
    checklist: [
      'Predict the row count of a LEFT JOIN.',
      'Write an anti-join for "never ordered".',
      'Explain ON vs WHERE for outer joins.',
      'Count zeros correctly after a LEFT JOIN.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(*) AS n
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['n'], rows: [[9]] },
          why: '7 matched order rows plus one padded row each for Dev and Fay.'
        },
        {
          sql: `SELECT c.name, COUNT(*) AS n
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Berlin'
GROUP BY c.name
ORDER BY c.name;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['name', 'n'], rows: [['Ben', 2], ['Fay', 1]] },
          why: 'Fay has no orders, but `COUNT(*)` counts her padded row.'
        },
        {
          sql: `SELECT d.name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;`,
          tables: ['departments', 'employees'],
          answer: { cols: ['name'], rows: [['Legal']] },
          why: 'Legal is the only department no employee points to.'
        },
        {
          sql: `SELECT s.name, e.grade
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.id AND e.course_id = 1
ORDER BY s.id;`,
          tables: ['students', 'enrollments'],
          answer: { cols: ['name', 'grade'], rows: [['Ivy', 90], ['Jon', 72], ['Kai', null], ['Lea', 88]] },
          why: 'The course filter is in ON, so Kai (not in course 1) is kept with a NULL grade.'
        }
      ],
      fill: [
        {
          q: 'Find products nobody has ordered.',
          sql: `SELECT p.name
FROM products p
[[LEFT|LEFT OUTER]] JOIN order_items oi ON oi.product_id = p.id
WHERE oi.product_id [[IS NULL]];`,
          tables: ['products', 'order_items'],
          answer: { cols: ['name'], rows: [['Desk']] },
          why: 'Unmatched products get NULLs from order_items; keep exactly those.'
        },
        {
          q: 'Count orders per customer, showing 0 for none.',
          sql: `SELECT c.name, COUNT([[o.id|o.customer_id|o.status|o.order_date]]) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['name', 'orders'], rows: [['Ana', 2], ['Ben', 2], ['Cara', 2], ['Dev', 0], ['Eli', 1], ['Fay', 0]] },
          why: 'Count a right-side column that is never NULL for real orders.'
        }
      ],
      write: [
        {
          task: 'List the names of students who are not enrolled in course 3 (Stats).',
          tables: ['students', 'enrollments'],
          solution: `SELECT s.name
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.id AND e.course_id = 3
WHERE e.student_id IS NULL;`,
          alt: [`SELECT name FROM students s WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id AND e.course_id = 3);`],
          hint: 'The course condition belongs in ON.',
          why: 'Joining only Stats enrollments leaves NULLs for students without one.'
        },
        {
          task: 'Show every customer\'s name with the number of their shipped orders (0 if none).',
          tables: ['customers', 'orders'],
          solution: `SELECT c.name, COUNT(o.id) AS shipped
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'shipped'
GROUP BY c.id, c.name;`,
          why: 'The status filter in ON keeps customers with no shipped orders; COUNT(o.id) gives them 0.'
        }
      ]
    }
  });
})();
