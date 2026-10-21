(function () {
  const PC = ['id', 'name', 'category', 'price'];
  const P = [[1, 'Pen', 'office', 2.5], [2, 'Notebook', 'office', 6], [3, 'Mug', 'kitchen', 9], [4, 'Lamp', 'home', 30], [5, 'Kettle', 'kitchen', 25], [6, 'Desk', 'home', 150]];

  registerLesson({
    slug: 'where',
    track: 'basics',
    title: 'WHERE: AND, OR, IN, BETWEEN, LIKE',
    one: 'WHERE tests every row and keeps only those where the condition is *TRUE*. And `AND` binds tighter than `OR`.',
    tables: ['products', 'customers', 'employees', 'orders'],
    idea: [
      'WHERE runs right after FROM. It looks at one row at a time, evaluates the condition, and throws the row away unless the result is TRUE.',
      'Combine conditions with `AND`, `OR` and `NOT`. Shortcuts make common tests readable: `IN (...)` for a list, `BETWEEN a AND b` for an inclusive range, `LIKE` for patterns with `%` (any text) and `_` (one character).',
      '`AND` is evaluated before `OR`, just like × before + in maths. When you mix them, add parentheses.'
    ],
    stages: [
      {
        title: 'IN and BETWEEN',
        sql: `SELECT name, category, price
FROM products
WHERE category IN ('office', 'kitchen')
  AND price BETWEEN 5 AND 20;`,
        steps: [
          { clause: 'FROM', hl: 'FROM products', text: 'Six products.', cols: PC, rows: P, q: 'SELECT * FROM products' },
          { clause: 'WHERE', hl: ["WHERE category IN ('office', 'kitchen')", 'AND price BETWEEN 5 AND 20'], text: 'A row survives only if **both** parts are true. Pen is office but too cheap; Kettle is kitchen but too expensive; Lamp and Desk are the wrong category.',
            m: 'd  ddd', q: "SELECT * FROM products WHERE category IN ('office', 'kitchen') AND price BETWEEN 5 AND 20" },
          { clause: 'SELECT', hl: 'SELECT name, category, price', text: 'Two products remain. `BETWEEN 5 AND 20` includes both ends.', cols: ['name', 'category', 'price'], rows: [['Notebook', 'office', 6], ['Mug', 'kitchen', 9]] }
        ]
      },
      {
        title: 'AND before OR',
        sql: `SELECT name
FROM products
WHERE category = 'home' OR category = 'kitchen' AND price < 10;`,
        steps: [
          { clause: 'FROM', hl: 'FROM products', text: 'Six products.', cols: PC, rows: P, q: 'SELECT * FROM products' },
          { clause: 'WHERE', hl: "category = 'kitchen' AND price < 10", text: 'AND binds first, so this reads as `home OR (kitchen AND price < 10)`. Both home items pass whatever their price; of the kitchen items only the Mug does.',
            m: 'dd  d ', q: "SELECT * FROM products WHERE category = 'home' OR category = 'kitchen' AND price < 10" },
          { clause: 'SELECT', hl: 'SELECT name', text: 'If you meant "home or kitchen, under 10", write `(category = \'home\' OR category = \'kitchen\') AND price < 10`, which returns only the Mug.', cols: ['name'], rows: [['Mug'], ['Lamp'], ['Desk']] }
        ]
      }
    ],
    sections: [
      {
        name: 'LIKE patterns',
        text: [
          [
            '`%` matches any number of characters (including none); `_` matches exactly one.',
            '`LIKE \'A%\'` starts with A; `\'%son\'` ends with son; `\'_a%\'` has "a" as the second letter.',
            'Case sensitivity differs: SQLite and MySQL compare ASCII case-insensitively by default, PostgreSQL does not (use `ILIKE` there).',
            'A pattern that **starts** with `%` cannot use a normal index.'
          ]
        ],
        sql: `SELECT name
FROM customers
WHERE name LIKE '_a%'
ORDER BY name;`,
        out: { cols: ['name'], rows: [['Cara'], ['Fay']] }
      },
      {
        name: 'Comparing dates stored as text',
        text: [
          'SQLite stores dates as ISO-8601 text (`YYYY-MM-DD`), which sorts correctly as text. So `hired >= \'2021-01-01\'` works. Other databases have real DATE types with the same comparison syntax.'
        ],
        sql: `SELECT name, hired
FROM employees
WHERE hired BETWEEN '2020-01-01' AND '2020-12-31';`,
        out: { cols: ['name', 'hired'], rows: [['Noah', '2020-07-15'], ['Pia', '2020-02-01']] }
      }
    ],
    table: {
      head: ['Operator', 'Meaning', 'Example'],
      rows: [
        ['`=`, `<>` (or `!=`)', 'equal, not equal', "`status = 'shipped'`"],
        ['`<`, `<=`, `>`, `>=`', 'comparison', '`price >= 10`'],
        ['`IN (...)`', 'equals any in the list', "`city IN ('Lisbon', 'Paris')`"],
        ['`BETWEEN a AND b`', 'a ≤ x ≤ b (inclusive)', '`salary BETWEEN 60 AND 80`'],
        ['`LIKE`', 'pattern match', "`name LIKE 'K%'`"],
        ['`IS NULL`', 'value is missing', '`city IS NULL`']
      ]
    },
    pitfalls: [
      ['Mixing AND and OR without parentheses', 'AND binds tighter, which is rarely what you meant. Add parentheses.'],
      ['`BETWEEN` with timestamps', "`BETWEEN '2024-01-01' AND '2024-01-31'` misses times later on the 31st. Use `>= start AND < next_day`."],
      ['`NOT IN` and NULL', 'A NULL in the list (or a NULL column value) makes rows disappear. See the NULL lesson.'],
      ['Leading `%` in LIKE', 'Forces a full scan. Consider full-text search for "contains" queries.']
    ],
    interview: [
      ['Is BETWEEN inclusive?', ['Yes, on both ends: `x BETWEEN a AND b` means `x >= a AND x <= b`.']],
      ['What is the precedence of AND and OR?', ['NOT, then AND, then OR. `a OR b AND c` means `a OR (b AND c)`.']],
      ['How do you match a literal % in LIKE?', ['Use an escape character: `LIKE \'50\\%%\' ESCAPE \'\\\'`.']]
    ],
    say: [
      'WHERE keeps rows whose condition is TRUE.',
      'AND binds tighter than OR: use parentheses.',
      'BETWEEN is inclusive; LIKE uses % and _.'
    ],
    checklist: [
      'Rewrite an OR chain with IN.',
      'Predict a query mixing AND and OR.',
      'Write LIKE patterns for starts-with, ends-with, second letter.',
      'Filter a date range correctly.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT name
FROM employees
WHERE salary BETWEEN 60 AND 80
ORDER BY salary;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Quinn'], ['Rosa'], ['Pia']] },
          why: 'Both 60 and 80 are included.'
        },
        {
          sql: `SELECT name
FROM products
WHERE name LIKE '%e%'
ORDER BY name;`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Desk'], ['Kettle'], ['Notebook'], ['Pen']] },
          why: '`%e%` means "contains an e anywhere".'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM orders
WHERE status = 'shipped' OR status = 'pending' AND total > 20;`,
          tables: ['orders'],
          answer: { cols: ['n'], rows: [[5]] },
          why: 'Read as `shipped OR (pending AND total > 20)`. The pending order has a NULL total, so only the 5 shipped orders count.'
        },
        {
          sql: `SELECT name
FROM customers
WHERE city NOT IN ('Lisbon', 'Paris')
ORDER BY name;`,
          tables: ['customers'],
          answer: { cols: ['name'], rows: [['Ben'], ['Fay']] },
          why: 'Dev\'s NULL city makes the condition UNKNOWN, so Dev is not returned.'
        }
      ],
      fill: [
        {
          q: 'Orders that are pending or cancelled.',
          sql: `SELECT id
FROM orders
WHERE status [[IN]] ('pending', 'cancelled');`,
          tables: ['orders'],
          answer: { cols: ['id'], rows: [[103], [105]] },
          why: '`IN` checks membership in a list.'
        },
        {
          q: 'Products whose name starts with K.',
          sql: `SELECT name
FROM products
WHERE name [[LIKE]] 'K%';`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Kettle']] },
          why: '`K%`: a K followed by anything.'
        }
      ],
      write: [
        {
          task: 'List the names of employees hired on or after 2021-01-01 who earn less than 90.',
          tables: ['employees'],
          solution: `SELECT name
FROM employees
WHERE hired >= '2021-01-01' AND salary < 90;`,
          why: 'ISO date strings compare correctly as text.'
        },
        {
          task: 'List the ids of orders that are either shipped with a total above 20, or cancelled.',
          tables: ['orders'],
          solution: `SELECT id
FROM orders
WHERE (status = 'shipped' AND total > 20) OR status = 'cancelled';`,
          hint: 'Parentheses make the grouping explicit.',
          why: 'Group the shipped conditions together before OR-ing with cancelled.'
        }
      ]
    }
  });
})();
