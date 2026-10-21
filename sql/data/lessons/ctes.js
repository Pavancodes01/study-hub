(function () {
  const SP = [[1, 41], [2, 25], [3, 55], [5, 6]];
  const NM = { 1: 'Ana', 2: 'Ben', 3: 'Cara', 5: 'Eli' };
  const CTE = "SELECT customer_id, SUM(total) AS spent FROM orders WHERE status = 'shipped' GROUP BY customer_id";

  registerLesson({
    slug: 'ctes',
    track: 'sub',
    title: 'CTEs: WITH',
    one: 'A CTE gives a subquery a *name* at the top of the query. Read top to bottom like steps of a recipe instead of inside-out.',
    tables: ['orders', 'customers', 'employees', 'products'],
    idea: [
      '`WITH name AS (SELECT ...)` defines a temporary named result, a **common table expression**, that exists only for this one statement. The main query then uses it like a table.',
      'Several CTEs can be chained, each using the ones before it. This turns a deeply nested query into a sequence of small, named steps, and a CTE can be referenced more than once.',
      'A CTE is mostly about readability. Whether the database computes it once (materialises it) or inlines it like a subquery depends on the engine and version.'
    ],
    stages: [
      {
        title: 'Name a step, then use it',
        chips: ['WITH spend', 'FROM', 'JOIN', 'WHERE', 'SELECT'],
        sql: `WITH spend AS (
  SELECT customer_id, SUM(total) AS spent
  FROM orders
  WHERE status = 'shipped'
  GROUP BY customer_id
)
SELECT c.name, s.spent
FROM spend s
JOIN customers c ON c.id = s.customer_id
WHERE s.spent > 20;`,
        steps: [
          { clause: 'WITH spend', hl: `SELECT customer_id, SUM(total) AS spent
  FROM orders
  WHERE status = 'shipped'
  GROUP BY customer_id`, label: 'spend', text: 'The CTE is a complete query of its own: shipped revenue per customer. Its result gets the name `spend`.', cols: ['customer_id', 'spent'], rows: SP, q: CTE },
          { clause: 'FROM', hl: 'FROM spend s', label: 'spend as s', text: 'The main query reads `spend` exactly like a table.', cols: ['s.customer_id', 's.spent'], rows: SP, src: 'aa' },
          { clause: 'JOIN', hl: 'JOIN customers c ON c.id = s.customer_id', text: 'Attach the customer names.', cols: ['s.customer_id', 's.spent', 'c.name'], rows: SP.map(r => r.concat([NM[r[0]]])), src: 'aab' },
          { clause: 'WHERE', hl: 'WHERE s.spent > 20', text: 'Filter on the aggregated value, no HAVING needed, because in the main query `spent` is an ordinary column.', m: '   d' },
          { clause: 'SELECT', hl: 'SELECT c.name, s.spent', text: 'Three customers spent more than 20 on shipped orders.', cols: ['name', 'spent'], rows: [['Ana', 41], ['Ben', 25], ['Cara', 55]], src: 'ba', m: '' }
        ]
      },
      {
        title: 'Chained CTEs',
        chips: ['dept_avg', 'above', 'final SELECT'],
        sql: `WITH dept_avg AS (
  SELECT dept_id, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY dept_id
), above AS (
  SELECT e.name, e.dept_id
  FROM employees e
  JOIN dept_avg d ON d.dept_id = e.dept_id
  WHERE e.salary > d.avg_sal
)
SELECT dept_id, COUNT(*) AS above_avg
FROM above
GROUP BY dept_id;`,
        steps: [
          { clause: 'dept_avg', hl: `SELECT dept_id, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY dept_id`, label: 'dept_avg', text: 'Step 1: average salary per department (including the NULL group for Tara).', cols: ['dept_id', 'avg_sal'], rows: [[null, 50], [1, 103.333333], [2, 70], [3, 55]],
            q: 'SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id' },
          { clause: 'above', hl: `SELECT e.name, e.dept_id
  FROM employees e
  JOIN dept_avg d ON d.dept_id = e.dept_id
  WHERE e.salary > d.avg_sal`, label: 'above', text: 'Step 2 uses step 1: employees paid above their department\'s average. Tara\'s NULL department cannot join (`NULL = NULL` is not TRUE).', cols: ['name', 'dept_id'], rows: [['Mia', 1], ['Pia', 2]],
            q: 'WITH dept_avg AS (SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id) SELECT e.name, e.dept_id FROM employees e JOIN dept_avg d ON d.dept_id = e.dept_id WHERE e.salary > d.avg_sal' },
          { clause: 'final SELECT', hl: `SELECT dept_id, COUNT(*) AS above_avg
FROM above
GROUP BY dept_id`, label: 'result', text: 'The final query reads like the question: per department, how many are above average.', cols: ['dept_id', 'above_avg'], rows: [[1, 1], [2, 1]] }
        ]
      }
    ],
    sections: [
      {
        name: 'Reusing a CTE',
        text: ['A CTE can be referenced several times, which a subquery cannot do without repeating it.'],
        sql: `WITH c AS (
  SELECT category, COUNT(*) AS n
  FROM products
  GROUP BY category
)
SELECT category, n
FROM c
WHERE n = (SELECT MAX(n) FROM c)
ORDER BY category;`,
        out: { cols: ['category', 'n'], rows: [['home', 2], ['kitchen', 2], ['office', 2]] }
      },
      {
        name: 'CTE vs subquery vs temporary table vs view',
        text: [
          [
            '**Subquery**: inline, one use, nests deeply.',
            '**CTE**: named, top-down, reusable within one statement.',
            '**Temporary table**: survives for the session, can be indexed; good for very large intermediate results used by several statements.',
            '**View**: a stored, named query everyone can reuse.'
          ],
          'In PostgreSQL 12+ you can force or prevent computing a CTE once with `AS MATERIALIZED` / `AS NOT MATERIALIZED`.'
        ]
      }
    ],
    pitfalls: [
      ['Expecting a CTE to persist', 'It exists only for the single statement that defines it.'],
      ['Assuming a CTE is always computed once', 'Many engines inline it; heavy CTEs referenced twice may run twice.'],
      ['Comma vs WITH', 'Chain CTEs with commas after one `WITH`: `WITH a AS (...), b AS (...)`.'],
      ['Ordering inside a CTE', 'ORDER BY in a CTE does not order the final result; sort in the main query.']
    ],
    interview: [
      ['Why use a CTE?', ['Readability (named, top-down steps), reuse of the same intermediate result several times in one query, and recursion (WITH RECURSIVE).']],
      ['CTE vs temp table?', ['A CTE lives for one statement and is usually not indexed; a temporary table lives for the session, can be indexed and reused by several statements.']],
      ['Is a CTE faster than a subquery?', ['Not inherently. It is mainly for clarity; performance depends on whether the optimiser inlines or materialises it.']]
    ],
    say: [
      'A CTE names a subquery so the query reads top-down.',
      'CTEs can chain and be referenced more than once.',
      'They live for one statement only.'
    ],
    checklist: [
      'Rewrite a derived table as a CTE.',
      'Chain two CTEs.',
      'Reuse a CTE twice in one query.',
      'Explain CTE vs temporary table.'
    ],
    drills: {
      predict: [
        {
          sql: `WITH t AS (SELECT 1 AS x UNION ALL SELECT 2)
SELECT SUM(x) AS s FROM t;`,
          answer: { cols: ['s'], rows: [[3]] },
          why: 'The CTE holds two rows, 1 and 2.'
        },
        {
          sql: `WITH big AS (SELECT * FROM orders WHERE total >= 25)
SELECT COUNT(*) AS n, MIN(total) AS m FROM big;`,
          tables: ['orders'],
          answer: { cols: ['n', 'm'], rows: [[3, 25]] },
          why: 'Orders 102 (30), 104 (55) and 107 (25).'
        },
        {
          sql: `WITH a AS (SELECT id FROM customers WHERE city = 'Lisbon'),
     b AS (SELECT customer_id FROM orders)
SELECT COUNT(*) AS n
FROM a JOIN b ON b.customer_id = a.id;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['n'], rows: [[4]] },
          why: 'Ana and Cara have two orders each.'
        },
        {
          sql: `WITH s AS (SELECT dept_id, SUM(salary) AS total FROM employees GROUP BY dept_id)
SELECT dept_id FROM s ORDER BY total DESC LIMIT 1;`,
          tables: ['employees'],
          answer: { cols: ['dept_id'], rows: [[1]] },
          why: 'Engineering\'s payroll is 310.'
        }
      ],
      fill: [
        {
          q: 'Define and use a CTE.',
          sql: `[[WITH]] totals [[AS]] (
  SELECT customer_id, COUNT(*) AS n
  FROM orders
  GROUP BY customer_id
)
SELECT customer_id FROM [[totals]] WHERE n = 1;`,
          tables: ['orders'],
          answer: { cols: ['customer_id'], rows: [[5]] },
          why: '`WITH name AS (query)`, then refer to it by name.'
        },
        {
          q: 'Chain a second CTE.',
          sql: `WITH lisbon AS (SELECT id FROM customers WHERE city = 'Lisbon')[[,]]
     lisbon_orders AS (SELECT o.id FROM orders o JOIN lisbon l ON l.id = o.customer_id)
SELECT COUNT(*) AS n FROM lisbon_orders;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['n'], rows: [[4]] },
          why: 'Further CTEs follow after a comma; no second WITH.'
        }
      ],
      write: [
        {
          task: 'Using a CTE of total salary per department id, list the department ids whose total is above the average of those totals.',
          tables: ['employees'],
          solution: `WITH t AS (
  SELECT dept_id, SUM(salary) AS total
  FROM employees
  GROUP BY dept_id
)
SELECT dept_id
FROM t
WHERE total > (SELECT AVG(total) FROM t);`,
          why: 'The CTE is used twice: once to list, once to compute the average (156.25).'
        },
        {
          task: 'Using a CTE that counts orders per customer, return the highest number of orders any customer has (one value).',
          tables: ['orders'],
          solution: `WITH per AS (
  SELECT customer_id, COUNT(*) AS n
  FROM orders
  GROUP BY customer_id
)
SELECT MAX(n) AS most
FROM per;`,
          why: 'An aggregate of an aggregate needs two steps.'
        }
      ]
    }
  });
})();
