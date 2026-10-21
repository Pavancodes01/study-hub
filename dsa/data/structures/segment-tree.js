(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
var START = [5, 8, 6, 3, 2, 7, 2, 6];
// Build the recursive sum tree: node -> {l, r, sum}. Root is node 1, children 2i and 2i+1.
function tree(a){
  var t = {};
  (function b(node, l, r){ if (l === r){ t[node] = { l: l, r: r, s: a[l] }; return; } var m = (l + r) >> 1; b(2 * node, l, m); b(2 * node + 1, m + 1, r); t[node] = { l: l, r: r, s: t[2 * node].s + t[2 * node + 1].s }; })(1, 0, a.length - 1);
  return t;
}
// Visit a range query, recording which nodes were fully used, split, or skipped.
function query(t, ql, qr){
  var used = [], split = [], skip = [], sum = 0;
  (function q(node){ var n = t[node]; if (qr < n.l || n.r < ql){ skip.push(node); return; } if (ql <= n.l && n.r <= qr){ used.push(node); sum += n.s; return; } split.push(node); q(2 * node); q(2 * node + 1); })(1);
  return { used: used, split: split, skip: skip, sum: sum };
}
function updPath(a, i){ var path = [], node = 1, l = 0, r = a.length - 1; while (true){ path.push(node); if (l === r) break; var m = (l + r) >> 1; if (i <= m){ node = 2 * node; r = m; } else { node = 2 * node + 1; l = m + 1; } } return path; }
function treeP(a, cls, name){
  var t = tree(a), nodes = [];
  Object.keys(t).map(Number).sort(function(x, y){ return x - y; }).forEach(function(k){
    nodes.push({ id: k, label: t[k].s, sub: t[k].l === t[k].r ? '[' + t[k].l + ']' : '[' + t[k].l + '..' + t[k].r + ']', parent: k === 1 ? null : k >> 1, cls: (cls && cls[k]) || '' });
  });
  return { type: 'ntree', name: name || 'segment tree: each node = sum of its range', nodes: nodes, sx: 54 };
}
function qCls(r){ var c = {}; r.split.forEach(function(k){ c[k] = 'on-a'; }); r.used.forEach(function(k){ c[k] = 'on-hit'; }); r.skip.forEach(function(k){ c[k] = 'gone'; }); return c; }
function rangeCls(l, r, k){ var c = {}; for (var i = l; i <= r; i++) c[i] = k; return c; }

registerStructure({
  slug: 'segment-tree', order: 16, group: 'adv', title: 'Segment Tree',
  oneLiner: 'Answers "sum (or min, max) of `a[l..r]`" **and** "change `a[i]`" both in O(log n). Each tree node stores the answer for one range; any query range is glued together from at most about 2 log n of those pieces.',
  legend: [['hit', 'node fully inside: used whole'], ['a', 'partly inside: split'], ['l', 'array range']],
  compare: { access: 'O(log n)', search: 'O(log n) range', insert: 'O(log n) update', remove: '—', ordered: 'by index', space: 'O(n), 4n ints', java: 'int[] tree (your own)', note: 'range query + update' },
  idea: [
    'Prefix sums answer range sums in O(1), but one change to the array means rebuilding O(n) of them. A segment tree trades a little query speed for fast updates.',
    'Split the array in half, then each half in half, down to single elements. Every piece becomes a tree node holding the **sum of its range**. The root covers `[0..n-1]`; leaves cover one index each.',
    '**Query** `[l..r]`: start at the root. If a node\'s range is fully inside the query, take its sum whole. If it is fully outside, ignore it. Otherwise split into its two children. Only O(log n) nodes are touched.',
    '**Update** `a[i]`: change the leaf, then recompute the sums of its ancestors on the way up. That is one root-to-leaf path: O(log n). Swap `+` for `min` or `max` and the same tree answers range minimum or maximum.'
  ],
  anatomy: {
    title: 'Ranges inside ranges',
    panels: [treeP(START), arr(START, [], { name: 'a[]' })],
    notes: [
      'Root 39 = the whole array. Its children are the sums of `[0..3]` and `[4..7]`.',
      'Stored in an array like a heap: node `i` has children `2i` and `2i + 1`. Allocate `4n` to be safe.',
      'Every parent is just the sum of its two children: that is the whole invariant.'
    ]
  },
  demo: {
    title: 'Query sum(2..6), then update a[3]',
    sub: 'Green nodes are used whole, orange nodes are split, faded nodes are skipped.',
    code: [
      'int sum(int node, int l, int r, int ql, int qr) {',
      '    if (qr < l || r < ql) return 0;              // outside',
      '    if (ql <= l && r <= qr) return tree[node];   // fully inside',
      '    int m = (l + r) / 2;',
      '    return sum(2*node, l, m, ql, qr) + sum(2*node+1, m+1, r, ql, qr);',
      '}'
    ],
    steps: function(){
      var a = START.slice(), out = [], t = tree(a), r = query(t, 2, 6);
      out.push({ panels: [treeP(a, {}), arr(a, [], { name: 'a[]', cls: rangeCls(2, 6, 'on-l') })], line: 0, vars: { ql: 2, qr: 6 }, msg: 'We want `a[2] + … + a[6]` = 6 + 3 + 2 + 7 + 2. Start at the root `[0..7]`.' });
      out.push({ panels: [treeP(a, { 1: 'on-a' }), arr(a, [], { name: 'a[]', cls: rangeCls(2, 6, 'on-l') })], line: 4, vars: {}, msg: 'Root `[0..7]` is only partly inside `[2..6]`, so split it into `[0..3]` and `[4..7]`.' });
      out.push({ panels: [treeP(a, qCls(r)), arr(a, [], { name: 'a[]', cls: rangeCls(2, 6, 'on-l') })], line: [1, 2], vars: { pieces: r.used.length, sum: r.sum },
        msg: 'Recursing: `[2..3]` = 9 and `[4..5]` = 9 are fully inside, used whole. `[6]` = 2 too. Ranges outside are skipped. Sum = 9 + 9 + 2 = **' + r.sum + '** from only ' + r.used.length + ' nodes.' });
      var path = updPath(a, 3); a[3] = 10;
      var c = {}; path.forEach(function(k){ c[k] = 'on-a'; }); c[path[path.length - 1]] = 'on-hit';
      out.push({ panels: [treeP(a, c), arr(a, [], { name: 'a[]', cls: { 3: 'on-hit' } })], line: null, vars: { i: 3, val: 10, touched: path.length }, msg: '`update(3, 10)`: change the leaf `[3]`, then recompute the ' + (path.length - 1) + ' ancestors on the path to the root. Root becomes 46.' });
      var r2 = query(tree(a), 2, 6);
      out.push({ panels: [treeP(a, qCls(r2)), arr(a, [], { name: 'a[]', cls: rangeCls(2, 6, 'on-l') })], line: [1, 2], ok: true, vars: { sum: r2.sum }, msg: 'Same query again: **' + r2.sum + '**. Prefix sums would have rebuilt 5 entries; the tree touched 4 nodes. Both query and update are O(log n).' });
      return out;
    }
  },
  play: {
    title: 'Segment tree playground',
    hint: 'An array of 8. `update(i, v)` sets `a[i] = v` and fixes the path up. `sum(l, r)` colours the nodes it uses. First box = index or l, second = value or r.',
    inputs: [{ ph: 'i or l', type: 'number' }, { ph: 'v or r', type: 'number' }],
    setup: 'SegmentTree st = new SegmentTree(new int[]{5, 8, 6, 3, 2, 7, 2, 6});',
    start: 'Built from `[5, 8, 6, 3, 2, 7, 2, 6]`. Try `sum(1, 6)`.',
    init: function(){ return { a: START.slice() }; },
    ops: [
      { id: 'sum', label: 'sum(l, r)', args: 2, cost: 'O(log n)', run: function(s, l, r){
        if (l < 0 || r > 7 || l > r) return { err: 'Need 0 ≤ l ≤ r ≤ 7.' };
        var q = query(tree(s.a), l, r);
        return { java: 'st.sum(' + l + ', ' + r + ');', ret: q.sum, ok: true, hl: { cls: qCls(q), arr: rangeCls(l, r, 'on-l') }, msg: 'Glued together ' + q.used.length + ' whole node(s), split ' + q.split.length + ', skipped ' + q.skip.length + '. Sum **' + q.sum + '**.' };
      } },
      { id: 'upd', label: 'update(i, v)', args: 2, cost: 'O(log n)', run: function(s, i, v){
        if (i < 0 || i > 7) return { err: 'Index must be 0 to 7.' };
        var path = updPath(s.a, i), old = s.a[i]; s.a[i] = v;
        var c = {}; path.forEach(function(k){ c[k] = 'on-a'; }); c[path[path.length - 1]] = 'on-hit';
        var ac = {}; ac[i] = 'on-hit';
        return { java: 'st.update(' + i + ', ' + v + ');', hl: { cls: c, arr: ac }, msg: 'a[' + i + '] ' + old + ' → ' + v + '. Recomputed **' + path.length + '** nodes (leaf to root); every other node is unchanged.' };
      } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 3; i++) o.push(['upd', rnd(0, 7), rnd(0, 9)]); return o; },
    view: function(s, hl){ return [treeP(s.a, hl.cls), arr(s.a.slice(), [], { name: 'a[]', cls: hl.arr || {} })]; }
  },
  ops: [
    ['Build', 'new SegmentTree(a)', 'O(n)', 'Each of about 2n nodes is computed once from its children.'],
    ['Range query (sum / min / max)', 'st.sum(l, r)', 'O(log n)', 'At most about 2 nodes per level are used or split.'],
    ['Point update', 'st.update(i, v)', 'O(log n)', 'One leaf plus its ancestors.'],
    ['Range update (add to a range)', 'lazy propagation', 'O(log n)', 'Store pending changes in nodes and push them down only when needed.'],
    ['Memory', 'int[4 * n]', 'O(n)', '4n is a safe size for the recursive version; the iterative one needs 2n.']
  ],
  when: ['range sum / min / max with updates', 'many queries and many updates mixed', 'count of elements in a value range', 'interval scheduling with overlaps', 'skyline / sweep problems'],
  whenNot: [
    ['No updates at all', 'Prefix sums (O(1) queries)', 'array'],
    ['Only prefix sums with point updates', 'Fenwick tree (shorter code)', 'fenwick'],
    ['Need the smallest item only', 'Heap', 'heap']
  ],
  apiIntro: 'Java has no segment tree class. Below: the prefix-sum baseline it replaces, a compact iterative version, and a range-minimum variant. All run as shown.',
  api: [
    { name: 'Why not prefix sums?', code: J`int[] a = {5, 8, 6, 3, 2, 7, 2, 6};
int[] pre = new int[a.length + 1];
for (int i = 0; i < a.length; i++) pre[i + 1] = pre[i] + a[i];
System.out.println(pre[7] - pre[2]);                              // sum of a[2..6] in O(1)
a[3] = 10;                                                        // one change…
for (int i = 3; i < a.length; i++) pre[i + 1] = pre[i] + a[i];   // …O(n) repair
System.out.println(pre[7] - pre[2]);`, out: `20
27`, note: 'Fine when the array never changes. With frequent updates, the O(n) repair is what a segment tree avoids.' },
    { name: 'Iterative (2n)', wrap: 'class', code: J`static int n;
static int[] t;

static void build(int[] a) {
    n = a.length;
    t = new int[2 * n];
    for (int i = 0; i < n; i++) t[n + i] = a[i];               // leaves at t[n..2n-1]
    for (int i = n - 1; i > 0; i--) t[i] = t[2 * i] + t[2 * i + 1];
}
static void update(int i, int v) {
    for (t[i += n] = v; i > 1; i /= 2) t[i / 2] = t[i] + t[i ^ 1];
}
static int query(int l, int r) {                                // sum of [l, r)
    int s = 0;
    for (l += n, r += n; l < r; l /= 2, r /= 2) {
        if ((l & 1) == 1) s += t[l++];
        if ((r & 1) == 1) s += t[--r];
    }
    return s;
}

public static void main(String[] args) {
    build(new int[]{5, 8, 6, 3, 2, 7, 2, 6});
    System.out.println(query(0, 8) + " " + query(2, 7));
    update(3, 10);
    System.out.println(query(2, 7));
}`, out: `39 20
27`, note: 'Bottom-up, no recursion, half the memory. Note the **half-open** range `[l, r)`. `i ^ 1` is the sibling of node `i`.' },
    { name: 'Range minimum', wrap: 'class', code: J`static int[] a = {5, 8, 6, 3, 2, 7, 2, 6};
static int[] t = new int[4 * a.length];

static void build(int node, int l, int r) {
    if (l == r) { t[node] = a[l]; return; }
    int m = (l + r) / 2;
    build(2 * node, l, m);
    build(2 * node + 1, m + 1, r);
    t[node] = Math.min(t[2 * node], t[2 * node + 1]);
}
static int min(int node, int l, int r, int ql, int qr) {
    if (qr < l || r < ql) return Integer.MAX_VALUE;     // no overlap: neutral value
    if (ql <= l && r <= qr) return t[node];             // fully inside
    int m = (l + r) / 2;
    return Math.min(min(2 * node, l, m, ql, qr), min(2 * node + 1, m + 1, r, ql, qr));
}

public static void main(String[] args) {
    build(1, 0, a.length - 1);
    System.out.println(min(1, 0, 7, 0, 3) + " " + min(1, 0, 7, 5, 7) + " " + min(1, 0, 7, 0, 7));
}`, out: `3 2 2`, note: 'Only two things change from the sum version: `Math.min` instead of `+`, and the "no overlap" value is `MAX_VALUE` instead of 0.' }
  ],
  build: {
    intro: 'The recursive sum segment tree (LeetCode 307 style). Every method has the same shape: leaf case, split at `m`, recurse, combine.',
    code: J`class SegmentTree {
    private final int n;
    private final int[] tree;          // tree[1] is the root; children of i are 2i and 2i+1

    SegmentTree(int[] a) {
        n = a.length;
        tree = new int[4 * n];
        build(a, 1, 0, n - 1);
    }

    private void build(int[] a, int node, int l, int r) {
        if (l == r) { tree[node] = a[l]; return; }
        int m = (l + r) / 2;
        build(a, 2 * node, l, m);
        build(a, 2 * node + 1, m + 1, r);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    void update(int i, int val) { update(1, 0, n - 1, i, val); }
    private void update(int node, int l, int r, int i, int val) {
        if (l == r) { tree[node] = val; return; }
        int m = (l + r) / 2;
        if (i <= m) update(2 * node, l, m, i, val);
        else update(2 * node + 1, m + 1, r, i, val);
        tree[node] = tree[2 * node] + tree[2 * node + 1];   // fix sums on the way up
    }

    int sum(int ql, int qr) { return sum(1, 0, n - 1, ql, qr); }
    private int sum(int node, int l, int r, int ql, int qr) {
        if (qr < l || r < ql) return 0;                     // no overlap
        if (ql <= l && r <= qr) return tree[node];          // fully covered
        int m = (l + r) / 2;
        return sum(2 * node, l, m, ql, qr) + sum(2 * node + 1, m + 1, r, ql, qr);
    }
}`,
    notes: [
      ['node, l, r', 'Every call carries which node it is and which range that node covers. The range is never stored.'],
      ['4n', 'When n is not a power of two, the recursive tree can use node numbers up to almost 4n.'],
      ['Three cases in sum', 'Outside → 0, inside → stored value, otherwise → split. Memorize this.'],
      ['Combine on the way up', 'After the recursive update, recompute the parent from its two children.']
    ],
    demo: J`SegmentTree st = new SegmentTree(new int[]{5, 8, 6, 3, 2, 7, 2, 6});
System.out.println(st.sum(0, 7) + " " + st.sum(2, 6));
st.update(3, 10);
System.out.println(st.sum(2, 6) + " " + st.sum(3, 3));`,
    out: `39 20
27 10`
  },
  gotchas: [
    ['Array too small', '`new int[2 * n]` is enough only for the iterative version. The recursive one can overflow it.', '`new int[4 * n]`.'],
    ['Inclusive vs exclusive ends', 'The recursive version uses `[l, r]`, the iterative one `[l, r)`. Mixing them is off by one.', 'Write the convention as a comment above `query`.'],
    ['Wrong neutral value', 'Returning 0 for "no overlap" in a **min** tree makes every answer 0 or less.', '0 for sum, `MAX_VALUE` for min, `MIN_VALUE` for max.'],
    ['Overkill', 'A segment tree for a static array is slower and longer than prefix sums.', 'Use it only when updates and queries are mixed.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-sum', title: 'Range sum query', ask: 'Outside, fully inside, or split.', code: J`int sum(int node, int l, int r, int ql, int qr) {
    if (qr < l || r < ql) return [[0]];
    if (ql <= l && r <= qr) return [[tree[node]]];
    int m = [[(l + r) / 2|l + (r - l) / 2]];
    return sum(2 * node, l, m, ql, qr) + sum([[2 * node + 1]], m + 1, r, ql, qr);
}`, ctx: 'int[] tree = new int[32];\nvoid build(int[] a, int node, int l, int r) { if (l == r) { tree[node] = a[l]; return; } int m = (l + r) / 2; build(a, 2 * node, l, m); build(a, 2 * node + 1, m + 1, r); tree[node] = tree[2 * node] + tree[2 * node + 1]; }', test: 'Sol s = new Sol(); s.build(new int[]{5, 8, 6, 3, 2, 7, 2, 6}, 1, 0, 7); System.out.println(s.sum(1, 0, 7, 2, 6) + " " + s.sum(1, 0, 7, 0, 0));', out: '20 5' },
      { id: 'fb-upd', title: 'Point update', ask: 'Go down to the leaf, set it, then repair each parent on the way back.', code: J`void update(int node, int l, int r, int i, int val) {
    if (l == r) { tree[node] = [[val]]; return; }
    int m = (l + r) / 2;
    if (i [[<=]] m) update(2 * node, l, m, i, val);
    else update(2 * node + 1, [[m + 1]], r, i, val);
    tree[node] = [[tree[2 * node] + tree[2 * node + 1]]];
}`, ctx: 'int[] tree = new int[32];\nvoid build(int[] a, int node, int l, int r) { if (l == r) { tree[node] = a[l]; return; } int m = (l + r) / 2; build(a, 2 * node, l, m); build(a, 2 * node + 1, m + 1, r); tree[node] = tree[2 * node] + tree[2 * node + 1]; }\nint sum(int node, int l, int r, int ql, int qr) { if (qr < l || r < ql) return 0; if (ql <= l && r <= qr) return tree[node]; int m = (l + r) / 2; return sum(2 * node, l, m, ql, qr) + sum(2 * node + 1, m + 1, r, ql, qr); }', test: 'Sol s = new Sol(); s.build(new int[]{5, 8, 6, 3, 2, 7, 2, 6}, 1, 0, 7); s.update(1, 0, 7, 3, 10); System.out.println(s.sum(1, 0, 7, 2, 6) + " " + s.tree[1]);', out: '27 46' }
    ],
    order: [
      { id: 'od-build', title: 'Build the iterative tree',
        ideaSteps: ['Remember n and allocate 2n slots.', 'Copy the array into the leaves, slots n to 2n-1.', 'Fill internal nodes from n-1 **down** to 1, each as the sum of its two children (which are already done).'],
        lines: [
          'void build(int[] a) {',
          '    n = a.length;',
          '    t = new int[2 * n];',
          '    for (int i = 0; i < n; i++) t[n + i] = a[i];',
          '    for (int i = n - 1; i > 0; i--) t[i] = t[2 * i] + t[2 * i + 1];',
          '}'
        ],
        extra: ['    for (int i = 1; i < n; i++) t[i] = t[2 * i] + t[2 * i + 1];'],
        check: { wrap: 'sol', ctx: 'int n;\nint[] t;\nint query(int l, int r) { int s = 0; for (l += n, r += n; l < r; l /= 2, r /= 2) { if ((l & 1) == 1) s += t[l++]; if ((r & 1) == 1) s += t[--r]; } return s; }', test: 'Sol s = new Sol(); s.build(new int[]{5, 8, 6, 3, 2, 7, 2, 6}); System.out.println(s.query(0, 8) + " " + s.query(2, 7));', out: '39 20' } }
    ]
  },
  patterns: ['prefix-sum', 'binary-search', 'intervals'],
  patternWhy: {
    'prefix-sum': 'The static version of the same question; a segment tree adds updates.',
    'binary-search': 'Descending the tree halves the range at each level, like binary search.',
    intervals: 'Overlap counting and booking problems are range queries over time.'
  },
  problems: [['303', 'Range Sum Query - Immutable'], ['307', 'Range Sum Query - Mutable'], ['315', 'Count of Smaller Numbers After Self'], ['732', 'My Calendar III'], ['218', 'The Skyline Problem']]
});
})();
