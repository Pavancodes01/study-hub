(function () {
  registerLesson({
    slug: 'retention',
    track: 'classic',
    title: 'Retention and cohorts',
    one: 'Group users by their *first* day (their cohort), then check whether they *came back* later. A LEFT JOIN keeps the users who did not.',
    tables: ['logins'],
    idea: [
      'Product interviews love this: "what share of users returned the day after signing up?" The recipe is always the same three steps.',
      '1) Find each user\'s **first activity** with `MIN(day)` per user: that is their cohort. 2) **LEFT JOIN** activity back on the condition you care about (the next day, within 7 days…). 3) **Count** per cohort: all users vs users with a match.',
      'The LEFT JOIN matters: users who never came back must still count in the denominator.'
    ],
    stages: [
      {
        title: 'Next-day retention by cohort',
        chips: ['first day (CTE)', 'LEFT JOIN next day', 'GROUP BY cohort'],
        sql: `WITH first AS (
  SELECT user_id, MIN(day) AS first_day
  FROM logins
  GROUP BY user_id
)
SELECT f.first_day,
       COUNT(*) AS users,
       COUNT(l.user_id) AS returned_next_day
FROM first f
LEFT JOIN logins l ON l.user_id = f.user_id
                  AND l.day = date(f.first_day, '+1 day')
GROUP BY f.first_day;`,
        steps: [
          { clause: 'first day (CTE)', hl: `SELECT user_id, MIN(day) AS first_day
  FROM logins
  GROUP BY user_id`, label: 'first', text: 'Each user\'s first login defines their cohort.', cols: ['user_id', 'first_day'], rows: [[1, '2024-03-01'], [2, '2024-03-01'], [3, '2024-03-02']],
            q: 'SELECT user_id, MIN(day) FROM logins GROUP BY user_id' },
          { clause: 'LEFT JOIN next day', hl: "LEFT JOIN logins l ON l.user_id = f.user_id\n                  AND l.day = date(f.first_day, '+1 day')", label: 'first + next-day login', text: 'Look for a login exactly one day after the first. User 1 has one (03-02); users 2 and 3 do not, and the LEFT JOIN keeps them with NULLs.',
            cols: ['f.user_id', 'f.first_day', 'l.user_id', 'l.day'], rows: [[1, '2024-03-01', 1, '2024-03-02'], [2, '2024-03-01', null, null], [3, '2024-03-02', null, null]], src: 'aabb', m: ' nn',
            q: "WITH first AS (SELECT user_id, MIN(day) AS first_day FROM logins GROUP BY user_id) SELECT f.user_id, f.first_day, l.user_id, l.day FROM first f LEFT JOIN logins l ON l.user_id = f.user_id AND l.day = date(f.first_day, '+1 day')" },
          { clause: 'GROUP BY cohort', hl: 'GROUP BY f.first_day', label: 'result', text: '`COUNT(*)` counts every cohort member; `COUNT(l.user_id)` counts only those who came back. The 03-01 cohort retained 1 of 2.',
            cols: ['first_day', 'users', 'returned_next_day'], rows: [['2024-03-01', 2, 1], ['2024-03-02', 1, 0]], src: null, m: '', hot: [1, 2] }
        ]
      },
      {
        title: 'New vs returning users per day',
        chips: ['first day', 'JOIN', 'GROUP BY day'],
        sql: `SELECT l.day,
       COUNT(*) AS active,
       SUM(CASE WHEN l.day = f.first_day THEN 1 ELSE 0 END) AS new_users
FROM logins l
JOIN (SELECT user_id, MIN(day) AS first_day FROM logins GROUP BY user_id) f
  ON f.user_id = l.user_id
GROUP BY l.day
ORDER BY l.day;`,
        steps: [
          { clause: 'first day', hl: '(SELECT user_id, MIN(day) AS first_day FROM logins GROUP BY user_id) f', label: 'f', text: 'First day per user.', cols: ['user_id', 'first_day'], rows: [[1, '2024-03-01'], [2, '2024-03-01'], [3, '2024-03-02']] },
          { clause: 'JOIN', hl: 'ON f.user_id = l.user_id', label: 'logins with first day', text: 'Every login now knows its user\'s first day; a login on that day is a new user.',
            cols: ['l.day', 'l.user_id', 'f.first_day', 'new?'], rows: [['2024-03-01', 1, '2024-03-01', 1], ['2024-03-01', 2, '2024-03-01', 1], ['2024-03-02', 1, '2024-03-01', 0], ['2024-03-02', 3, '2024-03-02', 1],
              ['2024-03-03', 1, '2024-03-01', 0], ['2024-03-03', 2, '2024-03-01', 0], ['2024-03-04', 2, '2024-03-01', 0], ['2024-03-05', 1, '2024-03-01', 0], ['2024-03-06', 1, '2024-03-01', 0]],
            g: [0, 0, 1, 1, 2, 2, 3, 4, 5], key: [0], hot: [3] },
          { clause: 'GROUP BY day', hl: 'GROUP BY l.day', label: 'result', text: 'Daily active users, and how many were brand new.', cols: ['day', 'active', 'new_users'],
            rows: [['2024-03-01', 2, 2], ['2024-03-02', 2, 1], ['2024-03-03', 2, 0], ['2024-03-04', 1, 0], ['2024-03-05', 1, 0], ['2024-03-06', 1, 0]], g: null, hot: [1, 2] }
        ]
      }
    ],
    sections: [
      {
        name: 'Retention as a rate',
        text: ['Multiply by 100.0 to avoid integer division.'],
        sql: `WITH first AS (SELECT user_id, MIN(day) AS first_day FROM logins GROUP BY user_id)
SELECT ROUND(100.0 * COUNT(l.user_id) / COUNT(*), 1) AS pct_next_day
FROM first f
LEFT JOIN logins l ON l.user_id = f.user_id AND l.day = date(f.first_day, '+1 day');`,
        out: { cols: ['pct_next_day'], rows: [[33.3]] }
      },
      {
        name: 'Variations',
        text: [
          [
            '"Returned within 7 days": `l.day > f.first_day AND l.day <= date(f.first_day, \'+7 day\')`, then `COUNT(DISTINCT l.user_id)` because several logins can match.',
            'Weekly cohorts: group by `strftime(\'%Y-%W\', first_day)`.',
            'A retention matrix (cohort × day offset): compute `julianday(l.day) - julianday(f.first_day)` as the offset and pivot with conditional aggregation.',
            '"Churned" users: no activity in the last N days, an anti-join or `MAX(day) < cutoff`.'
          ]
        ]
      }
    ],
    pitfalls: [
      ['INNER JOIN for the return check', 'Users who never returned disappear and retention looks like 100%.'],
      ['COUNT(*) for returners', 'Counts the NULL-padded rows too. Count a right-side column.'],
      ['Several matching logins in a window', 'Use COUNT(DISTINCT l.user_id).'],
      ['Cohorts at the edge of the data', 'Users who signed up yesterday cannot have 7-day retention yet; exclude incomplete cohorts.']
    ],
    interview: [
      ['How do you compute day-1 retention?', ['Find each user\'s first day (MIN per user), LEFT JOIN their activity on first_day + 1 day, and per cohort divide COUNT of matched users by COUNT of all users.']],
      ['DAU / WAU / MAU?', ['Distinct active users per day / week / month: `COUNT(DISTINCT user_id)` grouped by the period. The ratio DAU/MAU measures stickiness.']],
      ['How would you find users active on day 1 and day 3 but not day 2?', ['Self-join or EXISTS/NOT EXISTS checks on the logins table for each required day, or conditional aggregation per user with HAVING.']]
    ],
    say: [
      'Cohort = first activity date (MIN per user).',
      'LEFT JOIN the return condition so non-returners stay in the denominator.',
      'Count a right-side column (DISTINCT if several can match).'
    ],
    checklist: [
      'Compute each user\'s cohort.',
      'Compute next-day retention per cohort.',
      'Turn it into a percentage.',
      'Count DAU and new users per day.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(DISTINCT user_id) AS dau
FROM logins
WHERE day = '2024-03-03';`,
          tables: ['logins'],
          answer: { cols: ['dau'], rows: [[2]] },
          why: 'Users 1 and 2.'
        },
        {
          sql: `SELECT user_id, MIN(day) AS first_day
FROM logins
GROUP BY user_id
ORDER BY user_id;`,
          tables: ['logins'],
          answer: { cols: ['user_id', 'first_day'], rows: [[1, '2024-03-01'], [2, '2024-03-01'], [3, '2024-03-02']] },
          why: 'The cohort of each user.'
        },
        {
          sql: `WITH f AS (SELECT user_id, MIN(day) AS first_day FROM logins GROUP BY user_id)
SELECT COUNT(*) AS n
FROM f
WHERE EXISTS (SELECT 1 FROM logins l
              WHERE l.user_id = f.user_id
                AND l.day > f.first_day
                AND l.day <= date(f.first_day, '+2 day'));`,
          tables: ['logins'],
          answer: { cols: ['n'], rows: [[2]] },
          why: 'User 1 returned on 03-02, user 2 on 03-03; user 3 never returned.'
        },
        {
          sql: `SELECT COUNT(*) AS active_days
FROM (SELECT DISTINCT day FROM logins);`,
          tables: ['logins'],
          answer: { cols: ['active_days'], rows: [[6]] },
          why: 'Logins happened on 03-01 to 03-06.'
        }
      ],
      fill: [
        {
          q: 'Count only users who came back.',
          sql: `WITH first AS (SELECT user_id, MIN(day) AS first_day FROM logins GROUP BY user_id)
SELECT COUNT(*) AS users, COUNT([[l.user_id|l.day]]) AS returned
FROM first f
LEFT JOIN logins l ON l.user_id = f.user_id AND l.day = date(f.first_day, [['+1 day']]);`,
          tables: ['logins'],
          answer: { cols: ['users', 'returned'], rows: [[3, 1]] },
          why: 'COUNT of a right-side column skips the non-returners.'
        },
        {
          q: 'Daily active users.',
          sql: `SELECT day, COUNT([[DISTINCT]] user_id) AS dau
FROM logins
GROUP BY day
ORDER BY day;`,
          tables: ['logins'],
          answer: { cols: ['day', 'dau'], rows: [['2024-03-01', 2], ['2024-03-02', 2], ['2024-03-03', 2], ['2024-03-04', 1], ['2024-03-05', 1], ['2024-03-06', 1]] },
          why: 'DISTINCT guards against several logins by one user on a day.'
        }
      ],
      write: [
        {
          task: 'Show each day with its number of distinct active users, ordered by day.',
          tables: ['logins'],
          solution: `SELECT day, COUNT(DISTINCT user_id) AS dau
FROM logins
GROUP BY day
ORDER BY day;`,
          why: 'DAU per day.'
        },
        {
          task: 'Return the ids of users who were active on 2024-03-01 and came back on 2024-03-03.',
          tables: ['logins'],
          solution: `SELECT a.user_id
FROM logins a
JOIN logins b ON b.user_id = a.user_id AND b.day = '2024-03-03'
WHERE a.day = '2024-03-01';`,
          alt: [`SELECT user_id FROM logins WHERE day = '2024-03-01' INTERSECT SELECT user_id FROM logins WHERE day = '2024-03-03';`],
          why: 'Users 1 and 2.'
        }
      ]
    }
  });
})();
