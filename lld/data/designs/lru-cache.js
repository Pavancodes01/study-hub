(function(){
var SRC = String.raw`import java.util.*;

class LRUCache<K, V> {
    private class Node {
        K key; V value; Node prev, next;
        Node(K key, V value) { this.key = key; this.value = value; }
    }

    private final int capacity;
    private final Map<K, Node> map = new HashMap<>();          // key -> node: O(1) lookup
    private final Node head = new Node(null, null);            // sentinel: most recent side
    private final Node tail = new Node(null, null);            // sentinel: least recent side

    LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    synchronized V get(K key) {
        Node n = map.get(key);
        if (n == null) return null;
        moveToFront(n);                                        // just used: most recent
        return n.value;
    }

    synchronized void put(K key, V value) {
        Node n = map.get(key);
        if (n != null) { n.value = value; moveToFront(n); return; }
        if (map.size() == capacity) {                          // full: evict least recently used
            Node lru = tail.prev;
            unlink(lru);
            map.remove(lru.key);
            System.out.println("evict " + lru.key);
        }
        n = new Node(key, value);
        map.put(key, n);
        addFront(n);
    }

    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
    private void moveToFront(Node n) { unlink(n); addFront(n); }

    synchronized List<K> order() {                             // most recent first
        List<K> out = new ArrayList<>();
        for (Node n = head.next; n != tail; n = n.next) out.add(n.key);
        return out;
    }
}

class LruDemo {
    public static void main(String[] args) {
        LRUCache<String, Integer> cache = new LRUCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        System.out.println(cache.get("a"));
        cache.put("c", 3);
        System.out.println(cache.get("b"));
        System.out.println(cache.order());
    }
}`;
var dg = { kind: 'class', w: 820, h: 330, classes: [
  { id: 'c', name: 'LRUCache<K, V>', x: 20, y: 30, w: 280, fields: ['- capacity: int', '- map: Map<K, Node>', '- head, tail: Node'], methods: ['+ get(key): V', '+ put(key, value)', '- moveToFront(n)', '- unlink(n)'] },
  { id: 'n', name: 'Node', x: 400, y: 40, w: 200, fields: ['key: K', 'value: V', 'prev, next: Node'], methods: [] },
  { id: 'hm', name: 'HashMap<K, Node>', x: 400, y: 220, w: 220, fields: [], methods: ['+ get(key): Node'] }
], rels: [
  { from: 'c', to: 'n', type: 'composition', fm: '1', tm: '*' },
  { from: 'c', to: 'hm', type: 'composition' },
  { from: 'hm', to: 'n', type: 'association', label: 'points to' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'u', name: 'Client' }, { id: 'c', name: 'LRUCache' }, { id: 'm', name: 'HashMap' }, { id: 'l', name: 'Linked list' }], msgs: [
  { from: 'u', to: 'c', label: 'put("c", 3)', text: 'Cache holds a and b, capacity 2. Order (recent first): a, b.', code: ['synchronized void put(K key, V value) {'] },
  { from: 'c', to: 'm', label: 'get("c")', text: 'Not present, so this is an insert.', code: ['Node n = map.get(key);'] },
  { from: 'c', to: 'l', label: 'tail.prev → "b"', text: 'Full. The node just before `tail` is the least recently used: b.', code: ['if (map.size() == capacity) {', 'Node lru = tail.prev;'] },
  { from: 'c', to: 'm', label: 'remove("b")', text: 'Unlink it from the list and drop it from the map. Both O(1).', code: ['unlink(lru);', 'map.remove(lru.key);'] },
  { from: 'c', to: 'l', label: 'addFront(c)', text: 'The new node goes right after `head`: most recent. Order: c, a.', code: ['map.put(key, n);', 'addFront(n);'] }
] };
registerDesign({
  slug: 'lru-cache', order: 7, title: 'LRU cache',
  one: 'A fixed-size cache that evicts the ==least recently used== entry, with `get` and `put` both in O(1) using a hash map plus a doubly linked list.',
  questions: ['Capacity by item count or by memory size?', 'Should reads also count as "use"? (Yes for LRU.)', 'Thread-safe?', 'TTL expiry as well as LRU?', 'Generic keys and values?'],
  reqs: { func: ['`get(key)` returns the value or null and marks it recently used', '`put(key, value)` inserts or updates', 'When full, evict the least recently used entry'], nonfunc: ['O(1) get and put', 'Thread-safe', 'Generic types'], out: ['TTL', 'size in bytes', 'distributed caching'] },
  entities: [['cache', '`LRUCache<K, V>`', 'API, capacity, eviction'], ['entry', '`Node`', 'Key, value, prev/next links'], ['index', '`HashMap<K, Node>`', 'O(1) find by key'], ['recency order', 'doubly linked list with sentinels', 'O(1) move to front, remove from back']],
  diagramNotes: ['Two structures, each fixing the other\'s weakness: the **map** finds a node in O(1) but has no order; the **list** keeps order with O(1) moves but cannot find a key fast. Map values point at list nodes.', 'Sentinel `head` and `tail` nodes remove all null checks at the ends.'],
  flowNotes: ['A put on a full cache: look up, evict `tail.prev`, insert at the front.'],
  flows: [
    { name: 'Class diagram', title: 'LRU cache structure', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The node', add: ['n'], on: ['n'], text: 'Each entry is a list node with links both ways, so it can unlink itself in O(1).', code: ['private class Node {'] },
      { title: 'The cache', add: ['c'], on: ['c'], rels: ['c-n'], text: 'Sentinel head and tail mark the most and least recent ends.', code: ['private final Node head = new Node(null, null);', 'private final Node tail = new Node(null, null);'] },
      { title: 'The index', add: ['hm'], on: ['hm'], rels: ['c-hm', 'hm-n'], text: 'Key → node, so `get` jumps straight to the node.', code: ['private final Map<K, Node> map = new HashMap<>();'] },
      { title: 'O(1) moves', on: ['c'], text: 'Using an entry = unlink + add at front. Evicting = remove `tail.prev`.', code: ['private void moveToFront(Node n) { unlink(n); addFront(n); }', 'Node lru = tail.prev;'] }
    ]},
    { name: 'Put when full', title: 'Evicting the least recently used', diagram: seq, code: '@main' }
  ],
  patterns: [['Composition', 'Map + list inside the cache', 'Each structure does what it is best at.'], ['Strategy (extension)', 'Eviction policy', 'LRU, LFU, FIFO behind one interface.'], ['Decorator / Proxy (extension)', 'Cache in front of a slow service', 'Same interface as the service.']],
  code: { file: 'LruDemo.java', src: SRC, expect: '1\nevict b\nnull\n[c, a]' },
  concurrency: [['Concurrent get/put corrupt links', 'Methods are synchronized; `get` also writes (moves a node), so even reads need the lock.'], ['Lock contention at scale', 'Shard into N smaller LRU caches by key hash, each with its own lock.'], ['Production use', 'Caffeine or `LinkedHashMap` with access order are battle-tested alternatives.']],
  extensions: [['TTL', 'Store expiry per node; treat expired as missing on get and evict lazily.'], ['LFU', 'Track frequency buckets; swap the eviction policy via a strategy.'], ['Size by bytes', 'Track total weight and evict until under the limit.']],
  probe: [['Why not just a LinkedHashMap?', ['In Java you can: `new LinkedHashMap<>(16, 0.75f, true)` with `removeEldestEntry`. Interviewers usually want the map + doubly linked list to see you understand why it is O(1).']], ['Why doubly linked, not singly?', ['To unlink a node in O(1) you need its previous node. With only next pointers you would have to search for it.']], ['Why does get need a lock?', ['It moves the node to the front, which changes the list. Concurrent moves would corrupt the links.']]],
  say: ['A hash map gives O(1) lookup, and a doubly linked list keeps recency with O(1) moves.', 'Sentinel head and tail remove edge cases.', 'Even `get` mutates the order, so it takes the lock; at scale I would shard the cache.'],
  facts: [['map', 'key → node'], ['list', 'recency order'], ['evict', 'tail.prev'], ['Java', 'LinkedHashMap(access order)']],
  checklist: ['Draw map + list and explain both.', 'Write get and put from memory.', 'Explain why get needs synchronization.'],
  drills: {
    mcq: [{ id: 'mcq-lru', title: 'Data structures', ask: 'Which combination gives O(1) get, put and LRU eviction?', options: [['Hash map + doubly linked list', true, 'Map finds, list orders.'], ['Hash map only', false, 'No order to find the oldest.'], ['Sorted array by time', false, 'Updates are O(n).'], ['Priority queue by timestamp', false, 'Updates are O(log n), and lookups O(n).']] }],
    code: [{ id: 'code-lru', title: 'LinkedHashMap LRU', ask: 'Build an LRU with LinkedHashMap.', run: 'LhmDemo', expect: '[a, c]', code: String.raw`import java.util.*;
class Lru<K, V> extends LinkedHashMap<K, V> {
    private final int cap;
    Lru(int cap) { super(16, 0.75f, [[true]]); this.cap = cap; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > [[cap]]; }
}
class LhmDemo {
    public static void main(String[] args) {
        Lru<String, Integer> c = new Lru<>(2);
        c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3);
        System.out.println(c.[[keySet()]]);
    }
}` }],
    order: [{ id: 'ord-lru', title: 'put on a full cache', ask: 'Order the steps.', steps: ['Look up the key in the map', 'Key missing and cache full: take the node before tail', 'Unlink that node and remove its key from the map', 'Create a node for the new key and put it in the map', 'Add the new node right after head'], extra: ['Scan the whole list for the oldest timestamp'] }],
    classes: { id: 'cls-lru', title: 'Design the LRU cache', reqs: ['O(1) get and put', 'Evict least recently used', 'Thread-safe'], parts: [['LRUCache', 'must', 'API and eviction.'], ['Node with prev/next', 'must', 'O(1) unlink.'], ['HashMap key → node', 'must', 'O(1) lookup.'], ['Head/tail sentinels', 'good', 'No null edge cases.'], ['ArrayList of keys', 'no', 'Removing from the middle is O(n).'], ['TreeMap by access time', 'no', 'O(log n) and needs extra bookkeeping.']] }
  }
});
})();
