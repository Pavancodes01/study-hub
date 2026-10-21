(function(){
// Servers and keys placed on a circle (the hash ring). Keys belong to the next server clockwise.
function at(deg, r){ var a = deg * Math.PI / 180; return { x: Math.round(400 + r * Math.cos(a)), y: Math.round(200 + r * Math.sin(a)) }; }
function srv(id, deg, label){ var p = at(deg, 125); return { id: id, label: label, kind: 'service', x: p.x, y: p.y, w: 86, h: 42 }; }
function key(id, deg, label){ var p = at(deg, 190); return { id: id, label: label, kind: 'key', x: p.x, y: p.y }; }
var ring = { w: 800, h: 410, nodes: [
  srv('A', -90, 'Server A'), srv('B', 30, 'Server B'), srv('C', 150, 'Server C'), srv('D', 105, 'Server D'),
  key('k1', -25, 'user:7'), key('k2', 75, 'user:3'), key('k3', 130, 'user:9'), key('k4', 245, 'user:1'),
  { id: 'n', label: 'clockwise →', kind: 'note', x: 400, y: 200 }
], edges: [
  ['A', 'B', { arrow: false, bend: -40 }], ['B', 'C', { arrow: false, bend: -40, unless: 'D' }], ['B', 'D', { arrow: false, bend: -25 }], ['D', 'C', { arrow: false, bend: -12 }], ['C', 'A', { arrow: false, bend: -40 }],
  ['k1', 'B', { dash: true }], ['k2', 'C', { dash: true, unless: 'D' }], ['k2', 'D', { dash: true }], ['k3', 'C', { dash: true }], ['k4', 'A', { dash: true }]
] };

registerConcept({
  slug: 'consistent-hashing', order: 7, title: 'Consistent hashing',
  one: 'Place servers and keys on a circle; each key belongs to the next server clockwise. Adding or removing a server ==moves only the keys next to it==, not almost all of them.',
  picture: [
    'Picture a round table with numbered seats 0 to 359. Each server sits at a seat chosen by hashing its name. Each key is hashed to a seat too, then walks clockwise to the first server it meets. That server owns it.',
    'With plain `hash(key) % N`, changing N from 4 to 5 changes the answer for about 80% of keys: a cache would go almost entirely cold. On the ring, a new server only takes keys from its clockwise neighbour: about 1/N of the keys move.'
  ],
  use: ['distributed caches (Memcached client, Redis Cluster-like slots)', 'sharded key-value stores (Dynamo, Cassandra)', 'load balancers that need the same key on the same server', 'any cluster whose size changes often'],
  avoid: ['a fixed number of shards that never changes', 'you need range scans over the key (hashing scatters ranges)'],
  flows: [
    { name: 'The ring', title: 'Keys walk clockwise to their server', diagram: ring, progressive: true, steps: [
      { title: 'Servers on the ring', add: ['A', 'B', 'C', 'n'], text: 'Hash each server\'s name to a point on a circle of, say, 2³² positions. Here A, B and C split the ring into three arcs.', on: ['A', 'B', 'C'] },
      { title: 'Keys find their owner', add: ['k1', 'k2', 'k3', 'k4'], text: 'Hash each key to a point, then walk clockwise to the first server. `user:7` lands just before B, so B owns it.', on: ['k1', 'B'], dots: [{ from: 'k1', to: 'B', label: 'owner', kind: 'evt' }] },
      { title: 'Lookup is a search', text: 'Keep server positions in a sorted list (Java: `TreeMap`). Owner = first position ≥ hash(key), wrapping to the first one. O(log N).', on: ['k3', 'C'], dots: [{ from: 'k3', to: 'C', kind: 'evt' }] },
      { title: 'Add server D', add: ['D'], text: 'D lands between B and C. Only keys on the arc from B to D change owner: here just `user:3`. A\'s keys and most of C\'s keys stay where they were.', on: ['D', 'k2'], dots: [{ from: 'k2', to: 'D', label: 'moved', kind: 'evt' }], anno: [{ node: 'D', text: 'takes keys from C only', dx: 0, dy: 48 }] },
      { title: 'Remove a server', text: 'If C dies, its keys walk on clockwise to A. Again, only one arc is affected. In a cache that means only C\'s keys go cold.', bad: ['C'], on: ['A'], set: { C: { sub: 'down' } } },
      { title: 'Virtual nodes', text: 'Three points on a ring rarely split it evenly. Give each server 100–200 **virtual nodes** (hash "A#1", "A#2"…). Load evens out, and a bigger server can get more virtual nodes.', on: ['A', 'B', 'C', 'D'], set: { A: { sub: '×150 vnodes' }, B: { sub: '×150 vnodes' }, C: { sub: '×150 vnodes' }, D: { sub: '×150 vnodes' } } }
    ]}
  ],
  how: [
    { name: 'The problem with modulo', text: ['`server = hash(key) % N`. When N changes, nearly every key maps somewhere new. For a cache, that is a near-total miss storm; for a database, a huge data migration.'] },
    { name: 'The ring', text: ['Hash servers and keys into the same space (e.g. 0..2³²−1), arranged as a circle. A key is owned by the first server clockwise from it. Adding a server takes over part of one neighbour\'s arc; removing one gives its arc to the next server. Only about K/N keys move.'],
      code: 'TreeMap<Long, String> ring = new TreeMap<>();\n\nvoid addServer(String s) {\n    for (int v = 0; v < 150; v++) ring.put(hash(s + "#" + v), s);   // virtual nodes\n}\n\nString ownerOf(String key) {\n    Map.Entry<Long, String> e = ring.ceilingEntry(hash(key));\n    return e != null ? e.getValue() : ring.firstEntry().getValue();  // wrap around\n}' },
    { name: 'Virtual nodes', text: ['Each physical server appears many times on the ring. This evens out arc sizes, spreads a failed server\'s load over many others instead of one neighbour, and lets you weight servers by capacity.'] },
    { name: 'Replication on the ring', text: ['To keep N copies, store a key on its owner plus the next N−1 distinct servers clockwise (skipping virtual nodes of the same machine). Dynamo and Cassandra do this; it is called the **preference list**.'] },
    { name: 'Alternatives', text: ['**Rendezvous (highest random weight) hashing**: for each key, score every server with hash(key, server) and pick the highest. Simple, also moves ~1/N keys. **Fixed slots** (Redis Cluster uses 16,384 hash slots): hash to a slot, then a small table maps slots to nodes; rebalancing moves whole slots.'] }
  ],
  compare: { title: 'Ways to map keys to servers', lead: null, head: ['Method', 'Keys moved when adding a server', 'Balance', 'Notes'], rows: [
    ['hash % N', '~(N−1)/N, almost all', 'Even', 'Fine only if N never changes'],
    ['Consistent hashing', '~1/N', 'Uneven without virtual nodes', 'Use 100–200 vnodes per server'],
    ['Rendezvous hashing', '~1/N', 'Even', 'O(N) per lookup; fine for small N'],
    ['Fixed slots + table', 'Only the slots you choose to move', 'Even, controllable', 'Redis Cluster: 16,384 slots']
  ]},
  say: [
    'I\'ll place cache nodes on a consistent hash ring so adding a node only remaps about 1/N of the keys.',
    'Each node gets around 150 virtual nodes so load stays even and a failure spreads over many nodes.',
    'Replicas go to the next two distinct nodes clockwise on the ring.',
    'Plain hash mod N would remap almost every key on a resize, which would empty the cache.'
  ],
  numbers: [
    ['~1/N', 'share of keys that move when adding the N-th server'],
    ['100–200', 'virtual nodes per server, a common choice'],
    ['16,384', 'hash slots in Redis Cluster'],
    ['O(log V)', 'owner lookup with a sorted map of V virtual nodes']
  ],
  pitfalls: [
    ['No virtual nodes', 'With a few points the arcs are very uneven; one server can get twice the load.'],
    ['Thinking it fixes hot keys', 'One very popular key still lands on one server. You need replication or splitting for hot keys.'],
    ['Replicas on the same machine', 'Next two virtual nodes might belong to the same physical server. Skip duplicates.'],
    ['Different hash functions in different clients', 'Clients must agree on the hash and the server list or they will look in different places.']
  ],
  seen: [
    ['Amazon Dynamo / DynamoDB', 'Consistent hashing with virtual nodes and preference lists for replication.'],
    ['Apache Cassandra', 'Token ring; each node owns token ranges (vnodes by default).'],
    ['Memcached clients', 'Ketama consistent hashing spreads keys across cache servers.'],
    ['Discord, Envoy', 'Ring-hash / Maglev load balancing to keep a session or guild on the same server.']
  ],
  probe: [
    ['Why not just hash mod N?', ['Changing N remaps most keys. For a cache that means a sudden flood of misses to the database; for a store, moving almost all data.']],
    ['How do virtual nodes help?', ['They make arcs even, spread a dead server\'s keys across many others instead of one neighbour, and allow weighting by capacity.']],
    ['How do you handle a hot key on the ring?', ['Consistent hashing does not help one hot key. Replicate it to several nodes and read from any, add a local cache in front, or split it into sub-keys.']],
    ['How is the ring kept in sync across clients?', ['Membership comes from a coordination service (ZooKeeper/etcd) or a gossip protocol; clients rebuild the ring when membership changes.']]
  ],
  checklist: [
    'Explain why hash mod N is bad when servers change.',
    'Draw the ring and show which server owns a key.',
    'Explain what moves when a server is added or removed.',
    'Explain virtual nodes and replicas on the ring.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-moved', title: 'Keys moved', ask: 'A cache cluster has 10 nodes on a consistent hash ring with virtual nodes. You add an 11th. Roughly what share of keys change owner?', options: [
        ['About 1/11, around 9%', true, 'The new node takes a fair share from the others; everything else stays put.'],
        ['About 90%', false, 'That is what hash mod N would do.'],
        ['None', false, 'The new node must own something.'],
        ['Exactly half', false, 'No reason for half.']
      ]},
      { id: 'mcq-vnodes', title: 'Uneven load', ask: 'With 4 servers on the ring, one gets 45% of the keys. Fix?', options: [
        ['Give each server many virtual nodes', true, 'More points per server make arc sizes average out.'],
        ['Switch to hash mod N', false, 'Even load, but resizing becomes painful again.'],
        ['Use a bigger hash space', false, 'The size of the space does not fix where 4 points land.'],
        ['Sort keys alphabetically', false, 'That is range partitioning, with its own hotspots.']
      ]},
      { id: 'mcq-lookup', title: 'Java lookup', ask: 'Server positions are in a `TreeMap<Long, String>`. Which call finds the owner of hash h?', options: [
        ['`ceilingEntry(h)`, and if null use `firstEntry()`', true, 'First server at or after h clockwise, wrapping around the ring.'],
        ['`floorEntry(h)`', false, 'That walks counter-clockwise.'],
        ['`get(h)`', false, 'Only works if a server sits exactly at h.'],
        ['`lastEntry()`', false, 'Always the same server.']
      ]}
    ],
    order: [
      { id: 'ord-lookup', title: 'Find a key\'s server', ask: 'Order the steps of a consistent-hashing lookup.', steps: [
        'Hash the key to a position on the ring',
        'Find the first server position at or after it',
        'If none, wrap around to the first position',
        'Map that virtual node to its physical server'
      ], extra: ['Compute hash(key) % number of servers'] }
    ],
    fill: [
      { id: 'fill-ring', title: 'Why the ring', text: 'With consistent hashing, adding a server moves only about [[1/N|one Nth|1 / N]] of the keys, and [[virtual nodes|vnodes]] keep the load even.' }
    ]
  }
});
})();
