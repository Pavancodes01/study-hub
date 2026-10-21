(function () {
  const R = [[101, 1, 'shipped'], [102, 1, 'shipped'], [103, 2, 'cancelled'], [107, 2, 'shipped'], [104, 3, 'shipped'], [105, 3, 'pending'], [106, 5, 'shipped']];
  const S = [['2024-01-01', 'north', 100], ['2024-01-02', 'north', 150], ['2024-01-03', 'north', 120], ['2024-01-04', 'north', 180],
    ['2024-01-01', 'south', 80], ['2024-01-02', 'south', 60], ['2024-01-03', 'south', 90], ['2024-01-04', 'south', 90]];
  const SB = S.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));

  registerLesson({
    slug: 'conditional-agg',
    track: 'agg',
    title: 'Conditional aggregation and pivots',
    one: 'Put a `CASE` *inside* an aggregate and each group can count or sum *several categories at once*, turning rows into columns.',
    tables: ['orders', 'sales', 'products', 'customers', 'enrollments', 'employees'],
    idea: [
      'WHERE can filter for only one condition per query. But `SUM(CASE WHEN status = \'shipped\' THEN 1 ELSE 0 END)` counts shipped orders **inside** each group while other columns count something else.',
      'This is how you pivot: one output column per category value. Rows like (day, region, amount) become one row per day with a `north` and a `south` column.',
      'Standard SQL (and SQLite, PostgreSQL) also offer `COUNT(*) FILTER (WHERE ...)`, which says the same thing more directly.'
    ],
    stages: [
      {
        title: 'Counting categories side by side',
        sql: `SELECT customer_id,
       COUNT(*) AS orders,
       SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
       SUM(CASE WHEN status <> 'shipped' THEN 1 ELSE 0 END) AS other
FROM orders
GROUP BY customer_id;`,
        steps: [
          { clause: 'FROM', hl: 'FROM orders', label: 'orders (some columns)', text: 'Seven orders.', cols: ['id', 'customer_id', 'status'], rows: [[101, 1, 'shipped'], [102, 1, 'shipped'], [103, 2, 'cancelled'], [104, 3, 'shipped'], [105, 3, 'pending'], [106, 5, 'shipped'], [107, 2, 'shipped']], q: 'SELECT id, customer_id, status FROM orders' },
          { clause: 'GROUP BY', hl: 'GROUP BY customer_id', text: 'Grouped by customer. Inside each aggregate, the CASE produces a 1 or a 0 **per row**: these are the flags being summed.',
            cols: ['id', 'customer_id', 'status', 'shipped?', 'other?'], rows: R.map(r => r.concat(r[2] === 'shipped' ? [1, 0] : [0, 1])), g: [0, 0, 1, 1, 2, 2, 3], key: [1], hot: [3, 4] },
          { clause: 'SELECT', hl: "SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped", text: 'Summing the flags counts each category in its own column, in a single pass.',
            cols: ['customer_id', 'orders', 'shipped', 'other'], rows: [[1, 2, 2, 0], [2, 2, 1, 1], [3, 2, 1, 1], [5, 1, 1, 0]], g: null, key: [0], hot: [2, 3] }
        ]
      },
      {
        title: 'Pivot: regions become columns',
        sql: `SELECT day,
       SUM(CASE WHEN region = 'north' THEN amount END) AS north,
       SUM(CASE WHEN region = 'south' THEN amount END) AS south
FROM sales
GROUP BY day;`,
        steps: [
          { clause: 'FROM', hl: 'FROM sales', text: 'Long format: one row per day and region.', cols: ['day', 'region', 'amount'], rows: S, q: 'SELECT * FROM sales' },
          { clause: 'GROUP BY', hl: 'GROUP BY day', text: 'Each day\'s two rows land in one group.', rows: SB, g: [0, 0, 1, 1, 2, 2, 3, 3], key: [0] },
          { clause: 'SELECT', hl: "SUM(CASE WHEN region = 'north' THEN amount END) AS north", text: 'The north column only picks up north amounts (the CASE is NULL for south rows, and SUM skips NULL). Same for south. Wide format: one row per day.',
            cols: ['day', 'north', 'south'], rows: [['2024-01-01', 100, 80], ['2024-01-02', 150, 60], ['2024-01-03', 120, 90], ['2024-01-04', 180, 90]], g: null, key: [0], hot: [1, 2] }
        ]
      }
    ],
    sections: [
      {
        name: 'FILTER and ratios',
        text: [
          '`COUNT(*) FILTER (WHERE cond)` is the standard spelling. A boolean averaged gives a **rate**: in SQLite a comparison is 1 or 0, so `AVG(status = \'shipped\')` is the share of shipped orders.'
        ],
        sql: `SELECT COUNT(*) FILTER (WHERE status = 'shipped') AS shipped,
       COUNT(*) AS all_orders,
       ROUND(AVG(status = 'shipped'), 3) AS shipped_rate
FROM orders;`,
        out: { cols: ['shipped', 'all_orders', 'shipped_rate'], rows: [[5, 7, 0.714]] }
      },
      {
        name: 'Three equivalent ways to count a category',
        text: [
          [
            '`SUM(CASE WHEN cond THEN 1 ELSE 0 END)`',
            '`COUNT(CASE WHEN cond THEN 1 END)` (no ELSE: non-matching rows give NULL, which COUNT skips)',
            '`COUNT(*) FILTER (WHERE cond)`'
          ],
          'Pivots need the column values known in advance. For dynamic columns you generate the SQL in application code (or use PIVOT in SQL Server / Oracle).'
        ]
      }
    ],
    pitfalls: [
      ['`SUM(CASE ... THEN 1 END)` with no ELSE', 'A group with no matches gives NULL, not 0. Add `ELSE 0`.'],
      ['`COUNT(CASE ... ELSE 0 END)`', 'COUNT counts the zeros too. Leave out ELSE when using COUNT.'],
      ['Filtering with WHERE instead', 'WHERE removes rows from every column, not just one.'],
      ['Integer ratios', '`SUM(flag) / COUNT(*)` is integer division in many databases. Multiply by 1.0 or use AVG.']
    ],
    interview: [
      ['How do you pivot rows into columns in standard SQL?', ['GROUP BY the row key and use one conditional aggregate per target column: `SUM(CASE WHEN category = \'x\' THEN value END) AS x`.']],
      ['How do you compute the percentage of rows meeting a condition?', ['`AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)`, or `COUNT(*) FILTER (WHERE cond) * 1.0 / COUNT(*)`.']],
      ['What is the FILTER clause?', ['A standard way to restrict the rows an aggregate sees: `SUM(x) FILTER (WHERE cond)`. Supported by PostgreSQL and SQLite, not MySQL.']]
    ],
    say: [
      'CASE inside an aggregate counts categories side by side.',
      'One conditional aggregate per pivot column.',
      'AVG of a 0/1 flag is a rate.'
    ],
    checklist: [
      'Count three statuses per customer in one query.',
      'Pivot long data into wide columns.',
      'Compute a percentage with AVG.',
      'Explain COUNT vs SUM with CASE.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT SUM(CASE WHEN price > 10 THEN 1 ELSE 0 END) AS pricey,
       COUNT(*) AS total
FROM products;`,
          tables: ['products'],
          answer: { cols: ['pricey', 'total'], rows: [[3, 6]] },
          why: 'Lamp, Kettle and Desk cost more than 10.'
        },
        {
          sql: `SELECT COUNT(CASE WHEN city = 'Berlin' THEN 1 END) AS berlin,
       COUNT(CASE WHEN city IS NULL THEN 1 END) AS unknown
FROM customers;`,
          tables: ['customers'],
          answer: { cols: ['berlin', 'unknown'], rows: [[2, 1]] },
          why: 'Without ELSE, non-matching rows give NULL and COUNT skips them.'
        },
        {
          sql: `SELECT course_id,
       MAX(CASE WHEN student_id = 4 THEN grade END) AS lea
FROM enrollments
GROUP BY course_id
ORDER BY course_id;`,
          tables: ['enrollments'],
          answer: { cols: ['course_id', 'lea'], rows: [[1, 88], [2, null], [3, 95]] },
          why: 'Lea is not in course 2, so every CASE there is NULL and MAX returns NULL.'
        },
        {
          sql: `SELECT COUNT(*) FILTER (WHERE salary >= 90) AS high,
       COUNT(*) FILTER (WHERE salary < 90) AS low
FROM employees;`,
          tables: ['employees'],
          answer: { cols: ['high', 'low'], rows: [[3, 5]] },
          why: 'Mia, Noah, Omar earn 90+.'
        }
      ],
      fill: [
        {
          q: 'Cancelled orders per customer.',
          sql: `SELECT customer_id,
       SUM(CASE WHEN status = 'cancelled' THEN [[1]] ELSE [[0]] END) AS cancelled
FROM orders
GROUP BY customer_id;`,
          tables: ['orders'],
          answer: { cols: ['customer_id', 'cancelled'], rows: [[1, 0], [2, 1], [3, 0], [5, 0]] },
          why: 'Flag 1 for matches, 0 otherwise, then sum.'
        },
        {
          q: 'South sales per day as a column.',
          sql: `SELECT day,
       SUM(CASE WHEN region = [['south']] THEN amount END) AS south
FROM sales
GROUP BY day;`,
          tables: ['sales'],
          answer: { cols: ['day', 'south'], rows: [['2024-01-01', 80], ['2024-01-02', 60], ['2024-01-03', 90], ['2024-01-04', 90]] },
          why: 'Only south rows contribute to this column.'
        }
      ],
      write: [
        {
          task: 'For each department id (ignore employees without one), show how many employees earn at least 80 and how many earn less, as two columns.',
          tables: ['employees'],
          solution: `SELECT dept_id,
       SUM(CASE WHEN salary >= 80 THEN 1 ELSE 0 END) AS high,
       SUM(CASE WHEN salary < 80 THEN 1 ELSE 0 END) AS low
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY dept_id;`,
          alt: [`SELECT dept_id, COUNT(*) FILTER (WHERE salary >= 80), COUNT(*) FILTER (WHERE salary < 80) FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;`],
          why: 'Two conditional counts per group.'
        },
        {
          task: 'One row per student id with their SQL grade (course 1) and their Stats grade (course 3) as two columns.',
          tables: ['enrollments', 'students'],
          solution: `SELECT s.id,
       MAX(CASE WHEN e.course_id = 1 THEN e.grade END) AS sql_grade,
       MAX(CASE WHEN e.course_id = 3 THEN e.grade END) AS stats_grade
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.id
GROUP BY s.id;`,
          hint: 'MAX of a CASE picks the single matching value.',
          why: 'A pivot: each course becomes a column.'
        }
      ]
    }
  });
})();
