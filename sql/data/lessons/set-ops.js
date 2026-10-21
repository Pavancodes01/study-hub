(function () {
  const A = [['Lisbon'], ['Berlin'], ['Lisbon']];
  const B = [['Lisbon'], [null], ['Paris'], ['Berlin']];
  const CH = ['first SELECT', 'second SELECT', 'combine'];

  registerLesson({
    slug: 'set-ops',
    track: 'joins',
    title: 'UNION, INTERSECT and EXCEPT',
    one: 'Joins put tables *side by side*; set operators stack results *on top of each other*. UNION removes duplicates, UNION ALL does not.',
    tables: ['customers', 'employees', 'enrollments', 'products', 'order_items'],
    idea: [
      'A set operator combines the results of two SELECTs with the same number of columns. `UNION ALL` simply appends the second result to the first. `UNION` also removes duplicate rows, which costs a sort or hash.',
      '`INTERSECT` keeps rows that appear in both results; `EXCEPT` (called `MINUS` in Oracle) keeps rows of the first that do not appear in the second. Both also remove duplicates.',
      'Rows are compared as whole rows, and here NULLs count as equal. Column names come from the first SELECT, and ORDER BY may appear only once, at the very end.'
    ],
    stages: [
      {
        title: 'UNION removes duplicates',
        chips: CH,
        sql: `SELECT city FROM customers WHERE id <= 3
UNION
SELECT city FROM customers WHERE id >= 3;`,
        steps: [
          { clause: 'first SELECT', hl: 'SELECT city FROM customers WHERE id <= 3', label: 'first result', text: 'Customers 1–3: Lisbon, Berlin, Lisbon.', cols: ['city'], rows: A, q: 'SELECT city FROM customers WHERE id <= 3' },
          { clause: 'second SELECT', hl: 'SELECT city FROM customers WHERE id >= 3', label: 'second result', text: 'Customers 3–6. Cara (id 3) is in both ranges.', rows: B, q: 'SELECT city FROM customers WHERE id >= 3' },
          { clause: 'combine', hl: 'UNION', label: 'stacked', text: 'Both results are stacked: 7 rows. This is exactly what UNION ALL returns.', rows: A.concat(B), m: '   nnnn', q: 'SELECT city FROM customers WHERE id <= 3 UNION ALL SELECT city FROM customers WHERE id >= 3' },
          { clause: 'combine', hl: 'UNION', label: 'duplicates removed', text: 'UNION then drops repeated rows. Four distinct cities remain, including one NULL.', m: '  dd  d' }
        ]
      },
      {
        title: 'INTERSECT: in both',
        chips: CH,
        sql: `SELECT student_id FROM enrollments WHERE course_id = 1
INTERSECT
SELECT student_id FROM enrollments WHERE course_id = 3;`,
        steps: [
          { clause: 'first SELECT', hl: 'SELECT student_id FROM enrollments WHERE course_id = 1', label: 'SQL students', text: 'Students in SQL: 1, 2, 4.', cols: ['student_id'], rows: [[1], [2], [4]], q: 'SELECT student_id FROM enrollments WHERE course_id = 1' },
          { clause: 'second SELECT', hl: 'SELECT student_id FROM enrollments WHERE course_id = 3', label: 'Stats students', text: 'Students in Stats: 3, 4.', rows: [[3], [4]], q: 'SELECT student_id FROM enrollments WHERE course_id = 3' },
          { clause: 'combine', hl: 'INTERSECT', label: 'in both', text: 'Only student 4 (Lea) takes both. EXCEPT would instead give 1 and 2: in SQL but not in Stats.', rows: [[1], [2], [4]], m: 'dd' }
        ]
      }
    ],
    sections: [
      {
        name: 'The rules',
        text: [
          [
            'Same number of columns, in the same order, with compatible types.',
            'Names come from the first SELECT.',
            'One ORDER BY, at the end, applying to the combined result.',
            'Prefer `UNION ALL` when duplicates are impossible or wanted: it skips the de-duplication work.'
          ]
        ],
        sql: `SELECT name, 'customer' AS kind FROM customers WHERE city = 'Lisbon'
UNION ALL
SELECT name, 'employee' FROM employees WHERE salary > 100
ORDER BY name;`,
        out: { cols: ['name', 'kind'], rows: [['Ana', 'customer'], ['Cara', 'customer'], ['Mia', 'employee']] }
      },
      {
        name: 'EXCEPT as an anti-join',
        text: ['"Products never ordered" can be written as set difference of ids:'],
        sql: `SELECT id FROM products
EXCEPT
SELECT product_id FROM order_items;`,
        out: { cols: ['id'], rows: [[6]] }
      }
    ],
    table: {
      head: ['Operator', 'Keeps', 'Duplicates'],
      rows: [
        ['`UNION ALL`', 'all rows of both', 'kept'],
        ['`UNION`', 'all rows of both', 'removed'],
        ['`INTERSECT`', 'rows in both', 'removed'],
        ['`EXCEPT` / `MINUS`', 'rows in first, not in second', 'removed']
      ]
    },
    pitfalls: [
      ['UNION when UNION ALL would do', 'Pays for a needless de-duplication, and can silently merge rows you wanted to keep.'],
      ['Mismatched column order', 'Columns are matched by position, not name. Swapping two columns mixes the data.'],
      ['ORDER BY in the middle', 'Not allowed. Sort once at the end (or inside a subquery with LIMIT).'],
      ['EXCEPT with NULLs vs NOT IN', 'EXCEPT treats NULLs as equal, so it does not have the NOT IN trap.']
    ],
    interview: [
      ['UNION vs UNION ALL?', ['UNION removes duplicate rows from the combined result, which requires sorting or hashing. UNION ALL keeps everything and is faster.']],
      ['JOIN vs UNION?', ['A JOIN combines columns from related rows side by side; UNION appends rows of compatible results one after another.']],
      ['How would you find rows in table A that are not in table B with identical columns?', ['`SELECT ... FROM A EXCEPT SELECT ... FROM B`, or an anti-join on the key columns.']]
    ],
    say: [
      'Set operators stack results; joins place them side by side.',
      'UNION de-duplicates; UNION ALL does not.',
      'Columns match by position; one ORDER BY at the end.'
    ],
    checklist: [
      'Explain UNION vs UNION ALL with an example.',
      'Use INTERSECT and EXCEPT.',
      'Tag rows with their source using a constant column.',
      'Find never-ordered products with EXCEPT.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT 1 AS x
UNION
SELECT 1
UNION ALL
SELECT 1;`,
          answer: { cols: ['x'], rows: [[1], [1]] },
          why: 'Evaluated left to right: (1 UNION 1) is one row, then UNION ALL adds another 1.'
        },
        {
          sql: `SELECT city FROM customers
EXCEPT
SELECT 'Berlin'
ORDER BY city;`,
          tables: ['customers'],
          answer: { cols: ['city'], rows: [[null], ['Lisbon'], ['Paris']] },
          why: 'EXCEPT removes Berlin and de-duplicates the rest; NULL sorts first.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM (SELECT customer_id FROM orders
      UNION ALL
      SELECT id FROM customers);`,
          tables: ['orders', 'customers'],
          answer: { cols: ['n'], rows: [[13]] },
          why: '7 + 6 rows, nothing removed.'
        },
        {
          sql: `SELECT name FROM customers WHERE city = 'Lisbon'
UNION
SELECT name FROM employees WHERE salary > 100
ORDER BY name;`,
          tables: ['customers', 'employees'],
          answer: { cols: ['name'], rows: [['Ana'], ['Cara'], ['Mia']] },
          why: 'Two Lisbon customers plus Mia.'
        }
      ],
      fill: [
        {
          q: 'Customers who never ordered, by id.',
          sql: `SELECT id FROM customers
[[EXCEPT]]
SELECT customer_id FROM orders;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['id'], rows: [[4], [6]] },
          why: 'Set difference: in the first result but not the second.'
        },
        {
          q: 'Keep both copies of duplicate rows.',
          sql: `SELECT dept_id FROM employees WHERE salary = 95
[[UNION ALL]]
SELECT dept_id FROM employees WHERE salary > 100;`,
          tables: ['employees'],
          answer: { cols: ['dept_id'], rows: [[1], [1], [1]] },
          why: 'UNION would collapse the three 1s into one.'
        }
      ],
      write: [
        {
          task: 'Using a set operator, list the ids of products that have never been ordered.',
          tables: ['products', 'order_items'],
          solution: `SELECT id FROM products
EXCEPT
SELECT product_id FROM order_items;`,
          why: 'All product ids minus the ordered ones.'
        },
        {
          task: 'Produce one alphabetical list of all names from customers and employees, each name once.',
          tables: ['customers', 'employees'],
          solution: `SELECT name FROM customers
UNION
SELECT name FROM employees
ORDER BY name;`,
          why: 'UNION de-duplicates; ORDER BY at the end sorts the combined list.'
        }
      ]
    }
  });
})();
