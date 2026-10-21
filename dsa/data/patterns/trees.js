(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'trees', order: 10, title: 'Binary trees (DFS and BFS)',
  oneLiner: 'Trust the recursion: solve the problem for one node assuming the calls on `left` and `right` already work. Use a queue when the question is about levels.',
  legend: [['a', 'current node'], ['l', 'in the queue / on the path'], ['hit', 'done']],
  clues: ['TreeNode root', 'depth / height', 'path sum', 'level order / each level', 'right side view', 'binary search tree (BST)', 'lowest common ancestor', 'diameter', 'balanced', 'invert / mirror'],
  idea: [
    'Every tree function has the same skeleton: **base case** for `null`, **recurse** on `left` and `right`, **combine** the two answers with the current node.',
    'Do not trace the whole recursion in your head. Assume `maxDepth(root.left)` returns the right number, and only ask: "given my children\'s answers, what is mine?"',
    'Level questions (each level, closest, minimum depth) → BFS with a `Queue`. Process one level at a time by reading `queue.size()` first.'
  ],
  pick: [
    ['Answer for the whole tree built from subtrees (depth, size, balanced)', 'DFS returning a value (bottom-up)', '`int left = f(root.left), right = f(root.right);`'],
    ['Something passed down from parent (path sum, max so far, range)', 'DFS with parameters (top-down)', '`f(node.left, sumSoFar + node.val)`'],
    ['Per level / shortest depth / right side', 'BFS level order', '`Queue<TreeNode> q = new LinkedList<>();`'],
    ['Sorted order, k-th smallest, validate BST', 'In-order DFS on a BST', 'left, node, right'],
    ['Best path through a node (diameter, max path)', 'DFS returns one branch, updates a global with both', '`best = max(best, left + right)`']
  ],
  fourQuestions: [
    ['What is the base case?', 'Almost always `if (root == null) return 0;` (or `true`, `null`, `-1`).'],
    ['What do I need from my children?', 'Call them: `int l = f(root.left); int r = f(root.right);`'],
    ['How do I combine them with this node?', 'One line: `return 1 + Math.max(l, r);` or `return l + r + root.val;`'],
    ['Do I also need something global?', 'If the answer is not what you return (diameter, max path sum), keep a field `int best` and update it.']
  ],

  demo: {
    title: 'Level order traversal with a queue',
    sub: 'Tree `[3, 9, 20, null, null, 15, 7]`. Read `q.size()` to know how many nodes belong to the current level.',
    code: [
      'Queue<TreeNode> q = new LinkedList<>();',
      'q.offer(root);',
      'while (!q.isEmpty()) {',
      '    int size = q.size();             // nodes on this level',
      '    List<Integer> level = new ArrayList<>();',
      '    for (int i = 0; i < size; i++) {',
      '        TreeNode node = q.poll();',
      '        level.add(node.val);',
      '        if (node.left != null) q.offer(node.left);',
      '        if (node.right != null) q.offer(node.right);',
      '    }',
      '    res.add(level);',
      '}'
    ],
    steps: function(){
      var t = [3, 9, 20, null, null, 15, 7], out = [], q = [0], done = {}, res = [];
      function P(cur){
        var c = {}; Object.keys(done).forEach(function(k){ c[k] = 'on-hit'; }); q.forEach(function(k){ c[k] = 'on-l'; }); if (cur !== undefined) c[cur] = 'on-a';
        return [{ type: 'tree', name: 'tree', vals: t, cls: c }, arr(q.map(function(k){ return t[k]; }), [], {name: 'queue (front at left)', ix: false}),
                { type: 'text', name: 'res', text: JSON.stringify(res) }];
      }
      out.push({ panels: P(), line: 1, vars: {}, msg: 'Start with the root in the queue.' });
      while (q.length){
        var size = q.length, level = [];
        out.push({ panels: P(), line: 3, vars: {size: size}, msg: '`size = ' + size + '`: the queue holds exactly this level. Process ' + size + ' node(s).' });
        for (var i = 0; i < size; i++){
          var k = q.shift(); level.push(t[k]); done[k] = 1;
          var kids = [2 * k + 1, 2 * k + 2].filter(function(c){ return c < t.length && t[c] !== null; });
          kids.forEach(function(c){ q.push(c); });
          out.push({ panels: P(k), line: [6, 7, 8, 9], vars: {size: size, i: i, node: t[k]}, msg: 'Poll ' + t[k] + ', add it to this level. ' + (kids.length ? 'Offer its children ' + kids.map(function(c){ return t[c]; }).join(' and ') + ' (next level).' : 'No children.') });
        }
        res.push(level);
        out.push({ panels: P(), line: 11, ok: !q.length, vars: {}, msg: 'Level finished: `' + JSON.stringify(level) + '`.' + (q.length ? '' : ' Queue empty, done: **' + JSON.stringify(res) + '**.') });
      }
      return out;
    }
  },

  variants: [
    {
      id: 'dfs', name: 'DFS returning a value (bottom-up)', short: 'DFS bottom-up',
      intro: 'Ask both children for their answer, then build yours. The recursion does the walking.',
      start: 'if (root == null) return 0;  int l = f(root.left), r = f(root.right);  return combine(l, r, root);',
      panels: [{ type: 'tree', vals: [3, 9, 20, null, null, 15, 7], cls: {0: 'on-a'}, marks: {1: '1', 2: '2', 0: '1+max(1,2)=3'} }],
      rules: [
        ['Use it when', 'Max depth, size, same tree, symmetric, invert, balanced, diameter.'],
        ['Template', ['Base case for `null`', 'Recurse left and right', 'Combine and return']],
        ['Cost', 'O(n) time, O(h) stack space (h = height).']
      ],
      probs: '104 Maximum Depth, 100 Same Tree, 226 Invert Binary Tree, 101 Symmetric Tree, 110 Balanced Binary Tree, 543 Diameter',
      tabs: [
        { name: 'Max depth', code: J`int maxDepth(TreeNode root) {
    if (root == null) return 0;
    int left = maxDepth(root.left);
    int right = maxDepth(root.right);
    return 1 + Math.max(left, right);
}` },
        { name: 'Same tree', code: J`boolean isSameTree(TreeNode p, TreeNode q) {
    if (p == null && q == null) return true;
    if (p == null || q == null) return false;     // only one is null
    return p.val == q.val
        && isSameTree(p.left, q.left)
        && isSameTree(p.right, q.right);
}` },
        { name: 'Invert', code: J`TreeNode invertTree(TreeNode root) {
    if (root == null) return null;
    TreeNode left = invertTree(root.left);
    TreeNode right = invertTree(root.right);
    root.left = right;
    root.right = left;
    return root;
}` },
        { name: 'Diameter (global)', code: J`int best = 0;

int diameterOfBinaryTree(TreeNode root) {
    height(root);
    return best;
}

int height(TreeNode node) {                 // returns height, updates best
    if (node == null) return 0;
    int l = height(node.left);
    int r = height(node.right);
    best = Math.max(best, l + r);           // path that bends at node
    return 1 + Math.max(l, r);              // only one branch goes up
}`, note: 'Return what the parent needs (one branch). Store what the question asks (both branches) in a field.' }
      ]
    },
    {
      id: 'topdown', name: 'DFS passing values down (top-down)', short: 'DFS top-down',
      intro: 'Carry information from the root down as parameters: the sum so far, the path so far, the allowed range. Check at the leaves or at each node.',
      start: 'void dfs(TreeNode node, int sumSoFar)',
      panels: [{ type: 'tree', vals: [5, 4, 8, 11, null, 13, 4], cls: {0: 'on-l', 1: 'on-l', 3: 'on-hit'}, marks: {3: 'sum 20'} }],
      rules: [
        ['Use it when', 'Path sum, root-to-leaf paths, good nodes (max so far), validate BST with a range, sum root to leaf numbers.'],
        ['Leaf check', '`node.left == null && node.right == null`'],
        ['Path lists', 'Add before recursing, remove after (backtracking): `path.remove(path.size() - 1);`']
      ],
      probs: '112 Path Sum, 257 Binary Tree Paths, 1448 Count Good Nodes, 129 Sum Root to Leaf Numbers, 113 Path Sum II',
      tabs: [
        { name: 'Path sum', code: J`boolean hasPathSum(TreeNode root, int target) {
    if (root == null) return false;
    if (root.left == null && root.right == null) {   // leaf
        return target == root.val;
    }
    int rest = target - root.val;                    // pass the remainder down
    return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
}` },
        { name: 'Good nodes', code: J`int goodNodes(TreeNode root) {
    return count(root, Integer.MIN_VALUE);
}

int count(TreeNode node, int maxSoFar) {
    if (node == null) return 0;
    int good = node.val >= maxSoFar ? 1 : 0;
    int m = Math.max(maxSoFar, node.val);
    return good + count(node.left, m) + count(node.right, m);
}` },
        { name: 'All paths (list)', code: J`List<List<Integer>> pathSum(TreeNode root, int target) {
    List<List<Integer>> res = new ArrayList<>();
    dfs(root, target, new ArrayList<>(), res);
    return res;
}

void dfs(TreeNode node, int rest, List<Integer> path, List<List<Integer>> res) {
    if (node == null) return;
    path.add(node.val);                                   // choose
    if (node.left == null && node.right == null && rest == node.val) {
        res.add(new ArrayList<>(path));                   // copy!
    }
    dfs(node.left, rest - node.val, path, res);
    dfs(node.right, rest - node.val, path, res);
    path.remove(path.size() - 1);                         // un-choose
}` }
      ]
    },
    {
      id: 'bfs', name: 'BFS level order', short: 'BFS levels',
      intro: 'A queue visits nodes level by level. Snapshot `q.size()` at the start of each level so you know where the level ends.',
      start: 'Queue<TreeNode> q = new LinkedList<>();  q.offer(root);  while (!q.isEmpty()) { int size = q.size(); ... }',
      panels: [{ type: 'tree', vals: [1, 2, 3, null, 5, null, 4], cls: {0: 'on-hit', 2: 'on-hit', 6: 'on-hit'} }],
      rules: [
        ['Use it when', 'Level order, right side view, zigzag, average of levels, minimum depth, connect next pointers.'],
        ['Level loop', '`int size = q.size(); for (int i = 0; i < size; i++)`. Do not use `q.size()` in the for condition: it changes as you offer children.'],
        ['Right side view', 'The last node of each level (`i == size - 1`).']
      ],
      probs: '102 Binary Tree Level Order Traversal, 199 Right Side View, 111 Minimum Depth, 103 Zigzag Level Order, 637 Average of Levels',
      tabs: [
        { name: 'Level order', code: J`List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Queue<TreeNode> q = new LinkedList<>();
    q.offer(root);
    while (!q.isEmpty()) {
        int size = q.size();                 // freeze the level size
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode node = q.poll();
            level.add(node.val);
            if (node.left != null) q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
        res.add(level);
    }
    return res;
}` },
        { name: 'Right side view', code: J`List<Integer> rightSideView(TreeNode root) {
    List<Integer> res = new ArrayList<>();
    if (root == null) return res;
    Queue<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    while (!q.isEmpty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode node = q.poll();
            if (i == size - 1) res.add(node.val);   // last on this level
            if (node.left != null) q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
    }
    return res;
}` },
        { name: 'Min depth', code: J`int minDepth(TreeNode root) {
    if (root == null) return 0;
    Queue<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    int depth = 1;
    while (!q.isEmpty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode node = q.poll();
            if (node.left == null && node.right == null) return depth;  // first leaf
            if (node.left != null) q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
        depth++;
    }
    return depth;
}` }
      ]
    },
    {
      id: 'bst', name: 'BST and lowest common ancestor', short: 'BST / LCA',
      intro: 'In a BST, left < node < right for every node. In-order traversal visits values in sorted order. Use the ordering to go only left or only right.',
      start: 'if (val < root.val) go left; else go right;',
      panels: [{ type: 'tree', vals: [6, 2, 8, 0, 4, 7, 9], cls: {0: 'on-a', 1: 'on-l', 2: 'on-r'} }],
      rules: [
        ['Validate', 'Pass an allowed range `(lo, hi)` down, using `long` (or null bounds) so `Integer.MIN_VALUE` nodes still work.'],
        ['K-th smallest', 'In-order traversal, count visits.'],
        ['LCA in a BST', 'Both smaller: go left. Both bigger: go right. Otherwise this node splits them.'],
        ['LCA in any tree', 'Return the node if it is p or q; if both sides return non-null, this node is the LCA.']
      ],
      probs: '98 Validate BST, 230 Kth Smallest in a BST, 235 LCA of a BST, 236 LCA of a Binary Tree, 700 Search in a BST, 108 Sorted Array to BST',
      tabs: [
        { name: 'Validate BST', code: J`boolean isValidBST(TreeNode root) {
    return valid(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

boolean valid(TreeNode node, long lo, long hi) {
    if (node == null) return true;
    if (node.val <= lo || node.val >= hi) return false;
    return valid(node.left, lo, node.val) && valid(node.right, node.val, hi);
}` },
        { name: 'K-th smallest', code: J`int kthSmallest(TreeNode root, int k) {
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode cur = root;
    while (cur != null || !st.isEmpty()) {
        while (cur != null) {            // go as far left as possible
            st.push(cur);
            cur = cur.left;
        }
        cur = st.pop();                  // visit in sorted order
        if (--k == 0) return cur.val;
        cur = cur.right;
    }
    return -1;
}`, note: 'Iterative in-order with a stack: useful when you want to stop early.' },
        { name: 'LCA (any tree)', code: J`TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);
    if (left != null && right != null) return root;   // p and q on both sides
    return left != null ? left : right;
}` },
        { name: 'Traversal orders', code: J`void inorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    inorder(node.left, out);     // pre-order: add BEFORE this line
    out.add(node.val);           // in-order: add here (sorted for BST)
    inorder(node.right, out);    // post-order: add AFTER this line
}` }
      ]
    }
  ],

  javaUsed: [
    ['class TreeNode { int val; TreeNode left, right; }', 'Given by LeetCode.', '`new TreeNode(5)` makes a leaf.'],
    ['Queue<TreeNode> q = new LinkedList<>()', 'FIFO queue for BFS.', '`new ArrayDeque<>()` also works and is faster, but rejects null.'],
    ['q.offer(x) / q.poll() / q.peek()', 'Add at back / remove front / look at front.', 'Return null instead of throwing on empty.'],
    ['int size = q.size();', 'Number of nodes on the current level.', 'Save it before the inner loop.'],
    ['List<List<Integer>> res = new ArrayList<>()', 'List of levels or paths.', 'Inner lists: `new ArrayList<>()` per level.'],
    ['new ArrayList<>(path)', 'Copy a list.', 'Adding `path` itself stores a reference that you later change.'],
    ['path.remove(path.size() - 1)', 'Remove the last item (by index).', 'For `List<Integer>`, `remove(int)` is by index.'],
    ['Long.MIN_VALUE / Long.MAX_VALUE', 'Bounds wider than any int.', 'Validate BST with nodes equal to `Integer.MIN_VALUE`.'],
    ['Integer.MIN_VALUE', 'Start value for "max so far".', 'Good nodes, max path sum.'],
    ['private int best;', 'A field shared by all recursive calls.', 'Reset it in the public method if the object is reused.']
  ],
  concepts: [
    { name: 'The recursion leap of faith', text: 'Write the function as if it already works for smaller trees. You only design: the base case, and how to combine children. Tracing every call in your head is what makes recursion feel impossible.' },
    { name: 'What to return vs what to record', text: 'A recursive function can only return one thing to its parent. If the parent needs a different value than the final answer (diameter: parent needs height, question needs the longest path), return one and store the other in a field.' },
    { name: 'Pre / in / post order', text: 'Same three lines, different position of "do something with node". Pre-order: copy / serialize a tree. In-order: BST sorted order. Post-order: answers that need both children first (height, delete).' },
    { name: 'Height vs depth', text: 'Depth counts edges (or nodes) from the root down to a node. Height counts from a node down to its deepest leaf. `maxDepth(root)` equals the height of the root.' }
  ],
  loops: [
    ['`if (root == null) return ...;`', 'Base case: an empty subtree.', 'Every DFS'],
    ['`while (!q.isEmpty())`', 'Process until no nodes are left.', 'BFS'],
    ['`for (int i = 0; i < size; i++)`', 'Exactly the nodes of this level.', 'BFS by level'],
    ['`while (cur != null || !st.isEmpty())`', 'Iterative in-order.', 'K-th smallest, BST iterator']
  ],
  movesTitle: 'Key lines',
  moves: [
    ['`return 1 + Math.max(l, r);`', 'Height from children', 'Depth, balanced'],
    ['`best = Math.max(best, l + r);`', 'Path that bends at this node', 'Diameter, max path sum'],
    ['`if (node.left != null) q.offer(node.left);`', 'Queue the next level', 'BFS'],
    ['`return left != null ? left : right;`', 'Bubble up the found node', 'LCA'],
    ['`res.add(new ArrayList<>(path));`', 'Save a copy of the current path', 'Path sum II']
  ],
  bugs: [
    ['Missing null base case', '`root.left` on a null root.', 'start every DFS with `if (root == null)`.'],
    ['Using q.size() in the for condition', 'The size changes as you offer children.', 'save `int size = q.size();` first.'],
    ['Leaf check wrong', '`root == null` is not a leaf.', 'leaf = both children null.'],
    ['Adding the path without copying', 'All saved paths end up empty.', '`new ArrayList<>(path)`.'],
    ['Validate BST only checks parent', 'A node deep in the left subtree can be larger than the root.', 'pass a `(lo, hi)` range down.'],
    ['int overflow in BST bounds', 'A node equal to `Integer.MAX_VALUE` fails.', 'use `long` bounds.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-depth', title: 'Maximum depth', ask: 'Base case, ask children, combine.', code: J`int maxDepth(TreeNode root) {
    if (root [[== null]]) return [[0]];
    int left = maxDepth([[root.left]]);
    int right = maxDepth([[root.right]]);
    return [[1 + Math.max(left, right)|Math.max(left, right) + 1]];
}` },
      { id: 'fb-level', title: 'Level order traversal', ask: 'Queue, freeze the level size, offer children.', code: J`List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Queue<TreeNode> q = new [[LinkedList<>()|ArrayDeque<>()]];
    q.offer(root);
    while (!q.isEmpty()) {
        int size = [[q.size()]];
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < [[size]]; i++) {
            TreeNode node = q.[[poll()]];
            level.add(node.val);
            if (node.left != null) q.offer([[node.left]]);
            if (node.right != null) q.offer(node.right);
        }
        res.add(level);
    }
    return res;
}` },
      { id: 'fb-lca', title: 'Lowest common ancestor', ask: 'Return the node if found; split means this node is the answer.', code: J`TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return [[root]];
    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);
    if (left != null [[&&]] right != null) return root;
    return [[left != null ? left : right]];
}` }
    ],
    order: [
      { id: 'od-balanced', title: 'Balanced binary tree',
        ideaSteps: ['Write a helper that returns the height, or -1 if the subtree is not balanced.', 'Empty tree: height 0.', 'Get left height; if -1, pass -1 up.', 'Same for right.', 'If heights differ by more than 1, return -1.', 'Otherwise return 1 + the bigger height.'],
        lines: [
          'int check(TreeNode node) {',
          '    if (node == null) return 0;',
          '    int l = check(node.left);',
          '    if (l == -1) return -1;',
          '    int r = check(node.right);',
          '    if (r == -1) return -1;',
          '    if (Math.abs(l - r) > 1) return -1;',
          '    return 1 + Math.max(l, r);',
          '}'
        ],
        extra: ['    return Math.max(l, r);'],
        wrap: '@@' },
      { id: 'od-validate', title: 'Validate BST with a range',
        ideaSteps: ['Each node must be strictly inside an allowed range (lo, hi).', 'An empty subtree is valid.', 'Check the node against the range.', 'Left child: same lo, hi becomes this value. Right child: lo becomes this value, same hi.'],
        lines: [
          'boolean valid(TreeNode node, long lo, long hi) {',
          '    if (node == null) return true;',
          '    if (node.val <= lo || node.val >= hi) return false;',
          '    return valid(node.left, lo, node.val) && valid(node.right, node.val, hi);',
          '}'
        ],
        extra: ['    return valid(node.left, node.val, hi) && valid(node.right, lo, node.val);'],
        wrap: '@@' }
    ]
  },
  practice: {
    easy: [['104', 'Maximum Depth of Binary Tree'], ['226', 'Invert Binary Tree'], ['100', 'Same Tree'], ['101', 'Symmetric Tree'], ['112', 'Path Sum'], ['543', 'Diameter of Binary Tree'], ['110', 'Balanced Binary Tree'], ['235', 'Lowest Common Ancestor of a BST']],
    next: [['102', 'Binary Tree Level Order Traversal'], ['199', 'Binary Tree Right Side View'], ['98', 'Validate Binary Search Tree'], ['230', 'Kth Smallest Element in a BST'], ['236', 'Lowest Common Ancestor of a Binary Tree'], ['1448', 'Count Good Nodes in Binary Tree'], ['105', 'Construct Tree from Preorder and Inorder'], ['124', 'Binary Tree Maximum Path Sum']]
  }
});
})();
