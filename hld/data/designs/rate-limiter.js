(function(){
var D = { w: 860, h: 360, nodes: [
  { id: 'c', label: 'Clients', kind: 'client', x: 70, y: 170 },
  { id: 'gw', label: 'API gateway', sub: 'limiter middleware', kind: 'lb', x: 260, y: 170, w: 150 },
  { id: 'api', label: 'API servers', kind: 'service', x: 500, y: 80 },
  { id: 'redis', label: 'Redis cluster', sub: 'buckets by key', kind: 'cache', x: 500, y: 270, w: 140 },
  { id: 'rules', label: 'Rules store', sub: 'limits per plan', kind: 'db', x: 730, y: 270, w: 130 },
  { id: 'cfg', label: 'Rules cache', sub: 'in each gateway', kind: 'note', x: 260, y: 300 }
], edges: [['c', 'gw'], ['gw', 'api'], ['gw', 'redis'], ['rules', 'gw', { dash: true, bend: 40 }]] };

registerDesign({
  slug: 'rate-limiter', order: 2, title: 'Rate limiter',
  one: 'Limit each client to N requests per time window across a fleet of servers, ==adding under a millisecond== and never becoming the outage itself.',
  questions: [
    'Limit by what: user, API key, IP, endpoint? Several at once?',
    'Client-side library, a middleware in each service, or a central gateway?',
    'How exact must it be? Is a small overshoot during races OK?',
    'What happens when the limiter\'s store is down: allow or block?',
    'Do different plans have different limits? Can rules change without deploys?'
  ],
  reqs: {
    func: ['Allow or reject each request by rules (e.g. 100/min per API key)', 'Return 429 with Retry-After and limit headers', 'Rules per endpoint and per plan, changeable at runtime'],
    nonfunc: ['Adds < 1 ms p99', 'Works across 100+ gateway servers', 'Highly available: limiter failure must not take the API down', 'Approximately exact (small overshoot OK)'],
    mvp: ['per-key token bucket', 'per-endpoint rules', 'Redis-backed shared state', '429 + headers'],
    later: ['per-tenant quotas per month', 'adaptive limits by server health', 'analytics dashboard of rejections']
  },
  estimate: {
    lead: 'The limiter sees every request, so its cost is per request.',
    assume: ['1M requests/s peak across the API', '10M active API keys', 'each bucket: key + tokens + timestamp ≈ 100 bytes'],
    rows: [
      ['Limiter checks', '1 per request', '**1M ops/s** on the store'],
      ['Memory for buckets', '10M × 100 B', '**~1 GB** (fits easily; TTL idle keys)'],
      ['Redis nodes', '1M ops/s ÷ ~100k per node', '**~10 shards** (+ replicas)'],
      ['Latency budget', 'one Redis round trip', '**~0.5 ms**']
    ],
    so: 'Memory is trivial. The real constraints are ops per second on the shared store and keeping latency tiny.'
  },
  apiLead: 'The limiter is mostly internal. It exposes a decision call and returns headers to clients.',
  api: [
    ['internal', 'allow(key, endpoint) → { allowed, remaining, resetAt }', 'Called by gateway middleware before forwarding.'],
    ['response', '429 Too Many Requests', 'Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.'],
    ['PUT', '/admin/v1/rules/{id}', 'Change a rule; gateways pick it up within seconds.', '{ "match": { "endpoint": "POST /v1/orders", "plan": "free" },\n  "limit": 100, "period": "1m", "burst": 20 }']
  ],
  dataLead: 'Two kinds of data: hot counters (Redis) and slow-changing rules (DB, cached in every gateway).',
  data: [
    { name: 'bucket', store: 'Redis, key = rl:{apiKey}:{endpoint}', cols: [['tokens', 'float', 'Current tokens'], ['last_refill_ms', 'long', 'To compute refill lazily'], ['TTL', 'seconds', 'Idle buckets expire on their own']] },
    { name: 'rules', store: 'SQL, cached in memory', cols: [['id', 'string', 'Rule ID'], ['match', 'json', 'Endpoint, plan, method'], ['limit, period, burst', 'ints', 'Token bucket settings']] }
  ],
  hld: [
    'The limiter runs as **middleware in the API gateway**: every request is checked once at the edge, so services stay simple.',
    'Each check runs one **Lua script** in Redis that refills and takes a token atomically. Keys are sharded across a Redis cluster by key hash.',
    'Rules live in a database and are **cached in every gateway**, refreshed every few seconds, so rule lookups cost nothing per request.',
    'If Redis is unreachable the gateway **fails open** using a local in-memory limiter, except for sensitive endpoints like login, which fail closed.'
  ],
  flows: [
    { name: 'Build it up', title: 'Building a distributed rate limiter', diagram: D, progressive: true, steps: [
      { title: 'Limit inside one server', add: ['c', 'gw', 'api'], text: 'Start simple: an in-memory token bucket per key in the gateway. Works for one gateway server.', on: ['gw'], dots: [{ from: 'c', to: 'gw' }, { from: 'gw', to: 'api', label: 'allowed' }] },
      { title: 'Problem: many gateways', text: 'With 20 gateways, each keeps its own count, so a client gets 20× the limit by spreading requests. The count must be shared.', bad: ['gw'], anno: [{ node: 'gw', text: '20 servers = 20× limit', dy: -54 }] },
      { title: 'Shared counters in Redis', add: ['redis'], text: 'Store buckets in Redis. A Lua script does refill + check + take in one atomic step, so parallel requests cannot both take the last token.', on: ['redis'], dots: [{ from: 'gw', to: 'redis', label: 'EVAL bucket' }, { from: 'redis', to: 'gw', label: 'ok, 7 left', kind: 'res' }] },
      { title: 'Rules without deploys', add: ['rules', 'cfg'], text: 'Limits per plan and endpoint live in a rules store. Gateways cache them and refresh periodically: no per-request lookup.', on: ['rules', 'cfg'], dots: [{ from: 'rules', to: 'gw', label: 'rules v12', kind: 'evt' }] },
      { title: 'Reject politely', text: 'Out of tokens: return 429 with Retry-After and limit headers. The request never reaches the API servers.', on: ['gw'], dots: [{ from: 'c', to: 'gw', label: 'request' }, { from: 'gw', to: 'c', label: '429 Retry-After: 3', kind: 'err' }] },
      { title: 'Redis fails', text: 'The limiter must not become the outage. On Redis errors, fall back to a local per-gateway limit (fail open), but fail closed for login and payment endpoints.', bad: ['redis'], on: ['gw'], set: { gw: { sub: 'local fallback' } } }
    ]},
    { name: 'One request', title: 'Checking a request', diagram: D, steps: [
      { title: 'Request arrives', text: 'API key `k_77`, endpoint `POST /v1/orders`. The gateway finds the matching rule in its cache: free plan, 100/min, burst 20.', on: ['gw', 'cfg'], dots: [{ from: 'c', to: 'gw', label: 'POST /orders' }] },
      { title: 'Atomic check in Redis', text: 'One round trip runs the bucket script for key `rl:k_77:orders`: add tokens for elapsed time, take one if available.', on: ['redis'], dots: [{ from: 'gw', to: 'redis', label: 'EVAL' }, { from: 'redis', to: 'gw', label: 'allowed, 12 left', kind: 'res' }] },
      { title: 'Forward with headers', text: 'Allowed: forward to the API and add `X-RateLimit-Remaining: 12` to the response so the client can pace itself.', on: ['api'], dots: [{ from: 'gw', to: 'api' }, { from: 'api', to: 'gw', kind: 'res' }, { from: 'gw', to: 'c', label: '201 + headers', kind: 'res' }] }
    ]}
  ],
  deep: [
    { name: 'Choosing the algorithm', text: ['Token bucket: allows bursts up to capacity and averages at the refill rate; two numbers per key. Sliding window counter: smoother, close to exact, two counters per key. Fixed windows are cheapest but allow 2× bursts at boundaries. For an API, token bucket is the usual pick.'] },
    { name: 'Atomicity with a Lua script', text: ['GET then SET from the gateway races: two requests read 1 token and both pass. A Lua script runs atomically inside Redis.'],
      code: '-- KEYS[1] bucket key, ARGV: capacity, rate/sec, now_ms\nlocal b = redis.call("HMGET", KEYS[1], "tokens", "ts")\nlocal cap, rate, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])\nlocal tokens = tonumber(b[1]) or cap\nlocal ts = tonumber(b[2]) or now\ntokens = math.min(cap, tokens + (now - ts) / 1000 * rate)\nlocal ok = tokens >= 1\nif ok then tokens = tokens - 1 end\nredis.call("HSET", KEYS[1], "tokens", tokens, "ts", now)\nredis.call("EXPIRE", KEYS[1], 120)\nreturn ok and 1 or 0' },
    { name: 'Very high scale: local + global', text: ['At millions of checks per second, each gateway can keep local counters and sync deltas to Redis every ~100 ms. Limits become slightly approximate (a small overshoot), but Redis load drops by orders of magnitude.'] },
    { name: 'Fail open or closed', text: ['Most endpoints fail open: better to serve slightly over limit than to reject everyone. Login, signup and payment fail closed, because abuse there is costly. Make this a per-rule setting.'] }
  ],
  bottlenecks: [
    ['Redis ops per second', 'Shard Redis by key; batch with local counters for extreme scale.'],
    ['Hot key (one huge customer)', 'Local pre-aggregation in each gateway before syncing.'],
    ['Rule lookups per request', 'Cache rules in each gateway, refresh every few seconds.'],
    ['Redis outage', 'Local fallback limiter; fail open except on sensitive endpoints.'],
    ['Clock differences between gateways', 'Use Redis server time inside the script, not each gateway\'s clock.']
  ],
  tradeoffs: [
    ['Where to run', 'API gateway middleware', 'One place, services stay simple', 'Gateway must be fast and HA'],
    ['Algorithm', 'Token bucket', 'Bursts allowed, cheap state', 'Not exact per sliding minute'],
    ['State', 'Central Redis + Lua', 'Shared, atomic, simple', 'Extra ~0.5 ms and a dependency'],
    ['On store failure', 'Fail open (most rules)', 'Limiter never causes an outage', 'Brief over-limit traffic']
  ],
  probe: [
    ['Why not count in each server\'s memory?', ['With N servers, a client gets up to N× the limit. Local counters only work with sticky routing per key, which is fragile.']],
    ['How do you avoid race conditions?', ['Do the read-modify-write atomically in Redis with a Lua script (or INCR + EXPIRE for fixed windows).']],
    ['How do you limit across regions?', ['Usually limit per region (simpler, low latency), or sync counters asynchronously between regions and accept small overshoot.']],
    ['How do clients know to slow down?', ['429 plus Retry-After and X-RateLimit headers; well-behaved SDKs back off automatically.']]
  ],
  say: [
    'The limiter is middleware in the gateway, using a token bucket per API key and endpoint.',
    'Buckets live in a sharded Redis cluster, updated atomically by one Lua script per request.',
    'Rules are cached in each gateway, so the only per-request cost is one Redis round trip.',
    'If Redis fails we fail open with a local limiter, except for login and payments.'
  ],
  numbers: [['1M ops/s', 'checks at peak'], ['~1 GB', 'all buckets'], ['~10', 'Redis shards'], ['< 1 ms', 'added latency']],
  checklist: ['Explain why per-server counters fail.', 'Write the token bucket logic.', 'Explain atomicity with Lua.', 'Decide fail-open vs fail-closed per endpoint.'],
  drills: {
    mcq: [
      { id: 'mcq-where', title: 'Where to enforce', ask: '30 microservices each want rate limiting. Simplest consistent place?', options: [
        ['At the API gateway, before requests reach services', true, 'One implementation, enforced once at the edge.'],
        ['A copy of the logic inside every service', false, 'Thirty implementations that drift apart.'],
        ['In the database', false, 'Too late and too expensive.'],
        ['In the mobile app', false, 'Clients can be modified; never trust them for limits.']
      ]},
      { id: 'mcq-down', title: 'Redis down', ask: 'Redis for the limiter is unreachable. What should a normal read endpoint do?', options: [
        ['Fail open with a local fallback limit', true, 'The API stays up; slight over-limit traffic is acceptable.'],
        ['Reject all requests', false, 'The limiter would cause a full outage.'],
        ['Crash the gateway', false, 'Worse.'],
        ['Wait for Redis indefinitely', false, 'Requests hang.']
      ]}
    ],
    order: [
      { id: 'ord-req', title: 'Request path', ask: 'Order the steps for one request.', steps: ['Gateway receives the request', 'Find the matching rule in the local rules cache', 'Run the atomic bucket script in Redis', 'Forward if allowed, else return 429 with Retry-After', 'Add rate-limit headers to the response'], extra: ['Read the rules table from the database for every request'] }
    ],
    fill: [
      { id: 'fill-rl', title: 'Pitch', text: 'I use a [[token bucket|token-bucket]] per API key stored in [[redis]], updated by an atomic [[lua|lua script]] script at the gateway.' }
    ],
    palette: { id: 'pal-rl', title: 'Build the board', ask: 'Pick what a distributed rate limiter needs.', reqs: ['100+ gateway servers share one limit per key', '< 1 ms added latency', 'Rules change without deploys'], parts: [
      ['API gateway middleware', 'must', 'Every request is checked once at the edge.'],
      ['Shared counter store (Redis)', 'must', 'All gateways see the same counts.'],
      ['Atomic check-and-update (Lua)', 'must', 'Prevents races between parallel requests.'],
      ['Rules store + local cache', 'must', 'Runtime rule changes without per-request lookups.'],
      ['Local fallback limiter', 'good', 'Keeps working if Redis is down.'],
      ['Kafka between gateway and Redis', 'no', 'Adds latency; the decision must be synchronous.'],
      ['Relational DB for counters', 'no', 'Too slow for 1M checks/s.'],
      ['CDN', 'no', 'Does not track per-key API counters.']
    ]}
  }
});
})();
