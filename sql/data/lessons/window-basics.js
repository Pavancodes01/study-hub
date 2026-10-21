(function () {
  const E = [['Mia', 1, 120], ['Noah', 1, 95], ['Omar', 1, 95], ['Pia', 2, 80], ['Quinn', 2, 60], ['Rosa', 2, 70], ['Sam', 3, 55], ['Tara', null, 50]];
  const AV = { 1: 103.3, 2: 70, 3: 55 };
  const EQ = 'SELECT name, dept_id, salary FROM employees';
  const SA = [['Pia', 80], ['Quinn', 60], ['Rosa', 70]];

  registerLesson({
    slug: 'window-basics',
    track: 'win',
    title: 'Window functions: OVER and PARTITION BY',
    one: 'GROUP BY collapses rows into one per group. A window function *keeps every row* and adds a value computed over a "window" of related rows.',
    tables: ['employees', 'products', 'sales'],
    idea: [
      'Writing `AVG(salary) OVER (PARTITION BY dept_id)` asks: "for this row, what is the average salary of all rows in the same department?" Every row stays; it just gains a column.',
      '`OVER ()` with nothing inside uses all rows as one window. `PARTITION BY` splits the rows into independent windows. `ORDER BY` inside OVER (next lessons) adds order for rankings and running totals.',
      'Window functions are computed after WHERE, GROUP BY and HAVING, just before the final SELECT list. So you cannot filter on them in WHERE; wrap the query in a CTE or subquery first.'
    ],
    stages: [
      {
        title: 'Department average on every row',
        sql: `SELECT name, dept_id, salary,
       ROUND(AVG(salary) OVER (PARTITION BY dept_id), 1) AS dept_avg
FROM employees
WHERE dept_id IS NOT NULL;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (some columns)', text: 'Eight employees.', cols: ['name', 'dept_id', 'salary'], rows: E, q: EQ },
          { clause: 'WHERE', hl: 'WHERE dept_id IS NOT NULL', text: 'Tara is filtered out before any window is computed.', m: '       d', q: EQ + ' WHERE dept_id IS NOT NULL' },
          { clause: 'WINDOW', hl: 'OVER (PARTITION BY dept_id)', text: '`PARTITION BY dept_id` forms one window per department. The average is computed within each window and written onto **every** row of it.',
            cols: ['name', 'dept_id', 'salary', 'dept_avg'], rows: E.slice(0, 7).map(r => r.concat([AV[r[1]]])), g: [0, 0, 0, 1, 1, 1, 2], key: [1], hot: [3], m: '' },
          { clause: 'SELECT', hl: 'SELECT name, dept_id, salary', text: 'Seven rows in, seven rows out. With GROUP BY you would get three rows and lose the names.', g: null, key: [] }
        ]
      },
      {
        title: 'Share of the total',
        sql: `SELECT name, salary,
       SUM(salary) OVER () AS payroll,
       ROUND(100.0 * salary / SUM(salary) OVER (), 1) AS pct
FROM employees
WHERE dept_id = 2;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (name, salary)', text: 'All employees.', cols: ['name', 'salary'], rows: E.map(r => [r[0], r[2]]), q: 'SELECT name, salary FROM employees' },
          { clause: 'WHERE', hl: 'WHERE dept_id = 2', text: 'Sales only.', m: 'ddd   dd' },
          { clause: 'WINDOW', hl: 'SUM(salary) OVER ()', text: 'Empty `OVER ()`: the window is all remaining rows. Each row sees the total 210.', cols: ['name', 'salary', 'payroll'], rows: SA.map(r => r.concat([210])), g: [0, 0, 0], hot: [2], m: '' },
          { clause: 'SELECT', hl: 'ROUND(100.0 * salary / SUM(salary) OVER (), 1) AS pct', text: 'Row values and window values mix freely in expressions: each person\'s share of the payroll.', cols: ['name', 'salary', 'payroll', 'pct'], rows: [['Pia', 80, 210, 38.1], ['Quinn', 60, 210, 28.6], ['Rosa', 70, 210, 33.3]], g: null, hot: [3] }
        ]
      }
    ],
    sections: [
      {
        name: 'Anatomy of OVER',
        text: [
          '`function(...) OVER (PARTITION BY ... ORDER BY ... frame)`',
          [
            '**PARTITION BY**: which rows belong together (like GROUP BY, without collapsing).',
            '**ORDER BY**: order inside each partition; needed for ranking, LAG/LEAD and running totals.',
            '**frame** (`ROWS BETWEEN ...`): which rows around the current one to include.',
            'Any aggregate (SUM, AVG, COUNT, MIN, MAX) can be used as a window function, plus dedicated ones (ROW_NUMBER, RANK, LAG, NTILE…).'
          ]
        ]
      },
      {
        name: 'Filtering on a window result',
        text: ['Window functions are not available in WHERE. Compute them in a CTE, then filter.'],
        sql: `WITH w AS (
  SELECT name, salary, AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
  FROM employees
)
SELECT name
FROM w
WHERE salary > dept_avg;`,
        out: { cols: ['name'], rows: [['Mia'], ['Pia']] }
      }
    ],
    table: {
      head: ['', 'GROUP BY + aggregate', 'Aggregate OVER (PARTITION BY)'],
      rows: [
        ['Rows returned', 'one per group', 'all input rows'],
        ['Other columns', 'only grouping columns', 'any column'],
        ['Can filter in', 'HAVING', 'outer query / CTE'],
        ['Typical use', 'reports per group', 'compare each row with its group']
      ]
    },
    pitfalls: [
      ['Using a window function in WHERE', 'Not allowed. Wrap the query and filter outside.'],
      ['Expecting fewer rows', 'Window functions never remove rows.'],
      ['Integer division in percentages', 'Multiply by 100.0 first.'],
      ['Mixing GROUP BY and windows without thinking', 'Windows run after grouping, over the grouped rows: `SUM(SUM(x)) OVER ()` is legal and useful.']
    ],
    interview: [
      ['What is a window function?', ['A function computed over a set of rows related to the current row, defined by OVER (partition, order, frame), that returns a value for every row instead of collapsing them.']],
      ['Window function vs GROUP BY?', ['GROUP BY returns one row per group; a window function keeps all rows and attaches the group-level value to each.']],
      ['Why can\'t you use a window function in WHERE?', ['WHERE is evaluated before window functions. Compute the window in a subquery or CTE and filter in the outer query (or use QUALIFY in databases that have it).']]
    ],
    say: [
      'Window functions keep every row and add a computed column.',
      'PARTITION BY = groups without collapsing.',
      'Filter on window results in an outer query.'
    ],
    checklist: [
      'Add a group average to each row.',
      'Compute each row\'s share of a total.',
      'Filter on a window result via a CTE.',
      'Explain when windows are evaluated.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT name, COUNT(*) OVER (PARTITION BY dept_id) AS team
FROM employees
WHERE dept_id = 3;`,
          tables: ['employees'],
          answer: { cols: ['name', 'team'], rows: [['Sam', 1]] },
          why: 'WHERE runs first, so only Sam\'s row is in the window.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM (SELECT name, SUM(salary) OVER () AS t FROM employees);`,
          tables: ['employees'],
          answer: { cols: ['n'], rows: [[8]] },
          why: 'The window adds a column but keeps all 8 rows.'
        },
        {
          sql: `SELECT name, MAX(salary) OVER (PARTITION BY dept_id) - salary AS gap
FROM employees
WHERE dept_id = 1
ORDER BY name;`,
          tables: ['employees'],
          answer: { cols: ['name', 'gap'], rows: [['Mia', 0], ['Noah', 25], ['Omar', 25]] },
          why: 'Gap to the top salary of the department.'
        },
        {
          sql: `SELECT category, name, COUNT(*) OVER (PARTITION BY category) AS n
FROM products
WHERE category = 'kitchen'
ORDER BY name;`,
          tables: ['products'],
          answer: { cols: ['category', 'name', 'n'], rows: [['kitchen', 'Kettle', 2], ['kitchen', 'Mug', 2]] },
          why: 'Both kitchen rows see a window of two.'
        }
      ],
      fill: [
        {
          q: 'Average price of each product\'s category.',
          sql: `SELECT name, AVG(price) [[OVER]] ([[PARTITION BY]] category) AS cat_avg
FROM products
WHERE category = 'office';`,
          tables: ['products'],
          answer: { cols: ['name', 'cat_avg'], rows: [['Pen', 4.25], ['Notebook', 4.25]] },
          why: 'OVER turns the aggregate into a window function; PARTITION BY sets the groups.'
        },
        {
          q: 'Region total on each sales row.',
          sql: `SELECT day, amount, SUM(amount) OVER ([[PARTITION BY region]]) AS region_total
FROM sales
WHERE region = 'north';`,
          tables: ['sales'],
          answer: { cols: ['day', 'amount', 'region_total'], rows: [['2024-01-01', 100, 550], ['2024-01-02', 150, 550], ['2024-01-03', 120, 550], ['2024-01-04', 180, 550]] },
          why: 'Each north row sees the north total.'
        }
      ],
      write: [
        {
          task: 'Show each employee\'s name, salary, and the highest salary in their department.',
          tables: ['employees'],
          solution: `SELECT name, salary, MAX(salary) OVER (PARTITION BY dept_id) AS dept_max
FROM employees;`,
          why: 'A window MAX keeps every employee row.'
        },
        {
          task: 'Show each product\'s name, price, and its price as a percentage of its category\'s total price, rounded to 1 decimal.',
          tables: ['products'],
          solution: `SELECT name, price,
       ROUND(100.0 * price / SUM(price) OVER (PARTITION BY category), 1) AS pct
FROM products;`,
          why: 'Divide the row value by the window total.'
        }
      ]
    }
  });
})();
