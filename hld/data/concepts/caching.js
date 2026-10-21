(function(){
var base = {
  w: 760, h: 300,
  nodes: [
    { id: 'client', label: 'Client', kind: 'client', x: 90, y: 150 },
    { id: 'app', label: 'App server', kind: 'service', x: 300, y: 150 },
    { id: 'cache', label: 'Redis', sub: 'cache', kind: 'cache', x: 560, y: 70 },
    { id: 'db', label: 'Database', sub: 'source of truth', kind: 'db', x: 560, y: 225, w: 128, h: 62 }
  ],
  edges: [['client', 'app'], ['app', 'cache'], ['app', 'db']]
};
var layers = {
  w: 820, h: 260,
  nodes: [
    { id: 'browser', label: 'Browser', sub: 'HTTP cache', kind: 'client', x: 80, y: 130 },
    { id: 'cdn', label: 'CDN edge', sub: 'static, media', kind: 'cdn', x: 245, y: 130, w: 124, h: 64 },
    { id: 'app', label: 'App server', sub: 'in-memory LRU', kind: 'service', x: 420, y: 130, w: 124 },
    { id: 'redis', label: 'Redis', sub: 'shared cache', kind: 'cache', x: 600, y: 60 },
    { id: 'db', label: 'Database', sub: 'buffer pool', kind: 'db', x: 600, y: 205, w: 124, h: 62 }
  ],
  edges: [['browser', 'cdn'], ['cdn', 'app'], ['app', 'redis'], ['app', 'db']]
};

registerConcept({
  slug: 'caching', order: 3, title: 'Caching',
  one: 'Keep a copy of hot data in fast memory so ==most reads never reach the database==.',
  picture: [
    'A cache is the notepad next to your phone. You look the number up in the phone book once, write it on the notepad, and next time you read the notepad. It is fast because it is small and close.',
    'The database stays the **source of truth**. The cache is a copy that may be slightly out of date. Every caching question in an interview is really one of two questions: **when do I put data in**, and **when do I throw it away**.'
  ],
  use: ['reads far outnumber writes', 'the same items are read again and again', 'a few seconds of staleness is fine', 'the DB or a downstream API is slow or expensive', 'results are costly to compute'],
  avoid: ['every read must see the latest write (balances, stock)', 'data is read once and never again', 'writes are as frequent as reads', 'the working set is far bigger than memory'],
  flows: [
    { name: 'Read: miss, then hit', title: 'Cache-aside read', diagram: base, steps: [
      { title: 'Request arrives', text: 'A client asks for user 42. The app server owns the caching logic in this pattern, so it decides where to look.', on: ['client', 'app'], dots: [{ from: 'client', to: 'app', label: 'GET /users/42' }] },
      { title: 'Check the cache first', text: 'The app asks Redis for key `user:42`. It is not there yet: a **cache miss**.', on: ['cache'], bad: ['cache'], dots: [{ from: 'app', to: 'cache', label: 'GET user:42' }, { from: 'cache', to: 'app', label: 'nil', kind: 'err' }], anno: [{ node: 'cache', text: 'miss', dx: 92, dy: 5 }] },
      { title: 'Read from the database', text: 'On a miss, the app reads the row from the database. This is the slow part: a few milliseconds, and it uses DB capacity.', on: ['db'], dots: [{ from: 'app', to: 'db', label: 'SELECT … id=42' }, { from: 'db', to: 'app', label: 'row', kind: 'res' }] },
      { title: 'Fill the cache', text: 'The app writes the row into Redis with a **TTL** (time to live), say 10 minutes. The TTL is a safety net: even if we forget to delete it, the copy expires.', on: ['cache'], dots: [{ from: 'app', to: 'cache', label: 'SET user:42 EX 600', kind: 'evt' }] },
      { title: 'Answer the client', text: 'The client gets its data. This first request paid the full cost: cache round trip + DB query.', on: ['client'], dots: [{ from: 'app', to: 'client', label: '200 OK', kind: 'res' }] },
      { title: 'Next request: a hit', text: 'Another request for user 42. Redis has it: a **cache hit** in under a millisecond. The database is not touched at all.', on: ['cache', 'app'], dim: true, dots: [{ from: 'client', to: 'app', label: 'GET /users/42' }, { from: 'app', to: 'cache', label: 'GET user:42' }, { from: 'cache', to: 'app', label: 'hit', kind: 'res' }, { from: 'app', to: 'client', label: '200 OK', kind: 'res' }], anno: [{ node: 'cache', text: 'hit, ~0.5 ms', dx: 112, dy: 5 }] },
      { title: 'Why it matters', text: 'With a 95% hit rate, only 1 in 20 reads reaches the database. The DB now handles 20× more traffic than it could alone. That is the whole point.', on: ['db'], anno: [{ node: 'db', text: 'sees 5% of reads', dx: 0, dy: 52 }] }
    ]},
    { name: 'Write: update, then delete', title: 'Keeping the cache honest on writes', diagram: base, steps: [
      { title: 'A write comes in', text: 'User 42 changes their name. The cached copy is now about to be wrong.', on: ['client', 'app'], dots: [{ from: 'client', to: 'app', label: 'PUT /users/42' }] },
      { title: 'Update the database first', text: 'The database is the source of truth, so it changes first. If this fails, nothing else should happen.', on: ['db'], dots: [{ from: 'app', to: 'db', label: 'UPDATE … id=42' }, { from: 'db', to: 'app', label: 'ok', kind: 'res' }] },
      { title: 'Delete the cached copy', text: '**Delete**, do not overwrite. Deleting is safe to repeat and avoids writing a value that a slower, older request might later overwrite.', on: ['cache'], bad: ['cache'], dots: [{ from: 'app', to: 'cache', label: 'DEL user:42', kind: 'err' }], anno: [{ node: 'cache', text: 'gone', dx: 92, dy: 5 }] },
      { title: 'Next read refills it', text: 'The next read misses, loads the new row from the DB and caches it again. The cache heals itself.', on: ['cache', 'db'], dots: [{ from: 'app', to: 'cache', label: 'GET user:42' }, { from: 'cache', to: 'app', label: 'nil', kind: 'err' }, { from: 'app', to: 'db', label: 'SELECT' }, { from: 'app', to: 'cache', label: 'SET (new name)', kind: 'evt' }] }
    ]},
    { name: 'Where caches live', title: 'Caches at every layer', diagram: layers, steps: [
      { title: 'Browser', text: 'The fastest cache is the one on the user\'s device. `Cache-Control: max-age=3600` lets the browser skip the network entirely.', on: ['browser'], anno: [{ node: 'browser', text: '0 ms', dy: -50 }] },
      { title: 'CDN edge', text: 'A CDN keeps copies of images, video and static files in servers near users. A request from Mumbai is served from Mumbai, not from your data center.', on: ['cdn'], dots: [{ from: 'browser', to: 'cdn', label: 'logo.png' }, { from: 'cdn', to: 'browser', label: 'hit', kind: 'res' }], anno: [{ node: 'cdn', text: '~20 ms', dy: -52 }] },
      { title: 'In-process cache', text: 'Each app server can hold a small LRU map in its own memory (Caffeine, Guava). No network hop, but every server has its own copy, so they can disagree.', on: ['app'], anno: [{ node: 'app', text: '~100 ns', dy: -50 }] },
      { title: 'Shared cache', text: 'Redis or Memcached is shared by all app servers. One copy, one place to delete it. This is the cache most interviews mean.', on: ['redis'], dots: [{ from: 'app', to: 'redis', label: 'GET' }, { from: 'redis', to: 'app', label: 'hit', kind: 'res' }], anno: [{ node: 'redis', text: '~0.5 ms', dx: 100, dy: 5 }] },
      { title: 'Database', text: 'Even the database caches: hot pages stay in its buffer pool in RAM. Only a miss there touches disk.', on: ['db'], dots: [{ from: 'app', to: 'db', label: 'query' }, { from: 'db', to: 'app', label: 'rows', kind: 'res' }], anno: [{ node: 'db', text: '1–10 ms', dx: 100, dy: 5 }] }
    ]}
  ],
  howLead: 'Two decisions define any cache: how data gets in (the write strategy) and how it gets out (eviction and invalidation).',
  how: [
    { name: 'Cache-aside (lazy loading)', text: [
      'The app checks the cache, and on a miss reads the DB and fills the cache. Only data that is actually requested gets cached, and if the cache dies the app still works (just slower).',
      'This is the default answer in interviews. Its weakness: the first read is always slow, and a write must remember to delete the cached copy.'
    ], code: 'User getUser(long id) {\n    String key = "user:" + id;\n    User u = cache.get(key);\n    if (u != null) return u;          // hit\n    u = db.findUser(id);              // miss: go to the source\n    cache.set(key, u, Duration.ofMinutes(10));\n    return u;\n}' },
    { name: 'Write strategies', text: [
      '**Write-through:** write to the cache and the DB together. Reads are always warm and fresh, but every write pays for both, and you cache data nobody may read.',
      '**Write-back (write-behind):** write only to the cache and flush to the DB later in batches. Very fast writes, but data is lost if the cache dies before flushing. Fits counters and metrics, not money.',
      '**Write-around:** write only to the DB and let reads fill the cache. Good when written data is rarely read back soon.'
    ]},
    { name: 'Eviction: what to throw out when memory is full', text: [
      '**LRU** (least recently used) drops whatever was untouched longest. The usual default. **LFU** (least frequently used) keeps popular items even if not used in the last minute. **TTL** removes items after a fixed time, whatever their popularity.',
      'In Redis this is a setting: `maxmemory-policy allkeys-lru`.'
    ]},
    { name: 'Invalidation: keeping copies honest', text: [
      'On a write, update the DB, then **delete** the cache key. Always set a TTL as well, so a missed delete heals itself.',
      'For many readers across services, publish a change event (for example from the DB change log) and let each service delete its own copies.'
    ]},
    { name: 'Stampede (thundering herd)', text: [
      'A popular key expires and 5,000 requests miss at the same moment. All of them hit the database together. Fixes: let only one request rebuild the key (a lock or "single flight"), serve the stale value while one request refreshes it, and add random jitter to TTLs so keys do not expire together.'
    ]},
    { name: 'Hot keys', text: [
      'One key (a celebrity profile, a viral post) can get more traffic than one cache node can serve. Fixes: copy it to several keys (`post:9:copy1..copy8`) and pick one at random, or keep a tiny in-process cache in front of Redis for that key.'
    ]}
  ],
  compare: {
    title: 'Write strategies compared', lead: 'Pick by asking: how fresh must reads be, and can I ever lose a write?',
    head: ['Strategy', 'Write path', 'Read freshness', 'Write latency', 'Main risk'],
    rows: [
      ['**Cache-aside**', 'DB, then delete key', 'Fresh after next miss', 'DB only', 'Stale reads if delete fails; slow first read'],
      ['**Read-through**', 'DB (cache library loads on miss)', 'Same as cache-aside', 'DB only', 'Same, logic hidden in the cache layer'],
      ['**Write-through**', 'Cache and DB together', 'Always fresh', 'Cache + DB', 'Caches data nobody reads'],
      ['**Write-back**', 'Cache now, DB later', 'Fresh in cache', 'Cache only (fastest)', 'Data loss if cache dies before flush'],
      ['**Write-around**', 'DB only', 'Miss after every write', 'DB only', 'Recently written data reads slowly']
    ]
  },
  say: [
    'Reads are about 100× writes here, so I\'ll put a cache-aside Redis layer in front of the database.',
    'On a write I update the DB first, then delete the cache key, and every key also has a TTL as a safety net.',
    'I\'ll aim for a 90%+ hit rate; at that rate the DB only sees one read in ten.',
    'To stop a stampede on hot keys, only one request rebuilds a missing key and the TTLs get random jitter.',
    'If Redis goes down we fall back to the DB with rate limiting, so it is slower but still correct.'
  ],
  numbers: [
    ['~100 ns', 'read from local RAM', 'in-process cache'],
    ['0.2–1 ms', 'Redis GET in the same data center'],
    ['1–10 ms', 'simple indexed DB query'],
    ['~100k ops/s', 'one Redis node, simple GET/SET'],
    ['90%+', 'hit rate worth aiming for', 'below ~80% the cache may not pay off'],
    ['80/20', 'about 20% of items get 80% of reads', 'size the cache for that 20%']
  ],
  pitfalls: [
    ['No TTL on keys', 'One missed delete means a wrong value forever. Always set a TTL, even a long one.'],
    ['Updating the cache instead of deleting it', 'Two concurrent writes can land in the cache in the wrong order and leave an old value. Deleting is simpler and safe to repeat.'],
    ['Treating the cache as the database', 'Caches evict and restart. If losing the cache loses data, it is not a cache.'],
    ['Ignoring the stampede', 'Saying "add a cache" without saying what happens when a hot key expires is the classic follow-up trap.'],
    ['Caching everything', 'A low hit rate means you pay for memory and an extra hop on most requests for nothing. Cache the hot set.'],
    ['Forgetting the cold start', 'After a deploy or restart the cache is empty and the DB takes full load. Warm critical keys or ramp traffic.']
  ],
  seen: [
    ['Facebook (Memcache)', 'Huge look-aside memcache tier in front of MySQL; "leases" stop stampedes and stale sets.'],
    ['Twitter / X timelines', 'Home timelines are precomputed and kept in Redis so reading a feed is one cache lookup.'],
    ['Netflix, YouTube', 'Video files are cached on CDN boxes inside ISPs, close to viewers.'],
    ['DNS', 'Every resolver caches answers for the record\'s TTL. Caching is why the internet is fast.'],
    ['Your browser', 'Images, CSS and JS are reused across page loads thanks to `Cache-Control` headers.']
  ],
  probe: [
    ['What happens if the cache cluster goes down?', ['Reads fall through to the database, which may not handle the full load. Protect it with rate limiting or load shedding, keep the cache replicated (Redis replicas, Sentinel or Cluster), and warm it back up gradually.']],
    ['How do you keep the cache consistent with the database?', ['Update the DB, then delete the key, with a TTL on every key. For stricter needs, drive deletes from the DB change log (CDC) so no code path can forget. Strong consistency through a cache is expensive: say which data can be stale and which cannot.']],
    ['Delete then update, or update then delete?', ['Update the DB, then delete. If you delete first, a reader can miss, read the **old** row and put it back before your update lands. Even "update then delete" has a tiny race, which the TTL covers.']],
    ['How would you pick a TTL?', ['From how stale the data may be: profile names can be minutes old, a stock price cannot. Add random jitter (say ±10%) so keys created together do not expire together.']],
    ['One key gets 1 million reads per second. Now what?', ['A single Redis shard cannot serve that. Replicate the key under several names and pick one at random, add a small in-process cache with a short TTL in each app server, or put it on the CDN if it is public.']],
    ['In-process cache or Redis?', ['In-process is ~1000× faster but each server has its own copy and its own invalidation problem. Redis is shared and consistent across servers. Common answer: Redis as the main cache, a tiny local cache only for very hot, rarely changing keys.']]
  ],
  checklist: [
    'Draw cache-aside and say the read path and write path in order.',
    'Explain why we delete the key instead of updating it.',
    'Compare write-through, write-back and write-around in one sentence each.',
    'Explain LRU, LFU and TTL eviction.',
    'Describe a cache stampede and two ways to stop it.',
    'Say what happens when the cache goes down.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-strategy', title: 'Read-heavy profile service', ask: 'Profiles are read 100× more than written, and a name can be a few seconds stale. Which setup fits best?', options: [
        ['Cache-aside with Redis, delete on write, TTL on every key', true, 'Only hot profiles get cached, writes stay simple, and the TTL covers any missed delete.'],
        ['Write-back cache that flushes to the DB every minute', false, 'Fast writes are not the problem here, and you risk losing writes if the cache dies.'],
        ['No cache; add DB read replicas only', false, 'Replicas help, but each read still costs a DB query. At 100:1 reads, a cache is far cheaper per read.'],
        ['Write-through cache with no TTL', false, 'Works, but caches every write even if never read, and with no TTL any bug leaves a stale value forever.']
      ]},
      { id: 'mcq-counter', title: 'View counters', ask: 'A video page increments a view counter on every view: 50k increments per second. Losing a few seconds of counts in a crash is fine. Best approach?', options: [
        ['Write-back: `INCR` in Redis, flush totals to the DB every few seconds', true, 'Counters are the textbook write-back case: very write-heavy, and small losses are acceptable.'],
        ['Write-through: update Redis and the DB on every view', false, '50k DB writes per second for a counter wastes the database.'],
        ['Cache-aside: update the DB and delete the key on each view', false, 'Every view would hit the DB and then force the next read to miss too.'],
        ['Put the counter in the CDN', false, 'CDNs cache responses; they do not count writes.']
      ]},
      { id: 'mcq-stampede', title: 'Midnight spike', ask: 'Every night at 00:00 the database CPU spikes to 100% for a few seconds. All cache keys were loaded by a job at 23:00 with TTL 1 hour. Most likely cause and fix?', options: [
        ['Keys expire together; add random jitter to TTLs and let one request rebuild each key', true, 'Same creation time + same TTL = same expiry. Jitter spreads them out; single-flight stops duplicate rebuilds.'],
        ['Redis is too small; double its memory', false, 'Memory would cause evictions over time, not a spike exactly one hour after loading.'],
        ['Switch from LRU to LFU eviction', false, 'Eviction policy is not involved; the keys are expiring by TTL.'],
        ['Add more app servers', false, 'More app servers would send even more simultaneous misses to the DB.']
      ]},
      { id: 'mcq-balance', title: 'Bank balance', ask: 'Should you serve account balances for the "transfer money" screen from a cache with a 30 s TTL?', options: [
        ['No: the transfer check must read the source of truth; cache only for display-only screens if at all', true, 'A stale balance could approve a transfer that should fail. Correctness beats speed here.'],
        ['Yes: 30 seconds is short enough', false, 'Two transfers within 30 seconds could both pass against the same stale balance.'],
        ['Yes, if you use write-through', false, 'Write-through narrows the window but cache and DB can still disagree after failures; the decision must read the DB.'],
        ['Yes, with LFU eviction', false, 'Eviction policy does not change staleness.']
      ]}
    ],
    order: [
      { id: 'ord-read', title: 'Cache-aside read path', ask: 'Put the steps of a cache-aside read in order.', steps: [
        'App receives the request for key `user:42`',
        'App asks the cache for `user:42`',
        'Cache misses, so the app queries the database',
        'App stores the row in the cache with a TTL',
        'App returns the row to the client'
      ], extra: ['Cache queries the database by itself'] },
      { id: 'ord-write', title: 'Safe write with cache-aside', ask: 'Order the steps for updating user 42.', steps: [
        'App receives the update',
        'App writes the change to the database',
        'App deletes `user:42` from the cache',
        'Next read misses and reloads the fresh row'
      ], extra: ['App writes the new value into the cache before the DB'] }
    ],
    fill: [
      { id: 'fill-why', title: 'Justify the cache', text: 'Reads are about 100× writes, so I add a [[cache-aside|lazy loading|look-aside]] cache. On a write I update the [[database|db]] first, then [[delete|invalidate|evict]] the key, and every key has a [[TTL|time to live|expiry]] as a safety net.', why: 'This one sentence covers the pattern, the write order, and the fallback. It answers the first three follow-up questions before they are asked.' },
      { id: 'fill-evict', title: 'Eviction', text: 'When memory is full, [[LRU|least recently used]] eviction removes the item that was used least recently, while [[LFU|least frequently used]] removes the one used least often.' }
    ]
  }
});
})();
