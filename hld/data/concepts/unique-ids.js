(function(){
var sf = { w: 820, h: 280, nodes: [
  { id: 'ts', label: '41 bits', sub: 'ms since epoch', kind: 'key', x: 150, y: 80, w: 170, h: 54 },
  { id: 'dc', label: '5 bits', sub: 'datacenter', kind: 'key', x: 340, y: 80, w: 110, h: 54 },
  { id: 'wk', label: '5 bits', sub: 'machine', kind: 'key', x: 480, y: 80, w: 110, h: 54 },
  { id: 'sq', label: '12 bits', sub: 'sequence', kind: 'key', x: 630, y: 80, w: 130, h: 54 },
  { id: 'gen', label: 'ID generator', sub: 'inside each server', kind: 'service', x: 390, y: 220, w: 150 }
], edges: [['gen', 'ts', { dash: true }], ['gen', 'dc', { dash: true }], ['gen', 'wk', { dash: true }], ['gen', 'sq', { dash: true }]] };

registerConcept({
  slug: 'unique-ids', order: 14, title: 'Unique ID generation',
  one: 'Many machines must create IDs that never clash, ideally ==sortable by time and without asking a central server== every time.',
  picture: [
    'One ticket machine at a deli gives perfect numbers, but there is a queue for the machine. Give every counter its own machine with a different prefix, and there is no queue and no clash.',
    'Snowflake IDs do this with bits: **time + machine number + a small counter**. Each server makes IDs on its own, they never collide, and sorting by ID sorts by creation time.'
  ],
  use: ['sharded databases (no single auto-increment)', 'tweets, messages, orders across regions', 'IDs that should sort by time', 'creating IDs on the client or offline'],
  avoid: ['a single small database (auto-increment is fine)', 'IDs that must hide volume or order (use random UUIDs)'],
  flows: [
    { name: 'Snowflake', title: 'A 64-bit Snowflake ID', diagram: sf, steps: [
      { title: 'Timestamp first', text: '41 bits of milliseconds since a custom epoch: about 69 years. Because time is in the high bits, IDs sort by creation time.', on: ['ts'] },
      { title: 'Where it was made', text: '10 bits identify datacenter and machine (1024 generators). Two machines can never produce the same ID because these bits differ.', on: ['dc', 'wk'] },
      { title: 'Counter within a millisecond', text: '12 bits of sequence: 4096 IDs per millisecond per machine. If it overflows, wait for the next millisecond.', on: ['sq'] },
      { title: 'No network call', text: 'Each server generates IDs in memory: microseconds, no coordination, no single point of failure. Only the machine number must be assigned uniquely (config or ZooKeeper).', on: ['gen'], dots: [{ from: 'gen', to: 'ts', kind: 'evt' }, { from: 'gen', to: 'sq', kind: 'evt' }] },
      { title: 'Watch the clock', text: 'If the server clock jumps backwards (NTP correction), it could repeat IDs. Generators refuse to issue IDs until the clock catches up.', bad: ['ts'], anno: [{ node: 'ts', text: 'clock went back? wait', dy: -44 }] }
    ]}
  ],
  how: [
    { name: 'Auto-increment', text: ['Simplest, small, ordered. Breaks with sharding (two shards both make ID 1001) unless you use offsets (shard 1 makes 1, 3, 5…), and exposes how many records you have.'] },
    { name: 'UUID v4', text: ['128 random bits, generated anywhere, collision chance is negligible. Downsides: 16 bytes, not sortable, and random inserts scatter across a B-tree index (slower writes). **UUID v7** puts a timestamp first and fixes the ordering problem.'] },
    { name: 'Snowflake-style', text: ['64-bit: timestamp | machine | sequence. Fits in a `long`, sortable by time, generated locally. Needs unique machine IDs and sane clocks.'],
      code: 'synchronized long nextId() {\n    long now = System.currentTimeMillis() - EPOCH;\n    if (now == lastMs) {\n        seq = (seq + 1) & 0xFFF;              // 12 bits\n        if (seq == 0) now = waitNextMs(lastMs);\n    } else seq = 0;\n    lastMs = now;\n    return (now << 22) | (machineId << 12) | seq;\n}' },
    { name: 'Ticket server / ID ranges', text: ['A central service hands out ranges (1–1000 to server A, 1001–2000 to B). Servers then assign locally. Simple and compact; the range service must be highly available, and IDs are only roughly ordered.'] }
  ],
  compare: { title: 'ID schemes compared', lead: null, head: ['Scheme', 'Size', 'Sortable by time', 'Coordination', 'Watch out'], rows: [
    ['Auto-increment', '32–64 bit', 'Yes', 'One database', 'Single writer; reveals counts'],
    ['UUID v4', '128 bit', 'No', 'None', 'Index fragmentation, large'],
    ['UUID v7 / ULID', '128 bit', 'Yes', 'None', 'Large'],
    ['Snowflake', '64 bit', 'Yes (ms)', 'Unique machine IDs', 'Clock going backwards'],
    ['Range allocation', '64 bit', 'Roughly', 'Range service', 'Service availability']
  ]},
  say: [
    'Messages are sharded, so I\'ll use Snowflake-style 64-bit IDs: time, machine, sequence.',
    'IDs sort by time, which gives us ordering in feeds and chats for free.',
    'Each server generates IDs locally, so there is no central bottleneck.',
    'For short URLs I\'d allocate ID ranges and base62-encode them.'
  ],
  numbers: [
    ['69 years', '41-bit millisecond timestamp range'],
    ['4096', 'IDs per ms per machine (12-bit sequence)'],
    ['1024', 'machines with 10 machine bits'],
    ['2⁶¹', 'UUID v4s before collision chance hits ~50%', 'practically never']
  ],
  pitfalls: [
    ['Auto-increment across shards', 'Each shard counts from 1: duplicate IDs.'],
    ['Random UUIDs as clustered keys', 'Inserts land all over the index, causing page splits and slower writes.'],
    ['Reusing machine IDs', 'Two servers with the same machine ID create duplicates.'],
    ['Ignoring clock skew', 'A backwards clock jump can repeat timestamps.'],
    ['Exposing sequential IDs', 'Competitors can count your orders; users can guess other records.']
  ],
  seen: [
    ['Twitter Snowflake', 'The original 64-bit time-ordered ID scheme for tweets.'],
    ['Discord', 'Snowflake IDs for messages, users and channels.'],
    ['Instagram', 'Generated IDs inside PostgreSQL: time + logical shard ID + sequence.'],
    ['MongoDB ObjectId', '12 bytes with a timestamp prefix, generated by clients.']
  ],
  probe: [
    ['Why not UUIDs everywhere?', ['They work, but are 128 bits, not time-ordered (v4) and hurt B-tree insert locality. Use UUID v7 or Snowflake if ordering or index performance matters.']],
    ['How do you assign machine IDs?', ['From config at deploy time, or by leasing one from ZooKeeper/etcd at startup so two live servers never share an ID.']],
    ['What if more than 4096 IDs are needed in one millisecond?', ['The generator waits for the next millisecond. Or allocate more bits to the sequence and fewer to machines, depending on your fleet.']],
    ['Can IDs leak information?', ['Yes: time-based IDs reveal creation time, sequential IDs reveal volume. If that matters, expose a separate random public ID or encrypt/shuffle the ID.']]
  ],
  checklist: [
    'Draw the Snowflake bit layout and explain each part.',
    'Compare auto-increment, UUID v4 and Snowflake.',
    'Explain the clock-going-backwards problem.',
    'Explain ID range allocation.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-sort', title: 'Sortable IDs', ask: 'Chat messages across 200 shards need unique IDs that sort by time, fitting in a long. Choice?', options: [
        ['Snowflake-style IDs', true, '64-bit, time-ordered, generated locally.'],
        ['UUID v4', false, 'Not time-ordered and 128 bits.'],
        ['Per-shard auto-increment', false, 'Clashes across shards.'],
        ['Current timestamp alone', false, 'Two messages in the same ms collide.']
      ]},
      { id: 'mcq-dup', title: 'Duplicate IDs', ask: 'A Snowflake generator produced duplicates after an NTP sync. Why?', options: [
        ['The clock moved backwards and timestamps repeated', true, 'Generators must detect this and wait.'],
        ['The sequence was 12 bits', false, 'That limits rate, not uniqueness.'],
        ['Too many datacenters', false, 'Unrelated to clock sync.'],
        ['IDs were base62-encoded', false, 'Encoding does not create duplicates.']
      ]},
      { id: 'mcq-index', title: 'Slow inserts', ask: 'A table keyed by random UUID v4 has slow inserts at scale. Likely cause?', options: [
        ['Random keys scatter inserts across the B-tree, causing page splits', true, 'Time-ordered IDs append near the end of the index.'],
        ['UUIDs are not unique', false, 'They effectively are.'],
        ['The table needs a hash index', false, 'Hash indexes do not support ordering and rarely fix this.'],
        ['UUIDs are too short', false, '128 bits is plenty.']
      ]}
    ],
    order: [
      { id: 'ord-bits', title: 'Snowflake layout', ask: 'Order the parts of a Snowflake ID from highest bits to lowest.', steps: ['Sign bit (0)', 'Timestamp in milliseconds', 'Datacenter ID', 'Machine ID', 'Sequence number'], extra: ['Random salt'] }
    ],
    fill: [
      { id: 'fill-sf', title: 'Why Snowflake', text: 'Snowflake IDs put the [[timestamp|time]] in the high bits, so they [[sort|order]] by creation time, and each [[machine|server|node]] generates them without coordination.' }
    ]
  }
});
})();
