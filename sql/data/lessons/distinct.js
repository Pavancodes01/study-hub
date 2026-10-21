(function () {
  registerLesson({
    slug: 'distinct',
    track: 'basics',
    title: 'DISTINCT',
    one: 'DISTINCT removes duplicate *result rows*, comparing every selected column, and it treats all NULLs as equal.',
    tables: ['customers', 'employees', 'products', 'orders'],
    idea: [
      'Projecting columns often creates duplicates: six customers live in only four "cities" (counting NULL). `SELECT DISTINCT city` keeps one copy of each.',
      'DISTINCT works on the **whole row** of the result, not on the first column. `SELECT DISTINCT a, b` keeps each distinct (a, b) pair.',
      'It runs after SELECT and before ORDER BY. To remove duplicates the database must sort or hash all rows, so it is not free.'
    ],
    stages: [
      {
        title: 'Unique cities',
        sql: `SELECT DISTINCT city
FROM customers
ORDER BY city;`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers', label: 'customers (name, city)', text: 'Six customers.', cols: ['name', 'city'], rows: [['Ana', 'Lisbon'], ['Ben', 'Berlin'], ['Cara', 'Lisbon'], ['Dev', null], ['Eli', 'Paris'], ['Fay', 'Berlin']], q: 'SELECT name, city FROM customers' },
          { clause: 'SELECT', hl: 'SELECT DISTINCT city', text: 'Projecting only `city` leaves six values with repeats.', cols: ['city'], rows: [['Lisbon'], ['Berlin'], ['Lisbon'], [null], ['Paris'], ['Berlin']], q: 'SELECT city FROM customers' },
          { clause: 'DISTINCT', hl: 'DISTINCT', text: 'Second Lisbon and second Berlin are duplicates and are removed.', m: '  d  d' },
          { clause: 'ORDER BY', hl: 'ORDER BY city', text: 'Four distinct values. The NULL counts as one distinct value and sorts first in SQLite.', rows: [[null], ['Berlin'], ['Lisbon'], ['Paris']], m: '' }
        ]
      },
      {
        title: 'Distinct pairs',
        sql: `SELECT DISTINCT dept_id, salary
FROM employees
WHERE dept_id = 1;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (some columns)', text: 'All employees.', cols: ['name', 'dept_id', 'salary'],
            rows: [['Mia', 1, 120], ['Noah', 1, 95], ['Omar', 1, 95], ['Pia', 2, 80], ['Quinn', 2, 60], ['Rosa', 2, 70], ['Sam', 3, 55], ['Tara', null, 50]], q: 'SELECT name, dept_id, salary FROM employees' },
          { clause: 'WHERE', hl: 'WHERE dept_id = 1', text: 'Department 1 only.', m: '   ddddd' },
          { clause: 'SELECT', hl: 'SELECT DISTINCT dept_id, salary', text: 'Two columns are kept per row.', cols: ['dept_id', 'salary'], rows: [[1, 120], [1, 95], [1, 95]] },
          { clause: 'DISTINCT', hl: 'DISTINCT', text: '(1, 95) appears twice, so one copy goes. Noah and Omar became indistinguishable once their names were dropped.', m: '  d' }
        ]
      }
    ],
    sections: [
      {
        name: 'DISTINCT vs GROUP BY',
        text: [
          '`SELECT DISTINCT a, b FROM t` returns the same rows as `SELECT a, b FROM t GROUP BY a, b`. Use DISTINCT to remove duplicates; use GROUP BY when you also want aggregates per group.'
        ]
      },
      {
        name: 'COUNT(DISTINCT ...)',
        text: ['Counting unique values is one of the most common uses. NULL is not counted.'],
        sql: `SELECT COUNT(city) AS non_null,
       COUNT(DISTINCT city) AS unique_cities
FROM customers;`,
        out: { cols: ['non_null', 'unique_cities'], rows: [[5, 3]] }
      },
      {
        name: 'A DISTINCT that hides a bug',
        text: [
          'If a join unexpectedly duplicates rows, slapping DISTINCT on top hides the symptom and makes the query slower. Find out which join multiplies the rows (Join cardinality lesson) and fix it there.'
        ]
      }
    ],
    pitfalls: [
      ['`DISTINCT` applied to "just one column"', 'It always applies to the entire selected row.'],
      ['Using DISTINCT to patch duplicate join rows', 'Fix the join, or use EXISTS, instead of hiding the problem.'],
      ['`COUNT(DISTINCT a, b)`', 'Not allowed in SQLite/PostgreSQL. Count from a DISTINCT subquery.'],
      ['Expecting NULLs to be unique', 'DISTINCT treats NULLs as equal, so you get one NULL row.']
    ],
    interview: [
      ['DISTINCT vs GROUP BY?', ['Without aggregates they produce the same result and often the same plan. GROUP BY is needed for aggregates per group; DISTINCT is the clearer way to say "unique rows".']],
      ['How are NULLs handled by DISTINCT?', ['All NULLs are considered equal, so they collapse into one row. `COUNT(DISTINCT col)` ignores them.']],
      ['When is DISTINCT a code smell?', ['When it is used to remove duplicates created by a join that should have been a semi-join (EXISTS) or that is missing a condition.']]
    ],
    say: [
      'DISTINCT compares whole result rows.',
      'NULLs collapse into one under DISTINCT.',
      'Do not use DISTINCT to hide a bad join.'
    ],
    checklist: [
      'List the unique values of a column.',
      'Count unique values.',
      'Explain DISTINCT on two columns.',
      'Spot a DISTINCT that hides a join problem.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
          tables: ['orders'],
          answer: { cols: ['status'], rows: [['cancelled'], ['pending'], ['shipped']] },
          why: 'Seven orders but only three status values.'
        },
        {
          sql: `SELECT COUNT(DISTINCT customer_id) AS buyers
FROM orders;`,
          tables: ['orders'],
          answer: { cols: ['buyers'], rows: [[4]] },
          why: 'Customers 1, 2, 3 and 5 placed orders.'
        },
        {
          sql: `SELECT DISTINCT category, price > 10 AS pricey
FROM products
ORDER BY category, pricey;`,
          tables: ['products'],
          answer: { cols: ['category', 'pricey'], rows: [['home', 1], ['kitchen', 0], ['kitchen', 1], ['office', 0]] },
          why: 'Kitchen has one cheap and one pricey product, so it appears twice; both home items are pricey.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM (SELECT DISTINCT dept_id FROM employees);`,
          tables: ['employees'],
          answer: { cols: ['n'], rows: [[4]] },
          why: 'Three departments plus one NULL row.'
        }
      ],
      fill: [
        {
          q: 'Each product category once.',
          sql: `SELECT [[DISTINCT]] category
FROM products
ORDER BY category;`,
          tables: ['products'],
          answer: { cols: ['category'], rows: [['home'], ['kitchen'], ['office']] },
          why: 'DISTINCT drops the repeated categories.'
        },
        {
          q: 'How many different students are enrolled?',
          sql: `SELECT COUNT([[DISTINCT]] student_id) AS students
FROM enrollments;`,
          tables: ['enrollments'],
          answer: { cols: ['students'], rows: [[4]] },
          why: 'Six enrollments belong to four students.'
        }
      ],
      write: [
        {
          task: 'List each city that has customers, once, alphabetically, without NULL.',
          tables: ['customers'],
          solution: `SELECT DISTINCT city
FROM customers
WHERE city IS NOT NULL
ORDER BY city;`,
          why: 'Filter the NULL, then remove duplicates.'
        },
        {
          task: 'List the ids of products that have been ordered at least once (each id once).',
          tables: ['order_items'],
          solution: `SELECT DISTINCT product_id
FROM order_items;`,
          why: 'Several order lines share a product; DISTINCT keeps one.'
        }
      ]
    }
  });
})();
