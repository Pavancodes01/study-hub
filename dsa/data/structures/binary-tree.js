(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
// A tree given as nodes {id, v, l, r}. Turn it into an ntree panel.
function treeP(T, root, opt){
  opt = opt || {};
  var nodes = [];
  (function add(id, parent, side){
    if (id === null || id === undefined) return;
    var n = T[id];
    nodes.push({ id: id, label: n.v, parent: parent, side: side, cls: (opt.cls && opt.cls[id]) || '', mark: opt.marks && opt.marks[id] });
    add(n.l, id, 'L'); add(n.r, id, 'R');
  })(root, null, null);
  return { type: 'ntree', name: opt.name || 'tree', nodes: nodes, bin: true };
}
// Demo tree:  1(2(4,5), 3(-,6))
var T = { a: { v: 1, l: 'b', r: 'c' }, b: { v: 2, l: 'd', r: 'e' }, c: { v: 3, l: null, r: 'f' }, d: { v: 4 }, e: { v: 5 }, f: { v: 6 } };
// Playground tree: complete binary tree in level order (index i -> children 2i+1, 2i+2).
function compl(vals, cls, marks){
  return { type: 'ntree', name: 'binary tree (filled level by level)', bin: true, nodes: vals.map(function(v, i){
    return { id: i, label: v, parent: i ? (i - 1) >> 1 : null, side: i % 2 ? 'L' : 'R', cls: (cls && cls[i]) || '', mark: marks && marks[i] };
  }) };
}
function order(n, kind){
  var out = [];
  function L(i){ return 2 * i + 1 < n ? 2 * i + 1 : -1; }
  function R(i){ return 2 * i + 2 < n ? 2 * i + 2 : -1; }
  function go(i){ if (i < 0) return; if (kind === 'pre') out.push(i); go(L(i)); if (kind === 'in') out.push(i); go(R(i)); if (kind === 'post') out.push(i); }
  if (kind === 'level'){ for (var i = 0; i < n; i++) out.push(i); } else if (n) go(0);
  return out;
}
function travOp(id, label, kind, java, why){
  return { id: id, label: label, cost: 'O(n)', run: function(s){
    if (!s.v.length) return { java: java, ret: '[]', msg: 'Empty tree: nothing to visit.' };
    var o = order(s.v.length, kind), marks = {}, cls = {};
    o.forEach(function(i, k){ marks[i] = k + 1; cls[i] = 'on-a'; });
    cls[o[0]] = 'on-hit';
    return { java: java, ret: '[' + o.map(function(i){ return s.v[i]; }).join(', ') + ']', hl: { cls: cls, marks: marks }, msg: why + ' The small numbers show the visit order.' };
  } };
}

registerStructure({
  slug: 'binary-tree', order: 11, group: 'tree', title: 'Binary Tree',
  oneLiner: 'Each node holds a value and up to two children, `left` and `right`. Almost every tree problem is solved by **recursion**: solve for the left subtree, solve for the right, combine. Visiting all n nodes is O(n).',
  legend: [['hit', 'visited first'], ['a', 'visited'], ['l', 'current']],
  compare: { access: 'O(n)', search: 'O(n)', insert: 'O(1) at a node', remove: 'O(n)', ordered: 'by shape only', space: 'O(n)', java: 'TreeNode (your own)', note: 'recursion' },
  idea: [
    'A tree is linked nodes again, but each node points **down** to at most two children. The top node is the **root**; nodes with no children are **leaves**.',
    'The magic: the left child is itself the root of a smaller tree, and so is the right. So "the height of a tree" is `1 + max(height of left, height of right)`. Most tree code is three lines of recursion with a `null` base case.',
    'There are four standard ways to visit every node. **Pre-order** (node, left, right), **in-order** (left, node, right), **post-order** (left, right, node) go deep first (DFS, a stack). **Level order** goes row by row (BFS, a queue).',
    'A plain binary tree has no ordering rule, so finding a value means checking every node: O(n). Add an ordering rule and you get a BST (next page).'
  ],
  anatomy: {
    title: 'Words you will see in every tree problem',
    panels: [treeP(T, 'a', { name: 'root 1 · height 3 · leaves 4, 5, 6', cls: { a: 'on-l', d: 'on-hit', e: 'on-hit', f: 'on-hit' }, marks: { a: 'root', d: 'leaf', f: 'leaf' } })],
    notes: [
      '**Depth** of a node: edges from the root down to it (root = 0). **Height** of the tree: number of levels (here 3).',
      'A node with no left child has `left == null`. Every recursion stops at `null`.',
      'Recursion uses the call stack, one frame per level: O(h) extra space. For a skewed tree (a "linked list" shape), h = n.'
    ]
  },
  demo: {
    title: 'In-order traversal with an explicit stack',
    sub: 'Recursion keeps a stack of "nodes to come back to". Here that stack is visible. Order: go left as far as possible, visit, then go right.',
    code: [
      'Deque<TreeNode> st = new ArrayDeque<>();',
      'TreeNode cur = root;',
      'while (cur != null || !st.isEmpty()) {',
      '    while (cur != null) { st.push(cur); cur = cur.left; }',
      '    cur = st.pop();',
      '    out.add(cur.val);         // visit',
      '    cur = cur.right;',
      '}'
    ],
    steps: function(){
      var st = [], outv = [], visited = {}, out = [], cur = 'a';
      function P(curId){
        var cls = {}; Object.keys(visited).forEach(function(k){ cls[k] = 'on-a'; }); if (curId) cls[curId] = 'on-l';
        return [treeP(T, 'a', { cls: cls }), { type: 'stack', name: 'stack', vals: st.map(function(id){ return T[id].v; }) }, arr(outv.slice(), [], { name: 'out', ix: false })];
      }
      out.push({ panels: P('a'), line: 1, vars: { cur: 1 }, msg: 'Start at the root.' });
      while (cur || st.length){
        while (cur){ st.push(cur); var nx = T[cur].l; out.push({ panels: P(nx), line: 3, vars: { cur: nx ? T[nx].v : 'null' }, msg: 'Push ' + T[cur].v + ' and step left' + (nx ? ' to ' + T[nx].v : ': nothing there') + '.' }); cur = nx; }
        cur = st.pop(); visited[cur] = 1; outv.push(T[cur].v);
        out.push({ panels: P(cur), line: [4, 5], vars: { cur: T[cur].v }, msg: 'Pop **' + T[cur].v + '** and visit it. Everything to its left is already done.' });
        cur = T[cur].r || null;
      }
      out.push({ panels: P(null), line: null, ok: true, vars: {}, msg: 'In-order: **' + outv.join(' ') + '**. Each node is pushed once and popped once: O(n).' });
      return out;
    }
  },
  play: {
    title: 'Binary tree playground',
    hint: '`add` fills the tree level by level, left to right (the way LeetCode reads `[1,2,3,…]`). Then press a traversal and read the numbers on the nodes.',
    setup: 'TreeNode root = …;   // built level by level',
    start: 'Empty tree. Add 6 or 7 values, then try each traversal.',
    init: function(){ return { v: [] }; },
    ops: [
      { id: 'add', label: 'add(v)', args: 1, cost: 'O(1)', run: function(s, x){
        if (s.v.length >= 15) return { err: 'This playground stops at 15 nodes (4 levels) so it fits on screen.' };
        s.v.push(x); var i = s.v.length - 1, c = {}; c[i] = 'on-hit';
        return { java: i ? 'parent.' + (i % 2 ? 'left' : 'right') + ' = new TreeNode(' + x + ');' : 'root = new TreeNode(' + x + ');', hl: { cls: c }, msg: i ? 'Attached as the **' + (i % 2 ? 'left' : 'right') + '** child of ' + s.v[(i - 1) >> 1] + '.' : x + ' is the root.' };
      } },
      { id: 'pop', label: 'remove last', cost: 'O(1)', run: function(s){
        if (!s.v.length) return { err: 'Tree is already empty.' };
        var i = s.v.length - 1, x = s.v.pop();
        return { java: i ? 'parent.' + (i % 2 ? 'left' : 'right') + ' = null;' : 'root = null;', msg: 'Removed leaf ' + x + '.' };
      } },
      travOp('pre', 'preorder', 'pre', 'preorder(root);', 'Node first, then its whole left subtree, then the right.'),
      travOp('in', 'inorder', 'in', 'inorder(root);', 'Whole left subtree, then the node, then the right.'),
      travOp('post', 'postorder', 'post', 'postorder(root);', 'Both subtrees first, the node last. Used when a node needs its children\'s answers.'),
      travOp('lvl', 'levelOrder', 'level', 'levelOrder(root);', 'Row by row with a queue.'),
      { id: 'h', label: 'height()', cost: 'O(n)', run: function(s){
        var h = 0, n = s.v.length; while ((1 << h) - 1 < n) h++;
        return { java: 'height(root);', ret: h, msg: '`1 + max(height(left), height(right))`, bottoming out at `null` = 0. Height **' + h + '**.' };
      } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 6; i++) o.push(['add', rnd(1, 99)]); return o; },
    view: function(s, hl){ return [compl(s.v, hl.cls, hl.marks)]; }
  },
  ops: [
    ['Visit every node', 'pre / in / post / level order', 'O(n)', 'Each node is handled once.'],
    ['Find a value', 'search both subtrees', 'O(n)', 'No ordering rule tells you which side to skip.'],
    ['Height, size, sum…', 'recursive formula', 'O(n)', 'Combine the answers of both children.'],
    ['Add a child to a node you hold', 'node.left = new TreeNode(x)', 'O(1)', 'One reference.'],
    ['Recursion stack', 'depth of the call chain', 'O(h)', 'h = log n for a balanced tree, n for a skewed one.']
  ],
  when: ['hierarchy / nested data', 'recursion on left and right', 'path sums', 'lowest common ancestor', 'tree DP (post-order)', 'serialize a structure', 'expression trees'],
  whenNot: [
    ['Fast search by value', 'BST / TreeMap', 'bst-treemap'],
    ['Repeatedly get the min', 'Heap', 'heap'],
    ['Prefix search on words', 'Trie', 'trie'],
    ['Arbitrary connections, cycles', 'Graph', 'graph']
  ],
  apiIntro: 'Java has no general binary tree class; problems give you `TreeNode`. These snippets use `class TreeNode { int val; TreeNode left, right; }` with the usual constructors. The box under each is the real output.',
  api: [
    { name: 'DFS traversals', wrap: 'class', code: J`static void pre(TreeNode n, List<Integer> out) {
    if (n == null) return;
    out.add(n.val);              // node, then children
    pre(n.left, out);
    pre(n.right, out);
}
static void in(TreeNode n, List<Integer> out) {
    if (n == null) return;
    in(n.left, out);
    out.add(n.val);              // left, node, right
    in(n.right, out);
}
static void post(TreeNode n, List<Integer> out) {
    if (n == null) return;
    post(n.left, out);
    post(n.right, out);
    out.add(n.val);              // children first
}

public static void main(String[] args) {
    //      1
    //     / \
    //    2   3
    //   / \   \
    //  4   5   6
    TreeNode root = new TreeNode(1,
        new TreeNode(2, new TreeNode(4), new TreeNode(5)),
        new TreeNode(3, null, new TreeNode(6)));
    List<Integer> a = new ArrayList<>(), b = new ArrayList<>(), c = new ArrayList<>();
    pre(root, a);
    in(root, b);
    post(root, c);
    System.out.println("pre  " + a);
    System.out.println("in   " + b);
    System.out.println("post " + c);
}`, out: `pre  [1, 2, 4, 5, 3, 6]
in   [4, 2, 5, 1, 3, 6]
post [4, 5, 2, 6, 3, 1]`, note: 'The three differ only in **where** `out.add` sits relative to the two recursive calls.' },
    { name: 'Height, size, leaves', wrap: 'class', code: J`static int height(TreeNode n) {
    if (n == null) return 0;
    return 1 + Math.max(height(n.left), height(n.right));
}
static int count(TreeNode n) {
    return n == null ? 0 : 1 + count(n.left) + count(n.right);
}
static int leaves(TreeNode n) {
    if (n == null) return 0;
    if (n.left == null && n.right == null) return 1;
    return leaves(n.left) + leaves(n.right);
}

public static void main(String[] args) {
    TreeNode root = new TreeNode(1,
        new TreeNode(2, new TreeNode(4), new TreeNode(5)),
        new TreeNode(3, null, new TreeNode(6)));
    System.out.println(height(root) + " " + count(root) + " " + leaves(root));
}`, out: `3 6 3`, note: 'Pattern: handle `null`, ask both children, combine. That is post-order thinking.' },
    { name: 'Level order', code: J`TreeNode root = new TreeNode(1,
    new TreeNode(2, new TreeNode(4), new TreeNode(5)),
    new TreeNode(3, null, new TreeNode(6)));
Queue<TreeNode> q = new ArrayDeque<>();
q.offer(root);
int level = 0;
while (!q.isEmpty()) {
    int n = q.size();                       // nodes on this level
    StringBuilder sb = new StringBuilder("level " + level++ + ":");
    for (int i = 0; i < n; i++) {
        TreeNode node = q.poll();
        sb.append(' ').append(node.val);
        if (node.left != null) q.offer(node.left);
        if (node.right != null) q.offer(node.right);
    }
    System.out.println(sb);
}`, out: `level 0: 1
level 1: 2 3
level 2: 4 5 6` },
    { name: 'Iterative in-order', code: J`TreeNode root = new TreeNode(1,
    new TreeNode(2, new TreeNode(4), new TreeNode(5)),
    new TreeNode(3, null, new TreeNode(6)));
List<Integer> out = new ArrayList<>();
Deque<TreeNode> st = new ArrayDeque<>();
TreeNode cur = root;
while (cur != null || !st.isEmpty()) {
    while (cur != null) { st.push(cur); cur = cur.left; }
    cur = st.pop();
    out.add(cur.val);
    cur = cur.right;
}
System.out.println(out);`, out: `[4, 2, 5, 1, 3, 6]`, note: 'Use this when the tree may be too deep for recursion (a skewed tree with 100,000 nodes overflows the call stack).' },
    { name: 'Build from [1,2,3,null,5]', code: J`Integer[] data = {1, 2, 3, null, 5};      // LeetCode's level-order format
TreeNode root = new TreeNode(data[0]);
Queue<TreeNode> q = new ArrayDeque<>(List.of(root));
int i = 1;
while (i < data.length) {
    TreeNode cur = q.poll();
    if (data[i] != null) q.offer(cur.left = new TreeNode(data[i]));
    i++;
    if (i < data.length && data[i] != null) q.offer(cur.right = new TreeNode(data[i]));
    i++;
}
System.out.println(root.left.right.val + " " + (root.left.left == null));`, out: `5 true` }
  ],
  build: {
    intro: '`TreeNode` itself is three fields. The instructive thing to build is a **codec**: write a tree as a string (pre-order, `#` for null) and rebuild the exact same shape from it.',
    code: J`class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

class Codec {
    String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        write(root, sb);
        return sb.toString();
    }
    private void write(TreeNode n, StringBuilder sb) {
        if (n == null) { sb.append("#,"); return; }
        sb.append(n.val).append(',');           // pre-order: node first
        write(n.left, sb);
        write(n.right, sb);
    }

    TreeNode deserialize(String data) {
        Deque<String> tokens = new ArrayDeque<>(Arrays.asList(data.split(",")));
        return read(tokens);
    }
    private TreeNode read(Deque<String> tokens) {
        String t = tokens.poll();
        if (t.equals("#")) return null;
        TreeNode n = new TreeNode(Integer.parseInt(t));
        n.left = read(tokens);                  // same order as write
        n.right = read(tokens);
        return n;
    }
}`,
    notes: [
      ['Why the #', 'Without null markers, `1,2,3` could be many different shapes. With them, pre-order describes exactly one tree.'],
      ['Mirror image code', '`read` consumes tokens in the same order `write` produced them.'],
      ['A queue of tokens', '`poll()` hands out the next token; recursion decides where it goes.']
    ],
    demo: J`TreeNode root = new TreeNode(1, new TreeNode(2), new TreeNode(3, new TreeNode(4), null));
Codec c = new Codec();
String s = c.serialize(root);
System.out.println(s);
System.out.println(c.serialize(c.deserialize(s)).equals(s));`,
    out: `1,2,#,#,3,4,#,#,#,
true`
  },
  gotchas: [
    ['No null base case', '`n.left` on a null node throws `NullPointerException`.', 'First line of every recursive method: `if (n == null) return …;`.'],
    ['Ignoring the recursive result', '`invert(root.left);` without using the returned node, or `dfs(...)` whose answer is dropped.', 'Store it: `root.left = invert(...)`, `int l = height(root.left);`.'],
    ['Height in nodes vs edges', 'Some problems count edges (diameter), others count nodes (max depth).', 'Read the definition; the formulas differ by 1.'],
    ['Deep trees overflow the stack', 'Recursion 100,000 levels deep throws `StackOverflowError`.', 'Iterate with an explicit stack or queue.'],
    ['Sharing one list in recursion', 'Adding to `path` then forgetting to remove it leaks values into other branches.', 'Undo after the call (backtracking), or pass a copy.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-depth', title: 'Maximum depth', ask: 'Empty tree has depth 0. Otherwise 1 + the deeper side.', code: J`int maxDepth(TreeNode root) {
    if (root == [[null]]) return [[0]];
    return 1 + Math.[[max]](maxDepth(root.[[left]]), maxDepth(root.right));
}`, test: 'System.out.println(new Sol().maxDepth(new TreeNode(3, new TreeNode(9), new TreeNode(20, new TreeNode(15), new TreeNode(7)))));', out: '3' },
      { id: 'fb-invert', title: 'Invert a binary tree', ask: 'Invert both subtrees, then swap them.', code: J`TreeNode invertTree(TreeNode root) {
    if (root == null) return [[null]];
    TreeNode left = invertTree(root.[[left]]);
    TreeNode right = invertTree(root.right);
    root.left = [[right]];
    root.right = [[left]];
    return [[root]];
}`, test: 'TreeNode r = new Sol().invertTree(new TreeNode(4, new TreeNode(2, new TreeNode(1), new TreeNode(3)), new TreeNode(7, new TreeNode(6), new TreeNode(9)))); Deque<TreeNode> q = new ArrayDeque<>(List.of(r)); StringBuilder sb = new StringBuilder(); while (!q.isEmpty()) { TreeNode n = q.poll(); sb.append(n.val).append(" "); if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); } System.out.println(sb.toString().trim());', out: '4 7 2 9 6 3 1' }
    ],
    order: [
      { id: 'od-same', title: 'Same tree',
        ideaSteps: ['Both empty: same.', 'Exactly one empty: different.', 'Values differ: different.', 'Otherwise both left subtrees and both right subtrees must match.'],
        lines: [
          'boolean isSameTree(TreeNode p, TreeNode q) {',
          '    if (p == null && q == null) return true;',
          '    if (p == null || q == null) return false;',
          '    if (p.val != q.val) return false;',
          '    return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);',
          '}'
        ],
        extra: ['    return isSameTree(p.left, q.right) && isSameTree(p.right, q.left);'],
        check: { wrap: 'sol', test: 'System.out.println(new Sol().isSameTree(new TreeNode(1, new TreeNode(2), new TreeNode(3)), new TreeNode(1, new TreeNode(2), new TreeNode(3))) + " " + new Sol().isSameTree(new TreeNode(1, new TreeNode(2), null), new TreeNode(1, null, new TreeNode(2))));', out: 'true false' } }
    ]
  },
  patterns: ['trees', 'backtracking', 'dp'],
  patternWhy: {
    trees: 'DFS and BFS templates for every tree problem.',
    backtracking: 'The recursion tree of a backtracking search is a tree you walk with DFS.',
    dp: 'Tree DP computes each node\'s answer from its children (post-order).'
  },
  problems: [['104', 'Maximum Depth of Binary Tree'], ['226', 'Invert Binary Tree'], ['100', 'Same Tree'], ['102', 'Binary Tree Level Order Traversal'], ['543', 'Diameter of Binary Tree'], ['297', 'Serialize and Deserialize Binary Tree']]
});
})();
