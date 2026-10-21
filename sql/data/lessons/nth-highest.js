(function () {
  const SAL = [[120, 1], [95, 2], [95, 2], [80, 3], [70, 4], [60, 5], [55, 6], [50, 7]];

  registerLesson({
    slug: 'nth-highest',
    track: 'classic',
    title: 'Nth highest value',
    one: '"Second highest salary" hides a trap: *ties*. Rank the *distinct* values, or the answer depends on who happens to share a salary.',
    tables: ['employees', 'products'],
    idea: [
      'Salaries 120, 95, 95, 80…: the second highest **salary** is 95, but the second highest **row** is also 95 and the third row is 95 too. Most interviewers mean the Nth highest distinct value.',
      'Three standard answers: `DENSE_RANK()` (cleanest, generalises to "per department"), `LIMIT 1 OFFSET n-1` over DISTINCT values, or `MAX(...) WHERE value < (SELECT MAX(...))` for the second only.',
      'Also handle "there is no Nth value": the query should return NULL rather than an empty result, which a scalar subquery gives you for free.'
    ],
    stages: [
      {
        title: 'DENSE_RANK',
        chips: ['WINDOW (in CTE)', 'WHERE d = 2', 'SELECT DISTINCT'],
        sql: `WITH r AS (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS d
  FROM employees
)
SELECT DISTINCT salary FROM r WHERE d = 2;`,
        steps: [
          { clause: 'WINDOW (in CTE)', hl: 'DENSE_RANK() OVER (ORDER BY salary DESC) AS d', label: 'r', text: 'Every salary gets a dense rank. Both 95s share rank 2, and 80 is rank 3 (no gap).', cols: ['salary', 'd'], rows: SAL, hot: [1],
            q: 'SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) FROM employees' },
          { clause: 'WHERE d = 2', hl: 'WHERE d = 2', label: 'r', text: 'Keep rank 2: two rows, both 95.', m: 'd  ddddd' },
          { clause: 'SELECT DISTINCT', hl: 'SELECT DISTINCT salary', label: 'result', text: 'DISTINCT collapses them to the single answer: 95.', cols: ['salary'], rows: [[95]], m: '', hot: [] }
        ]
      },
      {
        title: 'MAX below the MAX',
        chips: ['subquery', 'WHERE', 'SELECT MAX'],
        sql: `SELECT MAX(salary) AS second
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);`,
        steps: [
          { clause: 'subquery', hl: '(SELECT MAX(salary) FROM employees)', label: 'subquery', text: 'The top salary is 120.', cols: ['MAX(salary)'], rows: [[120]], q: 'SELECT MAX(salary) FROM employees' },
          { clause: 'WHERE', hl: 'WHERE salary < (SELECT MAX(salary) FROM employees)', label: 'salaries', text: 'Remove everything equal to the top.', cols: ['salary'], rows: SAL.map(r => [r[0]]), m: 'd' },
          { clause: 'SELECT MAX', hl: 'SELECT MAX(salary) AS second', label: 'result', text: 'The maximum of what is left is the second highest value, ties handled automatically. It only generalises awkwardly to "third".', cols: ['second'], rows: [[95]], m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'LIMIT / OFFSET over distinct values',
        text: ['Wrap it in a scalar subquery so a missing Nth value comes back as NULL instead of no row.'],
        sql: `SELECT (SELECT DISTINCT salary
        FROM employees
        ORDER BY salary DESC
        LIMIT 1 OFFSET 2) AS third,
       (SELECT DISTINCT salary
        FROM employees
        ORDER BY salary DESC
        LIMIT 1 OFFSET 20) AS twenty_first;`,
        out: { cols: ['third', 'twenty_first'], rows: [[80, null]] }
      },
      {
        name: 'Nth highest per group',
        text: ['PARTITION BY makes the window version work per department, which the other approaches cannot do easily.'],
        sql: `WITH r AS (
  SELECT dept_id, salary, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS d
  FROM employees
  WHERE dept_id IS NOT NULL
)
SELECT DISTINCT dept_id, salary
FROM r
WHERE d = 2
ORDER BY dept_id;`,
        out: { cols: ['dept_id', 'salary'], rows: [[1, 95], [2, 70]] }
      }
    ],
    table: {
      head: ['Approach', 'Ties', 'Generalises to N', 'Per group'],
      rows: [
        ['`DENSE_RANK() = N`', 'correct', 'yes', 'yes (PARTITION BY)'],
        ['`DISTINCT ... LIMIT 1 OFFSET N-1`', 'correct', 'yes', 'no'],
        ['`MAX(x) WHERE x < (SELECT MAX(x))`', 'correct', 'only 2nd', 'with a correlated subquery'],
        ['`ORDER BY x DESC LIMIT 1 OFFSET 1` (no DISTINCT)', '**wrong**', 'yes', 'no']
      ]
    },
    pitfalls: [
      ['OFFSET without DISTINCT', 'Returns the second row, which may tie with the first.'],
      ['ROW_NUMBER instead of DENSE_RANK', 'Ties get different numbers; the "2nd" row may have the top value.'],
      ['Empty result when N is too large', 'Wrap in a scalar subquery to get NULL.'],
      ['Forgetting NULLs', 'NULL salaries are ignored by MAX but sort first/last with ORDER BY depending on the database.']
    ],
    interview: [
      ['How do you find the second highest salary?', ['`SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)`, or with DENSE_RANK: rank distinct salaries descending and pick rank 2.']],
      ['How do you generalise to the Nth?', ['`DENSE_RANK() OVER (ORDER BY salary DESC) = N` in a CTE, or `SELECT DISTINCT salary ... ORDER BY salary DESC LIMIT 1 OFFSET N-1` inside a scalar subquery so a missing value returns NULL.']],
      ['Why DENSE_RANK and not RANK?', ['With ties RANK skips numbers (1, 2, 2, 4), so rank 3 may not exist. DENSE_RANK numbers distinct values consecutively.']]
    ],
    say: [
      'Nth highest usually means Nth distinct value.',
      'DENSE_RANK handles ties and works per group.',
      'Wrap in a scalar subquery to return NULL when missing.'
    ],
    checklist: [
      'Write three solutions for the second highest.',
      'Return NULL when the Nth value does not exist.',
      'Find the Nth highest per group.',
      'Explain why OFFSET without DISTINCT is wrong.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 2;`,
          tables: ['employees'],
          answer: { cols: ['salary'], rows: [[80]] },
          why: 'Distinct values 120, 95, 80…: the third is 80.'
        },
        {
          sql: `SELECT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 2;`,
          tables: ['employees'],
          answer: { cols: ['salary'], rows: [[95]] },
          why: 'Without DISTINCT, the third row is Omar\'s 95.'
        },
        {
          sql: `SELECT (SELECT DISTINCT salary FROM employees
        ORDER BY salary DESC LIMIT 1 OFFSET 10) AS nth;`,
          tables: ['employees'],
          answer: { cols: ['nth'], rows: [[null]] },
          why: 'There is no 11th value; a scalar subquery yields NULL.'
        },
        {
          sql: `SELECT MAX(price) AS p
FROM products
WHERE price < (SELECT MAX(price) FROM products);`,
          tables: ['products'],
          answer: { cols: ['p'], rows: [[30]] },
          why: 'Below 150, the highest price is the Lamp\'s 30.'
        }
      ],
      fill: [
        {
          q: 'Third highest distinct salary.',
          sql: `WITH r AS (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary [[DESC]]) AS d
  FROM employees
)
SELECT DISTINCT salary FROM r WHERE d = [[3]];`,
          tables: ['employees'],
          answer: { cols: ['salary'], rows: [[80]] },
          why: 'Rank from the top and pick 3.'
        },
        {
          q: 'Second highest price, MAX style.',
          sql: `SELECT MAX(price) AS second
FROM products
WHERE price [[<]] (SELECT [[MAX]](price) FROM products);`,
          tables: ['products'],
          answer: { cols: ['second'], rows: [[30]] },
          why: 'Exclude the top value, then take the max of the rest.'
        }
      ],
      write: [
        {
          task: 'Return the third highest distinct salary as a single value.',
          tables: ['employees'],
          solution: `SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 2;`,
          alt: [`WITH r AS (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS d FROM employees) SELECT DISTINCT salary FROM r WHERE d = 3;`],
          why: '80.'
        },
        {
          task: 'For each department (ignore NULL), return dept_id and its second highest distinct salary; skip departments that do not have one.',
          tables: ['employees'],
          solution: `WITH r AS (
  SELECT dept_id, salary, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS d
  FROM employees
  WHERE dept_id IS NOT NULL
)
SELECT DISTINCT dept_id, salary
FROM r
WHERE d = 2;`,
          why: 'Engineering 95, Sales 70; Support has only one salary.'
        }
      ]
    }
  });
})();
