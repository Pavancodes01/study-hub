(function () {
  const CO = [['Ana', 101, 11], ['Ana', 102, 30], ['Ben', 103, 9], ['Cara', 104, 55], ['Cara', 105, null], ['Eli', 106, 6], ['Ben', 107, 25]];
  const ITEMS = { 101: [1, 2], 102: [4], 103: [3], 104: [5, 4], 105: [3], 106: [2], 107: [5] };
  const EX = [];
  CO.forEach(r => ITEMS[r[1]].forEach(p => EX.push(r.concat([p]))));
  const BASE = 'FROM customers c JOIN orders o ON o.customer_id = c.id';
  const byName = rows => rows.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
  const EXS = byName(EX);
  const grp = rows => { const g = []; let k = -1, last = null; rows.forEach(r => { if (r[0] !== last) { k++; last = r[0]; } g.push(k); }); return g; };
  const UN = { 101: 3, 102: 1, 103: 1, 104: 2, 105: 2, 106: 1, 107: 1 };
  const PRE = byName(CO).map(r => r.concat([UN[r[1]]]));

  registerLesson({
    slug: 'join-cardinality',
    track: 'joins',
    title: 'Join cardinality and row explosion',
    one: 'A one-to-many join *repeats the parent row* for every child. Sum a parent column after that and you count it *several times*.',
    tables: ['customers', 'orders', 'order_items'],
    idea: [
      'Cardinality is "how many rows match on each side". Joining a parent to its children (one-to-many) returns one row per **child**, copying the parent\'s columns into each.',
      'That is exactly what you want when you list children. It is a bug when you then aggregate a parent value: an order with two line items has its `total` counted twice.',
      'The cure is to aggregate each child table **to the parent\'s grain** before joining (one row per order), or to avoid the extra join. Always ask: "what does one row represent after this join?"'
    ],
    stages: [
      {
        title: 'The double-counting bug',
        sql: `SELECT c.name, SUM(o.total) AS spent
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.name;`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers c', label: 'customers (name)', text: 'Customers.', cols: ['c.name'], rows: [['Ana'], ['Ben'], ['Cara'], ['Dev'], ['Eli'], ['Fay']], src: 'a', q: 'SELECT name FROM customers' },
          { clause: 'JOIN', hl: 'JOIN orders o ON o.customer_id = c.id', label: 'one row per order', text: 'After joining orders, one row = one order. Summing `total` now would be correct: Ana 41.',
            cols: ['c.name', 'o.id', 'o.total'], rows: CO, src: 'abb', q: 'SELECT c.name, o.id, o.total ' + BASE },
          { clause: 'JOIN', hl: 'JOIN order_items oi ON oi.order_id = o.id', label: 'one row per order LINE', text: 'Orders 101 and 104 have two lines each, so their rows are **copied**, total and all. The grain changed from "order" to "order line".',
            cols: ['c.name', 'o.id', 'o.total', 'oi.product_id'], rows: EX, src: 'abbb', m: 'hh   hh', q: 'SELECT c.name, o.id, o.total, oi.product_id ' + BASE + ' JOIN order_items oi ON oi.order_id = o.id' },
          { clause: 'GROUP BY', hl: 'GROUP BY c.name', text: 'Grouping by customer gathers the duplicated rows too.', rows: EXS, g: grp(EXS), m: 'hh   hh  ', key: [0] },
          { clause: 'SELECT', hl: 'SUM(o.total) AS spent', text: 'Ana: 11 + 11 + 30 = **52** (really 41). Cara: 55 + 55 = **110** (really 55). The sums are wrong only for multi-line orders, which makes this bug easy to miss.',
            cols: ['name', 'spent'], rows: [['Ana', 52], ['Ben', 34], ['Cara', 110], ['Eli', 6]], hot: [1], m: 'h h', g: null, src: 'ab' }
        ]
      },
      {
        title: 'Aggregate first, then join',
        sql: `SELECT c.name, SUM(o.total) AS spent, SUM(i.units) AS units
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN (SELECT order_id, SUM(qty) AS units
      FROM order_items GROUP BY order_id) i ON i.order_id = o.id
GROUP BY c.name;`,
        steps: [
          { clause: 'JOIN', hl: 'JOIN orders o ON o.customer_id = c.id', label: 'one row per order', text: 'Customers joined to orders: one row per order.', cols: ['c.name', 'o.id', 'o.total'], rows: CO, src: 'abb', q: 'SELECT c.name, o.id, o.total ' + BASE },
          { clause: 'JOIN', hl: `(SELECT order_id, SUM(qty) AS units
      FROM order_items GROUP BY order_id) i`, label: 'still one row per order', text: 'The subquery first squeezes order_items down to **one row per order** (units per order). Joining that keeps the grain at one row per order: no copies.',
            cols: ['c.name', 'o.id', 'o.total', 'i.units'], rows: CO.map(r => r.concat([UN[r[1]]])), src: 'abbb', hot: [3],
            q: 'SELECT c.name, o.id, o.total, i.units ' + BASE + ' JOIN (SELECT order_id, SUM(qty) AS units FROM order_items GROUP BY order_id) i ON i.order_id = o.id' },
          { clause: 'GROUP BY', hl: 'GROUP BY c.name', text: 'Group per customer.', rows: PRE, g: grp(PRE), key: [0], hot: [] },
          { clause: 'SELECT', hl: 'SUM(o.total) AS spent, SUM(i.units) AS units', text: 'Correct totals, and units as a bonus.', cols: ['name', 'spent', 'units'], rows: [['Ana', 41, 4], ['Ben', 34, 2], ['Cara', 55, 4], ['Eli', 6, 1]], g: null, hot: [1, 2], src: 'abb' }
        ]
      }
    ],
    sections: [
      {
        name: 'Predicting the row count',
        text: [
          [
            '**1 : 1** (order → its customer): row count unchanged.',
            '**1 : N** (order → its lines): one row per child; parents without children vanish (inner) or stay once (left).',
            '**N : M** through a junction table (students ↔ courses via enrollments): one row per junction row.',
            '**Two independent 1 : N joins** from the same parent (customer → orders and customer → addresses): rows multiply, orders × addresses per customer. This "fan trap" corrupts every aggregate.'
          ],
          'A quick check while developing: compare `COUNT(*)` and `COUNT(DISTINCT parent.id)` after each join.'
        ],
        sql: `SELECT COUNT(*) AS rows_after_join,
       COUNT(DISTINCT o.id) AS distinct_orders
FROM orders o
JOIN order_items oi ON oi.order_id = o.id;`,
        out: { cols: ['rows_after_join', 'distinct_orders'], rows: [[9, 7]] }
      },
      {
        name: 'When you only need existence',
        text: [
          'If the child table is only used to filter ("customers who bought a Lamp"), use `EXISTS` instead of a join. It never multiplies rows (Subqueries track).'
        ]
      }
    ],
    pitfalls: [
      ['Summing a parent column after joining children', 'Values are counted once per child. Aggregate children first.'],
      ['Two child tables joined to the same parent', 'Rows multiply (fan trap). Aggregate each child separately, then join.'],
      ['Fixing it with SUM(DISTINCT total)', 'Wrong when two different orders have the same total.'],
      ['Fixing it with DISTINCT on the whole result', 'Hides the problem and can drop legitimate duplicates.']
    ],
    interview: [
      ['Why can a join produce more rows than either table?', ['Each match produces a row. One-to-many joins repeat the "one" side per child; many-to-many joins produce every matching combination.']],
      ['How do you avoid double counting when aggregating across joins?', ['Aggregate each child table to the parent\'s key in a subquery or CTE, then join the pre-aggregated results; or use EXISTS for filters.']],
      ['What is a fan trap?', ['Joining one parent to two independent child tables, which multiplies child rows against each other and inflates aggregates.']]
    ],
    say: [
      'Know the grain: what one row means after each join.',
      'One-to-many joins copy the parent per child.',
      'Aggregate children to the parent\'s grain before joining.'
    ],
    checklist: [
      'Predict the row count after a 1:N join.',
      'Spot a double-counted SUM.',
      'Pre-aggregate in a subquery.',
      'Explain the fan trap.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(*) AS n
FROM orders o
JOIN order_items oi ON oi.order_id = o.id;`,
          tables: ['orders', 'order_items'],
          answer: { cols: ['n'], rows: [[9]] },
          why: 'One row per order line: 9 lines.'
        },
        {
          sql: `SELECT SUM(o.total) AS s
FROM orders o
JOIN order_items oi ON oi.order_id = o.id;`,
          tables: ['orders', 'order_items'],
          answer: { cols: ['s'], rows: [[202]] },
          why: 'The real sum is 136, but orders 101 (11) and 104 (55) are counted twice: 136 + 11 + 55 = 202.'
        },
        {
          sql: `SELECT COUNT(DISTINCT o.id) AS orders, COUNT(*) AS lines
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
WHERE c.name = 'Cara';`,
          tables: ['customers', 'orders', 'order_items'],
          answer: { cols: ['orders', 'lines'], rows: [[2, 3]] },
          why: 'Cara has orders 104 (two lines) and 105 (one line).'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id;`,
          tables: ['students', 'enrollments', 'courses'],
          answer: { cols: ['n'], rows: [[6]] },
          why: 'A many-to-many join through the junction table gives one row per enrollment.'
        }
      ],
      fill: [
        {
          q: 'Pre-aggregate the lines to one row per order.',
          sql: `SELECT o.id, o.total, i.units
FROM orders o
JOIN (SELECT order_id, SUM(qty) AS units
      FROM order_items
      GROUP BY [[order_id]]) i ON i.order_id = o.id
WHERE o.customer_id = 1;`,
          tables: ['orders', 'order_items'],
          answer: { cols: ['id', 'total', 'units'], rows: [[101, 11, 3], [102, 30, 1]] },
          why: 'Grouping by the join key makes the subquery one row per order.'
        },
        {
          q: 'Count orders, not lines, per customer.',
          sql: `SELECT c.name, COUNT([[DISTINCT]] o.id) AS orders
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.name;`,
          tables: ['customers', 'orders', 'order_items'],
          answer: { cols: ['name', 'orders'], rows: [['Ana', 2], ['Ben', 2], ['Cara', 2], ['Eli', 1]] },
          why: 'Counting distinct order ids undoes the duplication for a count (it does not fix sums).'
        }
      ],
      write: [
        {
          task: 'Show each customer\'s name with the correct total of their order totals and the total number of units they bought (only customers with orders).',
          tables: ['customers', 'orders', 'order_items'],
          solution: `SELECT c.name, SUM(o.total) AS spent, SUM(i.units) AS units
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN (SELECT order_id, SUM(qty) AS units FROM order_items GROUP BY order_id) i ON i.order_id = o.id
GROUP BY c.name;`,
          hint: 'Collapse order_items to one row per order first.',
          why: 'Joining pre-aggregated lines keeps one row per order, so order totals are not repeated.'
        },
        {
          task: 'Show each product name with its revenue: the sum of price × qty over all order lines (only products that sold).',
          tables: ['products', 'order_items'],
          solution: `SELECT p.name, SUM(p.price * oi.qty) AS revenue
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.id, p.name;`,
          why: 'Here one row per line is exactly the right grain: revenue is a line-level value.'
        }
      ]
    }
  });
})();
