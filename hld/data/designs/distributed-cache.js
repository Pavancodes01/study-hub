(function(){
var D = { w: 860, h: 360, nodes: [
  { id: 'app', label: 'App servers', sub: 'cache client lib', kind: 'service', x: 100, y: 180, w: 140 },
  { id: 'c1', label: 'Cache node 1', sub: 'primary', kind: 'cache', x: 400, y: 60, w: 130 },
  { id: 'c2', label: 'Cache node 2', sub: 'primary', kind: 'cache', x: 400, y: 180, w: 130 },
  { id: 'c3', label: 'Cache node 3', sub: 'primary', kind: 'cache', x: 400, y: 300, w: 130 },
  { id: 'r1', label: 'Replica 1', kind: 'cache', x: 600, y: 60, w: 110 },
  { id: 'cfg', label: 'Config service', sub: 'slot → node map', kind: 'service', x: 100, y: 320, w: 150 },
  { id: 'db', label: 'Database', kind: 'db', x: 760, y: 180 }
], edges: [['app', 'c1'], ['app', 'c2'], ['app', 'c3'], ['c1', 'r1', { label: 'async' }], ['cfg', 'app', { dash: true }], ['app', 'db', { bend: -70, dash: true }]] };

registerDesign({
  slug: 'distributed-cache', order: 4, title: 'Distributed cache',
  one: 'A Redis/Memcached-like cache spread over many nodes: ==sub-millisecond get/set, partitioned by key, evicting with LRU==, surviving node loss without hammering the database.',
  questions: [
    'Total data size and request rate?',
    'Pure cache (data can be lost) or also a store that must survive restarts?',
    'Value sizes? Any huge values?',
    'Eviction policy and TTL support needed?',
    'How hot can a single key get?'
  ],
  reqs: {
    func: ['`get(key)`, `set(key, value, ttl)`, `delete(key)`', 'Eviction when memory is full (LRU)', 'TTL expiry'],
    nonfunc: ['p99 < 1 ms within the data center', 'Millions of ops per second total', 'Scales by adding nodes', 'Node failure loses at most that node\'s data and does not overload the DB'],
    mvp: ['get / set / delete with TTL', 'LRU eviction', 'consistent hashing across nodes', 'replica per primary'],
    later: ['persistence to disk', 'cross-region replication', 'rich data types (lists, sorted sets)']
  },
  estimate: {
    lead: 'Memory and network decide the cluster size.',
    assume: ['1 TB of hot data', '5M ops/s at peak', 'average value 2 KB', 'nodes with 64 GB RAM, ~50 GB usable'],
    rows: [
      ['Nodes by memory', '1 TB ÷ 50 GB', '**~20 primaries** (+20 replicas)'],
      ['Ops per node', '5M ÷ 20', '**250k ops/s** (fine for Redis-class nodes, with pipelining)'],
      ['Network per node', '250k × 2 KB', '**~500 MB/s ≈ 4 Gbit/s**, needs 10 GbE'],
      ['Keys', '1 TB ÷ 2 KB', '**~500M**']
    ],
    so: 'Network bandwidth per node is as important as memory. Large values are the enemy.'
  },
  apiLead: 'Simple commands over a binary protocol (RESP-like) on persistent TCP connections.',
  api: [
    ['GET', 'get(key) → value | null', 'Sub-millisecond lookup.'],
    ['SET', 'set(key, value, ttlSeconds)', 'Overwrite; expire after TTL.'],
    ['DEL', 'delete(key)', 'Used for invalidation after DB writes.']
  ],
  dataLead: 'Everything lives in RAM in a hash table plus an LRU list.',
  data: [
    { name: 'entry', store: 'in-memory hash table on each node', cols: [['key', 'bytes', 'Hashed to a slot'], ['value', 'bytes', 'Opaque'], ['expires_at', 'long', 'Lazy + periodic expiry'], ['lru prev/next', 'pointers', 'O(1) move-to-front and eviction']] },
    { name: 'slot map', store: 'config service (etcd/ZooKeeper), cached by clients', cols: [['slot', '0..16383', 'hash(key) % 16384'], ['primary', 'node id', 'Owner of the slot'], ['replicas', 'node ids', 'Failover targets']] }
  ],
  hld: [
    'Keys hash into 16,384 **slots**; a slot map assigns slots to primaries. Clients cache the map and talk directly to the right node: no proxy hop.',
    'Each node is a **hash map + LRU list** in memory: get/set are O(1), and when memory is full the least recently used entry is evicted.',
    'Each primary has an **async replica**. If a primary dies, the config service promotes its replica and updates the slot map.',
    'The application uses **cache-aside**: on a miss it reads the DB and sets the key. Stampede protection (single-flight, TTL jitter) protects the DB when nodes fail or hot keys expire.'
  ],
  flows: [
    { name: 'Build it up', title: 'From one Redis to a cache cluster', diagram: D, progressive: true, steps: [
      { title: 'One cache node', add: ['app', 'c1', 'db'], text: 'App servers use one cache node, cache-aside in front of the DB. 50 GB and one machine\'s throughput are the limits.', on: ['c1'], dots: [{ from: 'app', to: 'c1', label: 'get' }] },
      { title: 'Partition across nodes', add: ['c2', 'c3'], text: 'Hash each key to a slot; slots are spread over nodes. Capacity and throughput grow with each node.', on: ['c1', 'c2', 'c3'], dots: [{ from: 'app', to: 'c2', label: 'slot 9012' }] },
      { title: 'Who owns which slot?', add: ['cfg'], text: 'A small config service (backed by etcd/ZooKeeper) holds the slot → node map. Clients cache it and refresh when a node says "moved".', on: ['cfg'], dots: [{ from: 'cfg', to: 'app', label: 'slot map v7', kind: 'evt' }] },
      { title: 'Replicas for failover', add: ['r1'], text: 'Each primary streams changes to a replica. If a primary dies, its replica is promoted, so its keys are not all lost at once.', on: ['r1'], dots: [{ from: 'c1', to: 'r1', label: 'replicate', kind: 'evt' }] },
      { title: 'Node failure without a stampede', text: 'Node 2 dies before failover finishes: its keys miss. Single-flight per key in the client ensures one DB read per key, not thousands.', bad: ['c2'], on: ['db'], dots: [{ from: 'app', to: 'db', label: '1 read per key', kind: 'err' }] }
    ]}
  ],
  deep: [
    { name: 'LRU in O(1)', text: ['A hash map from key to a node in a doubly linked list. On access, move the node to the front. On insert when full, remove the tail. Both O(1).'],
      code: 'class LRU<K, V> extends LinkedHashMap<K, V> {\n    private final int cap;\n    LRU(int cap) { super(16, 0.75f, true); this.cap = cap; }   // access order\n    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) {\n        return size() > cap;                                     // evict least recently used\n    }\n}' },
    { name: 'Client-side routing vs proxy', text: ['Smart clients that know the slot map save a network hop (Redis Cluster). A proxy layer (Twemproxy, Envoy) keeps clients simple and pools connections but adds latency. Both are valid; say which and why.'] },
    { name: 'Hot keys', text: ['One key at 1M reads/s overloads its node. Fixes: local near-cache in app servers with a few seconds TTL, or replicate the key under N suffixes (`key#1..key#8`) and read a random one.'] },
    { name: 'Expiry', text: ['Lazy expiry: check TTL on access. Plus a background sampler deletes expired keys so memory is reclaimed even if they are never read again.'] }
  ],
  bottlenecks: [
    ['Network bandwidth per node', 'Keep values small, compress, add nodes.'],
    ['Hot key', 'Near-cache in app servers or key replication.'],
    ['Node failure → DB overload', 'Replicas, single-flight on misses, TTL jitter.'],
    ['Big values block the event loop', 'Cap value size; store large blobs elsewhere.'],
    ['Rebalancing when adding nodes', 'Move slots one at a time, redirect clients during the move.']
  ],
  tradeoffs: [
    ['Partitioning', 'Fixed hash slots', 'Controlled, incremental rebalancing', 'Slot map to manage'],
    ['Replication', 'Async replica per primary', 'Fast writes', 'Lose recent writes on failover (OK for a cache)'],
    ['Routing', 'Smart client', 'No extra hop', 'Clients more complex'],
    ['Eviction', 'Approximate LRU', 'Cheap, good hit rate', 'Not perfect LRU']
  ],
  probe: [
    ['How do you implement LRU efficiently?', ['Hash map + doubly linked list: O(1) lookup, move-to-front and evict-tail. Redis approximates LRU by sampling a few keys to save memory.']],
    ['What happens when you add a node?', ['Move some slots to it: copy keys for a slot, then switch ownership; clients get a redirect and update their slot map. Only those slots\' keys move.']],
    ['How do you protect the database when a cache node dies?', ['Replica failover, single-flight per key on misses, TTL jitter, and rate limiting DB-bound traffic.']],
    ['Why not persist everything to disk?', ['It is a cache: the DB is the source of truth. Persistence (snapshots/AOF) only helps warm restarts and costs write performance.']]
  ],
  say: [
    'Keys hash into 16,384 slots spread over about 20 primaries, each with an async replica.',
    'Each node is a hash map plus LRU list, so get, set and eviction are O(1).',
    'Clients cache the slot map and go straight to the right node; a "moved" reply refreshes it.',
    'Misses use single-flight per key, so a node failure doesn\'t stampede the database.'
  ],
  numbers: [['1 TB', 'hot data'], ['~20', 'primaries + replicas'], ['250k', 'ops/s per node'], ['16,384', 'hash slots']],
  checklist: ['Explain slots vs consistent hashing for partitioning.', 'Implement LRU with a hash map and linked list.', 'Explain failover with replicas.', 'Explain hot keys and stampede protection.'],
  drills: {
    mcq: [
      { id: 'mcq-lru', title: 'Eviction structure', ask: 'Which data structure gives O(1) get, put and LRU eviction?', options: [
        ['Hash map + doubly linked list', true, 'The map finds the node; the list keeps recency order.'],
        ['Sorted array', false, 'Inserts are O(n).'],
        ['Min-heap by last access time', false, 'Updates on every access are O(log n).'],
        ['Single linked list only', false, 'Lookup is O(n).']
      ]},
      { id: 'mcq-hot', title: 'One hot key', ask: 'One key gets 2M reads/s and its node is at 100% CPU. Fix?', options: [
        ['Near-cache it in app servers with a short TTL', true, 'Most reads never leave the app server.'],
        ['Add more cache nodes', false, 'The key still lives on one node.'],
        ['Lower the TTL', false, 'More misses, same hot node.'],
        ['Move it to the database', false, 'The DB is slower.']
      ]}
    ],
    order: [
      { id: 'ord-get', title: 'Client get', ask: 'Order a cache read in the cluster.', steps: ['Hash the key to a slot', 'Look up the slot\'s node in the cached slot map', 'Send GET to that node', 'On a miss, read the DB once (single-flight) and SET the key'], extra: ['Broadcast GET to every node'] }
    ],
    fill: [
      { id: 'fill-dc', title: 'Pitch', text: 'Keys map to [[slots|hash slots]] spread over primaries with [[replicas|replica]], and each node evicts with [[lru|least recently used]].' }
    ],
    palette: { id: 'pal-dc', title: 'Build the board', ask: 'Pick the parts of a distributed cache.', reqs: ['1 TB hot data, 5M ops/s', 'Sub-millisecond reads', 'Survive a node failure'], parts: [
      ['Key partitioning (slots / hash ring)', 'must', 'Spread data and load over nodes.'],
      ['In-memory hash map + LRU', 'must', 'O(1) access and bounded memory.'],
      ['Replica per primary', 'must', 'Failover without losing a whole shard.'],
      ['Slot map / config service', 'must', 'Clients find the owner of a key.'],
      ['Near-cache for hot keys', 'good', 'Protects nodes from extreme hot keys.'],
      ['Disk persistence', 'good', 'Faster warm restarts, not required for a pure cache.'],
      ['Kafka on the read path', 'no', 'Adds milliseconds to every read.'],
      ['SQL joins', 'no', 'A cache serves keys, not queries.']
    ]}
  }
});
})();
