(function(){
var tp = { w: 840, h: 320, nodes: [
  { id: 'client', label: 'Checkout', kind: 'client', x: 90, y: 160 },
  { id: 'coord', label: 'Coordinator', sub: 'transaction manager', kind: 'service', x: 300, y: 160, w: 150 },
  { id: 'log', label: 'Coordinator log', sub: 'decisions on disk', kind: 'db', x: 300, y: 278, w: 150 },
  { id: 'ord', label: 'Orders DB', sub: 'participant', kind: 'db', x: 600, y: 60, w: 130 },
  { id: 'pay', label: 'Payments DB', sub: 'participant', kind: 'db', x: 600, y: 160, w: 130 },
  { id: 'inv', label: 'Inventory DB', sub: 'participant', kind: 'db', x: 600, y: 262, w: 130 }
], edges: [['client', 'coord'], ['coord', 'log'], ['coord', 'ord'], ['coord', 'pay'], ['coord', 'inv']] };

registerConcept({
  slug: 'two-phase-commit', order: 20, title: 'Distributed transactions and two-phase commit',
  one: 'Two-phase commit makes several databases commit or abort together: ==everyone votes first, then the coordinator decides==. The price is locks held across the network and a stall if the coordinator dies.',
  picture: [
    'A wedding: the officiant asks each partner "do you?" and only when both say yes does the officiant declare them married. Nobody is married after just one yes. If the officiant faints after both said yes, everyone stands frozen at the altar until the officiant wakes up and announces the result.',
    'That is **two-phase commit (2PC)**. Phase 1 asks every participant to promise ("prepared"). Phase 2 announces the decision. It gives true all-or-nothing across databases, but the frozen-at-the-altar part is why microservices avoid it.'
  ],
  use: ['several databases or shards inside one system must change atomically', 'a distributed SQL database doing it for you (Spanner, CockroachDB)', 'legacy stacks with XA between one DB and one queue', 'short transactions on a fast, reliable network'],
  avoid: ['calls between microservices owned by different teams', 'a participant is a third-party API (Stripe) or a store without XA support', 'long-running business steps (minutes, human approval)', 'high-throughput paths where held locks would pile up'],
  flows: [
    { name: 'Happy path', title: 'Prepare, vote, then commit', diagram: tp, steps: [
      { title: 'One action, three databases', text: 'Checkout must create the order, debit the wallet and take the stock. Each database is ACID on its own, but nothing makes the three agree. The coordinator runs the protocol.', on: ['client', 'coord'], dots: [{ from: 'client', to: 'coord', label: 'place order 91' }] },
      { title: 'Phase 1: PREPARE', text: 'The coordinator asks every participant to get ready. Each one writes its changes to its log, **locks the rows**, and from now on promises it can commit even after a crash.', on: ['ord', 'pay', 'inv'], dots: [{ from: 'coord', to: 'ord', label: 'PREPARE' }, { from: 'coord', to: 'pay', label: 'PREPARE' }, { from: 'coord', to: 'inv', label: 'PREPARE' }] },
      { title: 'Votes come back', text: 'All three vote YES. One NO (constraint failed, no funds) or one timeout would mean ABORT for everybody.', on: ['coord'], dots: [{ from: 'ord', to: 'coord', label: 'YES', kind: 'res' }, { from: 'pay', to: 'coord', label: 'YES', kind: 'res' }, { from: 'inv', to: 'coord', label: 'YES', kind: 'res' }] },
      { title: 'Decision hits the disk first', text: 'The coordinator writes COMMIT to its own log **before** telling anyone. After a crash it must remember the same answer.', on: ['coord', 'log'], dots: [{ from: 'coord', to: 'log', label: 'decision: COMMIT', kind: 'evt' }] },
      { title: 'Phase 2: COMMIT', text: 'The coordinator tells every participant to commit. They make the changes visible and release their locks. Order 91 now exists everywhere, or would have existed nowhere.', on: ['ord', 'pay', 'inv'], dots: [{ from: 'coord', to: 'ord', label: 'COMMIT' }, { from: 'coord', to: 'pay', label: 'COMMIT' }, { from: 'coord', to: 'inv', label: 'COMMIT' }] }
    ]},
    { name: 'Coordinator crash', title: 'Why 2PC is called blocking', diagram: tp, steps: [
      { title: 'Everyone is prepared', text: 'All three participants voted YES and are holding row locks, waiting for the decision.', on: ['ord', 'pay', 'inv'], anno: [{ node: 'pay', text: 'locked, waiting', dy: -46 }] },
      { title: 'The coordinator dies', text: 'The coordinator crashes after collecting the votes but before sending the decision.', bad: ['coord'], badEdges: ['coord-ord', 'coord-pay', 'coord-inv'], anno: [{ node: 'coord', text: 'crash', dy: -50 }] },
      { title: 'Participants are in doubt', text: 'A participant cannot commit alone (the coordinator may have decided ABORT) and cannot abort alone (others may already have committed). So it **waits with its locks held**. Other checkouts touching those rows queue behind it.', bad: ['ord', 'pay', 'inv'], anno: [{ node: 'inv', text: 'in doubt', dy: -46 }] },
      { title: 'Recovery', text: 'When the coordinator restarts it reads its log, finds COMMIT, and resends it. Only then do the locks go away. Downtime of one box stalled three databases.', on: ['coord', 'log', 'pay'], dots: [{ from: 'log', to: 'coord', label: 'read decision', kind: 'res' }, { from: 'coord', to: 'pay', label: 'COMMIT (again)' }] }
    ]}
  ],
  how: [
    { name: 'The problem', text: ['Each database gives you ACID inside itself. A business action that spans several databases (or shards) has no such guarantee: one commit can succeed while another fails. A **distributed transaction** wants all of them to commit, or none.'] },
    { name: 'Phase 1: prepare and vote', text: ['The coordinator sends PREPARE. A participant that votes YES has written everything it needs to disk and holds its locks, so it can commit even after a crash. After voting YES it gives up the right to decide on its own.'] },
    { name: 'Phase 2: commit or abort', text: ['If every vote is YES, the coordinator logs COMMIT and tells everyone. If any vote is NO, or a participant times out, it logs ABORT and tells everyone to roll back. Participants acknowledge, and the coordinator can forget the transaction.'],
      code: '-- on each participant (PostgreSQL)\nBEGIN;\nUPDATE stock SET qty = qty - 1 WHERE sku = \'A1\';\nPREPARE TRANSACTION \'order-91\';   -- phase 1: durable, locks held\n\n-- later, when the coordinator decides\nCOMMIT PREPARED \'order-91\';       -- or ROLLBACK PREPARED \'order-91\'' },
    { name: 'Why it blocks', text: ['Between the vote and the decision, participants are **in doubt**. If the coordinator is gone, they wait. **Three-phase commit** adds a pre-commit round to avoid this, but it breaks under network partitions and is rarely used. The practical fix is to replicate the coordinator and participants with consensus (Paxos/Raft), which is what Spanner and CockroachDB do.'] },
    { name: 'Where you meet it', text: ['Inside distributed databases (cross-shard writes), Kafka transactions (atomic writes across partitions), and XA/JTA in older Java stacks (one DB plus one message queue). Between independent microservices the standard answer is a **saga** instead.'] }
  ],
  compare: { title: 'Keeping several stores consistent', lead: null, head: ['Approach', 'Consistency', 'Cost'], rows: [
    ['One database transaction', 'ACID, immediate', 'Only if the data lives in one database'],
    ['2PC / XA', 'Atomic across stores', 'Locks across round trips; blocks if the coordinator dies'],
    ['Distributed SQL (Spanner, CockroachDB)', 'Atomic: 2PC over replicated groups', 'Higher write latency; you adopt that database'],
    ['Saga', 'Eventual; compensations undo steps', 'No isolation; you write the undo logic'],
    ['Outbox + events', 'Eventual, at-least-once', 'For "then tell the others", not all-or-nothing']
  ]},
  say: [
    'Between microservices I avoid 2PC: it holds locks across network calls and stalls if the coordinator dies. A saga fits better.',
    'Inside one distributed database like Spanner, 2PC is fine because each participant is a replicated Paxos group, so one machine failing does not block it.',
    'If two stores must change atomically, I first ask whether the data can live in one store.'
  ],
  numbers: [
    ['2 round trips', 'minimum for 2PC: prepare and commit', 'plus a forced disk write at each participant'],
    ['slowest one', 'the transaction is as fast as its slowest participant'],
    ['tens of ms', 'typical commit latency of a multi-region distributed SQL write']
  ],
  pitfalls: [
    ['2PC between microservices', 'Ties their availability together: one service down blocks every checkout.'],
    ['Skipping the crash case', 'Interviewers ask what happens if the coordinator dies after the votes. Say "participants block, in doubt".'],
    ['Believing 3PC fixes it', '3PC still fails under partitions; real systems replicate the coordinator instead.'],
    ['Participants that cannot prepare', 'Most brokers, NoSQL stores and third-party APIs cannot join an XA transaction at all.'],
    ['Long transactions', 'Locks held while waiting on a slow participant crush throughput.']
  ],
  seen: [
    ['Google Spanner', 'Cross-shard transactions use 2PC where every participant is a Paxos group, so it rarely blocks.'],
    ['CockroachDB', 'Transactions across ranges use a 2PC-style protocol driven by a transaction record.'],
    ['Kafka transactions', 'A transaction coordinator commits writes to several partitions atomically (exactly-once processing).'],
    ['PostgreSQL', '`PREPARE TRANSACTION` and `COMMIT PREPARED` let an external coordinator run 2PC.'],
    ['Java JTA / XA', 'App servers coordinated a database and a JMS queue; mostly replaced by outbox and sagas.']
  ],
  probe: [
    ['What happens if one participant votes NO?', ['The coordinator logs ABORT and tells everyone to roll back. Prepared participants undo their changes and release their locks.']],
    ['What if the coordinator crashes after everyone voted YES?', ['Participants are in doubt and must wait with locks held until the coordinator recovers, reads its log and resends the decision. That is why 2PC is called blocking.']],
    ['Why does the coordinator log the decision before phase 2?', ['So it gives the same answer after a crash. Without the log it might tell some participants COMMIT before the crash and others ABORT after it.']],
    ['How do Spanner and CockroachDB make 2PC acceptable?', ['The coordinator and participants are replicated with Paxos or Raft, so one machine dying does not stall the protocol, and everything runs inside one database on a fast network.']]
  ],
  checklist: [
    'Draw both phases with a coordinator and three participants.',
    'Explain what a participant promises when it votes YES.',
    'Explain why a coordinator crash blocks participants.',
    'Say why 2PC is avoided between microservices and what to use instead.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-vote-no', title: 'One NO vote', ask: 'Orders and Inventory voted YES. Payments voted NO (insufficient funds). What does the coordinator do?', options: [
        ['Log ABORT and tell every participant to roll back', true, 'All-or-nothing: one NO aborts the whole transaction.'],
        ['Commit Orders and Inventory, skip Payments', false, 'That breaks atomicity, the whole point of 2PC.'],
        ['Retry phase 1 until Payments says YES', false, 'A NO is a final answer, not a transient error.'],
        ['Ask the client what to do', false, 'The protocol decides; the client only gets the outcome.']
      ]},
      { id: 'mcq-crash', title: 'Coordinator gone', ask: 'Every participant voted YES. Then the coordinator crashed before sending the decision. What does a participant do?', options: [
        ['Wait with its locks held until it learns the decision', true, 'It promised to commit if asked, and others may already have committed or aborted.'],
        ['Commit on its own', false, 'The coordinator may have decided ABORT after a timeout elsewhere.'],
        ['Abort on its own', false, 'The coordinator may already have told others to COMMIT.'],
        ['Release its locks and carry on', false, 'Then it could no longer apply the decision safely.']
      ]},
      { id: 'mcq-xa', title: 'Checkout across services', ask: 'Checkout spans Orders (Postgres), Payments (Stripe API) and Inventory (DynamoDB). Someone proposes XA two-phase commit. Best response?', options: [
        ['Use a saga: local transactions plus compensating actions', true, 'Stripe and DynamoDB cannot join XA, and 2PC would chain the three services\' availability together.'],
        ['XA with a longer timeout', false, 'Participants that cannot prepare cannot join at any timeout.'],
        ['Write to all three in sequence and hope', false, 'A crash in the middle leaves them out of sync.'],
        ['Three-phase commit', false, 'Same participant requirement, and it fails under partitions.']
      ]}
    ],
    order: [
      { id: 'ord-2pc', title: 'Two-phase commit', ask: 'Order a successful two-phase commit.', steps: [
        'Coordinator sends PREPARE to every participant',
        'Each participant writes its changes durably, locks rows and votes YES',
        'Coordinator collects all YES votes',
        'Coordinator writes COMMIT to its own log',
        'Coordinator sends COMMIT; participants apply it and release locks'
      ], extra: ['Each participant commits right after voting YES'] }
    ],
    fill: [
      { id: 'fill-2pc', title: 'The catch', text: 'Two-phase commit is [[blocking]]: if the [[coordinator]] crashes after the votes, participants wait with their [[locks|lock]] held.' }
    ]
  }
});
})();
