(function () {
  const EM = [[1, 'Mia', null], [2, 'Noah', 1], [3, 'Omar', 1], [4, 'Pia', 1], [5, 'Quinn', 4], [6, 'Rosa', 4], [7, 'Sam', 1], [8, 'Tara', 1]];
  const NM = { 1: 'Mia', 4: 'Pia' };
  const SJ = EM.map(r => r.concat(r[2] ? [r[2], NM[r[2]]] : [null, null]));
  const PAIRS = [[1, 'Mia', 1, 2, 'Noah'], [1, 'Mia', 1, 3, 'Omar'], [2, 'Noah', 1, 3, 'Omar'], [4, 'Pia', 2, 5, 'Quinn'], [4, 'Pia', 2, 6, 'Rosa'], [5, 'Quinn', 2, 6, 'Rosa']];

  registerLesson({
    slug: 'self-join',
    track: 'joins',
    title: 'Self join',
    one: 'A self join joins a table *to itself* under two different aliases, so each row can be compared with another row of the same table.',
    tables: ['employees'],
    idea: [
      'Some relationships point inside one table: an employee\'s `manager_id` is another employee\'s `id`. To show both names side by side, read the table twice: once as "employee" (`e`) and once as "manager" (`m`).',
      'Nothing is special about a self join; it is a normal join where both sides happen to be the same table. Aliases are mandatory so the database knows which copy you mean.',
      'Self joins also compare rows: pairs of colleagues, duplicates, consecutive events. Add `a.id < b.id` to avoid pairing a row with itself and listing each pair twice.'
    ],
    stages: [
      {
        title: 'Employees and their managers',
        sql: `SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees e', label: 'employees as e', text: 'The first copy, `e`, plays the employee.', cols: ['e.id', 'e.name', 'e.manager_id'], rows: EM, src: 'aaa', q: 'SELECT id, name, manager_id FROM employees' },
          { clause: 'JOIN', hl: 'LEFT JOIN employees m ON m.id = e.manager_id', text: 'The second copy, `m`, plays the manager: for each employee, find the row whose `id` equals their `manager_id`. Mia has no manager, so the LEFT JOIN pads her with NULLs.',
            cols: ['e.id', 'e.name', 'e.manager_id', 'm.id', 'm.name'], rows: SJ, src: 'aaabb', m: 'n', q: 'SELECT e.id, e.name, e.manager_id, m.id, m.name FROM employees e LEFT JOIN employees m ON m.id = e.manager_id' },
          { clause: 'SELECT', hl: 'SELECT e.name AS employee, m.name AS manager', text: 'Each employee next to their manager. With an INNER JOIN, Mia would disappear.', cols: ['employee', 'manager'], rows: SJ.map(r => [r[1], r[4]]), src: 'ab' }
        ]
      },
      {
        title: 'Colleague pairs',
        sql: `SELECT a.name, b.name AS colleague
FROM employees a
JOIN employees b ON b.dept_id = a.dept_id AND a.id < b.id
WHERE a.dept_id = 2;`,
        steps: [
          { clause: 'FROM', hl: 'FROM employees a', label: 'employees as a', text: 'All employees as `a`.', cols: ['a.id', 'a.name', 'a.dept_id'], rows: [[1, 'Mia', 1], [2, 'Noah', 1], [3, 'Omar', 1], [4, 'Pia', 2], [5, 'Quinn', 2], [6, 'Rosa', 2], [7, 'Sam', 3], [8, 'Tara', null]], src: 'aaa', q: 'SELECT id, name, dept_id FROM employees' },
          { clause: 'JOIN', hl: 'JOIN employees b ON b.dept_id = a.dept_id AND a.id < b.id', text: 'Pair each employee with colleagues in the same department. `a.id < b.id` drops self-pairs (Mia, Mia) and mirror pairs (Noah, Mia). Sam has no colleague; Tara\'s NULL department matches nobody.',
            cols: ['a.id', 'a.name', 'a.dept_id', 'b.id', 'b.name'], rows: PAIRS, src: 'aaabb', q: 'SELECT a.id, a.name, a.dept_id, b.id, b.name FROM employees a JOIN employees b ON b.dept_id = a.dept_id AND a.id < b.id' },
          { clause: 'WHERE', hl: 'WHERE a.dept_id = 2', text: 'Sales only.', m: 'ddd' },
          { clause: 'SELECT', hl: 'SELECT a.name, b.name AS colleague', text: 'Three pairs for three people: each pair exactly once.', cols: ['name', 'colleague'], rows: [['Pia', 'Quinn'], ['Pia', 'Rosa'], ['Quinn', 'Rosa']], src: 'ab', m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'Comparing a row with a related row',
        text: ['How far below their manager is each person paid?'],
        sql: `SELECT e.name, m.name AS manager, m.salary - e.salary AS gap
FROM employees e
JOIN employees m ON m.id = e.manager_id
ORDER BY gap, e.name
LIMIT 3;`,
        out: { cols: ['name', 'manager', 'gap'], rows: [['Rosa', 'Pia', 10], ['Quinn', 'Pia', 20], ['Noah', 'Mia', 25]] }
      },
      {
        name: 'Deeper hierarchies',
        text: [
          'One self join reaches one level up. Two joins reach the grand-manager. For an unknown depth (a whole org chart), use a **recursive CTE** (Subqueries & CTEs track).'
        ]
      }
    ],
    pitfalls: [
      ['Missing aliases', 'Both copies have the same name; without aliases every column is ambiguous.'],
      ['Pairing a row with itself', 'Add `a.id <> b.id`, or `a.id < b.id` to also remove mirror pairs.'],
      ['INNER self join for optional parents', 'The root (no manager) disappears. Use LEFT JOIN.'],
      ['Self join on a large table without an index on the join column', 'Can be very slow; index `manager_id`.']
    ],
    interview: [
      ['How do you list employees with their manager\'s name?', ['Self join employees to itself: `FROM employees e LEFT JOIN employees m ON m.id = e.manager_id`.']],
      ['Why use `a.id < b.id` instead of `a.id <> b.id`?', ['`<>` still returns each pair twice, as (A, B) and (B, A). `<` keeps one ordering of each pair.']],
      ['How do you get the whole management chain?', ['A recursive CTE that starts from an employee and repeatedly joins to the manager until it reaches the top.']]
    ],
    say: [
      'A self join is a normal join of a table with itself under two aliases.',
      'Use LEFT JOIN so the root of a hierarchy stays.',
      '`a.id < b.id` gives each pair once.'
    ],
    checklist: [
      'Show employees with manager names.',
      'Count direct reports per manager.',
      'List unique pairs within a group.',
      'Explain why mirror pairs appear.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(*) AS n
FROM employees e
JOIN employees m ON m.id = e.manager_id;`,
          tables: ['employees'],
          answer: { cols: ['n'], rows: [[7]] },
          why: 'Everyone except Mia has a manager.'
        },
        {
          sql: `SELECT m.name, COUNT(*) AS reports
FROM employees e
JOIN employees m ON m.id = e.manager_id
GROUP BY m.id, m.name
ORDER BY reports DESC;`,
          tables: ['employees'],
          answer: { cols: ['name', 'reports'], rows: [['Mia', 5], ['Pia', 2]] },
          why: 'Mia manages Noah, Omar, Pia, Sam and Tara; Pia manages Quinn and Rosa.'
        },
        {
          sql: `SELECT e.name
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
WHERE m.id IS NULL;`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Mia']] },
          why: 'An anti-join on the manager side finds the top of the hierarchy.'
        },
        {
          sql: `SELECT a.name, b.name AS twin
FROM employees a
JOIN employees b ON a.salary = b.salary AND a.id < b.id;`,
          tables: ['employees'],
          answer: { cols: ['name', 'twin'], rows: [['Noah', 'Omar']] },
          why: 'Noah and Omar both earn 95; `<` reports the pair once.'
        }
      ],
      fill: [
        {
          q: 'Who is Quinn\'s manager?',
          sql: `SELECT m.name
FROM employees e
JOIN employees m ON m.id = e.[[manager_id]]
WHERE e.name = 'Quinn';`,
          tables: ['employees'],
          answer: { cols: ['name'], rows: [['Pia']] },
          why: 'The employee row points to the manager row through `manager_id`.'
        },
        {
          q: 'Unique pairs of Engineering colleagues.',
          sql: `SELECT a.name, b.name AS colleague
FROM employees a
JOIN employees b ON b.dept_id = a.dept_id AND a.id [[<]] b.id
WHERE a.dept_id = 1;`,
          tables: ['employees'],
          answer: { cols: ['name', 'colleague'], rows: [['Mia', 'Noah'], ['Mia', 'Omar'], ['Noah', 'Omar']] },
          why: '`<` removes self-pairs and mirror pairs.'
        }
      ],
      write: [
        {
          task: 'Show every employee\'s name with their manager\'s name (NULL for the top boss).',
          tables: ['employees'],
          solution: `SELECT e.name, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;`,
          why: 'LEFT keeps Mia.'
        },
        {
          task: 'List the names of employees who manage at least one person, each once.',
          tables: ['employees'],
          solution: `SELECT DISTINCT m.name
FROM employees e
JOIN employees m ON m.id = e.manager_id;`,
          alt: [`SELECT name FROM employees m WHERE EXISTS (SELECT 1 FROM employees e WHERE e.manager_id = m.id);`],
          why: 'Anyone that appears on the manager side of the join is a manager.'
        }
      ]
    }
  });
})();
