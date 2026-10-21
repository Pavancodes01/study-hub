(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'graphs', order: 11, title: 'Graphs (BFS, DFS, topological sort)',
  oneLiner: 'Build an adjacency list, keep a `visited` set, and explore with DFS (recursion / stack) or BFS (queue). Grids are graphs where neighbours are up, down, left, right.',
  legend: [['a', 'current'], ['l', 'in queue / on stack'], ['hit', 'visited']],
  clues: ['nodes and edges', 'n cities / courses / computers', 'grid of 0s and 1s, islands', 'connected components', 'shortest path (unweighted → BFS)', 'prerequisites / order / dependencies', 'cycle', 'spreading (rotting, fire) minute by minute'],
  idea: [
    'Three building blocks: **graph** (who is next to whom), **visited** (never process a node twice), **frontier** (stack/recursion for DFS, queue for BFS).',
    'DFS dives deep: good for "is it connected", "count components", "flood fill". BFS spreads in rings: the first time BFS reaches a node is via a **shortest** path (when edges have no weights).',
    'Topological sort = BFS that starts from nodes with no prerequisites (in-degree 0) and removes them one by one. If some nodes never reach in-degree 0, there is a cycle.'
  ],
  pick: [
    ['Count islands / components, flood fill', 'DFS on grid or graph', '`dfs(r, c)` that marks visited'],
    ['Shortest steps, unweighted', 'BFS with distance by level', '`Queue<int[]> q`'],
    ['Start from many sources at once (rotting oranges)', 'Multi-source BFS', 'offer all sources first'],
    ['Order with prerequisites, detect cycle in directed graph', "Topological sort (Kahn's)", '`int[] indegree`'],
    ['Weighted shortest path', 'Dijkstra', '`PriorityQueue<int[]>` by distance'],
    ['Connect / are they in the same group (dynamic)', 'Union-Find', '`int[] parent`']
  ],
  fourQuestions: [
    ['How do I store the graph?', 'Edge list to `List<List<Integer>> g`; add both directions if undirected. Grid: no build, use a `dirs` array.'],
    ['How do I mark visited?', '`boolean[] seen = new boolean[n];` or flip grid cells (`grid[r][c] = \'0\'`). Mark when you **push**, not when you pop.'],
    ['DFS or BFS?', 'Shortest / levels / spreading → BFS. Everything else → DFS is shorter to write.'],
    ['What do I count or return?', 'Components (count DFS starts), distance (BFS levels), order (topo list), true/false (cycle).']
  ],

  demo: {
    title: 'Number of islands with DFS',
    sub: "Scan every cell. Each unvisited '1' starts a new island; DFS sinks the whole island so it is not counted again.",
    code: [
      'for (int r = 0; r < m; r++)',
      '    for (int c = 0; c < n; c++)',
      "        if (grid[r][c] == '1') { count++; dfs(grid, r, c); }",
      '',
      'void dfs(char[][] grid, int r, int c) {',
      "    if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] != '1') return;",
      "    grid[r][c] = '0';                 // mark visited",
      '    dfs(grid, r + 1, c); dfs(grid, r - 1, c);',
      '    dfs(grid, r, c + 1); dfs(grid, r, c - 1);',
      '}'
    ],
    steps: function(){
      var g = [['1', '1', '0', '0'], ['1', '0', '0', '1'], ['0', '0', '1', '1'], ['0', '0', '0', '1']], m = 4, n = 4, out = [], count = 0, owner = {};
      function P(cur){
        var c = {};
        Object.keys(owner).forEach(function(k){ c[k] = 'on-hit'; });
        if (cur) c[cur] = 'on-a';
        var rows = g.map(function(row, r){ return row.map(function(v, cc){ return owner[r + ',' + cc] ? owner[r + ',' + cc] : v; }); });
        return [{ type: 'grid', name: 'grid (visited cells show island #)', rows: rows, cls: c, rowHeads: [0, 1, 2, 3], colHeads: [0, 1, 2, 3] }];
      }
      function dfs(r, c){
        if (r < 0 || c < 0 || r >= m || c >= n || g[r][c] !== '1') return;
        g[r][c] = '0'; owner[r + ',' + c] = '#' + count;
        out.push({ panels: P(r + ',' + c), line: 6, vars: {r: r, c: c, count: count}, msg: 'Visit (' + r + ',' + c + '), mark it so it is never counted again. Then try all 4 neighbours.' });
        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
      }
      for (var r = 0; r < m; r++) for (var c = 0; c < n; c++){
        if (g[r][c] === '1'){
          count++;
          out.push({ panels: P(r + ',' + c), line: 2, vars: {r: r, c: c, count: count}, msg: "Scan finds an unvisited '1' at (" + r + ',' + c + '). New island: `count = ' + count + '`. Start DFS.' });
          dfs(r, c);
        }
      }
      out.push({ panels: P(null), line: 2, ok: true, vars: {count: count}, msg: 'Scan finished. **' + count + ' islands**. Every cell was visited at most once: O(m·n).' });
      return out;
    }
  },

  variants: [
    {
      id: 'grid', name: 'Grid DFS / BFS', short: 'Grid', intro: 'Every cell is a node; its neighbours are the 4 cells around it. Check bounds first, then whether the cell is usable, then mark it.',
      start: 'int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};',
      panels: [{ type: 'grid', rows: [[1, 1, 0], [0, 1, 0], [0, 0, 1]], cls: {'1,1': 'on-a', '0,1': 'on-l', '2,1': 'on-l', '1,0': 'on-l', '1,2': 'on-l'} }],
      rules: [
        ['Use it when', 'Number of islands, max area, flood fill, surrounded regions, rotting oranges, shortest path in a binary matrix.'],
        ['Bounds', '`r < 0 || c < 0 || r >= m || c >= n` before reading `grid[r][c]`.'],
        ['Mark visited', 'Change the cell (`grid[r][c] = 0`) or use `boolean[][] seen`.'],
        ['Multi-source BFS', 'Offer every source first (all rotten oranges), then expand level by level = minutes.']
      ],
      probs: '200 Number of Islands, 695 Max Area of Island, 733 Flood Fill, 994 Rotting Oranges, 1091 Shortest Path in Binary Matrix, 130 Surrounded Regions',
      tabs: [
        { name: 'Islands (DFS)', code: J`int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[0].length; c++) {
            if (grid[r][c] == '1') {
                count++;
                sink(grid, r, c);
            }
        }
    }
    return count;
}

void sink(char[][] grid, int r, int c) {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return;
    if (grid[r][c] != '1') return;
    grid[r][c] = '0';                       // visited
    sink(grid, r + 1, c);
    sink(grid, r - 1, c);
    sink(grid, r, c + 1);
    sink(grid, r, c - 1);
}` },
        { name: 'Rotting oranges (BFS)', code: J`int orangesRotting(int[][] grid) {
    int m = grid.length, n = grid[0].length, fresh = 0;
    Queue<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < m; r++)
        for (int c = 0; c < n; c++) {
            if (grid[r][c] == 2) q.offer(new int[]{r, c});   // all sources
            else if (grid[r][c] == 1) fresh++;
        }
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    int minutes = 0;
    while (!q.isEmpty() && fresh > 0) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            int[] cur = q.poll();
            for (int[] d : dirs) {
                int r = cur[0] + d[0], c = cur[1] + d[1];
                if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] != 1) continue;
                grid[r][c] = 2;                 // mark when you push
                fresh--;
                q.offer(new int[]{r, c});
            }
        }
        minutes++;                              // one level = one minute
    }
    return fresh == 0 ? minutes : -1;
}` },
        { name: 'Max area (DFS returns size)', code: J`int maxAreaOfIsland(int[][] grid) {
    int best = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            best = Math.max(best, area(grid, r, c));
    return best;
}

int area(int[][] grid, int r, int c) {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] == 0) return 0;
    grid[r][c] = 0;
    return 1 + area(grid, r + 1, c) + area(grid, r - 1, c)
             + area(grid, r, c + 1) + area(grid, r, c - 1);
}` }
      ]
    },
    {
      id: 'adj', name: 'Adjacency list BFS / DFS', short: 'Adjacency list',
      intro: 'Turn the edge list into `List<List<Integer>>` where `g.get(u)` lists the neighbours of `u`. Then DFS or BFS with a `boolean[] seen`.',
      start: 'List<List<Integer>> g = new ArrayList<>();  for (int i = 0; i < n; i++) g.add(new ArrayList<>());',
      panels: [{ type: 'graph', w: 300, h: 160, nodes: [{id: 0, x: 40, y: 40}, {id: 1, x: 140, y: 40}, {id: 2, x: 140, y: 120}, {id: 3, x: 240, y: 40}, {id: 4, x: 240, y: 120}], edges: [[0, 1], [1, 2], [3, 4]], cls: {0: 'on-hit', 1: 'on-hit', 2: 'on-hit'} },
               { type: 'text', name: 'g', text: '0:[1]  1:[0,2]  2:[1]  3:[4]  4:[3]' }],
      rules: [
        ['Use it when', 'Number of provinces / components, path exists, clone graph, all paths, bipartite check.'],
        ['Undirected', 'Add each edge twice: `g.get(a).add(b); g.get(b).add(a);`'],
        ['Shortest steps', 'BFS with `int[] dist` (or level counting). First time reached = shortest.'],
        ['Cost', 'O(V + E).']
      ],
      probs: '547 Number of Provinces, 1971 Find if Path Exists, 133 Clone Graph, 785 Is Graph Bipartite, 841 Keys and Rooms, 323 Connected Components',
      tabs: [
        { name: 'Count components (DFS)', code: J`int countComponents(int n, int[][] edges) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) {
        g.get(e[0]).add(e[1]);
        g.get(e[1]).add(e[0]);              // undirected
    }
    boolean[] seen = new boolean[n];
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (!seen[i]) {
            count++;
            dfs(g, i, seen);
        }
    }
    return count;
}

void dfs(List<List<Integer>> g, int u, boolean[] seen) {
    seen[u] = true;
    for (int v : g.get(u)) {
        if (!seen[v]) dfs(g, v, seen);
    }
}` },
        { name: 'Shortest path (BFS)', code: J`int shortestPath(int n, int[][] edges, int src, int dst) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }
    int[] dist = new int[n];
    Arrays.fill(dist, -1);                  // -1 = not visited
    Queue<Integer> q = new ArrayDeque<>();
    q.offer(src);
    dist[src] = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        if (u == dst) return dist[u];
        for (int v : g.get(u)) {
            if (dist[v] == -1) {
                dist[v] = dist[u] + 1;      // mark when you push
                q.offer(v);
            }
        }
    }
    return -1;
}` },
        { name: 'Clone graph', code: J`Map<Node, Node> copies = new HashMap<>();

Node cloneGraph(Node node) {
    if (node == null) return null;
    if (copies.containsKey(node)) return copies.get(node);   // visited
    Node copy = new Node(node.val);
    copies.put(node, copy);                 // store BEFORE recursing (cycles)
    for (Node nb : node.neighbors) {
        copy.neighbors.add(cloneGraph(nb));
    }
    return copy;
}` }
      ]
    },
    {
      id: 'topo', name: "Topological sort (Kahn's BFS)", short: 'Topological sort',
      intro: 'Count incoming edges (in-degree). Start with all nodes at 0. Each time you take one, decrease its neighbours; any that hit 0 are ready next.',
      start: 'int[] indeg = new int[n];  Queue<Integer> q = all nodes with indeg 0;',
      panels: [{ type: 'graph', w: 300, h: 160, directed: true, nodes: [{id: 0, x: 40, y: 80}, {id: 1, x: 140, y: 30}, {id: 2, x: 140, y: 130}, {id: 3, x: 250, y: 80}], edges: [[0, 1], [0, 2], [1, 3], [2, 3]], cls: {0: 'on-a'} },
               arr([0, 1, 1, 2], [], {name: 'indegree'})],
      rules: [
        ['Use it when', 'Course schedule, build order, alien dictionary, any "A must come before B".'],
        ['Edge direction', 'Prerequisite `[a, b]` means b → a (take b first). Get this right before coding.'],
        ['Cycle', 'If the result has fewer than n nodes, a cycle blocked some of them.'],
        ['Cost', 'O(V + E).']
      ],
      probs: '207 Course Schedule, 210 Course Schedule II, 269 Alien Dictionary, 1136 Parallel Courses, 802 Find Eventual Safe States',
      tabs: [
        { name: 'Course schedule II', code: J`int[] findOrder(int n, int[][] prerequisites) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] p : prerequisites) {         // p = [course, prereq]
        g.get(p[1]).add(p[0]);              // prereq -> course
        indeg[p[0]]++;
    }
    Queue<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
    int[] order = new int[n];
    int k = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        order[k++] = u;
        for (int v : g.get(u)) {
            if (--indeg[v] == 0) q.offer(v);    // all prereqs done
        }
    }
    return k == n ? order : new int[0];     // k < n means a cycle
}` },
        { name: 'Cycle check (DFS colors)', code: J`boolean canFinish(int n, int[][] prerequisites) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] p : prerequisites) g.get(p[1]).add(p[0]);
    int[] state = new int[n];               // 0 new, 1 on path, 2 done
    for (int i = 0; i < n; i++) {
        if (hasCycle(g, i, state)) return false;
    }
    return true;
}

boolean hasCycle(List<List<Integer>> g, int u, int[] state) {
    if (state[u] == 1) return true;         // back to the current path
    if (state[u] == 2) return false;
    state[u] = 1;
    for (int v : g.get(u)) {
        if (hasCycle(g, v, state)) return true;
    }
    state[u] = 2;
    return false;
}` }
      ]
    },
    {
      id: 'weighted', name: 'Dijkstra and Union-Find', short: 'Dijkstra / Union-Find',
      intro: 'Two tools for the next level. Dijkstra: BFS where the queue is a min-heap by distance (weights ≥ 0). Union-Find: merge groups and ask "same group?" in nearly O(1).',
      start: 'PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);   int[] parent;',
      panels: [{ type: 'graph', w: 300, h: 160, nodes: [{id: 'A', x: 40, y: 80}, {id: 'B', x: 150, y: 30}, {id: 'C', x: 150, y: 130}, {id: 'D', x: 260, y: 80}], edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['B', 'C']], hot: ['A-C', 'C-D'], cls: {A: 'on-hit', C: 'on-hit', D: 'on-a'} }],
      rules: [
        ['Dijkstra', ['Push `{node, dist}`; poll the smallest', 'Skip if this entry is stale (`d > dist[u]`)', 'Relax neighbours: `if (d + w < dist[v])` update and push']],
        ['Union-Find', ['`find(x)` follows parents to the root (with path compression)', '`union(a, b)` links one root under the other', 'Same group: `find(a) == find(b)`']],
        ['Cost', 'Dijkstra O(E log V). Union-Find ~O(1) per operation.']
      ],
      probs: '743 Network Delay Time, 1631 Path With Minimum Effort, 787 Cheapest Flights, 684 Redundant Connection, 1584 Min Cost to Connect All Points',
      tabs: [
        { name: 'Dijkstra', code: J`int networkDelayTime(int[][] times, int n, int k) {
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
    for (int[] t : times) g.get(t[0]).add(new int[]{t[1], t[2]});   // {to, weight}
    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);  // {node, dist}
    pq.offer(new int[]{k, 0});
    while (!pq.isEmpty()) {
        int[] cur = pq.poll();
        int u = cur[0], d = cur[1];
        if (d > dist[u]) continue;           // stale entry
        for (int[] e : g.get(u)) {
            int v = e[0], nd = d + e[1];
            if (nd < dist[v]) {
                dist[v] = nd;
                pq.offer(new int[]{v, nd});
            }
        }
    }
    int best = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == Integer.MAX_VALUE) return -1;
        best = Math.max(best, dist[i]);
    }
    return best;
}` },
        { name: 'Union-Find', code: J`int[] parent;

int find(int x) {
    if (parent[x] != x) parent[x] = find(parent[x]);   // path compression
    return parent[x];
}

boolean union(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return false;              // already connected
    parent[ra] = rb;
    return true;
}

int[] findRedundantConnection(int[][] edges) {
    parent = new int[edges.length + 1];
    for (int i = 0; i < parent.length; i++) parent[i] = i;
    for (int[] e : edges) {
        if (!union(e[0], e[1])) return e;    // this edge closes a cycle
    }
    return new int[0];
}` }
      ]
    }
  ],

  javaUsed: [
    ['List<List<Integer>> g = new ArrayList<>()', 'Adjacency list.', 'Add an empty list for each node first: `g.add(new ArrayList<>())`.'],
    ['g.get(u).add(v)', 'Edge u → v.', 'Undirected: also `g.get(v).add(u)`.'],
    ['boolean[] seen = new boolean[n]', 'Visited flags, all false.', '`boolean[][]` for grids.'],
    ['int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}}', 'The 4 grid moves.', '`for (int[] d : dirs) { int r = cur[0] + d[0], c = cur[1] + d[1]; }`'],
    ['Queue<int[]> q = new ArrayDeque<>()', 'BFS queue of coordinates.', '`q.offer(new int[]{r, c})`.'],
    ['Arrays.fill(dist, -1)', 'Mark all nodes as unreached.', 'Or `Integer.MAX_VALUE` for Dijkstra.'],
    ['grid.length / grid[0].length', 'Rows / columns.', 'Save as `m` and `n`.'],
    ['--indeg[v] == 0', 'Decrement, then compare.', 'Pre-decrement: the new value is compared.'],
    ['Map<Node, Node>', 'Old node → copy.', 'Clone graph, also serves as visited.']
  ],
  concepts: [
    { name: 'Mark visited when you push, not when you pop', text: 'In BFS, if you only mark when polling, the same node can be added to the queue many times by different neighbours. Marking on push keeps each node in the queue at most once.' },
    { name: 'Why BFS gives shortest paths', text: 'BFS processes all nodes 1 step away, then all 2 steps away, and so on. So the first time it reaches a node, no shorter path exists. This only holds when every edge costs the same; with weights, use Dijkstra.' },
    { name: 'Recursion depth on big grids', text: 'A 1000 × 1000 grid can recurse a million levels deep and overflow the stack. If that is a risk, use BFS or an explicit stack (`Deque<int[]>`) instead of recursion.' },
    { name: 'Directed cycle needs 3 states', text: 'In a directed graph, reaching a "done" node is fine, but reaching a node still **on the current path** means a cycle. That is why the DFS uses 0 / 1 / 2 instead of a boolean.' }
  ],
  loops: [
    ['`for (int v : g.get(u))`', 'Every neighbour of u.', 'Adjacency list'],
    ['`for (int[] d : dirs)`', 'Every neighbour of a grid cell.', 'Grid'],
    ['`while (!q.isEmpty()) { int size = q.size(); for (...) }`', 'BFS by levels (minutes, steps).', 'Rotting oranges, word ladder'],
    ['`for (int i = 0; i < n; i++) if (!seen[i]) { count++; dfs(i); }`', 'Start a DFS from every unvisited node.', 'Components']
  ],
  movesTitle: 'Key lines',
  moves: [
    ['`if (r < 0 || c < 0 || r >= m || c >= n) return;`', 'Out of the grid', 'Grid DFS'],
    ["`grid[r][c] = '0';`", 'Mark visited in place', 'Islands'],
    ['`dist[v] = dist[u] + 1; q.offer(v);`', 'Reach a neighbour one step further', 'BFS shortest path'],
    ['`if (--indeg[v] == 0) q.offer(v);`', 'All prerequisites done', 'Topological sort'],
    ['`if (d > dist[u]) continue;`', 'Skip an outdated heap entry', 'Dijkstra']
  ],
  bugs: [
    ['Forgot to mark visited', 'Infinite recursion or a huge queue.', 'mark before (or right as) you explore.'],
    ['Checking the cell before bounds', '`grid[r][c]` with r = -1 throws.', 'bounds check first, then value.'],
    ['Directed edge reversed', 'Prerequisites `[a, b]` mean b before a.', 'draw one example edge first.'],
    ['Only adding one direction for undirected', 'Some neighbours are unreachable.', 'add both `a→b` and `b→a`.'],
    ['Using DFS for shortest path', 'DFS finds a path, not the shortest.', 'BFS (unweighted) or Dijkstra (weighted).'],
    ['Stack overflow', 'Deep recursion on large grids.', 'iterative BFS / explicit stack.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-islands', title: 'Number of islands', ask: "Count DFS starts; DFS sinks the island.", code: J`int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { [[count++|count += 1|++count]]; sink(grid, r, c); }
    return count;
}

void sink(char[][] grid, int r, int c) {
    if (r < 0 || c < 0 || r >= [[grid.length]] || c >= [[grid[0].length]]) return;
    if (grid[r][c] != '1') return;
    grid[r][c] = [['0']];
    sink(grid, r + 1, c); sink(grid, [[r - 1]], c);
    sink(grid, r, c + 1); sink(grid, r, [[c - 1]]);
}` },
      { id: 'fb-topo', title: 'Course schedule (can finish?)', ask: "Kahn's algorithm: count how many courses get taken.", code: J`boolean canFinish(int n, int[][] pre) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new [[ArrayList<>()]]);
    int[] indeg = new int[n];
    for (int[] p : pre) { g.get(p[1]).add(p[0]); indeg[ [[p[0]]] ]++; }
    Queue<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == [[0]]) q.offer(i);
    int taken = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        taken++;
        for (int v : g.get(u)) if ([[--indeg[v]]] == 0) q.offer(v);
    }
    return taken [[==]] n;
}` },
      { id: 'fb-bfs', title: 'Shortest path length (unweighted)', ask: 'BFS with a distance array; mark when you push.', code: J`int bfs(List<List<Integer>> g, int src, int dst) {
    int[] dist = new int[g.size()];
    Arrays.fill(dist, [[-1]]);
    Queue<Integer> q = new ArrayDeque<>();
    q.offer(src);
    dist[src] = [[0]];
    while (!q.isEmpty()) {
        int u = q.poll();
        if (u == dst) return dist[u];
        for (int v : g.get(u)) {
            if (dist[v] == -1) { dist[v] = [[dist[u] + 1]]; q.[[offer]](v); }
        }
    }
    return -1;
}` }
    ],
    order: [
      { id: 'od-components', title: 'Count connected components',
        ideaSteps: ['Make an empty neighbour list for each node.', 'Add every edge in both directions.', 'For each node not yet seen: count a new component and DFS from it.', 'The DFS marks the node and visits unseen neighbours.'],
        lines: [
          'List<List<Integer>> g = new ArrayList<>();',
          'for (int i = 0; i < n; i++) g.add(new ArrayList<>());',
          'for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }',
          'boolean[] seen = new boolean[n];',
          'int count = 0;',
          'for (int i = 0; i < n; i++) {',
          '    if (!seen[i]) { count++; dfs(g, i, seen); }',
          '}',
          'return count;'
        ],
        extra: ['for (int[] e : edges) g.get(e[0]).add(e[1]);'],
        wrap: 'int countComponents(int n, int[][] edges) {\n@@\n}\nvoid dfs(List<List<Integer>> g, int u, boolean[] seen) { seen[u] = true; for (int v : g.get(u)) if (!seen[v]) dfs(g, v, seen); }' },
      { id: 'od-rot', title: 'Rotting oranges (multi-source BFS)',
        ideaSteps: ['Queue every rotten orange; count fresh ones.', 'While there are rotten ones to spread and fresh ones left, process one level (one minute).', 'Each rotten orange rots its fresh neighbours and queues them.', 'After each level, add a minute.', 'Fresh left over means impossible.'],
        lines: [
          'int m = grid.length, n = grid[0].length, fresh = 0, minutes = 0;',
          'Queue<int[]> q = new ArrayDeque<>();',
          'for (int r = 0; r < m; r++) for (int c = 0; c < n; c++) { if (grid[r][c] == 2) q.offer(new int[]{r, c}); else if (grid[r][c] == 1) fresh++; }',
          'int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};',
          'while (!q.isEmpty() && fresh > 0) {',
          '    for (int size = q.size(); size > 0; size--) {',
          '        int[] cur = q.poll();',
          '        for (int[] d : dirs) {',
          '            int r = cur[0] + d[0], c = cur[1] + d[1];',
          '            if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] != 1) continue;',
          '            grid[r][c] = 2; fresh--; q.offer(new int[]{r, c});',
          '        }',
          '    }',
          '    minutes++;',
          '}',
          'return fresh == 0 ? minutes : -1;'
        ],
        wrap: 'int orangesRotting(int[][] grid) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['733', 'Flood Fill'], ['200', 'Number of Islands'], ['695', 'Max Area of Island'], ['1971', 'Find if Path Exists in Graph'], ['547', 'Number of Provinces'], ['841', 'Keys and Rooms']],
    next: [['994', 'Rotting Oranges'], ['133', 'Clone Graph'], ['207', 'Course Schedule'], ['210', 'Course Schedule II'], ['417', 'Pacific Atlantic Water Flow'], ['1091', 'Shortest Path in Binary Matrix'], ['743', 'Network Delay Time'], ['684', 'Redundant Connection'], ['127', 'Word Ladder']]
  }
});
})();
