(function () {
  const OC = ['id', 'customer_id', 'status', 'total'];
  const O = [[101, 1, 'shipped', 11], [102, 1, 'shipped', 30], [103, 2, 'cancelled', 9], [104, 3, 'shipped', 55], [105, 3, 'pending', null], [106, 5, 'shipped', 6], [107, 2, 'shipped', 25]];
  const OQ = 'SELECT id, customer_id, status, total FROM orders';
  const G = [[101, 1, 'shipped', 11], [102, 1, 'shipped', 30], [107, 2, 'shipped', 25], [104, 3, 'shipped', 55], [105, 3, 'pending', null], [106, 5, 'shipped', 6]];
  const EJ = [['Mia', 120, 'Engineering'], ['Noah', 95, 'Engineering'], ['Omar', 95, 'Engineering'], ['Pia', 80, 'Sales'], ['Quinn', 60, 'Sales'], ['Rosa', 70, 'Sales'], ['Sam', 55, 'Support']];

  registerLesson({
    slug: 'having',
    track: 'agg',
    title: 'HAVING vs WHERE',
    one: 'WHERE filters *rows before grouping*. HAVING filters *groups after aggregation*, so only HAVING can test `COUNT(*)` or `SUM(...)`.',
    tables: ['orders', 'employees', 'departments', 'products', 'enrollments'],
    idea: [
      'Aggregates do not exist while WHERE runs; the rows have not been grouped yet. So "customers with at least two orders" cannot be a WHERE condition.',
      'HAVING runs right after GROUP BY. It sees one row per group, with the group key and any aggregate, and keeps the groups whose condition is TRUE.',
      'A condition that does not involve an aggregate belongs in WHERE: it shrinks the data before the expensive grouping.'
    ],
    stages: [
      {
        title: 'Repeat customers',
        sql: `SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id
HAVING COUNT(*) >= 2;`,
        steps: [
          { clause: 'FROM', hl: 'FROM orders', label: 'orders (some columns)', text: 'Seven orders.', cols: OC, rows: O, q: OQ },
          { clause: 'WHERE', hl: "WHERE status <> 'cancelled'", text: 'Row-level filter: drop the cancelled order **before** counting.', m: '  d', q: OQ + " WHERE status <> 'cancelled'" },
          { clause: 'GROUP BY', hl: 'GROUP BY customer_id', text: 'Four groups: customers 1, 2, 3 and 5. Customer 2 has only one order left after WHERE.', rows: G, g: [0, 0, 1, 2, 2, 3], key: [1], m: '' },
          { clause: 'HAVING', hl: 'HAVING COUNT(*) >= 2', label: 'one row per group', text: 'HAVING sees one row per group with its aggregates. Groups with fewer than two orders are dropped.',
            cols: ['customer_id', 'COUNT(*)', 'SUM(total)'], rows: [[1, 2, 41], [2, 1, 25], [3, 2, 55], [5, 1, 6]], g: null, key: [0], hot: [1], m: ' d d' },
          { clause: 'SELECT', hl: 'SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent', text: 'Two repeat customers. Note that Ben (2) would have qualified without the WHERE, because his cancelled order would have counted.',
            cols: ['customer_id', 'orders', 'spent'], rows: [[1, 2, 41], [3, 2, 55]], m: '', hot: [] }
        ]
      },
      {
        title: 'Filter on an aggregate you do not show',
        sql: `SELECT d.name, ROUND(AVG(e.salary), 1) AS avg_salary
FROM employees e
JOIN departments d ON d.id = e.dept_id
GROUP BY d.name
HAVING MAX(e.salary) >= 80;`,
        steps: [
          { clause: 'JOIN', hl: 'JOIN departments d ON d.id = e.dept_id', label: 'employees with department names', text: 'Seven employees with a department (Tara drops out of the inner join).', cols: ['e.name', 'e.salary', 'd.name'], rows: EJ, src: 'aab',
            q: 'SELECT e.name, e.salary, d.name FROM employees e JOIN departments d ON d.id = e.dept_id' },
          { clause: 'GROUP BY', hl: 'GROUP BY d.name', text: 'Three departments.', g: [0, 0, 0, 1, 1, 1, 2], key: [2] },
          { clause: 'HAVING', hl: 'HAVING MAX(e.salary) >= 80', label: 'one row per group', text: 'Keep departments where someone earns at least 80. Support\'s top salary is 55.', cols: ['d.name', 'MAX(e.salary)'], rows: [['Engineering', 120], ['Sales', 80], ['Support', 55]], g: null, key: [0], m: '  d', src: 'ba' },
          { clause: 'SELECT', hl: 'SELECT d.name, ROUND(AVG(e.salary), 1) AS avg_salary', text: 'SELECT can show a different aggregate from the one HAVING tested.', cols: ['name', 'avg_salary'], rows: [['Engineering', 103.3], ['Sales', 70]], m: '', src: 'ba', hot: [1] }
        ]
      }
    ],
    sections: [
      {
        name: 'Where should a condition go?',
        text: [
          [
            'Uses an aggregate (`COUNT`, `SUM`…)? → HAVING.',
            'Only uses plain columns? → WHERE, even if HAVING would also accept a grouping column.',
            'Needs both? → split it: the row part in WHERE, the aggregate part in HAVING.'
          ]
        ]
      },
      {
        name: 'HAVING without GROUP BY',
        text: ['Then the whole table is one group, and HAVING either keeps that single row or removes it.'],
        sql: `SELECT COUNT(*) AS n
FROM orders
HAVING COUNT(*) > 5;`,
        out: { cols: ['n'], rows: [[7]] }
      },
      {
        name: 'Aliases in HAVING',
        text: [
          'Standard SQL does not let HAVING use a SELECT alias (SELECT runs later). SQLite and MySQL allow `HAVING orders >= 2`; PostgreSQL does not. Repeating the aggregate is portable.'
        ]
      }
    ],
    table: {
      head: ['', 'WHERE', 'HAVING'],
      rows: [
        ['Runs', 'before GROUP BY', 'after GROUP BY'],
        ['Filters', 'rows', 'groups'],
        ['Can use aggregates', 'no', 'yes'],
        ['Effect on performance', 'shrinks input early', 'works on already grouped data']
      ]
    },
    pitfalls: [
      ['`WHERE COUNT(*) > 1`', 'Invalid: aggregates are not available yet. Use HAVING.'],
      ['Row filters in HAVING', 'Works for grouping columns but filters late. Move them to WHERE.'],
      ['Forgetting that WHERE changes the counts', 'Rows removed by WHERE do not count in HAVING.'],
      ['HAVING on AVG with NULLs', 'Groups whose AVG is NULL fail every comparison and disappear.']
    ],
    interview: [
      ['WHERE vs HAVING?', ['WHERE filters individual rows before grouping and cannot use aggregates. HAVING filters groups after aggregation and can. Put non-aggregate conditions in WHERE for efficiency.']],
      ['Can you use HAVING without GROUP BY?', ['Yes. The whole result is then a single group, so HAVING returns either one row or none.']],
      ['How do you find duplicate values?', ['`SELECT col, COUNT(*) FROM t GROUP BY col HAVING COUNT(*) > 1`.']]
    ],
    say: [
      'WHERE filters rows, HAVING filters groups.',
      'Only HAVING can use aggregates.',
      'Put non-aggregate conditions in WHERE.'
    ],
    checklist: [
      'Find groups with more than N rows.',
      'Split a mixed condition into WHERE and HAVING.',
      'Filter on an aggregate not shown in SELECT.',
      'Explain why WHERE cannot use COUNT.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT dept_id
FROM employees
GROUP BY dept_id
HAVING COUNT(*) = 1
ORDER BY dept_id;`,
          tables: ['employees'],
          answer: { cols: ['dept_id'], rows: [[null], [3]] },
          why: 'Tara alone forms the NULL group; Sam alone is department 3.'
        },
        {
          sql: `SELECT category
FROM products
GROUP BY category
HAVING SUM(price) > 30
ORDER BY category;`,
          tables: ['products'],
          answer: { cols: ['category'], rows: [['home'], ['kitchen']] },
          why: 'home 180, kitchen 34, office 8.5.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM orders
HAVING COUNT(*) > 10;`,
          tables: ['orders'],
          answer: { cols: ['n'], rows: [] },
          why: 'The single group has 7 rows, which fails HAVING, so no row is returned at all.'
        },
        {
          sql: `SELECT student_id, AVG(grade) AS g
FROM enrollments
GROUP BY student_id
HAVING AVG(grade) > 85
ORDER BY student_id;`,
          tables: ['enrollments'],
          answer: { cols: ['student_id', 'g'], rows: [[1, 87.5], [4, 91.5]] },
          why: 'Kai\'s average is NULL (no grades), which is not > 85; Jon has 72.'
        }
      ],
      fill: [
        {
          q: 'Customers with more than one order.',
          sql: `SELECT customer_id
FROM orders
GROUP BY customer_id
[[HAVING]] COUNT(*) > 1;`,
          tables: ['orders'],
          answer: { cols: ['customer_id'], rows: [[1], [2], [3]] },
          why: 'Group-level conditions go in HAVING.'
        },
        {
          q: 'Products sold more than 2 units in total.',
          sql: `SELECT product_id
FROM order_items
GROUP BY product_id
HAVING [[SUM(qty)]] > 2;`,
          tables: ['order_items'],
          answer: { cols: ['product_id'], rows: [[3]] },
          why: 'The Mug sold 1 + 2 = 3 units.'
        }
      ],
      write: [
        {
          task: 'List the department ids whose total salary is greater than 200.',
          tables: ['employees'],
          solution: `SELECT dept_id
FROM employees
GROUP BY dept_id
HAVING SUM(salary) > 200;`,
          why: 'Engineering 310 and Sales 210 qualify.'
        },
        {
          task: 'List the names of customers who have at least 2 shipped orders.',
          tables: ['customers', 'orders'],
          solution: `SELECT c.name
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'shipped'
GROUP BY c.id, c.name
HAVING COUNT(*) >= 2;`,
          hint: 'Status is a row condition; the count is a group condition.',
          why: 'Only Ana has two shipped orders.'
        }
      ]
    }
  });
})();
