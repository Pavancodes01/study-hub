(function(){
function at(deg, r){ var a = deg * Math.PI / 180; return { x: Math.round(470 + r * Math.cos(a)), y: Math.round(190 + r * Math.sin(a)) }; }
function nd(id, deg){ var p = at(deg, 135); return { id: id, label: 'Node ' + id, kind: 'db', x: p.x, y: p.y, w: 100, h: 52 }; }
var D = { w: 860, h: 390, nodes: [
  { id: 'cl', label: 'Client', kind: 'client', x: 80, y: 190 },
  nd('A', -90), nd('B', -18), nd('C', 54), nd('D', 126), nd('E', 198),
  { id: 'n', label: 'hash ring', sub: 'key → next 3 nodes', kind: 'note', x: 470, y: 190 }
], edges: [['cl', 'A', { bend: 30 }], ['A', 'B', { arrow: false, bend: -25 }], ['B', 'C', { arrow: false, bend: -25 }], ['C', 'D', { arrow: false, bend: -25 }], ['D', 'E', { arrow: false, bend: -25 }], ['E', 'A', { arrow: false, bend: -25 }]] };

registerDesign({
  slug: 'key-value-store', order: 3, title: 'Distributed key-value store',
  one: 'Build a Dynamo-style store: `put(key, value)` and `get(key)` across many machines, ==always writable, partitioned by consistent hashing, replicated with tunable quorums==.',
  questions: [
    'How big are keys and values? How much total data?',
    'Read/write ratio and target latency?',
    'Is availability or strong consistency more important?',
    'Do we need range scans, or only single-key get/put?',
    'Single region or multi-region?'
  ],
  reqs: {
    func: ['`put(key, value)`', '`get(key)`', '`delete(key)`'],
    nonfunc: ['Highly available, even during node failures and partitions', 'Scales horizontally to hundreds of nodes', 'p99 < 10 ms', 'Tunable consistency per request', 'Durable: acknowledged writes survive node loss'],
    mvp: ['get / put / delete', 'consistent hashing', 'replication factor 3', 'quorum reads and writes', 'node failure handling'],
    later: ['range scans', 'transactions', 'secondary indexes', 'multi-region']
  },
  estimate: {
    lead: 'Size the cluster from data and throughput.',
    assume: ['100 TB of data', 'average value 1 KB, key 50 B', '500k reads/s and 100k writes/s', 'replication factor 3'],
    rows: [
      ['Raw data with replicas', '100 TB × 3', '**300 TB**'],
      ['Nodes by storage', '300 TB ÷ 4 TB usable per node', '**~75 nodes**'],
      ['Ops per node', '(500k + 3 × 100k) ÷ 75', '**~11k ops/s per node**, comfortable'],
      ['Keys', '100 TB ÷ 1 KB', '**~100 billion**']
    ],
    so: 'Storage drives node count; per-node throughput is moderate. Design for nodes failing every day at this size.'
  },
  apiLead: 'A tiny API. The interesting part is the optional consistency level.',
  api: [
    ['PUT', '/kv/{key}?w=2', 'Write a value; wait for W replicas to confirm.', 'body: <bytes>\n→ 200 { "version": [ ["A", 12], ["C", 4] ] }'],
    ['GET', '/kv/{key}?r=2', 'Read from R replicas; return the newest (or conflicting versions).'],
    ['DELETE', '/kv/{key}', 'Writes a tombstone so deletes replicate like writes.']
  ],
  dataLead: 'Each node stores its share of keys in a local LSM storage engine.',
  data: [
    { name: 'record (on each replica)', store: 'local LSM engine (e.g. RocksDB)', cols: [['key', 'bytes', 'Hashed to find owners'], ['value', 'bytes', 'Opaque to the store'], ['version', 'vector clock', 'Detects concurrent writes'], ['tombstone', 'bool', 'Marks deletes until compaction']] },
    { name: 'membership', store: 'gossip state on every node', cols: [['node_id', 'string', 'Who is in the cluster'], ['tokens', 'list', 'Virtual node positions on the ring'], ['heartbeat', 'counter', 'Spread by gossip to detect failures']] }
  ],
  hld: [
    '**Partitioning:** consistent hashing with virtual nodes. Each key is stored on the first N = 3 distinct nodes clockwise from its hash (the preference list).',
    '**Any node can coordinate:** the client sends to any node (or a partition-aware client picks the right one). That coordinator forwards to the 3 replicas.',
    '**Quorums:** writes wait for W, reads ask R. With N = 3, W = 2, R = 2 reads overlap the latest write. Callers can choose W = 1 for speed.',
    '**Failures:** gossip spreads membership and heartbeats. If a replica is down, a neighbour holds the write with a **hint** and hands it back later. Read repair and Merkle-tree anti-entropy fix remaining differences.',
    '**Storage:** each node writes to a commit log + memtable, flushes SSTables, and compacts: an LSM engine fit for heavy writes.'
  ],
  flows: [
    { name: 'Build it up', title: 'From one node to a Dynamo-style cluster', diagram: D, progressive: true, steps: [
      { title: 'One node', add: ['cl', 'A'], text: 'A hash map on disk on one machine. Simple, but limited by one disk and dies with one machine.', on: ['A'], dots: [{ from: 'cl', to: 'A', label: 'put k' }] },
      { title: 'Partition with a hash ring', add: ['B', 'C', 'D', 'E', 'n'], text: 'Five nodes on a consistent hash ring (with virtual nodes). Each key belongs to a node by its hash; adding a node moves only nearby keys.', on: ['A', 'B', 'C', 'D', 'E'] },
      { title: 'Replicate to 3 nodes', text: 'Store each key on its owner and the next two nodes clockwise. Any one node can die without losing data.', on: ['B', 'C', 'D'], set: { B: { sub: 'replica 1' }, C: { sub: 'replica 2' }, D: { sub: 'replica 3' } } },
      { title: 'Quorum write', text: 'The coordinator sends the write to all 3 replicas and returns success after W = 2 acknowledgements.', on: ['B', 'C'], dots: [{ from: 'cl', to: 'A', label: 'put k (coordinator)' }, { from: 'A', to: 'B', label: 'write' }], set: { B: { sub: 'ack' }, C: { sub: 'ack' }, D: { sub: 'slow' } } },
      { title: 'A node fails: hinted handoff', text: 'Replica C is down. Node D accepts its write with a hint "belongs to C" and replays it when C returns. Writes never stop: always writable.', bad: ['C'], on: ['D'], set: { C: { sub: 'down' }, D: { sub: 'holds hint for C' } } },
      { title: 'Repair', text: 'When C is back, hints are replayed. Background anti-entropy compares Merkle trees between replicas to find and fix any remaining differences cheaply.', on: ['C', 'D'], set: { C: { sub: 'catching up' } } }
    ]}
  ],
  deep: [
    { name: 'Tunable consistency', text: ['N = replicas, W = write acks, R = read replies. W + R > N gives read-your-latest-write behaviour in normal operation. W = 1, R = 1 is fastest and most available but may read stale data. Let callers choose per request.'] },
    { name: 'Conflicts and versioning', text: ['Two clients can write the same key on different replicas during a partition. **Last-write-wins** by timestamp is simple but can silently drop a write. **Vector clocks** detect concurrent versions and return both, so the application merges them (Dynamo\'s shopping cart merged items).'] },
    { name: 'Failure detection with gossip', text: ['Every second each node exchanges membership and heartbeat counters with a few random peers. Information spreads in O(log N) rounds. A node is suspected dead if its heartbeat stops increasing; no central coordinator needed.'] },
    { name: 'Anti-entropy with Merkle trees', text: ['Each replica builds a hash tree over its key ranges. Comparing roots tells you instantly whether two replicas match; walking down only the differing branches finds the exact keys to sync, without shipping all data.'] }
  ],
  bottlenecks: [
    ['Hot keys', 'Client-side caching, or split a hot key into sub-keys.'],
    ['Uneven data per node', 'Virtual nodes; move tokens when adding capacity.'],
    ['Compaction I/O spikes', 'Throttle compaction; choose leveled vs size-tiered strategy by read/write mix.'],
    ['Slow replica dragging latency', 'Only wait for W of N; speculative retries to another replica.'],
    ['Large values', 'Cap value size; store big blobs in object storage and keep a reference.']
  ],
  tradeoffs: [
    ['CAP choice', 'AP (always writable)', 'Writes succeed during failures', 'Must handle conflicts'],
    ['Partitioning', 'Consistent hashing + vnodes', 'Easy to add nodes, even load', 'No efficient range scans'],
    ['Conflict handling', 'Vector clocks, app merge', 'No silent data loss', 'Clients must merge'],
    ['Storage engine', 'LSM', 'Fast writes', 'Compaction cost, slower reads']
  ],
  probe: [
    ['How do you make sure a read sees the latest write?', ['Choose W + R > N (e.g. 2 + 2 > 3). Mention edge cases: sloppy quorums during failures and concurrent writes can still produce conflicts, handled by versions.']],
    ['What happens when a node dies permanently?', ['Gossip marks it down; its token ranges are reassigned; remaining replicas stream the data to new owners to restore the replication factor.']],
    ['Why vector clocks over timestamps?', ['Clocks drift across machines, so last-write-wins can drop the wrong write. Vector clocks capture causality and detect truly concurrent writes.']],
    ['How do deletes work?', ['A delete writes a tombstone that replicates like a value. It is removed only after compaction and after enough time that all replicas have seen it, otherwise the old value could come back.']]
  ],
  say: [
    'I\'ll partition with consistent hashing and virtual nodes, and replicate each key to the next three nodes on the ring.',
    'Reads and writes use quorums, N = 3, W = 2, R = 2, tunable per request.',
    'The store is AP: hinted handoff keeps it writable when replicas are down, and vector clocks detect conflicts.',
    'Gossip handles membership, and Merkle trees repair replicas in the background.'
  ],
  numbers: [['300 TB', 'stored with 3 replicas'], ['~75', 'nodes'], ['N=3 W=2 R=2', 'default quorum'], ['O(log N)', 'gossip rounds to spread news']],
  checklist: ['Explain partitioning with a hash ring and preference lists.', 'Explain quorum math with N, W, R.', 'Explain hinted handoff, read repair and Merkle trees.', 'Explain vector clocks vs last-write-wins.'],
  drills: {
    mcq: [
      { id: 'mcq-down', title: 'Replica down during write', ask: 'N = 3, W = 2, and one replica is down. What happens to a write?', options: [
        ['It succeeds with 2 acks; a hint is stored for the down replica', true, 'Hinted handoff keeps the store writable.'],
        ['It fails until the replica returns', false, 'That would make the store unavailable.'],
        ['It is written to 1 replica only and acked', false, 'W = 2 requires two acks.'],
        ['The whole cluster stops', false, 'One node failure is routine.']
      ]},
      { id: 'mcq-conflict', title: 'Concurrent writes', ask: 'During a partition two clients update the same cart on different replicas. Safest approach?', options: [
        ['Keep both versions (vector clocks) and let the app merge them', true, 'No update is silently lost.'],
        ['Last-write-wins by local clock', false, 'Clock skew can drop the real latest write.'],
        ['Reject both writes', false, 'Breaks availability.'],
        ['Pick the shorter value', false, 'Arbitrary.']
      ]}
    ],
    order: [
      { id: 'ord-write', title: 'Write path', ask: 'Order a quorum write.', steps: ['Client sends put to any node (the coordinator)', 'Coordinator hashes the key to find 3 replicas', 'Coordinator sends the write to all 3', 'Each replica appends to its commit log and memtable', 'Coordinator replies after W acknowledgements'], extra: ['Coordinator waits for every node in the cluster'] }
    ],
    fill: [
      { id: 'fill-q', title: 'Quorum', text: 'With N = 3, choosing W = [[2]] and R = [[2]] guarantees reads overlap the latest write because W + R > [[N|3]].' }
    ],
    palette: { id: 'pal-kv', title: 'Build the board', ask: 'Pick the parts of a highly available KV store.', reqs: ['100 TB, hundreds of nodes', 'Always writable during node failures', 'Single-key get/put only'], parts: [
      ['Consistent hashing with virtual nodes', 'must', 'Even partitioning and cheap resizing.'],
      ['Replication factor 3', 'must', 'Survive node loss.'],
      ['Quorum reads/writes', 'must', 'Tunable consistency vs latency.'],
      ['Gossip membership', 'must', 'Decentralized failure detection.'],
      ['Hinted handoff + anti-entropy', 'must', 'Stay writable and repair later.'],
      ['Vector clocks', 'good', 'Detect concurrent writes instead of losing one.'],
      ['Single leader for all writes', 'no', 'Bottleneck and not always writable.'],
      ['Two-phase commit per write', 'no', 'Blocks on failures; contradicts availability.'],
      ['Full-text search index', 'no', 'Not a requirement.']
    ]}
  }
});
})();
