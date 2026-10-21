(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
// Plain BST as JSON: { n: { id: {v, l, r} }, root, next }.
function mk(){ return { n: {}, root: null, next: 1 }; }
function ins(s, v){
  var path = [];
  if (s.root === null){ var id0 = 'n' + s.next++; s.n[id0] = { v: v, l: null, r: null }; s.root = id0; return { path: [id0], id: id0, added: true }; }
  var cur = s.root;
  for (;;){
    path.push(cur);
    var nd = s.n[cur];
    if (v === nd.v) return { path: path, id: cur, added: false };
    var side = v < nd.v ? 'l' : 'r';
    if (nd[side] === null){ var id = 'n' + s.next++; s.n[id] = { v: v, l: null, r: null }; nd[side] = id; path.push(id); return { path: path, id: id, added: true, side: side, parent: nd.v }; }
    cur = nd[side];
  }
}
function search(s, v){ var path = [], cur = s.root; while (cur !== null){ path.push(cur); if (s.n[cur].v === v) return { path: path, id: cur }; cur = v < s.n[cur].v ? s.n[cur].l : s.n[cur].r; } return { path: path, id: null }; }
function del(s, v){
  function go(id){
    if (id === null) return null;
    var nd = s.n[id];
    if (v < nd.v){ nd.l = go(nd.l); return id; }
    if (v > nd.v){ nd.r = go(nd.r); return id; }
    if (nd.l === null){ delete s.n[id]; return nd.r; }
    if (nd.r === null){ delete s.n[id]; return nd.l; }
    var su = nd.r; while (s.n[su].l !== null) su = s.n[su].l;
    nd.v = s.n[su].v; var keep = v; v = nd.v; nd.r = go(nd.r); v = keep;
    return id;
  }
  s.root = go(s.root);
}
function inorder(s){ var out = []; (function w(id){ if (id === null) return; w(s.n[id].l); out.push(s.n[id].v); w(s.n[id].r); })(s.root); return out; }
function height(s){ return (function h(id){ return id === null ? 0 : 1 + Math.max(h(s.n[id].l), h(s.n[id].r)); })(s.root); }
function bound(s, v, floor){ var cur = s.root, best = null, path = [], bestId = null; while (cur !== null){ path.push(cur); var x = s.n[cur].v; if (x === v) return { v: x, path: path, id: cur }; if (floor ? x < v : x > v){ best = x; bestId = cur; cur = floor ? s.n[cur].r : s.n[cur].l; } else cur = floor ? s.n[cur].l : s.n[cur].r; } return { v: best, path: path, id: bestId }; }
function treeP(s, cls, name){
  var nodes = [];
  (function add(id, parent, side){ if (id === null) return; nodes.push({ id: id, label: s.n[id].v, parent: parent, side: side, cls: (cls && cls[id]) || '' }); add(s.n[id].l, id, 'L'); add(s.n[id].r, id, 'R'); })(s.root, null, null);
  return { type: 'ntree', name: name || 'BST  (height ' + height(s) + ', ' + nodes.length + ' nodes)', nodes: nodes, bin: true };
}
function pc(path, endCls){ var c = {}; path.forEach(function(id){ c[id] = 'on-a'; }); if (path.length) c[path[path.length - 1]] = endCls || 'on-hit'; return c; }
function build(vals){ var s = mk(); vals.forEach(function(v){ ins(s, v); }); return s; }

registerStructure({
  slug: 'bst-treemap', order: 12, group: 'tree', title: 'BST, TreeMap & TreeSet',
  oneLiner: 'A binary tree with one rule: **left < node < right**. Every comparison throws away half the tree, so search is O(log n) and an in-order walk is sorted. Java\'s `TreeMap` and `TreeSet` are self-balancing BSTs with handy `floor`, `ceiling` and range queries.',
  legend: [['a', 'search path'], ['hit', 'found / placed'], ['r', 'not found']],
  compare: { access: 'O(log n)', search: 'O(log n)', insert: 'O(log n)', remove: 'O(log n)', ordered: 'sorted', space: 'O(n)', java: 'TreeMap / TreeSet', note: 'sorted + floor/ceiling' },
  idea: [
    'Binary search on an array halves the range each step, but inserting into a sorted array is O(n). A **binary search tree** stores the same ordering as links: everything in a node\'s left subtree is smaller, everything in the right subtree is bigger.',
    'To find, insert or delete, start at the root and go left or right by comparing. Each step goes one level down, so the cost is the **height** h of the tree.',
    'If keys arrive in random order, h ≈ log n. If they arrive sorted, every node goes right and the tree becomes a linked list with h = n. Java\'s `TreeMap` prevents that: it is a **red-black tree** that recolors and rotates after each change to stay balanced, so h is always O(log n).',
    'Because an in-order walk visits keys in sorted order, a TreeMap can answer "what is the closest key below 55?" (`floorKey`) or "all keys between 20 and 60" (`subMap`) — things a HashMap cannot.'
  ],
  anatomy: {
    title: 'The ordering rule',
    panels: [treeP(build([8, 3, 10, 1, 6, 14, 4, 7, 13]), {}, 'every left subtree < node < every right subtree'), arr([1, 3, 4, 6, 7, 8, 10, 13, 14], [], { name: 'in-order walk = sorted', ix: false })],
    notes: [
      'Nodes are drawn left to right in sorted order: in-order traversal reads them exactly that way.',
      'The rule is about **whole subtrees**: 7 is in 8\'s left subtree, so it must be < 8, not just < its parent 6.',
      'Finding 13 takes 4 comparisons (8, 10, 14, 13) instead of scanning 9 items.'
    ]
  },
  demo: {
    title: 'Same keys, different shape',
    sub: 'Insert 4, 2, 6, 1, 3, 5, 7: a balanced tree. Then insert 1–7 in sorted order: a stick. Watch the height.',
    code: [
      'Node insert(Node n, int k) {',
      '    if (n == null) return new Node(k);',
      '    if (k < n.key) n.left = insert(n.left, k);',
      '    else if (k > n.key) n.right = insert(n.right, k);',
      '    return n;',
      '}'
    ],
    steps: function(){
      var out = [], s = mk();
      [4, 2, 6, 1, 3, 5, 7].forEach(function(v){
        var r = ins(s, v);
        out.push({ panels: [treeP(s, pc(r.path))], line: r.path.length > 1 ? (r.side === 'l' ? 2 : 3) : 1, vars: { key: v, comparisons: r.path.length - 1, height: height(s) },
          msg: r.path.length > 1 ? 'Insert ' + v + ': compared with ' + r.path.slice(0, -1).map(function(id){ return s.n[id].v; }).join(', ') + ', placed as the **' + (r.side === 'l' ? 'left' : 'right') + '** child of ' + r.parent + '.' : 'Insert ' + v + ': empty tree, it becomes the root.' });
      });
      out.push({ panels: [treeP(s, {})], line: null, vars: { height: height(s) }, msg: 'Balanced: 7 keys, height **3**. Any search takes at most 3 comparisons.' });
      var t = mk();
      [1, 2, 3, 4, 5, 6, 7].forEach(function(v){ ins(t, v); });
      var hc = {}; Object.keys(t.n).forEach(function(id){ hc[id] = 'on-r'; });
      out.push({ panels: [treeP(t, hc, 'sorted inserts → height ' + height(t))], line: 3, vars: { height: height(t) }, msg: 'Same 7 keys inserted **sorted**: each goes right of the last. Height 7: this is a linked list, and search is O(n).' });
      out.push({ panels: [treeP(s, {}, 'what TreeMap keeps (red-black tree)')], line: null, ok: true, vars: { height: 3 }, msg: '`TreeMap` rotates nodes after inserts to stay balanced, whatever the order. That is why its operations are **guaranteed O(log n)**.' });
      return out;
    }
  },
  play: {
    title: 'BST playground',
    hint: 'A plain (unbalanced) BST. Insert numbers, then search, delete, or ask for `floor` / `ceiling`. Try inserting 10, 20, 30, 40 to see it go lopsided.',
    setup: 'BST tree = new BST();   // like TreeSet<Integer>, but without balancing',
    start: 'Empty tree.',
    init: function(){ return mk(); },
    ops: [
      { id: 'ins', label: 'insert(v)', args: 1, cost: 'O(h)', run: function(s, v){
        if (Object.keys(s.n).length >= 20 && !search(s, v).id) return { err: 'This playground stops at 20 nodes so it fits on screen.' };
        var r = ins(s, v);
        if (!r.added) return { java: 'tree.add(' + v + ');', ret: false, hl: { cls: pc(r.path, 'on-r') }, msg: v + ' is already in the tree. A set keeps one copy: `add` returns false.' };
        return { java: 'tree.add(' + v + ');', ret: true, hl: { cls: pc(r.path) }, msg: r.path.length > 1 ? 'Went ' + r.path.slice(0, -1).map(function(id, k){ return (v < s.n[id].v ? 'left' : 'right') + ' at ' + s.n[id].v; }).join(', ') + '. Placed after **' + (r.path.length - 1) + '** comparison(s).' : v + ' is the root.' };
      } },
      { id: 'has', label: 'contains(v)', args: 1, cost: 'O(h)', run: function(s, v){
        var r = search(s, v);
        return { java: 'tree.contains(' + v + ');', ret: !!r.id, ok: !!r.id, hl: { cls: pc(r.path, r.id ? 'on-hit' : 'on-r') }, msg: (r.id ? 'Found ' : 'Not found ') + 'after ' + r.path.length + ' comparison(s), out of ' + Object.keys(s.n).length + ' nodes.' };
      } },
      { id: 'del', label: 'remove(v)', args: 1, cost: 'O(h)', run: function(s, v){
        var r = search(s, v);
        if (!r.id) return { java: 'tree.remove(' + v + ');', ret: false, hl: { cls: pc(r.path, 'on-r') }, msg: v + ' is not in the tree.' };
        var nd = s.n[r.id], kids = (nd.l !== null) + (nd.r !== null), succ = null;
        if (kids === 2){ var su = nd.r; while (s.n[su].l !== null) su = s.n[su].l; succ = s.n[su].v; }
        del(s, v);
        var c = {}; if (succ !== null){ var f = search(s, succ); c = pc(f.path); }
        return { java: 'tree.remove(' + v + ');', ret: true, hl: { cls: c }, msg: kids === 0 ? 'Leaf: just cut it off.' : kids === 1 ? 'One child: the child takes its place.' : 'Two children: copy the **in-order successor** (' + succ + ', smallest in the right subtree) into this node, then delete the successor.' };
      } },
      { id: 'floor', label: 'floor(v)', args: 1, cost: 'O(h)', run: function(s, v){
        var r = bound(s, v, true);
        return { java: 'tree.floor(' + v + ');', ret: r.v === null ? 'null' : r.v, hl: { cls: (function(){ var c = pc(r.path, 'on-a'); if (r.id) c[r.id] = 'on-hit'; return c; })() }, msg: r.v === null ? 'Nothing ≤ ' + v + ': `null`.' : 'Largest key ≤ ' + v + ' is **' + r.v + '**. Going right remembers a candidate; going left looks for a closer one.' };
      } },
      { id: 'ceil', label: 'ceiling(v)', args: 1, cost: 'O(h)', run: function(s, v){
        var r = bound(s, v, false);
        return { java: 'tree.ceiling(' + v + ');', ret: r.v === null ? 'null' : r.v, hl: { cls: (function(){ var c = pc(r.path, 'on-a'); if (r.id) c[r.id] = 'on-hit'; return c; })() }, msg: r.v === null ? 'Nothing ≥ ' + v + ': `null`.' : 'Smallest key ≥ ' + v + ' is **' + r.v + '**.' };
      } },
      { id: 'in', label: 'in-order', cost: 'O(n)', run: function(s){
        return { java: 'new ArrayList<>(tree);', ret: '[' + inorder(s).join(', ') + ']', msg: 'In-order walk: always sorted. This is how a `TreeSet` iterates.' };
      } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 7; i++) o.push(['ins', rnd(1, 99)]); return o; },
    view: function(s, hl){ return [treeP(s, hl.cls)]; }
  },
  ops: [
    ['Get / put / remove', 'map.get(k), put, remove', 'O(log n)', 'One root-to-leaf path in a balanced tree.'],
    ['Smallest / largest key', 'firstKey(), lastKey()', 'O(log n)', 'Walk all the way left / right.'],
    ['Nearest key', 'floorKey, ceilingKey, lowerKey, higherKey', 'O(log n)', 'One path, remembering the best candidate.'],
    ['Range view', 'headMap, tailMap, subMap', 'O(log n)', 'Creates a view; iterating it costs O(k) for k keys.'],
    ['Iterate in sorted order', 'for (var e : map.entrySet())', 'O(n)', 'In-order walk.'],
    ['Plain BST, sorted input', 'no balancing', 'O(n)', 'Height becomes n. This is why TreeMap balances.']
  ],
  when: ['need sorted order while inserting', 'closest value ≤ x / ≥ x', 'range of keys', 'min and max with deletes', 'calendar / interval booking', 'sorted multiset (value → count)', 'k-th order with ties'],
  whenNot: [
    ['Only exact-key lookups', 'HashMap (O(1) beats O(log n))', 'hashmap'],
    ['Only ever need the min', 'PriorityQueue (simpler, faster)', 'heap'],
    ['Data is fixed and sorted', 'Sorted array + binary search', 'array'],
    ['Range **sums** with updates', 'Fenwick / segment tree', 'fenwick']
  ],
  classes: [
    ['TreeMap<K, V>', 'Sorted map. Red-black tree. No `null` keys.'],
    ['TreeSet<E>', 'Sorted set (a TreeMap with dummy values).'],
    ['NavigableMap / NavigableSet', 'Interfaces with `floor`, `ceiling`, `headMap`… Declare as these to keep those methods.']
  ],
  api: [
    { name: 'TreeMap basics', code: J`TreeMap<Integer, String> m = new TreeMap<>();
m.put(50, "e");
m.put(20, "b");
m.put(80, "h");
m.put(10, "a");
m.put(60, "f");
System.out.println(m);                                          // always sorted by key
System.out.println(m.firstKey() + " " + m.lastKey());
System.out.println(m.floorKey(55) + " " + m.ceilingKey(55));    // <= 55, >= 55
System.out.println(m.lowerKey(50) + " " + m.higherKey(50));     // < 50, > 50
System.out.println(m.floorKey(5));                              // nothing <= 5`, out: `{10=a, 20=b, 50=e, 60=f, 80=h}
10 80
50 60
20 60
null` },
    { name: 'Ranges', code: J`TreeMap<Integer, String> m = new TreeMap<>(Map.of(10, "a", 20, "b", 50, "e", 60, "f", 80, "h"));
System.out.println(m.headMap(50));            // keys < 50
System.out.println(m.tailMap(50));            // keys >= 50
System.out.println(m.subMap(15, 61));         // 15 <= key < 61
System.out.println(m.descendingMap());
Map.Entry<Integer, String> e = m.pollFirstEntry();
System.out.println(e.getKey() + " removed, now " + m.firstKey());`, out: `{10=a, 20=b}
{50=e, 60=f, 80=h}
{20=b, 50=e, 60=f}
{80=h, 60=f, 50=e, 20=b, 10=a}
10 removed, now 20`, note: 'These are live **views**: changing the view changes the map.' },
    { name: 'TreeSet', code: J`TreeSet<Integer> s = new TreeSet<>(List.of(5, 1, 9, 3, 7));
System.out.println(s + " first " + s.first() + " last " + s.last());
System.out.println(s.floor(6) + " " + s.ceiling(6) + " " + s.higher(9));
System.out.println(s.headSet(5) + " " + s.tailSet(5, false));
System.out.println(s.pollFirst() + " " + s.pollLast() + " " + s);`, out: `[1, 3, 5, 7, 9] first 1 last 9
5 7 null
[1, 3] [7, 9]
1 9 [3, 5, 7]` },
    { name: 'Custom order', code: J`TreeMap<String, Integer> byLen = new TreeMap<>(
    Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder()));
for (String w : List.of("pear", "fig", "banana", "kiwi")) byLen.put(w, w.length());
System.out.println(byLen.keySet());
TreeSet<Integer> desc = new TreeSet<>(Comparator.reverseOrder());
desc.addAll(List.of(3, 1, 2));
System.out.println(desc);`, out: `[fig, kiwi, pear, banana]
[3, 2, 1]`, note: 'Without `thenComparing`, "kiwi" and "pear" (both length 4) would count as the **same key** and one would be lost.' },
    { name: 'Sorted multiset', code: J`TreeMap<Integer, Integer> bag = new TreeMap<>();      // value -> count
for (int x : new int[]{4, 1, 4, 7}) bag.merge(x, 1, Integer::sum);
bag.merge(1, -1, Integer::sum);                         // remove one 1
if (bag.get(1) == 0) bag.remove(1);
System.out.println(bag + " min " + bag.firstKey() + " max " + bag.lastKey());`, out: `{4=2, 7=1} min 4 max 7`, note: 'Java has no multiset; a TreeMap of counts gives sorted values with duplicates, plus O(log n) min, max and delete.' }
  ],
  build: {
    intro: 'An unbalanced BST of ints with insert, search, floor, delete and in-order. Real `TreeMap` adds red-black recoloring and rotations on top of exactly this.',
    code: J`class BST {
    private static class Node {
        int key;
        Node left, right;
        Node(int k) { key = k; }
    }
    private Node root;

    void insert(int k) { root = insert(root, k); }
    private Node insert(Node n, int k) {
        if (n == null) return new Node(k);
        if (k < n.key) n.left = insert(n.left, k);
        else if (k > n.key) n.right = insert(n.right, k);
        return n;                                     // duplicates ignored
    }

    boolean contains(int k) {
        Node n = root;
        while (n != null) {
            if (k == n.key) return true;
            n = k < n.key ? n.left : n.right;         // discard half
        }
        return false;
    }

    Integer floor(int k) {                            // largest key <= k
        Node n = root;
        Integer best = null;
        while (n != null) {
            if (n.key == k) return k;
            if (n.key < k) { best = n.key; n = n.right; }
            else n = n.left;
        }
        return best;
    }

    void delete(int k) { root = delete(root, k); }
    private Node delete(Node n, int k) {
        if (n == null) return null;
        if (k < n.key) n.left = delete(n.left, k);
        else if (k > n.key) n.right = delete(n.right, k);
        else {
            if (n.left == null) return n.right;       // 0 or 1 child
            if (n.right == null) return n.left;
            Node s = n.right;                         // 2 children: in-order successor
            while (s.left != null) s = s.left;
            n.key = s.key;
            n.right = delete(n.right, s.key);
        }
        return n;
    }

    List<Integer> inorder() { List<Integer> out = new ArrayList<>(); walk(root, out); return out; }
    private void walk(Node n, List<Integer> out) {
        if (n == null) return;
        walk(n.left, out);
        out.add(n.key);
        walk(n.right, out);
    }
}`,
    notes: [
      ['return n', 'Recursive insert/delete return the (possibly new) subtree root, and the parent stores it. That one pattern handles every case.'],
      ['floor', 'Going right means "this key is ≤ k, remember it, look for a bigger one". Going left means "too big".'],
      ['Delete with two children', 'Replace the key with the smallest key of the right subtree, which has at most one child, then delete that.'],
      ['No balancing', 'Insert 1, 2, 3, … and every method becomes O(n).']
    ],
    demo: J`BST t = new BST();
for (int k : new int[]{50, 30, 70, 20, 40, 60, 80}) t.insert(k);
System.out.println(t.inorder() + " " + t.contains(60) + " " + t.contains(65));
System.out.println(t.floor(65) + " " + t.floor(10));
t.delete(50);                                         // the root, which has two children
System.out.println(t.inorder());`,
    out: `[20, 30, 40, 50, 60, 70, 80] true false
60 null
[20, 30, 40, 60, 70, 80]`
  },
  gotchas: [
    ['Comparator decides equality', 'In a TreeSet/TreeMap, items that compare as 0 are the **same key**, even if `equals` says otherwise.', 'Add tie-breakers with `thenComparing`.'],
    ['Unboxing a null floor', '`int f = set.floor(x);` throws when nothing is ≤ x.', 'Store in `Integer` and check for `null`.'],
    ['Checking only the parent in "is valid BST"', 'A node can be bigger than its parent but still violate an ancestor.', 'Pass down `(low, high)` bounds.'],
    ['Plain BST on sorted data', 'Height n, so O(n) per operation.', 'Use `TreeMap` / `TreeSet`, which balance themselves.'],
    ['Declaring as Map', '`Map<K, V> m = new TreeMap<>()` hides `floorKey` and friends.', 'Declare as `TreeMap` or `NavigableMap`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-valid', title: 'Validate a BST', ask: 'Every node must sit strictly inside the bounds its ancestors set.', code: J`boolean isValidBST(TreeNode root) {
    return check(root, Long.MIN_VALUE, Long.MAX_VALUE);
}
boolean check(TreeNode n, long lo, long hi) {
    if (n == null) return [[true]];
    if (n.val <= lo || n.val [[>=]] hi) return false;
    return check(n.left, lo, [[n.val]]) && check(n.right, [[n.val]], hi);
}`, test: 'System.out.println(new Sol().isValidBST(new TreeNode(2, new TreeNode(1), new TreeNode(3))) + " " + new Sol().isValidBST(new TreeNode(5, new TreeNode(1), new TreeNode(4, new TreeNode(3), new TreeNode(6)))));', out: 'true false' },
      { id: 'fb-calendar', title: 'My Calendar (no double booking)', ask: 'Look at the booking just before and just after `start`.', wrap: 'top', code: J`class MyCalendar {
    TreeMap<Integer, Integer> cal = new TreeMap<>();     // start -> end
    boolean book(int start, int end) {
        Integer prev = cal.[[floorKey(start)|lowerKey(start)]];
        Integer next = cal.[[ceilingKey(start)|higherKey(start)]];
        if (prev != null && cal.get(prev) > [[start]]) return false;
        if (next != null && next < [[end]]) return false;
        cal.put(start, end);
        return true;
    }
}`, test: 'MyCalendar c = new MyCalendar(); System.out.println(c.book(10, 20) + " " + c.book(15, 25) + " " + c.book(20, 30) + " " + c.book(5, 10) + " " + c.book(5, 11));', out: 'true false true true false' }
    ],
    order: [
      { id: 'od-kth', title: 'K-th smallest in a BST',
        ideaSteps: ['In-order visits a BST in sorted order.', 'Do it iteratively with a stack.', 'Count down `k` at each visit; when it hits 0, that node is the answer.'],
        lines: [
          'int kthSmallest(TreeNode root, int k) {',
          '    Deque<TreeNode> st = new ArrayDeque<>();',
          '    TreeNode cur = root;',
          '    while (cur != null || !st.isEmpty()) {',
          '        while (cur != null) { st.push(cur); cur = cur.left; }',
          '        cur = st.pop();',
          '        if (--k == 0) return cur.val;',
          '        cur = cur.right;',
          '    }',
          '    return -1;',
          '}'
        ],
        extra: ['        if (k-- == 0) return cur.val;'],
        check: { wrap: 'sol', test: 'TreeNode r = new TreeNode(5, new TreeNode(3, new TreeNode(2, new TreeNode(1), null), new TreeNode(4)), new TreeNode(6)); System.out.println(new Sol().kthSmallest(r, 3) + " " + new Sol().kthSmallest(r, 6));', out: '3 6' } }
    ]
  },
  patterns: ['binary-search', 'trees', 'intervals', 'greedy'],
  patternWhy: {
    'binary-search': 'A BST is binary search turned into links; `floor`/`ceiling` are lower/upper bound.',
    trees: 'BST problems use the ordering rule to skip half the tree.',
    intervals: 'Booking and merging intervals look up neighbours with `floorKey` / `ceilingKey`.',
    greedy: 'Greedy matching often needs "smallest item ≥ x", which is `ceiling`.'
  },
  problems: [['700', 'Search in a Binary Search Tree'], ['701', 'Insert into a Binary Search Tree'], ['98', 'Validate Binary Search Tree'], ['230', 'Kth Smallest Element in a BST'], ['450', 'Delete Node in a BST'], ['729', 'My Calendar I']]
});
})();
