(function () {
  const EN = [[1, 1, 90], [1, 2, 85], [2, 1, 72], [3, 3, null], [4, 1, 88], [4, 3, 95]];
  const SN = { 1: 'Ivy', 2: 'Jon', 3: 'Kai', 4: 'Lea' };
  const CT = { 1: 'SQL', 2: 'Java', 3: 'Stats' };

  registerLesson({
    slug: 'relationships',
    track: 'design',
    title: 'Relationships: 1:1, 1:N and M:N',
    one: 'The foreign key always lives on the *many* side. A many-to-many relationship needs a *junction table* with one row per pair.',
    tables: ['students', 'courses', 'enrollments', 'customers', 'orders', 'employees'],
    idea: [
      '**One-to-many** (a customer has many orders): put `customer_id` in `orders`. Each order points to exactly one customer; a customer can be pointed to by any number of orders.',
      '**Many-to-many** (students take many courses, courses have many students): neither table can hold the other\'s key. Add a **junction table** `enrollments(student_id, course_id)` with one row per pair. It can also hold facts about the pair, such as the grade.',
      '**One-to-one** is rare: an optional extension of a row (user → user_settings), modelled with a foreign key that is also unique. **Self-referencing** relationships (employee → manager) point into the same table.'
    ],
    stages: [
      {
        title: 'Walking through a junction table',
        sql: `SELECT s.name, c.title
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
ORDER BY s.name, c.title;`,
        steps: [
          { clause: 'FROM', hl: 'FROM students s', text: 'Four students.', cols: ['s.id', 's.name'], rows: [[1, 'Ivy'], [2, 'Jon'], [3, 'Kai'], [4, 'Lea']], src: 'aa', q: 'SELECT id, name FROM students' },
          { clause: 'JOIN', hl: 'JOIN enrollments e ON e.student_id = s.id', label: 'students × their enrollments', text: 'The junction table has one row per (student, course) pair. Ivy and Lea have two pairs each.',
            cols: ['s.name', 'e.student_id', 'e.course_id', 'e.grade'], rows: EN.map(r => [SN[r[0]]].concat(r)), src: 'abbb', q: 'SELECT s.name, e.student_id, e.course_id, e.grade FROM students s JOIN enrollments e ON e.student_id = s.id' },
          { clause: 'JOIN', hl: 'JOIN courses c ON c.id = e.course_id', text: 'Each pair is completed with the course. The grade belongs to the pair, which is why it lives in the junction table.',
            cols: ['s.name', 'e.course_id', 'e.grade', 'c.title'], rows: EN.map(r => [SN[r[0]], r[1], r[2], CT[r[1]]]), src: 'abbb', hot: [3] },
          { clause: 'SELECT', hl: 'SELECT s.name, c.title', text: 'Student and course names.', cols: ['name', 'title'], rows: EN.map(r => [SN[r[0]], CT[r[1]]]), src: 'ab', hot: [] },
          { clause: 'ORDER BY', hl: 'ORDER BY s.name, c.title', text: 'Six pairs, sorted.', rows: [['Ivy', 'Java'], ['Ivy', 'SQL'], ['Jon', 'SQL'], ['Kai', 'Stats'], ['Lea', 'SQL'], ['Lea', 'Stats']] }
        ]
      },
      {
        title: 'Counting from the other side',
        sql: `SELECT c.title, COUNT(e.student_id) AS students
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title
ORDER BY c.title;`,
        steps: [
          { clause: 'FROM', hl: 'FROM courses c', text: 'Three courses.', cols: ['c.id', 'c.title'], rows: [[1, 'SQL'], [2, 'Java'], [3, 'Stats']], src: 'aa', q: 'SELECT id, title FROM courses' },
          { clause: 'JOIN', hl: 'LEFT JOIN enrollments e ON e.course_id = c.id', text: 'Each course with its enrollments. The same junction rows read in the other direction.',
            cols: ['c.id', 'c.title', 'e.student_id'], rows: [[1, 'SQL', 1], [1, 'SQL', 2], [1, 'SQL', 4], [2, 'Java', 1], [3, 'Stats', 3], [3, 'Stats', 4]], src: 'aab',
            q: 'SELECT c.id, c.title, e.student_id FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id' },
          { clause: 'GROUP BY', hl: 'GROUP BY c.id, c.title', text: 'One group per course.', g: [0, 0, 0, 1, 2, 2], key: [1] },
          { clause: 'SELECT', hl: 'SELECT c.title, COUNT(e.student_id) AS students', text: 'Students per course.', cols: ['title', 'students'], rows: [['SQL', 3], ['Java', 1], ['Stats', 2]], g: null, src: 'ab', hot: [1] },
          { clause: 'ORDER BY', hl: 'ORDER BY c.title', text: 'Alphabetical.', rows: [['Java', 1], ['SQL', 3], ['Stats', 2]] }
        ]
      }
    ],
    sections: [
      {
        name: 'A junction table in DDL',
        text: ['The pair is the primary key, so a student cannot enrol in the same course twice; both columns are foreign keys.'],
        sql: `CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL);
CREATE TABLE tags  (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag_id  INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);
INSERT INTO posts VALUES (1, 'Joins'), (2, 'Indexes');
INSERT INTO tags VALUES (1, 'sql'), (2, 'perf');
INSERT INTO post_tags VALUES (1, 1), (2, 1), (2, 2);
SELECT p.title, t.name
FROM post_tags pt
JOIN posts p ON p.id = pt.post_id
JOIN tags t ON t.id = pt.tag_id
ORDER BY p.title, t.name;`,
        out: { cols: ['title', 'name'], rows: [['Indexes', 'perf'], ['Indexes', 'sql'], ['Joins', 'sql']] }
      },
      {
        name: 'Choosing the shape',
        text: [
          [
            'Ask both directions: "can one A have many B?" and "can one B have many A?". Yes/no → 1:N with the key on B. Yes/yes → M:N with a junction table. No/no → 1:1 or the same table.',
            'Index foreign key columns: they are used in every join and in ON DELETE checks.',
            'A junction table that collects its own attributes (grade, enrolled_at, role) often deserves a real name, like `enrollments` or `memberships`.'
          ]
        ]
      }
    ],
    table: {
      head: ['Relationship', 'Example', 'Where the key goes'],
      rows: [
        ['1 : 1', 'user → profile', 'FK in the optional side, UNIQUE'],
        ['1 : N', 'customer → orders', 'FK in the many side (orders.customer_id)'],
        ['M : N', 'students ↔ courses', 'junction table with both FKs, composite PK'],
        ['self 1 : N', 'manager → employees', 'FK to the same table (manager_id)']
      ]
    },
    pitfalls: [
      ['A list of ids in one column for M:N', 'Breaks 1NF; cannot join or constrain. Use a junction table.'],
      ['FK on the wrong side', 'Putting order ids into customers forces one order per customer.'],
      ['Junction table without a unique pair', 'Duplicate pairs creep in. Make (a_id, b_id) the primary key.'],
      ['Unindexed foreign keys', 'Joins and parent deletes scan the child table.']
    ],
    interview: [
      ['How do you model a many-to-many relationship?', ['With a junction (associative) table holding foreign keys to both sides, typically with the pair as a composite primary key, plus any attributes of the relationship.']],
      ['Where does the foreign key go in a one-to-many relationship?', ['On the "many" side: each child row stores its parent\'s key.']],
      ['How would you design users following other users?', ['A self-referencing junction table `follows(follower_id, followee_id)`, both referencing users, with the pair as the primary key and a CHECK that they differ.']]
    ],
    say: [
      'FK lives on the many side.',
      'M:N needs a junction table with a composite key.',
      'Ask the cardinality question in both directions.'
    ],
    checklist: [
      'Classify five relationships.',
      'Design a junction table with DDL.',
      'Query an M:N relationship both ways.',
      'Explain where relationship attributes belong.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT s.name, COUNT(*) AS courses
FROM students s
JOIN enrollments e ON e.student_id = s.id
GROUP BY s.id, s.name
ORDER BY courses DESC, s.name;`,
          tables: ['students', 'enrollments'],
          answer: { cols: ['name', 'courses'], rows: [['Ivy', 2], ['Lea', 2], ['Jon', 1], ['Kai', 1]] },
          why: 'Count junction rows per student.'
        },
        {
          sql: `SELECT c.title
FROM courses c
WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id);`,
          tables: ['courses', 'enrollments'],
          answer: { cols: ['title'], rows: [] },
          why: 'Every course has at least one enrollment.'
        },
        {
          sql: `SELECT COUNT(*) AS n
FROM orders
WHERE customer_id = 1;`,
          tables: ['orders'],
          answer: { cols: ['n'], rows: [[2]] },
          why: 'The 1:N key lives in orders; Ana has two.'
        },
        {
          sql: `SELECT DISTINCT a.student_id, b.student_id AS other
FROM enrollments a
JOIN enrollments b ON a.course_id = b.course_id AND a.student_id < b.student_id
ORDER BY 1, 2;`,
          tables: ['enrollments'],
          answer: { cols: ['student_id', 'other'], rows: [[1, 2], [1, 4], [2, 4], [3, 4]] },
          why: 'Pairs of students who share at least one course.'
        }
      ],
      fill: [
        {
          q: 'Make the pair the key of the junction table.',
          sql: `CREATE TABLE likes (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  [[PRIMARY KEY]] (user_id, post_id)
);
INSERT OR IGNORE INTO likes VALUES (1, 7), (1, 7), (2, 7);
SELECT COUNT(*) AS n FROM likes;`,
          answer: { cols: ['n'], rows: [[2]] },
          why: 'The duplicate pair (1, 7) is rejected (and ignored here).'
        },
        {
          q: 'Students per course, including empty courses.',
          sql: `SELECT c.title, COUNT(e.[[student_id]]) AS students
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title;`,
          tables: ['courses', 'enrollments'],
          answer: { cols: ['title', 'students'], rows: [['SQL', 3], ['Java', 1], ['Stats', 2]] },
          why: 'Count a junction column so empty courses would show 0.'
        }
      ],
      write: [
        {
          task: 'List every course title with the names of its students, one row per pair, ordered by title then student name.',
          tables: ['courses', 'enrollments', 'students'],
          solution: `SELECT c.title, s.name
FROM courses c
JOIN enrollments e ON e.course_id = c.id
JOIN students s ON s.id = e.student_id
ORDER BY c.title, s.name;`,
          why: 'Two joins through the junction table.'
        },
        {
          task: 'Return the title of the course with the most students.',
          tables: ['courses', 'enrollments'],
          solution: `SELECT c.title
FROM courses c
JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title
ORDER BY COUNT(*) DESC
LIMIT 1;`,
          why: 'SQL has three students.'
        }
      ]
    }
  });
})();
