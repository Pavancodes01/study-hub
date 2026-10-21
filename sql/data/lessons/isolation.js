(function () {
  const TL = ['time', 'session A', 'session B', 'A sees'];
  const DOCS = `CREATE TABLE docs (id INTEGER PRIMARY KEY, body TEXT, version INTEGER);
INSERT INTO docs VALUES (1, 'v1 text', 1);`;

  registerLesson({
    slug: 'isolation',
    track: 'perf',
    title: 'Isolation levels and concurrency anomalies',
    one: 'Isolation decides *what a transaction may see of other running transactions*. Weaker levels are faster but allow anomalies like non-repeatable reads and lost updates.',
    tables: ['products'],
    idea: [
      'Perfect isolation (**serializable**) means the result is as if transactions ran one after another. That costs locking or aborted retries, so databases offer weaker levels: read uncommitted, **read committed** (PostgreSQL\'s default), **repeatable read** (MySQL InnoDB\'s default), serializable (SQLite\'s behaviour).',
      'Each weaker level allows certain **anomalies**: reading uncommitted data (dirty read), getting a different value when reading a row twice (non-repeatable read), new rows appearing in a repeated query (phantom), and two read-modify-write cycles overwriting each other (lost update).',
      'Most modern databases implement isolation with **MVCC**: each transaction reads a consistent snapshot of committed data, and writers do not block readers.'
    ],
    stages: [
      {
        title: 'Non-repeatable read (read committed)',
        norun: true,
        chips: ['t1', 't2', 't3', 't4'],
        sql: `CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER);
INSERT INTO accounts VALUES (1, 100);
-- Session A                          -- Session B (another connection)
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
--                                    BEGIN
--                                    UPDATE accounts SET balance = 50 WHERE id = 1
--                                    COMMIT
SELECT balance FROM accounts WHERE id = 1;
COMMIT;`,
        steps: [
          { clause: 't1', hl: 'SELECT balance FROM accounts WHERE id = 1;', label: 'timeline', text: 'A starts a transaction and reads the balance: 100.', cols: TL, rows: [['t1', 'BEGIN; read balance', '', 100]], m: 'h' },
          { clause: 't2', hl: 'UPDATE accounts SET balance = 50 WHERE id = 1', label: 'timeline', text: 'B changes the balance to 50 and commits.', rows: [['t1', 'BEGIN; read balance', '', 100], ['t2', '', 'UPDATE to 50; COMMIT', '']], m: ' h' },
          { clause: 't3', hl: 'SELECT balance FROM accounts WHERE id = 1;\nCOMMIT;', label: 'timeline', text: 'A reads the same row again. Under **read committed**, each statement sees the latest committed data, so A now gets 50: a **non-repeatable read** inside one transaction.',
            rows: [['t1', 'BEGIN; read balance', '', 100], ['t2', '', 'UPDATE to 50; COMMIT', ''], ['t3', 'read balance again', '', 50]], m: '  h' },
          { clause: 't4', hl: 'COMMIT;', label: 'timeline', text: 'Under **repeatable read** or serializable, A would keep reading its snapshot and see 100 both times. Which one you get depends on the isolation level, so know your database\'s default.', m: '' }
        ]
      },
      {
        title: 'Lost update, and two fixes',
        norun: true,
        chips: ['t1', 't2', 't3', 'fix'],
        sql: `CREATE TABLE stock (id INTEGER PRIMARY KEY, qty INTEGER);
INSERT INTO stock VALUES (1, 10);
-- Both sessions want to sell one item, in application code:
--   qty = SELECT qty FROM stock WHERE id = 1      (both read 10)
--   UPDATE stock SET qty = <qty - 1> WHERE id = 1  (both write 9)
-- Fix 1: let the database do the arithmetic atomically
UPDATE stock SET qty = qty - 1 WHERE id = 1 AND qty > 0;
-- Fix 2: lock the row while deciding (PostgreSQL/MySQL)
--   SELECT qty FROM stock WHERE id = 1 FOR UPDATE`,
        steps: [
          { clause: 't1', hl: 'qty = SELECT qty FROM stock WHERE id = 1', label: 'timeline', text: 'A and B both read the stock: 10.', cols: ['time', 'session A', 'session B', 'stored qty'], rows: [['t1', 'read qty = 10', 'read qty = 10', 10]], m: 'h' },
          { clause: 't2', hl: 'UPDATE stock SET qty = <qty - 1> WHERE id = 1', label: 'timeline', text: 'A writes 10 − 1 = 9.', rows: [['t1', 'read qty = 10', 'read qty = 10', 10], ['t2', 'write 9', '', 9]], m: ' h' },
          { clause: 't3', hl: 'UPDATE stock SET qty = <qty - 1> WHERE id = 1', label: 'timeline', text: 'B also writes 10 − 1 = 9, computed from its stale read. Two items sold, stock down by one: a **lost update**.',
            rows: [['t1', 'read qty = 10', 'read qty = 10', 10], ['t2', 'write 9', '', 9], ['t3', '', 'write 9', 9]], m: '  h' },
          { clause: 'fix', hl: 'UPDATE stock SET qty = qty - 1 WHERE id = 1 AND qty > 0;', label: 'timeline with the atomic update', text: 'Doing the arithmetic in the UPDATE makes each decrement read the current value under the row lock: 10 → 9 → 8. `SELECT ... FOR UPDATE` or a version check (optimistic locking) also work.',
            rows: [['t1', 'qty = qty - 1', '', 9], ['t2', '', 'qty = qty - 1 (waits, then sees 9)', 8]], m: '' }
        ]
      }
    ],
    sections: [
      {
        name: 'Optimistic locking with a version column',
        text: [
          'No locks while the user edits. On save, update only if the version is still the one you read; if another edit got there first, zero rows change and you report a conflict.'
        ],
        sql: DOCS + `
UPDATE docs SET body = 'edited', version = version + 1 WHERE id = 1 AND version = 1;
UPDATE docs SET body = 'stale edit', version = version + 1 WHERE id = 1 AND version = 1;
SELECT body, version FROM docs;`,
        out: { cols: ['body', 'version'], rows: [['edited', 2]] }
      },
      {
        name: 'Pessimistic locking',
        text: [
          '`SELECT ... FOR UPDATE` (PostgreSQL, MySQL, Oracle) locks the selected rows until the transaction ends, so a read-modify-write cannot be interleaved. Simple and safe, but other writers wait, and lock ordering mistakes can deadlock (the database detects and aborts one transaction).'
        ]
      },
      {
        name: 'Write skew',
        text: [
          'Two doctors on call each check "is someone else on call?" (yes), then each removes themselves. No row was written by both, so repeatable read/snapshot allows it, yet the rule "at least one on call" is broken. Only **serializable** isolation (or explicit locks on the checked rows) prevents it.'
        ]
      }
    ],
    table: {
      head: ['Level', 'Dirty read', 'Non-repeatable read', 'Phantom', 'Lost update'],
      rows: [
        ['Read uncommitted', 'possible', 'possible', 'possible', 'possible'],
        ['Read committed', '—', 'possible', 'possible', 'possible'],
        ['Repeatable read', '—', '—', 'possible*', 'prevented in PG / possible in MySQL'],
        ['Serializable', '—', '—', '—', '—']
      ]
    },
    pitfalls: [
      ['Read-modify-write in application code', 'Lost updates. Use atomic UPDATEs, FOR UPDATE, or version checks.'],
      ['Assuming every database defaults to the same level', 'PostgreSQL: read committed; MySQL: repeatable read; SQLite: serializable.'],
      ['Serializable without retry logic', 'Serializable transactions can be aborted; the application must retry.'],
      ['Long-running transactions under MVCC', 'Old snapshots keep old row versions alive (bloat) and hold locks.']
    ],
    interview: [
      ['Explain the isolation levels.', ['Read uncommitted (can see uncommitted data), read committed (each statement sees committed data), repeatable read (a transaction keeps seeing the same rows), serializable (equivalent to running one at a time). Stronger levels prevent more anomalies at more cost.']],
      ['What is a lost update and how do you prevent it?', ['Two transactions read the same value and both write a result based on it, so one change is overwritten. Prevent with atomic updates (`SET x = x - 1`), row locks (`SELECT ... FOR UPDATE`), optimistic version checks, or serializable isolation.']],
      ['What is MVCC?', ['Multi-version concurrency control: writers create new row versions instead of overwriting, and each transaction reads a snapshot of versions committed before it started (or before each statement). Readers do not block writers and vice versa.']],
      ['Optimistic vs pessimistic locking?', ['Pessimistic locks rows up front (FOR UPDATE) and makes others wait. Optimistic does not lock; it checks at write time (version column) that nothing changed and retries or reports a conflict otherwise. Optimistic suits low-contention, user-facing edits.']]
    ],
    say: [
      'Isolation level decides which anomalies are possible.',
      'Defaults differ: PostgreSQL read committed, MySQL repeatable read.',
      'Fix lost updates with atomic UPDATE, FOR UPDATE or version checks.'
    ],
    checklist: [
      'Fill in the anomaly table.',
      'Walk through a lost update.',
      'Write an optimistic update with a version column.',
      'Explain write skew.'
    ],
    drills: {
      predict: [
        {
          sql: DOCS + `
UPDATE docs SET body = 'edited', version = version + 1 WHERE id = 1 AND version = 1;
UPDATE docs SET body = 'stale edit', version = version + 1 WHERE id = 1 AND version = 1;
SELECT changes() AS rows_changed;`,
          answer: { cols: ['rows_changed'], rows: [[0]] },
          why: 'The second update expected version 1, but it is now 2: zero rows changed, so the app knows there was a conflict.'
        },
        {
          sql: `UPDATE products SET price = price + 1 WHERE id = 2;
UPDATE products SET price = price + 1 WHERE id = 2;
SELECT price FROM products WHERE id = 2;`,
          tables: ['products'],
          answer: { cols: ['price'], rows: [[8]] },
          why: 'Atomic increments never lose an update: 6 → 7 → 8.'
        },
        {
          sql: `CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER);
INSERT INTO accounts VALUES (1, 100);
UPDATE accounts SET balance = balance - 80 WHERE id = 1 AND balance >= 80;
UPDATE accounts SET balance = balance - 80 WHERE id = 1 AND balance >= 80;
SELECT balance FROM accounts;`,
          answer: { cols: ['balance'], rows: [[20]] },
          why: 'The condition is checked atomically with the update, so the second withdrawal is refused.'
        },
        {
          sql: `CREATE TABLE seats (id INTEGER PRIMARY KEY, taken_by TEXT);
INSERT INTO seats VALUES (1, NULL);
UPDATE seats SET taken_by = 'ana' WHERE id = 1 AND taken_by IS NULL;
UPDATE seats SET taken_by = 'ben' WHERE id = 1 AND taken_by IS NULL;
SELECT taken_by FROM seats;`,
          answer: { cols: ['taken_by'], rows: [['ana']] },
          why: 'The first claim wins; the second finds the seat taken and changes nothing.'
        }
      ],
      fill: [
        {
          q: 'Save only if nobody else saved first.',
          sql: DOCS + `
UPDATE docs SET body = 'mine', version = version + 1
WHERE id = 1 AND [[version = 1|version=1]];
SELECT body, version FROM docs;`,
          answer: { cols: ['body', 'version'], rows: [['mine', 2]] },
          why: 'The version check makes the write conditional on what you read.'
        },
        {
          q: 'Decrement stock atomically, never below zero.',
          sql: `CREATE TABLE stock (id INTEGER PRIMARY KEY, qty INTEGER);
INSERT INTO stock VALUES (1, 1);
UPDATE stock SET qty = [[qty - 1]] WHERE id = 1 AND qty > 0;
UPDATE stock SET qty = qty - 1 WHERE id = 1 AND qty > 0;
SELECT qty FROM stock;`,
          answer: { cols: ['qty'], rows: [[0]] },
          why: 'Compute from the current stored value, guarded by the condition.'
        }
      ],
      write: [
        {
          task: 'Create seats(id INTEGER PRIMARY KEY, taken_by TEXT) with one free seat (id 1). Then try to claim it for \'ana\' and then for \'ben\' so that only the first succeeds, and finally select taken_by.',
          solution: `CREATE TABLE seats (id INTEGER PRIMARY KEY, taken_by TEXT);
INSERT INTO seats VALUES (1, NULL);
UPDATE seats SET taken_by = 'ana' WHERE id = 1 AND taken_by IS NULL;
UPDATE seats SET taken_by = 'ben' WHERE id = 1 AND taken_by IS NULL;
SELECT taken_by FROM seats;`,
          why: 'A conditional UPDATE is an atomic check-and-set.'
        },
        {
          task: 'Using a version column, create docs(id, body, version) with (1, \'draft\', 1); apply an edit that requires version 1 and bumps it; then apply a second edit that also requires version 1. Return body and version.',
          solution: `CREATE TABLE docs (id INTEGER PRIMARY KEY, body TEXT, version INTEGER);
INSERT INTO docs VALUES (1, 'draft', 1);
UPDATE docs SET body = 'first', version = version + 1 WHERE id = 1 AND version = 1;
UPDATE docs SET body = 'second', version = version + 1 WHERE id = 1 AND version = 1;
SELECT body, version FROM docs;`,
          why: 'The second edit is based on a stale version and is rejected.'
        }
      ]
    }
  });
})();
