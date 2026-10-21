(function () {
  const P = [[1, 'Pen', 'office', 2.5], [2, 'Notebook', 'office', 6], [3, 'Mug', 'kitchen', 9], [4, 'Lamp', 'home', 30], [5, 'Kettle', 'kitchen', 25], [6, 'Desk', 'home', 150]];
  const tier = p => (p < 10 ? 'cheap' : p < 50 ? 'mid' : 'premium');

  registerLesson({
    slug: 'expressions',
    track: 'basics',
    title: 'CASE, string and date functions',
    one: '`CASE` is SQL\'s if/else. It checks branches *top to bottom* and returns the first match, or ELSE (NULL if there is no ELSE).',
    tables: ['products', 'employees', 'customers'],
    idea: [
      'Expressions can appear almost anywhere: SELECT, WHERE, ORDER BY, GROUP BY. They let you compute values per row without changing the data.',
      '`CASE WHEN cond THEN value ... ELSE value END` evaluates conditions in order and stops at the first TRUE one. It is how you bucket values, relabel codes, or build conditional aggregates later.',
      'Function names differ between databases more than anything else in SQL. This course uses SQLite\'s; the table below shows the common equivalents.'
    ],
    stages: [
      {
        title: 'Bucketing with CASE',
        sql: `SELECT name, price,
       CASE WHEN price < 10 THEN 'cheap'
            WHEN price < 50 THEN 'mid'
            ELSE 'premium' END AS tier
FROM products;`,
        steps: [
          { clause: 'FROM', hl: 'FROM products', text: 'Six products.', cols: ['id', 'name', 'category', 'price'], rows: P, q: 'SELECT * FROM products' },
          { clause: 'SELECT', hl: "CASE WHEN price < 10 THEN 'cheap'", text: 'For each row, CASE checks `price < 10` first. Pen, Notebook and Mug stop at the first branch.',
            cols: ['name', 'price', 'tier'], rows: P.map(r => [r[1], r[3], tier(r[3])]), hot: [2], m: 'hhh' },
          { clause: 'SELECT', hl: "WHEN price < 50 THEN 'mid'", text: 'The rest go on to the second test. Lamp and Kettle are "mid". The second branch does not need `price >= 10` because earlier rows never reach it.', m: '   hh' },
          { clause: 'SELECT', hl: "ELSE 'premium' END AS tier", text: 'Anything left falls to ELSE. Without an ELSE, Desk would get NULL.', m: '     h' }
        ]
      },
      {
        title: 'String and date helpers',
        sql: `SELECT name, upper(name) AS up, length(name) AS len, substr(hired, 1, 4) AS year
FROM employees
WHERE dept_id = 2;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (some columns)', text: 'All employees.', cols: ['name', 'dept_id', 'hired'],
            rows: [['Mia', 1, '2019-03-01'], ['Noah', 1, '2020-07-15'], ['Omar', 1, '2021-01-10'], ['Pia', 2, '2020-02-01'], ['Quinn', 2, '2022-05-20'], ['Rosa', 2, '2023-03-03'], ['Sam', 3, '2021-09-09'], ['Tara', null, '2024-01-15']],
            q: 'SELECT name, dept_id, hired FROM employees' },
          { clause: 'WHERE', hl: 'WHERE dept_id = 2', text: 'Sales only.', m: 'ddd   dd' },
          { clause: 'SELECT', hl: 'upper(name) AS up, length(name) AS len, substr(hired, 1, 4) AS year', text: 'Each function works on one row\'s values. `substr(text, start, length)` counts from 1.',
            cols: ['name', 'up', 'len', 'year'], rows: [['Pia', 'PIA', 3, '2020'], ['Quinn', 'QUINN', 5, '2022'], ['Rosa', 'ROSA', 4, '2023']], hot: [1, 2, 3] }
        ]
      }
    ],
    sections: [
      {
        name: 'Two forms of CASE',
        text: [
          [
            '**Searched**: `CASE WHEN price < 10 THEN ... END`, any condition per branch.',
            '**Simple**: `CASE category WHEN \'office\' THEN 1 WHEN \'home\' THEN 2 END`, compares one value with `=`. It cannot match NULL, because `NULL = NULL` is not TRUE.'
          ]
        ]
      },
      {
        name: 'Dates in SQLite',
        text: [
          'SQLite has no DATE type; dates are ISO text, and functions compute with them. Watch the month arithmetic: SQLite turns "January 31 + 1 month" into March 2 because February 31 does not exist.'
        ],
        sql: `SELECT date('2024-01-31', '+1 month') AS plus_month,
       strftime('%Y-%m', '2024-06-15') AS year_month,
       julianday('2024-03-01') - julianday('2024-02-01') AS days;`,
        out: { cols: ['plus_month', 'year_month', 'days'], rows: [['2024-03-02', '2024-06', 29]] }
      },
      {
        name: 'Rounding and casting',
        text: [],
        sql: `SELECT ROUND(2.567, 1) AS rounded,
       CAST(7.9 AS INTEGER) AS truncated,
       CAST('42' AS INTEGER) + 1 AS parsed;`,
        out: { cols: ['rounded', 'truncated', 'parsed'], rows: [[2.6, 7, 43]] }
      }
    ],
    table: {
      head: ['Task', 'SQLite', 'PostgreSQL', 'MySQL'],
      rows: [
        ['concatenate', "`a || b`", "`a || b`", '`CONCAT(a, b)`'],
        ['substring', '`substr(s, 1, 3)`', '`substring(s from 1 for 3)`', '`SUBSTRING(s, 1, 3)`'],
        ['length', '`length(s)`', '`length(s)`', '`CHAR_LENGTH(s)`'],
        ['today', "`date('now')`", '`CURRENT_DATE`', '`CURDATE()`'],
        ['add days', "`date(d, '+7 days')`", "`d + INTERVAL '7 days'`", '`DATE_ADD(d, INTERVAL 7 DAY)`'],
        ['year of a date', "`strftime('%Y', d)`", '`EXTRACT(YEAR FROM d)`', '`YEAR(d)`']
      ]
    },
    pitfalls: [
      ['CASE without ELSE', 'Unmatched rows become NULL.'],
      ['Overlapping CASE branches', 'Only the first matching branch counts. Order them from most specific to least.'],
      ['Simple CASE with NULL', '`CASE x WHEN NULL` never matches. Use `CASE WHEN x IS NULL`.'],
      ['Functions on indexed columns in WHERE', '`WHERE upper(name) = \'ANA\'` cannot use a plain index on `name` (see the EXPLAIN lesson).']
    ],
    interview: [
      ['How does CASE evaluate?', ['Branches are tested in order; the first TRUE condition supplies the result. If none matches, ELSE is used, or NULL if there is no ELSE.']],
      ['How would you bucket ages or prices?', ['A searched CASE with ascending upper bounds, relying on the order: `CASE WHEN x < 10 THEN ... WHEN x < 50 THEN ... ELSE ... END`.']],
      ['Why can a function in WHERE slow a query?', ['Wrapping the column in a function means the index on the raw column cannot be used for a seek. Rewrite the condition on the bare column, or create an expression index.']]
    ],
    say: [
      'CASE returns the first matching branch, else ELSE, else NULL.',
      'Function names are the least portable part of SQL.',
      'Keep indexed columns bare in WHERE.'
    ],
    checklist: [
      'Write a three-way CASE bucket.',
      'Use COALESCE inside a string expression.',
      'Extract the year from a date.',
      'Explain why CASE x WHEN NULL never matches.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT CASE WHEN NULL = NULL THEN 'yes' ELSE 'no' END AS r;`,
          answer: { cols: ['r'], rows: [['no']] },
          why: '`NULL = NULL` is UNKNOWN, not TRUE, so the ELSE branch wins.'
        },
        {
          sql: `SELECT name,
       CASE category WHEN 'office' THEN 1 WHEN 'home' THEN 2 END AS code
FROM products
WHERE id IN (1, 3, 4)
ORDER BY id;`,
          tables: ['products'],
          answer: { cols: ['name', 'code'], rows: [['Pen', 1], ['Mug', null], ['Lamp', 2]] },
          why: 'Mug is kitchen, which matches no branch, and there is no ELSE.'
        },
        {
          sql: `SELECT upper(substr('database', 1, 4)) || length('sql') AS r;`,
          answer: { cols: ['r'], rows: [['DATA3']] },
          why: 'First four letters, upper-cased, followed by the length 3.'
        },
        {
          sql: `SELECT ROUND(2.567, 1) AS a, CAST(7.9 AS INTEGER) AS b, 10 / 4 AS c;`,
          answer: { cols: ['a', 'b', 'c'], rows: [[2.6, 7, 2]] },
          why: 'CAST to integer truncates; integer division drops the fraction.'
        }
      ],
      fill: [
        {
          q: 'Label Sales staff: 75 or more is "senior".',
          sql: `SELECT name,
       CASE WHEN salary >= 75 THEN 'senior' [[ELSE]] 'other' [[END]] AS band
FROM employees
WHERE dept_id = 2;`,
          tables: ['employees'],
          answer: { cols: ['name', 'band'], rows: [['Pia', 'senior'], ['Quinn', 'other'], ['Rosa', 'other']] },
          why: 'Every CASE ends with END; ELSE handles everything else.'
        },
        {
          q: 'Write "Dev from nowhere".',
          sql: `SELECT name || ' from ' || [[COALESCE|IFNULL]](city, 'nowhere') AS line
FROM customers
WHERE id = 4;`,
          tables: ['customers'],
          answer: { cols: ['line'], rows: [['Dev from nowhere']] },
          why: 'Concatenating NULL gives NULL, so replace it first.'
        }
      ],
      write: [
        {
          task: 'For every order show its id and a label: "unknown" when the total is missing, "big" when the total is at least 30, otherwise "small".',
          tables: ['orders'],
          solution: `SELECT id,
       CASE WHEN total IS NULL THEN 'unknown'
            WHEN total >= 30 THEN 'big'
            ELSE 'small' END AS label
FROM orders;`,
          hint: 'Test for NULL first.',
          why: 'Without the NULL branch, the missing total would fall into ELSE and be called "small".'
        },
        {
          task: 'Show each employee\'s name and the year they were hired, as a number.',
          tables: ['employees'],
          solution: `SELECT name, CAST(substr(hired, 1, 4) AS INTEGER) AS year
FROM employees;`,
          alt: [`SELECT name, CAST(strftime('%Y', hired) AS INTEGER) FROM employees;`],
          why: 'Take the first four characters of the ISO date and cast them.'
        }
      ]
    }
  });
})();
