(function(){
var D = {
  w: 880, h: 380,
  nodes: [
    { id: 'client', label: 'Client', sub: 'browser / app', kind: 'client', x: 70, y: 180 },
    { id: 'lb', label: 'Load balancer', kind: 'lb', x: 222, y: 180, w: 128 },
    { id: 'api', label: 'App servers', sub: 'stateless', kind: 'service', x: 395, y: 180, w: 126 },
    { id: 'idgen', label: 'ID ranges', sub: 'hands out 1,000 IDs', kind: 'service', x: 395, y: 325, w: 148 },
    { id: 'cache', label: 'Redis', sub: 'code → URL', kind: 'cache', x: 605, y: 70 },
    { id: 'db', label: 'Key-value DB', sub: 'code → long URL', kind: 'db', x: 605, y: 300, w: 140, h: 64 },
    { id: 'queue', label: 'Kafka', sub: 'click events', kind: 'queue', x: 800, y: 180 },
    { id: 'worker', label: 'Analytics', sub: 'counts per day', kind: 'worker', x: 800, y: 315 }
  ],
  edges: [['client', 'lb'], ['lb', 'api'], ['client', 'api', { unless: 'lb' }], ['api', 'idgen'], ['api', 'cache'], ['api', 'db'], ['api', 'queue'], ['queue', 'worker']]
};
var build = [
  { title: 'Start simple', add: ['client', 'api', 'db'], on: ['api', 'db'], text: 'One app server and one database. Say this out loud first: it works for a demo, and every next box will fix one named problem.', dots: [{ from: 'client', to: 'api', label: 'POST /links' }, { from: 'api', to: 'db', label: 'save' }] },
  { title: 'Unique short codes', add: ['idgen'], on: ['idgen'], text: '**Problem:** two servers must never hand out the same code. **Fix:** a small service gives each app server a block of 1,000 numeric IDs. The server turns its next ID into base62 (`41507` → `aNt`) with no network call per link.', dots: [{ from: 'api', to: 'idgen', label: 'next block?' }, { from: 'idgen', to: 'api', label: '41000–41999', kind: 'res' }] },
  { title: 'Scale out the app tier', add: ['lb'], on: ['lb', 'api'], text: '**Problem:** one server cannot take 10k redirects per second and is a single point of failure. **Fix:** many stateless app servers behind a load balancer. Stateless means any server can serve any request.', dots: [{ from: 'client', to: 'lb', label: 'GET /aNt' }, { from: 'lb', to: 'api' }] },
  { title: 'Cache the hot links', add: ['cache'], on: ['cache'], text: '**Problem:** reads are 100× writes and a few links get most clicks. **Fix:** cache-aside Redis in front of the DB. With a 90%+ hit rate the DB sees a tenth of the reads.', dots: [{ from: 'api', to: 'cache', label: 'GET aNt' }, { from: 'cache', to: 'api', label: 'hit', kind: 'res' }] },
  { title: 'Analytics off the hot path', add: ['queue', 'worker'], on: ['queue', 'worker'], text: '**Problem:** counting clicks inside the redirect adds latency and DB writes. **Fix:** publish a click event to Kafka and return the redirect at once. A worker aggregates counts in batches.', dots: [{ from: 'api', to: 'queue', label: 'click(aNt)', kind: 'evt' }, { from: 'queue', to: 'worker', kind: 'evt' }] },
  { title: 'The whole board', on: ['lb', 'api', 'cache', 'db'], text: 'Redirect path: LB → app → Redis (DB on a miss) → 302. Create path: LB → app → ID block → DB. Clicks flow to analytics without slowing anyone down.' }
];
registerDesign({
  slug: 'url-shortener', order: 1, title: 'URL shortener',
  one: 'Turn a long link into a 7-character code and redirect anyone who opens it. A small system that is ==read-heavy, key-value shaped and easy to get wrong in the details==.',
  questions: [
    'How many new links per month, and how many redirects? (sets read/write ratio)',
    'Can users pick a custom alias? Do links expire?',
    'Do we need click analytics? Real-time or daily?',
    'Is it OK for the code to be guessable, or must it look random?',
    'Can a link be edited or deleted after creation?'
  ],
  reqs: {
    func: ['Create a short link for a long URL', 'Redirect `GET /{code}` to the long URL', 'Optional custom alias and expiry date', 'Basic click counts per link'],
    nonfunc: ['Redirect p99 under 50 ms', '99.99% available for redirects (a dead link is a broken product)', 'Codes never collide', 'Scale to billions of links'],
    mvp: ['create', 'redirect', 'custom alias', 'expiry', 'daily click counts'],
    later: ['user accounts and dashboards', 'link editing', 'real-time analytics', 'spam / malware scanning']
  },
  estimate: {
    lead: 'Round hard. The goal is the order of magnitude, said out loud in under two minutes.',
    assume: ['100 million new links per month', '100 redirects per new link (100:1 read-heavy)', 'about 500 bytes per stored link', 'keep links for 5 years'],
    rows: [
      ['Writes per second', '100M ÷ 2.6M s per month', '**~40/s**, peak ~100/s'],
      ['Reads per second', '40 × 100', '**~4,000/s**, peak ~10k/s'],
      ['Links after 5 years', '100M × 12 × 5', '**6 billion**'],
      ['Storage', '6B × 500 B', '**~3 TB** (fits a sharded KV store easily)'],
      ['Code length', '62⁷ ≈ 3.5 trillion ≫ 6B', '**7 base62 chars**'],
      ['Cache size', '20% of daily redirects: 0.2 × 350M × 500 B', '**~35 GB** (a few Redis nodes)']
    ],
    so: 'So: writes are tiny, reads are moderate, storage is small. The hard parts are unique codes, low-latency redirects and staying up. Not raw scale.'
  },
  apiLead: 'Three endpoints cover the MVP. Version the API from day one.',
  api: [
    ['POST', '/api/v1/links', 'Create a link. Returns `201` with the short URL. `409` if a custom alias is taken.', '{\n  "longUrl": "https://example.com/some/very/long/path?x=1",\n  "customAlias": "spring-sale",   // optional\n  "expiresAt": "2027-01-01"        // optional\n}\n→ 201 { "shortUrl": "https://sho.rt/spring-sale" }'],
    ['GET', '/{code}', 'Redirect. Returns `302 Found` with `Location: <long URL>`, or `404` if unknown or expired.'],
    ['GET', '/api/v1/links/{code}/stats', 'Click counts per day for the link owner.']
  ],
  dataLead: 'Access is "give me the URL for this code": one key, no joins. That points to a key-value store.',
  data: [
    { name: 'links', store: 'DynamoDB / Cassandra (key-value)', cols: [
      ['code', 'string, partition key', 'Lookup key for every redirect'],
      ['long_url', 'string', 'Where to redirect'],
      ['created_at', 'timestamp', 'Auditing, cleanup'],
      ['expires_at', 'timestamp, nullable', 'Redirect returns 404 after this'],
      ['owner_id', 'string, nullable', 'Who can see stats or delete']
    ], why: 'Partitioning by `code` spreads load evenly because codes are spread evenly. A relational DB also works at this size; say why you would or would not need it.' },
    { name: 'click_counts', store: 'analytics store (ClickHouse, or a table updated in batches)', cols: [
      ['code', 'string', 'Which link'],
      ['day', 'date', 'Bucket'],
      ['clicks', 'long', 'Summed by the analytics worker']
    ]}
  ],
  hld: [
    '**Create:** the client calls the load balancer, which picks any app server. The server takes the next ID from its local block (refilled from the ID-range service every 1,000 links), encodes it in base62, and writes `code → long URL` to the key-value store with "insert only if absent".',
    '**Redirect:** the server looks up the code in Redis. On a miss it reads the DB and fills Redis. It answers `302` with the long URL and sends a click event to Kafka without waiting for it.',
    '**Analytics:** a worker reads click events in batches and adds them to daily counters. Redirects never wait for analytics.'
  ],
  flows: [
    { name: 'Build it up', title: 'Building the URL shortener, one problem at a time', diagram: D, progressive: true, steps: build },
    { name: 'Create a link', title: 'Write path: create a short link', diagram: D, steps: [
      { title: 'Client sends the long URL', text: '`POST /api/v1/links` with the long URL. The load balancer picks any healthy app server.', on: ['client', 'lb'], dots: [{ from: 'client', to: 'lb', label: 'POST /links' }, { from: 'lb', to: 'api' }] },
      { title: 'Take the next ID locally', text: 'The server has a block of IDs in memory, for example 41,000–41,999. It takes `41,507`. Only when the block runs out does it call the ID-range service.', on: ['api', 'idgen'], dots: [{ from: 'api', to: 'idgen', label: 'only every 1,000 links', kind: 'evt' }], anno: [{ node: 'api', text: 'id = 41507', dy: -52 }] },
      { title: 'Encode in base62', text: 'Base62 uses `0-9a-zA-Z`. ID 41,507 becomes `aNt` (padded to 7 chars in practice). Short, URL-safe, and unique because the ID is unique.', on: ['api'], anno: [{ node: 'api', text: '41507 → "aNt"', dy: -52 }] },
      { title: 'Store with "insert if absent"', text: 'Write `aNt → long URL` using a conditional put. For generated codes it always succeeds; for **custom aliases** it is what stops two users from claiming the same name.', on: ['db'], dots: [{ from: 'api', to: 'db', label: 'PUT if absent' }, { from: 'db', to: 'api', label: 'ok', kind: 'res' }] },
      { title: 'Return the short URL', text: '`201 Created` with `https://sho.rt/aNt`. No cache write needed: the first redirect will fill the cache.', on: ['client'], dots: [{ from: 'api', to: 'lb', label: '201', kind: 'res' }, { from: 'lb', to: 'client', kind: 'res' }] }
    ]},
    { name: 'Open a link', title: 'Read path: redirect', diagram: D, steps: [
      { title: 'Someone opens the link', text: '`GET /aNt`. This is the path that must be fast and always up.', on: ['client', 'lb'], dots: [{ from: 'client', to: 'lb', label: 'GET /aNt' }, { from: 'lb', to: 'api' }] },
      { title: 'Check Redis', text: 'Most popular links are already cached. A hit costs under a millisecond.', on: ['cache'], dots: [{ from: 'api', to: 'cache', label: 'GET aNt' }, { from: 'cache', to: 'api', label: 'miss', kind: 'err' }], anno: [{ node: 'cache', text: 'miss this time', dx: 118, dy: 5 }] },
      { title: 'Miss: read the DB, fill the cache', text: 'Look up `aNt` in the key-value store by partition key, then cache it with a TTL. Check `expires_at` here: expired means `404`.', on: ['db', 'cache'], dots: [{ from: 'api', to: 'db', label: 'get aNt' }, { from: 'db', to: 'api', label: 'long URL', kind: 'res' }, { from: 'api', to: 'cache', label: 'SET, TTL 1 day', kind: 'evt' }] },
      { title: 'Redirect with 302', text: '`302 Found` + `Location` header. 302 means "temporary", so the browser asks us again next time and we can count every click. (301 would let browsers skip us.)', on: ['client'], dots: [{ from: 'api', to: 'lb', label: '302 Location', kind: 'res' }, { from: 'lb', to: 'client', kind: 'res' }] },
      { title: 'Count the click later', text: 'In parallel the server drops a tiny event on Kafka. The worker sums clicks per link per day. If analytics is down, redirects still work.', on: ['queue', 'worker'], dots: [{ from: 'api', to: 'queue', label: 'click(aNt)', kind: 'evt' }, { from: 'queue', to: 'worker', label: 'batch', kind: 'evt' }] }
    ]}
  ],
  deep: [
    { name: 'How to generate short codes', text: [
      '**Hash the URL** (MD5, take 7 chars): same URL gives same code, but different URLs can collide and you must check and retry. **Random 7 chars:** simple, but you must check the DB for collisions on every create, and collisions grow as the table fills.',
      '**Counter + base62** (chosen): a unique number becomes a unique code, no collision checks. A single global counter is a bottleneck and single point of failure, so hand out **ranges**: each app server reserves 1,000 IDs at a time from a small service (backed by ZooKeeper, etcd, or a DB row with an atomic increment). If a server dies, at most 1,000 IDs are skipped. That is fine.',
      'Downside: sequential codes are guessable. If that matters, shuffle the ID with a reversible bit-mix before encoding.'
    ], code: 'static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";\n\nstatic String toBase62(long id) {\n    StringBuilder sb = new StringBuilder();\n    do {\n        sb.append(ALPHABET.charAt((int) (id % 62)));\n        id /= 62;\n    } while (id > 0);\n    return sb.reverse().toString();   // 41507 -> "aNt"\n}' },
    { name: '301 or 302 redirect', text: [
      '**301 Moved Permanently:** browsers and proxies cache it, so repeat visits skip your servers. Cheaper, but you lose click counts and cannot change or expire the link reliably.',
      '**302 Found:** every visit comes back to you. Costs more traffic but keeps analytics and control. Most shorteners use 302 (or 307) for that reason.'
    ]},
    { name: 'Hot links and the cache', text: [
      'A link shared by a celebrity can get 100k clicks per minute. Redis absorbs it, but one key lives on one Redis shard. For extreme cases add a tiny in-process cache (a few seconds TTL) on each app server, or serve redirects from a CDN edge with a short cache time.',
      'Cache eviction: LRU with a TTL of about a day. Most links get nearly all their clicks in the first few days.'
    ], diagram: { w: 700, h: 220, nodes: [
      { id: 'c', label: 'Clients', kind: 'client', x: 80, y: 110 },
      { id: 'a1', label: 'App + local', sub: 'TTL 5 s', kind: 'service', x: 300, y: 55 },
      { id: 'a2', label: 'App + local', sub: 'TTL 5 s', kind: 'service', x: 300, y: 165 },
      { id: 'r', label: 'Redis shard', sub: 'hot key aNt', kind: 'cache', x: 560, y: 110, w: 130 }
    ], edges: [['c', 'a1'], ['c', 'a2'], ['a1', 'r'], ['a2', 'r']] }, step: { title: 'Local cache in front of Redis for a hot key', on: ['a1', 'a2'], dots: [{ from: 'c', to: 'a1', label: 'GET /aNt' }, { from: 'c', to: 'a2', label: 'GET /aNt' }] } },
    { name: 'Custom aliases', text: [
      'A user asks for `spring-sale`. Write it with a conditional put ("only if this key does not exist"). If it fails, return `409 Conflict`. Never "check, then insert" in two steps: two requests could both pass the check.',
      'Keep generated codes and aliases in the same key space, and make sure generated codes cannot clash with aliases, for example by reserving a prefix or a minimum length for aliases.'
    ]},
    { name: 'Expiry and cleanup', text: [
      'Check `expires_at` on every redirect, so an expired link stops working at once even if it is still stored. Delete old rows lazily with a background job or the database\'s own TTL feature (DynamoDB TTL, Cassandra TTL).'
    ]}
  ],
  bottlenecks: [
    ['Global ID counter', 'Hand out ID ranges per server; the counter is touched once per 1,000 links.'],
    ['DB read load', 'Cache-aside Redis with ~90% hit rate; read replicas or more partitions behind it.'],
    ['A single viral link', 'Local in-process cache with a seconds-long TTL, or CDN caching of the redirect.'],
    ['Analytics writes', 'Kafka + batch aggregation instead of a DB write per click.'],
    ['Region outage', 'Replicate links to a second region; redirects are read-only, so serve them from either.']
  ],
  tradeoffs: [
    ['Code generation', 'Counter ranges + base62', 'No collisions, no checks, short codes', 'Codes are guessable unless shuffled'],
    ['Redirect status', '302', 'Every click is counted, links can expire', 'More traffic than 301'],
    ['Database', 'Key-value store', 'Single-key lookups at any scale, easy partitioning', 'No joins or ad-hoc queries'],
    ['Analytics', 'Async via Kafka', 'Redirect latency unaffected', 'Counts lag by seconds to minutes'],
    ['Cache', 'Cache-aside, TTL ~1 day', 'Simple; DB sees ~10% of reads', 'First click on a link is slower']
  ],
  probe: [
    ['Why not just hash the long URL?', ['Hashes of different URLs can collide once you cut them to 7 characters, so you need a check-and-retry loop on every write. A counter gives uniqueness for free. Hashing is fine if you want the same URL to always get the same code; mention that trade-off.']],
    ['What if the ID-range service goes down?', ['App servers still have their current block, so creates keep working for a while. Run it with replicas (it is tiny), and allocate blocks large enough to ride out a short outage. Redirects do not depend on it at all.']],
    ['How do you stop abuse, like spam or phishing links?', ['Rate-limit creates per user and IP, check new URLs against a blocklist / safe-browsing API, and support takedown by deleting the key and its cache entry.']],
    ['Would you use SQL instead?', ['At 3 TB and 4k reads/s, a sharded Postgres works too. Pick the KV store because access is always by one key and it scales by adding nodes. Saying "either works, here is why I pick this one" scores better than insisting on one.']],
    ['How do you make it multi-region?', ['Serve redirects in every region from a local cache and a replicated KV store. Creates can go to one home region and replicate out; a few seconds of delay before a new link works far away is acceptable. Use ID ranges per region so codes never clash.']]
  ],
  say: [
    'It\'s read-heavy, about 100 redirects per new link, so the redirect path gets the cache and the attention.',
    'I\'ll give each server a block of IDs and base62-encode them, so codes are unique without a collision check.',
    'Access is always by one key, so a key-value store partitioned by code fits well.',
    'I return 302, not 301, so every click comes back to us and we can count it.',
    'Click counting goes through Kafka so analytics can never slow down a redirect.'
  ],
  numbers: [
    ['~40/s', 'creates, ~100/s at peak'],
    ['~4k/s', 'redirects, ~10k/s at peak'],
    ['3 TB', 'all links for 5 years'],
    ['7 chars', 'base62 code: 62⁷ ≈ 3.5 trillion'],
    ['~35 GB', 'cache for the hot set']
  ],
  checklist: [
    'List 4 functional and 4 non-functional requirements without looking.',
    'Do the estimation: writes/s, reads/s, storage, code length.',
    'Explain three ways to generate codes and why ranges + base62 wins.',
    'Draw the board from memory and say what problem each box solves.',
    'Explain 301 vs 302 and which you would pick.',
    'Walk through the redirect path including a cache miss.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-codes', title: 'Picking a code scheme', ask: 'You need 7-character codes with no collisions and no extra DB read on create. Which scheme?', options: [
        ['Per-server ID ranges, encoded in base62', true, 'Unique IDs give unique codes, and the range service is called once per block, not per link.'],
        ['MD5 of the long URL, first 7 characters', false, 'Truncated hashes collide, so each create needs a lookup and a retry path.'],
        ['7 random characters', false, 'Every create must check the DB for a collision, and collisions grow as the table fills.'],
        ['Auto-increment column in one SQL table', false, 'Unique, but one table becomes the write bottleneck and single point of failure.']
      ]},
      { id: 'mcq-redirect', title: 'Status code', ask: 'Marketing wants accurate click counts and the ability to expire campaign links. Which redirect?', options: [
        ['302 Found', true, 'Browsers do not cache it permanently, so every click reaches us and expiry takes effect at once.'],
        ['301 Moved Permanently', false, 'Browsers may cache it and never ask again: clicks are lost and expiry cannot be enforced.'],
        ['200 with a page that runs JavaScript to redirect', false, 'Slower, breaks for clients without JS, and is worse for SEO.'],
        ['404, then the client retries the long URL', false, 'The client does not know the long URL.']
      ]},
      { id: 'mcq-alias', title: 'Two users, one alias', ask: 'Two users request the alias `sale` at the same moment. How do you guarantee only one wins?', options: [
        ['Conditional put: insert only if the key does not exist; the loser gets 409', true, 'The check and the write happen as one atomic operation in the database.'],
        ['Read the key; if it is missing, write it', false, 'Both requests can read "missing" before either writes. Classic race.'],
        ['Put the alias in Redis first', false, 'Moves the race to Redis unless you also use an atomic SETNX, and Redis is not the source of truth.'],
        ['Let both succeed; the last write wins', false, 'One user silently gets someone else\'s link.']
      ]}
    ],
    order: [
      { id: 'ord-redirect', title: 'Redirect path', ask: 'Order what happens when someone opens `sho.rt/aNt`.', steps: [
        'Load balancer forwards `GET /aNt` to an app server',
        'App server looks up `aNt` in Redis',
        'On a miss, it reads the key-value DB and caches the result',
        'It returns `302` with the long URL in `Location`',
        'It publishes a click event to Kafka without waiting'
      ], extra: ['It writes +1 to the click counter in the links table'] },
      { id: 'ord-approach', title: 'Interview order', ask: 'In what order should you cover a design interview?', steps: [
        'Clarify requirements and scope',
        'Estimate traffic and storage',
        'Define the API',
        'Sketch the data model',
        'Draw the high-level design',
        'Deep dive into the hardest parts',
        'Discuss bottlenecks and trade-offs'
      ] }
    ],
    fill: [
      { id: 'fill-ratio', title: 'Open with the shape of the load', text: 'With 100M new links a month and 100 redirects each, the system is [[read-heavy|read heavy]], about [[4000|4k|4,000]] redirects per second, so the [[redirect|read]] path gets the cache.' },
      { id: 'fill-ids', title: 'Code generation in one line', text: 'Each server reserves a [[range|block]] of IDs and encodes the next one in [[base62|base 62]], so codes are unique without a [[collision|uniqueness]] check.' }
    ],
    palette: { id: 'pal-design', title: 'Build the board', ask: 'Requirements below. Pick only what this MVP needs on the board.', reqs: [
      '100M new links per month, 100:1 read-heavy',
      'Redirect p99 under 50 ms, 99.99% available',
      'Unique 7-character codes; daily click counts'
    ], parts: [
      ['Load balancer', 'must', 'Spreads redirects over stateless servers and removes the single point of failure.'],
      ['Stateless app servers', 'must', 'Any server can handle any request, so you scale by adding servers.'],
      ['Key-value store', 'must', 'Every lookup is by one key; it partitions cleanly by code.'],
      ['Redis cache', 'must', 'Absorbs ~90% of redirects so p99 stays low and the DB stays small.'],
      ['ID range service', 'must', 'Unique codes without a collision check or a global bottleneck.'],
      ['Message queue for clicks', 'good', 'Keeps analytics off the redirect path; a simpler MVP could log clicks and batch them.'],
      ['CDN', 'good', 'Helps only for extremely hot links; not needed on day one.'],
      ['Graph database', 'no', 'There are no relationships to traverse; it is a single-key lookup.'],
      ['WebSocket gateway', 'no', 'Redirects are plain request/response; nothing is pushed to clients.'],
      ['Distributed transactions (2PC)', 'no', 'Each create touches one key, so there is nothing to coordinate.']
    ]}
  }
});
})();
