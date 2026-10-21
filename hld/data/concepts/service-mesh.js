(function(){
var mesh = { w: 840, h: 320, nodes: [
  { id: 'aapp', label: 'Orders app', sub: 'pod A', kind: 'service', x: 100, y: 90, w: 130 },
  { id: 'aside', label: 'Sidecar', sub: 'Envoy, pod A', kind: 'lb', x: 300, y: 90, w: 130 },
  { id: 'bside', label: 'Sidecar', sub: 'Envoy, pod B', kind: 'lb', x: 540, y: 90, w: 130 },
  { id: 'bapp', label: 'Payments app', sub: 'pod B', kind: 'service', x: 740, y: 90, w: 140 },
  { id: 'cp', label: 'Control plane', sub: 'Istio / Linkerd', kind: 'worker', x: 420, y: 262, w: 160 }
], edges: [['aapp', 'aside'], ['aside', 'bside', { label: 'mTLS' }], ['bside', 'bapp'], ['cp', 'aside', { dash: true }], ['cp', 'bside', { dash: true }]] };

registerConcept({
  slug: 'service-mesh', order: 26, title: 'Sidecar and service mesh',
  one: 'A sidecar is a helper process deployed next to every service instance. A service mesh puts ==a proxy sidecar beside every service and configures them all centrally==, so mTLS, retries and telemetry leave the application code.',
  picture: [
    'Every diplomat travels with an aide who handles translation, security checks and note-taking. The diplomat just talks. A central office briefs all the aides on today\'s rules, but it is not in the room during the meetings.',
    'The aide is the **sidecar**: a proxy in the same pod as the app. All sidecars together are the **data plane**; the central office is the **control plane**. The app sends plain HTTP to localhost, and the sidecar handles discovery, TLS, retries, timeouts and metrics.'
  ],
  use: ['many services in several languages', 'mTLS between every service (zero trust) is required', 'uniform metrics, tracing and retry policy across all services', 'traffic splitting for canaries without code changes'],
  avoid: ['a few services in one language: a library is simpler', 'tight latency budgets with deep call chains (every hop adds two proxies)', 'a team without capacity to run and debug the mesh', 'expecting it to replace the edge API gateway'],
  flows: [
    { name: 'A call through the mesh', title: 'The app talks to localhost', diagram: mesh, steps: [
      { title: 'App sends plain HTTP', text: 'The Orders app calls `http://payments/charge` as if it were a local call. The pod\'s network rules redirect it to the sidecar.', on: ['aapp', 'aside'], dots: [{ from: 'aapp', to: 'aside', label: 'POST /charge' }] },
      { title: 'Sidecar does the network work', text: 'The outbound sidecar picks a healthy Payments instance, applies a 1 s timeout and a retry budget, and opens **mTLS** using its workload certificate.', on: ['aside', 'bside'], dots: [{ from: 'aside', to: 'bside', label: 'mTLS request' }] },
      { title: 'Policy at the receiver', text: 'The inbound sidecar checks the caller\'s identity from the certificate: "orders may call payments". Then it passes the request to the app on localhost.', on: ['bside', 'bapp'], dots: [{ from: 'bside', to: 'bapp', label: 'POST /charge' }] },
      { title: 'Telemetry for free', text: 'On the way back both sidecars record latency, status code and a trace span. Neither app contains any of this code.', on: ['aside', 'bside'], dots: [{ from: 'bapp', to: 'bside', label: '200', kind: 'res' }, { from: 'bside', to: 'aside', label: '200', kind: 'res' }, { from: 'aside', to: 'aapp', label: '200', kind: 'res' }], anno: [{ node: 'aside', text: 'metrics + span', dy: -50 }] }
    ]},
    { name: 'Control plane', title: 'Configuring the sidecars', diagram: mesh, steps: [
      { title: 'Policy is pushed', text: 'An operator sets "timeout 1 s, retry twice, 10% of traffic to v2". The control plane pushes it to every sidecar (Envoy\'s xDS API).', on: ['cp', 'aside', 'bside'], dots: [{ from: 'cp', to: 'aside', label: 'routes + policy', kind: 'evt' }, { from: 'cp', to: 'bside', label: 'routes + policy', kind: 'evt' }] },
      { title: 'Certificates are issued', text: 'The control plane gives each workload a short-lived certificate tied to its identity and rotates it automatically, usually every day.', on: ['cp'], dots: [{ from: 'cp', to: 'aside', label: 'cert (24 h)', kind: 'evt' }, { from: 'cp', to: 'bside', label: 'cert (24 h)', kind: 'evt' }] },
      { title: 'A slow dependency', text: 'Payments starts timing out. The outbound sidecar\'s circuit breaker ejects the bad instance and fails fast instead of piling up waiting calls.', bad: ['bapp'], badEdges: ['aside-bside'], anno: [{ node: 'aside', text: 'breaker open', dy: -50 }] },
      { title: 'Control plane down', text: 'The control plane is not on the request path. If it dies, sidecars keep the last config and traffic keeps flowing; only changes and new certificates wait.', bad: ['cp'], on: ['aapp', 'bapp'], dots: [{ from: 'aapp', to: 'aside', label: 'still works' }, { from: 'aside', to: 'bside', label: 'mTLS' }] }
    ]}
  ],
  how: [
    { name: 'The sidecar pattern', text: ['A helper container deployed with each app instance, sharing its network and lifecycle. It adds a capability without touching app code: a proxy, a log shipper, a config reloader. An **ambassador** is a sidecar that proxies the app\'s outbound calls to one remote service, handling retries or auth for it.'] },
    { name: 'Data plane and control plane', text: ['**Data plane**: the proxies that carry every request. **Control plane**: tells them what to do (routes, retry and timeout policy, who may call whom) and issues certificates. The control plane is never on the request path.'],
      code: 'apiVersion: networking.istio.io/v1\nkind: VirtualService\nmetadata: { name: payments }\nspec:\n  hosts: [payments]\n  http:\n  - timeout: 1s\n    retries: { attempts: 2, perTryTimeout: 400ms }\n    route:\n    - destination: { host: payments, subset: v1 }\n      weight: 90\n    - destination: { host: payments, subset: v2 }   # canary\n      weight: 10' },
    { name: 'What moves out of the code', text: ['Service discovery and load balancing, mTLS and service identity, retries, timeouts and circuit breaking, traffic splitting for canaries, and golden-signal metrics and tracing. One policy for every language.'] },
    { name: 'The cost', text: ['Two extra proxy hops per call, CPU and memory for a proxy in every pod, and a complex system to upgrade and debug. Newer **sidecar-less** designs (Istio ambient mode, Cilium with eBPF) move the proxy to the node to cut this cost.'] }
  ],
  compare: { title: 'Where network logic lives', lead: null, head: ['Approach', 'Pros', 'Cons'], rows: [
    ['Library in each service (Resilience4j, gRPC)', 'No extra hop, simple', 'One implementation per language; upgrade means redeploy'],
    ['Sidecar per pod (Istio, Linkerd)', 'Language-agnostic, uniform mTLS and metrics', 'Extra hops, memory per pod, complex to run'],
    ['Node-level proxy / eBPF (ambient, Cilium)', 'Less overhead than sidecars', 'Newer; fewer per-pod L7 features'],
    ['Edge API gateway only', 'Simple', 'Does nothing for service-to-service traffic']
  ]},
  say: [
    'Service-to-service traffic goes through a mesh: sidecars give us mTLS, retry budgets and per-route metrics without touching app code.',
    'The control plane is off the request path; if it fails, sidecars keep their last config.',
    'Canaries are a traffic split in the mesh: 10% to v2, watch the error rate, then shift the rest.'
  ],
  numbers: [
    ['a few ms', 'latency two sidecar hops can add per call at p99'],
    ['50–100 MB', 'memory per sidecar proxy, multiplied by every pod'],
    ['24 h', 'a common lifetime for mesh workload certificates', 'rotated automatically']
  ],
  pitfalls: [
    ['A mesh for five services', 'All the operating cost, little gain. A library is enough.'],
    ['Retries in the app and the mesh', '3 app attempts × 3 mesh attempts = 9 calls. Retry in one layer only.'],
    ['Treating the control plane as critical path', 'It is not. Design for it being briefly down.'],
    ['Ignoring the latency budget', 'Each call passes two proxies; deep call chains add up.'],
    ['Permissive mTLS forever', 'Plain text stays allowed. Switch to strict once migration is done.']
  ],
  seen: [
    ['Istio', 'Envoy sidecars and the istiod control plane; also a sidecar-less ambient mode.'],
    ['Linkerd', 'Lightweight Rust proxies with mTLS on by default.'],
    ['Envoy', 'The proxy under many meshes and gateways, configured through xDS APIs.'],
    ['Lyft', 'Built Envoy to take networking out of services written in many languages.'],
    ['Log-shipping sidecars', 'A Fluent Bit container next to the app: the sidecar pattern without a mesh.']
  ],
  probe: [
    ['Data plane or control plane: which carries requests?', ['The data plane: the proxies. The control plane only configures them and issues certificates; it is not on the request path.']],
    ['How does the mesh add mTLS without app changes?', ['Each workload gets a short-lived certificate tied to its identity. Sidecars do the TLS handshake; the app talks plain HTTP to localhost.']],
    ['Mesh or API gateway?', ['Both, for different traffic: the gateway handles north-south traffic from outside, the mesh handles east-west traffic between services.']],
    ['When is a mesh not worth it?', ['Few services, one language, no strict security requirement. The latency, memory and operational load are real costs.']]
  ],
  checklist: [
    'Explain the sidecar and ambassador patterns.',
    'Draw the data plane and the control plane.',
    'List four things a mesh moves out of app code.',
    'Explain the costs and when to skip a mesh.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-poly', title: 'Many languages', ask: '120 services in Java, Go, Python and Node. Security wants mTLS everywhere; SRE wants the same latency metrics for every call. Best fit?', options: [
        ['A service mesh with sidecar proxies', true, 'One policy and one implementation for every language.'],
        ['A resilience library in each language', false, 'Four implementations to keep in sync.'],
        ['An API gateway', false, 'It only sees traffic from outside.'],
        ['A VPN between hosts', false, 'No per-service identity or per-call metrics.']
      ]},
      { id: 'mcq-retry', title: 'Nine attempts', ask: 'During an outage each call to Payments is attempted up to 9 times, which makes the overload worse. Cause?', options: [
        ['The app retries 3 times and the mesh retries 3 times for each app attempt', true, 'Retries multiply across layers. Keep them in one layer.'],
        ['The mesh has no retry policy', false, 'Then there would be fewer attempts, not more.'],
        ['mTLS handshakes are failing', false, 'That would show as TLS errors, not multiplied calls.'],
        ['The control plane is down', false, 'It does not create extra attempts.']
      ]},
      { id: 'mcq-cp', title: 'Control plane outage', ask: 'The mesh control plane is down for 10 minutes. What happens to traffic between services?', options: [
        ['It keeps flowing with the last config; only config changes and new certificates wait', true, 'The control plane is off the request path.'],
        ['All traffic stops', false, 'Sidecars do not ask the control plane per request.'],
        ['Traffic falls back to plain text', false, 'Existing certificates stay valid.'],
        ['Every sidecar restarts', false, 'They keep running with their current config.']
      ]}
    ],
    order: [
      { id: 'ord-mesh', title: 'Through the mesh', ask: 'Order a request from Orders to Payments in a mesh.', steps: [
        'Orders app sends plain HTTP to localhost',
        'Outbound sidecar picks a healthy Payments instance',
        'Sidecars set up mTLS',
        'Inbound sidecar checks the caller is allowed',
        'Payments app receives the request'
      ], extra: ['Control plane forwards the request body'] }
    ],
    fill: [
      { id: 'fill-mesh', title: 'One sentence', text: 'In a mesh the [[data plane|sidecars|proxies]] carries every request, while the [[control plane]] pushes config and [[certificates|certs]] and stays off the request path.' }
    ]
  }
});
})();
