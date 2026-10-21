(function(){
var D = { w: 880, h: 380, nodes: [
  { id: 'seed', label: 'Seed URLs', kind: 'note', x: 70, y: 60 },
  { id: 'fr', label: 'URL frontier', sub: 'priority + per-host queues', kind: 'queue', x: 220, y: 190, w: 170 },
  { id: 'dns', label: 'DNS cache', kind: 'cache', x: 220, y: 330, w: 110 },
  { id: 'f', label: 'Fetchers', sub: 'polite, robots.txt', kind: 'worker', x: 450, y: 190, w: 130 },
  { id: 'web', label: 'The web', kind: 'ext', x: 450, y: 50, w: 110 },
  { id: 'store', label: 'Page store', sub: 'raw HTML', kind: 'blob', x: 680, y: 70, w: 130, h: 56 },
  { id: 'p', label: 'Parser', sub: 'extract links', kind: 'worker', x: 680, y: 190 },
  { id: 'seen', label: 'Seen URLs', sub: 'Bloom filter + DB', kind: 'db', x: 680, y: 320, w: 140 }
], edges: [['seed', 'fr', { dash: true }], ['fr', 'f'], ['f', 'dns'], ['f', 'web'], ['f', 'store'], ['store', 'p'], ['p', 'seen'], ['seen', 'fr', { label: 'new URLs', bend: 30 }]] };

registerDesign({
  slug: 'web-crawler', order: 9, title: 'Web crawler',
  one: 'Download billions of pages for a search index: ==a URL frontier that is polite to every host==, parallel fetchers, link extraction, and dedupe so nothing is fetched twice.',
  questions: ['Purpose: search indexing, archiving, monitoring?', 'How many pages and how often to re-crawl?', 'HTML only or also images/PDFs?', 'Must respect robots.txt and rate limits per site? (Yes.)', 'How to handle duplicate content and traps?'],
  reqs: {
    func: ['Start from seeds, fetch pages, extract links, repeat', 'Store page content for indexing', 'Re-crawl pages based on how often they change'],
    nonfunc: ['Polite: obey robots.txt, limit requests per host', '1 billion pages per month', 'Robust to traps, slow sites and bad HTML', 'Scalable by adding workers'],
    mvp: ['frontier', 'fetchers', 'robots.txt', 'URL dedupe', 'content storage'],
    later: ['JavaScript rendering', 'content-change prediction', 'near-duplicate detection']
  },
  estimate: {
    lead: 'Throughput, storage and the number of hosts to be polite to.',
    assume: ['1B pages per month', 'average page 100 KB', 'store compressed ~25 KB'],
    rows: [
      ['Fetch rate', '1B ÷ 2.6M s', '**~400 pages/s** (peak ~1k/s)'],
      ['Bandwidth', '400 × 100 KB', '**~40 MB/s ≈ 320 Mbit/s**'],
      ['Storage per month', '1B × 25 KB', '**~25 TB/month**'],
      ['Seen URL set', '10B URLs × ~8 B (hash)', '**~80 GB** (Bloom filter much smaller)']
    ],
    so: 'Raw speed is easy; politeness (one host at a time), dedupe at billions of URLs, and storage are the real problems.'
  },
  apiLead: 'A crawler is a pipeline, not a public API. Internal interfaces:',
  api: [
    ['internal', 'frontier.add(url, priority)', 'Insert discovered URL after dedupe.'],
    ['internal', 'frontier.next() → url', 'Next URL whose host is allowed to be fetched now.'],
    ['internal', 'store.put(urlHash, html, fetchedAt)', 'Save content for indexing.']
  ],
  dataLead: null,
  data: [
    { name: 'url_state', store: 'sharded KV store keyed by URL hash', cols: [['url_hash', 'bytes', 'Primary key'], ['last_fetched, next_fetch', 'timestamps', 'Re-crawl scheduling'], ['content_hash', 'bytes', 'Detect unchanged or duplicate pages']] },
    { name: 'pages', store: 'object storage (WARC files)', cols: [['url_hash', 'bytes', 'Key'], ['html', 'compressed bytes', 'Content'], ['headers, status', 'json', 'Metadata']] }
  ],
  hld: [
    '**Frontier:** prioritized queues of URLs, split into **one queue per host**, so each host is fetched at most once every few seconds. A scheduler hands workers URLs from hosts that are ready.',
    '**Fetchers** check cached robots.txt, resolve DNS via a cache, download with timeouts, and write raw pages to object storage.',
    '**Parsers** extract links, normalize them (lowercase host, remove fragments), and check a **Bloom filter + seen-URL store** before adding them to the frontier.',
    '**Content hashes** detect duplicate pages; **depth and per-site limits** stop crawler traps (infinite calendars, session IDs in URLs).'
  ],
  flows: [
    { name: 'Crawl loop', title: 'One trip around the crawl loop', diagram: D, steps: [
      { title: 'Seeds into the frontier', text: 'Start with a list of known good URLs. Each goes into the queue of its host.', on: ['fr'], dots: [{ from: 'seed', to: 'fr', kind: 'evt' }] },
      { title: 'Polite pick', text: 'The frontier gives a fetcher a URL only from a host that has not been hit in the last few seconds (and robots.txt allows the path).', on: ['fr', 'f'], dots: [{ from: 'fr', to: 'f', label: 'example.com/a' }] },
      { title: 'Fetch', text: 'Resolve DNS through a cache (DNS lookups are slow), download with a timeout and size limit.', on: ['f', 'dns', 'web'], dots: [{ from: 'f', to: 'dns', label: 'resolve' }, { from: 'f', to: 'web', label: 'GET' }, { from: 'web', to: 'f', label: 'HTML', kind: 'res' }] },
      { title: 'Store raw page', text: 'Compressed HTML goes to object storage for the indexer.', on: ['store'], dots: [{ from: 'f', to: 'store', label: 'put', kind: 'evt' }] },
      { title: 'Extract and dedupe links', text: 'The parser normalizes links and checks the Bloom filter. Only unseen URLs go back to the frontier.', on: ['p', 'seen'], dots: [{ from: 'store', to: 'p', kind: 'evt' }, { from: 'p', to: 'seen', label: '120 links' }, { from: 'seen', to: 'fr', label: '37 new', kind: 'evt' }] }
    ]}
  ],
  deep: [
    { name: 'Politeness', text: ['One queue per host and a "next allowed time" per host. Respect robots.txt (cached per host for a day) and `Crawl-delay`. Back off when a site returns 429/503. This is non-negotiable.'] },
    { name: 'Dedupe at billions', text: ['A Bloom filter answers "definitely not seen" in memory with a small false-positive rate (we might skip a few new URLs, acceptable). Confirm positives against the URL store if needed. Content hashes (or SimHash for near-duplicates) avoid storing mirrored pages.'] },
    { name: 'Traps and priorities', text: ['Cap depth per site and URL length; detect repeating path patterns. Prioritize by page importance (links pointing in) and change frequency; re-crawl news sites hourly, static pages monthly.'] }
  ],
  bottlenecks: [['Politeness limits per host', 'Crawl many hosts in parallel instead of one host fast.'], ['DNS latency', 'Local DNS cache and resolvers.'], ['Seen-URL lookups', 'Bloom filter in memory, sharded URL store.'], ['Storage growth', 'Compression, dedupe by content hash.']],
  tradeoffs: [
    ['URL dedupe', 'Bloom filter', 'Tiny memory, fast', 'Rare false positives skip a URL'],
    ['Ordering', 'Per-host queues + priority', 'Polite and focused on important pages', 'Complex frontier'],
    ['Storage', 'Object storage', 'Cheap, huge', 'Not queryable directly'],
    ['Rendering', 'HTML only (MVP)', 'Fast and cheap', 'Misses JS-only content']
  ],
  probe: [
    ['How do you avoid overloading a website?', ['Per-host queues with minimum delay between requests, robots.txt and Crawl-delay, backing off on errors.']],
    ['How do you avoid crawling the same URL twice?', ['Normalize URLs, then check a Bloom filter backed by a sharded seen-URL store before adding to the frontier.']],
    ['How do you detect crawler traps?', ['Limits on depth, URL length and pages per site; detect repeated patterns; deprioritize sites producing endless unique URLs.']],
    ['How do you decide what to re-crawl?', ['Track how often each page changed in the past; schedule next_fetch accordingly, with importance as a multiplier.']]
  ],
  say: ['The frontier keeps one queue per host so we never hit a site more than once every few seconds.', 'Fetchers obey robots.txt and use a DNS cache.', 'A Bloom filter dedupes billions of URLs in memory.', 'Raw pages go to object storage; content hashes skip duplicate pages.'],
  numbers: [['~400/s', 'pages fetched'], ['25 TB/month', 'compressed storage'], ['1 req / few s', 'per host'], ['~1%', 'Bloom filter false positives, tunable']],
  checklist: ['Draw the crawl loop.', 'Explain politeness with per-host queues.', 'Explain Bloom filters for dedupe.', 'Explain trap and re-crawl handling.'],
  drills: {
    mcq: [
      { id: 'mcq-polite', title: 'Banned by a site', ask: 'A site blocks your crawler for sending 200 requests/s. Fix?', options: [
        ['Per-host queues with a minimum delay, respecting robots.txt', true, 'Spreads load over many hosts instead of one.'],
        ['Rotate IP addresses', false, 'Evasion, not politeness.'],
        ['Fetch faster to finish sooner', false, 'Makes it worse.'],
        ['Ignore robots.txt', false, 'Unethical and gets you blocked.']
      ]},
      { id: 'mcq-bloom', title: 'Seen URLs', ask: 'Cheap way to check "have we seen this URL" for 10 billion URLs?', options: [
        ['A Bloom filter in memory', true, 'Small memory, fast; rare false positives are acceptable.'],
        ['A SQL table scan', false, 'Far too slow.'],
        ['Re-download and compare', false, 'Wastes bandwidth.'],
        ['Keep a Java ArrayList of URLs', false, 'Linear search and huge memory.']
      ]}
    ],
    order: [{ id: 'ord-crawl', title: 'Crawl loop', ask: 'Order one cycle.', steps: ['Frontier hands out a URL from a host that is ready', 'Fetcher checks robots.txt and resolves DNS', 'Fetcher downloads and stores the page', 'Parser extracts and normalizes links', 'Unseen links are added to the frontier'], extra: ['Fetcher downloads every link on the page immediately'] }],
    fill: [{ id: 'fill-wc', title: 'Pitch', text: 'The frontier has one queue per [[host|domain|site]] for politeness, and a [[bloom filter|bloom]] dedupes URLs before they are queued.' }],
    palette: { id: 'pal-wc', title: 'Build the board', ask: 'Pick what the crawler needs.', reqs: ['1B pages per month', 'Polite to every site', 'No duplicate fetching'], parts: [
      ['URL frontier with per-host queues', 'must', 'Politeness and prioritization.'],
      ['Fetcher workers', 'must', 'Parallel downloads.'],
      ['robots.txt handling', 'must', 'Required politeness.'],
      ['Seen-URL dedupe (Bloom filter)', 'must', 'Avoid refetching.'],
      ['Object storage for pages', 'must', 'Cheap storage for raw HTML.'],
      ['DNS cache', 'good', 'Removes slow lookups.'],
      ['WebSocket gateway', 'no', 'Nothing is pushed to users.'],
      ['Strongly consistent global lock per URL', 'no', 'Dedupe can be approximate.']
    ]}
  }
});
})();
