(function () {
  const C = ['id', 'name', 'city', 'joined'];
  const ALL = [
    [1, 'Ana', 'Lisbon', '2024-01-05'], [2, 'Ben', 'Berlin', '2024-02-11'], [3, 'Cara', 'Lisbon', '2024-03-02'],
    [4, 'Dev', null, '2024-03-20'], [5, 'Eli', 'Paris', '2024-04-15'], [6, 'Fay', 'Berlin', '2024-05-01']
  ];
  const T = ['TRUE', 'FALSE', 'TRUE', 'UNKNOWN', 'TRUE', 'FALSE'];

  registerLesson({
    slug: 'null',
    track: 'basics',
    title: 'NULL and three-valued logic',
    one: 'NULL means *unknown*. Any comparison with it is neither true nor false but UNKNOWN, and WHERE keeps only TRUE rows.',
    tables: ['customers', 'orders'],
    idea: [
      'NULL is not a value like 0 or an empty string. It means "no value / unknown". So `city = NULL` does not ask "is city missing?"; it asks "is city equal to something unknown?", and the answer is UNKNOWN.',
      'SQL logic has three values: TRUE, FALSE and UNKNOWN. `WHERE` keeps a row only when the condition is TRUE, so rows whose condition is UNKNOWN silently disappear, even with `<>` and `NOT`.',
      'To test for missing values, use `IS NULL` / `IS NOT NULL`. To replace them, use `COALESCE(x, fallback)`.'
    ],
    stages: [
      {
        title: 'Where did Dev go?',
        sql: `SELECT name, city
FROM customers
WHERE city <> 'Berlin';`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers', text: 'Start with every row of `customers`. Dev has no city: NULL.', cols: C, rows: ALL, q: 'SELECT * FROM customers' },
          { clause: 'WHERE', hl: "WHERE city <> 'Berlin'", text: "Evaluate `city <> 'Berlin'` per row. For Dev it is NULL <> 'Berlin', which is **UNKNOWN**, not TRUE. Only TRUE rows survive, so Dev is dropped along with the Berliners.",
            cols: C.concat(["city <> 'Berlin'"]), rows: ALL.map((r, i) => r.concat([T[i]])), m: ' d d d', hot: [4],
            q: "SELECT *, 'TRUE' FROM customers WHERE city <> 'Berlin'" },
          { clause: 'SELECT', hl: 'SELECT name, city', text: 'Keep only the listed columns. Three rows, although four customers are "not in Berlin" in everyday language.', cols: ['name', 'city'], rows: [['Ana', 'Lisbon'], ['Cara', 'Lisbon'], ['Eli', 'Paris']] }
        ]
      },
      {
        title: 'Keeping the unknowns',
        sql: `SELECT name, COALESCE(city, 'unknown') AS city
FROM customers
WHERE city IS NULL OR city <> 'Berlin';`,
        steps: [
          { clause: 'FROM', hl: 'FROM customers', text: 'The same six customers.', cols: C, rows: ALL, q: 'SELECT * FROM customers' },
          { clause: 'WHERE', hl: "WHERE city IS NULL OR city <> 'Berlin'", text: "`IS NULL` is always TRUE or FALSE, never UNKNOWN. For Dev: TRUE OR UNKNOWN = **TRUE**, so Dev is kept this time.",
            m: ' d   d', q: "SELECT * FROM customers WHERE city IS NULL OR city <> 'Berlin'" },
          { clause: 'SELECT', hl: "COALESCE(city, 'unknown') AS city", text: '`COALESCE` returns its first non-NULL argument, so the missing city is displayed as "unknown".',
            cols: ['name', 'city'], rows: [['Ana', 'Lisbon'], ['Cara', 'Lisbon'], ['Dev', 'unknown'], ['Eli', 'Paris']], hot: [1] }
        ]
      }
    ],
    sections: [
      {
        name: 'NULL spreads',
        text: [
          'Almost any operation with a NULL gives NULL: arithmetic, string concatenation and comparisons. `IS NULL` is the exception; it always answers TRUE or FALSE (SQLite shows those as 1 and 0).'
        ],
        sql: `SELECT NULL = NULL AS eq,
       NULL IS NULL AS is_null,
       1 + NULL AS plus,
       'a' || NULL AS concat;`,
        out: { cols: ['eq', 'is_null', 'plus', 'concat'], rows: [[null, 1, null, null]] }
      },
      {
        name: 'Replacing NULLs: COALESCE and NULLIF',
        text: [
          [
            '`COALESCE(a, b, c)`: the first argument that is not NULL.',
            '`NULLIF(a, b)`: NULL if a equals b, otherwise a. Handy to avoid division by zero: `x / NULLIF(y, 0)`.'
          ]
        ],
        sql: `SELECT id,
       COALESCE(total, 0) AS total,
       NULLIF(status, 'shipped') AS odd_status
FROM orders
WHERE customer_id = 3;`,
        out: { cols: ['id', 'total', 'odd_status'], rows: [[104, 55, null], [105, 0, 'pending']] }
      },
      {
        name: 'Aggregates skip NULLs',
        text: [
          '`COUNT(*)` counts rows. `COUNT(column)`, `SUM`, `AVG`, `MIN` and `MAX` ignore NULLs. The average below is over 6 orders, not 7.'
        ],
        sql: `SELECT COUNT(*) AS all_rows,
       COUNT(total) AS with_total,
       ROUND(AVG(total), 2) AS avg_total
FROM orders;`,
        out: { cols: ['all_rows', 'with_total', 'avg_total'], rows: [[7, 6, 22.67]] }
      },
      {
        name: 'The NOT IN trap',
        text: [
          '`x NOT IN (1, 2, NULL)` means `x <> 1 AND x <> 2 AND x <> NULL`. The last part is UNKNOWN, so the whole thing can never be TRUE. If a subquery used with `NOT IN` can return a NULL, you get **no rows at all**. Use `NOT EXISTS` instead (Subqueries track).'
        ],
        sql: `SELECT 4 NOT IN (1, 2) AS without_null,
       4 NOT IN (1, 2, NULL) AS with_null;`,
        out: { cols: ['without_null', 'with_null'], rows: [[1, null]] }
      }
    ],
    table: {
      head: ['p', 'q', 'p AND q', 'p OR q', 'NOT p'],
      rows: [
        ['TRUE', 'UNKNOWN', 'UNKNOWN', 'TRUE', 'FALSE'],
        ['FALSE', 'UNKNOWN', 'FALSE', 'UNKNOWN', 'TRUE'],
        ['UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN']
      ]
    },
    pitfalls: [
      ['`WHERE col = NULL`', 'Never true. Write `WHERE col IS NULL`.'],
      ['`<>` and `NOT` silently drop NULL rows', 'Add `OR col IS NULL` if those rows should count.'],
      ['`NOT IN` with a subquery that may return NULL', 'Returns no rows. Use `NOT EXISTS` or filter NULLs out of the subquery.'],
      ['`AVG(col)` vs "average including missing as 0"', 'AVG ignores NULLs. Use `AVG(COALESCE(col, 0))` if missing should count as zero.']
    ],
    interview: [
      ['Why does `WHERE col = NULL` return nothing?', ['Comparing anything with NULL gives UNKNOWN, and WHERE keeps only rows where the condition is TRUE. Use `IS NULL`.']],
      ['What is three-valued logic?', ['SQL conditions evaluate to TRUE, FALSE or UNKNOWN. UNKNOWN comes from NULL comparisons. `TRUE OR UNKNOWN` is TRUE, `FALSE AND UNKNOWN` is FALSE, everything else involving UNKNOWN stays UNKNOWN. WHERE, HAVING and JOIN ON keep only TRUE.']],
      ['COUNT(*) vs COUNT(col)?', ['`COUNT(*)` counts all rows. `COUNT(col)` counts rows where col is not NULL. `COUNT(DISTINCT col)` counts distinct non-NULL values.']],
      ['Why is NOT IN dangerous?', ['If the list or subquery contains a NULL, `x NOT IN (...)` is never TRUE, so the query returns nothing. NOT EXISTS does not have this problem.']]
    ],
    say: [
      'NULL means unknown; comparisons with it are UNKNOWN.',
      'WHERE keeps only TRUE, so UNKNOWN rows vanish.',
      'Use IS NULL to test and COALESCE to replace.'
    ],
    checklist: [
      'Fill in the AND/OR table with UNKNOWN.',
      'Explain why Dev disappears from `city <> \'Berlin\'`.',
      'Count rows with and without NULLs.',
      'Explain the NOT IN trap.'
    ],
    drills: {
      predict: [
        {
          sql: `SELECT COUNT(*) AS all_rows, COUNT(city) AS with_city
FROM customers;`,
          tables: ['customers'],
          answer: { cols: ['all_rows', 'with_city'], rows: [[6, 5]] },
          why: '`COUNT(city)` skips Dev, whose city is NULL.'
        },
        {
          sql: `SELECT name
FROM customers
WHERE city = NULL;`,
          tables: ['customers'],
          answer: { cols: ['name'], rows: [] },
          why: '`city = NULL` is UNKNOWN for every row, even Dev\'s. No rows come back.'
        },
        {
          sql: `SELECT name
FROM customers
WHERE NOT (city = 'Lisbon')
ORDER BY name;`,
          tables: ['customers'],
          answer: { cols: ['name'], rows: [['Ben'], ['Eli'], ['Fay']] },
          why: 'For Dev, `city = \'Lisbon\'` is UNKNOWN and `NOT UNKNOWN` is still UNKNOWN, so Dev is not returned.'
        },
        {
          sql: `SELECT id, total * 2 AS doubled
FROM orders
WHERE customer_id = 3;`,
          tables: ['orders'],
          answer: { cols: ['id', 'doubled'], rows: [[104, 110], [105, null]] },
          why: 'NULL times anything is NULL.'
        }
      ],
      fill: [
        {
          q: 'Find customers with no city.',
          sql: `SELECT name
FROM customers
WHERE city [[IS NULL]];`,
          tables: ['customers'],
          answer: { cols: ['name'], rows: [['Dev']] },
          why: '`IS NULL` is the only reliable test for a missing value.'
        },
        {
          q: 'Show 0 instead of a missing total.',
          sql: `SELECT id, [[COALESCE|IFNULL]](total, 0) AS total
FROM orders
WHERE status = 'pending';`,
          tables: ['orders'],
          answer: { cols: ['id', 'total'], rows: [[105, 0]] },
          why: '`COALESCE` (standard) or SQLite\'s `IFNULL` replace NULL with a fallback.'
        }
      ],
      write: [
        {
          task: 'List the names of customers who are not in Lisbon, including customers with no city.',
          tables: ['customers'],
          solution: `SELECT name
FROM customers
WHERE city IS NULL OR city <> 'Lisbon';`,
          alt: [`SELECT name FROM customers WHERE COALESCE(city, '') <> 'Lisbon';`],
          hint: '`<>` alone drops the NULL row.',
          why: 'Adding `city IS NULL` keeps Dev, whose comparison would otherwise be UNKNOWN.'
        },
        {
          task: 'Show every order id with its total, using 0 where the total is missing.',
          tables: ['orders'],
          solution: `SELECT id, COALESCE(total, 0) AS total
FROM orders;`,
          why: 'COALESCE picks the first non-NULL value.'
        }
      ]
    }
  });
})();
