(function () {
  const SS = [[50, 1, 8], [55, 2, 8], [60, 3, 8], [70, 4, 8], [80, 5, 8], [95, 6, 8], [95, 7, 8], [120, 8, 8]];

  registerLesson({
    slug: 'median',
    track: 'classic',
    title: 'Median without a median function',
    one: 'The median is the *middle* value: sort, then take the middle row, or the *average of the two middle rows* when the count is even.',
    tables: ['employees', 'products', 'orders', 'enrollments'],
    idea: [
      'Averages are pulled by outliers; the median is not. Many databases have `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` (PostgreSQL, Oracle, SQL Server), but SQLite and MySQL do not, and interviewers like to see it built by hand.',
      'Number the sorted rows with `ROW_NUMBER()` and count them with `COUNT(*) OVER ()`. With integer division, `(n + 1) / 2` and `(n + 2) / 2` are the two middle positions for an even n, and the **same** position for an odd n.',
      'Average the values at those positions. With `PARTITION BY` the same query gives a median per group.'
    ],
    stages: [
      {
        title: 'Median salary',
        chips: ['WINDOW (in CTE)', 'WHERE middle rows', 'SELECT AVG'],
        sql: `WITH o AS (
  SELECT salary,
         ROW_NUMBER() OVER (ORDER BY salary) AS rn,
         COUNT(*) OVER () AS n
  FROM employees
)
SELECT AVG(salary) AS median
FROM o
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);`,
        steps: [
          { clause: 'WINDOW (in CTE)', hl: `ROW_NUMBER() OVER (ORDER BY salary) AS rn,
         COUNT(*) OVER () AS n`, label: 'o', text: 'Sorted salaries, each with its position and the total count, 8.', cols: ['salary', 'rn', 'n'], rows: SS, hot: [1, 2],
            q: 'SELECT salary, ROW_NUMBER() OVER (ORDER BY salary), COUNT(*) OVER () FROM employees' },
          { clause: 'WHERE middle rows', hl: 'WHERE rn IN ((n + 1) / 2, (n + 2) / 2)', label: 'o', text: 'n = 8 is even: (9 / 2) = 4 and (10 / 2) = 5 in integer division. The 4th and 5th values are the middle pair.', m: 'ddd  ddd', hot: [] },
          { clause: 'SELECT AVG', hl: 'SELECT AVG(salary) AS median', label: 'result', text: '(70 + 80) / 2 = 75. The mean is 78.1, pulled up by Mia\'s 120.', cols: ['median'], rows: [[75]], m: '' }
        ]
      },
      {
        title: 'Median per department',
        chips: ['WINDOW (in CTE)', 'WHERE middle rows', 'GROUP BY'],
        sql: `WITH o AS (
  SELECT dept_id, salary,
         ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn,
         COUNT(*) OVER (PARTITION BY dept_id) AS n
  FROM employees
  WHERE dept_id IS NOT NULL
)
SELECT dept_id, AVG(salary) AS median
FROM o
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY dept_id;`,
        steps: [
          { clause: 'WINDOW (in CTE)', hl: 'ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn', label: 'o', text: 'Numbering and counting restart per department.', cols: ['dept_id', 'salary', 'rn', 'n'],
            rows: [[1, 95, 1, 3], [1, 95, 2, 3], [1, 120, 3, 3], [2, 60, 1, 3], [2, 70, 2, 3], [2, 80, 3, 3], [3, 55, 1, 1]], g: [0, 0, 0, 1, 1, 1, 2], key: [0], hot: [2, 3],
            q: 'SELECT dept_id, salary, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary), COUNT(*) OVER (PARTITION BY dept_id) FROM employees WHERE dept_id IS NOT NULL' },
          { clause: 'WHERE middle rows', hl: 'WHERE rn IN ((n + 1) / 2, (n + 2) / 2)', label: 'o', text: 'n = 3 is odd: both formulas give 2, so one middle row. n = 1 gives 1.', m: 'd d d', hot: [] },
          { clause: 'GROUP BY', hl: 'GROUP BY dept_id', label: 'result', text: 'Averaging a single value returns it unchanged.', cols: ['dept_id', 'median'], rows: [[1, 95], [2, 70], [3, 55]], g: null, m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'Why integer division does the work',
        text: [],
        sql: `SELECT (8 + 1) / 2 AS lo_even, (8 + 2) / 2 AS hi_even,
       (7 + 1) / 2 AS lo_odd,  (7 + 2) / 2 AS hi_odd;`,
        out: { cols: ['lo_even', 'hi_even', 'lo_odd', 'hi_odd'], rows: [[4, 5, 4, 4]] }
      },
      {
        name: 'Ignoring NULLs',
        text: ['Filter NULLs **before** numbering, otherwise they take positions in the sort.'],
        sql: `WITH o AS (
  SELECT total,
         ROW_NUMBER() OVER (ORDER BY total) AS rn,
         COUNT(*) OVER () AS n
  FROM orders
  WHERE total IS NOT NULL
)
SELECT AVG(total) AS median_total
FROM o
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);`,
        out: { cols: ['median_total'], rows: [[18]] }
      },
      {
        name: 'With a built-in function',
        text: [
          'PostgreSQL / Oracle / SQL Server: `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) FROM employees;` (CONT interpolates between the middle values, DISC picks an actual value). Recent SQLite builds also ship a `median()` extension, but you cannot rely on it everywhere.'
        ]
      }
    ],
    pitfalls: [
      ['RANK instead of ROW_NUMBER', 'Ties give equal ranks and the middle positions may not exist.'],
      ['Forgetting the even case', 'Taking only row n/2 is wrong for even counts.'],
      ['NULLs in the column', 'Filter them before numbering.'],
      ['Decimal division', 'In databases where `/` on integers is exact, `(n + 1) / 2` gives 4.5. Use integer division (`DIV`, `FLOOR`) there.']
    ],
    interview: [
      ['How do you compute a median in SQL without PERCENTILE_CONT?', ['Number rows with ROW_NUMBER() OVER (ORDER BY x), count with COUNT(*) OVER (), keep rows at positions (n+1)/2 and (n+2)/2 (integer division), and average them.']],
      ['Median vs mean?', ['The mean is the sum divided by the count and is sensitive to outliers; the median is the middle value and is robust, which is why it is used for incomes, latencies, prices.']],
      ['How would you compute the 90th percentile latency?', ['`PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY latency)` where available; otherwise ROW_NUMBER with n and pick position CEIL(0.9 × n), or use NTILE(10).']]
    ],
    say: [
      'Median = middle of the sorted list; average the two middles when even.',
      'ROW_NUMBER + COUNT(*) OVER () + integer division handles both cases.',
      'Filter NULLs before numbering.'
    ],
    checklist: [
      'Explain the (n+1)/2, (n+2)/2 trick.',
      'Compute a median for the whole table.',
      'Compute a median per group.',
      'Name the built-in percentile functions.'
    ],
    drills: {
      predict: [
        {
          sql: `WITH t(x) AS (VALUES (1), (3), (100))
SELECT ROUND(AVG(x), 1) AS mean FROM t;`,
          answer: { cols: ['mean'], rows: [[34.7]] },
          why: 'One outlier drags the mean far above the median, which is 3.'
        },
        {
          sql: `SELECT (8 + 1) / 2 AS lo, (8 + 2) / 2 AS hi, (7 + 1) / 2 AS lo7, (7 + 2) / 2 AS hi7;`,
          answer: { cols: ['lo', 'hi', 'lo7', 'hi7'], rows: [[4, 5, 4, 4]] },
          why: 'Even count: two positions. Odd count: the same position twice.'
        },
        {
          sql: `WITH o AS (
  SELECT price, ROW_NUMBER() OVER (ORDER BY price) AS rn, COUNT(*) OVER () AS n
  FROM products
)
SELECT AVG(price) AS median FROM o WHERE rn IN ((n + 1) / 2, (n + 2) / 2);`,
          tables: ['products'],
          answer: { cols: ['median'], rows: [[17]] },
          why: 'Prices 2.5, 6, 9, 25, 30, 150: the middle pair is 9 and 25.'
        },
        {
          sql: `WITH o AS (
  SELECT total, ROW_NUMBER() OVER (ORDER BY total) AS rn, COUNT(*) OVER () AS n
  FROM orders
  WHERE total IS NOT NULL
)
SELECT AVG(total) AS median FROM o WHERE rn IN ((n + 1) / 2, (n + 2) / 2);`,
          tables: ['orders'],
          answer: { cols: ['median'], rows: [[18]] },
          why: 'Totals 6, 9, 11, 25, 30, 55: (11 + 25) / 2.'
        }
      ],
      fill: [
        {
          q: 'Pick both middle rows.',
          sql: `WITH o AS (
  SELECT salary, ROW_NUMBER() OVER (ORDER BY salary) AS rn, COUNT(*) OVER () AS n
  FROM employees
)
SELECT AVG(salary) AS median
FROM o
WHERE rn IN ((n + 1) / 2, [[(n + 2) / 2|(n+2)/2]]);`,
          tables: ['employees'],
          answer: { cols: ['median'], rows: [[75]] },
          why: 'The second position covers even counts.'
        },
        {
          q: 'Median price per category.',
          sql: `WITH o AS (
  SELECT category, price,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY price) AS rn,
         COUNT(*) OVER ([[PARTITION BY category]]) AS n
  FROM products
)
SELECT category, AVG(price) AS median
FROM o
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY category;`,
          tables: ['products'],
          answer: { cols: ['category', 'median'], rows: [['home', 90], ['kitchen', 17], ['office', 4.25]] },
          why: 'The count must be per category too.'
        }
      ],
      write: [
        {
          task: 'Return the median order total, ignoring orders with no total.',
          tables: ['orders'],
          solution: `WITH o AS (
  SELECT total, ROW_NUMBER() OVER (ORDER BY total) AS rn, COUNT(*) OVER () AS n
  FROM orders
  WHERE total IS NOT NULL
)
SELECT AVG(total) AS median
FROM o
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);`,
          why: '18.'
        },
        {
          task: 'Return course_id and the median grade for each course, ignoring NULL grades.',
          tables: ['enrollments'],
          solution: `WITH o AS (
  SELECT course_id, grade,
         ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY grade) AS rn,
         COUNT(*) OVER (PARTITION BY course_id) AS n
  FROM enrollments
  WHERE grade IS NOT NULL
)
SELECT course_id, AVG(grade) AS median
FROM o
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY course_id;`,
          why: 'SQL 88, Java 85, Stats 95.'
        }
      ]
    }
  });
})();
