(function () {
  const SETUP = `CREATE TABLE signups (id INTEGER PRIMARY KEY, email TEXT);
INSERT INTO signups (email) VALUES ('a@x.io'), ('b@x.io'), ('A@x.io'), ('a@x.io'), ('c@x.io'), ('b@x.io');`;
  const S = [[1, 'a@x.io'], [2, 'b@x.io'], [3, 'A@x.io'], [4, 'a@x.io'], [5, 'c@x.io'], [6, 'b@x.io']];

  registerLesson({
    slug: 'duplicates',
    track: 'classic',
    title: 'Finding and removing duplicates',
    one: 'Find duplicates with *GROUP BY ... HAVING COUNT(*) > 1*. Remove them by keeping *one row per group* (the lowest id or ROW_NUMBER = 1) and deleting the rest.',
    tables: ['employees', 'customers', 'order_items'],
    idea: [
      'First define what "duplicate" means: same email? same email ignoring case? same (customer, product, day)? That definition becomes the GROUP BY key.',
      'To **find** them, group by the key and keep groups with more than one row. To see the individual extra rows, number them with `ROW_NUMBER() OVER (PARTITION BY key ORDER BY id)`: everything numbered above 1 is a duplicate.',
      'To **prevent** them, add a UNIQUE constraint (or a unique expression index such as `lower(email)`) after cleaning.'
    ],
    stages: [
      {
        title: 'Which emails are duplicated?',
        chips: ['table', 'GROUP BY', 'HAVING'],
        sql: SETUP + `
SELECT lower(email) AS email, COUNT(*) AS n
FROM signups
GROUP BY lower(email)
HAVING COUNT(*) > 1;`,
        steps: [
          { clause: 'table', hl: "INSERT INTO signups (email) VALUES ('a@x.io'), ('b@x.io'), ('A@x.io'), ('a@x.io'), ('c@x.io'), ('b@x.io');", label: 'signups', text: 'Six signups. "A@x.io" is the same address as "a@x.io" with different case.', cols: ['id', 'email'], rows: S },
          { clause: 'GROUP BY', hl: 'GROUP BY lower(email)', label: 'grouped by lower(email)', text: 'Grouping by the **normalised** email gathers all spellings together.',
            cols: ['id', 'email', 'lower(email)'], rows: [[1, 'a@x.io', 'a@x.io'], [3, 'A@x.io', 'a@x.io'], [4, 'a@x.io', 'a@x.io'], [2, 'b@x.io', 'b@x.io'], [6, 'b@x.io', 'b@x.io'], [5, 'c@x.io', 'c@x.io']], g: [0, 0, 0, 1, 1, 2], key: [2], hot: [2] },
          { clause: 'HAVING', hl: 'HAVING COUNT(*) > 1', label: 'result', text: 'Groups with more than one row are the duplicates.', cols: ['email', 'n'], rows: [['a@x.io', 3], ['b@x.io', 2]], g: null, key: [0], hot: [1] }
        ]
      },
      {
        title: 'Delete all but the first',
        chips: ['table', 'keep MIN(id)', 'DELETE', 'SELECT'],
        sql: SETUP + `
DELETE FROM signups
WHERE id NOT IN (SELECT MIN(id) FROM signups GROUP BY lower(email));
SELECT id, email FROM signups;`,
        steps: [
          { clause: 'table', hl: 'INSERT INTO signups', label: 'signups', text: 'The same six rows.', cols: ['id', 'email'], rows: S },
          { clause: 'keep MIN(id)', hl: 'SELECT MIN(id) FROM signups GROUP BY lower(email)', label: 'ids to keep', text: 'The subquery picks one survivor per email: the lowest id. (MIN(id) is never NULL, so NOT IN is safe here.)', cols: ['MIN(id)'], rows: [[1], [2], [5]] },
          { clause: 'DELETE', hl: 'DELETE FROM signups\nWHERE id NOT IN', label: 'signups', text: 'Every row whose id is not a survivor is deleted.', cols: ['id', 'email'], rows: S, m: '  dd d' },
          { clause: 'SELECT', hl: 'SELECT id, email FROM signups;', label: 'result', text: 'One row per address. Now add `CREATE UNIQUE INDEX ON signups(lower(email))` so it stays that way.', rows: [[1, 'a@x.io'], [2, 'b@x.io'], [5, 'c@x.io']], m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'Listing the extra rows with ROW_NUMBER',
        text: ['Useful to review before deleting, or when "which one to keep" depends on another column (newest, most complete).'],
        sql: SETUP + `
WITH r AS (
  SELECT id, email, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY id) AS rn
  FROM signups
)
SELECT id, email FROM r WHERE rn > 1 ORDER BY id;`,
        out: { cols: ['id', 'email'], rows: [[3, 'A@x.io'], [4, 'a@x.io'], [6, 'b@x.io']] }
      },
      {
        name: 'Duplicates across several columns',
        text: ['Group by every column that defines the duplicate.'],
        sql: `SELECT customer_id, status, COUNT(*) AS n
FROM orders
GROUP BY customer_id, status
HAVING COUNT(*) > 1;`,
        out: { cols: ['customer_id', 'status', 'n'], rows: [[1, 'shipped', 2]] }
      }
    ],
    pitfalls: [
      ['Not normalising the key', '"A@x.io" and "a@x.io " (trailing space) slip through. Use lower() and trim().'],
      ['DELETE with a self-referencing subquery in MySQL', 'MySQL forbids it directly; wrap the subquery in a derived table or use a JOIN delete.'],
      ['Deleting before reviewing', 'Run the SELECT version first and wrap the DELETE in a transaction.'],
      ['Cleaning without adding a constraint', 'The duplicates come back.']
    ],
    interview: [
      ['How do you find duplicate rows?', ['`SELECT key, COUNT(*) FROM t GROUP BY key HAVING COUNT(*) > 1`. To see each duplicate row, use ROW_NUMBER() OVER (PARTITION BY key ORDER BY id) and filter rn > 1.']],
      ['How do you delete duplicates keeping one?', ['`DELETE FROM t WHERE id NOT IN (SELECT MIN(id) FROM t GROUP BY key)`, or delete where ROW_NUMBER over the key is greater than 1.']],
      ['How do you prevent duplicates?', ['A UNIQUE constraint or unique index on the key (possibly an expression such as lower(email)), plus UPSERT in inserting code.']]
    ],
    say: [
      'Define the duplicate key first.',
      'GROUP BY key HAVING COUNT(*) > 1 finds them.',
      'Keep MIN(id) or ROW_NUMBER = 1, delete the rest, then add a UNIQUE constraint.'
    ],
    checklist: [
      'Find duplicates by one and by several columns.',
      'List the extra rows with ROW_NUMBER.',
      'Delete duplicates keeping the first.',
      'Prevent them with a unique index.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT salary, COUNT(*) AS n
FROM employees
GROUP BY salary
HAVING COUNT(*) > 1;`,
          tables: ['employees'],
          answer: { cols: ['salary', 'n'], rows: [[95, 2]] },
          why: 'Noah and Omar share 95.'
        },
        {
          sql: `SELECT city, COUNT(*) AS n
FROM customers
GROUP BY city
HAVING COUNT(*) > 1
ORDER BY city;`,
          tables: ['customers'],
          answer: { cols: ['city', 'n'], rows: [['Berlin', 2], ['Lisbon', 2]] },
          why: 'Two cities appear twice; Dev\'s NULL group has one row.'
        },
        {
          sql: `SELECT COUNT(*) - COUNT(DISTINCT product_id) AS extra
FROM order_items;`,
          tables: ['order_items'],
          answer: { cols: ['extra'], rows: [[4]] },
          why: '9 lines but only 5 distinct products: 4 repeats.'
        },
        {
          sql: `SELECT product_id, COUNT(*) AS n
FROM order_items
GROUP BY product_id
HAVING COUNT(*) > 1
ORDER BY product_id;`,
          tables: ['order_items'],
          answer: { cols: ['product_id', 'n'], rows: [[2, 2], [3, 2], [4, 2], [5, 2]] },
          why: 'Only the Pen (1) appears on a single line.'
        }
      ],
      fill: [
        {
          q: 'Cities with more than one customer.',
          sql: `SELECT city
FROM customers
GROUP BY city
[[HAVING]] COUNT(*) [[> 1|>= 2|>1]];`,
          tables: ['customers'],
          answer: { cols: ['city'], rows: [['Berlin'], ['Lisbon']] },
          why: 'Group-level filter on the count.'
        },
        {
          q: 'The extra employee in each salary tie.',
          sql: `WITH r AS (
  SELECT name, ROW_NUMBER() OVER ([[PARTITION BY]] salary ORDER BY id) AS rn
  FROM employees
)
SELECT name FROM r WHERE rn > 1;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Omar']] },
          why: 'Numbering restarts per salary; the second 95 gets 2.'
        }
      ],
      write: [
        {
          task: 'List the name and salary of every employee whose salary is shared with at least one other employee.',
          tables: ['employees'],
          solution: `SELECT name, salary
FROM employees
WHERE salary IN (SELECT salary FROM employees GROUP BY salary HAVING COUNT(*) > 1);`,
          alt: [`SELECT name, salary FROM (SELECT name, salary, COUNT(*) OVER (PARTITION BY salary) AS c FROM employees) WHERE c > 1;`],
          why: 'Noah and Omar.'
        },
        {
          task: 'List the name and city of every customer who shares a city with another customer.',
          tables: ['customers'],
          solution: `SELECT name, city
FROM customers
WHERE city IN (SELECT city FROM customers GROUP BY city HAVING COUNT(*) > 1);`,
          why: 'Ana, Ben, Cara and Fay.'
        }
      ]
    }
  });
})();
