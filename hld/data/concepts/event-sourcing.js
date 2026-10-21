(function(){
var es = { w: 840, h: 320, nodes: [
  { id: 'client', label: 'Bank app', kind: 'client', x: 80, y: 150 },
  { id: 'svc', label: 'Account service', sub: 'rebuilds state', kind: 'service', x: 280, y: 150, w: 140 },
  { id: 'store', label: 'Event store', sub: 'append-only', kind: 'db', x: 500, y: 150, w: 140, h: 64 },
  { id: 'snap', label: 'Snapshots', sub: 'state every N events', kind: 'cache', x: 280, y: 272, w: 150 },
  { id: 'proj', label: 'Projector', kind: 'worker', x: 720, y: 60 },
  { id: 'rm', label: 'Balances view', sub: 'read model', kind: 'db', x: 720, y: 250, w: 130 }
], edges: [['client', 'svc'], ['svc', 'store'], ['svc', 'snap'], ['store', 'proj'], ['proj', 'rm']] };

registerConcept({
  slug: 'event-sourcing', order: 23, title: 'Event sourcing',
  one: 'Instead of overwriting the current state, ==store every change as an immutable event and rebuild state by replaying them==. The log is the source of truth; everything else is derived.',
  picture: [
    'Your bank never stores just "balance: 80". It stores every line: opened, +100, −20. The balance is the sum. If someone asks "what was the balance on 3 March, and why?", the bank adds up the lines up to that date. A mistake is never erased; a correcting line is added.',
    'That is **event sourcing**. Each entity (an account, an order) is a **stream** of events like `MoneyDeposited` and `MoneyWithdrawn`. To act on it, you replay its events to get the current state, check the rule, and **append** a new event.'
  ],
  use: ['history matters: money, orders, inventory, compliance and audit', 'you need state at any past moment ("as of" queries)', 'other services want a reliable stream of business events', 'you expect to add new read views later and fill them from history'],
  avoid: ['simple CRUD data nobody needs the history of', 'heavy ad-hoc querying on current state with no appetite for projections', 'a team new to it on a deadline: the learning curve is real', 'data that must be truly erased, unless you plan crypto-shredding'],
  flows: [
    { name: 'Append, never update', title: 'Handling a withdrawal', diagram: es, steps: [
      { title: 'A command arrives', text: 'The app asks to withdraw 30 from account 7.', on: ['client', 'svc'], dots: [{ from: 'client', to: 'svc', label: 'Withdraw 30' }] },
      { title: 'Rebuild current state', text: 'The service loads stream `account-7`: Opened, Deposited 100, Withdrew 20. Replaying them gives balance 80 at version 3.', on: ['svc', 'store'], set: { svc: { sub: 'balance 80 @ v3' } }, dots: [{ from: 'store', to: 'svc', label: 'events v1–v3', kind: 'res' }] },
      { title: 'Check, then append', text: '80 is enough, so the service appends `MoneyWithdrawn 30` **expecting version 3**. Nothing is updated in place.', on: ['store'], set: { svc: { sub: 'balance 50 @ v4' } }, dots: [{ from: 'svc', to: 'store', label: 'append v4', kind: 'evt' }] },
      { title: 'Views follow the log', text: 'The projector reads the new event and updates the balances view that screens and reports query.', on: ['proj', 'rm'], dots: [{ from: 'store', to: 'proj', label: 'MoneyWithdrawn', kind: 'evt' }, { from: 'proj', to: 'rm', label: 'balance = 50' }] },
      { title: 'Two withdrawals at once', text: 'Another request also read version 3 and tries to append. The store refuses: version 4 already exists. That request reloads, sees balance 50, and decides again. This is **optimistic concurrency**.', bad: ['svc'], dots: [{ from: 'svc', to: 'store', label: 'append v4 (stale)', kind: 'err' }, { from: 'store', to: 'svc', label: 'version conflict', kind: 'err' }] }
    ]},
    { name: 'Replay and snapshots', title: 'Fast loads and fixing mistakes', diagram: es, steps: [
      { title: 'Streams grow long', text: 'A busy business account has 50,000 events. Replaying all of them on every command is too slow.', on: ['store'], set: { store: { sub: '50,000 events' } } },
      { title: 'Load a snapshot first', text: 'Every 1,000 events the service saves a snapshot of the state. Now it loads the latest snapshot and replays only the events after it.', on: ['svc', 'snap'], dots: [{ from: 'snap', to: 'svc', label: 'state @ v49,000', kind: 'res' }, { from: 'store', to: 'svc', label: 'v49,001+', kind: 'res' }] },
      { title: 'A projector bug', text: 'A bug in the projector wrote wrong balances into the view for a week.', bad: ['rm'], anno: [{ node: 'rm', text: 'wrong for 7 days', dy: -48 }] },
      { title: 'Replay to repair', text: 'The events are still correct. Fix the projector, replay every event from the start into a fresh view, then switch reads to it. No data is lost.', on: ['store', 'proj', 'rm'], dots: [{ from: 'store', to: 'proj', label: 'replay from v1', kind: 'evt' }, { from: 'proj', to: 'rm', label: 'rebuild' }] }
    ]}
  ],
  how: [
    { name: 'State as a fold over events', text: ['Each aggregate has a stream of events in order. Current state is computed by applying them one by one. Events are named as business facts in the past tense (`MoneyWithdrawn`), not as table diffs (`AccountUpdated`).'],
      code: 'stream account-7:\n  v1 AccountOpened   { owner: "ana" }\n  v2 MoneyDeposited  { amount: 100 }\n  v3 MoneyWithdrawn  { amount: 20 }\n\nstate = events.reduce(apply, emptyAccount)      // balance = 80, version = 3\nif state.balance < 30: reject("insufficient funds")\nappend("account-7", expectedVersion = 3, MoneyWithdrawn { amount: 30 })\n// -> VersionConflict if someone else appended v4 first: reload and retry' },
    { name: 'The event store', text: ['Append-only, ordered per stream, with a version number. Appends state the expected version, so two writers cannot both act on stale state. It also lets subscribers read new events, which feeds projections and other services.'] },
    { name: 'Snapshots', text: ['For long streams, store the computed state every N events. Loading becomes: latest snapshot plus the events after it. Snapshots are a cache; you can always delete and rebuild them.'] },
    { name: 'Reads need projections', text: ['"All accounts with balance over 1,000" cannot be answered from the raw log efficiently. Event sourcing almost always comes with **CQRS**: projectors build read models for queries.'] },
    { name: 'Events live forever', text: ['You cannot migrate old events like rows. Version them, and **upcast** old versions to the new shape when reading. To forget a person (GDPR), keep personal data out of events or encrypt it with a per-user key and delete the key (**crypto-shredding**).'] }
  ],
  compare: { title: 'Storing state vs storing events', lead: null, head: ['', 'Current state (CRUD)', 'Event sourcing'], rows: [
    ['What is saved', 'Latest row; old values overwritten', 'Every change, as an event'],
    ['History and audit', 'Extra audit table, often incomplete', 'Built in and complete'],
    ['Reading current state', 'One row lookup', 'Snapshot + replay, or a projection'],
    ['Ad-hoc queries', 'SQL on the table', 'Need projections'],
    ['Fixing a bad view', 'Hard: old values are gone', 'Replay into a new projection'],
    ['Schema change', 'Migrate the rows', 'Version events; upcast old ones']
  ]},
  say: [
    'The ledger is event-sourced: deposits and withdrawals are immutable events and the balance is a projection.',
    'Appends carry the expected version, so two concurrent withdrawals cannot both spend the same money.',
    'We snapshot every 1,000 events so loading an account stays fast.',
    'Personal data inside events is encrypted with a per-user key; deleting the key is how we forget someone.'
  ],
  numbers: [
    ['100–1,000', 'events between snapshots is a common range', 'tune it to load time'],
    ['forever', 'how long events are kept: the log is the truth'],
    ['1 stream', 'per aggregate; order is only guaranteed inside a stream']
  ],
  pitfalls: [
    ['Event sourcing everything', 'Use it where history matters, not for every settings table.'],
    ['CRUD-shaped events', '"AccountUpdated {fields}" loses the meaning. Record business facts.'],
    ['Querying the log directly', 'Slow and awkward. Build projections for reads.'],
    ['Editing past events', 'History stops being trustworthy and views diverge. Append a correcting event.'],
    ['No version check on append', 'Two commands both act on stale state and money is spent twice.']
  ],
  seen: [
    ['Banking ledgers', 'Accounts are sums of immutable entries; corrections are new entries.'],
    ['Git', 'A repository is a log of commits; any version can be rebuilt.'],
    ['EventStoreDB, Axon Server', 'Databases built for event streams with optimistic appends and subscriptions.'],
    ['Kafka as an event log', 'Domain events stored with long retention so new consumers can replay them.'],
    ['LMAX exchange', 'In-memory trading state rebuilt from an event journal after a restart.']
  ],
  probe: [
    ['How do you read current state fast?', ['Snapshots for loading one aggregate; projections for queries. Most reads never touch the raw log.']],
    ['How do you change an event\'s shape?', ['Publish a new version. Keep handlers for old versions or upcast old events to the new shape when reading. Never rewrite stored events.']],
    ['How do you delete a user\'s data?', ['Keep personal data out of events where possible. Otherwise encrypt it with a per-user key and delete the key: crypto-shredding.']],
    ['How do you stop two writers conflicting?', ['Optimistic concurrency: append with the expected stream version. If another writer got there first, the store rejects the append and the command reloads and retries.']]
  ],
  checklist: [
    'Explain how current state is rebuilt from events.',
    'Explain snapshots and when you need them.',
    'Explain appends with an expected version.',
    'Say why event sourcing usually comes with CQRS.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-fit', title: 'When to use it', ask: 'Which requirement points most strongly to event sourcing?', options: [
        ['Regulators need the exact balance of any account at any past date, and why it changed', true, 'Complete history and "as of" state come for free from the log.'],
        ['A blog needs to store posts', false, 'Plain rows are simpler.'],
        ['A cache must answer in under a millisecond', false, 'That is a caching problem, not a history problem.'],
        ['Analysts want flexible SQL over current customer data', false, 'Easier with plain tables.']
      ]},
      { id: 'mcq-slow', title: 'Slow loads', ask: 'Loading one account replays 2 million events and takes 4 seconds. Fix?', options: [
        ['Save snapshots and load the latest one plus the events after it', true, 'Only a small tail is replayed.'],
        ['Delete old events', false, 'That destroys the source of truth.'],
        ['Copy the whole stream into Redis', false, 'You still replay 2 million events.'],
        ['Buy a bigger database server', false, 'The work stays the same.']
      ]},
      { id: 'mcq-fix', title: 'Bad balances', ask: 'A projector bug wrote wrong balances into the read model for a week. How do you recover?', options: [
        ['Fix the projector and replay the events into a fresh read model', true, 'The events are still right; views are derived.'],
        ['Edit the past events to match', false, 'The events were correct; editing them breaks trust in history.'],
        ['Restore last week\'s backup of the view', false, 'You would lose a week of real activity.'],
        ['Nothing can be done', false, 'The log still holds the truth.']
      ]}
    ],
    order: [
      { id: 'ord-es', title: 'Handling a command', ask: 'Order how an event-sourced command is handled.', steps: [
        'Load the latest snapshot for the stream',
        'Replay the events after the snapshot to get current state',
        'Check the business rule against the current state',
        'Append the new event with the expected version',
        'Projectors update read models from the new event'
      ], extra: ['UPDATE the balance column in place'] }
    ],
    fill: [
      { id: 'fill-es', title: 'One sentence', text: 'In event sourcing the [[event log|log|events]] is the source of truth; current state comes from [[replaying|replay]] events, sped up with [[snapshots|snapshot]].' }
    ]
  }
});
})();
