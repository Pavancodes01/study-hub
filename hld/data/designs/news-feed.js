(function(){
var D = { w: 880, h: 380, nodes: [
  { id: 'a', label: 'Author', kind: 'client', x: 70, y: 90 },
  { id: 'r', label: 'Reader', kind: 'client', x: 70, y: 290 },
  { id: 'post', label: 'Post service', kind: 'service', x: 260, y: 90 },
  { id: 'pdb', label: 'Posts DB', kind: 'db', x: 260, y: 220, w: 110 },
  { id: 'q', label: 'Kafka', sub: 'new posts', kind: 'queue', x: 460, y: 90 },
  { id: 'fan', label: 'Fan-out workers', kind: 'worker', x: 650, y: 90, w: 140 },
  { id: 'graph', label: 'Follow graph', sub: 'who follows whom', kind: 'db', x: 805, y: 200, w: 130 },
  { id: 'fc', label: 'Feed cache', sub: 'Redis: user → post ids', kind: 'cache', x: 650, y: 290, w: 150 },
  { id: 'feed', label: 'Feed service', kind: 'service', x: 280, y: 330 }
], edges: [['a', 'post'], ['post', 'pdb'], ['post', 'q'], ['q', 'fan'], ['fan', 'graph'], ['fan', 'fc'], ['r', 'feed'], ['feed', 'fc'], ['feed', 'pdb']] };

registerDesign({
  slug: 'news-feed', order: 6, title: 'News feed',
  one: 'Show each user the latest posts from people they follow. The core decision: ==build feeds when posts are written (push) or when feeds are read (pull)==, and how to handle celebrities.',
  questions: ['How many users, and average/max followers?', 'Chronological or ranked feed?', 'Read:write ratio for feeds vs posts?', 'Media in posts? How fresh must the feed be?', 'Edits and deletes need to vanish from feeds?'],
  reqs: {
    func: ['Create a post (text, media links)', 'Get my home feed, newest first, paginated', 'Follow / unfollow'],
    nonfunc: ['Feed load p99 < 200 ms', 'New post visible to followers within seconds', 'Highly available reads; eventual consistency OK', '300M daily users'],
    mvp: ['post', 'follow', 'chronological feed', 'cursor pagination'],
    later: ['ranking model', 'ads', 'comments and likes in feed', 'stories']
  },
  estimate: {
    lead: 'Feed reads dominate; fan-out multiplies writes.',
    assume: ['300M daily users', '5 feed loads per user per day', '0.5 posts per user per day', 'average 200 followers; some users have 50M'],
    rows: [
      ['Feed reads', '300M × 5 ÷ 86,400', '**~17k/s** (peak ~50k/s)'],
      ['Posts', '300M × 0.5 ÷ 86,400', '**~1.7k/s**'],
      ['Fan-out writes (push)', '1.7k × 200', '**~350k feed inserts/s**'],
      ['Feed cache', '300M × 500 ids × 8 B', '**~1.2 TB** of post IDs']
    ],
    so: 'Push makes reads trivial but costs ~350k writes/s, and a 50M-follower celebrity post would be 50M writes. That is why big systems use a hybrid.'
  },
  apiLead: null,
  api: [
    ['POST', '/v1/posts', 'Create a post. Returns 201 with post ID.', '{ "text": "Hello", "mediaIds": ["m_91"] }'],
    ['GET', '/v1/feed?cursor=…&limit=20', 'Home feed page with next cursor.'],
    ['POST', '/v1/users/{id}/follow', 'Follow a user.']
  ],
  dataLead: null,
  data: [
    { name: 'posts', store: 'sharded by post_id (Cassandra/MySQL)', cols: [['post_id', 'Snowflake ID', 'Time-sortable'], ['author_id', 'string', 'Also indexed for profile pages'], ['text, media', 'json', 'Content']] },
    { name: 'follows', store: 'graph-friendly store, sharded by user', cols: [['follower_id', 'string', 'Who follows'], ['followee_id', 'string', 'Who is followed'], ['created_at', 'timestamp', 'Ordering']] },
    { name: 'feed', store: 'Redis list per user', cols: [['key', 'feed:{user_id}', 'One list per reader'], ['value', 'post IDs', 'Newest first, capped at ~500'], ['ttl', 'days', 'Inactive users\' feeds expire']] }
  ],
  hld: [
    '**Write path (push / fan-out on write):** a new post is stored, then an event goes to Kafka. Fan-out workers look up the author\'s followers and prepend the post ID to each follower\'s cached feed list.',
    '**Read path:** the feed service reads the list of post IDs from the feed cache, then fetches post bodies (cached) and returns a page.',
    '**Celebrities (pull / fan-out on read):** for authors with millions of followers, skip fan-out. At read time, merge the cached feed with recent posts from the celebrities the reader follows.',
    'Only active users get pushed feeds; inactive users\' feeds are rebuilt on their next visit.'
  ],
  flows: [
    { name: 'Build it up', title: 'From a slow query to a hybrid feed', diagram: D, progressive: true, steps: [
      { title: 'Pull on every read', add: ['r', 'feed', 'pdb', 'graph'], text: 'Naive: on every feed load, get the people I follow, query their recent posts, merge and sort. Fine at small scale; at 50k feeds/s with 200 follows each, far too slow.', on: ['feed', 'pdb'], edges: ['feed-pdb'], dots: [{ from: 'r', to: 'feed' }, { from: 'feed', to: 'pdb', label: '200 queries', kind: 'err' }] },
      { title: 'Posts flow through Kafka', add: ['a', 'post', 'q'], text: 'Posting stores the post and emits an event. The author gets a response immediately.', on: ['post', 'q'], dots: [{ from: 'a', to: 'post', label: 'POST' }, { from: 'post', to: 'pdb', label: 'save' }, { from: 'post', to: 'q', label: 'posted', kind: 'evt' }] },
      { title: 'Fan-out on write', add: ['fan', 'fc'], text: 'Workers fetch the author\'s followers and push the post ID onto each follower\'s feed list in Redis.', on: ['fan', 'fc'], dots: [{ from: 'q', to: 'fan', kind: 'evt' }, { from: 'fan', to: 'graph', label: 'followers' }, { from: 'fan', to: 'fc', label: 'LPUSH ×200', kind: 'evt' }] },
      { title: 'Cheap reads', text: 'Loading a feed is now one list read plus a multi-get of post bodies: a few milliseconds.', on: ['feed', 'fc'], dots: [{ from: 'r', to: 'feed' }, { from: 'feed', to: 'fc', label: 'LRANGE 0 19' }, { from: 'fc', to: 'feed', label: '20 ids', kind: 'res' }] },
      { title: 'The celebrity problem', text: 'A star with 50M followers posts: 50M list writes, minutes of lag, and a hot Kafka partition.', bad: ['fan'], anno: [{ node: 'fan', text: '50M writes for 1 post', dy: -50 }] },
      { title: 'Hybrid', text: 'Skip fan-out for celebrities. At read time, merge the cached feed with the latest posts of followed celebrities (few, and cached). Push for most, pull for few.', on: ['feed', 'fc', 'pdb'], dots: [{ from: 'feed', to: 'fc', label: 'my list' }, { from: 'feed', to: 'pdb', label: 'celebrity posts' }] }
    ]}
  ],
  deep: [
    { name: 'Push vs pull vs hybrid', text: ['Push (fan-out on write): fast reads, expensive writes, wasted work for inactive users, celebrity problem. Pull (fan-out on read): cheap writes, slow reads. Hybrid: push for normal authors to active followers, pull for celebrities. This is the expected answer.'] },
    { name: 'Ranking', text: ['Fetch a few hundred candidate posts (from the cached feed and celebrity pulls), score them with a model (affinity, engagement, freshness), return the top 20. Keep candidate generation and ranking as separate steps.'] },
    { name: 'Pagination and deletes', text: ['Cursor = last seen post ID (Snowflake IDs are time-ordered). Deleted posts stay in feed lists but are filtered out when bodies are fetched (the post is marked deleted).'] }
  ],
  bottlenecks: [['Celebrity fan-out', 'Hybrid: pull for high-follower authors.'], ['Feed cache memory', 'Cap lists at ~500 IDs; only active users.'], ['Hot post bodies', 'Cache post objects; CDN for media.'], ['Fan-out lag', 'Scale workers; partition Kafka by author.']],
  tradeoffs: [
    ['Feed building', 'Hybrid push/pull', 'Fast reads, bounded write cost', 'Two code paths'],
    ['Feed storage', 'Redis lists of IDs', 'Cheap, fast', 'Rebuild needed after loss'],
    ['Consistency', 'Eventual', 'Scales, always available', 'Posts appear a few seconds late'],
    ['Pagination', 'Cursor on post ID', 'Stable under new posts', 'No jumping to page N']
  ],
  probe: [
    ['Push or pull?', ['Hybrid: push to active followers for normal users; pull for celebrities at read time. Explain the 50M-follower case explicitly.']],
    ['How do you handle a user who follows 5,000 accounts?', ['Their pushed feed list is capped; ranking selects from candidates. Pull for celebrities they follow is limited to the top few by affinity.']],
    ['What if the feed cache is lost?', ['Rebuild a user\'s feed on demand by pulling recent posts from followees, then resume pushing. It is a cache, not the source of truth.']],
    ['How do edits and deletes propagate?', ['Feeds store IDs only; bodies are fetched fresh (cached briefly), so edits and deletes show up without rewriting feeds.']]
  ],
  say: ['Feeds are lists of post IDs in Redis, built by fan-out on write.', 'Celebrities are pulled at read time, so one post never causes 50 million writes.', 'Reads are one list fetch plus a multi-get of cached post bodies.', 'Pagination uses a cursor on time-ordered post IDs.'],
  numbers: [['~17k/s', 'feed reads (peak ~50k)'], ['~350k/s', 'fan-out inserts'], ['500', 'IDs per cached feed'], ['~1.2 TB', 'feed cache']],
  checklist: ['Compare push, pull and hybrid fan-out.', 'Explain the celebrity problem with numbers.', 'Draw write and read paths.', 'Explain how ranking fits in.'],
  drills: {
    mcq: [
      { id: 'mcq-celeb', title: 'Celebrity post', ask: 'A user with 40M followers posts. With pure fan-out on write, what happens and what is the fix?', options: [
        ['40M feed writes and long lag; skip fan-out for such users and merge their posts at read time', true, 'The hybrid model.'],
        ['Nothing special; Redis is fast', false, '40M writes still take a long time and hammer the cluster.'],
        ['Disable posting for celebrities', false, 'Not a product.'],
        ['Use pure pull for everyone', false, 'Reads become slow for all users.']
      ]},
      { id: 'mcq-store', title: 'What to cache', ask: 'What should each user\'s feed cache contain?', options: [
        ['A capped list of post IDs, newest first', true, 'Small, and edits/deletes are picked up when bodies are fetched.'],
        ['Full copies of every post body', false, 'Huge memory use and edits must touch millions of copies.'],
        ['Followee IDs only', false, 'That is the follow graph, not a feed.'],
        ['Rendered HTML pages', false, 'Ties cache to UI and wastes memory.']
      ]}
    ],
    order: [{ id: 'ord-feed', title: 'Post to feed', ask: 'Order the push path of a new post.', steps: ['Author creates a post; it is saved', 'Post event is published to Kafka', 'Fan-out worker loads the author\'s followers', 'Worker prepends the post ID to each follower\'s feed list', 'Followers load the feed from the cache'], extra: ['Worker emails every follower the post'] }],
    fill: [{ id: 'fill-feed', title: 'Pitch', text: 'I use [[fan-out on write|push|fanout on write]] for normal users and [[fan-out on read|pull|fanout on read]] for celebrities, merging both when the feed is read.' }],
    palette: { id: 'pal-feed', title: 'Build the board', ask: 'Pick what the news feed needs.', reqs: ['300M daily users, feed p99 < 200 ms', 'Posts visible in seconds', 'Some users have 50M followers'], parts: [
      ['Post service + posts DB', 'must', 'Source of truth for posts.'],
      ['Follow graph store', 'must', 'Needed for fan-out and pulls.'],
      ['Queue + fan-out workers', 'must', 'Push post IDs asynchronously.'],
      ['Feed cache (lists of IDs)', 'must', 'Fast reads.'],
      ['Celebrity pull path', 'must', 'Avoid 50M-write fan-outs.'],
      ['Ranking service', 'good', 'Better feeds; not needed for chronological MVP.'],
      ['Distributed transactions across feeds', 'no', 'Eventual consistency is fine and far cheaper.'],
      ['Full-text search index on feeds', 'no', 'Not a requirement here.']
    ]}
  }
});
})();
