(function(){
var pick = { w: 820, h: 330, nodes: [
  { id: 'app', label: 'Service', kind: 'service', x: 100, y: 165 },
  { id: 'sql', label: 'PostgreSQL', sub: 'orders, payments', kind: 'db', x: 380, y: 55, w: 130 },
  { id: 'kv', label: 'DynamoDB', sub: 'sessions, carts', kind: 'db', x: 380, y: 165, w: 130 },
  { id: 'doc', label: 'MongoDB', sub: 'product catalog', kind: 'db', x: 380, y: 275, w: 130 },
  { id: 'wide', label: 'Cassandra', sub: 'events, messages', kind: 'db', x: 640, y: 110, w: 130 },
  { id: 'gr', label: 'Neo4j', sub: 'friend graph', kind: 'db', x: 640, y: 240, w: 130 }
], edges: [['app', 'sql'], ['app', 'kv'], ['app', 'doc'], ['app', 'wide'], ['app', 'gr']] };

registerConcept({
  slug: 'databases', order: 4, title: 'Databases: SQL or NoSQL',
  one: 'Pick the database from ==how you read and write the data==, not from fashion. Relational by default; NoSQL when a specific access pattern or scale needs it.',
  picture: [
    'A relational database is a well-organized office with filing cabinets and cross-references: any question can be answered, and changes across several files happen all-or-nothing (transactions). NoSQL stores are specialist warehouses: each is built to fetch one kind of thing extremely fast at huge scale, but asking an unusual question is slow or impossible.',
    'In an interview, start from the **access pattern**: "we always fetch by user ID", "we need joins across orders and payments", "we append millions of events per second". The pattern picks the store.'
  ],
  use: ['SQL: money, inventory, anything needing transactions', 'SQL: data with relationships and ad-hoc queries', 'Key-value: lookup by one key at huge scale', 'Wide-column: heavy writes, time-ordered data', 'Document: flexible, nested records read as a whole'],
  avoid: ['NoSQL "because it scales" without a pattern that needs it', 'SQL for 1M writes/s of append-only events on one node', 'a graph DB for data that is only ever looked up by ID'],
  flows: [
    { name: 'One app, right tool each', title: 'Polyglot persistence: each data shape in the store that fits it', diagram: pick, steps: [
      { title: 'Money needs transactions', text: 'An order and its payment must both commit or both fail. Relational databases give **ACID** transactions and joins. Default choice.', on: ['sql'], dots: [{ from: 'app', to: 'sql', label: 'BEGIN … COMMIT' }] },
      { title: 'Lookup by one key', text: 'Shopping carts are always read by user ID. A key-value store does that in single-digit ms at any scale and partitions by key automatically.', on: ['kv'], dots: [{ from: 'app', to: 'kv', label: 'GET cart:42' }] },
      { title: 'Nested, changing shape', text: 'A product has different fields per category. A document store saves the whole JSON object and reads it back in one go.', on: ['doc'], dots: [{ from: 'app', to: 'doc', label: '{ product … }' }] },
      { title: 'Write-heavy, time-ordered', text: 'Chat messages and events: huge write volume, read by partition (chat ID) and time. Wide-column stores like Cassandra are built for exactly this.', on: ['wide'], dots: [{ from: 'app', to: 'wide', label: 'INSERT msg' }] },
      { title: 'Relationships are the query', text: '"Friends of friends who like X" is many hops. A graph database walks relationships directly instead of doing many joins.', on: ['gr'], dots: [{ from: 'app', to: 'gr', label: 'MATCH (a)-[:FRIEND*2]' }] },
      { title: 'Cost of many stores', text: 'Each extra database is more to run, back up and keep consistent. Use one until a clear pattern justifies another.', on: ['app'], anno: [{ node: 'app', text: 'every store = more ops work', dy: -50 }] }
    ]}
  ],
  how: [
    { name: 'Relational (SQL)', text: [
      'Tables with fixed columns, relations via foreign keys, a powerful query language, and **ACID** transactions: Atomic (all or nothing), Consistent (rules hold), Isolated (concurrent transactions do not see half-done work), Durable (committed means saved).',
      'Scales up well, and to many reads with replicas. Scaling writes beyond one machine needs sharding, which is manual work (or a distributed SQL database like Spanner, CockroachDB, Vitess).'
    ]},
    { name: 'Key-value', text: ['A giant hash map: `put(key, value)`, `get(key)`. Examples: DynamoDB, Redis, Riak. Partitions by key so it scales nearly linearly. No queries by value unless you add secondary indexes.'] },
    { name: 'Document', text: ['Stores JSON-like documents; can query fields inside them and index them. Examples: MongoDB, Couchbase. Good when a record is read and written as a whole. Joins are weak, so you often duplicate data.'] },
    { name: 'Wide-column', text: ['Rows grouped by a partition key and sorted by a clustering key inside the partition: "all messages of chat 7, newest first". Examples: Cassandra, HBase, Bigtable. Huge write throughput (log-structured storage); you design tables per query.'] },
    { name: 'Others', text: ['**Graph** (Neo4j): traversals. **Time-series** (InfluxDB, TimescaleDB): metrics with downsampling. **Search** (Elasticsearch): full-text. **Analytical / columnar** (BigQuery, ClickHouse): scans and aggregates over billions of rows.'] }
  ],
  compare: { title: 'Which store for which pattern', lead: null, head: ['Type', 'Data shape', 'Strong at', 'Weak at', 'Examples'], rows: [
    ['Relational', 'Tables + relations', 'Transactions, joins, ad-hoc queries', 'Scaling writes past one node', 'PostgreSQL, MySQL'],
    ['Key-value', 'key → blob', 'Single-key reads/writes at any scale', 'Queries by value, joins', 'DynamoDB, Redis'],
    ['Document', 'JSON documents', 'Whole-record reads, flexible schema', 'Joins, multi-doc transactions', 'MongoDB'],
    ['Wide-column', 'Partition + sorted rows', 'Massive writes, time-ordered reads', 'Ad-hoc queries, strong consistency by default', 'Cassandra, Bigtable'],
    ['Graph', 'Nodes + edges', 'Multi-hop relationships', 'Bulk scans, simple lookups', 'Neo4j'],
    ['Columnar (OLAP)', 'Columns', 'Aggregations over billions of rows', 'Single-row updates, low latency', 'BigQuery, ClickHouse']
  ]},
  say: [
    'Orders and payments need transactions, so they go in PostgreSQL.',
    'Messages are write-heavy and read per chat in time order, so a wide-column store partitioned by chat ID fits.',
    'Access is always by user ID, so a key-value store gives single-digit ms reads at any scale.',
    'I\'d start with one relational database and only add another store when a specific pattern needs it.'
  ],
  numbers: [
    ['~10k–50k', 'simple writes/s on one tuned SQL node'],
    ['~1–10 ms', 'single-key read in a KV store'],
    ['~16 TB', 'practical comfortable size of one SQL node', 'bigger works but backups and migrations hurt'],
    ['100k+', 'writes/s across a modest Cassandra cluster']
  ],
  pitfalls: [
    ['NoSQL by default', '"It scales" is not a reason. Without a pattern that needs it you lose transactions and flexible queries.'],
    ['Ignoring the query', 'In Cassandra or DynamoDB you design tables for each query. Pick the partition key from the read pattern first.'],
    ['Hot partition key', 'Partitioning by country or by date sends most traffic to one partition. Pick a key with many evenly used values.'],
    ['Joins across services', 'Splitting data across databases means no SQL joins between them; plan how you will combine data.'],
    ['Too many stores', 'Five databases for a small system multiply ops work, backups and consistency problems.']
  ],
  seen: [
    ['Discord', 'Stores trillions of messages in a wide-column store (Cassandra, later ScyllaDB), partitioned by channel and time bucket.'],
    ['Amazon', 'DynamoDB grew from the need for an always-available shopping cart looked up by key.'],
    ['Uber, Shopify', 'Run very large MySQL fleets with sharding layers for core transactional data.'],
    ['LinkedIn', 'Uses graph-oriented storage for the social graph and degree-of-connection queries.']
  ],
  probe: [
    ['Why not just use NoSQL everywhere?', ['You give up multi-row transactions, joins and ad-hoc queries, and must design tables per query. For money or inventory that pushes correctness into your own code. Use it where a clear access pattern and scale demand it.']],
    ['How would you scale writes in PostgreSQL?', ['First vertical scaling and batching. Then shard by a key (user ID, tenant ID) with a routing layer or Citus/Vitess-style tooling, or move to a distributed SQL database. Reads scale separately with replicas.']],
    ['What is a good partition key?', ['One with many distinct values, accessed evenly, and present in your main queries: user ID, chat ID, order ID. Bad: country, status, created date (hot spots).']],
    ['Normalize or denormalize?', ['Normalize in SQL by default for correctness. Denormalize (store copies) when reads must be fast and joins are too costly, and accept that updates must touch several places.']]
  ],
  checklist: [
    'Explain ACID in one sentence per letter.',
    'Name the main NoSQL types with one use case each.',
    'Pick a store for: payments, chat messages, user sessions, product catalog.',
    'Explain what makes a good partition key.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-wallet', title: 'Wallet transfers', ask: 'A wallet app moves money between users; both balances must change together. Store?', options: [
        ['Relational database with transactions', true, 'Debit and credit happen in one ACID transaction: both or neither.'],
        ['Cassandra with two separate writes', false, 'A crash between writes leaves money created or destroyed.'],
        ['Redis only', false, 'Redis is not the system of record for money; durability and multi-key transactions are limited.'],
        ['Elasticsearch', false, 'A search engine, not a transactional store.']
      ]},
      { id: 'mcq-msgs', title: 'Chat history', ask: 'Billions of chat messages, written constantly, read as "latest 50 in chat X". Store?', options: [
        ['Wide-column store partitioned by chat ID, sorted by time', true, 'One partition read returns the latest messages in order; writes are cheap appends.'],
        ['Graph database', false, 'There is no multi-hop relationship query here.'],
        ['One PostgreSQL table without sharding', false, 'Write volume and size will outgrow one node.'],
        ['Columnar analytics DB', false, 'Built for big scans, not low-latency per-chat reads.']
      ]},
      { id: 'mcq-key', title: 'Partition key', ask: 'An orders table in DynamoDB is partitioned by `status` (pending, shipped, delivered). What happens?', options: [
        ['Hot partitions: almost all writes hit "pending"', true, 'Few distinct values means a few partitions take all the load.'],
        ['Perfectly even load', false, 'Three values cannot spread load across many partitions.'],
        ['Faster joins', false, 'DynamoDB does not join.'],
        ['Nothing, partition keys do not matter', false, 'They decide where data lives and how load spreads.']
      ]}
    ],
    order: [
      { id: 'ord-choose', title: 'Choosing a database', ask: 'Order the questions to ask when choosing a store.', steps: [
        'What are the main read and write queries?',
        'Do I need multi-row transactions?',
        'How much data and how many reads/writes per second?',
        'What consistency does each query need?',
        'Pick the store and its partition / index keys'
      ], extra: ['Pick whatever database is trending'] }
    ],
    fill: [
      { id: 'fill-acid', title: 'ACID', text: 'ACID stands for [[atomicity|atomic]], consistency, [[isolation|isolated]] and [[durability|durable]].' }
    ]
  }
});
})();
