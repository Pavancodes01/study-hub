(function(){
var inv = { w: 840, h: 330, nodes: [
  { id: 'd1', label: 'Doc 1', sub: '"red running shoes"', kind: 'key', x: 110, y: 60, w: 170, h: 44 },
  { id: 'd2', label: 'Doc 2', sub: '"blue running jacket"', kind: 'key', x: 110, y: 160, w: 170, h: 44 },
  { id: 'd3', label: 'Doc 3', sub: '"red jacket"', kind: 'key', x: 110, y: 260, w: 170, h: 44 },
  { id: 'red', label: 'red → 1, 3', kind: 'key', x: 470, y: 60, w: 150, h: 40 },
  { id: 'run', label: 'running → 1, 2', kind: 'key', x: 470, y: 140, w: 170, h: 40 },
  { id: 'jac', label: 'jacket → 2, 3', kind: 'key', x: 470, y: 220, w: 160, h: 40 },
  { id: 'q', label: 'red AND jacket', sub: '{1,3} ∩ {2,3} = {3}', kind: 'service', x: 730, y: 140, w: 160 }
], edges: [['d1', 'red', { dash: true }], ['d3', 'red', { dash: true }], ['d1', 'run', { dash: true }], ['d2', 'run', { dash: true }], ['d2', 'jac', { dash: true }], ['d3', 'jac', { dash: true }], ['red', 'q'], ['jac', 'q']] };
var arch = { w: 840, h: 300, nodes: [
  { id: 'app', label: 'Product service', kind: 'service', x: 100, y: 150, w: 140 },
  { id: 'db', label: 'Products DB', sub: 'source of truth', kind: 'db', x: 330, y: 60, w: 140 },
  { id: 'cdc', label: 'Kafka', sub: 'product changes', kind: 'queue', x: 330, y: 240 },
  { id: 'ix', label: 'Indexer', kind: 'worker', x: 540, y: 240 },
  { id: 'es', label: 'Elasticsearch', sub: '3 shards × 2 replicas', kind: 'db', x: 720, y: 150, w: 150 },
  { id: 'user', label: 'Search API', kind: 'service', x: 540, y: 60 }
], edges: [['app', 'db'], ['db', 'cdc', { label: 'CDC' }], ['cdc', 'ix'], ['ix', 'es'], ['user', 'es']] };

registerConcept({
  slug: 'search', order: 15, title: 'Search and the inverted index',
  one: 'Full-text search flips documents into a map from ==each word to the documents that contain it==, so a query is a few list lookups instead of scanning every document.',
  picture: [
    'The index at the back of a textbook lists each important word with its page numbers. To find pages about "red jackets", you look up "red", look up "jacket", and take the pages on both lists.',
    'A search engine does exactly this, plus normalising words (lowercase, "running" → "run"), **ranking** results by relevance (BM25), and spreading the index over shards. It sits **beside** your database, fed by changes, not instead of it.'
  ],
  use: ['keyword search over text', 'filters plus text (facets: brand, price)', 'autocomplete and fuzzy matching', 'log search'],
  avoid: ['exact lookups by ID (use the DB)', 'as the system of record', 'strongly consistent "read right after write" requirements'],
  flows: [
    { name: 'Inverted index', title: 'Building and querying an inverted index', diagram: inv, steps: [
      { title: 'Split documents into words', text: 'Each document is tokenized and normalized: lowercase, punctuation removed, words stemmed ("running" → "run").', on: ['d1', 'd2', 'd3'] },
      { title: 'Map each word to its documents', text: 'For every word, keep a sorted list of document IDs (a **posting list**), plus positions and counts for ranking.', on: ['red', 'run', 'jac'], dots: [{ from: 'd1', to: 'red', kind: 'evt' }, { from: 'd3', to: 'red', kind: 'evt' }, { from: 'd2', to: 'jac', kind: 'evt' }] },
      { title: 'Answer a query', text: '"red jacket": fetch two posting lists and intersect them. Sorted lists intersect in linear time. Result: doc 3.', on: ['q'], dots: [{ from: 'red', to: 'q', label: '{1,3}' }, { from: 'jac', to: 'q', label: '{2,3}' }] },
      { title: 'Rank', text: 'With thousands of matches, order by relevance: BM25 scores words that are frequent in this document but rare overall higher. Add business signals like popularity.', on: ['q'], set: { q: { sub: 'score with BM25 + popularity' } } }
    ]},
    { name: 'In a system', title: 'Search beside the database', diagram: arch, steps: [
      { title: 'DB stays the source of truth', text: 'Products are written to the database as usual.', on: ['app', 'db'], dots: [{ from: 'app', to: 'db', label: 'UPDATE product' }] },
      { title: 'Changes flow to the indexer', text: 'Change data capture (or an outbox event) puts each change on Kafka; an indexer updates the search index. No dual writes from the app.', on: ['cdc', 'ix'], dots: [{ from: 'db', to: 'cdc', kind: 'evt' }, { from: 'cdc', to: 'ix', kind: 'evt' }, { from: 'ix', to: 'es', label: 'index doc', kind: 'evt' }] },
      { title: 'Queries hit the search cluster', text: 'The search API queries Elasticsearch, which fans out to all shards and merges the top results. Results are **near real-time**: about a second behind the DB.', on: ['user', 'es'], dots: [{ from: 'user', to: 'es', label: '"red jacket"' }, { from: 'es', to: 'user', label: 'top 20 ids', kind: 'res' }] }
    ]}
  ],
  how: [
    { name: 'Analysis', text: ['Before indexing, text goes through an analyzer: tokenize, lowercase, remove stop words ("the"), stem or lemmatize, maybe add synonyms. The same analysis runs on the query so words match.'] },
    { name: 'Ranking', text: ['TF-IDF / BM25: a term matters more if it appears often in this document (term frequency) and rarely in others (inverse document frequency). Real systems add freshness, popularity, personalization and learning-to-rank models.'] },
    { name: 'Scaling search', text: ['Split the index into shards (by document), each with replicas. A query goes to all shards (scatter-gather), each returns its top K, a coordinator merges them. More replicas = more query throughput; more shards = more data.'] },
    { name: 'Keeping it in sync', text: ['Feed the index from the database via CDC or outbox events. Expect a short lag. Rebuild the whole index from the DB when mappings change (index to a new copy, then switch an alias).'] },
    { name: 'Autocomplete', text: ['Prefix matching needs special structures: edge n-grams in Elasticsearch, or a trie / precomputed top suggestions per prefix (see the Typeahead case study).'] }
  ],
  compare: { title: 'Where to search', lead: null, head: ['Option', 'Good for', 'Limits'], rows: [
    ['SQL `LIKE \'%x%\'`', 'Tiny tables', 'Full scan; no ranking or stemming'],
    ['Database full-text (PostgreSQL tsvector)', 'Moderate data, simple ranking', 'Harder to scale and tune'],
    ['Elasticsearch / OpenSearch', 'Large text search, facets, logs', 'Separate cluster to run; eventual consistency'],
    ['Managed search (Algolia, etc.)', 'Fast product search with little ops', 'Cost, less control']
  ]},
  say: [
    'Search runs on Elasticsearch next to the main database; the DB stays the source of truth.',
    'Changes flow through CDC into Kafka and an indexer, so search is about a second behind.',
    'The index is sharded by document with two replicas; queries scatter to all shards and merge the top results.',
    'Results are ranked with BM25 plus a popularity boost.'
  ],
  numbers: [
    ['~1 s', 'typical refresh interval (near real-time)'],
    ['10–50 GB', 'common target shard size'],
    ['~10–100 ms', 'typical search query latency']
  ],
  pitfalls: [
    ['Search engine as the database', 'It can lose or lag writes; keep the source of truth in a real database.'],
    ['Dual writes from the app', 'Writing DB and index separately drifts out of sync. Use CDC or an outbox.'],
    ['Too many tiny shards', 'Each shard has overhead; scatter-gather to hundreds of shards is slow.'],
    ['Ignoring the analyzer', 'Mismatched analysis at index and query time means "Running" never matches "run".']
  ],
  seen: [
    ['Wikipedia, GitHub', 'Elasticsearch / OpenSearch for full-text search.'],
    ['Amazon', 'Product search with heavy ranking by relevance, sales and personalization.'],
    ['Logging (ELK stack)', 'Elasticsearch indexing billions of log lines.'],
    ['Lucene', 'The inverted-index library underneath Elasticsearch and Solr.']
  ],
  probe: [
    ['How do you keep the search index consistent with the DB?', ['Stream changes via CDC or outbox into an indexer; make indexing idempotent by document ID and version; periodically reconcile or rebuild from the DB.']],
    ['How does a query run across shards?', ['Coordinator sends it to one copy of every shard; each returns its top K with scores; the coordinator merges and fetches the final documents.']],
    ['How do you change the mapping without downtime?', ['Build a new index in the background from the DB, catch up with recent changes, then switch an alias from old to new.']],
    ['Why is LIKE not enough?', ['No index use with leading wildcards, no stemming, no relevance ranking, no typo tolerance.']]
  ],
  checklist: [
    'Explain an inverted index and posting lists.',
    'Explain how a multi-word query is answered.',
    'Explain how search stays in sync with the database.',
    'Explain how a sharded search cluster answers a query.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-sync', title: 'Out of sync', ask: 'The app writes to PostgreSQL and then to Elasticsearch. Some products never show up in search. Fix?', options: [
        ['Feed Elasticsearch from the DB change stream (CDC/outbox) with an idempotent indexer', true, 'Every committed change reaches the index, even after crashes.'],
        ['Write to Elasticsearch first', false, 'Then search may show products that failed to save.'],
        ['Make Elasticsearch the only database', false, 'Not a reliable system of record.'],
        ['Add more Elasticsearch replicas', false, 'Replicas do not fix missing writes.']
      ]},
      { id: 'mcq-struct', title: 'Data structure', ask: 'What structure makes keyword search fast?', options: [
        ['Inverted index: word → list of documents', true, 'Each query term is a lookup.'],
        ['B-tree on the text column', false, 'Cannot find words in the middle of text.'],
        ['Hash map: document → words', false, 'That is the forward direction; you would scan all docs.'],
        ['Bloom filter', false, 'Answers "maybe present", not which documents.']
      ]},
      { id: 'mcq-rank', title: 'Ranking', ask: 'Why does BM25 score "jacket" higher than "the" for a document?', options: [
        ['Rare words across the collection carry more weight (IDF)', true, '"the" appears everywhere so it tells you nothing.'],
        ['Longer words score higher', false, 'Length of the word is not the rule.'],
        ['Alphabetical order', false, 'Unrelated.'],
        ['Because "jacket" is a noun', false, 'BM25 does not know grammar.']
      ]}
    ],
    order: [
      { id: 'ord-index', title: 'Indexing a document', ask: 'Order the steps from document to searchable.', steps: ['Tokenize the text into words', 'Normalize: lowercase, remove stop words, stem', 'Add the document ID to each word\'s posting list', 'Refresh so the new segment becomes searchable'], extra: ['Sort documents alphabetically by title'] }
    ],
    fill: [
      { id: 'fill-inv', title: 'Define it', text: 'An [[inverted index|inverted-index]] maps each [[word|term|token]] to the list of [[documents|docs]] that contain it.' }
    ]
  }
});
})();
