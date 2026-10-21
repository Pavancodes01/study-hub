(function(){
var vert = { w: 760, h: 260, nodes: [
  { id: 'u', label: 'Users', kind: 'client', x: 90, y: 130 },
  { id: 's', label: 'One server', sub: '8 cores, 32 GB', kind: 'service', x: 340, y: 130, w: 140 },
  { id: 'd', label: 'Database', kind: 'db', x: 600, y: 130 }
], edges: [['u', 's'], ['s', 'd']] };
var horiz = { w: 820, h: 330, nodes: [
  { id: 'u', label: 'Users', kind: 'client', x: 80, y: 165 },
  { id: 'lb', label: 'Load balancer', kind: 'lb', x: 240, y: 165, w: 128 },
  { id: 's1', label: 'Server 1', kind: 'service', x: 430, y: 60 },
  { id: 's2', label: 'Server 2', kind: 'service', x: 430, y: 165 },
  { id: 's3', label: 'Server 3', kind: 'service', x: 430, y: 270 },
  { id: 'sess', label: 'Redis', sub: 'sessions', kind: 'cache', x: 660, y: 80 },
  { id: 'd', label: 'Database', kind: 'db', x: 660, y: 240 }
], edges: [['u', 'lb'], ['lb', 's1'], ['lb', 's2'], ['lb', 's3'], ['s1', 'sess'], ['s2', 'sess'], ['s3', 'sess'], ['s1', 'd'], ['s2', 'd'], ['s3', 'd']] };

registerConcept({
  slug: 'scaling', order: 1, title: 'Scaling basics',
  one: 'Handle more load by getting a ==bigger machine== (vertical) or ==more machines== (horizontal). Horizontal only works if servers keep no state of their own.',
  picture: [
    'A restaurant gets busy. Vertical scaling is hiring a faster chef. Horizontal scaling is opening more kitchens. The faster chef is easy but has a limit and if they get sick the restaurant closes. More kitchens have no limit, but every kitchen must use the same recipes and the same order book.',
    'In software, "the same order book" means: no user data lives inside one server. Sessions, uploads and caches go to shared stores, so **any server can handle any request**. That property is called being **stateless**.'
  ],
  use: ['traffic will grow past one machine', 'you need to survive a server dying', 'load changes a lot during the day', 'you deploy often and want zero downtime'],
  avoid: ['small internal tool with steady load', 'you have not yet measured a bottleneck', 'the state cannot be moved out (for now, scale vertically)'],
  flows: [
    { name: 'Vertical', title: 'Scale up: one bigger machine', diagram: vert, steps: [
      { title: 'One server does everything', text: 'Simple: one place to deploy, debug and monitor. Fine for a surprising amount of traffic.', on: ['s'], dots: [{ from: 'u', to: 's', label: 'requests' }, { from: 's', to: 'd', label: 'queries' }] },
      { title: 'Traffic doubles: buy a bigger box', text: 'Move to 64 cores and 256 GB. No code changes. This is often the right first answer.', on: ['s'], set: { s: { label: 'Bigger server', sub: '64 cores, 256 GB' } } },
      { title: 'The ceiling', text: 'There is a largest machine you can buy, and the price grows faster than the power. Upgrading also usually means downtime.', on: ['s'], set: { s: { label: 'Largest server', sub: 'no bigger size exists' } }, anno: [{ node: 's', text: 'cost ↑↑, limit reached' }] },
      { title: 'Single point of failure', text: 'If this one machine dies, the whole product is down. Vertical scaling never fixes availability.', bad: ['s'], badEdges: ['u-s'], anno: [{ node: 's', text: 'down = all users down' }] }
    ]},
    { name: 'Horizontal', title: 'Scale out: many small machines', diagram: horiz, progressive: true, steps: [
      { title: 'Add a load balancer', add: ['u', 'lb', 's1', 'd'], text: 'Put a load balancer in front, even with one server. It is the door that lets you add more servers later.', on: ['lb'], dots: [{ from: 'u', to: 'lb' }, { from: 'lb', to: 's1' }] },
      { title: 'Add identical servers', add: ['s2', 's3'], text: 'Run three copies of the same code. The load balancer spreads requests between them. Need more? Add a fourth.', on: ['s1', 's2', 's3'], dots: [{ from: 'lb', to: 's1' }, { from: 'lb', to: 's2' }, { from: 'lb', to: 's3' }] },
      { title: 'Problem: where is my login?', text: 'User logs in on server 1, next request lands on server 3, which has never heard of them. Data kept in a server\'s memory breaks horizontal scaling.', bad: ['s3'], anno: [{ node: 's3', text: 'who are you?', dx: 0, dy: 48 }] },
      { title: 'Move state out', add: ['sess'], text: 'Sessions go to Redis (or into a signed token the client carries). Now every server is **stateless** and interchangeable.', on: ['sess'], dots: [{ from: 's3', to: 'sess', label: 'session?' }, { from: 'sess', to: 's3', label: 'user 7', kind: 'res' }] },
      { title: 'A server dies', text: 'Health checks notice server 2 is gone and stop sending it traffic. Users do not notice. Autoscaling starts a replacement.', bad: ['s2'], on: ['lb'], dots: [{ from: 'lb', to: 's1' }, { from: 'lb', to: 's3' }] },
      { title: 'Next bottleneck: the database', text: 'App servers now scale freely, so the database becomes the limit. That is what caching, replication and sharding are for.', on: ['d'], anno: [{ node: 'd', text: 'next problem', dx: 0, dy: 56 }] }
    ]}
  ],
  howLead: 'Scaling is a sequence: make servers stateless, scale them out, then protect and split the data layer.',
  how: [
    { name: 'Vertical scaling (scale up)', text: ['More CPU, RAM or faster disks on the same machine. Zero code change, keeps strong consistency easy, and modern machines are huge. Limits: a hard ceiling, rising cost, downtime to upgrade, and still a single point of failure.'] },
    { name: 'Horizontal scaling (scale out)', text: ['More machines behind a load balancer. Near-unlimited capacity and survives failures. Requires stateless services and brings distributed-systems problems: consistency between nodes, partial failures, network calls.'] },
    { name: 'Making a service stateless', text: [
      'Move anything that must survive between requests out of the server: sessions to Redis or JWT tokens, uploaded files to blob storage, caches to a shared cache, scheduled jobs to a queue with workers.',
      'Test: could you kill any server at any moment without losing user data? If yes, it is stateless.'
    ]},
    { name: 'Autoscaling', text: ['Add servers when a metric (CPU above 60%, queue length, requests per server) crosses a threshold, remove them when it drops. Keep a minimum of 2–3 for availability, and scale before the peak since new servers take a minute to start.'] },
    { name: 'Scaling the data layer', text: ['Stateless app servers are easy; data is hard. Typical order: cache hot reads, add read replicas, then shard (split data across machines). Each step adds complexity, so only take it when the numbers say so.'] }
  ],
  compare: { title: 'Vertical vs horizontal', lead: null, head: ['', 'Vertical (up)', 'Horizontal (out)'], rows: [
    ['Limit', 'Biggest machine you can buy', 'Practically none'],
    ['Failure', 'One box down = outage', 'Lose one of many, keep running'],
    ['Code changes', 'None', 'Services must be stateless'],
    ['Cost curve', 'Grows faster than capacity', 'Roughly linear'],
    ['Complexity', 'Low', 'Load balancing, coordination, partial failures'],
    ['Good for', 'Databases early on, quick wins', 'Web and API tiers, workers']
  ]},
  say: [
    'I\'ll keep the app servers stateless so I can scale them horizontally behind a load balancer.',
    'Sessions go to Redis, files to object storage, so any server can serve any request.',
    'For the database I\'d scale up first, then add read replicas, and only shard when one machine can\'t hold the writes.',
    'I\'ll keep at least three servers across availability zones so one failure isn\'t an outage.'
  ],
  numbers: [
    ['~1k–10k', 'requests/s for one typical app server', 'depends heavily on work per request'],
    ['~10k–50k', 'simple queries/s on one well-tuned SQL DB'],
    ['1–3 min', 'to boot a new VM or container node', 'scale before the peak'],
    ['N+1 / N+2', 'spare servers to survive failures']
  ],
  pitfalls: [
    ['Sticky sessions as the fix', 'Pinning users to one server hides the state problem; that server dying still logs everyone out, and load becomes uneven.'],
    ['Scaling before measuring', 'Adding machines to a slow query just runs the slow query in more places. Find the bottleneck first.'],
    ['Forgetting the database', 'Ten times more app servers send ten times more queries to one database.'],
    ['Local files', 'Writing uploads to a server\'s disk means other servers cannot see them. Use object storage.'],
    ['Autoscaling too late', 'Scaling on CPU at 90% means new servers arrive after the spike.']
  ],
  seen: [
    ['Stack Overflow', 'Famously served huge traffic from a handful of big, vertically scaled SQL Server machines for years.'],
    ['Netflix', 'Thousands of stateless service instances, autoscaled, spread over availability zones.'],
    ['Kubernetes HPA', 'Horizontal Pod Autoscaler adds pods when CPU or a custom metric crosses a target.'],
    ['Serverless (AWS Lambda)', 'Horizontal scaling taken to the limit: one instance per concurrent request.']
  ],
  probe: [
    ['When is vertical scaling the better choice?', ['Early on, for stateful parts like a database, when traffic is predictable, or when the team is small. It is cheaper in engineering time. Say you would move to horizontal when you hit the size or availability limit.']],
    ['How do you handle user sessions with many servers?', ['Store them in a shared store like Redis, or make them stateless tokens (signed JWT) carried by the client. Sticky sessions work but make failover and balancing worse.']],
    ['How do you decide how many servers?', ['Peak requests per second divided by what one server handles at a safe utilization (say 60%), plus spare capacity for one zone failing. Then load test to confirm.']],
    ['What gets hard when you scale out?', ['Data consistency across nodes, partial failures (one call times out), debugging across machines, and deployments. That is why you add observability, retries with timeouts and idempotency.']]
  ],
  checklist: [
    'Explain vertical vs horizontal scaling with one pro and one con each.',
    'Define "stateless" and list three kinds of state to move out of servers.',
    'Explain why a load balancer is needed for horizontal scaling.',
    'Say the usual order for scaling the data layer.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-login', title: 'Logged out at random', ask: 'After adding 2 more app servers, users report being logged out randomly. Most likely cause?', options: [
        ['Sessions are stored in each server\'s memory', true, 'Requests now land on servers that do not have the session. Move sessions to a shared store or tokens.'],
        ['The database is overloaded', false, 'That would make things slow, not log people out.'],
        ['The load balancer is using round robin', false, 'Round robin is fine once servers are stateless; the real issue is state on the servers.'],
        ['DNS caching', false, 'DNS does not hold login state.']
      ]},
      { id: 'mcq-first', title: 'First step', ask: 'A startup\'s single server hits 80% CPU at peak, traffic grows 10% a month. The team has two engineers. Sensible first move?', options: [
        ['Scale vertically now, make the app stateless, and plan a load balancer next', true, 'Buys time cheaply while preparing for horizontal scaling.'],
        ['Shard the database into 16 shards', false, 'Huge complexity for a problem they do not have yet.'],
        ['Rewrite as 20 microservices', false, 'More moving parts, not more capacity.'],
        ['Do nothing until it crashes', false, 'At 10% growth a month they hit 100% soon; plan ahead.']
      ]},
      { id: 'mcq-uploads', title: 'Missing images', ask: 'Profile photos upload fine but sometimes show as broken after scaling to 3 servers. Why?', options: [
        ['Files are saved to the local disk of whichever server handled the upload', true, 'Other servers cannot see that disk. Store files in object storage like S3.'],
        ['The CDN is caching too long', false, 'That would show old images, not broken ones.'],
        ['JPEG is not supported on all servers', false, 'All servers run the same code.'],
        ['Round robin sends uploads to the wrong server', false, 'Any server should be able to accept an upload; the storage location is the problem.']
      ]}
    ],
    order: [
      { id: 'ord-scale', title: 'Typical scaling path', ask: 'Order the steps a growing web app usually takes.', steps: [
        'Single server with app and database',
        'Move the database to its own machine',
        'Make the app stateless and add a load balancer with more app servers',
        'Add a cache and database read replicas',
        'Shard the database when writes outgrow one machine'
      ], extra: ['Shard the database on day one'] }
    ],
    fill: [
      { id: 'fill-stateless', title: 'Say why it scales', text: 'Because the servers are [[stateless]], any server can handle any request, so I scale [[horizontally|out]] by adding servers behind a [[load balancer|lb]].' }
    ]
  }
});
})();
