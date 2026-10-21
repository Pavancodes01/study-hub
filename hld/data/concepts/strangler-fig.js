(function(){
var sf = { w: 840, h: 320, nodes: [
  { id: 'client', label: 'Users', kind: 'client', x: 80, y: 160 },
  { id: 'facade', label: 'Routing facade', sub: 'proxy / gateway', kind: 'lb', x: 290, y: 160, w: 150 },
  { id: 'mono', label: 'Monolith', sub: 'legacy', kind: 'service', x: 540, y: 60, w: 130 },
  { id: 'mdb', label: 'Legacy DB', kind: 'db', x: 750, y: 60, w: 120 },
  { id: 'newsvc', label: 'Orders service', sub: 'new', kind: 'service', x: 540, y: 262, w: 140 },
  { id: 'ndb', label: 'Orders DB', kind: 'db', x: 750, y: 262, w: 120 }
], edges: [['client', 'facade'], ['facade', 'mono'], ['facade', 'newsvc'], ['mono', 'mdb'], ['newsvc', 'ndb'], ['mdb', 'ndb', { dash: true, label: 'CDC sync' }]] };

var acl = { w: 840, h: 320, nodes: [
  { id: 'ship', label: 'Shipping', sub: 'new service', kind: 'service', x: 120, y: 160, w: 140 },
  { id: 'acl', label: 'Anti-corruption layer', sub: 'translator', kind: 'worker', x: 410, y: 160, w: 190 },
  { id: 'erp', label: 'Legacy ERP', sub: 'CUST_REC, ST codes', kind: 'ext', x: 700, y: 160, w: 160 }
], edges: [['ship', 'acl'], ['acl', 'erp']] };

registerConcept({
  slug: 'strangler-fig', order: 27, title: 'Strangler fig and anti-corruption layer',
  one: 'Replace a legacy system ==one slice at a time behind a routing facade== instead of a big-bang rewrite, and put an anti-corruption layer between new code and old models.',
  picture: [
    'A strangler fig grows around a host tree: first a few vines, then a full trunk, until the old tree inside can rot away and the fig stands on its own. At no point is the forest missing a tree.',
    'The **strangler fig** pattern does that to a monolith. A **facade** in front decides where each request goes. You move one feature at a time to new services, shift its traffic, and delete the old code. An **anti-corruption layer (ACL)** translates between the legacy model and the new one so old concepts do not leak in.'
  ],
  use: ['migrating a monolith or legacy system that must keep running', 'moving to microservices step by step', 'new services must talk to an old system with a messy model', 'swapping a third-party vendor behind your own model'],
  avoid: ['a small codebase that is cheaper to rewrite in a few weeks', 'features so tangled that no request can be routed separately (start with in-code seams first)', 'no one owns deleting the old paths afterwards', 'chasing microservices for their own sake'],
  flows: [
    { name: 'Strangle one slice', title: 'Moving /orders out of the monolith', diagram: sf, steps: [
      { title: 'Put a facade in front', text: 'All traffic already goes through a routing facade (a proxy or gateway) to the monolith. Users notice nothing.', on: ['client', 'facade', 'mono'], dots: [{ from: 'client', to: 'facade', label: 'all requests' }, { from: 'facade', to: 'mono', label: 'everything' }] },
      { title: 'Build the new slice', text: 'A new Orders service with its own database is built. While it gets ready, change data capture copies orders from the legacy DB so both have the same data.', on: ['newsvc', 'ndb'], dots: [{ from: 'mdb', to: 'ndb', label: 'order changes', kind: 'evt' }] },
      { title: 'Canary a small share', text: 'The facade sends 5% of `/orders` traffic to the new service and compares results with the monolith. Rolling back is just a routing change.', on: ['facade', 'newsvc'], set: { facade: { sub: '/orders: 5% new' } }, dots: [{ from: 'facade', to: 'newsvc', label: '5% /orders' }, { from: 'facade', to: 'mono', label: '95%' }] },
      { title: 'Cut over and delete', text: 'All `/orders` traffic now goes to the new service. The orders code is deleted from the monolith, and ownership of order data moves to the new service.', on: ['newsvc'], set: { facade: { sub: '/orders → new' } }, dots: [{ from: 'facade', to: 'newsvc', label: '100% /orders' }], anno: [{ node: 'mono', text: 'orders code deleted', dy: -50 }] },
      { title: 'Repeat', text: 'Next slice: invoices, then search. Each slice ships value on its own. Eventually the monolith handles nothing and is switched off.', on: ['facade'], set: { facade: { sub: '3 slices moved' } } }
    ]},
    { name: 'Anti-corruption layer', title: 'Keeping the legacy model out', diagram: acl, steps: [
      { title: 'New code speaks clean terms', text: 'Shipping asks for `Customer { name, address, active }`. It has never heard of the ERP\'s table names.', on: ['ship', 'acl'], dots: [{ from: 'ship', to: 'acl', label: 'getCustomer(42)' }] },
      { title: 'The ACL speaks legacy', text: 'The ACL calls the ERP and receives `CUST_REC 0042` with fields like `NM`, `ADR1` and `ST=3`.', on: ['acl', 'erp'], dots: [{ from: 'acl', to: 'erp', label: 'read CUST_REC 0042' }, { from: 'erp', to: 'acl', label: 'NM, ADR1, ST=3', kind: 'res' }] },
      { title: 'Translate and return', text: 'The ACL maps `ST=3` to `active: true` and the address fields to one address. Shipping only ever sees its own model.', on: ['ship'], dots: [{ from: 'acl', to: 'ship', label: 'Customer {...}', kind: 'res' }], anno: [{ node: 'acl', text: 'legacy names stop here', dy: -50 }] },
      { title: 'Legacy changes in one place', text: 'When the ERP renames a field, only the ACL changes. When the ERP is finally replaced, only the ACL is rewritten.', on: ['acl'], bad: ['erp'] }
    ]}
  ],
  how: [
    { name: 'Why not a big-bang rewrite', text: ['A full rewrite delivers nothing for months or years, chases a system that keeps changing, and ends in one risky cutover night. The strangler fig ships every slice, and rolling back a slice is just pointing a route back.'] },
    { name: 'The steps', text: ['1) Put a facade in front: a proxy, the API gateway, or interception of messages. 2) Pick a slice with clear boundaries and real value. 3) Build it, sync its data, run a shadow or canary. 4) Route all of the slice\'s traffic to it. 5) Delete the old code. Repeat.'],
      code: '# Routing facade: move one path at a time (nginx)\nlocation /api/orders/   { proxy_pass http://orders-service; }   # migrated\nlocation /api/invoices/ { proxy_pass http://invoice-service; }  # migrated\nlocation /              { proxy_pass http://legacy-monolith; }  # everything else' },
    { name: 'Data is the hard part', text: ['During migration, decide who owns each table. A common path: the new service starts with data copied from the legacy DB by CDC, both run side by side with reconciliation, then ownership flips and changes sync back to legacy if other old features still read them.'] },
    { name: 'Anti-corruption layer', text: ['From Domain-Driven Design: a translation layer between a new bounded context and a system with a different model. It can be a module in the new service or its own small service. It stops legacy names, codes and quirks spreading through every new codebase.'] },
    { name: 'Picking slices', text: ['Start with something bounded and lower risk to learn the routine: often read-heavy features or areas that change often. Leave the riskiest core (billing, ledger) until the team and the tooling are proven.'] }
  ],
  compare: { title: 'Ways to replace a legacy system', lead: null, head: ['Approach', 'Risk', 'Value delivered'], rows: [
    ['Big-bang rewrite', 'High: one huge cutover while the old system keeps changing', 'Nothing until the end'],
    ['Strangler fig', 'Low: one slice at a time, easy rollback', 'Every slice ships'],
    ['Branch by abstraction', 'Low, inside one codebase', 'Steady, but stays in the monolith'],
    ['Keep it, wrap it with an ACL', 'Lowest', 'New features avoid the mess; the old core stays']
  ]},
  say: [
    'I would not rewrite the monolith in one go. A routing facade lets us move one path at a time to new services.',
    'Orders moves first: data is copied with CDC, we canary 5% of traffic and compare, then flip the route and delete the old code.',
    'New services talk to the legacy ERP only through an anti-corruption layer, so its names and codes never leak into the new model.'
  ],
  numbers: [
    ['1–5%', 'first canary share for a migrated slice'],
    ['weeks', 'per slice, instead of years for a rewrite'],
    ['0', 'public URL changes: the facade keeps the API stable']
  ],
  pitfalls: [
    ['Never deleting the old code', 'Two systems run forever. A slice is only done when the legacy path is gone.'],
    ['Hardest part first', 'Start with a bounded slice to learn the routine.'],
    ['Sharing the legacy database forever', 'New services writing legacy tables keep all the coupling. Plan data ownership.'],
    ['No anti-corruption layer', 'Legacy codes like ST=3 spread into every new service.'],
    ['A fragile facade', 'It carries every request. Keep it a simple, redundant proxy.']
  ],
  seen: [
    ['Martin Fowler', 'Named the Strangler Fig pattern after the vines that replace their host tree.'],
    ['Domain-Driven Design (Eric Evans)', 'Introduced the anti-corruption layer between bounded contexts.'],
    ['Banks and insurers', 'Wrap mainframes with APIs and ACLs while new services take over feature by feature.'],
    ['API gateways and NGINX', 'The usual routing facade that moves one path at a time.'],
    ['CDC-based migrations', 'Debezium streams legacy DB changes to feed new services during the move.']
  ],
  probe: [
    ['How do you pick the first slice?', ['A clear boundary, few dependencies, real value and low risk: often a read-heavy or frequently changed area. Not the core billing logic.']],
    ['How do you handle data during migration?', ['Copy it from the legacy DB with CDC, run both and reconcile, then switch ownership to the new service and sync back if old features still read it.']],
    ['How do you roll back a slice?', ['Point the facade route back to the monolith. Keep the legacy path until the new one has run cleanly for a while.']],
    ['What does an anti-corruption layer do?', ['It translates between the legacy model and the new domain model, so legacy concepts, names and quirks do not leak into new code.']]
  ],
  checklist: [
    'Explain why big-bang rewrites fail.',
    'Draw the routing facade moving one slice.',
    'Explain how data moves during a slice migration.',
    'Explain the anti-corruption layer with an example.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-rewrite', title: 'Two-year rewrite', ask: 'Leadership wants to rewrite a 10-year-old monolith from scratch over two years. Better plan?', options: [
        ['Strangler fig: a facade in front, migrate slice by slice, delete old code as you go', true, 'Value ships throughout and each step can be rolled back.'],
        ['Freeze all features for two years', false, 'The business cannot wait that long.'],
        ['Build the new system in parallel and switch DNS on one night', false, 'That is the big-bang cutover risk.'],
        ['Run both systems forever', false, 'Double the cost with no end.']
      ]},
      { id: 'mcq-acl', title: 'Legacy codes everywhere', ask: 'New services keep using the legacy ERP\'s codes like ST=3 and CUST_NM, and they spread into every codebase. Fix?', options: [
        ['Add an anti-corruption layer that translates ERP data into the new domain model', true, 'One place knows the legacy model.'],
        ['Write a wiki page explaining the codes', false, 'The codes still spread.'],
        ['Rename the fields inside the ERP', false, 'Risky; other systems depend on them.'],
        ['Let each service translate on its own', false, 'Duplicated and inconsistent translations.']
      ]},
      { id: 'mcq-roll', title: 'Errors after cutover', ask: 'The error rate on the newly migrated `/orders` path jumps after cutover. Fastest safe action?', options: [
        ['Route /orders back to the monolith at the facade', true, 'Rollback is a routing change; the legacy path still exists.'],
        ['Hot-fix in production while users see errors', false, 'Users keep failing while you debug.'],
        ['Delete the new service', false, 'Destroys the work instead of pausing it.'],
        ['Restore a database backup', false, 'Slow, and loses recent data.']
      ]}
    ],
    order: [
      { id: 'ord-strangle', title: 'One slice', ask: 'Order the migration of one slice.', steps: [
        'Put a routing facade in front of the monolith',
        'Build the new service and sync its data',
        'Canary a small share of the slice\'s traffic',
        'Route all of the slice\'s traffic to the new service',
        'Delete the slice from the monolith'
      ], extra: ['Switch every feature to the new system in one night'] }
    ],
    fill: [
      { id: 'fill-sf', title: 'One sentence', text: 'The [[strangler fig|strangler]] pattern moves one slice at a time behind a routing [[facade|proxy]], and an [[anti-corruption layer|acl]] keeps legacy models out of new code.' }
    ]
  }
});
})();
