(function(){
var lb = { w: 820, h: 320, nodes: [
  { id: 'u1', label: 'User A', kind: 'client', x: 80, y: 70 },
  { id: 'u2', label: 'User B', kind: 'client', x: 80, y: 250 },
  { id: 'lb', label: 'Load balancer', sub: 'health checks', kind: 'lb', x: 290, y: 160, w: 140 },
  { id: 's1', label: 'Server 1', sub: 'conns: 12', kind: 'service', x: 560, y: 55 },
  { id: 's2', label: 'Server 2', sub: 'conns: 3', kind: 'service', x: 560, y: 160 },
  { id: 's3', label: 'Server 3', sub: 'conns: 9', kind: 'service', x: 560, y: 265 }
], edges: [['u1', 'lb'], ['u2', 'lb'], ['lb', 's1'], ['lb', 's2'], ['lb', 's3']] };
var l7 = { w: 820, h: 320, nodes: [
  { id: 'u', label: 'Client', kind: 'client', x: 80, y: 160 },
  { id: 'l4', label: 'L4 balancer', sub: 'IP + port only', kind: 'lb', x: 250, y: 160, w: 130 },
  { id: 'l7', label: 'L7 gateway', sub: 'reads HTTP', kind: 'lb', x: 440, y: 160, w: 130 },
  { id: 'api', label: 'API service', sub: '/api/*', kind: 'service', x: 680, y: 60 },
  { id: 'img', label: 'Image service', sub: '/img/*', kind: 'service', x: 680, y: 160 },
  { id: 'ws', label: 'Chat service', sub: 'WebSocket', kind: 'service', x: 680, y: 260 }
], edges: [['u', 'l4'], ['l4', 'l7'], ['l7', 'api'], ['l7', 'img'], ['l7', 'ws']] };

registerConcept({
  slug: 'load-balancing', order: 2, title: 'Load balancing',
  one: 'One entry point that ==spreads requests over many servers== and stops sending traffic to the ones that are unhealthy.',
  picture: [
    'A host at a busy restaurant seats each new group at a free table and skips tables that are being cleaned. Customers never pick a table themselves and never see which waiter is off sick.',
    'A load balancer is that host. Clients talk to one address. Behind it, servers come and go. Two things matter: **how it picks a server** (the algorithm) and **how much of the request it reads** (layer 4 vs layer 7).'
  ],
  use: ['more than one server for a service', 'zero-downtime deploys', 'TLS termination in one place', 'routing by path or host to different services'],
  avoid: ['a single server you will never duplicate', 'service-to-service calls where client-side balancing is already built in (gRPC, service mesh)'],
  flows: [
    { name: 'Picking a server', title: 'Algorithms and health checks', diagram: lb, steps: [
      { title: 'Round robin', text: 'Servers take turns: 1, 2, 3, 1, 2, 3. Simple and fair when every request costs about the same.', on: ['lb'], dots: [{ from: 'u1', to: 'lb' }, { from: 'lb', to: 's1', label: '1' }, { from: 'lb', to: 's2', label: '2' }, { from: 'lb', to: 's3', label: '3' }] },
      { title: 'Least connections', text: 'Send the next request to the server with the fewest open connections. Better when some requests are long (uploads, reports, WebSockets).', on: ['s2'], dots: [{ from: 'u2', to: 'lb' }, { from: 'lb', to: 's2', label: 'fewest (3)' }] },
      { title: 'Hash-based (sticky)', text: 'Hash a key such as user ID or client IP to pick the server. The same user always lands on the same server, which helps local caches but makes load uneven.', on: ['s1'], dots: [{ from: 'u1', to: 'lb', label: 'user A' }, { from: 'lb', to: 's1', label: 'hash(A) → 1' }] },
      { title: 'Health check fails', text: 'Every few seconds the balancer calls `/health` on each server. Server 3 stops answering, so it is taken out of rotation.', bad: ['s3'], badEdges: ['lb-s3'], anno: [{ node: 's3', text: 'failed 3 checks', dx: 0, dy: 46 }], set: { s3: { sub: 'unhealthy' } } },
      { title: 'Traffic flows around it', text: 'New requests only go to healthy servers. When server 3 passes checks again it is added back. Users never saw the failure.', on: ['s1', 's2'], dots: [{ from: 'lb', to: 's1' }, { from: 'lb', to: 's2' }] }
    ]},
    { name: 'L4 vs L7', title: 'How much of the request the balancer reads', diagram: l7, steps: [
      { title: 'Layer 4: TCP level', text: 'An L4 balancer only sees IP addresses and ports. It forwards bytes without reading them. Very fast, handles millions of connections, cannot route by URL.', on: ['l4'], dots: [{ from: 'u', to: 'l4', label: 'TCP :443' }, { from: 'l4', to: 'l7' }] },
      { title: 'Layer 7: HTTP level', text: 'An L7 balancer (API gateway, Nginx, Envoy) decrypts TLS and reads the HTTP request: path, headers, cookies. That lets it route, rewrite and authenticate.', on: ['l7'] },
      { title: 'Route by path', text: '`/api/*` goes to the API service, `/img/*` to the image service. One public address, many internal services.', on: ['api', 'img'], dots: [{ from: 'l7', to: 'api', label: '/api/orders' }, { from: 'l7', to: 'img', label: '/img/42.jpg' }] },
      { title: 'Long-lived connections', text: 'WebSockets stay open for hours. Use least-connections and make sure the balancer supports connection upgrades and long idle timeouts.', on: ['ws'], dots: [{ from: 'l7', to: 'ws', label: 'Upgrade: websocket' }] }
    ]}
  ],
  how: [
    { name: 'Algorithms', text: [
      '**Round robin** (optionally weighted for bigger servers). **Least connections** or **least response time** for uneven request costs. **Consistent hashing** on a key when the same key should reach the same server (caches, chat rooms). **Random of two choices**: pick two at random, send to the less busy one; surprisingly good and cheap.'
    ]},
    { name: 'Health checks', text: ['Active checks call an endpoint like `/health` every few seconds; passive checks watch real responses for errors and timeouts. A good health endpoint checks the server can do its job (for example, reach its database), but not so deeply that one shared dependency marks every server down at once.'] },
    { name: 'Layer 4 vs layer 7', text: ['L4 works on TCP/UDP: fast, protocol-agnostic, cannot see URLs. L7 works on HTTP: can route by path or header, terminate TLS, add auth, rate limits and retries, but costs more CPU. Big systems often use both: L4 in front for raw scale, L7 behind for smarts.'] },
    { name: 'Avoiding the balancer as a single point of failure', text: ['Run balancers in pairs (active-passive with a floating IP) or as a managed service spread over zones. In front of that, DNS can point to several regions, and anycast routes users to the nearest one.'] },
    { name: 'Global load balancing', text: ['DNS-based (GeoDNS) or anycast routing sends users to the nearest healthy region, then a regional balancer picks a server. Failover between regions happens by changing DNS answers or withdrawing anycast routes.'] }
  ],
  compare: { title: 'Algorithms compared', lead: 'Pick by how uneven your requests are and whether "same key, same server" matters.', head: ['Algorithm', 'How it picks', 'Good for', 'Weak spot'], rows: [
    ['Round robin', 'Next server in turn', 'Similar, short requests', 'Ignores current load'],
    ['Weighted round robin', 'Turns proportional to capacity', 'Mixed server sizes', 'Still ignores live load'],
    ['Least connections', 'Fewest open connections', 'Long or uneven requests, WebSockets', 'Needs connection tracking'],
    ['IP / key hash', 'hash(key) mod N', 'Stickiness, local caches', 'Uneven load; reshuffles when N changes'],
    ['Consistent hashing', 'Key\'s position on a hash ring', 'Caches and shards that change size', 'More complex; needs virtual nodes']
  ]},
  say: [
    'A load balancer in front lets me add and remove app servers freely and route around failures with health checks.',
    'Requests here are similar in cost, so round robin is fine; for the WebSocket service I\'d use least connections.',
    'I\'ll terminate TLS at an L7 gateway and route `/api` and `/media` to separate services.',
    'The balancer itself runs as a redundant pair across zones so it is not a single point of failure.'
  ],
  numbers: [
    ['5–10 s', 'typical health check interval', '2–3 failures to mark down'],
    ['millions', 'concurrent connections on an L4 balancer'],
    ['~100k+', 'HTTP requests/s per L7 proxy node (Nginx/Envoy class)'],
    ['< 1 ms', 'added latency of a healthy balancer']
  ],
  pitfalls: [
    ['Balancer as single point of failure', 'One balancer box in front of ten servers just moves the risk. Run it redundantly.'],
    ['Health check too shallow', '`/health` returns 200 while the server cannot reach its database, so users get errors.'],
    ['Health check too deep', 'Every server checks the same database; it blips and every server is marked down at once.'],
    ['Sticky sessions hiding state', 'Stickiness makes load uneven and failures log users out. Prefer stateless servers.'],
    ['Ignoring connection draining', 'Removing a server during a deploy kills in-flight requests unless the balancer drains it first.']
  ],
  seen: [
    ['AWS ALB / NLB', 'ALB is layer 7 (paths, headers); NLB is layer 4 (TCP/UDP, very high throughput).'],
    ['Nginx, HAProxy, Envoy', 'Software balancers and proxies used as L7 gateways and inside service meshes.'],
    ['Google / Cloudflare anycast', 'One IP announced from many locations; the network routes users to the nearest one.'],
    ['Kubernetes Service + Ingress', 'Service does L4 spreading over pods; Ingress controllers do L7 routing.']
  ],
  probe: [
    ['What happens if the load balancer dies?', ['Use a redundant pair with failover (a floating IP or a managed balancer across zones). For whole-region failure, DNS or anycast moves users to another region.']],
    ['Round robin or least connections?', ['Round robin when requests are short and similar. Least connections when durations vary a lot (file uploads, long polling, WebSockets), because round robin would pile long work onto unlucky servers.']],
    ['How do you deploy without dropping requests?', ['Take a server out of rotation, let it finish in-flight requests (connection draining), deploy, wait for health checks to pass, add it back. Repeat server by server (rolling deploy).']],
    ['Where would you use L4 instead of L7?', ['Non-HTTP traffic (databases, game UDP, MQTT), or the very front edge where you need raw throughput and just forward to L7 proxies.']]
  ],
  checklist: [
    'Name four balancing algorithms and when to use each.',
    'Explain the difference between L4 and L7 load balancing.',
    'Explain how health checks and connection draining work.',
    'Say how to keep the load balancer itself from being a single point of failure.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-ws', title: 'Uneven servers', ask: 'A chat service uses round robin. Some servers have 50k open WebSockets, others 5k. Fix?', options: [
        ['Switch to least connections', true, 'Long-lived connections need balancing by current load, not by turn.'],
        ['Switch to IP hash', false, 'Hashing does not look at load and can make it worse.'],
        ['Add a CDN', false, 'CDNs cache content; they do not hold chat sockets.'],
        ['Lower the health check interval', false, 'Health checks detect failures, not imbalance.']
      ]},
      { id: 'mcq-route', title: 'One domain, many services', ask: 'You want `/api/*` and `/static/*` on the same domain to reach different services. Which balancer?', options: [
        ['Layer 7 (HTTP-aware) balancer or gateway', true, 'Only L7 reads the URL path, so it can route by it.'],
        ['Layer 4 balancer', false, 'L4 sees IPs and ports, not paths.'],
        ['DNS round robin', false, 'DNS picks an IP before any path is sent.'],
        ['Client-side balancing in the browser', false, 'Browsers do not know your internal services.']
      ]},
      { id: 'mcq-health', title: 'Everything marked down', ask: 'A brief database hiccup caused the load balancer to mark all 40 app servers unhealthy, causing a full outage. What went wrong?', options: [
        ['The health check depended on a shared dependency, so one blip failed every server', true, 'Keep health checks about the server itself, or fail open when all servers look unhealthy.'],
        ['The interval was too long', false, 'A longer interval would have made the outage less likely, not more.'],
        ['Round robin was used', false, 'The algorithm does not decide health.'],
        ['There were too many servers', false, 'Count is not the problem; the shared check is.']
      ]}
    ],
    order: [
      { id: 'ord-deploy', title: 'Rolling deploy behind a balancer', ask: 'Order the steps to update one server with zero dropped requests.', steps: [
        'Mark the server as draining so it gets no new requests',
        'Wait for in-flight requests to finish',
        'Deploy the new version and restart',
        'Wait until health checks pass',
        'Put the server back into rotation'
      ], extra: ['Restart the server immediately'] }
    ],
    fill: [
      { id: 'fill-lb', title: 'Balancer in one sentence', text: 'The balancer runs [[health checks|health check]] and stops routing to failed servers; for long-lived WebSocket connections I use [[least connections|least-connections]] instead of [[round robin|round-robin]].' }
    ]
  }
});
})();
