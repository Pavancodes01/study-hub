(function () {
  const E = [['Mia', 1, 120], ['Noah', 1, 95], ['Omar', 1, 95], ['Pia', 2, 80], ['Quinn', 2, 60], ['Rosa', 2, 70], ['Sam', 3, 55], ['Tara', null, 50]];
  const R = [['Mia', 120, 1, 1, 1], ['Noah', 95, 2, 2, 2], ['Omar', 95, 3, 2, 2], ['Pia', 80, 4, 4, 3], ['Rosa', 70, 5, 5, 4], ['Quinn', 60, 6, 6, 5]];
  const RK = [['Mia', 1, 120, 1], ['Noah', 1, 95, 2], ['Omar', 1, 95, 2], ['Pia', 2, 80, 1], ['Rosa', 2, 70, 2], ['Quinn', 2, 60, 3], ['Sam', 3, 55, 1]];

  registerLesson({
    slug: 'ranking',
    track: 'win',
    title: 'ROW_NUMBER, RANK, DENSE_RANK and top-N per group',
    one: 'All three number rows in order. They differ only on *ties*: ROW_NUMBER never repeats, RANK repeats and *skips*, DENSE_RANK repeats and *does not skip*.',
    tables: ['employees', 'products', 'orders'],
    idea: [
      'Ranking functions need `ORDER BY` inside OVER: it defines what "first" means. Add `PARTITION BY` to restart the numbering in each group.',
      'With a tie (Noah and Omar both earn 95): ROW_NUMBER gives 2 and 3 (arbitrarily, unless you add a tie-breaker), RANK gives 2 and 2 and then jumps to 4, DENSE_RANK gives 2 and 2 and continues with 3.',
      'The single most common interview pattern: **top N per group**. Rank within each partition in a CTE, then keep `rank <= N` outside.'
    ],
    stages: [
      {
        title: 'Three ways to number',
        sql: `SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC, name) AS rn,
       RANK() OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS drnk
FROM employees
WHERE dept_id IN (1, 2);`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (some columns)', text: 'Eight employees.', cols: ['name', 'dept_id', 'salary'], rows: E, q: 'SELECT name, dept_id, salary FROM employees' },
          { clause: 'WHERE', hl: 'WHERE dept_id IN (1, 2)', text: 'Engineering and Sales.', m: '      dd' },
          { clause: 'WINDOW', hl: 'ROW_NUMBER() OVER (ORDER BY salary DESC, name)', text: 'Rows are ordered by salary. ROW_NUMBER counts 1, 2, 3… with no repeats; `name` decides Noah before Omar.',
            cols: ['name', 'salary', 'rn'], rows: R.map(r => r.slice(0, 3)), hot: [2], m: '', key: [1] },
          { clause: 'WINDOW', hl: 'RANK() OVER (ORDER BY salary DESC)', text: 'RANK gives ties the same number, then skips: 1, 2, 2, **4**. "Pia is 4th because three people earn more."',
            cols: ['name', 'salary', 'rn', 'rnk'], rows: R.map(r => r.slice(0, 4)), hot: [3] },
          { clause: 'WINDOW', hl: 'DENSE_RANK() OVER (ORDER BY salary DESC)', text: 'DENSE_RANK also shares ties but leaves no gap: 1, 2, 2, **3**. "Pia has the 3rd highest salary value."',
            cols: ['name', 'salary', 'rn', 'rnk', 'drnk'], rows: R, hot: [4] },
          { clause: 'SELECT', hl: 'SELECT name, salary', text: 'Same rows, three numberings.', hot: [], key: [] }
        ]
      },
      {
        title: 'Top 2 per department',
        chips: ['WINDOW (in CTE)', 'WHERE r <= 2', 'SELECT'],
        sql: `WITH ranked AS (
  SELECT name, dept_id, salary,
         RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r
  FROM employees
  WHERE dept_id IS NOT NULL
)
SELECT dept_id, name, salary
FROM ranked
WHERE r <= 2;`,
        steps: [
          { clause: 'WINDOW (in CTE)', hl: 'RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r', label: 'ranked', text: 'Numbering restarts in each department. In Engineering, Noah and Omar tie for 2nd.',
            cols: ['name', 'dept_id', 'salary', 'r'], rows: RK, g: [0, 0, 0, 1, 1, 1, 2], key: [1], hot: [3],
            q: 'SELECT name, dept_id, salary, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) FROM employees WHERE dept_id IS NOT NULL' },
          { clause: 'WHERE r <= 2', hl: 'WHERE r <= 2', text: 'Outside the CTE we can filter on the rank. Only Quinn (3rd in Sales) goes.', m: '     d' },
          { clause: 'SELECT', hl: 'SELECT dept_id, name, salary', text: 'Engineering returns three people because of the tie. Use ROW_NUMBER for exactly two, DENSE_RANK for the top two **salary values**.',
            cols: ['dept_id', 'name', 'salary'], rows: [[1, 'Mia', 120], [1, 'Noah', 95], [1, 'Omar', 95], [2, 'Pia', 80], [2, 'Rosa', 70], [3, 'Sam', 55]], g: [0, 0, 0, 1, 1, 2], key: [0], hot: [], m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'ROW_NUMBER for de-duplication',
        text: ['Keep one row per key, for example each customer\'s latest order:'],
        sql: `WITH r AS (
  SELECT id, customer_id, order_date,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn
  FROM orders
)
SELECT customer_id, id
FROM r
WHERE rn = 1
ORDER BY customer_id;`,
        out: { cols: ['customer_id', 'id'], rows: [[1, 102], [2, 107], [3, 105], [5, 106]] }
      }
    ],
    table: {
      head: ['Salaries', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'],
      rows: [['120', '1', '1', '1'], ['95', '2', '2', '2'], ['95', '3', '2', '2'], ['80', '4', '4', '3'], ['Use for', 'exactly N rows / dedupe', 'competition ranking', 'Nth distinct value']]
    },
    pitfalls: [
      ['ROW_NUMBER without a unique ORDER BY', 'Ties get arbitrary numbers that can change between runs. Add a tie-breaker.'],
      ['LIMIT for "top N per group"', 'LIMIT applies to the whole result. Use a ranking function with PARTITION BY.'],
      ['RANK when you need exactly N rows', 'Ties can return more than N rows.'],
      ['Filtering the rank in the same SELECT', 'Window results are not visible to WHERE. Use a CTE.']
    ],
    interview: [
      ['ROW_NUMBER vs RANK vs DENSE_RANK?', ['On ties: ROW_NUMBER assigns distinct numbers, RANK assigns equal numbers and leaves gaps after, DENSE_RANK assigns equal numbers without gaps.']],
      ['How do you get the top 3 earners per department?', ['`WITH r AS (SELECT ..., DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS k FROM employees) SELECT ... FROM r WHERE k <= 3` (choose the ranking function according to how ties should count).']],
      ['How do you delete duplicate rows keeping one?', ['Number duplicates with ROW_NUMBER() OVER (PARTITION BY the duplicate key ORDER BY id) and delete those with a number greater than 1.']]
    ],
    say: [
      'ROW_NUMBER never ties; RANK ties and skips; DENSE_RANK ties without skipping.',
      'Top N per group: rank in a CTE, filter outside.',
      'Always add a tie-breaker to ROW_NUMBER.'
    ],
    checklist: [
      'Fill in the tie table from memory.',
      'Write top-N per group.',
      'Keep the latest row per key.',
      'Choose a ranking function for a given tie rule.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS d
FROM employees
WHERE dept_id = 1
ORDER BY d, salary;`,
          tables: ['employees'],
          answer: { cols: ['salary', 'd'], rows: [[120, 1], [95, 2], [95, 2]] },
          why: 'The two 95s share rank 2.'
        },
        {
          sql: `SELECT name
FROM (SELECT name, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price) AS rn
      FROM products)
WHERE rn = 1
ORDER BY name;`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Lamp'], ['Mug'], ['Pen']] },
          why: 'The cheapest product in each category.'
        },
        {
          sql: `SELECT MAX(r) AS m
FROM (SELECT RANK() OVER (ORDER BY salary DESC) AS r FROM employees);`,
          tables: ['employees'],
          answer: { cols: ['m'], rows: [[8]] },
          why: 'RANK skips after the tie, so the last of 8 rows gets rank 8.'
        },
        {
          sql: `SELECT MAX(d) AS m
FROM (SELECT DENSE_RANK() OVER (ORDER BY salary DESC) AS d FROM employees);`,
          tables: ['employees'],
          answer: { cols: ['m'], rows: [[7]] },
          why: 'There are 7 distinct salary values.'
        }
      ],
      fill: [
        {
          q: 'Rank Engineering and Sales by distinct salary value.',
          sql: `SELECT name, [[DENSE_RANK]]() OVER (ORDER BY salary DESC) AS d
FROM employees
WHERE dept_id IN (1, 2);`,
          tables: ['employees'],
          answer: { cols: ['name', 'd'], rows: [['Mia', 1], ['Noah', 2], ['Omar', 2], ['Pia', 3], ['Rosa', 4], ['Quinn', 5]] },
          why: 'Pia is 3 here; RANK would give her 4.'
        },
        {
          q: 'Each customer\'s latest order.',
          sql: `WITH r AS (
  SELECT id, customer_id,
         ROW_NUMBER() OVER (PARTITION BY [[customer_id]] ORDER BY order_date DESC) AS rn
  FROM orders
)
SELECT id FROM r WHERE rn [[= 1|<= 1]];`,
          tables: ['orders'],
          answer: { cols: ['id'], rows: [[102], [107], [105], [106]] },
          why: 'Restart numbering per customer; the newest gets 1.'
        }
      ],
      write: [
        {
          task: 'Show the most expensive product in each category: category and product name.',
          tables: ['products'],
          solution: `WITH r AS (
  SELECT category, name, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
  FROM products
)
SELECT category, name
FROM r
WHERE rn = 1;`,
          why: 'Rank within each category, keep rank 1.'
        },
        {
          task: 'Show the two highest-paid employees in each department (ignore NULL departments; break ties by name): dept_id and name.',
          tables: ['employees'],
          solution: `WITH r AS (
  SELECT dept_id, name, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC, name) AS rn
  FROM employees
  WHERE dept_id IS NOT NULL
)
SELECT dept_id, name
FROM r
WHERE rn <= 2;`,
          why: 'ROW_NUMBER with a tie-breaker returns exactly two per department.'
        }
      ]
    }
  });
})();
