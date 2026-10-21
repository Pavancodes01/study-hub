(function(){
var sh = { w: 820, h: 330, nodes: [
  { id: 'app', label: 'App', kind: 'service', x: 90, y: 165 },
  { id: 'rt', label: 'Router', sub: 'shard = f(user_id)', kind: 'lb', x: 290, y: 165, w: 150 },
  { id: 's0', label: 'Shard 0', sub: 'users A–H', kind: 'db', x: 590, y: 55, w: 128 },
  { id: 's1', label: 'Shard 1', sub: 'users I–Q', kind: 'db', x: 590, y: 165, w: 128 },
  { id: 's2', label: 'Shard 2', sub: 'users R–Z', kind: 'db', x: 590, y: 275, w: 128 }
], edges: [['app', 'rt'], ['rt', 's0'], ['rt', 's1'], ['rt', 's2']] };

registerConcept({
  slug: 'sharding', order: 6, title: 'Sharding (partitioning)',
  one: 'Split one big dataset into pieces on different machines so ==each machine holds and writes only part of it==. Choosing the shard key decides almost everything.',
  picture: [
    'A phone book too big for one volume is split into A–H, I–Q and R–Z. Each volume is small, and three people can look up names at the same time. Finding "Patel" is easy: you know which volume. Finding "everyone living on Main Street" means opening all three.',
    'That is sharding. The **shard key** (here, the surname) decides where each row lives. Queries that include the key hit one shard; queries without it hit all shards.'
  ],
  use: ['writes or data size exceed one machine', 'data splits naturally by user, tenant or region', 'you need to keep growing with more machines'],
  avoid: ['reads are the only problem (cache and replicas first)', 'your queries rarely include any one key', 'you need many cross-entity transactions'],
  flows: [
    { name: 'Routing', title: 'Routing a query to its shard', diagram: sh, steps: [
      { title: 'Query includes the shard key', text: 'Fetch orders of user "Maya". The router knows the rule and sends the query to exactly one shard.', on: ['rt', 's1'], dots: [{ from: 'app', to: 'rt', label: 'user = Maya' }, { from: 'rt', to: 's1', label: 'I–Q' }] },
      { title: 'Each shard is independent', text: 'Three shards = three times the write capacity and storage. Each shard usually has its own replicas too.', on: ['s0', 's1', 's2'] },
      { title: 'Query without the key', text: '"All orders above $500 today" has no user. The router must ask every shard and merge results: **scatter-gather**. Slow and expensive.', on: ['s0', 's1', 's2'], dots: [{ from: 'rt', to: 's0', label: 'ask all' }, { from: 'rt', to: 's1' }, { from: 'rt', to: 's2' }], anno: [{ node: 'rt', text: 'avoid on hot paths', dy: -54 }] },
      { title: 'Hot shard', text: 'Range by name looked fine, but a celebrity user and a burst of signups starting with "S" overload shard 2. Range keys create hotspots.', bad: ['s2'], set: { s2: { sub: 'users R–Z, 70% load' } } },
      { title: 'Hash the key instead', text: '`shard = hash(user_id) % N` spreads users evenly. You lose range scans by name, but load is balanced. Use consistent hashing so adding shards moves little data.', on: ['rt'], set: { rt: { sub: 'hash(user_id) % 3' }, s0: { sub: 'hash ≡ 0' }, s1: { sub: 'hash ≡ 1' }, s2: { sub: 'hash ≡ 2' } } }
    ]}
  ],
  how: [
    { name: 'Range sharding', text: ['Rows are split by key ranges: A–H, I–Q… or by date. Range queries are efficient and you can split hot ranges. Risk: hotspots when keys are not evenly used (new rows all land in the latest date range).'] },
    { name: 'Hash sharding', text: ['`hash(key)` decides the shard. Even spread, no hotspots from sequential keys. Range queries over the key need all shards. Plain `% N` reshuffles almost everything when N changes, so use **consistent hashing** or a fixed number of virtual partitions mapped to machines.'] },
    { name: 'Directory (lookup) sharding', text: ['A lookup table maps each key (or tenant) to a shard. Most flexible: move a big tenant to its own shard. The directory itself must be fast and highly available (cache it).'] },
    { name: 'Choosing the shard key', text: [
      'Good key: high cardinality, evenly used, present in almost every query, and keeps data that is used together on the same shard (all of a user\'s orders with the user).',
      'Typical choices: user ID, tenant ID, chat ID, order ID. Bad: country, status, timestamps alone.'
    ]},
    { name: 'What gets harder', text: ['Cross-shard joins and transactions (avoid them, or use sagas), global unique IDs (no auto-increment), secondary indexes on non-key fields (local per shard or a global index), and rebalancing when shards grow.'] }
  ],
  compare: { title: 'Sharding strategies', lead: null, head: ['Strategy', 'How a row is placed', 'Strong at', 'Weak at'], rows: [
    ['Range', 'Key falls in a range', 'Range scans, easy to split ranges', 'Hotspots on sequential or skewed keys'],
    ['Hash (mod N)', 'hash(key) % N', 'Even spread, simple', 'Changing N moves most data'],
    ['Consistent hashing', 'Position on a hash ring', 'Even spread, small moves when resizing', 'No range scans; more complex'],
    ['Directory', 'Lookup table', 'Full control, move single tenants', 'Directory must be fast and available'],
    ['Geo', 'Region of the user', 'Data near users, data residency laws', 'Uneven region sizes; cross-region queries']
  ]},
  say: [
    'Writes outgrow one machine, so I\'ll shard by user ID; almost every query includes it.',
    'I\'ll hash the user ID onto 256 virtual partitions and map partitions to machines, so rebalancing moves whole partitions.',
    'All of a user\'s data lives on one shard, so we never need cross-shard transactions on the main path.',
    'Queries without the shard key go to a separate index or analytics store, not a scatter-gather on every request.'
  ],
  numbers: [
    ['~1–2 TB', 'a comfortable shard size for fast backups and moves'],
    ['256–4096', 'virtual partitions to start with', 'more than machines, so you can rebalance'],
    ['N×', 'write capacity with N even shards'],
    ['1 shard', 'what a well-keyed query should touch']
  ],
  pitfalls: [
    ['Sharding too early', 'Caching, replicas and a bigger machine solve most read problems with much less pain.'],
    ['Low-cardinality key', 'Sharding by country gives one giant shard and several empty ones.'],
    ['Monotonic key with range sharding', 'Timestamps or auto-increment IDs send all new writes to the last shard.'],
    ['Cross-shard transactions everywhere', 'If most operations span shards, the key is wrong for the workload.'],
    ['hash % N with changing N', 'Adding one shard moves almost every key. Use consistent hashing or virtual partitions.']
  ],
  seen: [
    ['Instagram', 'Sharded PostgreSQL by user using thousands of logical shards mapped onto fewer physical servers.'],
    ['Discord', 'Messages partitioned by channel and time bucket so one partition never grows without limit.'],
    ['Vitess (YouTube)', 'A sharding layer for MySQL with a routing proxy and resharding tools.'],
    ['DynamoDB, Cassandra', 'Automatic hash partitioning by partition key.']
  ],
  probe: [
    ['How do you pick a shard key?', ['From the main queries: the key should be in nearly every query, have many distinct values used evenly, and keep related data together. Then check the worst-case user (a celebrity) does not overload one shard.']],
    ['How do you add a shard without downtime?', ['Use more virtual partitions than machines. To add a machine, move some partitions: copy data in the background, catch up with the change log, switch routing for those partitions, then delete the old copies.']],
    ['How do you query by a non-key field?', ['Either scatter-gather (fine for rare admin queries), or keep a global secondary index (another table keyed by that field), or send data to a search/analytics store built for those queries.']],
    ['What about a celebrity with huge data?', ['Split that key further (e.g. by user ID + time bucket), give big tenants their own shard via a directory, or cache their hot data.']]
  ],
  checklist: [
    'Explain range vs hash sharding and the hotspot risk of each.',
    'Name the properties of a good shard key.',
    'Explain scatter-gather and why to avoid it.',
    'Explain why hash % N is a problem when adding shards.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-key', title: 'Multi-tenant SaaS', ask: 'A SaaS app stores data for 50,000 companies; every query is within one company. Shard key?', options: [
        ['tenant_id (company)', true, 'Every query includes it and a company\'s data stays together.'],
        ['created_at', false, 'All new writes would hit the newest shard.'],
        ['country', false, 'Too few values and very uneven.'],
        ['random UUID per row', false, 'Spreads evenly but every company query becomes scatter-gather.']
      ]},
      { id: 'mcq-resize', title: 'Adding a 5th shard', ask: 'With `shard = hash(id) % 4`, you add a 5th shard. Roughly how much data moves?', options: [
        ['About 80% of keys', true, 'Most keys get a different result mod 5 than mod 4. Consistent hashing would move about 20%.'],
        ['About 20%', false, 'That is what consistent hashing gives, not plain modulo.'],
        ['None', false, 'Modulo changes for most keys.'],
        ['Exactly the keys of one shard', false, 'Keys move from every shard.']
      ]},
      { id: 'mcq-first', title: 'Before sharding', ask: 'Reads are slow, writes are 200/s, data is 300 GB on one PostgreSQL node. Best next step?', options: [
        ['Add caching and read replicas; do not shard yet', true, 'Writes and size are well within one node. The problem is reads.'],
        ['Shard into 32 shards', false, 'Huge complexity for a read problem.'],
        ['Switch to a graph database', false, 'Nothing suggests a graph workload.'],
        ['Delete old data', false, 'Size is not the problem.']
      ]}
    ],
    order: [
      { id: 'ord-reshard', title: 'Moving a partition to a new machine', ask: 'Order the steps for online rebalancing.', steps: [
        'Pick partitions to move to the new machine',
        'Copy their data in the background',
        'Stream new changes until the copy catches up',
        'Switch routing for those partitions to the new machine',
        'Delete the old copies'
      ], extra: ['Stop all writes for an hour'] }
    ],
    fill: [
      { id: 'fill-key', title: 'Shard key in one sentence', text: 'A good shard key has high [[cardinality]], is used [[evenly|uniformly]], and appears in almost every [[query|request]].' }
    ]
  }
});
})();
