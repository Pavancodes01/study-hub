(function(){
var cq = { w: 840, h: 320, nodes: [
  { id: 'client', label: 'Shop app', kind: 'client', x: 80, y: 160 },
  { id: 'cmd', label: 'Command API', sub: 'writes + rules', kind: 'service', x: 270, y: 70, w: 130 },
  { id: 'qry', label: 'Query API', sub: 'reads only', kind: 'service', x: 270, y: 250, w: 130 },
  { id: 'wdb', label: 'Write model', sub: 'Postgres, normalized', kind: 'db', x: 490, y: 70, w: 160 },
  { id: 'bus', label: 'Change stream', sub: 'outbox / CDC', kind: 'queue', x: 720, y: 70, w: 130 },
  { id: 'proj', label: 'Projector', sub: 'builds views', kind: 'worker', x: 720, y: 250, w: 130 },
  { id: 'rdb', label: 'Read model', sub: 'denormalized views', kind: 'db', x: 490, y: 250, w: 160 }
], edges: [['client', 'cmd'], ['client', 'qry'], ['cmd', 'wdb'], ['wdb', 'bus'], ['bus', 'proj'], ['proj', 'rdb'], ['qry', 'rdb']] };

registerConcept({
  slug: 'cqrs', order: 22, title: 'CQRS: separate read and write models',
  one: 'Command Query Responsibility Segregation: ==writes go to a model built for rules, reads come from models built for screens==, kept in step by a stream of changes.',
  picture: [
    'A library keeps one careful catalogue where books are added and removed with rules: no duplicate barcodes, every book has a shelf. But visitors never read that ledger. They read the "new arrivals" board, the per-genre lists and the search terminal, each rebuilt from the ledger and shaped for one need.',
    'That is **CQRS**. **Commands** (place order, change address) go to the write model, which enforces invariants. **Queries** go to read models that are precomputed, denormalized and fast. A **projector** keeps the read side updated, usually a little behind.'
  ],
  use: ['reads far outnumber writes and need different shapes (search, feeds, dashboards)', 'one write must show up in several views', 'reads need data joined from several services', 'read and write load must scale separately'],
  avoid: ['simple CRUD screens where the form and the table look the same', 'the business cannot tolerate any read lag at all', 'a small team that cannot run and monitor another pipeline', 'you only need a faster query: try an index or a cache first'],
  flows: [
    { name: 'Write, then read', title: 'Command side, change stream, read side', diagram: cq, steps: [
      { title: 'A command arrives', text: 'The app sends `PlaceOrder`. The command side loads the order rules (stock limits, coupon rules) and commits normalized rows plus an outbox row.', on: ['client', 'cmd', 'wdb'], dots: [{ from: 'client', to: 'cmd', label: 'PlaceOrder' }, { from: 'cmd', to: 'wdb', label: 'INSERT order 91' }] },
      { title: 'The change is published', text: 'The outbox relay (or CDC) turns the commit into an `OrderPlaced` event on the stream.', on: ['bus'], dots: [{ from: 'wdb', to: 'bus', label: 'OrderPlaced 91', kind: 'evt' }] },
      { title: 'Projector updates the views', text: 'The projector writes one document for "my orders": order, customer name and item titles already joined. One event can update several read models.', on: ['proj', 'rdb'], dots: [{ from: 'bus', to: 'proj', label: 'OrderPlaced', kind: 'evt' }, { from: 'proj', to: 'rdb', label: 'upsert order_view' }] },
      { title: 'A query is one lookup', text: '"My orders" reads the ready-made document. No joins, no load on the write database.', on: ['qry', 'rdb'], dots: [{ from: 'client', to: 'qry', label: 'GET /my-orders' }, { from: 'qry', to: 'rdb', label: 'get by user' }, { from: 'rdb', to: 'qry', label: '1 doc', kind: 'res' }] }
    ]},
    { name: 'Read lag', title: 'Read your own writes', diagram: cq, steps: [
      { title: 'User saves an order', text: 'The command commits and returns 201. So far so good.', on: ['cmd', 'wdb'], dots: [{ from: 'client', to: 'cmd', label: 'PlaceOrder' }, { from: 'cmd', to: 'wdb', label: 'commit' }] },
      { title: 'The projector is behind', text: 'A burst of traffic puts the projector 800 ms behind the stream.', on: ['proj'], set: { proj: { sub: 'lag 800 ms' } }, anno: [{ node: 'proj', text: 'behind', dy: -46 }] },
      { title: 'Refresh shows old data', text: 'The app immediately loads "my orders" and the new order is missing. The user thinks it failed and orders again.', bad: ['rdb'], dots: [{ from: 'client', to: 'qry', label: 'GET /my-orders' }, { from: 'qry', to: 'client', label: 'order missing', kind: 'err' }] },
      { title: 'Give the writer their write', text: 'Fixes: return the new order in the command response and merge it in the UI; or send a version token and let the query wait until the read model reaches it; or read this user\'s own data from the write side for a few seconds.', on: ['cmd', 'client'], dots: [{ from: 'cmd', to: 'client', label: 'order 91, v42', kind: 'res' }, { from: 'client', to: 'qry', label: 'GET ?minVersion=42' }] }
    ]}
  ],
  how: [
    { name: 'Commands and queries', text: ['A **command** changes state and returns little (PlaceOrder, CancelOrder). A **query** returns data and changes nothing. CRUD uses one model for both. CQRS gives each its own model: the write model is shaped to enforce rules; read models are shaped for each screen or API.'] },
    { name: 'Levels of CQRS', text: ['1) Separate command and query code over the same tables: almost free. 2) Read tables or materialized views in the same database. 3) Separate read stores (Elasticsearch, Redis, a document DB) fed by events or CDC. Take the lowest level that solves the problem.'] },
    { name: 'Projections', text: ['A projector consumes changes and updates read models. It must be **idempotent** (skip events it has already applied, using a version per entity) and process each entity\'s events in order (partition the stream by entity ID). Because read models are derived, you can rebuild them by replaying the stream.'],
      code: '// Projector: keeps order_view in step with the write side\non OrderPlaced(e):\n  if e.version <= view[e.orderId]?.version: return   // duplicate or old\n  view[e.orderId] = {\n    id: e.orderId, status: "PLACED", total: e.total,\n    customerName: customers[e.customerId].name,       // joined at write time\n    items: e.items.map(i => i.title),\n    version: e.version\n  }\non OrderShipped(e):\n  if e.version <= view[e.orderId].version: return\n  view[e.orderId].status = "SHIPPED"\n  view[e.orderId].version = e.version' },
    { name: 'Eventual consistency', text: ['The read side trails the write side, usually by well under a second. Plan for it: return the result from the command, use version tokens, apply optimistic UI updates, or route a user\'s own reads to the write side briefly.'] },
    { name: 'When it pays off', text: ['Large read-to-write ratios, reads that need data from many tables or services, many different views of the same data, and read load that must scale on its own. For plain CRUD it doubles the code for nothing.'] }
  ],
  compare: { title: 'How far to split', lead: null, head: ['Level', 'What changes', 'Cost'], rows: [
    ['Plain CRUD', 'One model for reads and writes', 'Simple; reads may need heavy joins'],
    ['CQRS in code', 'Separate command and query classes, same DB', 'Almost free; clearer code'],
    ['Views in the same DB', 'Materialized views or summary tables', 'Refresh cost; still one DB to scale'],
    ['Separate read stores', 'Events or CDC feed search, cache, document DB', 'Lag, a projector to run, rebuild tooling'],
    ['CQRS + event sourcing', 'Write side stores events; reads are projections', 'Most power, most moving parts']
  ]},
  say: [
    'Writes go to a normalized Postgres model that enforces the rules; reads come from a denormalized view in Elasticsearch fed by CDC.',
    'The read side is eventually consistent, normally under a second behind. The command response returns the new order, so the user sees it at once.',
    'Projectors are idempotent and keyed by order ID, so a read model can be rebuilt by replaying the stream.'
  ],
  numbers: [
    ['100 : 1', 'read-to-write ratio where a separate read store usually pays off'],
    ['< 1 s', 'typical projection lag in a healthy pipeline'],
    ['N views', 'one write stream can feed search, feeds, dashboards and caches']
  ],
  pitfalls: [
    ['CQRS everywhere', 'Applying it to simple CRUD doubles the code for no benefit.'],
    ['Ignoring the lag', 'User saves, refreshes, and the data is gone. Design read-your-writes from day one.'],
    ['Dual writes to both models', 'Writing the read store straight from the command handler drifts on crashes. Feed it from the outbox or CDC.'],
    ['Projectors that are not idempotent', 'Redelivered events double counts. Track a version per entity.'],
    ['No rebuild path', 'One projector bug corrupts the view and you cannot repair it without replay.']
  ],
  seen: [
    ['E-commerce order history', 'Orders are written to SQL; the "my orders" page reads a denormalized document per user.'],
    ['Product search', 'The catalogue DB is the write model; Elasticsearch is a read model fed by CDC.'],
    ['Social timelines', 'Posts are written once; per-user timelines are precomputed read models.'],
    ['Banking', 'The ledger is the write model; balances and statements are read views.'],
    ['Axon Framework, EventStoreDB', 'Tooling built around commands, events and projections.']
  ],
  probe: [
    ['How do you handle a user reading right after writing?', ['Return the new state from the command; or send a version token and make the query wait for it; or serve that user\'s own data from the write side for a few seconds.']],
    ['How do you rebuild a read model?', ['Create an empty store, replay the stream (or a snapshot plus changes after a position) through the fixed projector, then switch reads over. Idempotent projectors make this safe.']],
    ['Is CQRS the same as event sourcing?', ['No. CQRS splits read and write models. Event sourcing stores state as a log of events. They pair well, but each works alone.']],
    ['When would you not use CQRS?', ['Simple CRUD, low scale, or a team that cannot operate the pipeline. Separate query classes on the same database already give most of the clarity.']]
  ],
  checklist: [
    'Explain commands, queries and the two models.',
    'Draw the write model, change stream, projector and read model.',
    'Explain read-your-writes and two ways to provide it.',
    'Say when CQRS is overkill.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-fit', title: 'Where it pays', ask: 'Which system gains most from CQRS with a separate read store?', options: [
        ['A marketplace whose listings change rarely but are searched and filtered millions of times with many facets', true, 'Huge read load with a very different shape from the writes.'],
        ['An internal admin form used by 50 people', false, 'Plain CRUD is enough.'],
        ['A key-value settings store', false, 'Reads and writes have the same shape.'],
        ['A batch job that appends log lines to files', false, 'There is no real query side.']
      ]},
      { id: 'mcq-lag', title: 'Old name after edit', ask: 'Users say: "I changed my name, refreshed, and saw the old one." The read model is fed from Kafka. Best fix?', options: [
        ['Return the updated profile from the edit call and read this user\'s own profile from the write side for a few seconds', true, 'Read-your-writes for the writer; everyone else can lag slightly.'],
        ['Send every read to the write database', false, 'That throws away the point of CQRS.'],
        ['Write the read store directly in the edit call too', false, 'A dual write that drifts on crashes.'],
        ['Add Kafka partitions', false, 'The lag is small already; the issue is what the writer sees.']
      ]},
      { id: 'mcq-dupe', title: 'Counts too high', ask: 'After a projector restart, the dashboard shows more orders than exist. Why?', options: [
        ['Events were redelivered and the projector is not idempotent', true, 'At-least-once delivery plus no version check means double counting.'],
        ['Kafka lost some events', false, 'Lost events would make counts too low.'],
        ['The write model has duplicate rows', false, 'The write side enforces its keys.'],
        ['CQRS read models cannot hold counters', false, 'They can, if updates are idempotent.']
      ]}
    ],
    order: [
      { id: 'ord-cqrs', title: 'Life of an order', ask: 'Order what happens when a user places an order in a CQRS system.', steps: [
        'Command handler checks the rules against the write model',
        'Write model commits the order with an outbox row',
        'The change is published to the event stream',
        'Projector updates the denormalized read model',
        'Query API serves order history from the read model'
      ], extra: ['Query API joins five write tables on every request'] }
    ],
    fill: [
      { id: 'fill-cqrs', title: 'One sentence', text: 'CQRS splits the [[write model|command model|write side]] from one or more [[read models|read model|projections]], which are [[eventually consistent|eventual|eventually]] with it.' }
    ]
  }
});
})();
