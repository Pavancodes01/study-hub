(function () {
  const SETUP = `CREATE TABLE accounts (id INTEGER PRIMARY KEY, owner TEXT, balance INTEGER CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 'Ana', 100), (2, 'Ben', 20);`;

  registerLesson({
    slug: 'transactions',
    track: 'perf',
    title: 'Transactions and ACID',
    one: 'A transaction groups statements so they *all happen or none do*. COMMIT makes them permanent; ROLLBACK undoes them as if they never ran.',
    tables: ['orders', 'products', 'customers'],
    idea: [
      'Moving money is two updates: take from Ana, give to Ben. If the system crashes between them, money disappears. Wrapped in `BEGIN ... COMMIT`, the two updates become one **atomic** unit.',
      '**ACID**: Atomicity (all or nothing), Consistency (constraints hold before and after), Isolation (concurrent transactions do not see each other\'s half-done work), Durability (once committed, it survives a crash).',
      'Without an explicit BEGIN, most databases run each statement in its own transaction (autocommit).'
    ],
    stages: [
      {
        title: 'A transfer that commits',
        chips: ['before', 'BEGIN', 'UPDATE 1', 'UPDATE 2', 'COMMIT'],
        sql: SETUP + `
BEGIN;
UPDATE accounts SET balance = balance - 70 WHERE id = 1;
UPDATE accounts SET balance = balance + 70 WHERE id = 2;
COMMIT;
SELECT * FROM accounts;`,
        steps: [
          { clause: 'before', hl: "INSERT INTO accounts VALUES (1, 'Ana', 100), (2, 'Ben', 20);", label: 'accounts', text: 'Ana has 100, Ben 20. Total: 120.', cols: ['id', 'owner', 'balance'], rows: [[1, 'Ana', 100], [2, 'Ben', 20]] },
          { clause: 'BEGIN', hl: 'BEGIN;', label: 'accounts', text: 'A transaction starts. From here on, changes are private until COMMIT.' },
          { clause: 'UPDATE 1', hl: 'UPDATE accounts SET balance = balance - 70 WHERE id = 1;', label: 'accounts (inside the transaction)', text: 'Ana is debited. Right now the total is only 50: an inconsistent, half-finished state that **other sessions cannot see**.', rows: [[1, 'Ana', 30], [2, 'Ben', 20]], m: 'h', hot: [2] },
          { clause: 'UPDATE 2', hl: 'UPDATE accounts SET balance = balance + 70 WHERE id = 2;', label: 'accounts (inside the transaction)', text: 'Ben is credited. The total is 120 again.', rows: [[1, 'Ana', 30], [2, 'Ben', 90]], m: ' h' },
          { clause: 'COMMIT', hl: 'COMMIT;', label: 'accounts (committed)', text: 'Both changes become permanent and visible to everyone **at the same moment**. A crash before this line would have undone both.', m: '', hot: [] }
        ]
      },
      {
        title: 'Changing your mind: ROLLBACK',
        chips: ['before', 'BEGIN', 'changes', 'ROLLBACK'],
        sql: SETUP + `
BEGIN;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
DELETE FROM accounts WHERE id = 1;
ROLLBACK;
SELECT * FROM accounts;`,
        steps: [
          { clause: 'before', hl: "INSERT INTO accounts VALUES (1, 'Ana', 100), (2, 'Ben', 20);", label: 'accounts', text: 'Same starting point.', cols: ['id', 'owner', 'balance'], rows: [[1, 'Ana', 100], [2, 'Ben', 20]] },
          { clause: 'BEGIN', hl: 'BEGIN;', label: 'accounts', text: 'Start a transaction.' },
          { clause: 'changes', hl: 'DELETE FROM accounts WHERE id = 1;', label: 'accounts (inside the transaction)', text: 'Ben gets 500 and Ana\'s account is deleted, but only inside this transaction.', rows: [[1, 'Ana', 100], [2, 'Ben', 520]], m: 'dh', hot: [2] },
          { clause: 'ROLLBACK', hl: 'ROLLBACK;', label: 'accounts', text: 'ROLLBACK discards everything since BEGIN. The data is exactly as before.', rows: [[1, 'Ana', 100], [2, 'Ben', 20]], m: '', hot: [] }
        ]
      }
    ],
    sections: [
      {
        name: 'Savepoints',
        text: ['A savepoint is a bookmark inside a transaction: roll back part of the work and keep the rest.'],
        sql: `CREATE TABLE log (msg TEXT);
BEGIN;
INSERT INTO log VALUES ('a');
SAVEPOINT s1;
INSERT INTO log VALUES ('b');
ROLLBACK TO s1;
INSERT INTO log VALUES ('c');
COMMIT;
SELECT msg FROM log;`,
        out: { cols: ['msg'], rows: [['a'], ['c']] }
      },
      {
        name: 'Errors in the middle',
        text: [
          'If a statement fails inside a transaction (say the CHECK `balance >= 0` rejects a debit), the failed statement has no effect, but the transaction is still open. The application must ROLLBACK (PostgreSQL even refuses further statements until you do). Typical code: `begin; try { ...; commit } catch { rollback; throw }`.'
        ]
      },
      {
        name: 'How durability works',
        text: [
          'Before acknowledging COMMIT, the database writes the changes to a log on disk (write-ahead log / redo log). After a crash it replays committed work from the log and discards uncommitted work. That is why COMMIT has a cost and why batching many inserts into one transaction is much faster than committing each one.'
        ]
      }
    ],
    table: {
      head: ['Letter', 'Means', 'Provided by'],
      rows: [
        ['A', 'all or nothing', 'undo / rollback'],
        ['C', 'constraints always hold', 'constraints + atomicity'],
        ['I', 'concurrent work does not interfere', 'locks / MVCC, isolation levels'],
        ['D', 'committed data survives crashes', 'write-ahead log, fsync']
      ]
    },
    pitfalls: [
      ['Leaving a transaction open', 'Holds locks or old snapshots; others wait or the database bloats. Keep transactions short.'],
      ['Doing slow work (HTTP calls) inside a transaction', 'Locks are held for the whole call.'],
      ['Ignoring errors mid-transaction', 'Always roll back on failure.'],
      ['One transaction per row in bulk loads', 'Each COMMIT forces a disk sync. Batch them.']
    ],
    interview: [
      ['What does ACID stand for?', ['Atomicity, Consistency, Isolation, Durability. Together they guarantee that a transaction is all-or-nothing, keeps the data valid, behaves as if run alone (to the chosen isolation level) and survives crashes once committed.']],
      ['What is autocommit?', ['The default mode in which each statement is its own transaction, committed immediately. Use BEGIN/COMMIT to group statements.']],
      ['How is durability implemented?', ['With a write-ahead log flushed to disk at commit; recovery replays committed changes and rolls back uncommitted ones.']]
    ],
    say: [
      'A transaction is all or nothing.',
      'ACID: atomic, consistent, isolated, durable.',
      'Keep transactions short and always handle rollback.'
    ],
    checklist: [
      'Write a transfer in a transaction.',
      'Explain each ACID letter with an example.',
      'Use a savepoint.',
      'Explain why batching commits is faster.'
    ],
    drills: {
      predict: [
        {
          sql: `BEGIN;
DELETE FROM orders;
ROLLBACK;
SELECT COUNT(*) AS n FROM orders;`,
          tables: ['orders'],
          answer: { cols: ['n'], rows: [[7]] },
          why: 'The delete was rolled back.'
        },
        {
          sql: `BEGIN;
UPDATE products SET price = 0 WHERE id = 1;
COMMIT;
SELECT price FROM products WHERE id = 1;`,
          tables: ['products'],
          answer: { cols: ['price'], rows: [[0]] },
          why: 'Committed changes stay.'
        },
        {
          sql: `BEGIN;
INSERT INTO customers (id, name) VALUES (7, 'Gus');
SELECT COUNT(*) AS n FROM customers;`,
          tables: ['customers'],
          answer: { cols: ['n'], rows: [[7]] },
          why: 'A transaction always sees its own uncommitted changes.'
        },
        {
          sql: `CREATE TABLE t (x INTEGER);
BEGIN;
INSERT INTO t VALUES (1);
SAVEPOINT p;
INSERT INTO t VALUES (2);
INSERT INTO t VALUES (3);
ROLLBACK TO p;
COMMIT;
SELECT COUNT(*) AS n FROM t;`,
          answer: { cols: ['n'], rows: [[1]] },
          why: 'Everything after the savepoint was undone; the first insert was committed.'
        }
      ],
      fill: [
        {
          q: 'Make the two price changes one unit of work.',
          sql: `[[BEGIN|BEGIN TRANSACTION]];
UPDATE products SET price = price + 1 WHERE id = 3;
UPDATE products SET price = price - 1 WHERE id = 5;
[[COMMIT|END]];
SELECT price FROM products WHERE id IN (3, 5);`,
          tables: ['products'],
          answer: { cols: ['price'], rows: [[10], [24]] },
          why: 'BEGIN starts it, COMMIT makes it permanent.'
        },
        {
          q: 'Undo the accidental update.',
          sql: `BEGIN;
UPDATE employees SET salary = 0;
[[ROLLBACK]];
SELECT MAX(salary) AS top FROM employees;`,
          tables: ['employees'],
          answer: { cols: ['top'], rows: [[120]] },
          why: 'ROLLBACK discards everything since BEGIN.'
        }
      ],
      write: [
        {
          task: 'In one transaction, raise the Mug\'s price (id 3) by 1 and lower the Kettle\'s price (id 5) by 1, commit, then show the two products\' names and prices.',
          tables: ['products'],
          solution: `BEGIN;
UPDATE products SET price = price + 1 WHERE id = 3;
UPDATE products SET price = price - 1 WHERE id = 5;
COMMIT;
SELECT name, price FROM products WHERE id IN (3, 5);`,
          why: 'Both changes are applied together.'
        },
        {
          task: 'Start a transaction, delete all cancelled orders, roll back, then return the number of orders.',
          tables: ['orders'],
          solution: `BEGIN;
DELETE FROM orders WHERE status = 'cancelled';
ROLLBACK;
SELECT COUNT(*) AS n FROM orders;`,
          why: 'Still 7: the delete never became permanent.'
        }
      ]
    }
  });
})();
