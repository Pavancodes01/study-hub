(function () {
  registerLesson({
    slug: 'recursive',
    track: 'sub',
    title: 'Recursive CTEs',
    one: 'A recursive CTE starts from an *anchor* query, then *keeps feeding its own new rows back in* until a step adds nothing.',
    tables: ['employees'],
    idea: [
      '`WITH RECURSIVE` has two parts joined by `UNION ALL`: the **anchor** (the starting rows) and the **recursive step**, which references the CTE itself.',
      'Evaluation goes in rounds. Round 1 runs the step on the anchor rows; round 2 runs it on the rows round 1 produced; and so on. When a round produces no new rows, it stops. The result is everything produced along the way.',
      'This is how SQL walks hierarchies of unknown depth (org charts, categories, file trees, graphs) and generates series (numbers, dates).'
    ],
    stages: [
      {
        title: 'Counting to five',
        chips: ['anchor', 'recursive step', 'final SELECT'],
        sql: `WITH RECURSIVE n(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 5
)
SELECT i FROM n;`,
        steps: [
          { clause: 'anchor', hl: 'SELECT 1', label: 'n so far', text: 'The anchor produces the first row: 1.', cols: ['i'], rows: [[1]] },
          { clause: 'recursive step', hl: 'SELECT i + 1 FROM n WHERE i < 5', label: 'n so far', text: 'Round 1: the step sees only the newest row (1) and produces 2.', rows: [[1], [2]], m: ' n' },
          { clause: 'recursive step', hl: 'SELECT i + 1 FROM n WHERE i < 5', label: 'n so far', text: 'Rounds 2–4 add 3, 4 and 5, one per round.', rows: [[1], [2], [3], [4], [5]], m: '  nnn' },
          { clause: 'recursive step', hl: 'WHERE i < 5', label: 'n so far', text: 'Round 5: the newest row is 5 and `5 < 5` is false, so nothing new is produced. Recursion stops. Without the WHERE it would never end.', m: '' },
          { clause: 'final SELECT', hl: 'SELECT i FROM n;', label: 'result', text: 'The main query reads all rows produced.', rows: [[1], [2], [3], [4], [5]] }
        ]
      },
      {
        title: 'Walking the org chart',
        chips: ['anchor', 'recursive step', 'final SELECT'],
        sql: `WITH RECURSIVE chain(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, c.depth + 1
  FROM employees e JOIN chain c ON e.manager_id = c.id
)
SELECT name, depth FROM chain ORDER BY depth, name;`,
        steps: [
          { clause: 'anchor', hl: 'SELECT id, name, 0 FROM employees WHERE manager_id IS NULL', label: 'chain so far', text: 'Start at the top: the employee without a manager.', cols: ['id', 'name', 'depth'], rows: [[1, 'Mia', 0]], q: 'SELECT id, name, 0 FROM employees WHERE manager_id IS NULL' },
          { clause: 'recursive step', hl: 'FROM employees e JOIN chain c ON e.manager_id = c.id', label: 'chain so far', text: 'Round 1: everyone whose manager is Mia, at depth 1.',
            rows: [[1, 'Mia', 0], [2, 'Noah', 1], [3, 'Omar', 1], [4, 'Pia', 1], [7, 'Sam', 1], [8, 'Tara', 1]], m: ' nnnnn' },
          { clause: 'recursive step', hl: 'FROM employees e JOIN chain c ON e.manager_id = c.id', label: 'chain so far', text: 'Round 2: reports of the depth-1 people. Only Pia has any: Quinn and Rosa at depth 2.',
            rows: [[1, 'Mia', 0], [2, 'Noah', 1], [3, 'Omar', 1], [4, 'Pia', 1], [7, 'Sam', 1], [8, 'Tara', 1], [5, 'Quinn', 2], [6, 'Rosa', 2]], m: '      nn' },
          { clause: 'recursive step', hl: 'JOIN chain c ON e.manager_id = c.id', label: 'chain so far', text: 'Round 3: nobody reports to Quinn or Rosa, so no new rows, and the recursion ends. This works for any depth.', m: '' },
          { clause: 'final SELECT', hl: 'SELECT name, depth FROM chain ORDER BY depth, name;', label: 'result', text: 'The whole tree, level by level.', cols: ['name', 'depth'],
            rows: [['Mia', 0], ['Noah', 1], ['Omar', 1], ['Pia', 1], ['Sam', 1], ['Tara', 1], ['Quinn', 2], ['Rosa', 2]] }
        ]
      }
    ],
    sections: [
      {
        name: 'Generating a calendar',
        text: ['Series of dates are a classic use: fill gaps in reports by LEFT JOINing data onto every day.'],
        sql: `WITH RECURSIVE d(day) AS (
  SELECT '2024-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM d WHERE day < '2024-03-04'
)
SELECT day FROM d;`,
        out: { cols: ['day'], rows: [['2024-03-01'], ['2024-03-02'], ['2024-03-03'], ['2024-03-04']] }
      },
      {
        name: 'Building a path',
        text: ['Carry a string along to record the route from the root.'],
        sql: `WITH RECURSIVE chain(id, path) AS (
  SELECT id, name FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, c.path || ' > ' || e.name
  FROM employees e JOIN chain c ON e.manager_id = c.id
)
SELECT path FROM chain WHERE id IN (5, 6) ORDER BY path;`,
        out: { cols: ['path'], rows: [['Mia > Pia > Quinn'], ['Mia > Pia > Rosa']] }
      },
      {
        name: 'Stopping safely',
        text: [
          [
            'Always have a condition that eventually produces no rows.',
            'Data with cycles (A manages B manages A) loops forever with UNION ALL. Use `UNION` (removes repeated rows), track visited ids in a path, or cap the depth: `WHERE depth < 20`.',
            'Some databases have a safety limit (SQL Server: 100 levels by default).'
          ]
        ]
      }
    ],
    pitfalls: [
      ['No termination condition', 'Infinite recursion until a limit or out of memory.'],
      ['Cycles in the data', 'UNION ALL revisits the same rows forever. Track a path or use UNION.'],
      ['Forgetting RECURSIVE', 'PostgreSQL, SQLite and MySQL need `WITH RECURSIVE` (SQL Server does not).'],
      ['Aggregates in the recursive step', 'Not allowed in most databases. Aggregate in the final query.']
    ],
    interview: [
      ['How does a recursive CTE execute?', ['Run the anchor; then repeatedly run the recursive member on the rows produced by the previous iteration, appending the results, until an iteration returns no rows.']],
      ['How would you get all subordinates of a manager?', ['Anchor on that manager (or their direct reports) and join employees on `manager_id = chain.id` in the recursive step.']],
      ['How do you protect against cycles?', ['Keep a path of visited ids and stop when the next id is already in it, use UNION instead of UNION ALL, or limit the depth.']]
    ],
    say: [
      'Anchor + UNION ALL + recursive step, run in rounds until nothing new.',
      'Use it for hierarchies of unknown depth and for series.',
      'Always guarantee termination.'
    ],
    checklist: [
      'Generate 1..N.',
      'List a full org chart with depths.',
      'Generate a date range.',
      'Explain how to avoid infinite loops.'
    ],
    drills: {
      predict: [
        {
          sql: `WITH RECURSIVE n(i) AS (
  SELECT 1
  UNION ALL
  SELECT i * 2 FROM n WHERE i < 20
)
SELECT MAX(i) AS m, COUNT(*) AS c FROM n;`,
          answer: { cols: ['m', 'c'], rows: [[32, 6]] },
          why: '1, 2, 4, 8, 16, then 16 < 20 still allows 32. 32 < 20 is false, so it stops.'
        },
        {
          sql: `WITH RECURSIVE up(id, name, mid) AS (
  SELECT id, name, manager_id FROM employees WHERE name = 'Quinn'
  UNION ALL
  SELECT e.id, e.name, e.manager_id
  FROM employees e JOIN up ON e.id = up.mid
)
SELECT name FROM up;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Quinn'], ['Pia'], ['Mia']] },
          why: 'Walking upwards: Quinn → her manager Pia → Pia\'s manager Mia → Mia has none.'
        },
        {
          sql: `WITH RECURSIVE f(n, fact) AS (
  SELECT 1, 1
  UNION ALL
  SELECT n + 1, fact * (n + 1) FROM f WHERE n < 5
)
SELECT fact FROM f WHERE n = 5;`,
          answer: { cols: ['fact'], rows: [[120]] },
          why: 'Each round multiplies by the next n: 5! = 120.'
        },
        {
          sql: `WITH RECURSIVE chain(id, depth) AS (
  SELECT id, 0 FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, c.depth + 1 FROM employees e JOIN chain c ON e.manager_id = c.id
)
SELECT depth, COUNT(*) AS n FROM chain GROUP BY depth ORDER BY depth;`,
          tables: ['employees'],
          answer: { cols: ['depth', 'n'], rows: [[0, 1], [1, 5], [2, 2]] },
          why: 'One boss, five direct reports, two at the next level.'
        }
      ],
      fill: [
        {
          q: 'Generate 1, 2, 3.',
          sql: `WITH [[RECURSIVE]] n(i) AS (
  SELECT 1
  [[UNION ALL]]
  SELECT i + 1 FROM n WHERE i < 3
)
SELECT i FROM n;`,
          answer: { cols: ['i'], rows: [[1], [2], [3]] },
          why: 'RECURSIVE enables self-reference; UNION ALL joins anchor and step.'
        },
        {
          q: 'Everyone in Pia\'s branch.',
          sql: `WITH RECURSIVE chain(id, name) AS (
  SELECT id, name FROM employees WHERE name = 'Pia'
  UNION ALL
  SELECT e.id, e.name FROM employees e JOIN chain c ON e.manager_id = [[c.id]]
)
SELECT name FROM chain;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Pia'], ['Quinn'], ['Rosa']] },
          why: 'Each round finds people whose manager is someone already in the chain.'
        }
      ],
      write: [
        {
          task: 'Generate the seven days from 2024-03-01 to 2024-03-07, one per row.',
          solution: `WITH RECURSIVE d(day) AS (
  SELECT '2024-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM d WHERE day < '2024-03-07'
)
SELECT day FROM d;`,
          why: 'Start at the first day and add one day per round until the last.'
        },
        {
          task: 'List the names of everyone below Pia in the hierarchy (direct or indirect), not including Pia herself.',
          tables: ['employees'],
          solution: `WITH RECURSIVE sub(id, name) AS (
  SELECT id, name FROM employees WHERE manager_id = (SELECT id FROM employees WHERE name = 'Pia')
  UNION ALL
  SELECT e.id, e.name FROM employees e JOIN sub s ON e.manager_id = s.id
)
SELECT name FROM sub;`,
          hint: 'Anchor on Pia\'s direct reports.',
          why: 'Quinn and Rosa; the recursion would also pick up their reports if they had any.'
        }
      ]
    }
  });
})();
