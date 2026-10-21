(function () {
  const E = [['Mia', 1, 120], ['Noah', 1, 95], ['Omar', 1, 95], ['Pia', 2, 80], ['Quinn', 2, 60], ['Rosa', 2, 70], ['Sam', 3, 55], ['Tara', null, 50]];
  const AVG = { 1: 103.333333, 2: 70, 3: 55 };

  registerLesson({
    slug: 'exists',
    track: 'sub',
    title: 'Correlated subqueries, EXISTS and NOT EXISTS',
    one: 'A correlated subquery *refers to the current outer row*, so it is re-evaluated per row. EXISTS asks only "is there at least one?", and NOT EXISTS is the *NULL-safe* anti-join.',
    tables: ['employees', 'departments', 'customers', 'orders', 'products', 'order_items', 'enrollments', 'students'],
    idea: [
      'In `WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = e.dept_id)`, the inner query uses `e`, the row the outer query is looking at. Conceptually it runs once **per outer row**, giving each employee their own department\'s average.',
      '`EXISTS (subquery)` is TRUE as soon as the subquery returns one row; what it selects does not matter (`SELECT 1` is the convention). It can stop at the first match.',
      '`NOT EXISTS` finds rows with no match. Unlike `NOT IN`, it is not broken by NULLs in the subquery.'
    ],
    stages: [
      {
        title: 'Above their own department\'s average',
        chips: ['FROM', 'WHERE (per row)', 'SELECT'],
        sql: `SELECT e.name, e.salary
FROM employees e
WHERE e.salary > (SELECT AVG(x.salary)
                  FROM employees x
                  WHERE x.dept_id = e.dept_id);`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees e', label: 'employees', text: 'Outer rows.', cols: ['e.name', 'e.dept_id', 'e.salary'], rows: E, q: 'SELECT name, dept_id, salary FROM employees' },
          { clause: 'WHERE (per row)', hl: 'WHERE x.dept_id = e.dept_id', text: 'For each outer row, the subquery averages **that row\'s** department. For Tara, `x.dept_id = NULL` matches nobody, so the average is NULL and the comparison is UNKNOWN.',
            cols: ['e.name', 'e.dept_id', 'e.salary', 'dept avg'], rows: E.map(r => r.concat([r[1] ? AVG[r[1]] : null])), hot: [3], m: ' dd dddd',
            q: 'SELECT e.name, e.dept_id, e.salary, (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = e.dept_id) FROM employees e WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = e.dept_id)' },
          { clause: 'SELECT', hl: 'SELECT e.name, e.salary', text: 'Mia beats Engineering\'s 103.3; Pia beats Sales\' 70. Rosa equals 70, which is not "greater".', cols: ['name', 'salary'], rows: [['Mia', 120], ['Pia', 80]], m: '', hot: [] }
        ]
      },
      {
        title: 'NOT EXISTS: empty departments',
        chips: ['FROM', 'WHERE (per row)', 'SELECT'],
        sql: `SELECT d.name
FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);`,
        steps: [
          { clause: 'FROM', hl: 'FROM departments d', text: 'Four departments.', cols: ['d.id', 'd.name'], rows: [[1, 'Engineering'], [2, 'Sales'], [3, 'Support'], [4, 'Legal']], q: 'SELECT id, name FROM departments' },
          { clause: 'WHERE (per row)', hl: 'NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id)', text: 'For each department, look for any employee pointing at it. The probe can stop at the first hit. Only Legal finds none.',
            cols: ['d.id', 'd.name', 'matching employees'], rows: [[1, 'Engineering', 3], [2, 'Sales', 3], [3, 'Support', 1], [4, 'Legal', 0]], hot: [2], m: 'ddd' },
          { clause: 'SELECT', hl: 'SELECT d.name', text: 'Legal has no employees. Tara\'s NULL `dept_id` causes no harm here.', cols: ['name'], rows: [['Legal']], m: '', hot: [] }
        ]
      }
    ],
    sections: [
      {
        name: 'The NOT IN trap, live',
        text: [
          'The "same" question with NOT IN returns **nothing**, because Tara\'s NULL `dept_id` is in the list, and `4 NOT IN (1, 2, 3, NULL)` is UNKNOWN.'
        ],
        sql: `SELECT d.name
FROM departments d
WHERE d.id NOT IN (SELECT dept_id FROM employees);`,
        out: { cols: ['name'], rows: [] }
      },
      {
        name: 'Semi-join without duplicates',
        text: ['EXISTS returns each outer row once, however many matches there are. A JOIN would return Ana twice.'],
        sql: `SELECT c.name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o
              WHERE o.customer_id = c.id AND o.total >= 25)
ORDER BY c.name;`,
        out: { cols: ['name'], rows: [['Ana'], ['Ben'], ['Cara']] }
      },
      {
        name: 'Performance',
        text: [
          'Correlated subqueries are not necessarily slow: databases rewrite EXISTS/NOT EXISTS into semi-joins and anti-joins, and an index on the inner join column (here `employees.dept_id`) makes each probe cheap. Correlated **scalar** subqueries in SELECT over large tables are the ones to watch; a join to a pre-aggregated table or a window function is often better.'
        ]
      }
    ],
    table: {
      head: ['Question', 'Pattern', 'NULL-safe?'],
      rows: [
        ['rows with a match', '`EXISTS`, `IN`, or JOIN + DISTINCT', 'yes'],
        ['rows without a match', '`NOT EXISTS`', 'yes'],
        ['rows without a match', '`LEFT JOIN ... WHERE right.key IS NULL`', 'yes'],
        ['rows without a match', '`NOT IN (subquery)`', '**no**']
      ]
    },
    pitfalls: [
      ['NOT IN with a nullable column', 'One NULL makes the whole result empty. Use NOT EXISTS.'],
      ['Forgetting the correlation', 'Without `WHERE x.dept_id = e.dept_id` the subquery averages everyone.'],
      ['Comparing with `=` to a correlated subquery that returns many rows', 'Error. Aggregate or use EXISTS.'],
      ['Selecting columns in EXISTS', 'Pointless: only existence matters. `SELECT 1` makes that clear.']
    ],
    interview: [
      ['What is a correlated subquery?', ['A subquery that references columns of the outer query, so its result depends on the current outer row. Logically it is evaluated once per outer row.']],
      ['EXISTS vs IN?', ['Both are semi-joins. EXISTS works with correlated conditions on several columns and stops at the first match. IN compares one value with a list. With NOT, only NOT EXISTS is safe in the presence of NULLs.']],
      ['Why does NOT IN return no rows when the subquery has a NULL?', ['`x NOT IN (a, NULL)` expands to `x <> a AND x <> NULL`; the second part is UNKNOWN, so the whole condition can never be TRUE.']]
    ],
    say: [
      'Correlated subqueries run per outer row.',
      'EXISTS stops at the first match and never duplicates.',
      'Use NOT EXISTS, not NOT IN, for "has no match".'
    ],
    checklist: [
      'Compare each row with its own group\'s average.',
      'Write EXISTS and NOT EXISTS.',
      'Demonstrate the NOT IN NULL trap.',
      'Explain semi-join vs join duplicates.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o
              WHERE o.customer_id = c.id AND o.status = 'cancelled');`,
          tables: ['customers', 'orders'],
          answer: { cols: ['name'], rows: [['Ben']] },
          why: 'Only order 103 is cancelled, and it is Ben\'s.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM departments
WHERE id NOT IN (SELECT dept_id FROM employees);`,
          tables: ['departments', 'employees'],
          answer: { cols: ['n'], rows: [[0]] },
          why: 'Tara\'s NULL is in the list, so NOT IN is never TRUE.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM departments
WHERE id NOT IN (SELECT dept_id FROM employees
                 WHERE dept_id IS NOT NULL);`,
          tables: ['departments', 'employees'],
          answer: { cols: ['n'], rows: [[1]] },
          why: 'Filtering out the NULL fixes it: Legal is found.'
        },
        {
          sql: `SELECT p.name
FROM products p
WHERE EXISTS (SELECT 1 FROM order_items oi
              WHERE oi.product_id = p.id AND oi.qty >= 2)
ORDER BY p.name;`,
          tables: ['products', 'order_items'],
          answer: { cols: ['name'], rows: [['Mug'], ['Pen']] },
          why: 'Pen was bought 2 at once, Mug 2 at once.'
        }
      ],
      fill: [
        {
          q: 'Students not enrolled in Java (course 2).',
          sql: `SELECT s.name
FROM students s
WHERE [[NOT EXISTS]] (SELECT 1 FROM enrollments e
                  WHERE e.student_id = s.id AND e.course_id = 2);`,
          tables: ['students', 'enrollments'],
          answer: { cols: ['name'], rows: [['Jon'], ['Kai'], ['Lea']] },
          why: 'Only Ivy takes Java.'
        },
        {
          q: 'The top earner in each department.',
          sql: `SELECT e.name
FROM employees e
WHERE e.salary = (SELECT MAX(x.salary) FROM employees x
                  WHERE x.dept_id = [[e.dept_id]]);`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Mia'], ['Pia'], ['Sam']] },
          why: 'The correlation makes MAX per department.'
        }
      ],
      write: [
        {
          task: 'List the names of customers who placed at least one order with a total over 25 (each name once).',
          tables: ['customers', 'orders'],
          solution: `SELECT c.name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o
              WHERE o.customer_id = c.id AND o.total > 25);`,
          why: 'Ana (30) and Cara (55). EXISTS avoids duplicates.'
        },
        {
          task: 'List the names of employees who earn the highest salary within their department.',
          tables: ['employees'],
          solution: `SELECT e.name
FROM employees e
WHERE e.salary = (SELECT MAX(x.salary) FROM employees x WHERE x.dept_id = e.dept_id);`,
          alt: [`SELECT e.name FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employees x WHERE x.dept_id = e.dept_id AND x.salary > e.salary) AND e.dept_id IS NOT NULL;`],
          why: 'Mia, Pia and Sam. (Tara has no department, so she has no group to top.)'
        }
      ]
    }
  });
})();
