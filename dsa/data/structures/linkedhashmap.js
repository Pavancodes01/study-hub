(function(){
var J = String.raw;
function idx(k, cap){ var h = k | 0; return (h ^ (h >>> 16)) & (cap - 1); }
var CAP = 3;
// State: order = [[key, value], ...] from eldest to newest. Buckets are derived from it.
function views(s, hl, title){
  var keys = s.order.map(function(e){ return e[0]; });
  var cls = {}, marks = [];
  if (keys.length){ marks.push({ i: 0, label: 'eldest', c: 'r' }); marks.push({ i: keys.length - 1, label: 'newest', c: 'l' }); }
  if (hl.moved !== undefined){ var m = keys.indexOf(hl.moved); if (m >= 0) cls[m] = 'on-hit new'; }
  if (hl.read !== undefined){ var r = keys.indexOf(hl.read); if (r >= 0) cls[r] = 'on-a'; }
  var rows = []; for (var b = 0; b < 8; b++) rows.push([]);
  s.order.forEach(function(e){ rows[idx(e[0], 8)].push({ t: e[0] + '=' + e[1], cls: e[0] === hl.moved ? 'on-hit' : (e[0] === hl.read ? 'on-a' : '') }); });
  var rc = {}; if (hl.bucket !== undefined) rc[hl.bucket] = 'on-a';
  var p = [
    { type: 'dlist', name: title || 'access order (doubly linked through every entry)', vals: s.order.map(function(e){ return e[0] + '=' + e[1]; }), marks: marks, cls: cls, nulls: true },
    { type: 'buckets', name: 'hash table (capacity 8) for O(1) lookup', rows: rows, rowCls: rc }
  ];
  if (hl.evicted) p.push({ type: 'refs', name: 'evicted', rows: [{ name: 'removeEldestEntry', val: hl.evicted, cls: 'on-r', note: 'size > capacity, so the eldest goes' }] });
  return p;
}

registerStructure({
  slug: 'linkedhashmap', order: 9, group: 'hash', title: 'LinkedHashMap & LRU cache',
  oneLiner: 'A `HashMap` with a **doubly linked list running through all its entries**. You get O(1) lookup *and* a reliable order: insertion order, or (with one flag) least-recently-used first. That is an LRU cache in five lines.',
  legend: [['r', 'eldest (next to evict)'], ['l', 'newest'], ['hit', 'just moved / added'], ['a', 'looked up']],
  compare: { access: 'O(1) by key', search: 'O(1) avg', insert: 'O(1) avg', remove: 'O(1) avg', ordered: 'insertion or access order', space: 'O(n) + 2 links each', java: 'LinkedHashMap', note: 'map + order' },
  idea: [
    'A plain `HashMap` scatters entries across buckets, so its iteration order is meaningless. `LinkedHashMap` adds `before` and `after` links to every entry, forming one doubly linked list in the order entries were added.',
    'Lookups still go through the hash table: O(1). Iteration follows the list: predictable order, and it never visits empty buckets.',
    'Create it with `accessOrder = true` and every `get` or `put` moves that entry to the **end** of the list. The front is then the **least recently used** entry. Override `removeEldestEntry` to drop the front when the map is too big, and you have an LRU cache.'
  ],
  anatomy: {
    title: 'Two structures sharing the same entries',
    panels: [
      { type: 'dlist', name: 'linked list: eldest → newest', vals: ['7=a', '2=b', '12=c'], marks: [{ i: 0, label: 'head', c: 'r' }, { i: 2, label: 'tail', c: 'l' }], nulls: true },
      { type: 'buckets', name: 'hash table: key & 7', rows: [[], [], [{ t: '2=b' }], [], [{ t: '12=c' }], [], [], [{ t: '7=a' }]] }
    ],
    notes: [
      'Each entry object sits in a bucket chain **and** in the linked list at the same time. No copying.',
      'Find by key: hash table. Find the oldest: `head` of the list. Both O(1).',
      'Moving an entry to the end is 6 reference changes, also O(1).'
    ]
  },
  demo: {
    title: 'LRU cache with capacity 3',
    sub: 'put 1, 2, 3, then get(1), then put 4. The least recently used key is evicted, not the oldest inserted.',
    code: [
      'Map<Integer, String> cache = new LinkedHashMap<>(16, 0.75f, true) {',
      '    protected boolean removeEldestEntry(Map.Entry<Integer, String> e) {',
      '        return size() > 3;',
      '    }',
      '};',
      'cache.put(k, v);   // add at the end, maybe evict the head',
      'cache.get(k);      // move k to the end'
    ],
    steps: function(){
      var s = { order: [] }, out = [];
      [[1, 'a'], [2, 'b'], [3, 'c']].forEach(function(kv){
        s.order.push(kv);
        out.push({ panels: views(s, { moved: kv[0], bucket: idx(kv[0], 8) }), line: 5, vars: { size: s.order.length }, msg: '`put(' + kv[0] + ')`: stored in bucket ' + idx(kv[0], 8) + ' and linked at the end of the list.' });
      });
      var e = s.order.shift(); s.order.push(e);
      out.push({ panels: views(s, { moved: 1, bucket: 1 }), line: 6, vars: { size: 3 }, msg: '`get(1)` finds 1 through the hash table, then **unlinks it and relinks it at the end**. Now 2 is the least recently used.' });
      s.order.push([4, 'd']);
      out.push({ panels: views(s, { moved: 4, bucket: 4 }), line: 5, vars: { size: 4 }, msg: '`put(4)` adds at the end. Size is 4 > 3, so `removeEldestEntry` returns true…' });
      var ev = s.order.shift();
      out.push({ panels: views(s, { evicted: ev[0] + '=' + ev[1] }), line: [1, 2], ok: true, vars: { size: 3 }, msg: '…and Java removes the head: **' + ev[0] + '**. Key 1 survived because we used it recently. Every step was O(1).' });
      return out;
    }
  },
  play: {
    title: 'LRU cache playground',
    hint: 'An access-order `LinkedHashMap` that keeps at most **3** entries. `get` and `put` move a key to the newest end. Watch which key gets evicted.',
    inputs: [{ ph: 'key', type: 'number' }, { ph: 'value', type: 'number' }],
    setup: 'LRU<Integer, Integer> cache = new LRU<>(3);   // LinkedHashMap, accessOrder = true',
    start: 'Empty cache, capacity 3.',
    init: function(){ return { order: [] }; },
    ops: [
      { id: 'put', label: 'put(k, v)', args: 2, cost: 'O(1)', run: function(s, k, v){
        var i = -1; s.order.forEach(function(e, j){ if (e[0] === k) i = j; });
        if (i >= 0){ var e = s.order.splice(i, 1)[0], old = e[1]; e[1] = v; s.order.push(e); return { java: 'cache.put(' + k + ', ' + v + ');', ret: old, hl: { moved: k, bucket: idx(k, 8) }, msg: 'Key ' + k + ' exists: value updated and moved to the **newest** end.' }; }
        s.order.push([k, v]);
        if (s.order.length > CAP){ var ev = s.order.shift(); return { java: 'cache.put(' + k + ', ' + v + ');', ret: 'null', hl: { moved: k, bucket: idx(k, 8), evicted: ev[0] + '=' + ev[1] }, msg: 'Added ' + k + '. Size 4 > 3, so the eldest, **' + ev[0] + '**, was evicted.' }; }
        return { java: 'cache.put(' + k + ', ' + v + ');', ret: 'null', hl: { moved: k, bucket: idx(k, 8) }, msg: 'Added ' + k + ' at the newest end (bucket ' + idx(k, 8) + ').' };
      } },
      { id: 'get', label: 'get(k)', args: 1, cost: 'O(1)', run: function(s, k){
        var i = -1; s.order.forEach(function(e, j){ if (e[0] === k) i = j; });
        if (i < 0) return { java: 'cache.get(' + k + ');', ret: 'null', hl: { bucket: idx(k, 8) }, msg: 'Not in bucket ' + idx(k, 8) + ': a cache **miss**. Order unchanged.' };
        var e = s.order.splice(i, 1)[0]; s.order.push(e);
        return { java: 'cache.get(' + k + ');', ret: e[1], ok: true, hl: { moved: k, bucket: idx(k, 8) }, msg: 'Hit. ' + k + ' moved to the newest end, so it is now the last to be evicted.' };
      } },
      { id: 'peekE', label: 'eldest', cost: 'O(1)', run: function(s){
        if (!s.order.length) return { java: 'cache.firstEntry();', ret: 'null', msg: 'Empty.' };
        var e = s.order[0];
        return { java: 'cache.firstEntry();', ret: e[0] + '=' + e[1], hl: { read: e[0] }, msg: 'The head of the list, **' + e[0] + '**, is next to be evicted. (`firstEntry` does not count as an access.)' };
      } }
    ],
    random: function(s, rnd){ return [['put', rnd(1, 20), rnd(1, 9)], ['put', rnd(1, 20), rnd(1, 9)], ['put', rnd(1, 20), rnd(1, 9)]]; },
    view: function(s, hl){ return views(s, hl); }
  },
  ops: [
    ['Get / put / remove', 'map.get(k), map.put(k, v)', 'O(1) average', 'The hash table finds the entry; relinking is a few pointer writes.'],
    ['Move to newest on access', 'accessOrder = true', 'O(1)', 'Unlink from the list, link at the tail.'],
    ['Evict the eldest', 'removeEldestEntry(…)', 'O(1)', 'The eldest is the list head.'],
    ['First / last entry', 'firstEntry(), lastEntry()', 'O(1)', 'Head and tail of the list (Java 21 `SequencedMap`).'],
    ['Iterate in order', 'for (var e : map.entrySet())', 'O(n)', 'Follows the list, skipping empty buckets.']
  ],
  when: ['LRU cache', 'keep insertion order', 'deterministic output order', 'first non-repeating item', 'dedupe while keeping order (LinkedHashSet)', 'oldest entry in O(1)'],
  whenNot: [
    ['Order does not matter', 'HashMap (a bit less memory)', 'hashmap'],
    ['Sorted by key, range queries', 'TreeMap', 'bst-treemap'],
    ['Evict by smallest value / frequency', 'PriorityQueue or TreeMap', 'heap']
  ],
  classes: [
    ['LinkedHashMap<K, V>', '`new LinkedHashMap<>()` keeps insertion order.'],
    ['new LinkedHashMap<>(16, 0.75f, true)', 'Access order: the base of an LRU cache.'],
    ['LinkedHashSet<E>', 'A set that remembers insertion order.']
  ],
  api: [
    { name: 'Insertion order', code: J`Map<String, Integer> m = new LinkedHashMap<>();
m.put("dog", 1);
m.put("cat", 2);
m.put("bird", 3);
m.put("dog", 9);                  // updating a key does NOT move it
System.out.println(m);
Map<String, Integer> h = new HashMap<>();
h.put("dog", 9);
h.put("cat", 2);
h.put("bird", 3);
System.out.println(h);                   // same puts in a HashMap: bucket order`, out: `{dog=9, cat=2, bird=3}
{cat=2, bird=3, dog=9}` },
    { name: 'Access order', code: J`Map<Integer, String> m = new LinkedHashMap<>(16, 0.75f, true);   // accessOrder = true
m.put(1, "a");
m.put(2, "b");
m.put(3, "c");
m.get(1);                          // touching 1 moves it to the end
System.out.println(m.keySet());`, out: `[2, 3, 1]` },
    { name: 'LRU in 5 lines', code: J`class LRU<K, V> extends LinkedHashMap<K, V> {
    private final int cap;
    LRU(int cap) { super(16, 0.75f, true); this.cap = cap; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > cap; }
}
LRU<Integer, Integer> cache = new LRU<>(2);
cache.put(1, 1);
cache.put(2, 2);
cache.get(1);                      // 1 is now most recent
cache.put(3, 3);                   // over capacity: evicts 2
System.out.println(cache.keySet() + " " + cache.get(2));`, out: `[1, 3] null`, note: '`removeEldestEntry` is called after every `put`. Returning `true` removes the head of the list.' },
    { name: 'Ends (Java 21)', code: J`LinkedHashMap<String, Integer> m = new LinkedHashMap<>();
m.put("a", 1);
m.put("b", 2);
m.put("c", 3);
System.out.println(m.firstEntry() + " " + m.lastEntry());
m.pollFirstEntry();
m.putFirst("z", 0);
System.out.println(m + " " + m.reversed());`, out: `a=1 c=3
{z=0, b=2, c=3} {c=3, b=2, z=0}`, note: 'Java 21 added `SequencedMap`: first/last, poll, `putFirst`/`putLast` and a reversed view.' },
    { name: 'LinkedHashSet', code: J`Set<Character> seen = new LinkedHashSet<>();
for (char c : "mississippi".toCharArray()) seen.add(c);
System.out.println(seen);`, out: `[m, i, s, p]` }
  ],
  build: {
    intro: 'The classic interview version (LeetCode 146): a `HashMap<Integer, Node>` for lookup plus your own doubly linked list with two **sentinel** nodes, so there is never a null check at the ends.',
    code: J`class LRUCache {
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels
    private final int cap;

    LRUCache(int cap) {
        this.cap = cap;
        head.next = tail;
        tail.prev = head;
    }

    int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n);
        addLast(n);                          // most recently used
        return n.val;
    }

    void put(int key, int val) {
        Node n = map.get(key);
        if (n != null) { n.val = val; unlink(n); addLast(n); return; }
        if (map.size() == cap) {
            Node eldest = head.next;          // least recently used
            unlink(eldest);
            map.remove(eldest.key);
        }
        n = new Node(key, val);
        map.put(key, n);
        addLast(n);
    }

    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }

    private void addLast(Node n) {
        n.prev = tail.prev;
        n.next = tail;
        tail.prev.next = n;
        tail.prev = n;
    }
}`,
    notes: [
      ['Sentinels', '`head` and `tail` are dummy nodes that never move. Real entries live between them, so `unlink` never sees `null`.'],
      ['Node stores its key', 'When evicting `head.next`, you need its key to remove it from the map too.'],
      ['Order of unlink + addLast', 'Always unlink first, then add at the end. Doing it the other way corrupts the links.']
    ],
    demo: J`LRUCache c = new LRUCache(2);
c.put(1, 1);
c.put(2, 2);
System.out.print(c.get(1) + " ");      // 1 becomes most recent
c.put(3, 3);                           // evicts 2
System.out.print(c.get(2) + " ");
c.put(4, 4);                           // evicts 1
System.out.println(c.get(1) + " " + c.get(3) + " " + c.get(4));`,
    out: `1 -1 -1 3 4`
  },
  gotchas: [
    ['Insertion order ignores updates', 'In the default mode, `put` on an existing key keeps its old position.', 'Use access order, or `remove` then `put`.'],
    ['Wrong constructor', '`new LinkedHashMap<>(true)` does not exist; the flag is the third argument.', '`new LinkedHashMap<>(16, 0.75f, true)`.'],
    ['get() changes access-order maps', 'In access order, `get` moves entries. Calling it while iterating throws `ConcurrentModificationException`.', 'Collect keys first, or iterate without `get`.'],
    ['Forgetting map.remove on eviction', 'In a hand-built LRU, unlinking the node but leaving it in the map keeps it "alive".', 'Remove from both structures.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-lru', title: 'LRU cache with LinkedHashMap', ask: 'Turn on access order and evict when the size passes the capacity.', wrap: 'top', code: J`class LRUCache extends LinkedHashMap<Integer, Integer> {
    private final int cap;
    LRUCache(int cap) {
        super(16, 0.75f, [[true]]);
        this.cap = cap;
    }
    int get(int key) { return [[getOrDefault(key, -1)|super.getOrDefault(key, -1)]]; }
    void put(int key, int value) { super.[[put]](key, value); }
    @Override
    protected boolean [[removeEldestEntry]](Map.Entry<Integer, Integer> eldest) {
        return [[size() > cap]];
    }
}`, test: 'LRUCache c = new LRUCache(2); c.put(1, 1); c.put(2, 2); System.out.print(c.get(1) + " "); c.put(3, 3); System.out.print(c.get(2) + " "); c.put(4, 4); System.out.println(c.get(1) + " " + c.get(3) + " " + c.get(4));', out: '1 -1 -1 3 4' },
      { id: 'fb-links', title: 'Unlink and add-last with sentinels', ask: '`head` and `tail` are sentinel nodes that are always there. Fill in the pointer moves.', code: J`void unlink(Node n) {
    n.prev.next = [[n.next]];
    n.next.prev = [[n.prev]];
}
void addLast(Node n) {
    n.prev = tail.[[prev]];
    n.next = [[tail]];
    tail.prev.next = n;
    tail.prev = [[n]];
}`, ctx: 'static class Node { int key, val; Node prev, next; Node(int k, int v) { key = k; val = v; } }\nNode head = new Node(0, 0), tail = new Node(0, 0);\n{ head.next = tail; tail.prev = head; }\nString order() { StringBuilder sb = new StringBuilder(); for (Node c = head.next; c != tail; c = c.next) sb.append(c.key); return sb.toString(); }', test: 'Sol s = new Sol(); Sol.Node a = new Sol.Node(1, 1), b = new Sol.Node(2, 2), c = new Sol.Node(3, 3); s.addLast(a); s.addLast(b); s.addLast(c); s.unlink(a); s.addLast(a); System.out.println(s.order());', out: '231' }
    ],
    order: [
      { id: 'od-firstuniq', title: 'First non-repeating character',
        ideaSteps: ['Count characters in a map that **remembers insertion order**.', 'Walk the entries in that order.', 'Return the first key whose count is 1.', 'Return `\'_\'` if there is none.'],
        lines: [
          'char firstUnique(String s) {',
          '    Map<Character, Integer> count = new LinkedHashMap<>();',
          '    for (char c : s.toCharArray()) count.merge(c, 1, Integer::sum);',
          '    for (Map.Entry<Character, Integer> e : count.entrySet()) {',
          '        if (e.getValue() == 1) return e.getKey();',
          '    }',
          "    return '_';",
          '}'
        ],
        extra: ['    Map<Character, Integer> count = new HashMap<>();'],
        check: { wrap: 'sol', test: 'System.out.println(new Sol().firstUnique("leetcode") + " " + new Sol().firstUnique("aabb") + " " + new Sol().firstUnique("swiss"));', out: 'l _ w' } }
    ]
  },
  patterns: ['hashing', 'linked-list'],
  patternWhy: {
    hashing: 'Same O(1) lookup as HashMap, plus a stable order.',
    'linked-list': 'The hand-built LRU is a doubly linked list with sentinels.'
  },
  problems: [['146', 'LRU Cache'], ['387', 'First Unique Character in a String'], ['1429', 'First Unique Number'], ['460', 'LFU Cache']]
});
})();
