(function(){
var cs = { w: 840, h: 320, nodes: [
  { id: 'caller', label: 'Orders', sub: 'discovery client', kind: 'service', x: 100, y: 160, w: 140 },
  { id: 'reg', label: 'Registry', sub: 'Consul / etcd', kind: 'db', x: 390, y: 280, w: 140 },
  { id: 'p1', label: 'Payments #1', sub: '10.0.1.7', kind: 'service', x: 680, y: 50, w: 130 },
  { id: 'p2', label: 'Payments #2', sub: '10.0.2.4', kind: 'service', x: 680, y: 160, w: 130 },
  { id: 'p3', label: 'Payments #3', sub: '10.0.3.9', kind: 'service', x: 680, y: 270, w: 130 }
], edges: [['p1', 'reg'], ['p2', 'reg'], ['p3', 'reg'], ['caller', 'reg'], ['caller', 'p1'], ['caller', 'p2'], ['caller', 'p3']] };

var ss = { w: 840, h: 320, nodes: [
  { id: 'caller', label: 'Orders', sub: 'calls payments:80', kind: 'service', x: 100, y: 160, w: 140 },
  { id: 'vip', label: 'payments', sub: 'Service / LB', kind: 'lb', x: 360, y: 160, w: 140 },
  { id: 'cp', label: 'Control plane', sub: 'tracks ready pods', kind: 'worker', x: 360, y: 280, w: 150 },
  { id: 'p1', label: 'Payments #1', kind: 'service', x: 680, y: 50, w: 130 },
  { id: 'p2', label: 'Payments #2', kind: 'service', x: 680, y: 160, w: 130 },
  { id: 'p3', label: 'Payments #3', kind: 'service', x: 680, y: 270, w: 130 }
], edges: [['caller', 'vip'], ['vip', 'p1'], ['vip', 'p2'], ['vip', 'p3'], ['cp', 'vip']] };

registerConcept({
  slug: 'service-discovery', order: 25, title: 'Service discovery',
  one: 'Instances come and go and their addresses change, so services ==look each other up by name in a registry of healthy instances== instead of hard-coding addresses.',
  picture: [
    'In a big office, people change desks every week. Nobody memorises desk numbers; you check the live directory at the entrance, which only lists people who badged in today. If someone goes home sick, they drop off the directory.',
    'A **service registry** is that directory. Instances **register** when they start and keep proving they are alive with **heartbeats** or health checks. Callers ask "where is payments?" and get only the healthy instances, either directly (**client-side discovery**) or through a load balancer that asks for them (**server-side discovery**).'
  ],
  use: ['instances scale up and down or move between hosts', 'deploys replace instances with new addresses', 'many services calling each other inside a cluster', 'you need traffic to skip instances that are starting or unhealthy'],
  avoid: ['a handful of fixed servers that never change (config is fine)', 'building your own registry when the platform (Kubernetes) already has one', 'trusting long-cached DNS answers for fast-changing instances', 'running the registry as a single node'],
  flows: [
    { name: 'Client-side discovery', title: 'The caller looks up and picks', diagram: cs, steps: [
      { title: 'Instances register', text: 'Each Payments instance registers its address on start and sends a heartbeat every 10 seconds. Miss them for 30 seconds and it is removed.', on: ['p1', 'p2', 'p3', 'reg'], dots: [{ from: 'p1', to: 'reg', label: 'register', kind: 'evt' }, { from: 'p2', to: 'reg', label: 'register', kind: 'evt' }, { from: 'p3', to: 'reg', label: 'register', kind: 'evt' }] },
      { title: 'Lookup', text: 'Orders asks the registry for healthy payments instances and caches the list, refreshing it in the background.', on: ['caller', 'reg'], dots: [{ from: 'caller', to: 'reg', label: 'payments?' }, { from: 'reg', to: 'caller', label: '3 healthy', kind: 'res' }] },
      { title: 'Pick and call', text: 'The client library picks an instance (round robin or least latency) and calls it directly. No extra hop.', on: ['caller', 'p2'], dots: [{ from: 'caller', to: 'p2', label: 'POST /charge' }] },
      { title: 'An instance dies', text: 'Payments #3 crashes. Its heartbeats stop and the registry drops it after the TTL. Until the caller\'s list refreshes, a call to #3 fails and is retried on another instance.', bad: ['p3'], set: { reg: { sub: '2 healthy' } }, badEdges: ['caller-p3'], dots: [{ from: 'caller', to: 'p1', label: 'retry here' }] }
    ]},
    { name: 'Server-side discovery', title: 'A stable name in front', diagram: ss, steps: [
      { title: 'Call a stable name', text: 'Orders calls `http://payments`. DNS resolves it to a virtual IP or load balancer. Orders has no discovery code at all.', on: ['caller', 'vip'], dots: [{ from: 'caller', to: 'vip', label: 'payments:80' }] },
      { title: 'The platform tracks endpoints', text: 'The control plane runs readiness checks and keeps the list of ready instances behind the name up to date.', on: ['cp', 'vip'], dots: [{ from: 'cp', to: 'vip', label: 'endpoints #1 #2 #3', kind: 'evt' }] },
      { title: 'Traffic goes to a ready instance', text: 'The proxy picks one of the ready instances.', on: ['p1'], dots: [{ from: 'vip', to: 'p1', label: 'request' }] },
      { title: 'A pod is still starting', text: 'During a deploy, #2 has started but is still warming up. Its readiness check fails, so it is left out of the endpoints and gets no traffic until it is ready.', bad: ['p2'], set: { cp: { sub: '#2 not ready' } }, dots: [{ from: 'vip', to: 'p3', label: 'request' }] }
    ]}
  ],
  how: [
    { name: 'The problem', text: ['Autoscaling, deploys and crashes keep changing which instances exist and what their IPs are. Hard-coded addresses break on the first redeploy. Services need a live answer to "where is payments right now?".'] },
    { name: 'Registering', text: ['**Self-registration**: the instance registers itself and renews a lease (heartbeat). **Third-party registration**: the platform registers it (Kubernetes adds every pod matching a Service\'s selector). Either way, health decides membership: **readiness** says "send me traffic", **liveness** says "restart me".'] },
    { name: 'Client-side discovery', text: ['The caller\'s library asks the registry and balances requests itself (Eureka with Ribbon, gRPC with xDS). No extra hop and smarter per-request balancing, but you need a library for every language. A mesh sidecar moves this out of the app.'] },
    { name: 'Server-side discovery', text: ['The caller uses a stable name; a load balancer, proxy or DNS resolves it to a healthy instance (Kubernetes Service, AWS load balancer, Consul DNS). Clients stay simple; the price is an extra hop and only the balancing the proxy offers.'],
      code: 'apiVersion: v1\nkind: Service\nmetadata: { name: payments }\nspec:\n  selector: { app: payments }   # every ready pod with this label is an endpoint\n  ports: [{ port: 80, targetPort: 8080 }]\n# callers use http://payments (or payments.default.svc.cluster.local)' },
    { name: 'The registry itself', text: ['It is critical, so it runs as a cluster. **CP** registries (etcd, ZooKeeper, Consul) give one consistent view but may refuse writes during a partition. **AP** registries (Eureka) keep answering with a possibly stale list. For discovery, stale but available is usually fine, because callers retry.'] }
  ],
  compare: { title: 'Client-side or server-side discovery', lead: null, head: ['', 'Client-side', 'Server-side'], rows: [
    ['Who looks up instances', 'A library in the caller', 'A load balancer, proxy or DNS'],
    ['Extra network hop', 'No', 'Yes (or a local sidecar)'],
    ['Languages', 'Library per language', 'Any client'],
    ['Balancing', 'Per request, can be latency-aware', 'Whatever the proxy offers'],
    ['Examples', 'Eureka + Ribbon, gRPC xDS', 'Kubernetes Service, AWS ALB, Consul DNS']
  ]},
  say: [
    'Services find each other through Kubernetes Services: callers use a DNS name and only pods that pass readiness checks get traffic.',
    'An instance that stops heartbeating drops out within about 30 seconds; in the meantime callers retry idempotent calls on another instance.',
    'The registry runs as a 3- or 5-node cluster, so losing a node does not stop discovery.'
  ],
  numbers: [
    ['10 s / 30 s', 'a typical heartbeat interval and removal TTL'],
    ['3 or 5', 'registry nodes in a consensus cluster', 'survives 1 or 2 failures'],
    ['5–30 s', 'typical DNS TTL for service records', 'some clients cache longer']
  ],
  pitfalls: [
    ['Hard-coded IPs', 'Break on the first redeploy or scale-out.'],
    ['Single-node registry', 'When it dies, nothing can find anything new.'],
    ['No readiness checks', 'Pods get traffic while still warming up, so every deploy causes errors.'],
    ['Long DNS caching', 'Clients keep calling dead IPs. Keep TTLs short or use the registry API.'],
    ['No retries on stale entries', 'The list always lags reality a little. Retry idempotent calls elsewhere.']
  ],
  seen: [
    ['Kubernetes', 'Services, EndpointSlices and CoreDNS: server-side discovery built in.'],
    ['HashiCorp Consul', 'Registry with health checks, DNS and HTTP APIs; also offers a mesh.'],
    ['Netflix Eureka', 'AP registry with client-side balancing; prefers stale answers to no answers.'],
    ['etcd, ZooKeeper', 'Consistent stores used as registries via leases and watches.'],
    ['AWS Cloud Map', 'Managed registry for ECS and other AWS services.']
  ],
  probe: [
    ['What happens if the registry goes down?', ['Callers keep using their cached instance lists, so traffic continues to known instances. New instances are not found until it recovers, which is why registries run as clusters.']],
    ['Client-side or server-side?', ['Server-side by default (a Kubernetes Service) for simplicity. Client-side when you need smart per-request balancing or want to skip a hop, often via a mesh sidecar.']],
    ['How does the registry know an instance is dead?', ['Either the instance must renew a lease (heartbeat with a TTL), or the registry or load balancer actively health-checks it. Readiness controls traffic; liveness triggers a restart.']],
    ['CP or AP registry?', ['CP never shows two different views but may refuse updates during a partition. AP keeps answering with possibly stale lists. For discovery, AP behaviour plus caller retries is usually acceptable.']]
  ],
  checklist: [
    'Explain why services need discovery.',
    'Compare client-side and server-side discovery.',
    'Explain heartbeats, TTLs and readiness checks.',
    'Say what happens when the registry is down.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-deploy', title: 'Errors on every deploy', ask: 'Each deploy causes 20 seconds of 502 errors while new pods start. Most likely fix?', options: [
        ['Add a readiness check so pods only get traffic once they are ready', true, 'Starting pods stay out of the endpoints list.'],
        ['Run more pods', false, 'New pods would still get traffic too early.'],
        ['Raise the DNS TTL', false, 'That makes stale entries worse.'],
        ['Switch to client-side discovery', false, 'Same problem unless readiness is tracked.']
      ]},
      { id: 'mcq-dead', title: 'Dead instance still listed', ask: 'An instance crashed 10 seconds ago and the heartbeat TTL is 30 seconds. Some calls still go to it. Best handling?', options: [
        ['Retry idempotent calls on another instance; the registry removes the dead one at the TTL', true, 'The list always lags a little; retries cover the gap.'],
        ['Set the TTL to zero', false, 'Healthy instances would flap in and out.'],
        ['Query the registry before every single request', false, 'Heavy load on the registry and still slightly stale.'],
        ['Restart the caller', false, 'Treats the wrong side.']
      ]},
      { id: 'mcq-k8s', title: 'Picking an approach', ask: 'A small team runs everything on Kubernetes in one language. Which discovery?', options: [
        ['Kubernetes Services: DNS names in front of ready pods', true, 'Built in, nothing extra to run.'],
        ['Run Eureka alongside Kubernetes', false, 'A second registry to operate for no gain.'],
        ['Hard-code pod IPs in config', false, 'Pod IPs change on every restart.'],
        ['Write a custom registry', false, 'Reinventing what the platform already has.']
      ]}
    ],
    order: [
      { id: 'ord-sd', title: 'Life of an instance', ask: 'Order the life of an instance with self-registration.', steps: [
        'Instance starts and warms up',
        'Instance registers its address with the registry',
        'Instance sends heartbeats while it is healthy',
        'Callers look it up and send it traffic',
        'Instance stops heartbeating and the registry removes it after the TTL'
      ], extra: ['Callers read the instance IP from a config file'] }
    ],
    fill: [
      { id: 'fill-sd', title: 'One sentence', text: 'Instances [[register|registration]] with a [[registry|service registry]] and keep renewing a [[heartbeat|lease|ttl]]; callers or a load balancer look them up by name.' }
    ]
  }
});
})();
