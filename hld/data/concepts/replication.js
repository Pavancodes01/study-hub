(function(){
var lf = { w: 820, h: 320, nodes: [
  { id: 'w', label: 'Writer', sub: 'app', kind: 'service', x: 90, y: 90 },
  { id: 'r', label: 'Reader', sub: 'app', kind: 'service', x: 90, y: 240 },
  { id: 'L', label: 'Leader', sub: 'balance = 100', kind: 'db', x: 380, y: 90, w: 132 },
  { id: 'F1', label: 'Follower 1', sub: 'balance = 100', kind: 'db', x: 650, y: 70, w: 132 },
  { id: 'F2', label: 'Follower 2', sub: 'balance = 100', kind: 'db', x: 650, y: 240, w: 132 }
], edges: [['w', 'L'], ['L', 'F1', { label: 'log' }], ['L', 'F2', { label: 'log' }], ['r', 'F2'], ['r', 'L', { dash: true }]] };
var q = { w: 760, h: 300, nodes: [
  { id: 'c', label: 'Client', kind: 'client', x: 90, y: 150 },
  { id: 'a', label: 'Replica A', sub: 'v2', kind: 'db', x: 420, y: 50, w: 124 },
  { id: 'b', label: 'Replica B', sub: 'v2', kind: 'db', x: 420, y: 150, w: 124 },
  { id: 'cc', label: 'Replica C', sub: 'v1 (slow)', kind: 'db', x: 420, y: 250, w: 124 },
  { id: 'n', label: 'N = 3, W = 2, R = 2', sub: 'W + R > N', kind: 'note', x: 650, y: 150 }
], edges: [['c', 'a'], ['c', 'b'], ['c', 'cc']] };

registerConcept({
  slug: 'replication', order: 5, title: 'Replication',
  one: 'Keep ==copies of the same data on several machines== so reads scale and a dead machine loses nothing. The hard part is what readers see while copies catch up.',
  picture: [
    'A teacher writes the homework on the main board; students copy it into their notebooks. Anyone can read a notebook, but a slow copier might still have yesterday\'s homework for a minute. If the board is wiped, a notebook can become the new board.',
    'That is **leader-follower** replication: one leader takes writes, followers copy its change log. Interview topics: **replication lag**, **sync vs async**, **failover**, and when you need **quorums** instead.'
  ],
  use: ['read traffic much bigger than writes', 'survive a machine or zone failure', 'keep a copy close to users in another region', 'run analytics without hurting the main DB'],
  avoid: ['scaling writes (every copy still applies every write; shard instead)', 'expecting followers to be instantly up to date'],
  flows: [
    { name: 'Leader-follower', title: 'Writes to the leader, reads from followers', diagram: lf, steps: [
      { title: 'All writes go to the leader', text: 'Only one machine accepts writes, so there are no conflicting writes to resolve. It applies the change and records it in its log.', on: ['w', 'L'], dots: [{ from: 'w', to: 'L', label: 'balance = 70' }], set: { L: { sub: 'balance = 70' } } },
      { title: 'Followers copy the log', text: 'Followers stream the leader\'s change log and apply it in order. With **async** replication the leader does not wait for them.', on: ['F1', 'F2'], dots: [{ from: 'L', to: 'F1', label: 'set 70', kind: 'evt' }, { from: 'L', to: 'F2', label: 'set 70', kind: 'evt' }], set: { L: { sub: 'balance = 70' }, F1: { sub: 'balance = 70' }, F2: { sub: 'applying…' } } },
      { title: 'Replication lag', text: 'Follower 2 is a bit behind. A user who just paid reads from it and still sees 100. This is **read-your-writes** breaking.', bad: ['F2'], on: ['r'], dots: [{ from: 'r', to: 'F2', label: 'read balance' }, { from: 'F2', to: 'r', label: '100 (stale!)', kind: 'err' }], set: { L: { sub: 'balance = 70' }, F1: { sub: 'balance = 70' }, F2: { sub: 'balance = 100, lag 2 s' } } },
      { title: 'Fix: read your own writes from the leader', text: 'For a few seconds after a user writes, send that user\'s reads to the leader (or to a replica that has caught up to their write). Everyone else can read followers.', on: ['L', 'r'], edges: ['r-L'], dots: [{ from: 'r', to: 'L', label: 'my balance' }, { from: 'L', to: 'r', label: '70', kind: 'res' }], set: { L: { sub: 'balance = 70' }, F1: { sub: 'balance = 70' }, F2: { sub: 'balance = 100, lag 2 s' } } },
      { title: 'Leader dies: failover', text: 'Health checks notice the leader is gone. The most up-to-date follower is promoted. With async replication, writes not yet copied are **lost**.', bad: ['L'], on: ['F1'], set: { L: { sub: 'down' }, F1: { label: 'New leader', sub: 'promoted' }, F2: { sub: 'follows F1' } }, anno: [{ node: 'L', text: 'last writes may be lost', dy: -50 }] }
    ]},
    { name: 'Quorum', title: 'Leaderless replication with quorums', diagram: q, steps: [
      { title: 'Write to N replicas', text: 'In leaderless systems (Cassandra, DynamoDB-style) the client writes to all N = 3 replicas and waits for W = 2 to confirm.', on: ['a', 'b'], dots: [{ from: 'c', to: 'a', label: 'write v2' }, { from: 'c', to: 'b', label: 'write v2' }, { from: 'c', to: 'cc', label: 'write v2' }], set: { cc: { sub: 'v1 (slow)' } } },
      { title: 'Read from R replicas', text: 'Reads ask R = 2 replicas. Because W + R > N, at least one of them has the newest value. The client keeps the highest version.', on: ['b', 'cc'], dots: [{ from: 'c', to: 'b', label: 'read' }, { from: 'b', to: 'c', label: 'v2', kind: 'res' }, { from: 'c', to: 'cc', label: 'read' }, { from: 'cc', to: 'c', label: 'v1', kind: 'err' }], anno: [{ node: 'cc', text: 'stale, but outvoted', dx: 120, dy: 5 }] },
      { title: 'Repair the stale copy', text: 'The client (or a background process) writes v2 back to replica C. This is **read repair**; anti-entropy jobs fix the rest.', on: ['cc'], dots: [{ from: 'c', to: 'cc', label: 'repair v2', kind: 'evt' }], set: { cc: { sub: 'v2' } } },
      { title: 'Tune the dial', text: 'W = 1, R = 1: fastest but may read stale data. W = N: every write waits for the slowest replica. W + R > N is the rule for "reads see the latest write".', on: ['n'] }
    ]}
  ],
  how: [
    { name: 'Synchronous vs asynchronous', text: ['**Sync:** the leader waits for followers before confirming a write. No data loss on failover, but slower, and a slow follower blocks writes. **Async:** confirm right away; fast, but recent writes can be lost. Common compromise: **semi-sync**, wait for one follower.'] },
    { name: 'Replication lag and its effects', text: ['Async followers are usually milliseconds behind, but under load it can be seconds. Problems: reading your own write and not seeing it; seeing data "go back in time" when consecutive reads hit different replicas. Fixes: read-your-writes routing, sticky replica per user (monotonic reads), or read from the leader for critical paths.'] },
    { name: 'Failover', text: ['Detect the leader is dead (timeouts), choose the most up-to-date follower, reconfigure clients. Risks: losing un-replicated writes, and **split brain** where two nodes both think they are leader. Use a consensus system (etcd, ZooKeeper, Raft) or fencing to make sure only one leader exists.'] },
    { name: 'Multi-leader', text: ['Each region has its own leader that accepts writes, and leaders replicate to each other. Low write latency everywhere, but two regions can change the same record at once: you need conflict resolution (last-write-wins, merge rules, CRDTs). Use only when you really need multi-region writes.'] },
    { name: 'Leaderless and quorums', text: ['Write to N nodes, wait for W; read from R. W + R > N gives overlap so a read sees the latest write (with caveats around concurrent writes and sloppy quorums). Highly available: no failover needed because there is no leader.'] }
  ],
  compare: { title: 'Replication styles', lead: null, head: ['Style', 'Writes go to', 'Strength', 'Weakness', 'Examples'], rows: [
    ['Leader-follower, async', 'One leader', 'Simple, fast writes', 'Lag; lost writes on failover', 'MySQL, PostgreSQL replicas'],
    ['Leader-follower, sync', 'One leader + wait', 'No data loss', 'Slower; blocked by slow follower', 'PostgreSQL synchronous_commit'],
    ['Multi-leader', 'A leader per region', 'Local writes in every region', 'Write conflicts', 'CouchDB, multi-region setups'],
    ['Leaderless quorum', 'Any N replicas', 'Always writable, no failover', 'Tuning, repair, conflict handling', 'Cassandra, Riak, Dynamo'],
    ['Consensus (Raft/Paxos)', 'Elected leader + majority', 'Strong consistency, safe failover', 'Majority must be reachable', 'etcd, Spanner, CockroachDB']
  ]},
  say: [
    'I\'ll use leader-follower replication: writes go to the leader, reads spread over replicas.',
    'Replicas are async, so right after a user writes I route their reads to the leader for read-your-writes.',
    'For failover we use semi-sync replication to one follower, so we don\'t lose acknowledged writes.',
    'Replication scales reads and availability, not writes; for writes I\'d shard.'
  ],
  numbers: [
    ['< 100 ms', 'typical async lag in one region'],
    ['seconds', 'lag under heavy load or cross-region'],
    ['2f + 1', 'nodes to survive f failures with a majority quorum', '3 nodes survive 1, 5 survive 2'],
    ['~70–150 ms', 'cross-continent round trip', 'the cost of sync replication across regions']
  ],
  pitfalls: [
    ['Replicas to scale writes', 'Every replica applies every write. Replication multiplies read capacity, not write capacity.'],
    ['Ignoring lag', 'Showing users stale data right after they changed it feels like a bug.'],
    ['Split brain', 'Two leaders accepting writes after a network split corrupt data. Use consensus or fencing.'],
    ['Even number of nodes', '4 nodes tolerate the same 1 failure as 3 but cost more; quorums want odd counts.'],
    ['Forgetting backups', 'Replication copies mistakes too: a bad `DELETE` is replicated instantly. Keep point-in-time backups.']
  ],
  seen: [
    ['PostgreSQL / MySQL', 'Streaming leader-follower replication with read replicas and managed failover (RDS, Aurora).'],
    ['Cassandra', 'Leaderless with tunable consistency: ONE, QUORUM, ALL per query.'],
    ['etcd / ZooKeeper', 'Raft / Zab consensus keeps a small, strongly consistent replicated store for config and leader election.'],
    ['Google Spanner', 'Paxos-replicated, globally distributed SQL with strong consistency.']
  ],
  probe: [
    ['How do you handle a user not seeing their own update?', ['Read-your-writes: route that user\'s reads to the leader for a short time after a write, or track the log position of their last write and only read from replicas that have reached it.']],
    ['Sync or async replication?', ['Async for most data (speed), semi-sync (wait for one replica) when acknowledged writes must survive a leader crash. Fully sync across regions is usually too slow.']],
    ['What is split brain and how do you prevent it?', ['A network split makes two nodes both act as leader and accept writes. Prevent it with a majority-based election (Raft), so only the side with a majority can have a leader, plus fencing tokens so an old leader\'s writes are rejected.']],
    ['Why W + R > N?', ['The set of nodes that took the write and the set you read from must overlap in at least one node, so the read sees the newest version.']]
  ],
  checklist: [
    'Draw leader-follower replication and explain replication lag.',
    'Compare sync, async and semi-sync replication.',
    'Explain failover and split brain.',
    'Explain quorum reads and writes with N, W, R.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-stale', title: 'Old profile picture', ask: 'Users change their avatar, refresh, and still see the old one for a few seconds. Reads go to async replicas. Best fix?', options: [
        ['Read-your-writes: send that user\'s reads to the leader briefly after they write', true, 'Only the writer needs fresh data right away; others can tolerate a few seconds.'],
        ['Make all replication synchronous across regions', false, 'Big latency cost for every write to fix one user\'s view.'],
        ['Remove all replicas', false, 'You lose read scaling and availability.'],
        ['Add more replicas', false, 'More async replicas do not reduce lag.']
      ]},
      { id: 'mcq-writes', title: 'Write bottleneck', ask: 'Writes overload the primary database. Someone suggests adding 5 read replicas. Good idea?', options: [
        ['No: replicas apply every write too; shard or batch writes instead', true, 'Replication scales reads, not writes.'],
        ['Yes: 6 machines handle 6× writes', false, 'Only the leader accepts writes; followers repeat them.'],
        ['Yes, if replication is synchronous', false, 'Sync makes writes slower, not faster.'],
        ['Yes, with round-robin load balancing', false, 'Balancing writes across followers is not possible in leader-follower.']
      ]},
      { id: 'mcq-quorum', title: 'Quorum math', ask: 'N = 5 replicas. Which W and R guarantee reads overlap the latest write?', options: [
        ['W = 3, R = 3', true, '3 + 3 = 6 > 5, so read and write sets share at least one node.'],
        ['W = 2, R = 2', false, '2 + 2 = 4 is not more than 5; they can miss each other.'],
        ['W = 1, R = 3', false, '1 + 3 = 4, not enough.'],
        ['W = 5, R = 0', false, 'Reading zero replicas reads nothing.']
      ]}
    ],
    order: [
      { id: 'ord-failover', title: 'Leader failover', ask: 'Order the failover steps.', steps: [
        'Followers stop hearing from the leader (timeouts)',
        'A new leader is elected by majority',
        'The most up-to-date follower is promoted',
        'Clients and other followers switch to the new leader',
        'The old leader, if it returns, rejoins as a follower'
      ], extra: ['Both the old and new leader keep accepting writes'] }
    ],
    fill: [
      { id: 'fill-repl', title: 'What replication buys', text: 'Replication scales [[reads|read traffic]] and improves [[availability|fault tolerance]], but not [[writes|write throughput]], because every replica applies every write.' }
    ]
  }
});
})();
