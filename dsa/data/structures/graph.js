(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
var N = 8;
// Nodes 0..7 on a circle.
var POS = (function(){ var o = []; for (var i = 0; i < N; i++){ var a = -Math.PI / 2 + 2 * Math.PI * i / N; o.push({ id: i, x: Math.round(160 + 115 * Math.cos(a)), y: Math.round(135 + 105 * Math.sin(a)) }); } return o; })();
function adj(s){ var a = []; for (var i = 0; i < N; i++) a.push([]); s.e.forEach(function(e){ a[e[0]].push(e[1]); a[e[1]].push(e[0]); }); a.forEach(function(l){ l.sort(function(x, y){ return x - y; }); }); return a; }
function has(s, a, b){ return s.e.some(function(e){ return (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a); }); }
function bfs(s, start){ var A = adj(s), seen = {}, order = [], tree = [], dist = {}, par = {}; seen[start] = 1; dist[start] = 0; var q = [start]; while (q.length){ var u = q.shift(); order.push(u); A[u].forEach(function(v){ if (!seen[v]){ seen[v] = 1; dist[v] = dist[u] + 1; par[v] = u; tree.push(u + '-' + v); q.push(v); } }); } return { order: order, tree: tree, dist: dist, par: par }; }
function dfs(s, start){ var A = adj(s), seen = {}, order = [], tree = []; (function go(u){ seen[u] = 1; order.push(u); A[u].forEach(function(v){ if (!seen[v]){ tree.push(u + '-' + v); go(v); } }); })(start); return { order: order, tree: tree }; }
function views(s, hl){
  var A = adj(s), cls = hl.cls || {};
  var rows = A.map(function(l, i){ return l.map(function(v){ return { t: v, cls: hl.row === i ? 'on-a' : '' }; }); });
  var rc = {}; if (hl.row !== undefined) rc[hl.row] = 'on-a';
  var grid = [], gc = {};
  for (var r = 0; r < N; r++){ var row = []; for (var c = 0; c < N; c++){ var on = has(s, r, c); row.push(on ? 1 : 0); if (on) gc[r + ',' + c] = 'on-hit'; } grid.push(row); }
  if (hl.cell) hl.cell.forEach(function(k){ gc[k] = 'on-a'; });
  var heads = []; for (var i = 0; i < N; i++) heads.push(i);
  return [
    { type: 'graph', name: 'graph (' + N + ' vertices, ' + s.e.length + ' edges)', nodes: POS.map(function(p){ return { id: p.id, x: p.x, y: p.y }; }), edges: s.e.map(function(e){ return [e[0], e[1]]; }), cls: cls, hot: hl.hot || [], w: 320, h: 270 },
    { type: 'buckets', name: 'adjacency list: List<List<Integer>>', rows: rows, rowCls: rc, emptyText: '[ ]', arrow: ',' },
    { type: 'grid', name: 'adjacency matrix: boolean[8][8]', rows: grid, cls: gc, rowHeads: heads, colHeads: heads }
  ];
}
function orderCls(order, start){ var c = {}; order.forEach(function(v){ c[v] = 'on-a'; }); c[start] = 'on-l'; return c; }
var SAMPLE = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [5, 6]];

registerStructure({
  slug: 'graph', order: 14, group: 'adv', title: 'Graph',
  oneLiner: 'Things (**vertices**) and connections between them (**edges**). Store it as an **adjacency list**: for each vertex, the list of its neighbours. BFS and DFS visit everything reachable in O(V + E).',
  legend: [['l', 'start'], ['a', 'visited'], ['hit', 'edge / target']],
  compare: { access: 'O(deg)', search: 'O(V + E)', insert: 'O(1) edge', remove: 'O(deg)', ordered: 'no order', space: 'O(V + E)', java: 'List<List<Integer>>', note: 'BFS / DFS' },
  idea: [
    'A graph is the most general structure: any vertex may connect to any other. Trees and linked lists are special graphs. Edges can be **undirected** (friendship) or **directed** (one-way street), and may carry a **weight** (distance, cost).',
    'Java has no graph class; you build one. The usual way is an **adjacency list**: `List<List<Integer>> adj`, where `adj.get(u)` holds u\'s neighbours. It uses O(V + E) memory and lets you loop over a vertex\'s neighbours directly.',
    'An **adjacency matrix** `boolean[V][V]` answers "is there an edge u–v?" in O(1), but always uses V² memory and listing neighbours costs O(V). Use it only for small, dense graphs.',
    'Almost every graph algorithm is BFS (a queue: nearest first, shortest paths in unweighted graphs) or DFS (recursion / stack: go deep, components, cycles, topological order), plus a **visited** set so you never loop forever.'
  ],
  anatomy: {
    title: 'One graph, three ways to store it',
    panels: views({ e: SAMPLE }, {}),
    notes: [
      'Each undirected edge appears **twice** in the list: 0–1 is stored as 1 in `adj[0]` and 0 in `adj[1]`.',
      'The matrix is symmetric for an undirected graph, and mostly zeros: 6 edges use 12 of 64 cells.',
      'Vertex 7 has no edges and 5–6 is a separate piece: graphs can have several **components**.'
    ]
  },
  demo: {
    title: 'BFS from vertex 0',
    sub: 'Breadth-first search visits vertices in order of distance. Every vertex is queued once, every edge looked at twice: O(V + E).',
    code: [
      'Deque<Integer> q = new ArrayDeque<>();',
      'q.offer(start); seen[start] = true;',
      'while (!q.isEmpty()) {',
      '    int u = q.poll();',
      '    for (int v : adj.get(u)) {',
      '        if (seen[v]) continue;',
      '        seen[v] = true;             // mark when queued',
      '        dist[v] = dist[u] + 1;',
      '        q.offer(v);',
      '    }',
      '}'
    ],
    steps: function(){
      var s = { e: SAMPLE }, A = adj(s), seen = { 0: 1 }, dist = { 0: 0 }, q = [0], tree = [], out = [];
      function P(cur){
        var c = {}; Object.keys(seen).forEach(function(k){ c[k] = 'on-a'; }); if (cur !== undefined) c[cur] = 'on-l';
        var dv = []; for (var i = 0; i < N; i++) dv.push(dist[i] === undefined ? '∞' : dist[i]);
        return [views(s, { cls: c, hot: tree.slice() })[0], arr(q.slice(), q.length ? [{ i: 0, label: 'front', c: 'l' }] : [], { name: 'queue', ix: false }), arr(dv, [], { name: 'dist[0..7]' })];
      }
      out.push({ panels: P(0), line: 1, vars: { start: 0 }, msg: 'Queue the start and mark it seen. Its distance is 0.' });
      while (q.length){
        var u = q.shift(), added = [];
        A[u].forEach(function(v){ if (!seen[v]){ seen[v] = 1; dist[v] = dist[u] + 1; tree.push(u + '-' + v); q.push(v); added.push(v); } });
        out.push({ panels: P(u), line: added.length ? [3, 6, 8] : [3, 5], vars: { u: u, neighbours: '[' + A[u].join(', ') + ']' }, msg: 'Poll **' + u + '** (distance ' + dist[u] + '). ' + (added.length ? 'New neighbours ' + added.join(', ') + ' get distance ' + (dist[u] + 1) + ' and join the queue.' : 'All its neighbours are already seen.') });
      }
      out.push({ panels: P(), line: null, ok: true, vars: {}, msg: 'Done. Orange edges form the BFS tree: shortest routes from 0. Vertices 5, 6 and 7 were never reached: other components (dist stays ∞).' });
      return out;
    }
  },
  play: {
    title: 'Graph playground',
    hint: 'Eight vertices, 0–7, undirected. Type two vertices to add or remove an edge; one vertex to run BFS or DFS from it. All three storage views update together.',
    inputs: [{ ph: 'u', type: 'number', keep: true }, { ph: 'v', type: 'number' }],
    setup: 'List<List<Integer>> adj = new ArrayList<>();   // 8 empty lists',
    start: 'No edges yet. Try `Random fill`, or add 0–1, 1–2, 2–3.',
    init: function(){ return { e: [] }; },
    ops: [
      { id: 'add', label: 'addEdge(u, v)', args: 2, cost: 'O(1)', run: function(s, a, b){
        if (a < 0 || b < 0 || a >= N || b >= N) return { err: 'Vertices are 0 to 7.' };
        if (a === b) return { err: 'A self-loop (' + a + '–' + a + ') is allowed in theory, but this playground skips it to keep the picture clear.' };
        if (has(s, a, b)) return { err: 'Edge ' + a + '–' + b + ' already exists.' };
        s.e.push([Math.min(a, b), Math.max(a, b)]);
        var c = {}; c[a] = 'on-hit'; c[b] = 'on-hit';
        return { java: 'adj.get(' + a + ').add(' + b + '); adj.get(' + b + ').add(' + a + ');', hl: { cls: c, hot: [a + '-' + b, b + '-' + a], cell: [a + ',' + b, b + ',' + a] }, msg: 'Undirected, so the edge is stored in **both** lists, and in two matrix cells.' };
      } },
      { id: 'rm', label: 'removeEdge(u, v)', args: 2, cost: 'O(deg)', run: function(s, a, b){
        if (!has(s, a, b)) return { err: 'There is no edge ' + a + '–' + b + '.' };
        s.e = s.e.filter(function(e){ return !((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a)); });
        return { java: 'adj.get(' + a + ').remove(Integer.valueOf(' + b + ')); adj.get(' + b + ').remove(Integer.valueOf(' + a + '));', msg: 'Removing from a list means scanning it: O(degree). The matrix would just clear two cells: O(1).' };
      } },
      { id: 'nb', label: 'neighbours(u)', args: 1, cost: 'O(deg)', run: function(s, a){
        if (a < 0 || a >= N) return { err: 'Vertices are 0 to 7.' };
        var l = adj(s)[a], c = {}; c[a] = 'on-l'; l.forEach(function(v){ c[v] = 'on-a'; });
        return { java: 'adj.get(' + a + ');', ret: '[' + l.join(', ') + ']', hl: { cls: c, row: a }, msg: 'The list answers directly. The matrix would need to check all 8 cells of row ' + a + '.' };
      } },
      { id: 'bfs', label: 'bfs(u)', args: 1, cost: 'O(V+E)', run: function(s, a){
        if (a < 0 || a >= N) return { err: 'Vertices are 0 to 7.' };
        var r = bfs(s, a);
        return { java: 'bfs(adj, ' + a + ');', ret: '[' + r.order.join(', ') + ']', hl: { cls: orderCls(r.order, a), hot: r.tree }, msg: 'Visit order **' + r.order.join(' → ') + '**: nearest first. Orange edges are the BFS tree = shortest paths from ' + a + '. ' + (r.order.length < N ? (N - r.order.length) + ' vertex(es) unreachable.' : '') };
      } },
      { id: 'dfs', label: 'dfs(u)', args: 1, cost: 'O(V+E)', run: function(s, a){
        if (a < 0 || a >= N) return { err: 'Vertices are 0 to 7.' };
        var r = dfs(s, a);
        return { java: 'dfs(adj, ' + a + ', seen);', ret: '[' + r.order.join(', ') + ']', hl: { cls: orderCls(r.order, a), hot: r.tree }, msg: 'Visit order **' + r.order.join(' → ') + '**: always go deeper first, back up when stuck. Compare the shape with BFS.' };
      } },
      { id: 'path', label: 'shortest path(u, v)', args: 2, cost: 'O(V+E)', run: function(s, a, b){
        if (a < 0 || b < 0 || a >= N || b >= N) return { err: 'Vertices are 0 to 7.' };
        var r = bfs(s, a);
        if (r.dist[b] === undefined) return { java: 'bfs(adj, ' + a + ');', ret: -1, hl: { cls: orderCls(r.order, a) }, msg: b + ' is not reachable from ' + a + '.' };
        var p = [b]; while (p[0] !== a) p.unshift(r.par[p[0]]);
        var hot = []; for (var i = 1; i < p.length; i++) hot.push(p[i - 1] + '-' + p[i]);
        var c = {}; p.forEach(function(v){ c[v] = 'on-hit'; }); c[a] = 'on-l';
        return { java: 'bfs(adj, ' + a + ');   // then follow parent[] back from ' + b, ret: r.dist[b], ok: true, hl: { cls: c, hot: hot }, msg: 'Shortest path **' + p.join(' → ') + '** with ' + r.dist[b] + ' edge(s). BFS records each vertex\'s parent; walk them back from the target.' };
      } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 7; i++) o.push(['add', rnd(0, 7), rnd(0, 7)]); return o; },
    view: function(s, hl){ return views(s, hl); }
  },
  ops: [
    ['Add an edge', 'adj.get(u).add(v)', 'O(1)', 'Append to a list (twice if undirected).'],
    ['List neighbours', 'adj.get(u)', 'O(deg)', 'Exactly the edges of u. Matrix: O(V).'],
    ['Edge exists?', 'adj.get(u).contains(v)', 'O(deg)', 'Scan u\'s list. Matrix: O(1).'],
    ['Visit everything reachable', 'BFS / DFS', 'O(V + E)', 'Each vertex once, each edge once per direction.'],
    ['Shortest path, unweighted', 'BFS', 'O(V + E)', 'First time BFS reaches a vertex is by a shortest route.'],
    ['Shortest path, weighted', 'Dijkstra with a heap', 'O(E log V)', 'Always expand the closest unfinished vertex.'],
    ['Memory', 'list vs matrix', 'O(V + E)', 'Matrix needs O(V²) regardless of edges.']
  ],
  when: ['connections / networks', 'grid of cells (implicit graph)', 'shortest path', 'number of components / islands', 'dependencies / course order', 'cycle detection', 'reachability'],
  whenNot: [
    ['Connections only grow, ask "same group?"', 'Union-Find (simpler, faster)', 'union-find'],
    ['A strict hierarchy (one parent each)', 'Tree', 'binary-tree'],
    ['Data is just a sequence', 'List / array', 'arraylist']
  ],
  classes: [
    ['List<List<Integer>>', 'Vertices numbered 0..n-1. The usual choice.'],
    ['List<List<int[]>>', 'Weighted: each entry `{neighbour, weight}`.'],
    ['Map<String, List<String>>', 'Vertices with names instead of numbers.'],
    ['boolean[][] / int[][]', 'Adjacency matrix: small dense graphs, Floyd–Warshall.']
  ],
  api: [
    { name: 'Build a list', code: J`int n = 5;
int[][] edges = {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}};
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
for (int[] e : edges) {
    adj.get(e[0]).add(e[1]);
    adj.get(e[1]).add(e[0]);          // undirected: both directions
}
System.out.println(adj);
System.out.println("degree of 3: " + adj.get(3).size());`, out: `[[1, 2], [0, 3], [0, 3], [1, 2, 4], [3]]
degree of 3: 3`, note: 'Create every inner list first. `new ArrayList<>()` per vertex, never one shared list.' },
    { name: 'BFS distances', code: J`int n = 5;
int[][] edges = {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}};
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
int[] dist = new int[n];
Arrays.fill(dist, -1);                 // -1 = not seen yet
Deque<Integer> q = new ArrayDeque<>();
q.offer(0);
dist[0] = 0;
while (!q.isEmpty()) {
    int u = q.poll();
    for (int v : adj.get(u)) {
        if (dist[v] != -1) continue;
        dist[v] = dist[u] + 1;
        q.offer(v);
    }
}
System.out.println(Arrays.toString(dist));`, out: `[0, 1, 1, 2, 3]`, note: '`dist[v] == -1` doubles as the visited check.' },
    { name: 'DFS components', wrap: 'class', code: J`static List<List<Integer>> adj = new ArrayList<>();
static boolean[] seen;

static void dfs(int u) {
    seen[u] = true;
    for (int v : adj.get(u)) if (!seen[v]) dfs(v);
}

public static void main(String[] args) {
    int n = 6;
    int[][] edges = {{0, 1}, {1, 2}, {3, 4}};      // 5 is alone
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
    seen = new boolean[n];
    int components = 0;
    for (int i = 0; i < n; i++) if (!seen[i]) { dfs(i); components++; }
    System.out.println(components + " components");
}`, out: `3 components`, note: 'Start a DFS from every vertex not yet seen. Each start is a new component.' },
    { name: 'Topological order', code: J`int n = 4;
int[][] pre = {{1, 0}, {2, 0}, {3, 1}, {3, 2}};    // {course, needs}
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
int[] indeg = new int[n];
for (int[] p : pre) { adj.get(p[1]).add(p[0]); indeg[p[0]]++; }
Deque<Integer> q = new ArrayDeque<>();
for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
List<Integer> order = new ArrayList<>();
while (!q.isEmpty()) {
    int u = q.poll();
    order.add(u);
    for (int v : adj.get(u)) if (--indeg[v] == 0) q.offer(v);
}
System.out.println(order.size() == n ? order : "cycle!");`, out: `[0, 1, 2, 3]`, note: 'Directed graph: an edge goes only one way. Kahn\'s algorithm takes vertices with no remaining prerequisites. If some never reach 0, there is a cycle.' },
    { name: 'Dijkstra', code: J`int n = 4;
int[][] edges = {{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}, {2, 3, 5}};   // {from, to, weight}
List<List<int[]>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
for (int[] e : edges) adj.get(e[0]).add(new int[]{e[1], e[2]});
int[] dist = new int[n];
Arrays.fill(dist, Integer.MAX_VALUE);
dist[0] = 0;
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
pq.offer(new int[]{0, 0});
while (!pq.isEmpty()) {
    int[] cur = pq.poll();
    int u = cur[0];
    if (cur[1] > dist[u]) continue;                   // stale entry
    for (int[] e : adj.get(u)) {
        int v = e[0], nd = dist[u] + e[1];
        if (nd < dist[v]) { dist[v] = nd; pq.offer(new int[]{v, nd}); }
    }
}
System.out.println(Arrays.toString(dist));`, out: `[0, 3, 1, 4]`, note: '0 → 1 directly costs 4, but 0 → 2 → 1 costs 3. The heap always expands the closest vertex first. Needs non-negative weights.' },
    { name: 'Adjacency matrix', code: J`int n = 4;
boolean[][] m = new boolean[n][n];
int[][] edges = {{0, 1}, {1, 2}, {2, 3}};
for (int[] e : edges) m[e[0]][e[1]] = m[e[1]][e[0]] = true;
System.out.println(m[1][2] + " " + m[0][3]);           // O(1) edge check
int deg = 0;
for (int j = 0; j < n; j++) if (m[1][j]) deg++;       // O(n) to find neighbours
System.out.println("degree of 1: " + deg);`, out: `true false
degree of 1: 2` }
  ],
  build: {
    intro: 'A small undirected graph with named (`int`) vertices stored in a `Map`, so vertices do not need to be numbered 0..n-1. BFS order and a recursive "is there a path?".',
    code: J`class Graph {
    private final Map<Integer, List<Integer>> adj = new HashMap<>();

    void addEdge(int u, int v) {
        adj.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
        adj.computeIfAbsent(v, k -> new ArrayList<>()).add(u);   // undirected
    }

    List<Integer> neighbors(int u) { return adj.getOrDefault(u, List.of()); }

    List<Integer> bfs(int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> seen = new HashSet<>(List.of(start));
        Deque<Integer> q = new ArrayDeque<>(List.of(start));
        while (!q.isEmpty()) {
            int u = q.poll();
            order.add(u);
            for (int v : neighbors(u))
                if (seen.add(v)) q.offer(v);        // mark when queued
        }
        return order;
    }

    boolean hasPath(int u, int target, Set<Integer> seen) {
        if (u == target) return true;
        seen.add(u);
        for (int v : neighbors(u))
            if (!seen.contains(v) && hasPath(v, target, seen)) return true;
        return false;
    }
}`,
    notes: [
      ['computeIfAbsent', 'Creates a vertex\'s list the first time it is mentioned.'],
      ['seen.add(v) in an if', '`add` returns false if `v` was already seen, so one call both checks and marks.'],
      ['Mark when queued', 'Marking on `poll` instead lets the same vertex be queued many times.'],
      ['Visited set is required', 'Graphs can have cycles; without it DFS recurses forever.']
    ],
    demo: J`Graph g = new Graph();
g.addEdge(1, 2);
g.addEdge(1, 3);
g.addEdge(2, 4);
g.addEdge(3, 4);
g.addEdge(5, 6);
System.out.println(g.bfs(1));
System.out.println(g.hasPath(1, 4, new HashSet<>()) + " " + g.hasPath(1, 6, new HashSet<>()));`,
    out: `[1, 2, 3, 4]
true false`
  },
  gotchas: [
    ['One shared inner list', '`new ArrayList<>(Collections.nCopies(n, new ArrayList<>()))` puts the **same** list in every slot: every vertex gets every edge.', 'Loop: `for (i…) adj.add(new ArrayList<>());`.'],
    ['Only one direction for undirected edges', 'Adding `u → v` but not `v → u` makes BFS miss paths.', 'Add both, unless the problem says directed.'],
    ['No visited set', 'Any cycle makes BFS/DFS loop forever.', '`boolean[] seen` or a `HashSet`.'],
    ['Dijkstra with negative weights', 'A finished vertex can later get a cheaper path; the answer is wrong.', 'Bellman–Ford for negative edges.'],
    ['Matrix for big sparse graphs', '`new boolean[100000][100000]` needs about 10 GB.', 'Adjacency list.'],
    ['Deep DFS recursion', '100,000 vertices in a line overflow the call stack.', 'Iterative DFS with a stack, or BFS.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-islands', title: 'Number of islands', ask: 'Each unvisited land cell starts a new island; sink everything connected to it.', code: J`int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { [[count++|++count|count += 1]]; sink(grid, r, c); }
    return count;
}
void sink(char[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != [['1']]) return;
    g[r][c] = [['0']];                       // mark visited
    sink(g, r + 1, c);
    sink(g, r - 1, c);
    sink(g, r, c + 1);
    sink(g, r, [[c - 1]]);
}`, test: 'char[][] g = {"11000".toCharArray(), "11000".toCharArray(), "00100".toCharArray(), "00011".toCharArray()}; System.out.println(new Sol().numIslands(g));', out: '3' },
      { id: 'fb-course', title: 'Course schedule (Kahn)', ask: 'Count prerequisites per course; repeatedly take courses with none left.', code: J`boolean canFinish(int n, int[][] prereq) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] p : prereq) { adj.get(p[1]).add([[p[0]]]); indeg[p[0]]++; }
    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == [[0]]) q.offer(i);
    int done = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        done++;
        for (int v : adj.get(u)) if ([[--indeg[v]]] == 0) q.offer(v);
    }
    return done == [[n]];
}`, test: 'System.out.println(new Sol().canFinish(2, new int[][]{{1, 0}}) + " " + new Sol().canFinish(2, new int[][]{{1, 0}, {0, 1}}));', out: 'true false' }
    ],
    order: [
      { id: 'od-path', title: 'Does a path exist? (BFS)',
        ideaSteps: ['Build an adjacency list, adding each edge both ways.', 'Queue the source and mark it seen.', 'Poll a vertex; if it is the destination, done.', 'Queue every unseen neighbour, marking it as you queue it.', 'If the queue empties, there is no path.'],
        lines: [
          'boolean validPath(int n, int[][] edges, int src, int dst) {',
          '    List<List<Integer>> adj = new ArrayList<>();',
          '    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());',
          '    for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }',
          '    boolean[] seen = new boolean[n];',
          '    Deque<Integer> q = new ArrayDeque<>();',
          '    q.offer(src);',
          '    seen[src] = true;',
          '    while (!q.isEmpty()) {',
          '        int u = q.poll();',
          '        if (u == dst) return true;',
          '        for (int v : adj.get(u)) {',
          '            if (!seen[v]) { seen[v] = true; q.offer(v); }',
          '        }',
          '    }',
          '    return false;',
          '}'
        ],
        extra: ['    for (int[] e : edges) adj.get(e[0]).add(e[1]);'],
        check: { wrap: 'sol', test: 'System.out.println(new Sol().validPath(3, new int[][]{{0, 1}, {1, 2}, {2, 0}}, 0, 2) + " " + new Sol().validPath(6, new int[][]{{0, 1}, {0, 2}, {3, 5}, {5, 4}, {4, 3}}, 0, 5));', out: 'true false' } }
    ]
  },
  patterns: ['graphs', 'heap', 'backtracking'],
  patternWhy: {
    graphs: 'BFS, DFS, topological sort, Dijkstra and union-find templates.',
    heap: 'Dijkstra and Prim pull the cheapest edge from a heap.',
    backtracking: 'Grid word search is DFS with undo.'
  },
  problems: [['1971', 'Find if Path Exists in Graph'], ['200', 'Number of Islands'], ['133', 'Clone Graph'], ['207', 'Course Schedule'], ['547', 'Number of Provinces'], ['743', 'Network Delay Time']]
});
})();
