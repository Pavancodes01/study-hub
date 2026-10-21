(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
// Same bucket math as java.util.HashSet (it is a HashMap inside) for Integer keys.
function idx(k, cap){ var h = k | 0; return (h ^ (h >>> 16)) & (cap - 1); }
function mk(cap){ var t = []; for (var i = 0; i < cap; i++) t.push([]); return { t: t, size: 0 }; }
function resize(s){
  var cap = s.t.length * 2, t = [];
  for (var i = 0; i < cap; i++) t.push([]);
  s.t.forEach(function(ch){ ch.forEach(function(k){ t[idx(k, cap)].push(k); }); });
  s.t = t;
}
function view(s, hl, name){
  var rows = s.t.map(function(ch, b){
    return ch.map(function(k, j){ return { t: k, cls: hl.b === b ? (hl.j === j ? (hl.c || 'on-hit') : (hl.walk && (hl.j === -1 || j < hl.j) ? 'on-a' : '')) : '' }; });
  });
  var rc = {}; if (hl.b !== undefined) rc[hl.b] = hl.rowc || 'on-a';
  return { type: 'buckets', name: name || 'HashSet buckets  size ' + s.size + ' · capacity ' + s.t.length, rows: rows, rowCls: rc };
}
function where(k, cap){ return '`' + k + '` → bucket ' + idx(k, cap); }

registerStructure({
  slug: 'hashset', order: 8, group: 'hash', title: 'HashSet',
  oneLiner: 'A bag of **unique** items with O(1) "is it in here?". It is literally a `HashMap` that keeps only the keys, so it hashes the same way, collides the same way and resizes the same way.',
  legend: [['a', 'bucket checked'], ['hit', 'found / added'], ['r', 'already there']],
  compare: { access: '—', search: 'O(1) avg', insert: 'O(1) avg', remove: 'O(1) avg', ordered: 'no order', space: 'O(n) + table', java: 'HashSet', note: 'unique keys only' },
  idea: [
    'Open the Java source of `HashSet` and you find one field: a `HashMap<E, Object>`. `add(x)` is `map.put(x, PRESENT)`, where `PRESENT` is one shared dummy object.',
    'So everything from the HashMap page applies: the item\'s `hashCode()` picks a bucket, `equals` resolves collisions, and the table doubles at 75% full.',
    'Because keys in a map are unique, a set never holds duplicates. `add` returns `false` when the item was already there, which makes "have I seen this before?" a one-liner.'
  ],
  anatomy: {
    title: 'A HashMap with the values thrown away',
    panels: [{ type: 'buckets', name: 'HashSet<Integer>, capacity 8', rows: [[{ t: '16' }], [{ t: '9' }], [], [{ t: '3' }, { t: '11' }], [], [], [], [{ t: '7' }]], rowCls: { 3: 'on-a' } }],
    notes: [
      'Each bucket stores only keys. 3 and 11 collide (both `& 7` = 3) and share a chain.',
      'Checking `contains(11)` only looks at bucket 3, not at the other items.',
      'A custom class used as a set item must override **both** `equals` and `hashCode`. A Java `record` does this for you.'
    ]
  },
  demo: {
    title: 'Contains duplicate in one pass',
    sub: 'Walk `[4, 9, 1, 12, 9]`. `add` returns `false` the moment we meet a number already in the set.',
    code: [
      'Set<Integer> seen = new HashSet<>();',
      'for (int x : nums) {',
      '    if (!seen.add(x)) return true;   // was already there',
      '}',
      'return false;'
    ],
    steps: function(){
      var a = [4, 9, 1, 12, 9], s = mk(8), out = [];
      out.push({ panels: [arr(a, [], { name: 'nums' }), view(s, {})], line: 0, vars: {}, msg: 'An empty set with 8 buckets.' });
      for (var i = 0; i < a.length; i++){
        var x = a[i], b = idx(x, 8), j = s.t[b].indexOf(x);
        if (j >= 0){
          out.push({ panels: [arr(a, [{ i: i, label: 'x', c: 'r' }], { name: 'nums' }), view(s, { b: b, j: j, c: 'on-r', walk: true, rowc: 'on-r' })], line: 2, ok: true, vars: { x: x, bucket: b, add: false },
            msg: where(x, 8) + '. ' + x + ' is already in that bucket, so `add` returns **false**: a duplicate. Only one bucket was checked, not the whole set.' });
          break;
        }
        s.t[b].push(x); s.size++;
        out.push({ panels: [arr(a, [{ i: i, label: 'x', c: 'a' }], { name: 'nums' }), view(s, { b: b, j: s.t[b].length - 1 })], line: 2, vars: { x: x, bucket: b, add: true },
          msg: where(x, 8) + (s.t[b].length > 1 ? ' (shares it with ' + s.t[b][0] + ': a collision, but a different value)' : '') + '. Not seen before: `add` returns true.' });
      }
      return out;
    }
  },
  play: {
    title: 'HashSet playground',
    hint: '`new HashSet<>(8)` with Java\'s real bucket math. Add the same number twice, or try 2, 10 and 18 (same bucket).',
    setup: 'Set<Integer> set = new HashSet<>(8);',
    start: 'Eight empty buckets. It doubles when size goes above 6.',
    init: function(){ return mk(8); },
    ops: [
      { id: 'add', label: 'add(v)', args: 1, cost: 'O(1)', run: function(s, x){
        var b = idx(x, s.t.length), j = s.t[b].indexOf(x);
        if (j >= 0) return { java: 'set.add(' + x + ');', ret: false, hl: { b: b, j: j, c: 'on-r', walk: true, rowc: 'on-r' }, msg: where(x, s.t.length) + '. Already there: nothing added, `add` returns **false**.' };
        var coll = s.t[b].length;
        s.t[b].push(x); s.size++;
        var msg = where(x, s.t.length) + '.' + (coll ? ' Collision: chained after ' + coll + ' other item(s).' : '') + ' Added.';
        if (s.size > s.t.length * 3 / 4){ resize(s); var b2 = idx(x, s.t.length); return { java: 'set.add(' + x + ');', ret: true, hl: { b: b2, j: s.t[b2].indexOf(x) }, msg: msg + ' Over 75% full, so the table doubled to ' + s.t.length + '.' }; }
        return { java: 'set.add(' + x + ');', ret: true, hl: { b: b, j: s.t[b].length - 1 }, msg: msg };
      } },
      { id: 'has', label: 'contains(v)', args: 1, cost: 'O(1)', run: function(s, x){
        var b = idx(x, s.t.length), j = s.t[b].indexOf(x);
        return { java: 'set.contains(' + x + ');', ret: j >= 0, ok: j >= 0, hl: { b: b, j: j, walk: true }, msg: where(x, s.t.length) + '. Compared ' + (j >= 0 ? j + 1 : s.t[b].length) + ' item(s) in that bucket only.' };
      } },
      { id: 'rm', label: 'remove(v)', args: 1, cost: 'O(1)', run: function(s, x){
        var b = idx(x, s.t.length), j = s.t[b].indexOf(x);
        if (j < 0) return { java: 'set.remove(' + x + ');', ret: false, hl: { b: b }, msg: x + ' is not in bucket ' + b + '. Returns false.' };
        s.t[b].splice(j, 1); s.size--;
        return { java: 'set.remove(' + x + ');', ret: true, hl: { b: b }, msg: 'Unlinked ' + x + ' from bucket ' + b + '.' };
      } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 5; i++) o.push(['add', rnd(0, 30)]); return o; },
    view: function(s, hl){ return [view(s, hl)]; }
  },
  ops: [
    ['Add', 'set.add(x)', 'O(1) average', 'Hash to a bucket; add only if no equal item is there. Returns whether it was added.'],
    ['Contains', 'set.contains(x)', 'O(1) average', 'Look in one bucket.'],
    ['Remove', 'set.remove(x)', 'O(1) average', 'Unlink from its bucket.'],
    ['Union / intersection / difference', 'addAll, retainAll, removeAll', 'O(n + m)', 'One O(1) check per item of the other collection.'],
    ['Iterate', 'for (int x : set)', 'O(n + capacity)', 'Bucket by bucket; order is not meaningful.'],
    ['Size', 'set.size()', 'O(1)', 'Stored.']
  ],
  when: ['seen before? / visited', 'remove duplicates', 'contains in O(1)', 'intersection / union', 'cycle detection by state', 'distinct count'],
  whenNot: [
    ['Need a count or value per key', 'HashMap', 'hashmap'],
    ['Need items in sorted order / nearest item', 'TreeSet', 'bst-treemap'],
    ['Need insertion order', 'LinkedHashSet', 'linkedhashmap'],
    ['Items are small ints 0..n', '`boolean[] seen` (faster)', 'array']
  ],
  classes: [
    ['HashSet<E>', 'Default. O(1) average, no order.'],
    ['LinkedHashSet<E>', 'Same speed; remembers insertion order.'],
    ['TreeSet<E>', 'Sorted, O(log n), `first`, `floor`, `ceiling`.'],
    ['Set.of(...)', 'Read-only. Throws on duplicate arguments.']
  ],
  api: [
    { name: 'Basics', code: J`Set<Integer> set = new HashSet<>();
System.out.println(set.add(3) + " " + set.add(5) + " " + set.add(3));   // false: already there
System.out.println(set.contains(5) + " " + set.contains(4) + " size " + set.size());
set.remove(5);
System.out.println(set);`, out: `true true false
true false size 2
[3]` },
    { name: 'Remove duplicates', code: J`List<Integer> nums = List.of(4, 1, 4, 2, 1, 4);
Set<Integer> unique = new HashSet<>(nums);
System.out.println(unique.size() + " " + unique);
Set<Integer> keepOrder = new LinkedHashSet<>(nums);
System.out.println(keepOrder);`, out: `3 [1, 2, 4]
[4, 1, 2]`, note: 'HashSet printed small ints in bucket order, which only looks sorted. LinkedHashSet keeps first-seen order.' },
    { name: 'Set algebra', code: J`Set<Integer> a = new HashSet<>(List.of(1, 2, 3, 4));
Set<Integer> b = new HashSet<>(List.of(3, 4, 5));
Set<Integer> union = new HashSet<>(a);
union.addAll(b);
Set<Integer> inter = new HashSet<>(a);
inter.retainAll(b);
Set<Integer> diff = new HashSet<>(a);
diff.removeAll(b);
System.out.println(union + " " + inter + " " + diff);`, out: `[1, 2, 3, 4, 5] [3, 4] [1, 2]`, note: 'These methods change the set they are called on, so copy first.' },
    { name: 'Custom items', code: J`record Point(int x, int y) {}                     // equals + hashCode for free
Set<Point> seen = new HashSet<>();
seen.add(new Point(1, 2));
System.out.println(seen.contains(new Point(1, 2)));

class Bad { int x; Bad(int x) { this.x = x; } }    // no equals / hashCode
Set<Bad> bad = new HashSet<>();
bad.add(new Bad(1));
System.out.println(bad.contains(new Bad(1)));     // compares identity: a different object`, out: `true
false` },
    { name: 'Grid cells', code: J`Set<String> visited = new HashSet<>();
visited.add(2 + "," + 3);
Set<Long> fast = new HashSet<>();
int r = 2, c = 3, cols = 1000;
fast.add((long) r * cols + c);                     // one number per cell
Set<List<Integer>> lists = new HashSet<>();
lists.add(List.of(2, 3));
System.out.println(visited.contains("2,3") + " " + fast.contains(2003L) + " " + lists.contains(List.of(2, 3)));
Set<int[]> arrays = new HashSet<>();
arrays.add(new int[]{2, 3});
System.out.println(arrays.contains(new int[]{2, 3}));   // arrays use identity!`, out: `true true true
false`, note: 'Arrays do not override `equals`/`hashCode`. Encode a cell as a String, a long, a `List.of` or a record instead. A `boolean[][] visited` is often simplest.' }
  ],
  build: {
    intro: 'Java chains colliding items. This version shows the other classic answer, **linear probing**: if your slot is taken, try the next one. No nodes at all, just two arrays.',
    code: J`class IntHashSet {
    private int[] slots = new int[8];
    private boolean[] used = new boolean[8];
    private int size = 0;

    private int home(int x, int n) {
        int h = Integer.hashCode(x);
        return (h ^ (h >>> 16)) & (n - 1);
    }

    boolean add(int x) {
        if ((size + 1) * 2 > slots.length) grow();       // keep at most half full
        int i = home(x, slots.length);
        while (used[i]) {
            if (slots[i] == x) return false;              // already present
            i = (i + 1) & (slots.length - 1);             // probe the next slot
        }
        used[i] = true;
        slots[i] = x;
        size++;
        return true;
    }

    boolean contains(int x) {
        int i = home(x, slots.length);
        while (used[i]) {
            if (slots[i] == x) return true;
            i = (i + 1) & (slots.length - 1);
        }
        return false;                                     // reached an empty slot
    }

    int size() { return size; }

    private void grow() {
        int[] oldS = slots;
        boolean[] oldU = used;
        slots = new int[oldS.length * 2];
        used = new boolean[oldS.length * 2];
        size = 0;
        for (int i = 0; i < oldS.length; i++) if (oldU[i]) add(oldS[i]);
    }
}`,
    notes: [
      ['Probing', 'A collision just moves to the next free slot. `contains` follows the same path and stops at the first empty slot.'],
      ['Keep it sparse', 'Probe runs get long as the table fills, so it grows at 50% instead of 75%.'],
      ['Why no remove?', 'Emptying a slot would cut a probe path in half. Real versions leave a "deleted" marker (tombstone) instead.'],
      ['Chaining vs probing', 'Java uses chaining. Probing is more cache-friendly and is used by many other libraries.']
    ],
    demo: J`IntHashSet s = new IntHashSet();
int[] xs = {3, 11, 19, 3, 5};          // 3, 11 and 19 share a home slot
StringBuilder sb = new StringBuilder();
for (int x : xs) sb.append(s.add(x) ? "+" : "=");
System.out.println(sb + " size " + s.size());
System.out.println(s.contains(19) + " " + s.contains(27));`,
    out: `+++=+ size 4
true false`
  },
  gotchas: [
    ['int[] as a set item', 'Two arrays with the same numbers are different items: `contains` returns false.', 'Use `List.of(a, b)`, a record, a `String` key or a `long` code.'],
    ['equals without hashCode', 'Equal objects land in different buckets, so duplicates slip in and `contains` fails.', 'Override both, or use a `record`.'],
    ['Changing an item after adding it', 'Its hash changes, so it is stranded in the wrong bucket.', 'Only put immutable things in a set.'],
    ['contains on a List', '`list.contains(x)` is O(n); in a loop that is O(n²).', 'Copy into a `HashSet` first.'],
    ['Set.of with duplicates', '`Set.of(1, 1)` throws `IllegalArgumentException`.', '`new HashSet<>(List.of(1, 1))`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-dup', title: 'Contains duplicate', ask: '`add` returns false when the item is already in the set.', code: J`boolean containsDuplicate(int[] nums) {
    Set<Integer> seen = new [[HashSet<>()]];
    for (int x : nums) {
        if (![[seen.add(x)]]) return true;
    }
    return [[false]];
}`, test: 'System.out.println(new Sol().containsDuplicate(new int[]{1, 2, 3, 1}) + " " + new Sol().containsDuplicate(new int[]{1, 2, 3}));', out: 'true false' },
      { id: 'fb-consec', title: 'Longest consecutive sequence', ask: 'Only start counting at numbers whose `x - 1` is missing.', code: J`int longestConsecutive(int[] nums) {
    Set<Integer> set = new HashSet<>();
    for (int x : nums) set.add(x);
    int best = 0;
    for (int x : set) {
        if (set.[[contains(x - 1)]]) continue;          // not the start of a run
        int len = 1;
        while (set.contains([[x + len]])) len++;
        best = Math.[[max]](best, len);
    }
    return best;
}`, test: 'System.out.println(new Sol().longestConsecutive(new int[]{100, 4, 200, 1, 3, 2}));', out: '4' }
    ],
    order: [
      { id: 'od-inter', title: 'Intersection of two arrays (unique)',
        ideaSteps: ['Put every number of `a` into a set.', 'Walk `b`; if a number is in the first set, add it to a result **set** (so it is kept once).', 'Copy the result set into an `int[]`.'],
        lines: [
          'int[] intersection(int[] a, int[] b) {',
          '    Set<Integer> setA = new HashSet<>();',
          '    for (int x : a) setA.add(x);',
          '    Set<Integer> res = new HashSet<>();',
          '    for (int x : b) {',
          '        if (setA.contains(x)) res.add(x);',
          '    }',
          '    int[] out = new int[res.size()];',
          '    int i = 0;',
          '    for (int x : res) out[i++] = x;',
          '    return out;',
          '}'
        ],
        extra: ['    List<Integer> res = new ArrayList<>();'],
        check: { wrap: 'sol', test: 'System.out.println(Arrays.toString(new Sol().intersection(new int[]{1, 2, 2, 1}, new int[]{2, 2})));', out: '[2]' } }
    ]
  },
  patterns: ['hashing', 'sliding-window', 'graphs', 'backtracking'],
  patternWhy: {
    hashing: '"Seen before?" questions are one `add` or `contains`.',
    'sliding-window': 'Longest substring without repeats keeps the window\'s chars in a set.',
    graphs: 'A visited set stops BFS and DFS from looping.',
    backtracking: 'A used set marks items already in the current path.'
  },
  problems: [['217', 'Contains Duplicate'], ['349', 'Intersection of Two Arrays'], ['128', 'Longest Consecutive Sequence'], ['202', 'Happy Number'], ['36', 'Valid Sudoku'], ['705', 'Design HashSet']]
});
})();
