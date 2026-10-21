(function(){
var mono = { w: 840, h: 320, nodes: [
  { id: 'u', label: 'Users', kind: 'client', x: 80, y: 160 },
  { id: 'gw', label: 'API gateway', kind: 'lb', x: 260, y: 160, w: 130 },
  { id: 'm', label: 'Monolith', sub: 'users + orders + pay', kind: 'service', x: 480, y: 160, w: 170, h: 70 },
  { id: 'db', label: 'One DB', kind: 'db', x: 720, y: 160 },
  { id: 'us', label: 'Users svc', kind: 'service', x: 480, y: 50, w: 120 },
  { id: 'or', label: 'Orders svc', kind: 'service', x: 480, y: 160, w: 120 },
  { id: 'pa', label: 'Payments svc', kind: 'service', x: 480, y: 270, w: 130 },
  { id: 'd1', label: 'Users DB', kind: 'db', x: 720, y: 50, w: 110 },
  { id: 'd2', label: 'Orders DB', kind: 'db', x: 720, y: 160, w: 110 },
  { id: 'd3', label: 'Payments DB', kind: 'db', x: 720, y: 270, w: 120 }
], edges: [['u', 'gw'], ['gw', 'm'], ['m', 'db'], ['gw', 'us'], ['gw', 'or'], ['gw', 'pa'], ['us', 'd1'], ['or', 'd2'], ['pa', 'd3'], ['or', 'pa', { label: 'API call' }]] };
var monoOnly = JSON.parse(JSON.stringify(mono)); monoOnly.nodes = monoOnly.nodes.filter(function(n){ return ['u', 'gw', 'm', 'db'].indexOf(n.id) >= 0; }); monoOnly.edges = monoOnly.edges.filter(function(e){ return ['u', 'gw', 'm', 'db'].indexOf(e[0]) >= 0 && ['u', 'gw', 'm', 'db'].indexOf(e[1]) >= 0; });
var micro = JSON.parse(JSON.stringify(mono)); micro.nodes = micro.nodes.filter(function(n){ return ['m', 'db'].indexOf(n.id) < 0; }); micro.edges = micro.edges.filter(function(e){ return ['m', 'db'].indexOf(e[0]) < 0 && ['m', 'db'].indexOf(e[1]) < 0; });

registerConcept({
  slug: 'microservices', order: 19, title: 'Microservices or monolith',
  one: 'Split a system into services ==when teams and scaling needs actually diverge==. Each split buys independence and costs network calls, data consistency work and operations.',
  picture: [
    'A monolith is one big kitchen where every cook shares the same fridge. Easy to coordinate, but a crowded kitchen slows everyone and one fire closes it. Microservices are separate food stalls: each has its own fridge and can open late or change its menu alone, but they must phone each other for every shared order.',
    'In interviews, a few services along clear business boundaries is a good default for big systems. Say what each owns, how they talk (API calls vs events), and that each **owns its own data**.'
  ],
  use: ['many teams that step on each other in one codebase', 'parts with very different scaling or tech needs', 'independent deploys and failure isolation', 'clear business boundaries (users, orders, payments)'],
  avoid: ['a small team or a new product (start with a modular monolith)', 'splitting by technical layer (a "database service")', 'boundaries you do not understand yet'],
  flows: [
    { name: 'Monolith', title: 'One deployable, one database', diagram: monoOnly, steps: [
      { title: 'Everything in one process', text: 'Users, orders and payments are modules in one app. Calls between them are function calls: fast and transactional.', on: ['m'], dots: [{ from: 'u', to: 'gw' }, { from: 'gw', to: 'm' }, { from: 'm', to: 'db', label: 'one transaction' }] },
      { title: 'Strengths', text: 'One build, one deploy, one place to debug, and real ACID transactions across features. Perfect for small teams.', on: ['m', 'db'] },
      { title: 'Growing pains', text: 'With 80 engineers, every deploy ships everyone\'s changes; a memory leak in reporting crashes checkout; you must scale the whole app to scale one part.', bad: ['m'], anno: [{ node: 'm', text: 'one bug = all down', dy: -60 }] }
    ]},
    { name: 'Microservices', title: 'Services by business capability', diagram: micro, steps: [
      { title: 'Split by business capability', text: 'Users, Orders and Payments become separate services, each owned by one team, deployed on its own schedule.', on: ['us', 'or', 'pa'], dots: [{ from: 'gw', to: 'us' }, { from: 'gw', to: 'or' }, { from: 'gw', to: 'pa' }] },
      { title: 'Each owns its data', text: 'No service reads another\'s database. That keeps them independent, but a "join" across users and orders now needs API calls or copied data.', on: ['d1', 'd2', 'd3'] },
      { title: 'Calls cross the network', text: 'Placing an order calls Payments over the network: it can be slow, fail or be retried. You need timeouts, retries, idempotency and tracing.', on: ['or', 'pa'], dots: [{ from: 'or', to: 'pa', label: 'charge' }, { from: 'pa', to: 'or', label: 'timeout?', kind: 'err' }] },
      { title: 'No shared transaction', text: 'Order saved but payment failed? Use a saga with compensation, or events via an outbox. Consistency becomes eventual between services.', on: ['or', 'pa'], anno: [{ node: 'or', text: 'saga, not 2PC', dx: 140, dy: 55 }] }
    ]}
  ],
  how: [
    { name: 'Modular monolith first', text: ['One deployable with strict internal modules and boundaries. You get most of the code organization benefits without the network. When a module truly needs independence, extract it.'] },
    { name: 'Finding boundaries', text: ['Split by business capability (domain-driven design "bounded contexts"): things that change together stay together. Avoid splitting by layer (UI service, DB service) or too finely ("nano-services").'] },
    { name: 'Communication', text: ['Synchronous (REST/gRPC) when the caller needs an answer now. Asynchronous events (Kafka) for "something happened" notifications, which decouple services and survive outages. Prefer events for cross-service side effects.'] },
    { name: 'Data ownership', text: ['Database per service. Share data through APIs or events; services keep local read copies of what they need (denormalized). Cross-service consistency via sagas and the outbox pattern.'] },
    { name: 'The platform tax', text: ['Service discovery, API gateway, CI/CD per service, observability (tracing is a must), contract versioning, and on-call per team. Budget for it before splitting.'] }
  ],
  compare: { title: 'Monolith vs microservices', lead: null, head: ['', 'Monolith', 'Microservices'], rows: [
    ['Deploys', 'All together', 'Independent per service'],
    ['Scaling', 'Whole app', 'Each service separately'],
    ['Failure', 'One bug can take everything down', 'Isolated if designed well'],
    ['Transactions', 'ACID across features', 'Sagas, eventual consistency'],
    ['Latency', 'In-process calls', 'Network hops'],
    ['Ops complexity', 'Low', 'High: discovery, tracing, many pipelines'],
    ['Best for', 'Small teams, early products', 'Many teams, mature domains']
  ]},
  say: [
    'I\'d split into a few services by business capability: users, orders, payments, each owning its database.',
    'Services talk gRPC for queries that need an answer now, and Kafka events for side effects like emails.',
    'Order and payment consistency is a saga with compensation, not a distributed transaction.',
    'For a small team I\'d start as a modular monolith and extract services when a real need appears.'
  ],
  numbers: [
    ['~0.5–2 ms', 'added per network hop in one data center'],
    ['5–10', 'engineers per service team, a common size'],
    ['1', 'database owner per service']
  ],
  pitfalls: [
    ['Distributed monolith', 'Services that must deploy together and share a database have all the costs and none of the benefits.'],
    ['Too many services', 'Dozens of tiny services for a small team drown it in ops work.'],
    ['Shared database', 'Services reading each other\'s tables couple them tightly.'],
    ['Chatty calls', 'A page that makes 40 sequential service calls is slow and fragile.'],
    ['No tracing', 'Without traces, debugging across services is guesswork.']
  ],
  seen: [
    ['Amazon', 'Moved to service-oriented teams owning APIs ("two-pizza teams").'],
    ['Netflix', 'Hundreds of microservices with heavy investment in resilience tooling.'],
    ['Shopify', 'Famously runs a large modular monolith with enforced boundaries.'],
    ['Segment', 'Publicly moved back from many microservices to a monolith to cut operational overhead.']
  ],
  probe: [
    ['When would you not use microservices?', ['Small team, new product, unclear domain boundaries, or low scale. A modular monolith is faster to build and change.']],
    ['How do services share data?', ['Through APIs or events, never through each other\'s databases. Services keep local copies of data they need, updated by events.']],
    ['How do you handle a transaction across services?', ['A saga: a sequence of local transactions with compensating actions, coordinated by events (choreography) or an orchestrator.']],
    ['Sync or async between services?', ['Sync when the caller needs the result to continue. Async events for notifications and side effects, so services stay decoupled and resilient.']]
  ],
  checklist: [
    'List three benefits and three costs of microservices.',
    'Explain "database per service" and how data is shared.',
    'Explain when to choose a modular monolith.',
    'Explain sync vs async communication between services.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-team', title: 'Early startup', ask: 'A 4-person startup is building its MVP. Architecture?', options: [
        ['A modular monolith with clear internal boundaries', true, 'Fast to build and change; extract services later.'],
        ['30 microservices on Kubernetes', false, 'Huge ops cost for a tiny team.'],
        ['One service per database table', false, 'Splits by data, not capability; very chatty.'],
        ['Serverless functions calling each other in long chains', false, 'Hard to debug and still a distributed system.']
      ]},
      { id: 'mcq-db', title: 'Shared tables', ask: 'The Orders service reads the Users service\'s tables directly for speed. Problem?', options: [
        ['Tight coupling: Users can no longer change its schema or storage freely', true, 'Database per service keeps teams independent.'],
        ['None, it is faster', false, 'Speed now, pain on every schema change.'],
        ['It breaks HTTPS', false, 'Unrelated.'],
        ['It uses too many threads', false, 'Not the core issue.']
      ]},
      { id: 'mcq-email', title: 'Welcome email', ask: 'After signup, the email service should send a welcome email. How should Users notify it?', options: [
        ['Publish a UserSignedUp event; Email consumes it', true, 'Signup does not wait on email and survives email outages.'],
        ['Synchronous call to Email inside the signup request', false, 'Email being down would break signup.'],
        ['Email polls the Users database every second', false, 'Shared DB access and wasted load.'],
        ['Users sends SMTP itself', false, 'Duplicates email logic in every service.']
      ]}
    ],
    order: [
      { id: 'ord-extract', title: 'Extracting a service', ask: 'Order the steps to pull Payments out of a monolith.', steps: ['Define a clear Payments module boundary inside the monolith', 'Put an API in front of that module', 'Move Payments code into its own service behind the same API', 'Migrate Payments data into its own database', 'Route all callers to the new service and remove the old module'], extra: ['Let the new service read the monolith\'s tables forever'] }
    ],
    fill: [
      { id: 'fill-ms', title: 'Rule of thumb', text: 'Each microservice owns its own [[database|data|db]], and cross-service side effects go through [[events|event|messages]] rather than shared tables.' }
    ]
  }
});
})();
