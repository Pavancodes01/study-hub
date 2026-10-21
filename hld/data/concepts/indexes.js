(function(){
var bt = { w: 820, h: 330, nodes: [
  { id: 'q', label: 'Query', sub: 'email = maya@…', kind: 'service', x: 90, y: 60, w: 140 },
  { id: 'root', label: 'root', sub: 'a–m | n–z', kind: 'key', x: 410, y: 60, w: 120, h: 40 },
  { id: 'l', label: 'a–f | g–m', kind: 'key', x: 250, y: 160, w: 110, h: 38 },
  { id: 'r', label: 'n–s | t–z', kind: 'key', x: 570, y: 160, w: 110, h: 38 },
  { id: 'leaf', label: 'leaf g–m', sub: 'maya → row 812', kind: 'key', x: 330, y: 265, w: 150, h: 46 },
  { id: 'tbl', label: 'Table', sub: '50M rows', kind: 'db', x: 650, y: 270, w: 120 }
], edges: [['q', 'root'], ['root', 'l'], ['root', 'r'], ['l', 'leaf'], ['leaf', 'tbl', { label: 'row 812' }]] };
var lsm = { w: 820, h: 320, nodes: [
  { id: 'w', label: 'Writes', kind: 'client', x: 80, y: 80 },
  { id: 'wal', label: 'Write-ahead log', sub: 'append only', kind: 'blob', x: 290, y: 245, w: 150 },
  { id: 'mem', label: 'Memtable', sub: 'sorted, in RAM', kind: 'cache', x: 290, y: 80, w: 140 },
  { id: 's1', label: 'SSTable 1', sub: 'newest', kind: 'db', x: 540, y: 60, w: 118 },
  { id: 's2', label: 'SSTable 2', kind: 'db', x: 540, y: 160, w: 118 },
  { id: 's3', label: 'SSTable 3', sub: 'oldest', kind: 'db', x: 540, y: 260, w: 118 },
  { id: 'cmp', label: 'Compaction', sub: 'merge + drop old', kind: 'worker', x: 730, y: 160, w: 120 }
], edges: [['w', 'mem'], ['w', 'wal'], ['mem', 's1', { label: 'flush' }], ['s1', 'cmp'], ['s2', 'cmp'], ['s3', 'cmp']] };

registerConcept({
  slug: 'indexes', order: 9, title: 'Indexes and storage engines',
  one: 'An index is a ==sorted lookup structure that turns a full table scan into a few jumps==. B-trees favour reads; LSM trees favour writes.',
  picture: [
    'Finding a topic in a 1,000-page book: without an index you read every page (a **full scan**). With the index at the back you jump to the right page in seconds. But every time the book changes, the index must be updated too, so indexes make writes slower.',
    'Databases store indexes in one of two main structures: **B-trees** (update pages in place, great for reads) or **LSM trees** (append writes, merge later, great for writes).'
  ],
  use: ['a column in WHERE, JOIN or ORDER BY on a big table', 'uniqueness rules (unique index)', 'queries that must stay fast as data grows'],
  avoid: ['indexing every column (each slows writes and uses space)', 'low-selectivity columns alone (a boolean flag)', 'tiny tables (a scan is already fast)'],
  flows: [
    { name: 'B-tree lookup', title: 'Finding one row among 50 million', diagram: bt, steps: [
      { title: 'Without an index', text: 'The database reads all 50M rows to find one email. Seconds of disk reads, growing with the table.', on: ['tbl'], set: { tbl: { sub: 'scan 50M rows' } }, anno: [{ node: 'tbl', text: 'O(n)', dy: -50 }] },
      { title: 'Start at the root', text: 'A B-tree index on `email` is a short, wide tree of sorted pages. The root says: a–m go left, n–z go right.', on: ['root'], dots: [{ from: 'q', to: 'root', label: 'maya…' }] },
      { title: 'Walk down', text: '"maya" is in a–m, then in g–m. Each step reads one page. With ~500 keys per page, 3–4 levels cover billions of rows.', on: ['l', 'leaf'], dots: [{ from: 'root', to: 'l' }, { from: 'l', to: 'leaf' }] },
      { title: 'Jump to the row', text: 'The leaf points to the row\'s location. Total: ~4 page reads instead of millions. That is O(log n).', on: ['tbl', 'leaf'], dots: [{ from: 'leaf', to: 'tbl', label: 'row 812', kind: 'res' }], anno: [{ node: 'leaf', text: '~4 reads total', dy: 46 }] }
    ]},
    { name: 'LSM write path', title: 'Write-optimized storage: LSM tree', diagram: lsm, steps: [
      { title: 'Write lands in memory', text: 'Writes go to an in-memory sorted table (memtable) and are appended to a log for crash safety. No random disk writes: very fast.', on: ['mem', 'wal'], dots: [{ from: 'w', to: 'mem', label: 'put k=v' }, { from: 'w', to: 'wal', label: 'append', kind: 'evt' }] },
      { title: 'Flush to an SSTable', text: 'When the memtable is full, it is written to disk in one go as an immutable sorted file (SSTable).', on: ['s1'], dots: [{ from: 'mem', to: 's1', label: 'flush', kind: 'evt' }] },
      { title: 'Reads check several files', text: 'A read checks the memtable, then SSTables newest to oldest. Bloom filters skip files that surely do not have the key.', on: ['mem', 's1', 's2', 's3'] },
      { title: 'Compaction', text: 'In the background, SSTables are merged, old versions and deletes are dropped. Keeps reads fast but uses disk I/O.', on: ['cmp'], dots: [{ from: 's2', to: 'cmp', kind: 'evt' }, { from: 's3', to: 'cmp', kind: 'evt' }] }
    ]}
  ],
  how: [
    { name: 'B-tree', text: ['Balanced tree of fixed-size pages, kept sorted. Lookups, range scans and ordered reads are O(log n) with very few page reads. Writes update pages in place (plus a write-ahead log), which means random I/O. Default in PostgreSQL, MySQL InnoDB, most relational databases.'] },
    { name: 'LSM tree', text: ['Log-structured merge tree: buffer writes in memory, flush sorted immutable files, merge them in the background. Sequential writes give very high write throughput; reads may touch several files (helped by Bloom filters and compaction). Used by Cassandra, RocksDB, LevelDB, HBase, ScyllaDB.'] },
    { name: 'Composite indexes and the leftmost rule', text: ['An index on `(user_id, created_at)` is sorted by user, then time. It serves `WHERE user_id = ?` and `WHERE user_id = ? ORDER BY created_at`, but not `WHERE created_at > ?` alone. Put the equality column first, then the range or sort column.'],
      code: 'CREATE INDEX idx_orders_user_time ON orders (user_id, created_at DESC);\n\n-- uses the index: latest 20 orders of one user\nSELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;' },
    { name: 'Covering index', text: ['If the index contains every column the query needs, the database answers from the index alone without visiting the table ("index-only scan"). Great for hot queries; costs more space.'] },
    { name: 'Other index types', text: ['**Hash index**: exact-match only. **Inverted index**: word → documents, for full-text search. **Geospatial** (R-tree, geohash, S2): "places near me". **Bitmap**: low-cardinality columns in analytics.'] }
  ],
  compare: { title: 'B-tree vs LSM tree', lead: null, head: ['', 'B-tree', 'LSM tree'], rows: [
    ['Writes', 'In-place page updates, random I/O', 'Append + sequential flush, very fast'],
    ['Reads', 'Predictable, few page reads', 'May check several files; Bloom filters help'],
    ['Range scans', 'Excellent', 'Good after compaction'],
    ['Background work', 'Little', 'Compaction uses I/O and CPU'],
    ['Space', 'Some fragmentation', 'Old versions until compaction'],
    ['Used by', 'PostgreSQL, MySQL', 'Cassandra, RocksDB, HBase']
  ]},
  say: [
    'The feed query filters by user and sorts by time, so I\'ll add a composite index on (user_id, created_at).',
    'This workload is write-heavy and append-only, so an LSM-based store like Cassandra fits better than a B-tree database.',
    'Every index slows writes, so I\'ll only index the columns the hot queries use.',
    'Full-text search needs an inverted index, so it goes to Elasticsearch, not a LIKE query.'
  ],
  numbers: [
    ['3–4', 'B-tree levels for billions of rows'],
    ['~100 µs', 'random read from an SSD'],
    ['~10 ms', 'random read from a spinning disk'],
    ['O(log n) vs O(n)', 'indexed lookup vs full scan']
  ],
  pitfalls: [
    ['Index on everything', 'Each index is updated on every write and takes space. Index for real queries.'],
    ['Wrong column order', 'An index on (created_at, user_id) does not help `WHERE user_id = ?`.'],
    ['Functions on indexed columns', '`WHERE LOWER(email) = ?` skips a plain index on email. Use an expression index or store normalized values.'],
    ['LIKE \'%word%\'', 'A leading wildcard cannot use a B-tree. Use full-text search.'],
    ['Ignoring the query plan', 'Run EXPLAIN to see if the index is actually used.']
  ],
  seen: [
    ['PostgreSQL / MySQL', 'B-tree indexes by default; GIN for full-text and JSON; GiST for geospatial.'],
    ['Cassandra, RocksDB', 'LSM storage with Bloom filters and compaction strategies.'],
    ['Elasticsearch', 'Inverted indexes for full-text search.'],
    ['Uber, Redis', 'Geospatial indexes (H3 hexagons, geohash) for "nearby" queries.']
  ],
  probe: [
    ['Why not index every column?', ['Each index must be updated on every insert/update/delete, slowing writes and using storage and memory. The optimizer may also pick worse plans. Index the columns your frequent queries filter, join or sort on.']],
    ['When would you choose an LSM-based database?', ['Write-heavy, append-mostly workloads: events, messages, metrics, logs. Accept more complex reads and background compaction.']],
    ['How does a composite index work?', ['Sorted by the first column, then the second within it. It helps queries that use a left prefix of its columns; put equality filters first and the range/sort column last.']],
    ['How do you index for "nearby"?', ['A geospatial index: geohash or S2/H3 cells turn 2D positions into keys, so "nearby" becomes a lookup of a few neighbouring cells.']]
  ],
  checklist: [
    'Explain why an index speeds reads and slows writes.',
    'Draw a B-tree lookup and say why it is O(log n).',
    'Explain the LSM write path and compaction.',
    'Design a composite index for a given query.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-composite', title: 'Index for a feed', ask: 'Query: `WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`. Best index?', options: [
        ['(user_id, created_at)', true, 'Equality column first, then the sort column: the index returns rows already in order.'],
        ['(created_at, user_id)', false, 'Sorted by time first, so one user\'s rows are scattered.'],
        ['(created_at) only', false, 'Still has to filter all users.'],
        ['No index', false, 'Full scan per feed request.']
      ]},
      { id: 'mcq-lsm', title: 'Metrics store', ask: 'You ingest 500k metric points per second, mostly appended, read by time range. Storage engine?', options: [
        ['LSM-tree based (e.g. Cassandra / RocksDB / a time-series DB)', true, 'Sequential, append-friendly writes at high throughput.'],
        ['B-tree with an index on every column', false, 'Random writes and many indexes would choke.'],
        ['A graph database', false, 'No graph traversal needed.'],
        ['In-memory hash map only', false, 'Not durable and no range queries.']
      ]},
      { id: 'mcq-like', title: 'Search by word', ask: '`WHERE title LIKE \'%phone%\'` is slow on 20M rows despite an index on title. Why?', options: [
        ['A leading wildcard cannot use a B-tree; use a full-text (inverted) index', true, 'B-trees are sorted by the start of the value.'],
        ['The index is corrupted', false, 'Even a healthy B-tree cannot help here.'],
        ['The table needs sharding', false, 'Sharding would just spread the scan.'],
        ['LIKE is always slow', false, '`LIKE \'phone%\'` (prefix) can use the index.']
      ]}
    ],
    order: [
      { id: 'ord-lsm', title: 'LSM write path', ask: 'Order what happens to a write in an LSM tree.', steps: [
        'Append the write to the write-ahead log',
        'Insert it into the in-memory memtable',
        'Flush the full memtable to an immutable SSTable',
        'Merge SSTables during compaction'
      ], extra: ['Update the page in place on disk'] }
    ],
    fill: [
      { id: 'fill-idx', title: 'Trade-off', text: 'An index makes [[reads|lookups]] faster but every [[write|insert]] slower, because the index must be updated too.' }
    ]
  }
});
})();
