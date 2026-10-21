(function(){
var J = String.raw;
// Same bucket math as java.util.HashMap for Integer keys: spread the hash, then mask by (capacity - 1).
function spread(k){ var h = k | 0; return (h ^ (h >>> 16)) | 0; }
function idx(k, cap){ return spread(k) & (cap - 1); }
function mk(cap){ var t = []; for (var i = 0; i < cap; i++) t.push([]); return { t: t, size: 0 }; }
// Resize keeps each chain's relative order, like Java's lo/hi split.
function resize(s){
  var cap = s.t.length * 2, t = [];
  for (var i = 0; i < cap; i++) t.push([]);
  s.t.forEach(function(ch){ ch.forEach(function(e){ t[idx(e[0], cap)].push(e); }); });
  s.t = t;
}
function find(s, k){ var b = idx(k, s.t.length), ch = s.t[b]; for (var j = 0; j < ch.length; j++) if (ch[j][0] === k) return { b: b, j: j }; return { b: b, j: -1 }; }
function view(s, hl, name){
  var cap = s.t.length, rows = s.t.map(function(ch, b){
    return ch.map(function(e, j){
      var c = '';
      if (hl.b === b){ if (hl.j === j) c = hl.c || 'on-hit'; else if (hl.walk && j < hl.j) c = 'on-a'; else if (hl.walk && hl.j === -1) c = 'on-a'; }
      if (hl.newB === b && hl.newJ === j) c = 'on-hit new';
      return { t: e[0] + '=' + e[1], cls: c };
    });
  });
  var rc = {}; if (hl.b !== undefined) rc[hl.b] = hl.rowc || 'on-a';
  return { type: 'buckets', name: name || 'table[]  size ' + s.size + ' · capacity ' + cap + ' · resize when size > ' + (cap * 3 / 4), rows: rows, rowCls: rc };
}
function how(k, cap){ var h = spread(k); return '`hash(' + k + ')` = ' + h + ', `' + h + ' & ' + (cap - 1) + '` = **bucket ' + idx(k, cap) + '**'; }
function doPut(s, k, v, java){
  var f = find(s, k), cap = s.t.length;
  if (f.j >= 0){ var old = s.t[f.b][f.j][1]; s.t[f.b][f.j][1] = v; return { java: java, ret: old, hl: { b: f.b, j: f.j, walk: true }, msg: how(k, cap) + '. Key already there: value ' + old + ' replaced by **' + v + '**. Size stays ' + s.size + '.' }; }
  var coll = s.t[f.b].length;
  s.t[f.b].push([k, v]); s.size++;
  var msg = how(k, cap) + '.' + (coll ? ' **Collision** with ' + coll + ' key(s): appended to the chain.' : ' Empty bucket: stored directly.');
  if (s.size > cap * 3 / 4){
    resize(s);
    var g = find(s, k);
    return { java: java, ret: 'null', hl: { newB: g.b, newJ: g.j, b: g.b }, msg: msg + ' Size ' + s.size + ' > ' + (cap * 3 / 4) + ', so the table **doubled to ' + s.t.length + '** and every key was re-bucketed.' };
  }
  return { java: java, ret: 'null', hl: { newB: f.b, newJ: s.t[f.b].length - 1, b: f.b, rowc: coll ? 'on-r' : 'on-a' }, msg: msg };
}

registerStructure({
  slug: 'hashmap', order: 7, group: 'hash', title: 'HashMap',
  oneLiner: 'Find a value by its key in O(1) on average. The key\'s `hashCode()` is turned into an array index (a **bucket**), so Java jumps straight to the right slot instead of searching.',
  legend: [['a', 'bucket checked'], ['hit', 'found / written'], ['r', 'collision']],
  compare: { access: 'O(1) by key', search: 'O(1) avg', insert: 'O(1) avg', remove: 'O(1) avg', ordered: 'no order', space: 'O(n) + table', java: 'HashMap', note: 'key → value' },
  idea: [
    'Inside a `HashMap` is an ordinary array of **buckets**. To store a key, Java computes `key.hashCode()`, mixes its bits, and keeps only the low bits: `hash & (capacity - 1)`. That number is the bucket index.',
    'Looking the key up later does the same math and jumps to the same bucket. No scanning of the whole map: O(1).',
    'Two different keys can land in the same bucket. That is a **collision**. The bucket then holds a small chain of entries, and Java compares keys with `equals` along the chain. Short chains keep it fast.',
    'When the map gets more than **75% full** (load factor 0.75), the array doubles and every entry is placed again. That keeps chains short. (If one chain still grows past 8, Java turns it into a small red-black tree.)'
  ],
  anatomy: {
    title: 'Buckets and chains',
    panels: [{ type: 'buckets', name: 'capacity 8: key → hash & 7', rows: [[{ t: '8=a' }, { t: '16=b', cls: 'on-r' }], [], [{ t: '2=c' }], [], [{ t: '12=d' }], [], [], [{ t: '7=e' }]], rowCls: { 0: 'on-r' } }],
    notes: [
      '8 and 16 both end in binary `000`, so both go to bucket 0: a collision, chained one after the other.',
      'For an `Integer`, `hashCode()` is the number itself. For a `String`, it is computed from all its characters.',
      'Capacity is always a power of two, so `hash & (capacity - 1)` is the same as `hash % capacity`, only faster.'
    ]
  },
  demo: {
    title: 'put, collide, resize',
    sub: 'Capacity 4 (threshold 3). Put keys 1, 5, 2, then 9. Watch 1, 5 and 9 collide, and the resize pull them apart.',
    code: [
      'int i = hash(key) & (table.length - 1);',
      'for (Node e = table[i]; e != null; e = e.next)',
      '    if (e.key.equals(key)) { e.value = value; return; }',
      'append new Node(key, value) to table[i];',
      'if (++size > table.length * 0.75) resize();   // double + rehash'
    ],
    steps: function(){
      var s = mk(4), out = [];
      out.push({ panels: [view(s, {})], line: null, vars: { size: 0, capacity: 4 }, msg: 'Four empty buckets. The map will resize when size goes above 4 × 0.75 = 3.' });
      [[1, 'a'], [5, 'b'], [2, 'c'], [9, 'd']].forEach(function(kv){
        var k = kv[0], b = idx(k, s.t.length), coll = s.t[b].length > 0;
        out.push({ panels: [view(s, { b: b, rowc: coll ? 'on-r' : 'on-a' })], line: 0, vars: { key: k, bucket: b }, msg: how(k, s.t.length) + '.' + (coll ? ' Bucket ' + b + ' is not empty: **collision**. Walk the chain comparing keys with `equals`.' : ' Bucket is empty.') });
        s.t[b].push([k, kv[1]]); s.size++;
        out.push({ panels: [view(s, { newB: b, newJ: s.t[b].length - 1, b: b })], line: 3, vars: { key: k, size: s.size }, msg: 'No equal key found, so a new entry `' + k + '=' + kv[1] + '` is added ' + (coll ? 'to the end of the chain.' : 'to the bucket.') });
      });
      var before = view(s, {}, 'before: capacity 4');
      resize(s);
      out.push({ panels: [before, view(s, {}, 'after: capacity 8')], line: 4, vars: { size: s.size, capacity: 8 }, msg: 'Size 4 > 3, so the table doubles to 8 and every key is placed again with `& 7`. 1 and 9 stay together (both end in `001`), but 5 moves to bucket 5. Chains got shorter.' });
      var f = find(s, 9);
      out.push({ panels: [view(s, { b: f.b, j: f.j, walk: true })], line: [0, 1, 2], ok: true, vars: { key: 9, bucket: f.b, compared: f.j + 1 }, msg: '`get(9)`: jump to bucket ' + f.b + ', compare 2 keys, found. On average a chain has about one entry, so lookups are **O(1)**.' });
      return out;
    }
  },
  play: {
    title: 'HashMap playground',
    hint: 'Integer keys in `new HashMap<>(8)`. The bucket math is exactly Java\'s. Try keys 3, 11 and 19: all land in bucket 3. Add more than 6 entries to trigger a resize.',
    inputs: [{ ph: 'key', type: 'number' }, { ph: 'value', type: 'number' }],
    setup: 'Map<Integer, Integer> map = new HashMap<>(8);',
    start: 'Eight empty buckets. Threshold = 8 × 0.75 = 6.',
    init: function(){ return mk(8); },
    ops: [
      { id: 'put', label: 'put(k, v)', args: 2, cost: 'O(1)', run: function(s, k, v){ return doPut(s, k, v, 'map.put(' + k + ', ' + v + ');'); } },
      { id: 'get', label: 'get(k)', args: 1, cost: 'O(1)', run: function(s, k){
        var f = find(s, k);
        if (f.j < 0) return { java: 'map.get(' + k + ');', ret: 'null', hl: { b: f.b, j: -1, walk: true }, msg: how(k, s.t.length) + '. Checked ' + s.t[f.b].length + ' key(s) there, no match: returns `null`.' };
        return { java: 'map.get(' + k + ');', ret: s.t[f.b][f.j][1], hl: { b: f.b, j: f.j, walk: true }, ok: true, msg: how(k, s.t.length) + '. Compared ' + (f.j + 1) + ' key(s) in the chain, found it.' };
      } },
      { id: 'has', label: 'containsKey(k)', args: 1, cost: 'O(1)', run: function(s, k){
        var f = find(s, k);
        return { java: 'map.containsKey(' + k + ');', ret: f.j >= 0, hl: { b: f.b, j: f.j, walk: true }, ok: f.j >= 0, msg: how(k, s.t.length) + '. Only that one bucket is searched.' };
      } },
      { id: 'rm', label: 'remove(k)', args: 1, cost: 'O(1)', run: function(s, k){
        var f = find(s, k);
        if (f.j < 0) return { java: 'map.remove(' + k + ');', ret: 'null', hl: { b: f.b }, msg: 'Key ' + k + ' is not in bucket ' + f.b + '. Nothing removed.' };
        var v = s.t[f.b].splice(f.j, 1)[0][1]; s.size--;
        return { java: 'map.remove(' + k + ');', ret: v, hl: { b: f.b }, msg: 'Unlinked `' + k + '=' + v + '` from bucket ' + f.b + '. The table never shrinks.' };
      } },
      { id: 'merge', label: 'merge(k, 1, sum)', args: 1, cost: 'O(1)', run: function(s, k){
        var f = find(s, k);
        if (f.j >= 0){ s.t[f.b][f.j][1]++; return { java: 'map.merge(' + k + ', 1, Integer::sum);', ret: s.t[f.b][f.j][1], hl: { b: f.b, j: f.j, walk: true }, msg: 'Key exists: value + 1 = **' + s.t[f.b][f.j][1] + '**. This is the one-line counter.' }; }
        var r = doPut(s, k, 1, 'map.merge(' + k + ', 1, Integer::sum);');
        r.ret = 1; r.msg += ' New key, so `merge` stored 1.';
        return r;
      } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 5; i++) o.push(['put', rnd(0, 40), rnd(1, 9)]); return o; },
    view: function(s, hl){ return [view(s, hl)]; }
  },
  ops: [
    ['Put / update', 'map.put(k, v)', 'O(1) average', 'Hash to a bucket, check its short chain, write.'],
    ['Get', 'map.get(k), getOrDefault(k, d)', 'O(1) average', 'Same bucket math, compare a few keys.'],
    ['Contains key', 'map.containsKey(k)', 'O(1) average', 'A `get` that only reports found / not found.'],
    ['Remove', 'map.remove(k)', 'O(1) average', 'Unlink one entry from its chain.'],
    ['Contains value', 'map.containsValue(v)', 'O(n)', 'Values are not hashed: every entry is checked.'],
    ['Worst case lookup', 'many keys in one bucket', 'O(log n)', 'Long chains become red-black trees (Java 8+). Before that it was O(n).'],
    ['Resize', 'automatic at 75% full', 'O(n)', 'Rare: capacity doubles, so it averages out to O(1) per put.'],
    ['Iterate', 'map.entrySet()', 'O(n + capacity)', 'Visits every bucket, including empty ones.']
  ],
  when: ['count occurrences', 'two sum / complement lookup', 'group by a key', 'cache computed results (memo)', 'map id → object', 'prefix sum → count', 'seen before?'],
  whenNot: [
    ['Keys in sorted order, or floor / ceiling', 'TreeMap', 'bst-treemap'],
    ['Remember insertion order / LRU', 'LinkedHashMap', 'linkedhashmap'],
    ['Only keys, no values', 'HashSet', 'hashset'],
    ['Keys are small ints (0..n) or chars', '`int[]` counts (faster, no boxing)', 'array']
  ],
  classes: [
    ['HashMap<K, V>', 'Default. No order guarantee. Allows one `null` key.'],
    ['LinkedHashMap<K, V>', 'Same speed, iterates in insertion (or access) order.'],
    ['TreeMap<K, V>', 'Sorted keys, O(log n) operations, floor/ceiling queries.'],
    ['ConcurrentHashMap<K, V>', 'Safe to use from many threads at once.']
  ],
  api: [
    { name: 'Basics', code: J`Map<String, Integer> ages = new HashMap<>();
ages.put("ana", 31);
ages.put("bo", 25);
ages.put("ana", 32);                      // same key: value replaced
System.out.println(ages.get("ana") + " " + ages.get("zed"));
System.out.println(ages.containsKey("bo") + " " + ages.size());
System.out.println(ages.getOrDefault("zed", 0));
ages.remove("bo");
System.out.println(ages);`, out: `32 null
true 2
0
{ana=32}` },
    { name: 'Counting', code: J`Map<Character, Integer> count = new HashMap<>();
for (char c : "banana".toCharArray()) count.merge(c, 1, Integer::sum);
System.out.println(count);
Map<String, Integer> words = new HashMap<>();
for (String w : "to be or not to be".split(" ")) words.put(w, words.getOrDefault(w, 0) + 1);
System.out.println(words.get("to") + " " + words.get("be") + " " + words.get("or"));`, out: `{a=3, b=1, n=2}
2 2 1`, note: '`merge(k, 1, Integer::sum)` means "put 1, or add 1 to what is there". `getOrDefault` does the same in two steps.' },
    { name: 'Group by key', code: J`Map<String, List<String>> groups = new HashMap<>();
for (String w : new String[]{"eat", "tea", "tan", "ate", "nat"}) {
    char[] cs = w.toCharArray();
    Arrays.sort(cs);
    groups.computeIfAbsent(new String(cs), k -> new ArrayList<>()).add(w);
}
System.out.println(groups.get("aet") + " " + groups.get("ant") + " " + groups.size());`, out: `[eat, tea, ate] [tan, nat] 2`, note: '`computeIfAbsent` creates the list the first time a key is seen and returns it every time.' },
    { name: 'Iterate', code: J`Map<String, Integer> m = new HashMap<>();
m.put("dog", 1);
m.put("cat", 2);
m.put("bird", 3);
for (Map.Entry<String, Integer> e : m.entrySet())
    System.out.println(e.getKey() + " -> " + e.getValue());
int total = 0;
for (int v : m.values()) total += v;
System.out.println("keys " + m.keySet().size() + ", total " + total);`, out: `cat -> 2
bird -> 3
dog -> 1
keys 3, total 6`, note: 'The order follows the buckets, not the order you inserted. Never rely on it; use `LinkedHashMap` or `TreeMap` when order matters.' },
    { name: 'Two sum', code: J`int[] nums = {2, 7, 11, 15};
int target = 18;
Map<Integer, Integer> seen = new HashMap<>();        // value -> index
for (int i = 0; i < nums.length; i++) {
    Integer j = seen.get(target - nums[i]);
    if (j != null) { System.out.println("[" + j + ", " + i + "]"); break; }
    seen.put(nums[i], i);
}`, out: `[1, 2]`, note: 'Instead of a second loop to find the partner (O(n²)), ask the map in O(1). Total O(n).' },
    { name: 'The hash math', code: J`String key = "cat";
int h = key.hashCode();
int spread = h ^ (h >>> 16);              // mix high bits into low bits
int index = spread & (16 - 1);            // a table of 16 buckets
System.out.println(h + " -> bucket " + index);
System.out.println("Aa".hashCode() + " " + "BB".hashCode());   // a real collision`, out: `98262 -> bucket 7
2112 2112`, note: 'This is what `HashMap` does on every `put` and `get`. "Aa" and "BB" are different keys with the same hash, so they share a bucket and `equals` tells them apart.' }
  ],
  build: {
    intro: 'A small int → int hash map with chaining and doubling. Real `HashMap` is the same idea with generic keys, `equals`, and tree bins for very long chains.',
    code: J`class IntHashMap {
    private static class Node {
        final int key;
        int val;
        Node next;
        Node(int key, int val, Node next) { this.key = key; this.val = val; this.next = next; }
    }
    private Node[] table = new Node[8];
    private int size = 0;

    private int index(int key, int n) {
        int h = Integer.hashCode(key);
        h ^= (h >>> 16);                  // mix high bits into low bits
        return h & (n - 1);               // n is a power of two
    }

    void put(int key, int val) {
        int i = index(key, table.length);
        for (Node e = table[i]; e != null; e = e.next)
            if (e.key == key) { e.val = val; return; }        // update
        table[i] = new Node(key, val, table[i]);              // add at chain front
        if (++size > table.length * 3 / 4) resize();
    }

    Integer get(int key) {
        for (Node e = table[index(key, table.length)]; e != null; e = e.next)
            if (e.key == key) return e.val;
        return null;
    }

    boolean remove(int key) {
        int i = index(key, table.length);
        Node prev = null;
        for (Node e = table[i]; e != null; prev = e, e = e.next) {
            if (e.key != key) continue;
            if (prev == null) table[i] = e.next; else prev.next = e.next;
            size--;
            return true;
        }
        return false;
    }

    int size() { return size; }
    int capacity() { return table.length; }

    private void resize() {
        Node[] old = table;
        table = new Node[old.length * 2];
        for (Node head : old)
            for (Node e = head; e != null; e = e.next) {
                int i = index(e.key, table.length);
                table[i] = new Node(e.key, e.val, table[i]);
            }
    }
}`,
    notes: [
      ['index()', 'Hash, mix, mask. Same three steps as `java.util.HashMap`.'],
      ['put checks first', 'Walk the chain: if the key exists, update it. Only otherwise add a node, so keys stay unique.'],
      ['Chain front vs back', 'This version adds at the front (simplest). Java appends at the back; either works.'],
      ['Load factor 3/4', 'Resizing at 75% full keeps the average chain under one entry.']
    ],
    demo: J`IntHashMap m = new IntHashMap();
for (int k = 0; k < 10; k++) m.put(k * 8, k);    // 0, 8, 16... all hit bucket 0 at first
m.put(16, 99);
System.out.println(m.get(16) + " " + m.get(72) + " " + m.get(5));
System.out.println(m.remove(8) + " " + m.remove(8) + " size " + m.size() + " capacity " + m.capacity());`,
    out: `99 9 null
true false size 9 capacity 16`
  },
  gotchas: [
    ['Unboxing a missing value', '`int c = map.get(k);` throws `NullPointerException` when `k` is missing.', '`map.getOrDefault(k, 0)`.'],
    ['equals without hashCode', 'A custom key class that overrides only `equals` lands in a random bucket: `get` fails to find equal keys.', 'Override both, or use a `record` (does it for you).'],
    ['Changing a key after put', 'A mutable key (like a `List`) that changes gets a new hash; the entry is now lost in the wrong bucket.', 'Use immutable keys: `String`, `Integer`, records, `List.of(...)`.'],
    ['Relying on order', '`HashMap` iteration order looks stable but can change after a resize or with other keys.', '`LinkedHashMap` (insertion order) or `TreeMap` (sorted).'],
    ['== on Integer values', '`map.get(a) == map.get(b)` compares objects; fails above 127.', '`.equals(...)` or `Objects.equals(...)`.'],
    ['Removing while iterating', '`map.remove` inside a for-each over `keySet()` throws `ConcurrentModificationException`.', '`map.entrySet().removeIf(e -> …)` or an iterator.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-twosum', title: 'Two sum', ask: 'Look for the complement before storing the current number.', code: J`int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new [[HashMap<>()]];
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        if (seen.[[containsKey(need)]]) return new int[]{seen.[[get(need)]], i};
        seen.[[put(nums[i], i)]];
    }
    return new int[0];
}`, test: 'System.out.println(Arrays.toString(new Sol().twoSum(new int[]{3, 2, 4}, 6)));', out: '[1, 2]' },
      { id: 'fb-anagrams', title: 'Group anagrams', ask: 'Sorted letters make the key. One list per key.', code: J`List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> map = new HashMap<>();
    for (String s : strs) {
        char[] cs = s.toCharArray();
        Arrays.[[sort(cs)]];
        String key = [[new String(cs)|String.valueOf(cs)]];
        map.[[computeIfAbsent]](key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(map.[[values()]]);
}`, test: 'List<List<String>> g = new Sol().groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"}); g.sort(Comparator.comparing(l -> l.get(0))); System.out.println(g);', out: '[[bat], [eat, tea, ate], [tan, nat]]' }
    ],
    order: [
      { id: 'od-uniq', title: 'First unique character',
        ideaSteps: ['Count every character with a map.', 'Walk the string again from the left.', 'Return the first index whose count is 1.', 'If none, return -1.'],
        lines: [
          'int firstUniqChar(String s) {',
          '    Map<Character, Integer> count = new HashMap<>();',
          '    for (char c : s.toCharArray()) count.merge(c, 1, Integer::sum);',
          '    for (int i = 0; i < s.length(); i++) {',
          '        if (count.get(s.charAt(i)) == 1) return i;',
          '    }',
          '    return -1;',
          '}'
        ],
        extra: ['    for (char c : count.keySet()) {'],
        check: { wrap: 'sol', test: 'System.out.println(new Sol().firstUniqChar("loveleetcode") + " " + new Sol().firstUniqChar("aabb"));', out: '2 -1' } }
    ]
  },
  patterns: ['hashing', 'prefix-sum', 'sliding-window', 'dp'],
  patternWhy: {
    hashing: 'Counting, complements and grouping all live in a HashMap.',
    'prefix-sum': '"Subarray sum = k" stores prefix sum → count.',
    'sliding-window': 'Windows track character counts in a map.',
    dp: 'Memoization caches results by state in a map.'
  },
  problems: [['1', 'Two Sum'], ['49', 'Group Anagrams'], ['387', 'First Unique Character in a String'], ['560', 'Subarray Sum Equals K'], ['128', 'Longest Consecutive Sequence'], ['706', 'Design HashMap']]
});
})();
