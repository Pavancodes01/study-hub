(function(){
var gw = { w: 840, h: 320, nodes: [
  { id: 'web', label: 'Web app', kind: 'client', x: 80, y: 70 },
  { id: 'mob', label: 'Mobile app', kind: 'client', x: 80, y: 250 },
  { id: 'gw', label: 'API gateway', sub: 'auth, limits, routing', kind: 'lb', x: 300, y: 160, w: 160 },
  { id: 'idp', label: 'Auth server', sub: 'public keys (JWKS)', kind: 'ext', x: 300, y: 282, w: 150 },
  { id: 'users', label: 'Users', kind: 'service', x: 580, y: 50 },
  { id: 'orders', label: 'Orders', kind: 'service', x: 580, y: 160 },
  { id: 'catalog', label: 'Catalog', kind: 'service', x: 580, y: 270 }
], edges: [['web', 'gw'], ['mob', 'gw'], ['gw', 'idp', { dash: true }], ['gw', 'users'], ['gw', 'orders'], ['gw', 'catalog']] };

var bff = { w: 840, h: 320, nodes: [
  { id: 'web', label: 'Web app', kind: 'client', x: 80, y: 70 },
  { id: 'mob', label: 'Mobile app', kind: 'client', x: 80, y: 250 },
  { id: 'wbff', label: 'Web BFF', sub: 'web team owns it', kind: 'service', x: 320, y: 70, w: 150 },
  { id: 'mbff', label: 'Mobile BFF', sub: 'mobile team owns it', kind: 'service', x: 320, y: 250, w: 150 },
  { id: 'users', label: 'Users', kind: 'service', x: 640, y: 50 },
  { id: 'orders', label: 'Orders', kind: 'service', x: 640, y: 160 },
  { id: 'catalog', label: 'Catalog', kind: 'service', x: 640, y: 270 }
], edges: [['web', 'wbff'], ['mob', 'mbff'], ['wbff', 'users'], ['wbff', 'orders'], ['wbff', 'catalog'], ['mbff', 'orders'], ['mbff', 'catalog']] };

registerConcept({
  slug: 'api-gateway', order: 24, title: 'API gateway and backends for frontends',
  one: 'An API gateway is ==the single front door for outside traffic==: it authenticates, rate limits and routes. A backend for frontend (BFF) is a thin gateway per client type that shapes data for that client.',
  picture: [
    'A hotel has one reception desk. Guests do not wander into the kitchen or laundry; reception checks who they are, answers simple questions and calls the right department. Business travellers and families might even get different desks, each tuned to what those guests usually ask for.',
    'The **API gateway** is reception: one public entry point that handles TLS, tokens, limits and routing, so services behind it stay simple. A **BFF** is a dedicated desk per client type (web, mobile, partners), owned by that client\'s team.'
  ],
  use: ['many services behind one public API', 'cross-cutting edge work: auth, rate limits, CORS, request IDs', 'mobile clients that would otherwise make many round trips', 'web, mobile and partner APIs that need different shapes'],
  avoid: ['a single service: a load balancer is enough', 'service-to-service calls inside the cluster (that is a mesh or direct calls)', 'a place to put business rules', 'one shared BFF for every client: that is just the generic API again'],
  flows: [
    { name: 'One front door', title: 'What the gateway does with a request', diagram: gw, steps: [
      { title: 'One public address', text: 'The mobile app calls `GET /v1/home`. It knows nothing about the services behind the gateway.', on: ['mob', 'gw'], dots: [{ from: 'mob', to: 'gw', label: 'GET /v1/home' }] },
      { title: 'Edge checks', text: 'The gateway terminates TLS, verifies the JWT signature with **cached** public keys from the auth server, and checks the per-user rate limit. It does not call the auth server on every request.', on: ['gw'], anno: [{ node: 'gw', text: 'token ok · 7/100 per min', dy: -48 }] },
      { title: 'Fan out in parallel', text: 'For the home screen the gateway calls Users, Orders and Catalog at the same time, each with its own timeout.', on: ['users', 'orders', 'catalog'], dots: [{ from: 'gw', to: 'users', label: 'profile' }, { from: 'gw', to: 'orders', label: 'recent' }, { from: 'gw', to: 'catalog', label: 'picks' }] },
      { title: 'One response', text: 'It combines the three answers into one JSON body and adds a request ID for tracing. One round trip for the phone instead of three.', on: ['gw', 'mob'], dots: [{ from: 'orders', to: 'gw', label: 'ok', kind: 'res' }, { from: 'gw', to: 'mob', label: 'home JSON', kind: 'res' }] }
    ]},
    { name: 'Backends for frontends', title: 'One thin backend per client type', diagram: bff, steps: [
      { title: 'One API for all clients hurts', text: 'With one generic API, the phone downloads 200 KB of fields it never shows and makes six calls over a slow network. Each mobile change waits on the backend team.', bad: ['mob'], anno: [{ node: 'mob', text: '6 calls, 3 s', dy: -56 }] },
      { title: 'Mobile BFF', text: 'The mobile team owns a Mobile BFF with one endpoint per screen. It calls only what the screen needs and returns a compact payload.', on: ['mob', 'mbff', 'orders', 'catalog'], dots: [{ from: 'mob', to: 'mbff', label: 'GET /screens/home' }, { from: 'mbff', to: 'orders', label: 'recent' }, { from: 'mbff', to: 'catalog', label: 'picks' }] },
      { title: 'Web BFF', text: 'The web team owns its own BFF, returning richer pages and handling cookie sessions. The two BFFs change at their own pace.', on: ['web', 'wbff', 'users'], dots: [{ from: 'web', to: 'wbff', label: 'GET /pages/account' }, { from: 'wbff', to: 'users', label: 'profile' }, { from: 'wbff', to: 'orders', label: 'history' }] },
      { title: 'Keep BFFs thin', text: 'BFFs only aggregate and reshape. Prices, discounts and stock rules stay in the services, so web and mobile can never disagree about them.', on: ['users', 'orders', 'catalog'], anno: [{ node: 'orders', text: 'rules live here', dy: -46 }] }
    ]}
  ],
  how: [
    { name: 'Jobs of a gateway', text: ['Routing by path or host (`/orders/*` to the orders service), TLS termination, authentication (validate the token, forward the user ID), rate limits and API keys, request and response transformation, CORS, caching of public responses, and adding request IDs for tracing. It is an L7 proxy that understands APIs.'],
      code: 'routes:\n  - match: { path: /v1/orders/** }\n    to: http://orders.internal\n    auth: jwt              # verify with cached public keys\n    rateLimit: 100/min per user\n    timeout: 2s\n  - match: { path: /v1/home }\n    to: http://home-bff.internal   # aggregation endpoint' },
    { name: 'Aggregation', text: ['One client call becomes several service calls in parallel. This matters most on mobile, where each round trip can cost 100 ms or more. Give each inner call a timeout and return partial results when a non-critical part fails.'] },
    { name: 'Backends for frontends', text: ['A gateway per client experience: web, iOS/Android, partner API. The client team owns it and deploys it with the client. It prevents one shared gateway filling up with "if mobile then…" branches.'] },
    { name: 'Keep it thin', text: ['No business rules in the gateway or BFF. Otherwise it becomes a "god gateway": every team must change it, it deploys constantly, and it turns into a distributed monolith.'] },
    { name: 'Keep it available', text: ['Every request passes through it, so run several stateless instances per zone behind an L4 load balancer. Keep its dependencies minimal: verify signed tokens locally with cached keys instead of calling the auth server per request.'] }
  ],
  compare: { title: 'Gateway, BFF, load balancer or mesh', lead: null, head: ['Component', 'Traffic', 'Main job'], rows: [
    ['Load balancer', 'Any, L4 or L7', 'Spread traffic over healthy instances'],
    ['API gateway', 'North-south: outside to inside', 'Auth, limits, routing, one public API'],
    ['BFF', 'North-south, one client type', 'Shape and aggregate data for that client'],
    ['Service mesh', 'East-west: service to service', 'mTLS, retries and telemetry between services']
  ]},
  say: [
    'All public traffic enters through an API gateway that validates the JWT, applies per-user rate limits and routes by path.',
    'Mobile gets its own BFF that returns the home screen in one call; business rules stay in the services.',
    'The gateway is stateless and runs in every zone behind an L4 balancer, so it is not a single point of failure.'
  ],
  numbers: [
    ['1–5 ms', 'typical latency a gateway hop adds'],
    ['~100 ms', 'one mobile round trip on a slow network', 'why aggregation matters'],
    ['1 vs 6', 'calls per screen with and without a BFF in the example']
  ],
  pitfalls: [
    ['Business logic in the gateway', 'It becomes a monolith that every team must change and deploy.'],
    ['Single gateway instance', 'Every request depends on it. Run it redundant across zones.'],
    ['Calling the auth server per request', 'Couples every request to it. Verify signed tokens locally with cached keys.'],
    ['One BFF for all clients', 'That is the generic API again. One BFF per client experience.'],
    ['No timeouts when aggregating', 'One slow service stalls the whole screen. Time out and return partial data.']
  ],
  seen: [
    ['Netflix Zuul', 'Edge gateway for routing, auth and resilience; Netflix also built device-specific API adapters.'],
    ['Kong, Envoy, NGINX', 'Common self-hosted gateways with auth and rate-limit plugins.'],
    ['AWS API Gateway', 'Managed gateway: routes to Lambdas and services, API keys, throttling.'],
    ['SoundCloud', 'Popularised the BFF pattern with separate backends per client.'],
    ['GraphQL gateways', 'Federated GraphQL acts as an aggregating gateway over many services.']
  ],
  probe: [
    ['Is the gateway a single point of failure?', ['Only if you run one. It is stateless, so run several per zone behind an L4 load balancer and keep its own dependencies few.']],
    ['Gateway or load balancer?', ['A load balancer spreads traffic. A gateway is an L7 proxy that also understands the API: auth, keys, limits, path routing and transformation. Many gateways sit behind a load balancer.']],
    ['How does the user identity reach the services?', ['The gateway validates the token and forwards the user ID (or the token) in a header. Services trust it only from inside the network, ideally over mTLS.']],
    ['What if one of three aggregated calls fails?', ['Each call has a timeout. Return the parts that worked, flag the missing part, and use cached fallbacks for non-critical sections.']]
  ],
  checklist: [
    'List five jobs of an API gateway.',
    'Explain what a BFF is and who owns it.',
    'Explain why the gateway must stay thin.',
    'Explain how to keep the gateway highly available.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-chatty', title: 'Slow home screen', ask: 'The mobile home screen makes 7 API calls and takes 3 seconds on 3G. Best fix?', options: [
        ['A mobile BFF endpoint that makes the 7 calls server-side in parallel', true, 'One round trip for the phone; the fan-out happens on a fast network.'],
        ['Make each service faster', false, 'Round trips over 3G dominate, not service time.'],
        ['Put a CDN in front', false, 'The data is personal and not cacheable at the edge.'],
        ['Merge all the services', false, 'Far too big a change for a client problem.']
      ]},
      { id: 'mcq-logic', title: 'Discounts in the gateway', ask: 'A team wants the gateway to compute discount rules so every client gets them. Your answer?', options: [
        ['Keep the rules in the pricing service; the gateway only routes, authenticates and limits', true, 'A thin gateway avoids a god service every team must change.'],
        ['Put them in the gateway', false, 'The gateway becomes a monolith.'],
        ['Put them in each client', false, 'Web and mobile would drift apart.'],
        ['Put them in the CDN', false, 'Not a place for business rules.']
      ]},
      { id: 'mcq-auth', title: 'Auth slows everything', ask: 'The gateway calls the auth server to check every token. When the auth server is slow, the whole site is slow. Fix?', options: [
        ['Use signed JWTs and verify them in the gateway with cached public keys', true, 'No network call per request.'],
        ['Retry the auth server', false, 'Adds load to a struggling service.'],
        ['Skip authentication', false, 'Not an option.'],
        ['Let every service call the auth server instead', false, 'Same coupling, multiplied.']
      ]}
    ],
    order: [
      { id: 'ord-gw', title: 'Through the gateway', ask: 'Order what the gateway does with an incoming request.', steps: [
        'Terminate TLS',
        'Verify the JWT with cached public keys',
        'Check the per-user rate limit',
        'Route by path to the target service',
        'Return the response with a request ID'
      ], extra: ['Apply the cart discount rules'] }
    ],
    fill: [
      { id: 'fill-gw', title: 'One sentence', text: 'The [[API gateway|gateway]] is the single entry point for auth, limits and routing; a [[BFF|backend for frontend]] shapes responses for one client type, and both stay [[thin]].' }
    ]
  }
});
})();
