(function () {
  const LG = [[1, '2024-03-01'], [1, '2024-03-02'], [1, '2024-03-03'], [1, '2024-03-05'], [1, '2024-03-06'], [2, '2024-03-01'], [2, '2024-03-03'], [2, '2024-03-04'], [3, '2024-03-02']];
  const RN = [1, 2, 3, 4, 5, 1, 2, 3, 1];
  const GRP = ['2024-02-29', '2024-02-29', '2024-02-29', '2024-03-01', '2024-03-01', '2024-02-29', '2024-03-01', '2024-03-01', '2024-03-01'];
  const ISL = `WITH g AS (
  SELECT user_id, day,
         date(day, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) || ' days') AS grp
  FROM logins
)
SELECT user_id, MIN(day) AS start, MAX(day) AS finish, COUNT(*) AS days
FROM g
GROUP BY user_id, grp`;

  registerLesson({
    slug: 'gaps-islands',
    track: 'classic',
    title: 'Gaps and islands: streaks',
    one: 'In a run of consecutive days, *day minus row number* is the same for every row. Group by that difference and each run becomes one row.',
    tables: ['logins'],
    idea: [
      'An **island** is a run of consecutive values (login days 1, 2, 3); a **gap** is a missing stretch between islands. Questions like "longest streak", "sessions", "periods of downtime" are all gaps-and-islands problems.',
      'The trick: number the rows in order with ROW_NUMBER. Within a consecutive run, the date and the row number both go up by exactly 1, so `day - row_number` stays **constant**. When a day is skipped, the date jumps but the row number does not, so the difference changes.',
      'That constant is an island id. GROUP BY it to get each island\'s start, end and length. Gaps are easier still: compare each row with the next using LEAD.'
    ],
    stages: [
      {
        title: 'Islands of consecutive logins',
        chips: ['number rows', 'day minus number', 'GROUP BY island'],
        sql: ISL + ';',
        steps: [
          { clause: 'number rows', hl: 'ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day)', label: 'logins with row numbers', text: 'Number each user\'s logins in date order.', cols: ['user_id', 'day', 'rn'], rows: LG.map((r, i) => r.concat([RN[i]])), g: [0, 0, 0, 0, 0, 1, 1, 1, 2], key: [0], hot: [2] },
          { clause: 'day minus number', hl: "date(day, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) || ' days') AS grp", label: 'g', text: 'Subtract rn days from each date. User 1\'s first three days all give 02-29; after the skipped 03-04, the next two give 03-01. Same value = same island.',
            cols: ['user_id', 'day', 'rn', 'grp'], rows: LG.map((r, i) => r.concat([RN[i], GRP[i]])), g: [0, 0, 0, 1, 1, 2, 3, 3, 4], key: [3], hot: [3],
            q: `SELECT user_id, day, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day), date(day, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) || ' days') FROM logins` },
          { clause: 'GROUP BY island', hl: 'GROUP BY user_id, grp', label: 'result', text: 'One row per island with its first day, last day and length. User 1 has a 3-day and a 2-day streak.',
            cols: ['user_id', 'start', 'finish', 'days'], rows: [[1, '2024-03-01', '2024-03-03', 3], [1, '2024-03-05', '2024-03-06', 2], [2, '2024-03-01', '2024-03-01', 1], [2, '2024-03-03', '2024-03-04', 2], [3, '2024-03-02', '2024-03-02', 1]], g: null, key: [], hot: [3] }
        ]
      },
      {
        title: 'Finding the gaps',
        chips: ['LEAD next day', 'WHERE jump > 1', 'SELECT'],
        sql: `WITH n AS (
  SELECT user_id, day, LEAD(day) OVER (PARTITION BY user_id ORDER BY day) AS next_day
  FROM logins
)
SELECT user_id, day AS gap_after, next_day
FROM n
WHERE julianday(next_day) - julianday(day) > 1;`,
        steps: [
          { clause: 'LEAD next day', hl: 'LEAD(day) OVER (PARTITION BY user_id ORDER BY day) AS next_day', label: 'n', text: 'Each login next to the same user\'s following login.', cols: ['user_id', 'day', 'next_day'],
            rows: LG.map((r, i) => r.concat([['2024-03-02', '2024-03-03', '2024-03-05', '2024-03-06', null, '2024-03-03', '2024-03-04', null, null][i]])), g: [0, 0, 0, 0, 0, 1, 1, 1, 2], key: [0], hot: [2] },
          { clause: 'WHERE jump > 1', hl: 'WHERE julianday(next_day) - julianday(day) > 1', label: 'n', text: 'A jump of more than one day means at least one missing day in between. The last login of each user has no next day (NULL) and drops out.', m: 'dd ddd dd', hot: [] },
          { clause: 'SELECT', hl: 'SELECT user_id, day AS gap_after, next_day', label: 'result', text: 'User 1 missed 03-04; user 2 missed 03-02.', cols: ['user_id', 'gap_after', 'next_day'], rows: [[1, '2024-03-03', '2024-03-05'], [2, '2024-03-01', '2024-03-03']], g: null, m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'Longest streak per user',
        text: ['Islands, then the MAX of their lengths. A numeric julianday works as the island id just as well as a date.'],
        sql: `WITH g AS (
  SELECT user_id, julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM logins
), islands AS (
  SELECT user_id, COUNT(*) AS days FROM g GROUP BY user_id, grp
)
SELECT user_id, MAX(days) AS longest
FROM islands
GROUP BY user_id;`,
        out: { cols: ['user_id', 'longest'], rows: [[1, 3], [2, 2], [3, 1]] }
      },
      {
        name: 'The same trick on integers',
        text: ['Seat numbers, invoice numbers, ids: `x - ROW_NUMBER()` is constant within a run.'],
        sql: `WITH t(x) AS (VALUES (1), (2), (3), (7), (8), (10))
SELECT MIN(x) AS run_start, MAX(x) AS run_end
FROM (SELECT x, x - ROW_NUMBER() OVER (ORDER BY x) AS g FROM t)
GROUP BY g
ORDER BY run_start;`,
        out: { cols: ['run_start', 'run_end'], rows: [[1, 3], [7, 8], [10, 10]] }
      }
    ],
    pitfalls: [
      ['Duplicate dates per user', 'Two logins on one day break the arithmetic. De-duplicate first (SELECT DISTINCT user_id, day).'],
      ['Forgetting PARTITION BY', 'Numbering across users mixes their runs together.'],
      ['Comparing dates as text arithmetic', 'Use date functions (julianday, date(), date_diff) for differences.'],
      ['Using LAG alone for streak lengths', 'LAG finds where runs break; you still need to group the runs. The row-number trick does both.']
    ],
    interview: [
      ['How do you find consecutive login streaks?', ['Number each user\'s distinct login days with ROW_NUMBER, subtract that number (in days) from the date to get a constant per consecutive run, then GROUP BY user and that value to get start, end and length.']],
      ['How do you find gaps in a sequence?', ['Use LEAD (or LAG) to compare each value with the next and keep pairs where the difference is more than one step; or generate the full sequence and anti-join.']],
      ['Users active 3 days in a row?', ['Build the islands and keep users with an island of COUNT(*) >= 3, or check `LAG(day, 2)` equals day minus 2 days.']]
    ],
    say: [
      'Value minus row number is constant within a consecutive run.',
      'Group by that constant to get islands; LEAD finds gaps.',
      'De-duplicate days first.'
    ],
    checklist: [
      'Explain why day − row number is constant in a run.',
      'Compute every streak with start, end, length.',
      'Find the longest streak per user.',
      'List gaps with LEAD.'
    ],
    drills: {
      predict: [
        {
          sql: `WITH g AS (
  SELECT user_id, julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM logins
)
SELECT COUNT(*) AS islands
FROM (SELECT DISTINCT user_id, grp FROM g);`,
          tables: ['logins'],
          answer: { cols: ['islands'], rows: [[5]] },
          why: 'User 1 has two islands, user 2 two, user 3 one.'
        },
        {
          sql: `WITH g AS (
  SELECT user_id, julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM logins
)
SELECT MAX(n) AS longest
FROM (SELECT COUNT(*) AS n FROM g GROUP BY user_id, grp);`,
          tables: ['logins'],
          answer: { cols: ['longest'], rows: [[3]] },
          why: 'User 1\'s 03-01 to 03-03.'
        },
        {
          sql: `WITH t(x) AS (VALUES (1), (2), (3), (7), (8), (10))
SELECT MIN(x) AS s, MAX(x) AS e
FROM (SELECT x, x - ROW_NUMBER() OVER (ORDER BY x) AS g FROM t)
GROUP BY g
ORDER BY s;`,
          answer: { cols: ['s', 'e'], rows: [[1, 3], [7, 8], [10, 10]] },
          why: 'Differences: 0, 0, 0, 3, 3, 4. Three runs.'
        },
        {
          sql: `WITH t(x) AS (VALUES (1), (2), (3), (7), (8), (10))
SELECT x + 1 AS gap_start
FROM (SELECT x, LEAD(x) OVER (ORDER BY x) AS nx FROM t)
WHERE nx - x > 1;`,
          answer: { cols: ['gap_start'], rows: [[4], [9]] },
          why: 'After 3 the next is 7 (gap starts at 4); after 8 the next is 10 (gap at 9).'
        }
      ],
      fill: [
        {
          q: 'Turn runs of integers into groups.',
          sql: `WITH t(x) AS (VALUES (4), (5), (6), (9))
SELECT MIN(x) AS s, MAX(x) AS e
FROM (SELECT x, x - [[ROW_NUMBER()]] OVER (ORDER BY x) AS g FROM t)
GROUP BY [[g]];`,
          answer: { cols: ['s', 'e'], rows: [[4, 6], [9, 9]] },
          why: 'The difference is constant within a run; group by it.'
        },
        {
          q: 'Logins followed by a gap.',
          sql: `SELECT user_id, day
FROM (SELECT user_id, day, [[LEAD]](day) OVER (PARTITION BY user_id ORDER BY day) AS nxt FROM logins)
WHERE julianday(nxt) - julianday(day) > 1;`,
          tables: ['logins'],
          answer: { cols: ['user_id', 'day'], rows: [[1, '2024-03-03'], [2, '2024-03-01']] },
          why: 'Compare with the next login of the same user.'
        }
      ],
      write: [
        {
          task: 'For each user, return user_id and the length of their longest streak of consecutive login days.',
          tables: ['logins'],
          solution: `WITH g AS (
  SELECT user_id, julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM logins
), islands AS (
  SELECT user_id, COUNT(*) AS days FROM g GROUP BY user_id, grp
)
SELECT user_id, MAX(days) AS longest
FROM islands
GROUP BY user_id;`,
          why: '1 → 3, 2 → 2, 3 → 1.'
        },
        {
          task: 'Return the ids of users who logged in on at least 3 consecutive days.',
          tables: ['logins'],
          solution: `WITH g AS (
  SELECT user_id, julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM logins
)
SELECT DISTINCT user_id
FROM g
GROUP BY user_id, grp
HAVING COUNT(*) >= 3;`,
          why: 'Only user 1.'
        }
      ]
    }
  });
})();
