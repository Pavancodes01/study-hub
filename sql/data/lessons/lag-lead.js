(function () {
  const LG = [[1, '2024-03-01'], [1, '2024-03-02'], [1, '2024-03-03'], [1, '2024-03-05'], [1, '2024-03-06'], [2, '2024-03-01'], [2, '2024-03-03'], [2, '2024-03-04'], [3, '2024-03-02']];
  const NX = ['2024-03-02', '2024-03-03', '2024-03-05', '2024-03-06', null, '2024-03-03', '2024-03-04', null, null];

  registerLesson({
    slug: 'lag-lead',
    track: 'win',
    title: 'LAG and LEAD',
    one: '`LAG(x)` reads x from the *previous* row and `LEAD(x)` from the *next* row, in the window\'s order, with no self join.',
    tables: ['sales', 'logins', 'employees'],
    idea: [
      'Comparing a row with its neighbour ("change since yesterday", "time until the next visit") used to need a self join on "the row just before". `LAG` and `LEAD` do it directly.',
      'Both follow the window\'s `ORDER BY` and stay inside a `PARTITION BY`, so each user\'s or region\'s first row has no previous row: the result is NULL, or a default you pass as the third argument.',
      '`LAG(x, 2)` looks two rows back. Combine with arithmetic for differences and percent changes.'
    ],
    stages: [
      {
        title: 'Day-over-day change',
        sql: `SELECT day, amount,
       LAG(amount) OVER (ORDER BY day) AS prev,
       amount - LAG(amount) OVER (ORDER BY day) AS change
FROM sales
WHERE region = 'north';`,
        steps: [
          { clause: 'WHERE', hl: "WHERE region = 'north'", label: 'north sales', text: 'Four north days.', cols: ['day', 'amount'], rows: [['2024-01-01', 100], ['2024-01-02', 150], ['2024-01-03', 120], ['2024-01-04', 180]], q: "SELECT day, amount FROM sales WHERE region = 'north'" },
          { clause: 'WINDOW', hl: 'LAG(amount) OVER (ORDER BY day) AS prev', text: 'Ordered by day, each row reaches one row back. The first day has nothing before it: NULL.',
            cols: ['day', 'amount', 'prev'], rows: [['2024-01-01', 100, null], ['2024-01-02', 150, 100], ['2024-01-03', 120, 150], ['2024-01-04', 180, 120]], hot: [2] },
          { clause: 'SELECT', hl: 'amount - LAG(amount) OVER (ORDER BY day) AS change', text: 'Subtract to get the change. NULL minus anything stays NULL on the first day.',
            cols: ['day', 'amount', 'prev', 'change'], rows: [['2024-01-01', 100, null, null], ['2024-01-02', 150, 100, 50], ['2024-01-03', 120, 150, -30], ['2024-01-04', 180, 120, 60]], hot: [3] }
        ]
      },
      {
        title: 'Next login per user',
        sql: `SELECT user_id, day,
       LEAD(day) OVER (PARTITION BY user_id ORDER BY day) AS next_day
FROM logins;`,
        steps: [
          { clause: 'FROM', hl: 'FROM logins', text: 'Nine logins by three users.', cols: ['user_id', 'day'], rows: LG, q: 'SELECT * FROM logins' },
          { clause: 'WINDOW', hl: 'LEAD(day) OVER (PARTITION BY user_id ORDER BY day)', text: 'Within each user, look one row ahead. The last login of each user has no next one, and LEAD never crosses into another user\'s rows.',
            cols: ['user_id', 'day', 'next_day'], rows: LG.map((r, i) => r.concat([NX[i]])), g: [0, 0, 0, 0, 0, 1, 1, 1, 2], key: [0], hot: [2] },
          { clause: 'SELECT', hl: 'SELECT user_id, day', text: 'User 1 skipped 03-04: a gap shows up wherever next_day is not the following day. That is the basis of the gaps-and-islands lesson.', g: null, hot: [] }
        ]
      }
    ],
    sections: [
      {
        name: 'Defaults and offsets',
        text: ['`LAG(x, offset, default)`: the third argument replaces the NULL at the edges.'],
        sql: `SELECT day, amount,
       LAG(amount, 1, 0) OVER (ORDER BY day) AS prev_or_0,
       LAG(amount, 2) OVER (ORDER BY day) AS two_back
FROM sales
WHERE region = 'south'
ORDER BY day;`,
        out: { cols: ['day', 'amount', 'prev_or_0', 'two_back'], rows: [['2024-01-01', 80, 0, null], ['2024-01-02', 60, 80, null], ['2024-01-03', 90, 60, 80], ['2024-01-04', 90, 90, 60]] }
      },
      {
        name: 'Percent change',
        text: ['Guard against dividing by zero with NULLIF.'],
        sql: `SELECT day,
       ROUND(100.0 * (amount - LAG(amount) OVER (ORDER BY day))
             / NULLIF(LAG(amount) OVER (ORDER BY day), 0), 1) AS pct_change
FROM sales
WHERE region = 'north'
ORDER BY day;`,
        out: { cols: ['day', 'pct_change'], rows: [['2024-01-01', null], ['2024-01-02', 50], ['2024-01-03', -20], ['2024-01-04', 50]] }
      }
    ],
    pitfalls: [
      ['Missing PARTITION BY', 'The first row of user 2 would compare with the last row of user 1.'],
      ['Assuming the previous row is the previous day', 'LAG gives the previous **row**. If days are missing, check the date difference.'],
      ['Ties in ORDER BY', 'Two rows with the same timestamp make "previous" ambiguous. Add a tie-breaker.'],
      ['Integer percent maths', 'Multiply by 100.0 before dividing.']
    ],
    interview: [
      ['How do you compute month-over-month growth?', ['Aggregate per month, then `(value - LAG(value) OVER (ORDER BY month)) / LAG(value) OVER (ORDER BY month)`, guarding zero with NULLIF.']],
      ['LAG vs a self join?', ['LAG reads the neighbouring row in one pass without a join, and handles "previous within a group" with PARTITION BY. A self join needs a condition that identifies the previous row, which is awkward with gaps.']],
      ['What does LEAD return on the last row?', ['NULL, or the default given as the third argument.']]
    ],
    say: [
      'LAG looks back, LEAD looks ahead, in the window order.',
      'PARTITION BY keeps neighbours within the same group.',
      'Previous row is not necessarily the previous day.'
    ],
    checklist: [
      'Compute a day-over-day change.',
      'Compute a percent change safely.',
      'Find the next event per user.',
      'Use a default value for the first row.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT day, LEAD(amount, 1, 0) OVER (ORDER BY day) AS nxt
FROM sales
WHERE region = 'south'
ORDER BY day;`,
          tables: ['sales'],
          answer: { cols: ['day', 'nxt'], rows: [['2024-01-01', 60], ['2024-01-02', 90], ['2024-01-03', 90], ['2024-01-04', 0]] },
          why: 'The last row gets the default 0.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM (SELECT amount - LAG(amount) OVER (PARTITION BY region ORDER BY day) AS d
      FROM sales)
WHERE d > 0;`,
          tables: ['sales'],
          answer: { cols: ['n'], rows: [[3]] },
          why: 'North rises twice (+50, +60), south once (+30).'
        },
        {
          sql: `SELECT name, LAG(name) OVER (ORDER BY hired) AS hired_before
FROM employees
WHERE dept_id = 2
ORDER BY hired;`,
          tables: ['employees'],
          answer: { cols: ['name', 'hired_before'], rows: [['Pia', null], ['Quinn', 'Pia'], ['Rosa', 'Quinn']] },
          why: 'Ordered by hire date within Sales.'
        },
        {
          sql: `SELECT day,
       julianday(day) - julianday(LAG(day) OVER (ORDER BY day)) AS gap
FROM logins
WHERE user_id = 2
ORDER BY day;`,
          tables: ['logins'],
          answer: { cols: ['day', 'gap'], rows: [['2024-03-01', null], ['2024-03-03', 2], ['2024-03-04', 1]] },
          why: 'Days between consecutive logins.'
        }
      ],
      fill: [
        {
          q: 'Previous day\'s amount for south.',
          sql: `SELECT day, [[LAG]](amount) OVER (ORDER BY day) AS prev
FROM sales
WHERE region = 'south';`,
          tables: ['sales'],
          answer: { cols: ['day', 'prev'], rows: [['2024-01-01', null], ['2024-01-02', 80], ['2024-01-03', 60], ['2024-01-04', 90]] },
          why: 'LAG reads the previous row.'
        },
        {
          q: 'Next login of the same user.',
          sql: `SELECT user_id, day,
       LEAD(day) OVER ([[PARTITION BY]] user_id ORDER BY day) AS next_day
FROM logins
WHERE user_id = 2;`,
          tables: ['logins'],
          answer: { cols: ['user_id', 'day', 'next_day'], rows: [[2, '2024-03-01', '2024-03-03'], [2, '2024-03-03', '2024-03-04'], [2, '2024-03-04', null]] },
          why: 'Partition so users never mix.'
        }
      ],
      write: [
        {
          task: 'For each north sales day, show the day, the amount, and the percent change versus the previous day rounded to 1 decimal (NULL on the first day).',
          tables: ['sales'],
          solution: `SELECT day, amount,
       ROUND(100.0 * (amount - LAG(amount) OVER (ORDER BY day)) / LAG(amount) OVER (ORDER BY day), 1) AS pct
FROM sales
WHERE region = 'north';`,
          why: '(150 − 100) / 100 = 50%, then −20%, then +50%.'
        },
        {
          task: 'For every login, show user_id, day and the same user\'s previous login day.',
          tables: ['logins'],
          solution: `SELECT user_id, day,
       LAG(day) OVER (PARTITION BY user_id ORDER BY day) AS prev_day
FROM logins;`,
          why: 'Partition by user, order by day, look one row back.'
        }
      ]
    }
  });
})();
