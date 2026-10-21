(function(){
var tb = { w: 820, h: 300, nodes: [
  { id: 'u', label: 'Client', sub: 'user 42', kind: 'client', x: 80, y: 150 },
  { id: 'rl', label: 'Rate limiter', sub: 'at the gateway', kind: 'lb', x: 290, y: 150, w: 140 },
  { id: 'b', label: 'Bucket user:42', sub: 'tokens 5 / 5', kind: 'blob', x: 290, y: 40, w: 160, h: 50 },
  { id: 'r', label: 'Redis', sub: 'shared counters', kind: 'cache', x: 520, y: 260 },
  { id: 'api', label: 'API servers', kind: 'service', x: 640, y: 150 },
  { id: 'refill', label: 'refill 1 token / s', kind: 'note', x: 520, y: 40 }
], edges: [['u', 'rl'], ['rl', 'api'], ['rl', 'b', { arrow: false, dash: true }], ['rl', 'r']] };

registerConcept({
  slug: 'rate-limiting', order: 12, title: 'Rate limiting',
  one: 'Cap how many requests a client may make in a time window, so ==one noisy user or bot cannot take the service down== for everyone else.',
  picture: [
    'A bouncer lets in a few people per minute. If a crowd arrives, the first ones go in, the rest wait or come back later. The club never gets so full that nobody can move.',
    'The classic algorithm is the **token bucket**: each user has a bucket that refills at a fixed rate up to a maximum. A request takes a token; no token, the request gets `429 Too Many Requests`. The maximum lets short bursts through; the refill rate sets the average.'
  ],
  use: ['public APIs and login endpoints', 'protecting expensive operations', 'fair sharing between tenants', 'stopping abuse, scraping, brute force'],
  avoid: ['internal calls where backpressure or queues fit better', 'as the only defence against large DDoS (use edge/CDN protection too)'],
  flows: [
    { name: 'Token bucket', title: 'Token bucket: bursts allowed, average capped', diagram: tb, steps: [
      { title: 'Full bucket', text: 'User 42 has a bucket of capacity 5 that refills 1 token per second. It is full.', on: ['b'], set: { b: { sub: 'tokens 5 / 5' } } },
      { title: 'A burst of 3 requests', text: 'Each request takes a token and is forwarded. Bursts up to the capacity are fine.', on: ['rl', 'api'], dots: [{ from: 'u', to: 'rl', label: '×3' }, { from: 'rl', to: 'api', label: 'allowed', kind: 'res' }], set: { b: { sub: 'tokens 2 / 5' } } },
      { title: 'Bucket empty', text: 'Two more requests use the last tokens. The next one finds 0 tokens: rejected with `429` and a `Retry-After` header.', bad: ['rl'], dots: [{ from: 'u', to: 'rl', label: 'request 6' }, { from: 'rl', to: 'u', label: '429 Retry-After: 1', kind: 'err' }], set: { b: { sub: 'tokens 0 / 5' } } },
      { title: 'Refill over time', text: 'One second later there is 1 token again. The user can sustain 1 request/second on average. You do not need a timer: on each request compute tokens += elapsed × rate.', on: ['b', 'refill'], set: { b: { sub: 'tokens 1 / 5' } } },
      { title: 'Many servers, one limit', text: 'With 20 gateway servers, each must see the same count. Keep buckets in Redis and update them atomically with a Lua script, so the check and the decrement happen together.', on: ['r'], dots: [{ from: 'rl', to: 'r', label: 'EVAL take_token' }, { from: 'r', to: 'rl', label: 'ok, 0 left', kind: 'res' }] }
    ]}
  ],
  how: [
    { name: 'Algorithms', text: [
      '**Token bucket:** refill at rate r up to capacity b; allows bursts. Most common. **Leaky bucket:** requests queue and leave at a fixed rate; smooths traffic, no bursts. **Fixed window counter:** count per minute; simple but allows 2× at window edges. **Sliding window log:** store each timestamp; exact but memory-heavy. **Sliding window counter:** blend current and previous window counts; good accuracy, little memory.'
    ], code: 'boolean allow(Bucket b, long nowMs) {\n    double refill = (nowMs - b.lastMs) / 1000.0 * RATE_PER_SEC;\n    b.tokens = Math.min(CAPACITY, b.tokens + refill);\n    b.lastMs = nowMs;\n    if (b.tokens < 1) return false;   // 429\n    b.tokens -= 1;\n    return true;\n}' },
    { name: 'What to limit on', text: ['User ID or API key for logged-in traffic, IP for anonymous traffic (careful with shared IPs behind NAT), and endpoint (stricter for login, search, expensive writes). Often several limits at once: per user, per tenant, global.'] },
    { name: 'Where to put it', text: ['At the edge (CDN/WAF) for crude abuse, at the API gateway for per-user limits, and inside services for protecting a specific dependency. The gateway is the usual interview answer.'] },
    { name: 'Distributed counters', text: ['Shared state in Redis keeps all servers consistent; use atomic operations (`INCR` with `EXPIRE`, or a Lua script) to avoid race conditions. For extreme scale, keep local counters and sync periodically: slightly less exact, much less traffic to Redis.'] },
    { name: 'Telling the client', text: ['Return `429 Too Many Requests` with `Retry-After`, and headers like `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` so good clients can slow down on their own.'] }
  ],
  compare: { title: 'Algorithms compared', lead: null, head: ['Algorithm', 'Bursts', 'Accuracy', 'Memory per key'], rows: [
    ['Token bucket', 'Yes, up to capacity', 'Good', '2 numbers'],
    ['Leaky bucket', 'No, smoothed out', 'Good', 'Queue or 2 numbers'],
    ['Fixed window', 'Up to 2× at edges', 'Rough', '1 counter'],
    ['Sliding window log', 'No', 'Exact', 'One timestamp per request'],
    ['Sliding window counter', 'Small', 'Close', '2 counters']
  ]},
  say: [
    'I\'ll rate limit at the API gateway with a token bucket per API key: 100 requests per minute with bursts of 20.',
    'Buckets live in Redis and are updated by one atomic Lua script, so all gateway servers share the limit.',
    'Rejected calls get 429 with a Retry-After header so well-behaved clients back off.',
    'If Redis is unreachable we fail open for normal endpoints but fail closed for login.'
  ],
  numbers: [
    ['429', 'HTTP status: Too Many Requests'],
    ['~0.5 ms', 'Redis round trip added per request'],
    ['2×', 'worst-case burst with a fixed window at the boundary'],
    ['5–10/min', 'typical login attempt limit per account']
  ],
  pitfalls: [
    ['Race conditions', 'Read count, check, then write in separate calls lets parallel requests slip through. Make it one atomic operation.'],
    ['Limiting only by IP', 'Offices and mobile carriers share IPs; you block real users while attackers rotate IPs.'],
    ['Fixed windows for strict limits', 'A user can send the full limit at 0:59 and again at 1:00.'],
    ['No plan when Redis is down', 'Decide fail-open vs fail-closed per endpoint ahead of time.'],
    ['Silent rejection', 'Without 429 and Retry-After, clients retry harder and make it worse.']
  ],
  seen: [
    ['Stripe', 'Token-bucket request limits plus concurrency limiters and load shedders for critical traffic.'],
    ['GitHub API', 'Hourly limits per token with X-RateLimit headers.'],
    ['Cloudflare', 'Edge rate limiting rules by IP, path and headers.'],
    ['Envoy / NGINX', 'Built-in local and global (Redis-backed) rate limit filters.']
  ],
  probe: [
    ['How do you rate limit across 50 servers?', ['Central counters in Redis, updated atomically (Lua script or INCR+EXPIRE). For huge scale, shard the Redis keys by user and accept slightly approximate limits with local counters synced every few hundred ms.']],
    ['Token bucket or sliding window?', ['Token bucket when short bursts are fine (most APIs). Sliding window when you need a precise "no more than N in any 60 seconds", e.g. compliance or SMS sending.']],
    ['What if the rate limiter itself fails?', ['It must not take the API down. Fail open with local fallback limits for normal traffic; fail closed for sensitive endpoints like login or payments.']],
    ['How do you handle different plans (free vs paid)?', ['Look up the limit by API key\'s plan (cached), and keep separate buckets per key. Paid tiers get bigger capacity and refill rates.']]
  ],
  checklist: [
    'Explain the token bucket with capacity and refill rate.',
    'Compare fixed window and sliding window.',
    'Explain how to share limits across many servers.',
    'Say what the client receives when limited.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-burst', title: 'Allow bursts', ask: 'An API should allow short bursts of 20 requests but average no more than 5/s. Algorithm?', options: [
        ['Token bucket with capacity 20, refill 5/s', true, 'Capacity sets the burst, refill sets the average.'],
        ['Fixed window of 5 per second', false, 'Blocks the burst of 20.'],
        ['Leaky bucket', false, 'Smooths traffic and does not allow bursts.'],
        ['No limiter, autoscale instead', false, 'Does not stop abuse or protect dependencies.']
      ]},
      { id: 'mcq-race', title: 'Limit exceeded', ask: 'Limit is 100/min, but a client gets 160 through by sending many parallel requests. Code does GET count, compare, SET count+1. Fix?', options: [
        ['Make check-and-increment atomic (INCR or a Lua script)', true, 'Parallel requests all read the same old count in the current code.'],
        ['Use a bigger Redis', false, 'Speed is not the problem; atomicity is.'],
        ['Switch to IP-based limits', false, 'Same race, different key.'],
        ['Lower the limit to 60', false, 'Still racy.']
      ]},
      { id: 'mcq-status', title: 'Response', ask: 'What should a limited request return?', options: [
        ['429 Too Many Requests with Retry-After', true, 'Standard and tells clients when to try again.'],
        ['500 Internal Server Error', false, 'Signals a bug, and clients may retry immediately.'],
        ['200 with an empty body', false, 'Hides the problem and confuses clients.'],
        ['404 Not Found', false, 'Wrong meaning.']
      ]}
    ],
    order: [
      { id: 'ord-bucket', title: 'Token bucket check', ask: 'Order the steps of one token-bucket decision.', steps: [
        'Load the bucket\'s tokens and last refill time',
        'Add tokens for the elapsed time, up to capacity',
        'If fewer than 1 token, reject with 429',
        'Otherwise take 1 token, save, and allow the request'
      ], extra: ['Reset the bucket to full on every request'] }
    ],
    fill: [
      { id: 'fill-tb', title: 'Bucket settings', text: 'In a token bucket, the [[capacity|bucket size|size]] sets the largest burst and the [[refill rate|rate]] sets the average.' }
    ]
  }
});
})();
