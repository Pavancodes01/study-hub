(function () {
  const PC = ['id', 'name', 'category', 'price'];
  const P = [[1, 'Pen', 'office', 2.5], [2, 'Notebook', 'office', 6], [3, 'Mug', 'kitchen', 9], [4, 'Lamp', 'home', 30], [5, 'Kettle', 'kitchen', 25], [6, 'Desk', 'home', 150]];

  registerLesson({
    slug: 'select',
    track: 'basics',
    title: 'SELECT, columns and aliases',
    one: 'You write SELECT first, but the database runs it *almost last*: it first decides which rows exist (FROM, WHERE), then which columns to show.',
    tables: ['products', 'customers'],
    idea: [
      'A query describes the result you want, not the steps to get it. `SELECT name, price FROM products` means: take the rows of `products`, and for each one produce a row with `name` and `price`.',
      'SELECT can compute new columns from expressions (`price * 2`), and `AS` gives any column a name, called an **alias**.',
      'Because SELECT runs after WHERE, an alias defined in SELECT does not exist yet when WHERE runs. Keeping the logical order (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT) in your head explains most "why doesn\'t this work" moments.'
    ],
    stages: [
      {
        title: 'Computed columns',
        sql: `SELECT name, price, price * 2 AS double_price
FROM products;`,
        steps: [
          { clause: 'FROM', hl: 'FROM products', text: 'FROM picks the source: all six rows and all columns of `products`.', cols: PC, rows: P, q: 'SELECT * FROM products' },
          { clause: 'SELECT', hl: 'SELECT name, price, price * 2 AS double_price', text: 'SELECT builds the output row by row. `price * 2` is computed for each row, and `AS double_price` names the new column.',
            cols: ['name', 'price', 'double_price'], rows: P.map(r => [r[1], r[3], r[3] * 2]), hot: [2] }
        ]
      },
      {
        title: 'Aliases come late',
        sql: `SELECT name AS product, price
FROM products
WHERE price < 10;`,
        steps: [
          { clause: 'FROM', hl: 'FROM products', text: 'All products.', cols: PC, rows: P, q: 'SELECT * FROM products' },
          { clause: 'WHERE', hl: 'WHERE price < 10', text: 'WHERE runs before SELECT. It must use the real column `price`; writing `WHERE product = ...` here would fail because the alias does not exist yet.', m: '   ddd', q: 'SELECT * FROM products WHERE price < 10' },
          { clause: 'SELECT', hl: 'SELECT name AS product, price', text: 'Now `name` is output under its new name, `product`.', cols: ['product', 'price'], rows: [['Pen', 2.5], ['Notebook', 6], ['Mug', 9]], hot: [0] }
        ]
      }
    ],
    sections: [
      {
        name: 'SELECT * vs naming columns',
        text: [
          '`SELECT *` is fine for exploring. In application code, list the columns: the result stays stable when someone adds a column, less data travels over the network, and the reader sees what is used.'
        ]
      },
      {
        name: 'Expressions and literals',
        text: [
          'SELECT can contain any expression: arithmetic, string concatenation with `||`, function calls, constants. SQLite even allows SELECT without FROM.',
          'Integer division truncates in SQLite and PostgreSQL: `7 / 2` is 3. Use `7 / 2.0` or `CAST(x AS REAL)` for a decimal result.'
        ],
        sql: `SELECT 7 / 2 AS int_div,
       7 / 2.0 AS real_div,
       'SQL' || ' ' || 'rocks' AS text;`,
        out: { cols: ['int_div', 'real_div', 'text'], rows: [[3, 3.5, 'SQL rocks']] }
      },
      {
        name: 'Quoting names',
        text: [
          'Strings use single quotes: `\'Lisbon\'`. Identifiers (column and table names) that contain spaces or clash with keywords use double quotes: `"order"`, `"Customer Name"`. MySQL uses backticks instead.'
        ],
        sql: `SELECT name AS "Customer Name"
FROM customers
WHERE id = 1;`,
        out: { cols: ['Customer Name'], rows: [['Ana']] }
      }
    ],
    table: {
      head: ['Written order', 'Logical order'],
      rows: [['SELECT', 'FROM / JOIN'], ['FROM', 'WHERE'], ['WHERE', 'GROUP BY'], ['GROUP BY', 'HAVING'], ['HAVING', 'SELECT'], ['ORDER BY', 'ORDER BY'], ['LIMIT', 'LIMIT']]
    },
    pitfalls: [
      ['Using a SELECT alias in WHERE', 'WHERE runs first. Repeat the expression, or wrap the query in a subquery/CTE.'],
      ['Double quotes for strings', 'In standard SQL `"Lisbon"` is an identifier. Use single quotes for text.'],
      ['Integer division', '`5 / 2` is 2. Make one side a decimal.'],
      ['`SELECT *` in production code', 'Fragile and wasteful. Name the columns.']
    ],
    interview: [
      ['What is the logical order of a SELECT statement?', ['FROM and JOINs, WHERE, GROUP BY, HAVING, SELECT (with window functions), DISTINCT, ORDER BY, LIMIT/OFFSET. The optimiser may execute differently, but the result must be as if this order were followed.']],
      ['Why can ORDER BY use a SELECT alias but WHERE cannot?', ['ORDER BY is evaluated after SELECT, so the alias exists. WHERE is evaluated before SELECT.']],
      ['Why avoid SELECT *?', ['It returns columns you do not need, breaks when the schema changes, prevents index-only scans, and hides which data the code depends on.']]
    ],
    say: [
      'SQL is declarative: describe the result, not the steps.',
      'Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.',
      'Aliases are born in SELECT, so only ORDER BY can use them.'
    ],
    checklist: [
      'Recite the logical clause order.',
      'Add a computed column with an alias.',
      'Explain why WHERE cannot use a SELECT alias.',
      'Quote an identifier that contains a space.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT name, price * 2 AS twice
FROM products
WHERE id <= 2;`,
          tables: ['products'],
          answer: { cols: ['name', 'twice'], rows: [['Pen', 5], ['Notebook', 12]] },
          why: 'Only ids 1 and 2 pass WHERE; SELECT then doubles their prices.'
        },
        {
          sql: `SELECT 7 / 2 AS a, 7 / 2.0 AS b, 7 % 3 AS c;`,
          answer: { cols: ['a', 'b', 'c'], rows: [[3, 3.5, 1]] },
          why: 'Two integers divide as integers. `%` is the remainder.'
        },
        {
          sql: `SELECT name || ' (' || category || ')' AS label
FROM products
WHERE id = 3;`,
          tables: ['products'],
          answer: { cols: ['label'], rows: [['Mug (kitchen)']] },
          why: '`||` joins strings in standard SQL and SQLite.'
        },
        {
          sql: `SELECT price AS cost, name
FROM products
WHERE price > 100;`,
          tables: ['products'],
          answer: { cols: ['cost', 'name'], rows: [[150, 'Desk']] },
          why: 'Columns appear in the order you list them, under their aliases.'
        }
      ],
      fill: [
        {
          q: 'Rename the price column to cost.',
          sql: `SELECT name, price [[AS]] cost
FROM products
WHERE id = 1;`,
          tables: ['products'],
          answer: { cols: ['name', 'cost'], rows: [['Pen', 2.5]] },
          why: '`AS` introduces an alias (it is optional in most databases, but clearer).'
        },
        {
          q: 'Show the name and city of customer 2.',
          sql: `SELECT [[name, city|name,city]]
FROM customers
WHERE id = 2;`,
          tables: ['customers'],
          answer: { cols: ['name', 'city'], rows: [['Ben', 'Berlin']] },
          why: 'List columns separated by commas.'
        }
      ],
      write: [
        {
          task: 'Show every product\'s name, its price, and the price including 20% tax as price_with_tax.',
          tables: ['products'],
          solution: `SELECT name, price, price * 1.2 AS price_with_tax
FROM products;`,
          why: 'Any expression can become an output column.'
        },
        {
          task: 'Show the name and city of every customer.',
          tables: ['customers'],
          solution: `SELECT name, city
FROM customers;`,
          why: 'Pick exactly the columns you need.'
        }
      ]
    }
  });
})();
