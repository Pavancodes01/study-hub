(function () {
  const ES = [['Mia', 120], ['Noah', 95], ['Omar', 95], ['Pia', 80], ['Quinn', 60], ['Rosa', 70], ['Sam', 55], ['Tara', 50]];
  const CU = [[1, 'Ana'], [2, 'Ben'], [3, 'Cara'], [4, 'Dev'], [5, 'Eli'], [6, 'Fay']];

  registerLesson({
    slug: 'subqueries',
    track: 'sub',
    title: 'Subqueries: scalar, IN and derived tables',
    one: 'A subquery is a query *inside* another. Depending on what it returns (one value, one column, a whole table) it can sit in WHERE, in FROM or in SELECT.',
    tables: ['employees', 'customers', 'orders', 'products'],
    idea: [
      'A **scalar** subquery returns exactly one value, so it can be used anywhere a value fits: `salary > (SELECT AVG(salary) FROM employees)`.',
      'A subquery that returns **one column of many rows** works with `IN`: `id IN (SELECT customer_id FROM orders)`.',
      'A subquery in FROM (a **derived table**) returns a whole table that the outer query treats like any other; it needs an alias. This lets you aggregate, then filter or join the aggregated result.'
    ],
    stages: [
      {
        title: 'Above the average',
        chips: ['subquery', 'FROM', 'WHERE', 'SELECT'],
        sql: `SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);`,
        steps: [
          { clause: 'subquery', hl: '(SELECT AVG(salary) FROM employees)', label: 'subquery result', text: 'The inner query does not depend on the outer one, so it can be computed once: 625 / 8 = 78.125.', cols: ['AVG(salary)'], rows: [[78.125]], q: 'SELECT AVG(salary) FROM employees' },
          { clause: 'FROM', hl: 'FROM employees', label: 'employees (name, salary)', text: 'The outer query reads employees.', cols: ['name', 'salary'], rows: ES, q: 'SELECT name, salary FROM employees' },
          { clause: 'WHERE', hl: 'WHERE salary > (SELECT AVG(salary) FROM employees)', text: 'Each row is compared with that one number, 78.125.', m: '    dddd', q: 'SELECT name, salary FROM employees WHERE salary > 78.125' },
          { clause: 'SELECT', hl: 'SELECT name, salary', text: 'Four employees earn more than average.', rows: ES.slice(0, 4), m: '' }
        ]
      },
      {
        title: 'IN a list from another table',
        chips: ['subquery', 'FROM', 'WHERE', 'SELECT'],
        sql: `SELECT name
FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE total > 20);`,
        steps: [
          { clause: 'subquery', hl: '(SELECT customer_id FROM orders WHERE total > 20)', label: 'subquery result', text: 'The inner query returns one column: the customers of orders over 20.', cols: ['customer_id'], rows: [[1], [3], [2]], q: 'SELECT customer_id FROM orders WHERE total > 20' },
          { clause: 'FROM', hl: 'FROM customers', label: 'customers (id, name)', text: 'All customers.', cols: ['id', 'name'], rows: CU, q: 'SELECT id, name FROM customers' },
          { clause: 'WHERE', hl: 'WHERE id IN', text: 'Keep a customer if its id is in that list. Unlike a join, a customer with two big orders still appears once.', m: '   ddd' },
          { clause: 'SELECT', hl: 'SELECT name', text: 'Ana, Ben and Cara.', cols: ['name'], rows: [['Ana'], ['Ben'], ['Cara']], m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'Derived tables: aggregate, then filter',
        text: ['The inner query builds a small table; the outer query treats it like a real one.'],
        sql: `SELECT dept_id, avg_sal
FROM (SELECT dept_id, ROUND(AVG(salary), 1) AS avg_sal
      FROM employees
      GROUP BY dept_id) AS t
WHERE avg_sal > 60
ORDER BY dept_id;`,
        out: { cols: ['dept_id', 'avg_sal'], rows: [[1, 103.3], [2, 70]] }
      },
      {
        name: 'Scalar subqueries in SELECT',
        text: ['A scalar subquery may also produce a column. It must return at most one row; zero rows gives NULL, two rows is an error.'],
        sql: `SELECT name, salary,
       salary - (SELECT MIN(salary) FROM employees) AS above_min
FROM employees
WHERE dept_id = 3;`,
        out: { cols: ['name', 'salary', 'above_min'], rows: [['Sam', 55, 5]] }
      },
      {
        name: 'Subquery or join?',
        text: [
          [
            'Need columns from the other table? → JOIN.',
            'Only need to know whether a match exists? → IN / EXISTS: no duplicate rows.',
            'Need to aggregate first? → derived table or CTE.',
            'Modern optimisers often turn IN subqueries into semi-joins, so performance is usually similar.'
          ]
        ]
      }
    ],
    pitfalls: [
      ['Scalar subquery returning several rows', 'Error in most databases (SQLite silently takes the first). Make sure it returns one row, e.g. with an aggregate.'],
      ['`NOT IN (subquery)` where the subquery can return NULL', 'Returns nothing. Use NOT EXISTS.'],
      ['Derived table without an alias', 'Required in most databases.'],
      ['Joining instead of IN for a filter', 'Duplicates parent rows when there are several matches.']
    ],
    interview: [
      ['What kinds of subqueries are there?', ['Scalar (one value), row/column subqueries used with IN/ANY/ALL, table subqueries in FROM (derived tables), and correlated subqueries that reference the outer query.']],
      ['IN vs JOIN for filtering?', ['IN (a semi-join) returns each outer row at most once; a JOIN returns one row per match, so it can duplicate. Use JOIN only when you need columns from the other table.']],
      ['How do you find employees earning above the company average?', ['`WHERE salary > (SELECT AVG(salary) FROM employees)`.']]
    ],
    say: [
      'Scalar subquery = one value; IN subquery = one column; derived table = a whole table.',
      'IN filters without duplicating rows.',
      'Avoid NOT IN with nullable subqueries.'
    ],
    checklist: [
      'Compare rows with an aggregate using a scalar subquery.',
      'Filter with IN (subquery).',
      'Aggregate in a derived table, then filter.',
      'Choose between subquery and join.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT name
FROM products
WHERE price = (SELECT MAX(price) FROM products);`,
          tables: ['products'],
          answer: { cols: ['name'], rows: [['Desk']] },
          why: 'The inner query returns 150.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE city = 'Berlin');`,
          tables: ['orders', 'customers'],
          answer: { cols: ['n'], rows: [[2]] },
          why: 'Berliners are Ben and Fay; only Ben has orders (103, 107).'
        },
        {
          sql: `SELECT (SELECT COUNT(*) FROM orders)
     - (SELECT COUNT(DISTINCT customer_id) FROM orders) AS extra;`,
          tables: ['orders'],
          answer: { cols: ['extra'], rows: [[3]] },
          why: '7 orders minus 4 distinct customers.'
        },
        {
          sql: `SELECT name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders)
ORDER BY name;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['name'], rows: [['Dev'], ['Fay']] },
          why: 'Safe here because `customer_id` is never NULL in orders.'
        }
      ],
      fill: [
        {
          q: 'Employees earning less than the average.',
          sql: `SELECT name
FROM employees
WHERE salary < (SELECT [[AVG]](salary) FROM employees);`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Quinn'], ['Rosa'], ['Sam'], ['Tara']] },
          why: 'Average is 78.125.'
        },
        {
          q: 'Products ever ordered more than one at a time.',
          sql: `SELECT name
FROM products
WHERE id [[IN]] (SELECT product_id FROM order_items WHERE qty > 1);`,
          tables: ['products', 'order_items'],
          answer: { cols: ['name'], rows: [['Pen'], ['Mug']] },
          why: '`IN` tests membership in the subquery\'s column.'
        }
      ],
      write: [
        {
          task: 'List the names of products priced above the average product price.',
          tables: ['products'],
          solution: `SELECT name
FROM products
WHERE price > (SELECT AVG(price) FROM products);`,
          why: 'The average is about 37.08; only the Desk is above it.'
        },
        {
          task: 'List the names of customers who ordered a Lamp (each once).',
          tables: ['customers', 'orders', 'order_items', 'products'],
          solution: `SELECT name
FROM customers
WHERE id IN (SELECT o.customer_id
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             JOIN products p ON p.id = oi.product_id
             WHERE p.name = 'Lamp');`,
          why: 'IN returns each customer once even if they bought several lamps.'
        }
      ]
    }
  });
})();
