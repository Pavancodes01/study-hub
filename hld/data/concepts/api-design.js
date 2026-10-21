(function(){
var proto = { w: 840, h: 320, nodes: [
  { id: 'web', label: 'Browser', kind: 'client', x: 80, y: 70 },
  { id: 'mob', label: 'Mobile app', kind: 'client', x: 80, y: 250 },
  { id: 'gw', label: 'API gateway', sub: 'REST / JSON', kind: 'lb', x: 300, y: 160, w: 140 },
  { id: 'a', label: 'Orders', kind: 'service', x: 560, y: 60 },
  { id: 'b', label: 'Payments', kind: 'service', x: 560, y: 260 },
  { id: 'rt', label: 'Realtime', sub: 'WebSocket', kind: 'service', x: 750, y: 160 }
], edges: [['web', 'gw'], ['mob', 'gw'], ['gw', 'a'], ['gw', 'b'], ['a', 'b', { label: 'gRPC' }], ['web', 'rt', { bend: -60, dash: true }]] };

registerConcept({
  slug: 'api-design', order: 13, title: 'API design',
  one: 'The API is the contract between client and server. Pick the ==protocol by who talks and how often==, name resources clearly, and make retries safe.',
  picture: [
    'An API is a restaurant menu: it lists what you can order and what you get back, and hides the kitchen. A good menu is predictable: dishes are grouped, names are clear, and ordering the same dish twice by accident can be undone.',
    'In interviews, writing 3–5 endpoints early pins down **what data the system must store and return**. Get the shape right: resources, inputs, outputs, pagination, errors, and idempotency for writes.'
  ],
  use: ['every design interview, right after requirements', 'public APIs (REST)', 'internal service calls (gRPC)', 'live updates (WebSocket / SSE)'],
  avoid: ['designing 30 endpoints in an interview; 3–5 core ones are enough', 'GraphQL just because, when clients are simple'],
  flows: [
    { name: 'Who uses what', title: 'Protocols by caller', diagram: proto, steps: [
      { title: 'Public clients: REST over HTTPS', text: 'Browsers and mobile apps call a REST API with JSON through a gateway. Universal, cacheable, easy to debug.', on: ['web', 'mob', 'gw'], dots: [{ from: 'web', to: 'gw', label: 'GET /orders?limit=20' }, { from: 'mob', to: 'gw', label: 'POST /orders' }] },
      { title: 'Gateway routes to services', text: 'The gateway handles auth, rate limits and routing, then calls the right service.', on: ['gw'], dots: [{ from: 'gw', to: 'a' }, { from: 'gw', to: 'b' }] },
      { title: 'Service to service: gRPC', text: 'Internal calls use gRPC: typed contracts (protobuf), compact binary, HTTP/2 streams. Faster and safer than hand-written JSON between your own services.', on: ['a', 'b'], dots: [{ from: 'a', to: 'b', label: 'Charge(orderId)' }] },
      { title: 'Server push: WebSocket', text: 'For chat, live prices or order tracking, keep a WebSocket open so the server can push updates instead of the client polling.', on: ['rt', 'web'], dots: [{ from: 'rt', to: 'web', label: 'order 91: shipped', kind: 'evt' }] }
    ]}
  ],
  how: [
    { name: 'REST basics', text: [
      'Resources are nouns in plural: `/users/42/orders`. Verbs come from HTTP: `GET` reads, `POST` creates, `PUT` replaces, `PATCH` updates part, `DELETE` removes. Use status codes honestly: `200`, `201 Created`, `400` bad input, `401/403` auth, `404`, `409` conflict, `429` rate limited, `5xx` server errors.',
      'Version from day one: `/v1/...` or a header.'
    ]},
    { name: 'Pagination', text: ['**Offset** (`?page=3&limit=20`): simple, but slow on deep pages and items shift when new ones arrive. **Cursor** (`?after=<opaque token>&limit=20`): the server returns a cursor pointing at the last item; stable and fast with an index. Use cursors for feeds and large lists.'],
      code: 'GET /v1/users/42/posts?limit=20&cursor=eyJ0IjoxNzE...\n\n200 OK\n{\n  "items": [ ... 20 posts ... ],\n  "nextCursor": "eyJ0IjoxNzA..."   // null on the last page\n}' },
    { name: 'Idempotency', text: ['`GET`, `PUT`, `DELETE` are idempotent by definition. `POST` is not: a retried "create payment" can charge twice. Accept an `Idempotency-Key` header; store key → result; on a repeat, return the stored result.'] },
    { name: 'REST vs gRPC vs GraphQL vs WebSocket', text: ['REST for public resource APIs. gRPC for internal, high-throughput, typed calls and streaming. GraphQL when many different clients need different shapes of nested data in one round trip. WebSocket (two-way) or Server-Sent Events (server to client) for real-time push; long polling as a fallback.'] },
    { name: 'Good habits', text: ['Consistent naming and error format (`{ "error": { "code", "message" } }`), timestamps in ISO 8601 UTC, IDs as strings, never expose internal DB IDs if they are guessable and sensitive, and keep breaking changes behind a new version.'] }
  ],
  compare: { title: 'Choosing a protocol', lead: null, head: ['Protocol', 'Best for', 'Strengths', 'Weaknesses'], rows: [
    ['REST + JSON', 'Public APIs, CRUD', 'Simple, cacheable, universal tooling', 'Over/under-fetching, loose contracts'],
    ['gRPC', 'Internal service calls', 'Typed, fast binary, streaming', 'Not browser-native, harder to debug'],
    ['GraphQL', 'Many clients, nested data', 'Client picks fields, one round trip', 'Caching and rate limiting harder; N+1 queries'],
    ['WebSocket', 'Chat, games, live collaboration', 'Two-way, low latency', 'Stateful connections to scale and balance'],
    ['Server-Sent Events', 'Live feeds, notifications', 'Simple server → client stream over HTTP', 'One direction only'],
    ['Long polling', 'Fallback real-time', 'Works everywhere', 'Wasteful, more latency']
  ]},
  say: [
    'Core API: `POST /v1/posts`, `GET /v1/feed?cursor=`, `POST /v1/posts/{id}/likes`.',
    'Feeds use cursor pagination, so new posts do not shift pages and deep pages stay fast.',
    'Payment creation takes an Idempotency-Key header, so a client retry never charges twice.',
    'Clients use REST, services talk gRPC internally, and live updates go over WebSockets.'
  ],
  numbers: [
    ['3–5', 'endpoints worth writing in an interview'],
    ['20–100', 'typical page size'],
    ['~1 KB', 'typical JSON response for a small object']
  ],
  pitfalls: [
    ['Verbs in URLs', '`/getUser`, `/createOrder` duplicate what HTTP methods already say.'],
    ['Offset pagination for feeds', 'Deep pages are slow and items repeat or vanish when new data arrives.'],
    ['Non-idempotent retries', 'Mobile clients retry on timeouts; without idempotency keys you create duplicates.'],
    ['Leaking internals', 'Returning DB rows directly couples clients to your schema forever.'],
    ['No versioning', 'The first breaking change breaks every client at once.']
  ],
  seen: [
    ['Stripe API', 'Clean REST resources, cursor pagination (`starting_after`), idempotency keys, dated versions.'],
    ['Google', 'gRPC (born from Stubby) for internal service calls.'],
    ['GitHub', 'Offers both REST v3 and a GraphQL v4 API.'],
    ['Slack, Discord', 'WebSocket gateways push messages and events to clients.']
  ],
  probe: [
    ['Offset or cursor pagination?', ['Cursor for large or changing lists like feeds: stable and uses an index seek. Offset is fine for small admin tables where jumping to page 7 matters.']],
    ['How do you make POST safe to retry?', ['Idempotency-Key header: store the key with the response for 24 hours; repeated requests with the same key return the saved response without redoing the work.']],
    ['When would you pick GraphQL?', ['When several clients (web, iOS, partners) need different nested shapes and you want to avoid many round trips. Mention the costs: query cost limits, caching, N+1 data loading.']],
    ['How do you push updates to clients?', ['WebSocket for two-way, SSE for one-way server push, long polling as a fallback. For mobile apps in the background, platform push notifications.']]
  ],
  checklist: [
    'Write 4 REST endpoints for a system with methods and status codes.',
    'Explain cursor vs offset pagination.',
    'Explain idempotency keys.',
    'Pick REST, gRPC, GraphQL or WebSocket for four scenarios.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-page', title: 'Infinite scroll', ask: 'A feed with new posts arriving every second uses `?page=N`. Users see duplicates while scrolling. Fix?', options: [
        ['Cursor pagination based on the last item seen', true, 'The cursor marks a fixed position, so new posts do not shift pages.'],
        ['Bigger page size', false, 'Duplicates still happen, just less often.'],
        ['Cache pages for 10 minutes', false, 'Shows stale data and still shifts.'],
        ['Sort randomly', false, 'Breaks the feed.']
      ]},
      { id: 'mcq-internal', title: 'Internal calls', ask: '40 internal services make thousands of calls per second to each other and want typed contracts. Protocol?', options: [
        ['gRPC with protobuf', true, 'Typed schemas, fast binary encoding, HTTP/2.'],
        ['GraphQL', false, 'Built for flexible client queries, not service-to-service RPC.'],
        ['Long polling', false, 'For push fallback, not RPC.'],
        ['SOAP over email', false, 'No.']
      ]},
      { id: 'mcq-verb', title: 'URL design', ask: 'Best REST endpoint to create an order for user 42?', options: [
        ['`POST /v1/users/42/orders`', true, 'Plural noun resource, POST creates, versioned.'],
        ['`GET /createOrder?user=42`', false, 'GET must not change state, and the verb is in the URL.'],
        ['`POST /v1/createOrderForUser`', false, 'Verb in URL; not resource-oriented.'],
        ['`PUT /v1/order`', false, 'PUT replaces a known resource; no ID here.']
      ]}
    ],
    order: [
      { id: 'ord-idem', title: 'Idempotent POST', ask: 'Order how a server handles a POST with an Idempotency-Key.', steps: [
        'Read the Idempotency-Key header',
        'Look the key up in the idempotency store',
        'If found, return the stored response',
        'If not, do the work and store key → response',
        'Return the response'
      ], extra: ['Always do the work again and return the new result'] }
    ],
    fill: [
      { id: 'fill-api', title: 'API sentence', text: 'Feeds use [[cursor|cursor-based]] pagination, and payment creation accepts an [[idempotency key|idempotency-key]] so retries are safe.' }
    ]
  }
});
})();
