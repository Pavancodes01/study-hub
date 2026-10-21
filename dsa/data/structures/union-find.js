(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
var N = 8;
function mk(n){ var p = [], sz = []; for (var i = 0; i < n; i++){ p.push(i); sz.push(1); } return { p: p, sz: sz }; }
function pathOf(s, x){ var path = [x]; while (s.p[x] !== x){ x = s.p[x]; path.push(x); } return path; }
// Full path compression: every node on the path points at the root.
function find(s, x, compress){ var path = pathOf(s, x), root = path[path.length - 1]; if (compress) path.forEach(function(v){ s.p[v] = root; }); return { root: root, path: path }; }
function union(s, a, b){
  var ra = find(s, a, true).root, rb = find(s, b, true).root;
  if (ra === rb) return { same: true, root: ra };
  if (s.sz[ra] < s.sz[rb]){ var t = ra; ra = rb; rb = t; }
  s.p[rb] = ra; s.sz[ra] += s.sz[rb];
  return { same: false, root: ra, child: rb };
}
function groups(s){ var c = 0; s.p.forEach(function(v, i){ if (v === i) c++; }); return c; }
function views(s, cls, name){
  var c = cls || {};
  var nodes = s.p.map(function(par, i){ return { id: i, label: i, parent: par === i ? null : par, cls: c[i] || (par === i ? 'on-l' : '') }; });
  var szv = s.sz.map(function(v, i){ return s.p[i] === i ? v : ''; });
  return [
    { type: 'ntree', name: name || 'forest: arrows point to the parent · ' + groups(s) + ' group(s)', nodes: nodes, up: true },
    arr(s.p.slice(), [], { name: 'parent[]', cls: c }),
    arr(szv, [], { name: 'size[] (roots only)' })
  ];
}
function pc(path){ var c = {}; path.forEach(function(v){ c[v] = 'on-a'; }); c[path[path.length - 1]] = 'on-hit'; return c; }
function ok(x){ return x >= 0 && x < N; }

registerStructure({
  slug: 'union-find', order: 15, group: 'adv', title: 'Union-Find (Disjoint Set)',
  oneLiner: 'Keeps items in groups and answers "are a and b in the same group?" in **nearly O(1)**. Each item points to a parent; the root names the group. Merging two groups is one pointer change.',
  legend: [['l', 'root (group name)'], ['a', 'path walked'], ['hit', 'root found']],
  compare: { access: 'O(α(n))', search: 'O(α(n))', insert: 'O(α(n)) union', remove: '—', ordered: 'no order', space: 'O(n)', java: 'int[] parent', note: 'merge groups' },
  idea: [
    'Start with every item in its own group: `parent[i] = i`. An item whose parent is itself is a **root**, and the root is the name of the group.',
    '`find(x)` follows parent pointers up to the root. Two items are in the same group exactly when they have the same root.',
    '`union(a, b)` finds both roots and makes one point to the other. The whole group moves with one assignment.',
    'Two tricks keep the trees flat. **Path compression**: after `find`, point every node on the path straight at the root. **Union by size/rank**: hang the smaller tree under the bigger one. Together, each operation costs O(α(n)), where α grows so slowly it is below 5 for any real input.'
  ],
  anatomy: {
    title: 'Groups as trees in one array',
    panels: views({ p: [0, 0, 0, 3, 3, 5, 3, 7], sz: [3, 1, 1, 3, 1, 1, 1, 1] }, {}, 'groups {0,1,2}, {3,4,6}, {5}, {7}'),
    notes: [
      '`parent[4] = 3`: 4 belongs to the group whose root is 3.',
      'Roots point to themselves: 0, 3, 5 and 7, so there are 4 groups.',
      'There are no child pointers. You can only walk **up**, which is all `find` needs.'
    ]
  },
  demo: {
    title: 'Union, then find with path compression',
    sub: 'Six items. Union without size balancing to build a tall chain, then watch one `find` flatten it.',
    code: [
      'int find(int x) {',
      '    if (parent[x] != x) parent[x] = find(parent[x]);   // compress',
      '    return parent[x];',
      '}',
      'void union(int a, int b) {',
      '    parent[find(a)] = find(b);',
      '}'
    ],
    steps: function(){
      var s = mk(6), out = [];
      function P(c, nm){ return views(s, c, nm); }
      out.push({ panels: P({}), line: null, vars: { groups: 6 }, msg: 'Six roots, six groups. `parent[i] = i` for everyone.' });
      [[0, 1], [1, 2], [2, 3], [3, 4]].forEach(function(e){
        var ra = find(s, e[0], false).root, rb = find(s, e[1], false).root;
        s.p[ra] = rb;
        var c = {}; c[ra] = 'on-a'; c[rb] = 'on-hit';
        out.push({ panels: P(c), line: 5, vars: { a: e[0], b: e[1], groups: groups(s) }, msg: '`union(' + e[0] + ', ' + e[1] + ')`: root ' + ra + ' now points to root ' + rb + '. One assignment merged the groups.' });
      });
      var path = pathOf(s, 0);
      out.push({ panels: P(pc(path)), line: [0, 1], vars: { x: 0, steps: path.length - 1 }, msg: 'Careless unions made a chain. `find(0)` walks **' + path.join(' → ') + '**: ' + (path.length - 1) + ' steps.' });
      find(s, 0, true);
      var c2 = {}; path.forEach(function(v){ c2[v] = 'on-a'; }); c2[4] = 'on-hit';
      out.push({ panels: P(c2), line: 1, vars: { x: 0 }, msg: 'Path compression: on the way back, every node on that path is pointed **straight at root 4**.' });
      out.push({ panels: P({ 0: 'on-hit', 4: 'on-l' }), line: 2, ok: true, vars: { steps: 1 }, msg: 'Now `find(0)`, `find(1)`, `find(2)` take one step. Add union by size and trees never get tall to begin with: nearly O(1) per operation.' });
      return out;
    }
  },
  play: {
    title: 'Union-Find playground',
    hint: 'Items 0–7. `union` hangs the smaller group under the bigger one; `find` compresses the path it walks. Build a few groups, then ask `connected`.',
    inputs: [{ ph: 'a', type: 'number' }, { ph: 'b', type: 'number' }],
    setup: 'UnionFind uf = new UnionFind(8);',
    start: 'Eight separate groups.',
    init: function(){ return mk(N); },
    ops: [
      { id: 'union', label: 'union(a, b)', args: 2, cost: 'O(α)', run: function(s, a, b){
        if (!ok(a) || !ok(b)) return { err: 'Items are 0 to 7.' };
        var r = union(s, a, b), c = {};
        if (r.same){ c[r.root] = 'on-hit'; return { java: 'uf.union(' + a + ', ' + b + ');', ret: false, hl: { cls: c }, msg: a + ' and ' + b + ' already share root ' + r.root + '. Nothing to merge (in a graph, this edge would close a **cycle**).' }; }
        c[r.child] = 'on-a'; c[r.root] = 'on-hit';
        return { java: 'uf.union(' + a + ', ' + b + ');', ret: true, hl: { cls: c }, msg: 'Root ' + r.child + ' (smaller group) now points to root ' + r.root + '. Group size ' + s.sz[r.root] + '. ' + groups(s) + ' group(s) left.' };
      } },
      { id: 'find', label: 'find(a)', args: 1, cost: 'O(α)', run: function(s, a){
        if (!ok(a)) return { err: 'Items are 0 to 7.' };
        var before = pathOf(s, a), r = find(s, a, true);
        return { java: 'uf.find(' + a + ');', ret: r.root, hl: { cls: pc(before) }, msg: 'Walked ' + before.join(' → ') + '. Root **' + r.root + '**.' + (before.length > 2 ? ' Every node on the path now points straight at it.' : '') };
      } },
      { id: 'conn', label: 'connected(a, b)', args: 2, cost: 'O(α)', run: function(s, a, b){
        if (!ok(a) || !ok(b)) return { err: 'Items are 0 to 7.' };
        var pa = pathOf(s, a), pb = pathOf(s, b), ra = find(s, a, true).root, rb = find(s, b, true).root, c = pc(pa);
        pb.forEach(function(v){ c[v] = 'on-a'; }); c[ra] = 'on-hit'; c[rb] = 'on-hit';
        return { java: 'uf.connected(' + a + ', ' + b + ');', ret: ra === rb, ok: ra === rb, hl: { cls: c }, msg: 'Root of ' + a + ' is ' + ra + ', root of ' + b + ' is ' + rb + ': ' + (ra === rb ? '**same group**.' : '**different groups**.') };
      } },
      { id: 'count', label: 'count()', cost: 'O(1)', run: function(s){ return { java: 'uf.count();', ret: groups(s), msg: 'A counter that starts at n and drops by one on every successful union.' }; } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 4; i++) o.push(['union', rnd(0, 7), rnd(0, 7)]); return o; },
    view: function(s, hl){ return views(s, hl.cls); }
  },
  ops: [
    ['Find the group', 'uf.find(x)', 'O(α(n))', 'Walk to the root; compression keeps paths short.'],
    ['Merge two groups', 'uf.union(a, b)', 'O(α(n))', 'Two finds plus one pointer change.'],
    ['Same group?', 'find(a) == find(b)', 'O(α(n))', 'Compare roots.'],
    ['Number of groups', 'uf.count()', 'O(1)', 'Keep a counter.'],
    ['Split a group / delete', 'not supported', '—', 'Union-Find only ever merges.'],
    ['Without the two tricks', 'naive parent links', 'O(n)', 'Trees can become chains.']
  ],
  when: ['connected components that only grow', 'are a and b connected?', 'cycle in an undirected graph', 'Kruskal minimum spanning tree', 'group equal things (accounts, equations)', 'count islands as cells join'],
  whenNot: [
    ['Need the actual path, or distances', 'Graph + BFS', 'graph'],
    ['Edges get removed', 'Graph search after each change', 'graph'],
    ['Directed reachability', 'Graph + DFS', 'graph']
  ],
  classes: [
    ['int[] parent (+ int[] size)', 'Items numbered 0..n-1. The usual form.'],
    ['Map<T, T> parent', 'Items are strings or objects.'],
    ['your own UnionFind class', 'Java has none built in.']
  ],
  apiIntro: 'Java has no union-find class; these are the shapes you write in practice. Each runs as shown.',
  api: [
    { name: 'Smallest version', wrap: 'class', code: J`static int[] parent;

static int find(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];     // path halving: skip a level
        x = parent[x];
    }
    return x;
}
static boolean union(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return false;            // already together
    parent[ra] = rb;
    return true;
}

public static void main(String[] args) {
    int n = 6;
    parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    union(0, 1);
    union(1, 2);
    union(3, 4);
    System.out.println((find(0) == find(2)) + " " + (find(0) == find(3)));
    System.out.println(union(2, 0) + " " + union(2, 3));
}`, out: `true false
false true`, note: 'An iterative `find` with path halving: no recursion, nearly as flat as full compression.' },
    { name: 'Union by size', wrap: 'class', code: J`static int[] parent, size;
static int components;

static int find(int x) {
    if (parent[x] != x) parent[x] = find(parent[x]);    // path compression
    return parent[x];
}
static void union(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return;
    if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
    parent[rb] = ra;                                     // small tree under big root
    size[ra] += size[rb];
    components--;
}

public static void main(String[] args) {
    int n = 7;
    parent = new int[n];
    size = new int[n];
    components = n;
    for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    int[][] edges = {{0, 1}, {1, 2}, {3, 4}, {5, 6}, {4, 5}};
    for (int[] e : edges) union(e[0], e[1]);
    System.out.println(components + " groups, biggest has " + size[find(3)]);
}`, out: `2 groups, biggest has 4`, note: '`size[root]` gives the group size for free.' },
    { name: 'Cycle detection', wrap: 'class', code: J`static int[] parent = new int[5];
static int find(int x) { return parent[x] == x ? x : (parent[x] = find(parent[x])); }

public static void main(String[] args) {
    for (int i = 0; i < 5; i++) parent[i] = i;
    int[][] edges = {{1, 2}, {1, 3}, {2, 3}, {3, 4}};
    for (int[] e : edges) {
        int a = find(e[0]), b = find(e[1]);
        if (a == b) System.out.println("cycle at " + Arrays.toString(e));
        else parent[a] = b;
    }
}`, out: `cycle at [2, 3]`, note: 'If both ends of a new edge already share a root, the edge closes a cycle.' },
    { name: 'String items', wrap: 'class', code: J`static Map<String, String> parent = new HashMap<>();

static String find(String x) {
    parent.putIfAbsent(x, x);
    if (!parent.get(x).equals(x)) parent.put(x, find(parent.get(x)));
    return parent.get(x);
}
static void union(String a, String b) { parent.put(find(a), find(b)); }

public static void main(String[] args) {
    union("alice", "bob");
    union("carol", "dave");
    union("bob", "dave");
    System.out.println(find("alice").equals(find("carol")) + " " + find("erin").equals(find("alice")));
}`, out: `true false`, note: 'Items are added the first time `find` sees them. Compare roots with `equals`, not `==`.' }
  ],
  build: {
    intro: 'A complete union-find with path compression, union by rank and a group counter. This is the class to type from memory.',
    code: J`class UnionFind {
    private final int[] parent, rank;
    private int count;

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        count = n;
        for (int i = 0; i < n; i++) parent[i] = i;       // everyone is their own root
    }

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);  // point straight at the root
        return parent[x];
    }

    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;                                   // shorter tree goes under
        if (rank[ra] == rank[rb]) rank[ra]++;
        count--;
        return true;
    }

    boolean connected(int a, int b) { return find(a) == find(b); }
    int count() { return count; }
}`,
    notes: [
      ['parent[i] = i', 'Forgetting this makes every item look like it belongs to group 0.'],
      ['rank', 'An upper bound on tree height. Only grows when two equal-rank trees merge.'],
      ['union returns boolean', '`false` means "already connected", which is how cycle detection and Kruskal skip edges.'],
      ['count', 'Starts at n; each real merge removes one group.']
    ],
    demo: J`UnionFind uf = new UnionFind(6);
uf.union(0, 1);
uf.union(2, 3);
uf.union(1, 3);
System.out.println(uf.connected(0, 2) + " " + uf.connected(0, 4) + " groups " + uf.count());
System.out.println(uf.union(0, 3) + " groups " + uf.count());`,
    out: `true false groups 3
false groups 3`
  },
  gotchas: [
    ['Comparing parents instead of roots', '`parent[a] == parent[b]` misses items deeper in the same tree.', 'Always compare `find(a) == find(b)`.'],
    ['Linking items, not roots', '`parent[a] = b` cuts `a` out of its old group.', '`parent[find(a)] = find(b)`.'],
    ['1-indexed input', 'Vertices 1..n need an array of size n + 1.', '`new int[n + 1]`.'],
    ['Deep recursion without balancing', 'Recursive `find` on a long chain can overflow the stack.', 'Union by size/rank, or an iterative `find`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-uf', title: 'find and union', ask: 'Compress on the way back up; link roots, not items.', code: J`int find(int x) {
    if (parent[x] != [[x]]) parent[x] = find([[parent[x]]]);
    return parent[x];
}
boolean union(int a, int b) {
    int ra = [[find(a)]], rb = find(b);
    if (ra == rb) return [[false]];
    parent[ra] = [[rb]];
    return true;
}`, ctx: 'int[] parent = new int[10];\n{ for (int i = 0; i < 10; i++) parent[i] = i; }', test: 'Sol s = new Sol(); s.union(1, 2); s.union(3, 4); System.out.println(s.union(2, 1) + " " + (s.find(1) == s.find(2)) + " " + (s.find(1) == s.find(3)) + " " + s.union(1, 4));', out: 'false true false true' },
      { id: 'fb-provinces', title: 'Number of provinces', ask: 'Start with n groups; every merge of two different roots removes one.', code: J`int findCircleNum(int[][] g) {
    int n = g.length, count = [[n]];
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            if (g[i][j] == 0) continue;
            int a = root(parent, i), b = root(parent, j);
            if (a != b) { parent[a] = b; [[count--|--count|count -= 1]]; }
        }
    return count;
}
int root(int[] p, int x) {
    while (p[x] != x) x = [[p[x]]];
    return x;
}`, test: 'System.out.println(new Sol().findCircleNum(new int[][]{{1, 1, 0}, {1, 1, 0}, {0, 0, 1}}) + " " + new Sol().findCircleNum(new int[][]{{1, 0, 0}, {0, 1, 0}, {0, 0, 1}}));', out: '2 3' }
    ],
    order: [
      { id: 'od-redundant', title: 'Redundant connection',
        ideaSteps: ['Vertices are 1..n, so make `parent` of size n + 1 and point each at itself.', 'For each edge, find both roots.', 'Same root: this edge closes a cycle, return it.', 'Otherwise link one root under the other.'],
        lines: [
          'int[] findRedundantConnection(int[][] edges) {',
          '    int[] parent = new int[edges.length + 1];',
          '    for (int i = 0; i < parent.length; i++) parent[i] = i;',
          '    for (int[] e : edges) {',
          '        int a = find(parent, e[0]), b = find(parent, e[1]);',
          '        if (a == b) return e;',
          '        parent[a] = b;',
          '    }',
          '    return new int[0];',
          '}',
          'int find(int[] p, int x) {',
          '    while (p[x] != x) x = p[x];',
          '    return x;',
          '}'
        ],
        extra: ['    int[] parent = new int[edges.length];'],
        check: { wrap: 'sol', test: 'System.out.println(Arrays.toString(new Sol().findRedundantConnection(new int[][]{{1, 2}, {1, 3}, {2, 3}})) + " " + Arrays.toString(new Sol().findRedundantConnection(new int[][]{{1, 2}, {2, 3}, {3, 4}, {1, 4}, {1, 5}})));', out: '[2, 3] [1, 4]' } }
    ]
  },
  patterns: ['graphs', 'greedy'],
  patternWhy: {
    graphs: 'Components, cycle detection and Kruskal\'s MST.',
    greedy: 'Kruskal greedily takes the cheapest edge that joins two different groups.'
  },
  problems: [['547', 'Number of Provinces'], ['684', 'Redundant Connection'], ['990', 'Satisfiability of Equality Equations'], ['721', 'Accounts Merge'], ['1584', 'Min Cost to Connect All Points'], ['1971', 'Find if Path Exists in Graph']]
});
})();
