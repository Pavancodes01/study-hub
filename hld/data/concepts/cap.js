(function(){
var part = { w: 820, h: 300, nodes: [
  { id: 'u1', label: 'User in EU', kind: 'client', x: 80, y: 80 },
  { id: 'u2', label: 'User in US', kind: 'client', x: 740, y: 80 },
  { id: 'eu', label: 'EU replica', sub: 'stock = 1', kind: 'db', x: 250, y: 200, w: 130 },
  { id: 'us', label: 'US replica', sub: 'stock = 1', kind: 'db', x: 570, y: 200, w: 130 }
], edges: [['u1', 'eu'], ['u2', 'us'], ['eu', 'us', { label: 'replication', arrow: false }]] };

registerConcept({
  slug: 'cap', order: 8, title: 'CAP, PACELC and consistency',
  one: 'When the network between replicas breaks, you must choose: ==refuse some requests (consistency) or answer with possibly stale data (availability)==. Even without failures, you trade latency for consistency.',
  picture: [
    'Two branches of a bank share one balance by phone. The phone line goes dead. A customer asks the London branch to withdraw. London can refuse ("we cannot confirm right now"), which is **consistent but unavailable**, or pay out and sort it later, which is **available but maybe inconsistent**. It cannot do both.',
    'That is CAP: during a network **P**artition you pick **C**onsistency or **A**vailability. Partitions happen, so the real question is per feature: is a wrong answer or no answer worse?'
  ],
  use: ['explaining a database choice', 'deciding behaviour during region outages', 'designing anything with replicas in several places'],
  avoid: ['saying "we pick CA": a distributed system cannot opt out of partitions', 'treating CAP as a label for a whole system rather than per operation'],
  flows: [
    { name: 'A partition', title: 'One item left, two regions, the link breaks', diagram: part, steps: [
      { title: 'Normal: replicas in sync', text: 'One ticket left. Both regions agree: stock = 1. Writes replicate in milliseconds.', on: ['eu', 'us'], edges: ['eu-us'] },
      { title: 'The network splits', text: 'The link between regions fails. Each side is alive but cannot reach the other. This is a **partition**.', badEdges: ['eu-us'], anno: [{ node: 'eu', text: 'link down', dx: 160, dy: -20 }] },
      { title: 'Choose availability (AP)', text: 'Both regions accept the purchase. Both users get "success". When the link heals: stock = −1. You must resolve the conflict (refund, apology, overbooking rules).', on: ['eu', 'us'], badEdges: ['eu-us'], dots: [{ from: 'u1', to: 'eu', label: 'buy' }, { from: 'eu', to: 'u1', label: 'ok', kind: 'res' }, { from: 'u2', to: 'us', label: 'buy' }, { from: 'us', to: 'u2', label: 'ok', kind: 'res' }], set: { eu: { sub: 'stock = 0' }, us: { sub: 'stock = 0' } } },
      { title: 'Choose consistency (CP)', text: 'Only the side that holds the majority (or the leader) may accept writes. The US side refuses: "try again later". No double sale, but some users get errors.', on: ['eu'], bad: ['us'], badEdges: ['eu-us'], dots: [{ from: 'u1', to: 'eu', label: 'buy' }, { from: 'eu', to: 'u1', label: 'ok', kind: 'res' }, { from: 'u2', to: 'us', label: 'buy' }, { from: 'us', to: 'u2', label: '503 retry', kind: 'err' }], set: { eu: { sub: 'stock = 0 (leader)' }, us: { sub: 'read-only' } } },
      { title: 'Even without a partition: PACELC', text: 'Else (no partition), you still choose **L**atency or **C**onsistency: waiting for the other region on every write costs ~100 ms. Many systems pick low latency and accept brief staleness.', on: ['eu', 'us'], edges: ['eu-us'], anno: [{ node: 'us', text: '+100 ms to confirm', dy: 52 }] }
    ]}
  ],
  how: [
    { name: 'CAP in one paragraph', text: ['**Consistency** here means linearizability: every read sees the latest write, as if there were one copy. **Availability**: every request to a non-failed node gets a non-error answer. **Partition tolerance**: the system keeps working when messages between nodes are lost. Partitions will happen, so during one you choose C or A.'] },
    { name: 'PACELC', text: ['If **P**artition: choose **A** or **C**. **E**lse: choose **L**atency or **C**onsistency. Dynamo-style stores are PA/EL (available, low latency). Spanner-style are PC/EC (consistent, pay latency). This is closer to real design decisions than CAP alone.'] },
    { name: 'Consistency models, strongest to weakest', text: [
      '**Linearizable (strong):** looks like one copy; reads always see the latest write. **Sequential / serializable:** a single global order. **Causal:** effects never appear before their causes (a reply never shows before the message). **Read-your-writes, monotonic reads:** per-user guarantees. **Eventual:** if writes stop, replicas converge eventually.',
      'You can pick per feature: payments strong, like counts eventual, comments causal.'
    ]},
    { name: 'How systems provide strong consistency', text: ['Single leader with synchronous replication, or consensus (Raft, Paxos) where a majority must agree before a write commits. The cost: latency of reaching a majority, and unavailability on the minority side of a partition.'] },
    { name: 'Living with eventual consistency', text: ['Make operations safe to apply twice (idempotent), use conflict resolution (last-write-wins with timestamps, version vectors, CRDTs like counters and sets that merge automatically), and design the UI to tolerate brief staleness.'] }
  ],
  compare: { title: 'Pick per feature', lead: 'Most real systems mix models. Say which data gets which guarantee.', head: ['Feature', 'Wrong answer cost', 'No answer cost', 'Choose'], rows: [
    ['Bank transfer', 'Money lost or created', 'User retries later', 'Consistency (CP)'],
    ['Seat / ticket booking', 'Double booking', 'Lost sale', 'Consistency for the final booking'],
    ['Like counter', 'Off by a few for seconds', 'Broken page', 'Availability (AP), eventual'],
    ['Shopping cart', 'Item reappears, merge carts', 'Cannot shop', 'Availability, merge conflicts'],
    ['Username uniqueness', 'Two users same name', 'Signup retry', 'Consistency'],
    ['News feed', 'Post appears a bit late', 'Empty feed', 'Availability, eventual']
  ]},
  say: [
    'Partitions will happen, so per feature I choose: payments are CP, likes and feeds are AP and eventually consistent.',
    'For seat booking the final reservation goes through a single leader, so we never double-book; browsing seats can be slightly stale.',
    'By PACELC, even without failures we trade latency for consistency; cross-region sync writes would add ~100 ms.',
    'For the cart I\'d stay available and merge conflicting versions, like Dynamo.'
  ],
  numbers: [
    ['~100 ms', 'cross-region round trip a strongly consistent write may pay'],
    ['majority', 'nodes needed for a consensus write: 2 of 3, 3 of 5'],
    ['seconds', 'typical convergence window for eventual consistency']
  ],
  pitfalls: [
    ['"We choose CA"', 'In a distributed system you cannot choose to have no partitions. CA only describes a single machine.'],
    ['One label for the whole system', 'Pick per operation. The same system can be CP for payments and AP for likes.'],
    ['Confusing CAP C with ACID C', 'CAP consistency is about replicas agreeing (linearizability); ACID consistency is about rules like constraints.'],
    ['Eventual without a plan', 'Saying "eventually consistent" without saying how conflicts are resolved invites the next question.']
  ],
  seen: [
    ['Cassandra, DynamoDB', 'AP by default with tunable consistency per request.'],
    ['Google Spanner', 'CP: Paxos plus TrueTime clocks give external consistency globally.'],
    ['ZooKeeper, etcd', 'CP: the minority side of a partition cannot serve writes.'],
    ['Amazon shopping cart (Dynamo paper)', 'Chose availability: carts always accept adds, conflicting versions are merged.']
  ],
  probe: [
    ['Is your system CP or AP?', ['Answer per operation: "Booking the seat is CP via a single leader; listing seats and recommendations are AP." That shows you understand the trade-off rather than labelling the whole system.']],
    ['What does eventual consistency mean for users?', ['They may briefly see old data: a like count lags, a post appears a second later. Add read-your-writes so people at least see their own changes immediately.']],
    ['How do you resolve conflicting writes in an AP system?', ['Last-write-wins by timestamp (simple, may lose a write), version vectors that keep both versions for the app to merge, or CRDTs that merge automatically (counters, sets).']],
    ['What is linearizability?', ['Once a write completes, every later read, from any client, sees it or something newer. The system behaves as if there were a single copy.']]
  ],
  checklist: [
    'State CAP correctly, including why you cannot drop P.',
    'Explain PACELC with one example of each side.',
    'List consistency models from strong to eventual.',
    'Choose CP or AP for five features and justify each.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-likes', title: 'Like counter', ask: 'During a region partition, should the like button keep working?', options: [
        ['Yes: stay available and reconcile counts later', true, 'A slightly wrong count for a while is harmless; an error is worse.'],
        ['No: reject likes until the partition heals', false, 'Hurts users for no real benefit.'],
        ['Yes, using a distributed transaction across regions', false, 'Impossible during a partition by definition.'],
        ['Delete the like count', false, 'Not a design choice.']
      ]},
      { id: 'mcq-ca', title: '"We are CA"', ask: 'A candidate says their multi-region database is "CA". Best response?', options: [
        ['Partitions cannot be ruled out across machines, so during one it must give up C or A', true, 'CA only fits a single node with no network between replicas.'],
        ['Great choice, CA is the best', false, 'It is not a real option for distributed systems.'],
        ['CA means it uses SQL', false, 'CAP is not about query languages.'],
        ['CA is the same as ACID', false, 'Different concepts.']
      ]},
      { id: 'mcq-model', title: 'Comment threads', ask: 'Replies must never appear before the comment they answer, but a few seconds of delay is fine. Weakest model that works?', options: [
        ['Causal consistency', true, 'Preserves cause-before-effect without the cost of linearizability.'],
        ['Linearizability', false, 'Works but stronger and costlier than needed.'],
        ['Eventual consistency', false, 'Could show a reply before its parent.'],
        ['No consistency', false, 'Violates the requirement.']
      ]}
    ],
    order: [
      { id: 'ord-strength', title: 'Strongest to weakest', ask: 'Order these consistency models from strongest to weakest.', steps: [
        'Linearizable',
        'Sequential',
        'Causal',
        'Read-your-writes',
        'Eventual'
      ] }
    ],
    fill: [
      { id: 'fill-cap', title: 'Say it right', text: 'During a network [[partition]], a distributed system must choose between [[consistency|c]] and [[availability|a]]; I make that choice per feature.' }
    ]
  }
});
})();
