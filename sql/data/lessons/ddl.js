(function () {
  registerLesson({
    slug: 'ddl',
    track: 'design',
    title: 'Creating tables: keys and constraints',
    one: 'Constraints are rules the database *enforces for you*: NOT NULL, UNIQUE, CHECK, PRIMARY KEY and FOREIGN KEY reject bad data before it is stored.',
    tables: [],
    idea: [
      '`CREATE TABLE` defines columns with types and constraints. A **primary key** identifies each row uniquely and cannot be NULL. A **foreign key** says "this value must exist as a key in that other table".',
      'Every constraint is a promise about the data that application code no longer has to re-check: no account without an email, no negative balance, no order for a customer that does not exist.',
      'A foreign key can also say what happens when the parent row is deleted: block it (default), `CASCADE` the delete to the children, or `SET NULL`. (SQLite enforces foreign keys only after `PRAGMA foreign_keys = ON`.)'
    ],
    stages: [
      {
        title: 'Defaults and constraints',
        chips: ['CREATE', 'INSERT', 'SELECT'],
        sql: `CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)
);
INSERT INTO accounts (id, email) VALUES (1, 'a@x.io');
INSERT INTO accounts (id, email, balance) VALUES (2, 'b@x.io', 50);
SELECT * FROM accounts;`,
        steps: [
          { clause: 'CREATE', hl: `CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)
);`, label: 'accounts', text: 'An empty table with rules attached to every column.', cols: ['id', 'email', 'balance'], rows: [] },
          { clause: 'INSERT', hl: "INSERT INTO accounts (id, email) VALUES (1, 'a@x.io');", label: 'accounts', text: '`balance` was not given, so its DEFAULT 0 is used. 0 passes the CHECK.', rows: [[1, 'a@x.io', 0]], m: 'n', hot: [2] },
          { clause: 'INSERT', hl: "INSERT INTO accounts (id, email, balance) VALUES (2, 'b@x.io', 50);", label: 'accounts', text: 'A second account with an explicit balance. Inserting `\'a@x.io\'` again, a NULL email or a balance of −5 would be rejected with an error.', rows: [[1, 'a@x.io', 0], [2, 'b@x.io', 50]], m: ' n', hot: [] },
          { clause: 'SELECT', hl: 'SELECT * FROM accounts;', label: 'result', text: 'Only data that obeys every rule is in the table.', m: '' }
        ]
      },
      {
        title: 'Foreign keys and ON DELETE CASCADE',
        chips: ['CREATE', 'INSERT', 'DELETE', 'SELECT'],
        sql: `PRAGMA foreign_keys = ON;
CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE
);
INSERT INTO teams VALUES (1, 'Red'), (2, 'Blue');
INSERT INTO players VALUES (10, 'Ann', 1), (11, 'Bob', 1), (12, 'Cid', 2);
DELETE FROM teams WHERE id = 1;
SELECT * FROM players;`,
        steps: [
          { clause: 'CREATE', hl: 'team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE', label: 'players', text: '`players.team_id` must point at an existing team. The PRAGMA turns enforcement on in SQLite.', cols: ['id', 'name', 'team_id'], rows: [] },
          { clause: 'INSERT', hl: "INSERT INTO players VALUES (10, 'Ann', 1), (11, 'Bob', 1), (12, 'Cid', 2);", label: 'players', text: 'Three players in two existing teams. A player with `team_id` 9 would be rejected: team 9 does not exist.', rows: [[10, 'Ann', 1], [11, 'Bob', 1], [12, 'Cid', 2]], m: 'nnn' },
          { clause: 'DELETE', hl: 'DELETE FROM teams WHERE id = 1;', label: 'players', text: 'Deleting team Red **cascades**: its players are deleted too, so no player points at a missing team. Without CASCADE the delete itself would fail.', m: 'dd' },
          { clause: 'SELECT', hl: 'SELECT * FROM players;', label: 'result', text: 'Only Cid remains.', rows: [[12, 'Cid', 2]], m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'What gets rejected',
        text: [
          'Each of these statements fails against the `accounts` table above, with the error shown:',
          [
            "`INSERT INTO accounts (id, email) VALUES (3, 'a@x.io')` → UNIQUE constraint failed: accounts.email",
            '`INSERT INTO accounts (id) VALUES (3)` → NOT NULL constraint failed: accounts.email',
            "`UPDATE accounts SET balance = -5 WHERE id = 2` → CHECK constraint failed",
            "`INSERT INTO accounts (id, email) VALUES (1, 'c@x.io')` → UNIQUE constraint failed: accounts.id (primary key)"
          ]
        ]
      },
      {
        name: 'Changing a table',
        text: ['`ALTER TABLE` adds or renames columns; `DROP TABLE` removes a table and its data. Use `IF NOT EXISTS` / `IF EXISTS` in scripts that may run twice.'],
        sql: `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);
ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
INSERT INTO notes (body) VALUES ('buy milk');
SELECT * FROM notes;`,
        out: { cols: ['id', 'body', 'pinned'], rows: [[1, 'buy milk', 0]] }
      },
      {
        name: 'Types differ between databases',
        text: [
          'SQLite is flexible: a column\'s type is only a preference (type affinity), and `INTEGER PRIMARY KEY` is an alias for the row id that is filled automatically. PostgreSQL and MySQL are strict and have more types (`VARCHAR(n)`, `NUMERIC(10,2)`, `DATE`, `TIMESTAMP`, `BOOLEAN`). Use `NUMERIC`/`DECIMAL` for money, never floating point.'
        ]
      }
    ],
    table: {
      head: ['Constraint', 'Guarantees'],
      rows: [
        ['`PRIMARY KEY`', 'unique, not NULL; one per table (may span columns)'],
        ['`NOT NULL`', 'a value is always present'],
        ['`UNIQUE`', 'no two rows share the value (NULLs may repeat)'],
        ['`CHECK (expr)`', 'every row satisfies the expression'],
        ['`DEFAULT v`', 'value used when none is given'],
        ['`REFERENCES t(col)`', 'value exists in the parent table (or is NULL)']
      ]
    },
    pitfalls: [
      ['Foreign keys silently off in SQLite', 'Run `PRAGMA foreign_keys = ON` per connection.'],
      ['UNIQUE and NULL', 'Most databases allow several NULLs in a UNIQUE column.'],
      ['Floating point for money', 'Rounding errors. Use integer cents or DECIMAL.'],
      ['ON DELETE CASCADE everywhere', 'One delete can wipe large amounts of data. Use it only for true ownership.']
    ],
    interview: [
      ['Primary key vs unique key?', ['Both are unique. A primary key cannot be NULL and there is only one per table; it is the row\'s identity and usually the clustered index. A table can have many unique keys, which may allow NULLs.']],
      ['What does a foreign key do?', ['It guarantees referential integrity: the child value must match an existing parent key. It also defines what happens on parent delete/update (RESTRICT, CASCADE, SET NULL).']],
      ['Natural vs surrogate key?', ['A natural key comes from the data (email, ISBN); a surrogate key is an artificial id. Surrogates are stable and compact; enforce natural uniqueness with an extra UNIQUE constraint.']]
    ],
    say: [
      'Constraints make the database enforce the rules.',
      'Primary key = unique + not NULL; foreign key = must exist in the parent.',
      'Choose ON DELETE behaviour deliberately.'
    ],
    checklist: [
      'Create a table with all five constraint types.',
      'Predict which inserts fail.',
      'Explain ON DELETE CASCADE vs SET NULL.',
      'Explain why UNIQUE allows several NULLs.'
    ],
    drills: {
      predict: [
        {
          sql: `CREATE TABLE t (id INTEGER PRIMARY KEY, qty INTEGER DEFAULT 1);
INSERT INTO t (id) VALUES (5);
SELECT * FROM t;`,
          answer: { cols: ['id', 'qty'], rows: [[5, 1]] },
          why: 'The missing column takes its DEFAULT.'
        },
        {
          sql: `CREATE TABLE u (a INTEGER UNIQUE);
INSERT INTO u VALUES (NULL), (NULL), (1);
SELECT COUNT(*) AS n FROM u;`,
          answer: { cols: ['n'], rows: [[3]] },
          why: 'NULLs are not equal to each other, so UNIQUE allows several.'
        },
        {
          sql: `CREATE TABLE v (email TEXT UNIQUE);
INSERT INTO v VALUES ('a');
INSERT OR IGNORE INTO v VALUES ('a');
SELECT COUNT(*) AS n FROM v;`,
          answer: { cols: ['n'], rows: [[1]] },
          why: 'The duplicate violates UNIQUE; OR IGNORE skips it instead of failing.'
        },
        {
          sql: `CREATE TABLE w (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO w (name) VALUES ('x'), ('y');
SELECT id, name FROM w;`,
          answer: { cols: ['id', 'name'], rows: [[1, 'x'], [2, 'y']] },
          why: 'An INTEGER PRIMARY KEY is filled automatically when omitted.'
        }
      ],
      fill: [
        {
          q: 'Email must be present and unique.',
          sql: `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT [[NOT NULL]] [[UNIQUE]]
);
INSERT INTO users (email) VALUES ('me@x.io');
SELECT id, email FROM users;`,
          answer: { cols: ['id', 'email'], rows: [[1, 'me@x.io']] },
          why: 'NOT NULL forbids missing values, UNIQUE forbids duplicates.'
        },
        {
          q: 'Prices may not be negative.',
          sql: `CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  price REAL CHECK ([[price >= 0|0 <= price]])
);
INSERT INTO items (price) VALUES (4.5);
SELECT price FROM items;`,
          answer: { cols: ['price'], rows: [[4.5]] },
          why: 'CHECK rejects any row where the expression is false.'
        }
      ],
      write: [
        {
          task: 'Create a table notes with id (integer primary key), body (required text) and created (text, default \'2024-01-01\'). Insert one note with body \'hi\' and select all columns.',
          solution: `CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  body TEXT NOT NULL,
  created TEXT DEFAULT '2024-01-01'
);
INSERT INTO notes (body) VALUES ('hi');
SELECT * FROM notes;`,
          why: 'The id is generated and created takes its default.'
        },
        {
          task: 'Create a table tags with a single text primary key column name, insert \'sql\' and \'java\', then return how many rows it has.',
          solution: `CREATE TABLE tags (name TEXT PRIMARY KEY);
INSERT INTO tags VALUES ('sql'), ('java');
SELECT COUNT(*) AS n FROM tags;`,
          why: 'A text primary key works just like an integer one.'
        }
      ]
    }
  });
})();
