(function () {
  const ED = [['Mia', 1], ['Noah', 1], ['Omar', 1], ['Pia', 2], ['Quinn', 2], ['Rosa', 2], ['Sam', 3], ['Tara', null]];
  const DN = { 1: 'Engineering', 2: 'Sales', 3: 'Support' };
  const FJ = ED.map(r => r[1] ? [r[0], r[1], r[1], DN[r[1]]] : [r[0], null, null, null]).concat([[null, null, 4, 'Legal']]);
  const ST = [[1, 'Ivy', 1], [2, 'Jon', 2], [3, 'Kai', 1], [4, 'Lea', 3]];
  const CO = ['SQL', 'Java', 'Stats'];
  const CJ = [];
  ST.forEach(s => CO.forEach((c, i) => CJ.push([s[1], s[2], i + 1, c])));

  registerLesson({
    slug: 'full-cross',
    track: 'joins',
    title: 'FULL OUTER JOIN and CROSS JOIN',
    one: 'FULL OUTER keeps the *unmatched rows of both sides*. CROSS JOIN skips matching entirely and pairs *every row with every row*.',
    tables: ['employees', 'departments', 'students', 'courses', 'enrollments'],
    idea: [
      'LEFT keeps unmatched left rows, RIGHT keeps unmatched right rows, and **FULL OUTER** keeps both: matched pairs, plus left orphans padded with NULLs on the right, plus right orphans padded on the left. Good for reconciling two lists.',
      '**CROSS JOIN** has no ON condition: it returns the Cartesian product, |A| × |B| rows. It sounds useless but is how you generate "every combination" (every student × every course, every day × every product) to then find what is missing.',
      'SQLite supports FULL and RIGHT joins since 3.39; MySQL still does not have FULL, so it is emulated with a UNION of a LEFT and a RIGHT join.'
    ],
    stages: [
      {
        title: 'Both sides kept',
        sql: `SELECT e.name, d.name AS dept
FROM employees e
FULL OUTER JOIN departments d ON d.id = e.dept_id;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees e', label: 'employees (name, dept_id)', text: 'Eight employees; Tara has no department.', cols: ['e.name', 'e.dept_id'], rows: ED, src: 'aa', q: 'SELECT name, dept_id FROM employees' },
          { clause: 'JOIN', hl: 'FULL OUTER JOIN departments d ON d.id = e.dept_id', text: 'Seven employees match a department. Tara matches nothing: she is kept with NULLs on the right. Legal matches no employee: it is **also** kept, with NULLs on the left.',
            cols: ['e.name', 'e.dept_id', 'd.id', 'd.name'], rows: FJ, src: 'aabb', m: '       nn', q: 'SELECT e.name, e.dept_id, d.id, d.name FROM employees e FULL OUTER JOIN departments d ON d.id = e.dept_id' },
          { clause: 'SELECT', hl: 'SELECT e.name, d.name AS dept', text: 'Nine rows: everyone and every department appear at least once.', cols: ['name', 'dept'], rows: FJ.map(r => [r[0], r[3]]), src: 'ab' }
        ]
      },
      {
        title: 'Every combination',
        sql: `SELECT s.name, c.title
FROM students s
CROSS JOIN courses c
WHERE s.year = 1;`,
        steps: [
          { clause: 'FROM', hl: 'FROM students s', label: 'students', text: 'Four students.', cols: ['s.id', 's.name', 's.year'], rows: ST, src: 'aaa', q: 'SELECT * FROM students' },
          { clause: 'JOIN', hl: 'CROSS JOIN courses c', text: 'No condition: each of the 4 students is paired with each of the 3 courses. 4 × 3 = 12 rows.',
            cols: ['s.name', 's.year', 'c.id', 'c.title'], rows: CJ, src: 'aabb', g: CJ.map((r, i) => Math.floor(i / 3)), q: 'SELECT s.name, s.year, c.id, c.title FROM students s CROSS JOIN courses c' },
          { clause: 'WHERE', hl: 'WHERE s.year = 1', text: 'Keep first-year students only: Ivy and Kai, each with all three courses.', m: '   ddd   ddd' },
          { clause: 'SELECT', hl: 'SELECT s.name, c.title', text: 'Six combinations.', cols: ['name', 'title'], rows: [['Ivy', 'SQL'], ['Ivy', 'Java'], ['Ivy', 'Stats'], ['Kai', 'SQL'], ['Kai', 'Java'], ['Kai', 'Stats']], src: 'ab', m: '', g: null }
        ]
      }
    ],
    sections: [
      {
        name: 'CROSS JOIN + anti-join: what is missing?',
        text: [
          'Generate every combination that **should** exist, then keep those that **do not**. Here: every student × course pair with no enrollment.'
        ],
        sql: `SELECT s.name, c.title
FROM students s
CROSS JOIN courses c
LEFT JOIN enrollments e ON e.student_id = s.id AND e.course_id = c.id
WHERE e.student_id IS NULL
ORDER BY s.name, c.title;`,
        out: { cols: ['name', 'title'], rows: [['Ivy', 'Stats'], ['Jon', 'Java'], ['Jon', 'Stats'], ['Kai', 'Java'], ['Kai', 'SQL'], ['Lea', 'Java']] }
      },
      {
        name: 'FULL JOIN without FULL JOIN',
        text: ['For databases without FULL OUTER JOIN: a LEFT JOIN, plus the right-side orphans.'],
        sql: `SELECT e.name, d.name AS dept
FROM employees e LEFT JOIN departments d ON d.id = e.dept_id
UNION ALL
SELECT NULL, d.name
FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);`,
        out: { cols: ['name', 'dept'], rows: FJ.map(r => [r[0], r[3]]) }
      },
      {
        name: 'The comma join',
        text: [
          '`FROM a, b` is an old way of writing a cross join. Add a WHERE condition and it becomes an inner join. Prefer explicit `JOIN ... ON` so a forgotten condition is obvious.'
        ]
      }
    ],
    table: {
      head: ['Join', 'Unmatched left rows', 'Unmatched right rows', 'Row count'],
      rows: [
        ['INNER', 'dropped', 'dropped', 'matches only'],
        ['LEFT', 'kept', 'dropped', '≥ left rows'],
        ['RIGHT', 'dropped', 'kept', '≥ right rows'],
        ['FULL OUTER', 'kept', 'kept', '≥ max(left, right)'],
        ['CROSS', 'n/a', 'n/a', 'left × right']
      ]
    },
    pitfalls: [
      ['Accidental cross join', 'A missing ON condition (or comma join without WHERE) multiplies the tables. 10 000 × 10 000 = 100 million rows.'],
      ['WHERE on a FULL JOIN', 'Filtering one side\'s column in WHERE removes the orphans of the other side.'],
      ['Assuming FULL JOIN exists everywhere', 'MySQL lacks it; emulate with UNION.'],
      ['COALESCE for the join key', 'After a FULL JOIN, the key may be NULL on either side: use `COALESCE(a.id, b.id)`.']
    ],
    interview: [
      ['When would you use a FULL OUTER JOIN?', ['To compare or reconcile two sources: see what exists only in A, only in B, and in both, for example yesterday\'s and today\'s snapshot of a table.']],
      ['What is a CROSS JOIN good for?', ['Generating combinations: calendars × products, users × features, test matrices. Often followed by a LEFT JOIN to find missing combinations.']],
      ['How do you emulate FULL OUTER JOIN in MySQL?', ['`A LEFT JOIN B` UNION `A RIGHT JOIN B` (UNION removes the duplicated matched rows), or LEFT JOIN UNION ALL the right-side anti-join.']]
    ],
    say: [
      'FULL OUTER keeps orphans from both sides.',
      'CROSS JOIN = every combination, |A| × |B| rows.',
      'Cross join + anti-join finds missing combinations.'
    ],
    checklist: [
      'Predict the row count of a FULL OUTER JOIN.',
      'Generate all combinations with CROSS JOIN.',
      'Find missing student-course pairs.',
      'Emulate a FULL JOIN with UNION.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(*) AS n
FROM products
CROSS JOIN customers;`,
          tables: ['products', 'customers'],
          answer: { cols: ['n'], rows: [[36]] },
          why: '6 products × 6 customers.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM customers c
FULL OUTER JOIN orders o ON o.customer_id = c.id;`,
          tables: ['customers', 'orders'],
          answer: { cols: ['n'], rows: [[9]] },
          why: '7 matched orders + Dev + Fay. Every order has a customer, so no right-side orphans.'
        },
        {
          sql: `SELECT d.name, e.name AS emp
FROM departments d
FULL JOIN employees e ON e.dept_id = d.id
WHERE d.id IS NULL OR e.id IS NULL;`,
          tables: ['departments', 'employees'],
          answer: { cols: ['name', 'emp'], rows: [['Legal', null], [null, 'Tara']] },
          why: 'Only the orphans of each side.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM courses a, courses b;`,
          tables: ['courses'],
          answer: { cols: ['n'], rows: [[9]] },
          why: 'A comma join without a condition is a cross join: 3 × 3.'
        }
      ],
      fill: [
        {
          q: 'Pair the third-year student with every course.',
          sql: `SELECT s.name, c.title
FROM students s
[[CROSS]] JOIN courses c
WHERE s.year = 3;`,
          tables: ['students', 'courses'],
          answer: { cols: ['name', 'title'], rows: [['Lea', 'SQL'], ['Lea', 'Java'], ['Lea', 'Stats']] },
          why: 'CROSS JOIN pairs without a condition.'
        },
        {
          q: 'Keep unmatched rows from both tables.',
          sql: `SELECT e.name, d.name AS dept
FROM employees e
[[FULL OUTER|FULL]] JOIN departments d ON d.id = e.dept_id
WHERE e.id IS NULL OR d.id IS NULL;`,
          tables: ['employees', 'departments'],
          answer: { cols: ['name', 'dept'], rows: [['Tara', null], [null, 'Legal']] },
          why: '`OUTER` is optional: FULL JOIN means the same.'
        }
      ],
      write: [
        {
          task: 'List every (student name, course title) pair where the student is NOT enrolled in that course.',
          tables: ['students', 'courses', 'enrollments'],
          solution: `SELECT s.name, c.title
FROM students s
CROSS JOIN courses c
LEFT JOIN enrollments e ON e.student_id = s.id AND e.course_id = c.id
WHERE e.student_id IS NULL;`,
          alt: [`SELECT s.name, c.title FROM students s CROSS JOIN courses c WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id AND e.course_id = c.id);`],
          why: 'Generate all pairs, then keep those with no enrollment.'
        },
        {
          task: 'List all employee names and department names matched where possible, including employees without a department and departments without employees.',
          tables: ['employees', 'departments'],
          solution: `SELECT e.name, d.name AS dept
FROM employees e
FULL OUTER JOIN departments d ON d.id = e.dept_id;`,
          why: 'Only FULL OUTER keeps both kinds of orphans.'
        }
      ]
    }
  });
})();
