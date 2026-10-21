(function(){
var cb = { w: 840, h: 300, nodes: [
  { id: 'u', label: 'Users', kind: 'client', x: 80, y: 150 },
  { id: 'a', label: 'Checkout', sub: 'breaker: closed', kind: 'service', x: 320, y: 150, w: 140 },
  { id: 'p', label: 'Recommendations', sub: 'healthy', kind: 'service', x: 620, y: 70, w: 150 },
  { id: 'fb', label: 'Fallback', sub: 'cached top items', kind: 'cache', x: 620, y: 240, w: 140 }
], edges: [['u', 'a'], ['a', 'p'], ['a', 'fb', { dash: true }]] };

registerConcept({
  slug: 'reliability', order: 18, title: 'Reliability patterns',
  one: 'Every call can be slow or fail. ==Timeouts, retries with backoff, circuit breakers and bulkheads== stop one sick dependency from taking everything down.',
  picture: [
    'A house has fuses: when one appliance shorts, its fuse blows and the rest of the house keeps power. Without fuses, one toaster could burn the house down.',
    'In a distributed system the "short" is a slow dependency. Callers wait, threads pile up, and the caller dies too: a **cascading failure**. Reliability patterns are the fuses.'
  ],
  use: ['every network call between services', 'calls to third-party APIs', 'anything on the critical path of a user request'],
  avoid: ['retrying non-idempotent writes without idempotency keys', 'retrying at every layer (retry storms)'],
  flows: [
    { name: 'Circuit breaker', title: 'Cutting off a failing dependency', diagram: cb, steps: [
      { title: 'Normal: breaker closed', text: 'Checkout calls the recommendations service with a 200 ms **timeout**. All good.', on: ['a', 'p'], dots: [{ from: 'u', to: 'a' }, { from: 'a', to: 'p', label: 'GET recs' }, { from: 'p', to: 'a', label: '40 ms', kind: 'res' }] },
      { title: 'Dependency gets slow', text: 'Recommendations starts timing out. Each checkout now waits the full timeout, and threads pile up.', bad: ['p'], set: { p: { sub: 'timeouts 60%' } }, dots: [{ from: 'a', to: 'p', label: 'GET recs' }, { from: 'p', to: 'a', label: 'timeout', kind: 'err' }] },
      { title: 'Breaker opens', text: 'After the failure rate passes a threshold (say 50% over 20 calls), the breaker **opens**: calls fail immediately without touching the sick service.', bad: ['p'], on: ['a'], set: { a: { sub: 'breaker: OPEN' }, p: { sub: 'timeouts 60%' } }, badEdges: ['a-p'] },
      { title: 'Fall back gracefully', text: 'Instead of an error, checkout shows cached "popular items". Users can still pay; the page is just less personal.', on: ['fb'], set: { a: { sub: 'breaker: OPEN' } }, dots: [{ from: 'a', to: 'fb', label: 'fallback', kind: 'res' }] },
      { title: 'Half-open: test the water', text: 'After a cool-down, a few trial calls are let through. If they succeed, the breaker closes again; if not, it stays open.', on: ['p'], set: { a: { sub: 'breaker: half-open' }, p: { sub: 'recovering' } }, dots: [{ from: 'a', to: 'p', label: 'trial call' }, { from: 'p', to: 'a', label: 'ok', kind: 'res' }] }
    ]}
  ],
  how: [
    { name: 'Timeouts', text: ['Every network call needs a timeout, set from the dependency\'s normal p99 plus margin, and within the caller\'s own deadline. No timeout means one hung dependency can hold your threads forever.'] },
    { name: 'Retries with exponential backoff and jitter', text: ['Retry only transient failures (timeouts, 503) and only idempotent operations. Wait longer each time (100 ms, 200, 400…) and add randomness so thousands of clients do not retry in sync. Cap attempts, and retry at one layer only.'],
      code: 'for (int attempt = 0; attempt < 4; attempt++) {\n    try { return call(); }\n    catch (TransientException e) {\n        long base = 100L << attempt;                         // 100, 200, 400, 800 ms\n        Thread.sleep(ThreadLocalRandom.current().nextLong(base));  // full jitter\n    }\n}\nthrow new UnavailableException();' },
    { name: 'Circuit breaker', text: ['Closed (normal) → Open (fail fast after too many failures) → Half-open (trial requests) → Closed. Protects the caller\'s resources and gives the dependency room to recover. Pair with a fallback.'] },
    { name: 'Bulkheads', text: ['Separate thread pools or connection pools per dependency, like watertight compartments in a ship. If the recommendations pool is exhausted, payment calls still have their own pool.'] },
    { name: 'Graceful degradation and load shedding', text: ['Decide in advance what can be turned off: recommendations, reviews, analytics. Under overload, reject low-priority requests early (`503`) to keep the important ones fast. Better a smaller product than a dead one.'] }
  ],
  compare: { title: 'Which pattern solves what', lead: null, head: ['Pattern', 'Protects against', 'Without it'], rows: [
    ['Timeout', 'Hung calls', 'Threads blocked forever'],
    ['Retry + backoff + jitter', 'Brief, transient failures', 'Users see errors for blips'],
    ['Circuit breaker', 'A dependency that is down or very slow', 'Cascading failure; wasted calls'],
    ['Bulkhead', 'One dependency using all resources', 'Unrelated features fail too'],
    ['Fallback / degradation', 'Missing non-critical data', 'Whole page fails for one widget'],
    ['Load shedding', 'Overload beyond capacity', 'Everyone gets slow, then everything fails']
  ]},
  say: [
    'Every outbound call has a timeout based on the dependency\'s p99, and retries use exponential backoff with jitter, max three.',
    'Calls to recommendations sit behind a circuit breaker with a cached fallback, so checkout never waits on them.',
    'Each dependency has its own connection pool as a bulkhead.',
    'Under overload we shed low-priority traffic first so checkout stays fast.'
  ],
  numbers: [
    ['3', 'a typical max retry count'],
    ['2×', 'backoff growth per attempt'],
    ['50% / 20 calls', 'example breaker threshold'],
    ['10–30 s', 'example breaker cool-down before half-open']
  ],
  pitfalls: [
    ['No timeouts', 'Default timeouts can be minutes or infinite.'],
    ['Retry storms', 'Retries at every layer multiply: 3 layers × 3 retries = 27 calls per user request.'],
    ['Retrying non-idempotent calls', 'Double payments. Use idempotency keys or do not retry.'],
    ['Retrying without jitter', 'All clients retry at the same moment and knock the service down again.'],
    ['Fallbacks never tested', 'The fallback path breaks exactly when you need it. Test it, e.g. with chaos experiments.']
  ],
  seen: [
    ['Netflix Hystrix', 'Popularized circuit breakers, bulkheads and fallbacks; now Resilience4j in Java.'],
    ['AWS SDKs', 'Built-in exponential backoff with jitter for retries.'],
    ['Envoy / Istio', 'Timeouts, retries, outlier detection (ejecting bad hosts) at the proxy level.'],
    ['Netflix Chaos Monkey', 'Kills instances in production to prove the system survives.']
  ],
  probe: [
    ['How do you stop one slow service from taking down others?', ['Timeouts on every call, a circuit breaker per dependency, bulkhead pools, and fallbacks. Together they turn a slow dependency into a degraded feature instead of an outage.']],
    ['When should you not retry?', ['Non-transient errors (400, 403), non-idempotent operations without idempotency keys, or when the downstream is overloaded (retries make it worse; the breaker should open).']],
    ['Why add jitter?', ['Without randomness, all clients retry at the same instants, causing synchronized spikes that keep the service down.']],
    ['What is graceful degradation here?', ['Name the features you can drop. For example, a product page without reviews or recommendations still sells.']]
  ],
  checklist: [
    'Explain a cascading failure.',
    'Explain retries with exponential backoff and jitter, and when not to retry.',
    'Draw the circuit breaker states.',
    'Explain bulkheads and graceful degradation.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-cascade', title: 'Cascading failure', ask: 'A slow reviews service made the whole product page time out. Which change stops this?', options: [
        ['Timeout + circuit breaker on the reviews call, with the page rendering without reviews', true, 'The page degrades instead of failing.'],
        ['Retry reviews 10 times', false, 'More waiting and more load on a struggling service.'],
        ['Increase the timeout to 30 s', false, 'Makes every page slower.'],
        ['Add more product page servers', false, 'They would all wait on reviews too.']
      ]},
      { id: 'mcq-storm', title: 'Retry storm', ask: 'After a 10-second blip, a service stays down for 20 minutes. Clients retry every 100 ms without limits. Fix?', options: [
        ['Exponential backoff with jitter and a retry cap', true, 'Spreads retries out so the service can recover.'],
        ['Retry faster', false, 'Adds load to a recovering service.'],
        ['Remove timeouts', false, 'Threads pile up instead.'],
        ['Disable health checks', false, 'Unrelated.']
      ]},
      { id: 'mcq-idem', title: 'Retry safely', ask: 'A "charge card" call times out. Safe to retry?', options: [
        ['Only with an idempotency key, so the provider dedupes', true, 'The first call may have succeeded; the key prevents a double charge.'],
        ['Yes, always', false, 'Could charge twice.'],
        ['Never, show an error', false, 'Idempotency keys make it safe.'],
        ['Yes, after 1 ms', false, 'Timing does not fix double charging.']
      ]}
    ],
    order: [
      { id: 'ord-breaker', title: 'Breaker states', ask: 'Order a circuit breaker\'s cycle after a dependency fails.', steps: ['Closed: calls pass through', 'Failures pass the threshold', 'Open: calls fail fast and use the fallback', 'Cool-down ends: half-open, a few trial calls', 'Trials succeed: closed again'], extra: ['Open: retry each call five times'] }
    ],
    fill: [
      { id: 'fill-retry', title: 'Retry rule', text: 'Retry only [[idempotent]] calls, with exponential [[backoff|back-off]] and [[jitter|randomness]], and cap the attempts.' }
    ]
  }
});
})();
