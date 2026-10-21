(function () {
  const N = [['2024-01-01', 100], ['2024-01-02', 150], ['2024-01-03', 120], ['2024-01-04', 180]];
  const S = [['2024-01-01', 'north', 100], ['2024-01-02', 'north', 150], ['2024-01-03', 'north', 120], ['2024-01-04', 'north', 180],
    ['2024-01-01', 'south', 80], ['2024-01-02', 'south', 60], ['2024-01-03', 'south', 90], ['2024-01-04', 'south', 90]];

  registerLesson({
    slug: 'running-totals',
    track: 'win',
    title: 'Running totals and frames',
    one: 'Add `ORDER BY` inside OVER and an aggregate becomes *cumulative*. A frame like `ROWS BETWEEN 1 PRECEDING AND CURRENT ROW` makes it a *moving* window.',
    tables: ['sales', 'orders', 'employees'],
    idea: [
      'With ORDER BY inside OVER, each row\'s window is no longer the whole partition but "from the start up to this row". `SUM(amount) OVER (ORDER BY day)` is therefore a running total.',
      'The **frame** says exactly which rows around the current one to use: `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` is a 3-row moving window, `UNBOUNDED PRECEDING` means from the partition start, `FOLLOWING` looks ahead.',
      'Careful with ties: the default frame is `RANGE ... CURRENT ROW`, which includes all rows with the **same** ORDER BY value, so tied rows get the same running total. Use ROWS for strict row-by-row counting.'
    ],
    stages: [
      {
        title: 'Cumulative sum',
        sql: `SELECT day, amount,
       SUM(amount) OVER (ORDER BY day) AS running
FROM sales
WHERE region = 'north';`,
        steps: [
          { clause: 'FROM', hl: 'FROM sales', text: 'Eight sales rows.', cols: ['day', 'region', 'amount'], rows: S, q: 'SELECT * FROM sales' },
          { clause: 'WHERE', hl: "WHERE region = 'north'", text: 'North only.', m: '    dddd' },
          { clause: 'WINDOW', hl: 'OVER (ORDER BY day)', text: 'For each day, sum the amounts from the first day up to this one: 100, 100+150, +120, +180.',
            cols: ['day', 'amount', 'running'], rows: [['2024-01-01', 100, 100], ['2024-01-02', 150, 250], ['2024-01-03', 120, 370], ['2024-01-04', 180, 550]], hot: [2], m: '' },
          { clause: 'SELECT', hl: 'SELECT day, amount', text: 'The last running value equals the total. No rows were collapsed.', hot: [] }
        ]
      },
      {
        title: 'Two-day moving average per region',
        sql: `SELECT region, day, amount,
       AVG(amount) OVER (PARTITION BY region ORDER BY day
                         ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS avg2
FROM sales;`,
        steps: [
          { clause: 'FROM', hl: 'FROM sales', text: 'All sales.', cols: ['day', 'region', 'amount'], rows: S, q: 'SELECT * FROM sales' },
          { clause: 'WINDOW', hl: `ROWS BETWEEN 1 PRECEDING AND CURRENT ROW`, text: 'Per region, each row averages itself and the row before it. The first day of each region has no previous row, so it averages just itself.',
            cols: ['region', 'day', 'amount', 'avg2'], rows: [['north', '2024-01-01', 100, 100], ['north', '2024-01-02', 150, 125], ['north', '2024-01-03', 120, 135], ['north', '2024-01-04', 180, 150],
              ['south', '2024-01-01', 80, 80], ['south', '2024-01-02', 60, 70], ['south', '2024-01-03', 90, 75], ['south', '2024-01-04', 90, 90]], g: [0, 0, 0, 0, 1, 1, 1, 1], key: [0], hot: [3] },
          { clause: 'SELECT', hl: 'SELECT region, day, amount', text: 'PARTITION BY restarts the window, so south never averages with north.', g: null, hot: [] }
        ]
      }
    ],
    sections: [
      {
        name: 'ROWS vs RANGE with ties',
        text: [
          'Noah and Omar have the same salary. With the default RANGE frame they are "peers" and both see 190. With ROWS (and a tie-breaker) the total grows one row at a time.'
        ],
        sql: `SELECT name, salary,
       SUM(salary) OVER (ORDER BY salary) AS range_sum,
       SUM(salary) OVER (ORDER BY salary, name ROWS UNBOUNDED PRECEDING) AS rows_sum
FROM employees
WHERE dept_id = 1
ORDER BY salary, name;`,
        out: { cols: ['name', 'salary', 'range_sum', 'rows_sum'], rows: [['Noah', 95, 190, 95], ['Omar', 95, 190, 190], ['Mia', 120, 310, 310]] }
      },
      {
        name: 'Frame cheat sheet',
        text: [
          [
            '`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: running total.',
            '`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`: 7-row moving window.',
            '`ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING`: centred window.',
            '`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`: whole partition (same as no ORDER BY).',
            'RANGE frames work on values (`RANGE BETWEEN 7 PRECEDING ...` on a number or date) where supported.'
          ]
        ]
      }
    ],
    pitfalls: [
      ['Forgetting ORDER BY in OVER', 'Without it the SUM is the whole-partition total on every row.'],
      ['Default RANGE frame with ties', 'Tied rows share the same running value. Use ROWS and a tie-breaker.'],
      ['ROWS-based "7 days" with missing days', 'ROWS counts rows, not days. Fill the calendar first or use a RANGE on dates.'],
      ['Expecting the final ORDER BY to define the window order', 'The window\'s order comes only from ORDER BY inside OVER.']
    ],
    interview: [
      ['How do you compute a running total?', ['`SUM(x) OVER (ORDER BY t ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`, with PARTITION BY to restart per group.']],
      ['ROWS vs RANGE?', ['ROWS counts physical rows. RANGE groups rows with equal ORDER BY values (peers) and can use value offsets. The default with ORDER BY is RANGE UNBOUNDED PRECEDING to CURRENT ROW.']],
      ['How would you compute a 7-day moving average?', ['`AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`, provided there is exactly one row per day (fill gaps with a calendar first).']]
    ],
    say: [
      'ORDER BY inside OVER makes aggregates cumulative.',
      'Frames define moving windows.',
      'Default RANGE frames treat ties as one step: prefer ROWS.'
    ],
    checklist: [
      'Write a running total per group.',
      'Write a 3-row moving average.',
      'Explain ROWS vs RANGE with ties.',
      'Handle missing days in a moving window.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT day, SUM(amount) OVER (ORDER BY day) AS r
FROM sales
WHERE region = 'south'
ORDER BY day;`,
          tables: ['sales'],
          answer: { cols: ['day', 'r'], rows: [['2024-01-01', 80], ['2024-01-02', 140], ['2024-01-03', 230], ['2024-01-04', 320]] },
          why: 'Cumulative: 80, +60, +90, +90.'
        },
        {
          sql: `SELECT id, SUM(total) OVER (ORDER BY id) AS r
FROM orders
WHERE id <= 105
ORDER BY id;`,
          tables: ['orders'],
          answer: { cols: ['id', 'r'], rows: [[101, 11], [102, 41], [103, 50], [104, 105], [105, 105]] },
          why: 'Order 105\'s NULL total adds nothing.'
        },
        {
          sql: `SELECT day,
       MAX(amount) OVER (ORDER BY day ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS m
FROM sales
WHERE region = 'north'
ORDER BY day;`,
          tables: ['sales'],
          answer: { cols: ['day', 'm'], rows: [['2024-01-01', 150], ['2024-01-02', 150], ['2024-01-03', 180], ['2024-01-04', 180]] },
          why: 'Each row looks one day back and one day ahead.'
        },
        {
          sql: `SELECT name, SUM(salary) OVER (ORDER BY salary) AS s
FROM employees
WHERE dept_id = 1
ORDER BY name;`,
          tables: ['employees'],
          answer: { cols: ['name', 's'], rows: [['Mia', 310], ['Noah', 190], ['Omar', 190]] },
          why: 'Default RANGE frame: Noah and Omar are peers and both include each other.'
        }
      ],
      fill: [
        {
          q: 'Running total of north sales.',
          sql: `SELECT day, SUM(amount) OVER ([[ORDER BY]] day) AS running
FROM sales
WHERE region = 'north';`,
          tables: ['sales'],
          answer: { cols: ['day', 'running'], rows: [['2024-01-01', 100], ['2024-01-02', 250], ['2024-01-03', 370], ['2024-01-04', 550]] },
          why: 'ORDER BY inside OVER makes the sum cumulative.'
        },
        {
          q: 'Three-day moving sum.',
          sql: `SELECT day,
       SUM(amount) OVER (ORDER BY day ROWS BETWEEN [[2]] PRECEDING AND CURRENT ROW) AS s3
FROM sales
WHERE region = 'north';`,
          tables: ['sales'],
          answer: { cols: ['day', 's3'], rows: [['2024-01-01', 100], ['2024-01-02', 250], ['2024-01-03', 370], ['2024-01-04', 450]] },
          why: 'Two preceding rows plus the current one.'
        }
      ],
      write: [
        {
          task: 'For shipped orders, show order_date and the running total of order totals by date.',
          tables: ['orders'],
          solution: `SELECT order_date, SUM(total) OVER (ORDER BY order_date) AS running
FROM orders
WHERE status = 'shipped';`,
          why: 'WHERE filters first, then the window accumulates by date.'
        },
        {
          task: 'For every sales row, show region, day, amount and the running total within that region.',
          tables: ['sales'],
          solution: `SELECT region, day, amount,
       SUM(amount) OVER (PARTITION BY region ORDER BY day) AS running
FROM sales;`,
          why: 'PARTITION BY restarts the total for each region.'
        }
      ]
    }
  });
})();
