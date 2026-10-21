(function () {
  const ES = [['Mia', 120], ['Noah', 95], ['Omar', 95], ['Pia', 80], ['Rosa', 70], ['Quinn', 60], ['Sam', 55], ['Tara', 50]];

  registerLesson({
    slug: 'ntile-percentiles',
    track: 'win',
    title: 'NTILE, FIRST_VALUE and percentiles',
    one: '`NTILE(n)` deals rows into *n nearly equal buckets*. `FIRST_VALUE`/`LAST_VALUE` read a row at the edge of the frame, and LAST_VALUE has a *famous trap*.',
    tables: ['employees', 'products', 'customers'],
    idea: [
      '`NTILE(4) OVER (ORDER BY salary DESC)` splits the ordered rows into 4 groups (quartiles). If rows do not divide evenly, the first buckets get one extra row each.',
      '`FIRST_VALUE(x)` returns x from the first row of the frame, for example the top earner\'s name on every row of the department. `LAST_VALUE(x)` returns x from the last row of the **frame**, and with ORDER BY the default frame ends at the current row, so it usually just returns the current row\'s value.',
      '`PERCENT_RANK()` and `CUME_DIST()` place each row on a 0–1 scale; useful for "top 10%" questions.'
    ],
    stages: [
      {
        title: 'Quartiles',
        sql: `SELECT name, salary,
       NTILE(4) OVER (ORDER BY salary DESC, name) AS quartile
FROM employees;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (name, salary)', text: 'Eight employees.', cols: ['name', 'salary'], rows: [['Mia', 120], ['Noah', 95], ['Omar', 95], ['Pia', 80], ['Quinn', 60], ['Rosa', 70], ['Sam', 55], ['Tara', 50]], q: 'SELECT name, salary FROM employees' },
          { clause: 'WINDOW', hl: 'NTILE(4) OVER (ORDER BY salary DESC, name)', text: 'Sorted high to low, 8 rows into 4 buckets: 2 each.',
            cols: ['name', 'salary', 'quartile'], rows: ES.map((r, i) => r.concat([Math.floor(i / 2) + 1])), g: [0, 0, 1, 1, 2, 2, 3, 3], hot: [2] },
          { clause: 'SELECT', hl: 'SELECT name, salary', text: 'Bucket 1 is the top quarter. Note that Noah and Omar earn the same but land in different buckets: NTILE splits by position, not by value.', g: null, hot: [] }
        ]
      },
      {
        title: 'FIRST_VALUE and the LAST_VALUE trap',
        sql: `SELECT name, dept_id, salary,
       FIRST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC, name) AS top_earner,
       LAST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC, name) AS last_value
FROM employees
WHERE dept_id IN (1, 2);`,
        steps: [
          { clause: 'WHERE', hl: 'WHERE dept_id IN (1, 2)', label: 'employees in 1 and 2', text: 'Six employees in two departments.', cols: ['name', 'dept_id', 'salary'],
            rows: [['Mia', 1, 120], ['Noah', 1, 95], ['Omar', 1, 95], ['Pia', 2, 80], ['Quinn', 2, 60], ['Rosa', 2, 70]], q: 'SELECT name, dept_id, salary FROM employees WHERE dept_id IN (1, 2)' },
          { clause: 'WINDOW', hl: 'FIRST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC, name)', text: 'FIRST_VALUE reads the first row of each department\'s ordered frame: the top earner, on every row.',
            cols: ['name', 'dept_id', 'salary', 'top_earner'], rows: [['Mia', 1, 120, 'Mia'], ['Noah', 1, 95, 'Mia'], ['Omar', 1, 95, 'Mia'], ['Pia', 2, 80, 'Pia'], ['Rosa', 2, 70, 'Pia'], ['Quinn', 2, 60, 'Pia']], g: [0, 0, 0, 1, 1, 1], key: [1], hot: [3] },
          { clause: 'WINDOW', hl: 'LAST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC, name)', text: 'You might expect the lowest earner, but the default frame stops at the **current row**, so LAST_VALUE is simply each row\'s own name. Fix: `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.',
            cols: ['name', 'dept_id', 'salary', 'top_earner', 'last_value'], rows: [['Mia', 1, 120, 'Mia', 'Mia'], ['Noah', 1, 95, 'Mia', 'Noah'], ['Omar', 1, 95, 'Mia', 'Omar'], ['Pia', 2, 80, 'Pia', 'Pia'], ['Rosa', 2, 70, 'Pia', 'Rosa'], ['Quinn', 2, 60, 'Pia', 'Quinn']], hot: [4] },
          { clause: 'SELECT', hl: 'SELECT name, dept_id, salary', text: 'Always state the frame when using LAST_VALUE (or use FIRST_VALUE with the order reversed).', g: null, hot: [] }
        ]
      }
    ],
    sections: [
      {
        name: 'Fixing LAST_VALUE',
        text: [],
        sql: `SELECT name,
       LAST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC, name
                              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS lowest
FROM employees
WHERE dept_id = 2
ORDER BY name;`,
        out: { cols: ['name', 'lowest'], rows: [['Pia', 'Quinn'], ['Quinn', 'Quinn'], ['Rosa', 'Quinn']] }
      },
      {
        name: 'PERCENT_RANK and CUME_DIST',
        text: [
          [
            '`PERCENT_RANK()` = (rank − 1) / (rows − 1): 0 for the first, 1 for the last.',
            '`CUME_DIST()` = rows with a value ≤ this one / all rows.',
            'Exact percentiles such as the median use `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` in PostgreSQL/Oracle; SQLite needs a workaround (see the Median lesson).'
          ]
        ],
        sql: `SELECT name, salary,
       ROUND(PERCENT_RANK() OVER (ORDER BY salary), 2) AS pr,
       ROUND(CUME_DIST() OVER (ORDER BY salary), 2) AS cd
FROM employees
WHERE dept_id = 1
ORDER BY salary, name;`,
        out: { cols: ['name', 'salary', 'pr', 'cd'], rows: [['Noah', 95, 0, 0.67], ['Omar', 95, 0, 0.67], ['Mia', 120, 1, 1]] }
      }
    ],
    pitfalls: [
      ['LAST_VALUE with the default frame', 'Returns the current row. Specify UNBOUNDED FOLLOWING.'],
      ['NTILE with ties', 'Equal values can land in different buckets. Use value thresholds (CUME_DIST) if that matters.'],
      ['Uneven buckets', 'With 6 rows and NTILE(4), the buckets have 2, 2, 1, 1 rows.'],
      ['Expecting PERCENTILE_CONT everywhere', 'Not available in SQLite or MySQL.']
    ],
    interview: [
      ['How does NTILE distribute rows?', ['It sorts by the window ORDER BY and splits the rows into n buckets whose sizes differ by at most one; earlier buckets get the extra rows.']],
      ['Why does LAST_VALUE often return the current row?', ['With ORDER BY, the default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, so the last row of the frame is the current row (or its last peer). Extend the frame to UNBOUNDED FOLLOWING.']],
      ['How do you find the top 10% of customers by revenue?', ['Compute revenue per customer, then `NTILE(10) OVER (ORDER BY revenue DESC) = 1`, or `CUME_DIST() OVER (ORDER BY revenue DESC) <= 0.1`.']]
    ],
    say: [
      'NTILE splits by position into n nearly equal buckets.',
      'FIRST_VALUE is safe; LAST_VALUE needs an explicit frame.',
      'PERCENT_RANK and CUME_DIST give 0–1 positions.'
    ],
    checklist: [
      'Split rows into quartiles.',
      'Show each group\'s top value on every row.',
      'Fix a LAST_VALUE query.',
      'Find the top 10% with CUME_DIST.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT id, NTILE(3) OVER (ORDER BY id) AS b
FROM customers
ORDER BY id;`,
          tables: ['customers'],
          answer: { cols: ['id', 'b'], rows: [[1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3]] },
          why: 'Six rows into three buckets of two.'
        },
        {
          sql: `SELECT id, NTILE(4) OVER (ORDER BY id) AS b
FROM customers
ORDER BY id;`,
          tables: ['customers'],
          answer: { cols: ['id', 'b'], rows: [[1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 4]] },
          why: '6 / 4 leaves 2 extra rows, which go to buckets 1 and 2.'
        },
        {
          sql: `SELECT DISTINCT FIRST_VALUE(name) OVER (PARTITION BY category ORDER BY price) AS cheapest
FROM products
ORDER BY cheapest;`,
          tables: ['products'],
          answer: { cols: ['cheapest'], rows: [['Lamp'], ['Mug'], ['Pen']] },
          why: 'The cheapest product of each category, de-duplicated.'
        },
        {
          sql: `SELECT name, LAST_VALUE(price) OVER (ORDER BY price) AS lv
FROM products
WHERE category = 'kitchen'
ORDER BY price;`,
          tables: ['products'],
          answer: { cols: ['name', 'lv'], rows: [['Mug', 9], ['Kettle', 25]] },
          why: 'The default frame ends at the current row, so each row sees its own price.'
        }
      ],
      fill: [
        {
          q: 'Split employees into top and bottom halves.',
          sql: `SELECT name, NTILE([[2]]) OVER (ORDER BY salary DESC, name) AS half
FROM employees;`,
          tables: ['employees'],
          answer: { cols: ['name', 'half'], rows: [['Mia', 1], ['Noah', 1], ['Omar', 1], ['Pia', 1], ['Rosa', 2], ['Quinn', 2], ['Sam', 2], ['Tara', 2]] },
          why: 'Two buckets of four.'
        },
        {
          q: 'Show the most expensive kitchen price on every kitchen row.',
          sql: `SELECT name,
       LAST_VALUE(price) OVER (ORDER BY price
         ROWS BETWEEN UNBOUNDED PRECEDING AND [[UNBOUNDED FOLLOWING]]) AS top_price
FROM products
WHERE category = 'kitchen';`,
          tables: ['products'],
          answer: { cols: ['name', 'top_price'], rows: [['Mug', 25], ['Kettle', 25]] },
          why: 'With the frame extended to the end, LAST_VALUE really is the last row.'
        }
      ],
      write: [
        {
          task: 'Split products into 3 price groups with NTILE (1 = cheapest): show name and group.',
          tables: ['products'],
          solution: `SELECT name, NTILE(3) OVER (ORDER BY price) AS price_group
FROM products;`,
          why: 'Six products, two per group.'
        },
        {
          task: 'For each employee with a department, show their name and the name of the lowest-paid person in that department (break ties by name).',
          tables: ['employees'],
          solution: `SELECT name,
       FIRST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary, name) AS lowest_paid
FROM employees
WHERE dept_id IS NOT NULL;`,
          why: 'Order ascending and take the first value: no frame problems.'
        }
      ]
    }
  });
})();
