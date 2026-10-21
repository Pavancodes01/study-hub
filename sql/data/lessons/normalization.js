(function () {
  const W = [[101, 'Ana', 'Lisbon', 'Pen', 2], [101, 'Ana', 'Lisbon', 'Notebook', 1], [102, 'Ana', 'Lisbon', 'Lamp', 1], [103, 'Ben', 'Berlin', 'Mug', 1],
    [104, 'Cara', 'Lisbon', 'Kettle', 1], [104, 'Cara', 'Lisbon', 'Lamp', 1], [105, 'Cara', 'Lisbon', 'Mug', 2], [106, 'Eli', 'Paris', 'Notebook', 1], [107, 'Ben', 'Berlin', 'Kettle', 1]];
  const WS = W.slice().sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0] - b[0]));
  const WQ = `SELECT o.id, c.name, c.city, p.name, oi.qty FROM orders o JOIN customers c ON c.id = o.customer_id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id`;

  registerLesson({
    slug: 'normalization',
    track: 'design',
    title: 'Normalization (1NF to 3NF)',
    one: 'Normalization means *each fact is stored once*. Repeated facts drift apart; a normalized design makes that impossible and joins the facts back when needed.',
    tables: ['orders', 'customers', 'order_items', 'products', 'enrollments', 'courses', 'students', 'employees'],
    idea: [
      'Imagine one wide spreadsheet: every order line with the customer\'s name and city typed in again. When Ana moves, you must update every one of her rows; miss one and the data contradicts itself. That is an **update anomaly**.',
      'Normal forms are rules that remove such repetition step by step. In practice the goal of 3NF is simply: every non-key column depends on **the key, the whole key, and nothing but the key**.',
      'The sample shop already follows this: customer facts live in `customers`, product facts in `products`, and `orders`/`order_items` only store keys pointing to them. Joins rebuild the wide view on demand.'
    ],
    stages: [
      {
        title: 'Facts repeated in a wide table',
        chips: ['wide table', 'repeated facts', 'count copies'],
        sql: `WITH wide AS (
  SELECT o.id AS order_id, c.name AS customer, c.city, p.name AS product, oi.qty
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
)
SELECT customer, city, COUNT(*) AS copies
FROM wide
GROUP BY customer, city;`,
        steps: [
          { clause: 'wide table', hl: `SELECT o.id AS order_id, c.name AS customer, c.city, p.name AS product, oi.qty`, label: 'wide (as a spreadsheet would store it)', text: 'If this report **were** the stored table, every order line would carry the customer\'s name and city again.',
            cols: ['order_id', 'customer', 'city', 'product', 'qty'], rows: W, q: WQ },
          { clause: 'repeated facts', hl: 'GROUP BY customer, city', label: 'wide, grouped by customer', text: '"Ana lives in Lisbon" is stored 3 times, "Cara lives in Lisbon" 3 times. Changing a city means editing several rows, and a partial edit leaves contradictions.',
            rows: WS, g: [0, 0, 0, 1, 1, 2, 2, 2, 3], key: [1, 2], hot: [2] },
          { clause: 'count copies', hl: 'SELECT customer, city, COUNT(*) AS copies', label: 'copies of each fact', text: 'In the normalized design each of these facts is stored exactly **once**, in `customers`.', cols: ['customer', 'city', 'copies'], rows: [['Ana', 'Lisbon', 3], ['Ben', 'Berlin', 2], ['Cara', 'Lisbon', 3], ['Eli', 'Paris', 1]], g: null, key: [0], hot: [2] }
        ]
      }
    ],
    sections: [
      {
        name: 'The three anomalies',
        text: [
          [
            '**Update anomaly**: one fact in many rows; updating some but not all creates contradictions.',
            '**Insert anomaly**: you cannot record a fact without an unrelated one (a new product cannot be stored until someone orders it).',
            '**Delete anomaly**: deleting one fact destroys another (deleting Eli\'s only order would forget that Eli lives in Paris).'
          ]
        ]
      },
      {
        name: '1NF, 2NF, 3NF in plain words',
        text: [
          [
            '**1NF**: one value per cell, no repeating groups. Not `phones = \'123, 456\'` or columns `phone1, phone2, phone3`; use a separate `phones` table with one row per number.',
            '**2NF** (matters with composite keys): no column may depend on only **part** of the key. In `enrollments(student_id, course_id, grade)`, a `course_title` column would depend only on `course_id`, so it belongs in `courses`.',
            '**3NF**: no column may depend on another non-key column. `employees(dept_id, dept_name)` is wrong: dept_name depends on dept_id, not on the employee. Store it once in `departments`.',
            '**BCNF** tightens 3NF for tables with several overlapping candidate keys; rarely needed in interviews.'
          ]
        ]
      },
      {
        name: 'Rebuilding the view with joins',
        text: ['Each fact once, combined at query time. The course title is stored once and reused for every enrollment.'],
        sql: `SELECT s.name, c.title, e.grade
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN courses c ON c.id = e.course_id
WHERE c.title = 'SQL'
ORDER BY s.name;`,
        out: { cols: ['name', 'title', 'grade'], rows: [['Ivy', 'SQL', 90], ['Jon', 'SQL', 72], ['Lea', 'SQL', 88]] }
      },
      {
        name: 'When to denormalize',
        text: [
          'Normalize transactional (OLTP) data by default. Denormalize deliberately when reads dominate and joins are too expensive: analytics warehouses (star schemas with wide fact and dimension tables), cached counters (`orders_count` on customers), or search documents. Keep the normalized source of truth and update copies in a controlled way (triggers, jobs, materialized views).'
        ]
      }
    ],
    table: {
      head: ['Form', 'Rule', 'Typical violation'],
      rows: [
        ['1NF', 'atomic values, no repeating groups', '`tags = \'sql,java\'`'],
        ['2NF', '1NF + no partial dependency on a composite key', 'course title in enrollments'],
        ['3NF', '2NF + no transitive dependency', 'department name in employees']
      ]
    },
    pitfalls: [
      ['Comma-separated lists in a column', 'Cannot be indexed, joined or constrained. Use a child table.'],
      ['Copying lookup values into child rows', 'Copies drift. Store a foreign key instead.'],
      ['Over-normalizing', 'Splitting every attribute into its own table adds joins without removing redundancy.'],
      ['Denormalizing without a source of truth', 'Copies disagree and nobody knows which is right.']
    ],
    interview: [
      ['What is normalization and why do it?', ['Organising tables so each fact is stored once, eliminating update, insert and delete anomalies. It keeps data consistent and makes constraints enforceable.']],
      ['Explain 1NF, 2NF and 3NF.', ['1NF: atomic values, no repeating groups. 2NF: no non-key column depends on only part of a composite key. 3NF: no non-key column depends on another non-key column.']],
      ['When would you denormalize?', ['For read-heavy analytics or hot paths where joins are too costly, accepting redundancy and the work of keeping copies in sync.']]
    ],
    say: [
      'Each fact once: depends on the key, the whole key, nothing but the key.',
      'Redundancy causes update, insert and delete anomalies.',
      'Normalize OLTP; denormalize deliberately for reads.'
    ],
    checklist: [
      'Name the three anomalies with examples.',
      'Spot 1NF, 2NF and 3NF violations.',
      'Split a wide table into normalized tables.',
      'Argue when denormalization is worth it.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(DISTINCT c.city) AS cities, COUNT(*) AS n
FROM orders o
JOIN customers c ON c.id = o.customer_id;`,
          tables: ['orders', 'customers'],
          answer: { cols: ['cities', 'n'], rows: [[3, 7]] },
          why: 'In a wide orders table, three city facts would be spread over seven rows.'
        },
        {
          sql: `WITH wide AS (
  SELECT c.name, c.city FROM orders o JOIN customers c ON c.id = o.customer_id
)
SELECT COUNT(*) AS n FROM wide WHERE name = 'Ana';`,
          tables: ['orders', 'customers'],
          answer: { cols: ['n'], rows: [[2]] },
          why: 'In the wide version, moving Ana would require two updates.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM enrollments e
JOIN courses c ON c.id = e.course_id
WHERE c.title = 'SQL';`,
          tables: ['enrollments', 'courses'],
          answer: { cols: ['n'], rows: [[3]] },
          why: 'The title is stored once but used by three enrollments.'
        },
        {
          sql: `SELECT d.name, COUNT(e.id) AS staff
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY d.id;`,
          tables: ['departments', 'employees'],
          answer: { cols: ['name', 'staff'], rows: [['Engineering', 3], ['Sales', 3], ['Support', 1], ['Legal', 0]] },
          why: 'Legal exists as a fact even with no employees: no insert anomaly.'
        }
      ],
      fill: [
        {
          q: 'Look up the course title through its key.',
          sql: `SELECT e.student_id, c.title
FROM enrollments e
JOIN courses c ON c.id = e.[[course_id]]
WHERE e.student_id = 4;`,
          tables: ['enrollments', 'courses'],
          answer: { cols: ['student_id', 'title'], rows: [[4, 'SQL'], [4, 'Stats']] },
          why: 'The junction row stores only the key; the title lives in courses.'
        },
        {
          q: 'Students taking Java, through the junction table.',
          sql: `SELECT s.name
FROM students s
JOIN enrollments e ON e.student_id = s.[[id]]
WHERE e.course_id = 2;`,
          tables: ['students', 'enrollments'],
          answer: { cols: ['name'], rows: [['Ivy']] },
          why: 'enrollments.student_id references students.id.'
        }
      ],
      write: [
        {
          task: 'Rebuild the flat report from the normalized tables: order id, customer name, product name and quantity for every order line.',
          tables: ['orders', 'customers', 'order_items', 'products'],
          solution: `SELECT o.id, c.name, p.name AS product, oi.qty
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id;`,
          why: 'Normalized storage, denormalized view.'
        },
        {
          task: 'List the cities shared by more than one customer.',
          tables: ['customers'],
          solution: `SELECT city
FROM customers
WHERE city IS NOT NULL
GROUP BY city
HAVING COUNT(*) > 1;`,
          why: 'Berlin and Lisbon. In a stricter design, cities could become their own table.'
        }
      ]
    }
  });
})();
