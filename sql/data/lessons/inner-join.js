(function () {
  const OC = ['o.id', 'o.customer_id', 'o.status', 'o.total'];
  const O = [[101, 1, 'shipped', 11], [102, 1, 'shipped', 30], [103, 2, 'cancelled', 9], [104, 3, 'shipped', 55], [105, 3, 'pending', null], [106, 5, 'shipped', 6], [107, 2, 'shipped', 25]];
  const NAMES = { 1: 'Ana', 2: 'Ben', 3: 'Cara', 5: 'Eli' };
  const J = O.map(r => r.concat([r[1], NAMES[r[1]]]));
  const JQ = 'SELECT o.id, o.customer_id, o.status, o.total, c.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id';
  const T3 = [
    ['Ana', 'Lisbon', 101, 1, 2, 'Pen'], ['Ana', 'Lisbon', 101, 2, 1, 'Notebook'], ['Ana', 'Lisbon', 102, 4, 1, 'Lamp'], ['Ben', 'Berlin', 103, 3, 1, 'Mug'],
    ['Cara', 'Lisbon', 104, 5, 1, 'Kettle'], ['Cara', 'Lisbon', 104, 4, 1, 'Lamp'], ['Cara', 'Lisbon', 105, 3, 2, 'Mug'], ['Eli', 'Paris', 106, 2, 1, 'Notebook'], ['Ben', 'Berlin', 107, 5, 1, 'Kettle']
  ];
  const B = 'FROM customers c JOIN orders o ON o.customer_id = c.id';

  registerLesson({
    slug: 'inner-join',
    track: 'joins',
    title: 'INNER JOIN',
    one: 'A join pairs rows from two tables whenever the *ON condition is true*. Rows with no partner on the other side simply disappear.',
    tables: ['customers', 'orders', 'order_items', 'products'],
    idea: [
      'Data is split across tables to avoid repetition: an order stores `customer_id`, not the customer\'s name. A **join** puts it back together: for every order, find the customer whose `id` equals the order\'s `customer_id`.',
      'Conceptually, `A JOIN B ON cond` looks at every pair (a, b) and keeps the pairs where `cond` is TRUE. A row of A with no partner produces nothing; a row with three partners produces three rows.',
      '`JOIN` and `INNER JOIN` are the same thing. Joins chain: each new JOIN adds columns to the rows built so far.'
    ],
    stages: [
      {
        title: 'Orders with customer names',
        sql: `SELECT o.id, c.name, o.total
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'shipped';`,
        steps: [
          { clause: 'FROM', hl: 'FROM orders o', label: 'orders (alias o)', text: 'Start from orders. `o` is a short alias for the table.', cols: OC, rows: O, src: 'aaaa', q: 'SELECT id, customer_id, status, total FROM orders' },
          { clause: 'JOIN', hl: 'JOIN customers c ON c.id = o.customer_id', text: 'For each order, the customer with the matching id is attached. Every order has exactly one customer, so we still have 7 rows, now with the name.',
            cols: OC.concat(['c.id', 'c.name']), rows: J, src: 'aaaabb', q: JQ },
          { clause: 'WHERE', hl: "WHERE o.status = 'shipped'", text: 'Filtering happens on the joined rows, so it can use columns from either table.', m: '  d d', q: JQ + " WHERE o.status = 'shipped'" },
          { clause: 'SELECT', hl: 'SELECT o.id, c.name, o.total', text: 'Five shipped orders with their customer names. Dev and Fay never appeared: no order points to them.',
            cols: ['id', 'name', 'total'], rows: [[101, 'Ana', 11], [102, 'Ana', 30], [104, 'Cara', 55], [106, 'Eli', 6], [107, 'Ben', 25]], src: 'aba' }
        ]
      },
      {
        title: 'Chaining joins',
        sql: `SELECT c.name, p.name AS product, oi.qty
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE c.city = 'Lisbon';`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers c', label: 'customers', text: 'Six customers.', cols: ['c.id', 'c.name', 'c.city'], rows: [[1, 'Ana', 'Lisbon'], [2, 'Ben', 'Berlin'], [3, 'Cara', 'Lisbon'], [4, 'Dev', null], [5, 'Eli', 'Paris'], [6, 'Fay', 'Berlin']], src: 'aaa', q: 'SELECT id, name, city FROM customers' },
          { clause: 'JOIN', hl: 'JOIN orders o ON o.customer_id = c.id', label: 'after joining orders', text: 'Customers with orders are repeated once per order. Dev and Fay drop out: an inner join needs a partner.',
            cols: ['c.name', 'c.city', 'o.id'], rows: T3.filter((r, i) => i !== 1 && i !== 5).map(r => r.slice(0, 3)), src: 'aab', q: 'SELECT c.name, c.city, o.id ' + B },
          { clause: 'JOIN', hl: 'JOIN order_items oi ON oi.order_id = o.id', label: 'after joining order_items', text: 'Orders 101 and 104 each have two lines, so they split into two rows. Now there are 9.',
            cols: ['c.name', 'c.city', 'o.id', 'oi.product_id', 'oi.qty'], rows: T3.map(r => r.slice(0, 5)), src: 'aabbb', q: 'SELECT c.name, c.city, o.id, oi.product_id, oi.qty ' + B + ' JOIN order_items oi ON oi.order_id = o.id' },
          { clause: 'JOIN', hl: 'JOIN products p ON p.id = oi.product_id', label: 'after joining products', text: 'Each line gets its product name. A one-to-one lookup does not change the row count.',
            cols: ['c.name', 'c.city', 'o.id', 'oi.product_id', 'oi.qty', 'p.name'], rows: T3, src: 'aabbbb', hot: [5], q: 'SELECT c.name, c.city, o.id, oi.product_id, oi.qty, p.name ' + B + ' JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id' },
          { clause: 'WHERE', hl: "WHERE c.city = 'Lisbon'", text: 'Keep only Lisbon customers.', m: '   d   dd', hot: [] },
          { clause: 'SELECT', hl: 'SELECT c.name, p.name AS product, oi.qty', text: 'Everything Ana and Cara bought.', cols: ['name', 'product', 'qty'],
            rows: [['Ana', 'Pen', 2], ['Ana', 'Notebook', 1], ['Ana', 'Lamp', 1], ['Cara', 'Kettle', 1], ['Cara', 'Lamp', 1], ['Cara', 'Mug', 2]], src: 'abb', m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'ON, USING and aliases',
        text: [
          [
            '`ON a.x = b.y`: any condition, most often key = foreign key.',
            '`USING (col)`: shorthand when both tables have a column with the same name.',
            'Aliases (`orders o`) keep queries short and are required when a table appears twice.',
            'Always qualify columns (`o.total`) once you join; an unqualified name that exists in both tables is an error.'
          ]
        ]
      },
      {
        name: 'A join is a filtered pairing',
        text: [
          'You can picture `A JOIN B ON cond` as `A CROSS JOIN B WHERE cond`: all pairs, then keep the matching ones. Databases do not actually build every pair; they use hash joins, merge joins or index lookups.'
        ],
        sql: `SELECT e.name, d.name AS dept
FROM employees e, departments d
WHERE d.id = e.dept_id AND d.name = 'Sales'
ORDER BY e.name;`,
        out: { cols: ['name', 'dept'], rows: [['Pia', 'Sales'], ['Quinn', 'Sales'], ['Rosa', 'Sales']] }
      }
    ],
    pitfalls: [
      ['Forgetting the ON condition', 'You get a cross join: every row paired with every row.'],
      ['Ambiguous column names', 'Qualify columns with the table alias.'],
      ['Expecting all rows of a table to appear', 'An inner join drops rows without a match. Use LEFT JOIN to keep them.'],
      ['NATURAL JOIN', 'Joins on every same-named column, which breaks silently when a column is added. Avoid it.']
    ],
    interview: [
      ['What does an INNER JOIN return?', ['Every combination of rows from both tables for which the ON condition is TRUE. Rows without a match on the other side are not returned.']],
      ['How many rows can an inner join return?', ['Anywhere from 0 to |A| × |B|. For a key/foreign-key join it is the number of child rows that have a parent.']],
      ['How do databases execute joins?', ['Nested loops (often with an index on the inner table), hash join (build a hash table on one side, probe with the other), or merge join (both inputs sorted on the join key). The optimiser picks one based on sizes and indexes.']]
    ],
    say: [
      'A join keeps the pairs where ON is TRUE.',
      'Inner joins drop unmatched rows; one-to-many joins repeat rows.',
      'Qualify columns with aliases.'
    ],
    checklist: [
      'Join orders to customers by hand.',
      'Predict the row count of a chain of joins.',
      'Explain why Dev and Fay vanish.',
      'Name three join algorithms.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(*) AS n
FROM customers c
JOIN orders o ON o.customer_id = c.id;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['n'], rows: [[7]] },
          why: 'Every order has a customer, so there is one row per order.'
        },
        {
          sql: `SELECT e.name, d.name AS dept
FROM employees e
JOIN departments d ON d.id = e.dept_id
WHERE d.budget < 200
ORDER BY e.name;`,
          tables: ['employees', 'departments'],
          answer: { cols: ['name', 'dept'], rows: [['Sam', 'Support']] },
          why: 'Support (150) and Legal (100) are under 200, but Legal has no employees.'
        },
        {
          sql: `SELECT s.name, c.title
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN courses c ON c.id = e.course_id
WHERE e.grade >= 90
ORDER BY s.name;`,
          tables: ['enrollments', 'students', 'courses'],
          answer: { cols: ['name', 'title'], rows: [['Ivy', 'SQL'], ['Lea', 'Stats']] },
          why: 'Grades 90 and 95 qualify; Kai\'s NULL grade does not.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM employees e
JOIN departments d ON d.id = e.dept_id;`,
          tables: ['employees', 'departments'],
          answer: { cols: ['n'], rows: [[7]] },
          why: 'Tara has no department (NULL never equals anything), so she is not joined.'
        }
      ],
      fill: [
        {
          q: 'Who placed order 104?',
          sql: `SELECT c.name
FROM orders o
[[JOIN|INNER JOIN]] customers c [[ON]] c.id = o.customer_id
WHERE o.id = 104;`,
          tables: ['orders', 'customers'],
          answer: { cols: ['name'], rows: [['Cara']] },
          why: 'Join on the foreign key.'
        },
        {
          q: 'Products and quantities in order 101.',
          sql: `SELECT p.name, oi.qty
FROM order_items oi
JOIN products p ON p.id = oi.[[product_id]]
WHERE oi.order_id = 101;`,
          tables: ['order_items', 'products'],
          answer: { cols: ['name', 'qty'], rows: [['Pen', 2], ['Notebook', 1]] },
          why: 'The order line points to the product by `product_id`.'
        }
      ],
      write: [
        {
          task: 'Show each employee\'s name and their department name (only employees that have a department).',
          tables: ['employees', 'departments'],
          solution: `SELECT e.name, d.name AS dept
FROM employees e
JOIN departments d ON d.id = e.dept_id;`,
          why: 'An inner join leaves Tara out, as asked.'
        },
        {
          task: 'For order 104, list each product name and its line total (price × qty).',
          tables: ['order_items', 'products'],
          solution: `SELECT p.name, p.price * oi.qty AS line_total
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = 104;`,
          why: 'Columns from both tables can be combined in one expression.'
        }
      ]
    }
  });
})();
