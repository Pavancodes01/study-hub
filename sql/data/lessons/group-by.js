(function () {
  const EC = ['id', 'name', 'dept_id', 'salary'];
  const E = [[1, 'Mia', 1, 120], [2, 'Noah', 1, 95], [3, 'Omar', 1, 95], [4, 'Pia', 2, 80], [5, 'Quinn', 2, 60], [6, 'Rosa', 2, 70], [7, 'Sam', 3, 55], [8, 'Tara', null, 50]];
  const EQ = 'SELECT id, name, dept_id, salary FROM employees';
  const OC = ['id', 'order_date', 'status', 'total'];
  const O = [[101, '2024-06-01', 'shipped', 11], [102, '2024-06-15', 'shipped', 30], [103, '2024-06-03', 'cancelled', 9], [104, '2024-06-20', 'shipped', 55],
    [105, '2024-07-02', 'pending', null], [106, '2024-07-05', 'shipped', 6], [107, '2024-07-09', 'shipped', 25]];
  const OQ = 'SELECT id, order_date, status, total FROM orders';

  registerLesson({
    slug: 'group-by',
    track: 'agg',
    title: 'GROUP BY',
    one: 'GROUP BY sorts rows into *buckets* that share a key, then every aggregate collapses each bucket into *one row*.',
    tables: ['employees', 'orders'],
    idea: [
      'Without GROUP BY, an aggregate like `COUNT(*)` squeezes the whole table into one row. With `GROUP BY dept_id`, rows with the same `dept_id` form a group, and you get one output row per group.',
      'After grouping, a row no longer stands for one employee but for a whole bucket. So in SELECT you may use only the grouping columns and aggregates (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`). Any other column would be ambiguous: which employee\'s name should a department row show?',
      'GROUP BY runs **after** WHERE and **before** SELECT. That is why WHERE cannot filter on an aggregate (it does not exist yet); that is HAVING\'s job.'
    ],
    stages: [
      {
        title: 'Salaries per department',
        sql: `SELECT dept_id, COUNT(*) AS staff, ROUND(AVG(salary), 1) AS avg_salary
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY dept_id
ORDER BY avg_salary;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (some columns)', text: 'Eight employees. Tara has no department.', cols: EC, rows: E, q: EQ },
          { clause: 'WHERE', hl: 'WHERE dept_id IS NOT NULL', text: 'Rows are filtered **before** grouping. Tara is removed.', m: '       d', q: EQ + ' WHERE dept_id IS NOT NULL' },
          { clause: 'GROUP BY', hl: 'GROUP BY dept_id', text: 'Rows with the same `dept_id` are gathered into buckets: three for department 1, three for 2, one for 3.',
            rows: E.slice(0, 7), g: [0, 0, 0, 1, 1, 1, 2], key: [2], q: EQ + ' WHERE dept_id IS NOT NULL' },
          { clause: 'SELECT', hl: 'SELECT dept_id, COUNT(*) AS staff, ROUND(AVG(salary), 1) AS avg_salary', text: 'Each bucket collapses into one row. `COUNT(*)` counts its rows; `AVG(salary)` averages them: (120 + 95 + 95) / 3 = 103.3.',
            cols: ['dept_id', 'staff', 'avg_salary'], rows: [[1, 3, 103.3], [2, 3, 70], [3, 1, 55]], hot: [1, 2], key: [0] },
          { clause: 'ORDER BY', hl: 'ORDER BY avg_salary', text: 'Sorting happens last, so it can use the alias `avg_salary` defined in SELECT.', rows: [[3, 1, 55], [2, 3, 70], [1, 3, 103.3]], hot: [] }
        ]
      },
      {
        title: 'Grouping by an expression',
        sql: `SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders
WHERE status <> 'cancelled'
GROUP BY substr(order_date, 1, 7);`,
        steps: [
          { clause: 'FROM', hl: 'FROM orders', label: 'orders (some columns)', text: 'Seven orders.', cols: OC, rows: O, q: OQ },
          { clause: 'WHERE', hl: "WHERE status <> 'cancelled'", text: 'The cancelled order is filtered out first.', m: '  d', q: OQ + " WHERE status <> 'cancelled'" },
          { clause: 'GROUP BY', hl: 'GROUP BY substr(order_date, 1, 7)', text: 'The key can be any expression. Here it is the year-month part of the date.',
            cols: OC.concat(['month']), rows: [O[0], O[1], O[3], O[4], O[5], O[6]].map(r => r.concat([r[1].slice(0, 7)])), g: [0, 0, 0, 1, 1, 1], hot: [4], key: [4],
            q: OQ.replace('total', "total, substr(order_date, 1, 7)") + " WHERE status <> 'cancelled'" },
          { clause: 'SELECT', hl: 'SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS orders, SUM(total) AS revenue', text: 'One row per month. In July, `SUM` skips the pending order\'s NULL total: 6 + 25 = 31, while `COUNT(*)` still counts 3 orders.',
            cols: ['month', 'orders', 'revenue'], rows: [['2024-06', 3, 96], ['2024-07', 3, 31]], hot: [1, 2], key: [0] }
        ]
      }
    ],
    sections: [
      {
        name: 'The golden rule',
        text: [
          'Every column in SELECT must either appear in GROUP BY or be inside an aggregate. Most databases reject anything else. **SQLite and old MySQL accept it** and return a value from some arbitrary row, which is a silent bug.'
        ]
      },
      {
        name: 'NULL is a group too',
        text: ['All NULL keys go into one shared group. Tara\'s missing department shows up as its own row.'],
        sql: `SELECT dept_id, COUNT(*) AS n
FROM employees
GROUP BY dept_id
ORDER BY dept_id;`,
        out: { cols: ['dept_id', 'n'], rows: [[null, 1], [1, 3], [2, 3], [3, 1]] }
      },
      {
        name: 'Several grouping columns',
        text: ['Each distinct **combination** forms a group.'],
        sql: `SELECT dept_id, salary, COUNT(*) AS n
FROM employees
WHERE dept_id = 1
GROUP BY dept_id, salary
ORDER BY salary;`,
        out: { cols: ['dept_id', 'salary', 'n'], rows: [[1, 95, 2], [1, 120, 1]] }
      },
      {
        name: 'COUNT variants',
        text: [],
        sql: `SELECT COUNT(*) AS orders,
       COUNT(total) AS with_total,
       COUNT(DISTINCT customer_id) AS buyers
FROM orders;`,
        out: { cols: ['orders', 'with_total', 'buyers'], rows: [[7, 6, 4]] }
      }
    ],
    table: {
      head: ['Clause', 'Runs', 'Can see aggregates?'],
      rows: [['FROM / JOIN', '1st', 'no'], ['WHERE', '2nd', 'no'], ['GROUP BY', '3rd', 'creates groups'], ['HAVING', '4th', 'yes'], ['SELECT', '5th', 'yes'], ['ORDER BY', '6th', 'yes (and aliases)']]
    },
    pitfalls: [
      ['Selecting a non-grouped column', 'Error in most databases; an arbitrary value in SQLite/MySQL. Group by it or aggregate it.'],
      ['Filtering an aggregate in WHERE', '`WHERE COUNT(*) > 1` is invalid. Use HAVING.'],
      ['Forgetting that NULL keys form a group', 'Filter them out with WHERE if they should not appear.'],
      ['`SUM` of an all-NULL group', 'Returns NULL, not 0. Wrap with `COALESCE(SUM(x), 0)`.']
    ],
    interview: [
      ['What can appear in SELECT with GROUP BY?', ['Grouping columns (or expressions of them), aggregates, and constants. Anything else is ambiguous because each output row represents several input rows.']],
      ['In what order are the clauses evaluated?', ['FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT (including window functions), DISTINCT, ORDER BY, LIMIT. That is why WHERE cannot use aggregates or SELECT aliases, but ORDER BY can.']],
      ['How are NULLs grouped?', ['All NULLs in the grouping column fall into a single group.']]
    ],
    say: [
      'GROUP BY makes buckets; aggregates turn each bucket into one row.',
      'Select only grouping columns and aggregates.',
      'WHERE filters rows before grouping; HAVING filters groups after.'
    ],
    checklist: [
      'Sketch the buckets for a GROUP BY by hand.',
      'Explain why a non-grouped column is ambiguous.',
      'Group by an expression such as the month of a date.',
      'Recite the logical clause order.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT status, COUNT(*) AS n
FROM orders
GROUP BY status
ORDER BY n DESC, status;`,
          tables: ['orders'],
          answer: { cols: ['status', 'n'], rows: [['shipped', 5], ['cancelled', 1], ['pending', 1]] },
          why: 'Five shipped orders; ties are broken alphabetically.'
        },
        {
          sql: `SELECT category, SUM(price) AS total
FROM products
GROUP BY category
ORDER BY total;`,
          tables: ['products'],
          answer: { cols: ['category', 'total'], rows: [['office', 8.5], ['kitchen', 34], ['home', 180]] },
          why: 'office: 2.5 + 6, kitchen: 9 + 25, home: 30 + 150.'
        },
        {
          sql: `SELECT COUNT(*) AS groups
FROM (SELECT dept_id FROM employees GROUP BY dept_id);`,
          tables: ['employees'],
          answer: { cols: ['groups'], rows: [[4]] },
          why: 'Departments 1, 2, 3 and the NULL group.'
        },
        {
          sql: `SELECT course_id, COUNT(*) AS enrolled, COUNT(grade) AS graded
FROM enrollments
GROUP BY course_id
ORDER BY course_id;`,
          tables: ['enrollments'],
          answer: { cols: ['course_id', 'enrolled', 'graded'], rows: [[1, 3, 3], [2, 1, 1], [3, 2, 1]] },
          why: 'Kai\'s Stats grade is NULL, so `COUNT(grade)` is 1 for course 3.'
        }
      ],
      fill: [
        {
          q: 'Total spent per customer.',
          sql: `SELECT customer_id, [[SUM]](total) AS spent
FROM orders
GROUP BY [[customer_id]]
ORDER BY spent DESC;`,
          tables: ['orders'],
          answer: { cols: ['customer_id', 'spent'], rows: [[3, 55], [1, 41], [2, 34], [5, 6]] },
          why: 'Group by the customer, then sum each group\'s totals (NULL is skipped).'
        },
        {
          q: 'Highest salary per department.',
          sql: `SELECT dept_id, MAX(salary) AS top
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY [[dept_id]];`,
          tables: ['employees'],
          answer: { cols: ['dept_id', 'top'], rows: [[1, 120], [2, 80], [3, 55]] },
          why: 'One group per department, then MAX within each.'
        }
      ],
      write: [
        {
          task: 'Show each department name with its number of employees, including departments with none.',
          tables: ['departments', 'employees'],
          solution: `SELECT d.name, COUNT(e.id) AS staff
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name;`,
          hint: 'LEFT JOIN, then count a column from employees.',
          why: 'Legal has no employees and appears with 0.'
        },
        {
          task: 'Show each product name with the total quantity sold (only products that sold).',
          tables: ['products', 'order_items'],
          solution: `SELECT p.name, SUM(oi.qty) AS sold
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.id, p.name;`,
          why: 'Group the order lines by product and add up the quantities.'
        }
      ]
    }
  });
})();
