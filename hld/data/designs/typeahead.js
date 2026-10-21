(function(){
var D = { w: 880, h: 370, nodes: [
  { id: 'u', label: 'Browser', sub: 'debounce 100 ms', kind: 'client', x: 70, y: 110 },
  { id: 'cdn', label: 'CDN / edge', sub: 'popular prefixes', kind: 'cdn', x: 250, y: 110, w: 130, h: 62 },
  { id: 'svc', label: 'Suggest service', sub: 'trie in memory', kind: 'service', x: 460, y: 110, w: 150 },
  { id: 'logs', label: 'Query logs', kind: 'queue', x: 250, y: 290 },
  { id: 'agg', label: 'Aggregator', sub: 'counts per hour', kind: 'worker', x: 460, y: 290 },
  { id: 'build', label: 'Trie builder', sub: 'top-k per prefix', kind: 'worker', x: 670, y: 290, w: 130 },
  { id: 'snap', label: 'Trie snapshots', kind: 'blob', x: 700, y: 110, w: 130, h: 56 }
], edges: [['u', 'cdn'], ['cdn', 'svc'], ['u', 'logs', { dash: true }], ['logs', 'agg'], ['agg', 'build'], ['build', 'snap'], ['snap', 'svc', { dash: true }]] };

registerDesign({
  slug: 'typeahead', order: 8, title: 'Typeahead / autocomplete',
  one: 'Suggest the top completions for every keystroke within ==tens of milliseconds==. Serve from a precomputed in-memory trie; rebuild it offline from query logs.',
  questions: ['How many suggestions, and ranked by what (popularity, freshness, personal)?', 'Latency target per keystroke?', 'How fresh must trending queries be?', 'Languages, typos, offensive-term filtering?', 'Per-user personalization?'],
  reqs: {
    func: ['Return top 5 completions for a prefix', 'Rank by popularity (with some freshness)', 'Filter unsafe suggestions'],
    nonfunc: ['p99 < 50 ms end to end', '~100k prefix requests/s at peak', 'Trending terms appear within an hour', 'Highly available; stale suggestions are acceptable'],
    mvp: ['global popularity ranking', 'top 5 per prefix', 'hourly rebuild'],
    later: ['personalization', 'typo tolerance', 'real-time trending']
  },
  estimate: {
    lead: 'Each keystroke is a request, so reads dwarf everything else.',
    assume: ['10M searches per hour at peak', 'average 6 keystrokes sent per search (after debounce)', '50M distinct queries worth suggesting'],
    rows: [
      ['Suggest requests', '10M × 6 ÷ 3,600', '**~17k/s** (bursts ~100k/s)'],
      ['Trie size', '50M queries × ~30 B + top-5 lists per node', '**~10–30 GB** (fits in RAM, can shard by prefix)'],
      ['Log volume', '10M × 24 × 50 B', '**~12 GB/day**']
    ],
    so: 'A precomputed trie in memory answers each prefix in microseconds; the network is the main latency.'
  },
  apiLead: null,
  api: [['GET', '/v1/suggest?q=how%20to&limit=5', 'Top completions for a prefix. Cacheable by prefix.', '→ 200 { "suggestions": ["how to tie a tie", "how to cook rice", …] }']],
  dataLead: 'The serving structure is a trie where each node stores its own top-k list, so a lookup never walks the subtree.',
  data: [
    { name: 'trie node (in memory)', store: 'suggest service RAM, loaded from snapshot', cols: [['children', 'map<char, node>', 'Next characters'], ['top_k', 'list of (query, score)', 'Precomputed best completions below this node'], ['is_end', 'bool', 'A full query ends here']] },
    { name: 'query_counts', store: 'analytics store (batch)', cols: [['query', 'string', 'Normalized text'], ['hour', 'timestamp', 'Time bucket'], ['count', 'long', 'Searches in that hour']] }
  ],
  hld: [
    '**Serving:** the suggest service keeps a trie in memory. Each node already stores the top 5 completions under it, so answering a prefix is: walk the prefix characters, return the stored list. O(length of prefix).',
    '**Caching:** popular prefixes ("a", "ho", "how") are cached at the CDN/edge and in the browser for a few minutes.',
    '**Building:** searches are logged to Kafka, aggregated into counts per hour, weighted with time decay, and an offline job builds a new trie snapshot (e.g. hourly). Servers load the new snapshot and swap it in atomically.',
    '**Client:** debounce keystrokes (~100 ms) and cancel stale requests, so fast typers do not send one request per letter.'
  ],
  flows: [
    { name: 'Serve a prefix', title: 'Answering "how t"', diagram: D, steps: [
      { title: 'Debounced request', text: 'The browser waits ~100 ms after the last keystroke, then asks for `how t`.', on: ['u'], dots: [{ from: 'u', to: 'cdn', label: 'q=how t' }] },
      { title: 'Edge cache', text: 'Short, popular prefixes are cached at the edge. `how t` is a miss here, so it goes to the service.', on: ['cdn'], dots: [{ from: 'cdn', to: 'svc', label: 'miss' }] },
      { title: 'Walk the trie', text: 'h → o → w → space → t. The node for `how t` already holds its top 5. Microseconds.', on: ['svc'], set: { svc: { sub: 'node "how t": top-5 ready' } } },
      { title: 'Respond and cache', text: 'Return 5 suggestions; the CDN caches the response for a few minutes.', on: ['u', 'cdn'], dots: [{ from: 'svc', to: 'cdn', label: 'top 5', kind: 'res' }, { from: 'cdn', to: 'u', kind: 'res' }] }
    ]},
    { name: 'Rebuild', title: 'Keeping suggestions fresh', diagram: D, steps: [
      { title: 'Log searches', text: 'Every completed search is logged to Kafka (not every keystroke).', on: ['logs'], dots: [{ from: 'u', to: 'logs', label: 'searched', kind: 'evt' }] },
      { title: 'Aggregate counts', text: 'A stream job counts queries per hour and applies time decay so trending queries rise and old ones fade.', on: ['agg'], dots: [{ from: 'logs', to: 'agg', kind: 'evt' }] },
      { title: 'Build a new trie', text: 'Hourly, the builder creates a trie with top-5 lists per node, filters blocked terms, and writes a snapshot.', on: ['build', 'snap'], dots: [{ from: 'agg', to: 'build', kind: 'evt' }, { from: 'build', to: 'snap', label: 'trie v812', kind: 'evt' }] },
      { title: 'Hot swap', text: 'Suggest servers download the snapshot, build it in memory beside the old one, and swap a pointer. No downtime.', on: ['svc'], dots: [{ from: 'snap', to: 'svc', label: 'load v812', kind: 'evt' }] }
    ]}
  ],
  deep: [
    { name: 'Why store top-k at every node', text: ['Without it, answering "a" means visiting millions of descendants. Storing the top 5 at each node costs memory but makes reads O(prefix length). Updates happen offline, so write cost does not matter.'],
      code: 'List<String> suggest(String prefix) {\n    Node n = root;\n    for (char c : prefix.toCharArray()) {\n        n = n.children.get(c);\n        if (n == null) return List.of();\n    }\n    return n.topK;               // precomputed during the offline build\n}' },
    { name: 'Sharding the trie', text: ['If it does not fit one machine, shard by first character(s), balanced by traffic, not alphabet (many queries start with "s", few with "x"). Replicate each shard for throughput.'] },
    { name: 'Freshness', text: ['Hourly rebuilds are fine for most terms. For breaking news, add a small real-time layer: a fast counter of the last few minutes merged with trie results at query time.'] }
  ],
  bottlenecks: [['Request volume per keystroke', 'Debounce, browser cache, CDN cache of short prefixes.'], ['Trie memory', 'Shard by prefix, store compact IDs, limit to queries above a count threshold.'], ['Stale trends', 'Real-time overlay of recent counts.'], ['Rebuild time', 'Incremental builds or parallel builds per shard.']],
  tradeoffs: [
    ['Structure', 'Trie with top-k per node', 'Microsecond lookups', 'Memory, offline rebuild'],
    ['Freshness', 'Hourly rebuild', 'Simple, stable', 'Trends lag up to an hour'],
    ['Caching', 'CDN for short prefixes', 'Absorbs most traffic', 'Personalization is harder'],
    ['Client', 'Debounce 100 ms', 'Far fewer requests', 'Slight delay on each keystroke']
  ],
  probe: [
    ['How do you return results in under 50 ms?', ['Precomputed top-k at each trie node in memory, CDN caching for popular prefixes, debounced clients, and servers close to users.']],
    ['How do you handle trending queries?', ['Time-decayed counts in the hourly build, plus a small real-time counter for the last minutes merged at query time.']],
    ['How do you add personalization?', ['Fetch global top-k, then re-rank with the user\'s recent searches (from a small per-user store). Personalized responses cannot be CDN-cached.']],
    ['How do you filter offensive suggestions?', ['Apply a blocklist and classifiers during the offline build so bad terms never enter the trie; allow emergency removals by patching a deny list at serve time.']]
  ],
  say: ['Suggestions come from an in-memory trie where every node stores its top five completions.', 'The trie is rebuilt hourly from aggregated query logs and swapped in atomically.', 'Popular short prefixes are cached at the CDN, and the client debounces keystrokes.', 'Shard the trie by prefix, balanced by traffic, if it outgrows one machine.'],
  numbers: [['< 50 ms', 'end-to-end target'], ['~100k/s', 'peak requests'], ['10–30 GB', 'trie in memory'], ['100 ms', 'client debounce']],
  checklist: ['Explain the trie with top-k per node.', 'Explain the offline build pipeline.', 'Explain caching and debouncing.', 'Explain freshness and personalization.'],
  drills: {
    mcq: [
      { id: 'mcq-trie', title: 'Fast prefix lookup', ask: 'How do you return top 5 completions for "a" without scanning millions of queries?', options: [
        ['Store the top 5 at each trie node during an offline build', true, 'Reads become a short walk plus a stored list.'],
        ['SQL `LIKE \'a%\' ORDER BY count LIMIT 5` per keystroke', false, 'Far too slow at this traffic.'],
        ['Scan the subtree on every request', false, 'Millions of nodes for short prefixes.'],
        ['Random suggestions', false, 'Not useful.']
      ]},
      { id: 'mcq-load', title: 'Too many requests', ask: 'Each keystroke sends a request, overloading servers. Cheapest fix?', options: [
        ['Debounce in the client and cache popular prefixes at the CDN', true, 'Cuts requests by a large factor with almost no cost.'],
        ['Buy 10× more servers', false, 'Expensive and wasteful.'],
        ['Return 100 suggestions per request', false, 'More data, same request count.'],
        ['Disable autocomplete', false, 'Removes the feature.']
      ]}
    ],
    order: [{ id: 'ord-build', title: 'Build pipeline', ask: 'Order the offline pipeline.', steps: ['Log completed searches to Kafka', 'Aggregate counts per query per hour', 'Apply time decay and filter blocked terms', 'Build a trie with top-k per node and save a snapshot', 'Servers load the snapshot and swap it in'], extra: ['Insert each keystroke into the trie live'] }],
    fill: [{ id: 'fill-ta', title: 'Pitch', text: 'Suggestions come from an in-memory [[trie|prefix tree]] with the top [[k|5|k completions]] stored at each node, rebuilt [[offline|hourly|in batch]] from query logs.' }],
    palette: { id: 'pal-ta', title: 'Build the board', ask: 'Pick what typeahead needs.', reqs: ['p99 < 50 ms per keystroke', '100k requests/s at peak', 'Trending within an hour'], parts: [
      ['In-memory trie with top-k per node', 'must', 'Microsecond lookups.'],
      ['Query log pipeline', 'must', 'Source of popularity counts.'],
      ['Offline trie builder + snapshots', 'must', 'Fresh tries without slowing reads.'],
      ['CDN / edge caching', 'must', 'Absorbs popular prefixes.'],
      ['Client debounce', 'good', 'Fewer requests.'],
      ['Real-time trending overlay', 'good', 'Breaking news freshness.'],
      ['SQL LIKE queries per keystroke', 'no', 'Too slow.'],
      ['Strongly consistent replication of the trie', 'no', 'Stale suggestions are acceptable.']
    ]}
  }
});
})();
