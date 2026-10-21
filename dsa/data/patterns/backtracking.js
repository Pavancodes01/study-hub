(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'backtracking', order: 12, title: 'Backtracking',
  oneLiner: 'Build the answer one choice at a time. **Choose**, **explore** (recurse), **un-choose**. It is a DFS over a tree of decisions, and the same 10-line template solves subsets, permutations, combinations and boards.',
  legend: [['a', 'current choice'], ['l', 'in the path'], ['hit', 'saved answer']],
  clues: ['all subsets / combinations / permutations', 'generate all', 'every possible', 'partition into', 'n-queens', 'sudoku', 'word search', 'letter combinations', 'return a list of lists'],
  idea: [
    'Picture a tree: each level is one decision ("take this number or not", "which letter goes next"). Each root-to-leaf path is one candidate answer.',
    'You walk the tree with one shared `path`. Going down: **add** a choice. Coming back up: **remove** it, so the path is clean for the next branch.',
    'When the path is a complete answer, save a **copy** of it. Prune branches that can no longer work to keep it fast.'
  ],
  pick: [
    ['All subsets', 'Start index, save at every node', '`backtrack(i + 1)` after adding `nums[i]`'],
    ['Combinations of size k / sum target', 'Start index, save at the goal', 'reuse allowed: `backtrack(i)`; not allowed: `i + 1`'],
    ['All orderings', 'Permutations with `used[]`', 'loop from 0 every time, skip used'],
    ['Input has duplicates, answers must be unique', 'Sort + skip equal siblings', '`if (i > start && nums[i] == nums[i - 1]) continue;`'],
    ['Grid search, boards (word search, n-queens, sudoku)', 'Mark cell, recurse, unmark', 'temporarily change the board']
  ],
  fourQuestions: [
    ['What is one choice?', 'One number, one letter, one cell, one column. That decides the for loop.'],
    ['When is the path complete?', 'The base case: `if (path.size() == k)`, `if (remain == 0)`, `if (i == n)`. Save `new ArrayList<>(path)`.'],
    ['What choices are allowed from here?', 'From `start` onward (combinations), all unused (permutations), in-bounds neighbours (grid). Skip invalid ones.'],
    ['How do I undo?', 'Exactly reverse the choose line: `path.remove(path.size() - 1);`, `used[i] = false;`, restore the board cell.']
  ],

  demo: {
    title: 'All subsets of [1, 2, 3]',
    sub: 'Each call saves the current path, then tries adding each remaining number. Watch `path` grow and shrink.',
    code: [
      'void backtrack(int start, List<Integer> path) {',
      '    res.add(new ArrayList<>(path));         // save a copy',
      '    for (int i = start; i < nums.length; i++) {',
      '        path.add(nums[i]);                  // choose',
      '        backtrack(i + 1, path);             // explore',
      '        path.remove(path.size() - 1);       // un-choose',
      '    }',
      '}'
    ],
    steps: function(){
      var nums = [1, 2, 3], out = [], res = [], path = [];
      function P(i, line, msg, ok){
        var m = []; if (i !== null && i !== undefined) m.push({i: i, label: 'i', c: 'a'});
        out.push({ panels: [arr(nums, m, {name: 'nums'}), arr(path.slice(), [], {name: 'path', ix: false, cls: path.reduce(function(o, _, k){ o[k] = 'on-l'; return o; }, {})}),
                            { type: 'text', name: 'res (' + res.length + ' saved)', text: res.map(function(r){ return '[' + r.join(',') + ']'; }).join(' ') || '(empty)', full: true }],
                   line: line, msg: msg, ok: ok, vars: {path: '[' + path.join(',') + ']'} });
      }
      (function bt(start){
        res.push(path.slice());
        P(null, 1, 'Save a copy of `path` = `[' + path.join(',') + ']`. Every node of the decision tree is a subset.', true);
        for (var i = start; i < nums.length; i++){
          path.push(nums[i]);
          P(i, [3, 4], 'Choose ' + nums[i] + ', then explore with start = ' + (i + 1) + '.');
          bt(i + 1);
          path.pop();
          P(i, 5, 'Back from that branch. Un-choose ' + nums[i] + ' so the path is `[' + path.join(',') + ']` again.');
        }
      })(0);
      out.push({ panels: out[out.length - 1].panels, line: 7, ok: true, msg: 'All 2³ = **8 subsets** found. Choose, explore, un-choose did all the work.' });
      return out;
    }
  },

  variants: [
    {
      id: 'subsets', name: 'Subsets and combinations (start index)', short: 'Subsets / combos',
      intro: 'Pass a `start` index so each number is only considered after the previous one. That prevents `[1,2]` and `[2,1]` from both appearing.',
      start: 'void backtrack(int start, List<Integer> path)  →  for (int i = start; i < n; i++)',
      panels: [arr([1, 2, 3], [{i: 1, label: 'start', c: 'a'}], {name: 'nums'}), arr([1], [], {name: 'path', ix: false, cls: {0: 'on-l'}})],
      rules: [
        ['Use it when', 'Subsets, combinations (choose k), combination sum, letter combinations of a phone number.'],
        ['Save', 'Subsets: at every call. Combinations: only when the goal is reached.'],
        ['Reuse allowed?', 'Combination sum (reuse): recurse with `i`. Each item once: recurse with `i + 1`.'],
        ['Prune', 'Sort first; if `nums[i] > remain`, `break` (everything after is bigger).'],
        ['Cost', 'O(2ⁿ · n) for subsets: 2ⁿ answers, each copied in O(n).']
      ],
      probs: '78 Subsets, 77 Combinations, 39 Combination Sum, 17 Letter Combinations of a Phone Number, 216 Combination Sum III',
      tabs: [
        { name: 'Subsets', code: J`List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), res);
    return res;
}

void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));              // every path is a subset
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);                       // choose
        backtrack(nums, i + 1, path, res);       // explore
        path.remove(path.size() - 1);            // un-choose
    }
}` },
        { name: 'Combination sum', code: J`List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> res = new ArrayList<>();
    Arrays.sort(candidates);
    backtrack(candidates, 0, target, new ArrayList<>(), res);
    return res;
}

void backtrack(int[] c, int start, int remain, List<Integer> path, List<List<Integer>> res) {
    if (remain == 0) {
        res.add(new ArrayList<>(path));
        return;
    }
    for (int i = start; i < c.length; i++) {
        if (c[i] > remain) break;                // sorted: the rest are too big
        path.add(c[i]);
        backtrack(c, i, remain - c[i], path, res);   // i, not i + 1: reuse allowed
        path.remove(path.size() - 1);
    }
}` },
        { name: 'Combinations (n choose k)', code: J`List<List<Integer>> combine(int n, int k) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(1, n, k, new ArrayList<>(), res);
    return res;
}

void backtrack(int start, int n, int k, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == k) {
        res.add(new ArrayList<>(path));
        return;
    }
    for (int i = start; i <= n; i++) {
        path.add(i);
        backtrack(i + 1, n, k, path, res);
        path.remove(path.size() - 1);
    }
}` },
        { name: 'Phone letters', code: J`List<String> letterCombinations(String digits) {
    List<String> res = new ArrayList<>();
    if (digits.isEmpty()) return res;
    String[] map = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
    build(digits, 0, new StringBuilder(), map, res);
    return res;
}

void build(String digits, int i, StringBuilder sb, String[] map, List<String> res) {
    if (i == digits.length()) {
        res.add(sb.toString());
        return;
    }
    for (char c : map[digits.charAt(i) - '0'].toCharArray()) {
        sb.append(c);
        build(digits, i + 1, sb, map, res);
        sb.deleteCharAt(sb.length() - 1);        // un-choose
    }
}` }
      ]
    },
    {
      id: 'perms', name: 'Permutations (used array)', short: 'Permutations',
      intro: 'Order matters, so every position can take any number not used yet. Loop from 0 each time and skip used ones with a `boolean[] used`.',
      start: 'boolean[] used = new boolean[n];  for (int i = 0; i < n; i++) if (!used[i]) ...',
      panels: [arr([1, 2, 3], [{i: 0, label: 'used', c: 'l'}, {i: 2, label: 'used', c: 'l'}], {name: 'nums'}), arr([3, 1], [], {name: 'path', ix: false})],
      rules: [
        ['Use it when', 'Permutations, arrangements, next steps where any unused item can come next.'],
        ['Base case', '`path.size() == nums.length`.'],
        ['Duplicates in input', 'Sort, then skip `nums[i] == nums[i - 1] && !used[i - 1]`.'],
        ['Cost', 'O(n! · n).']
      ],
      probs: '46 Permutations, 47 Permutations II, 784 Letter Case Permutation, 22 Generate Parentheses',
      tabs: [
        { name: 'Permutations', code: J`List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(nums, new boolean[nums.length], new ArrayList<>(), res);
    return res;
}

void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == nums.length) {
        res.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.add(nums[i]);
        backtrack(nums, used, path, res);
        path.remove(path.size() - 1);
        used[i] = false;                         // undo both
    }
}` },
        { name: 'Generate parentheses', code: J`List<String> generateParenthesis(int n) {
    List<String> res = new ArrayList<>();
    gen(n, 0, 0, new StringBuilder(), res);
    return res;
}

void gen(int n, int open, int close, StringBuilder sb, List<String> res) {
    if (sb.length() == 2 * n) {
        res.add(sb.toString());
        return;
    }
    if (open < n) {                              // can still open
        sb.append('(');
        gen(n, open + 1, close, sb, res);
        sb.deleteCharAt(sb.length() - 1);
    }
    if (close < open) {                          // can close only what is open
        sb.append(')');
        gen(n, open, close + 1, sb, res);
        sb.deleteCharAt(sb.length() - 1);
    }
}` }
      ]
    },
    {
      id: 'dups', name: 'Unique answers when input has duplicates', short: 'Skip duplicates',
      intro: 'Sort first so equal values sit together. At one level of the tree, use each distinct value only once: skip `nums[i]` if it equals `nums[i - 1]` and `i > start`.',
      start: 'Arrays.sort(nums);  if (i > start && nums[i] == nums[i - 1]) continue;',
      panels: [arr([1, 2, 2], [{i: 1, label: 'use', c: 'hit'}, {i: 2, label: 'skip', c: 'r'}], {name: 'sorted nums', cls: {2: 'gone'}})],
      rules: [
        ['Use it when', 'Subsets II, Combination Sum II, Permutations II.'],
        ['Why i > start', 'The first copy at this level is fine. Only the second, third… copies at the **same level** create duplicate branches.']
      ],
      probs: '90 Subsets II, 40 Combination Sum II, 47 Permutations II',
      tabs: [
        { name: 'Subsets II', code: J`List<List<Integer>> subsetsWithDup(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    Arrays.sort(nums);                               // duplicates side by side
    backtrack(nums, 0, new ArrayList<>(), res);
    return res;
}

void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));
    for (int i = start; i < nums.length; i++) {
        if (i > start && nums[i] == nums[i - 1]) continue;   // same value, same level
        path.add(nums[i]);
        backtrack(nums, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}` },
        { name: 'Combination sum II', code: J`List<List<Integer>> combinationSum2(int[] c, int target) {
    List<List<Integer>> res = new ArrayList<>();
    Arrays.sort(c);
    backtrack(c, 0, target, new ArrayList<>(), res);
    return res;
}

void backtrack(int[] c, int start, int remain, List<Integer> path, List<List<Integer>> res) {
    if (remain == 0) { res.add(new ArrayList<>(path)); return; }
    for (int i = start; i < c.length; i++) {
        if (i > start && c[i] == c[i - 1]) continue;
        if (c[i] > remain) break;
        path.add(c[i]);
        backtrack(c, i + 1, remain - c[i], path, res);   // each item once
        path.remove(path.size() - 1);
    }
}` }
      ]
    },
    {
      id: 'board', name: 'Grids and boards', short: 'Boards',
      intro: 'The "path" is the board itself. Mark a cell, recurse into neighbours, then restore the cell. Return `true` up the stack as soon as one branch succeeds.',
      start: "char saved = board[r][c];  board[r][c] = '#';  ...  board[r][c] = saved;",
      panels: [{ type: 'grid', rows: [['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], cls: {'0,0': 'on-l', '0,1': 'on-l', '0,2': 'on-l', '1,2': 'on-a'} }],
      rules: [
        ['Use it when', 'Word search, N-Queens, Sudoku solver, palindrome partitioning, restore IP addresses.'],
        ['Mark', 'Change the cell to a value that cannot match (`\'#\'`), or use `boolean[][] seen`.'],
        ['Early exit', 'Return a boolean; `if (dfs(...)) return true;`'],
        ['N-Queens', 'Track used columns and both diagonals: `r - c` and `r + c` identify diagonals.']
      ],
      probs: '79 Word Search, 51 N-Queens, 131 Palindrome Partitioning, 37 Sudoku Solver, 93 Restore IP Addresses',
      tabs: [
        { name: 'Word search', code: J`boolean exist(char[][] board, String word) {
    for (int r = 0; r < board.length; r++)
        for (int c = 0; c < board[0].length; c++)
            if (dfs(board, word, 0, r, c)) return true;
    return false;
}

boolean dfs(char[][] b, String word, int i, int r, int c) {
    if (i == word.length()) return true;                       // matched all
    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length) return false;
    if (b[r][c] != word.charAt(i)) return false;
    char saved = b[r][c];
    b[r][c] = '#';                                             // choose
    boolean found = dfs(b, word, i + 1, r + 1, c) || dfs(b, word, i + 1, r - 1, c)
                 || dfs(b, word, i + 1, r, c + 1) || dfs(b, word, i + 1, r, c - 1);
    b[r][c] = saved;                                           // un-choose
    return found;
}` },
        { name: 'Palindrome partitioning', code: J`List<List<String>> partition(String s) {
    List<List<String>> res = new ArrayList<>();
    cut(s, 0, new ArrayList<>(), res);
    return res;
}

void cut(String s, int start, List<String> path, List<List<String>> res) {
    if (start == s.length()) { res.add(new ArrayList<>(path)); return; }
    for (int end = start; end < s.length(); end++) {
        if (!isPal(s, start, end)) continue;          // prune
        path.add(s.substring(start, end + 1));
        cut(s, end + 1, path, res);
        path.remove(path.size() - 1);
    }
}

boolean isPal(String s, int l, int r) {
    while (l < r) if (s.charAt(l++) != s.charAt(r--)) return false;
    return true;
}` },
        { name: 'N-Queens (count)', code: J`int totalNQueens(int n) {
    return place(0, n, new boolean[n], new boolean[2 * n], new boolean[2 * n]);
}

int place(int r, int n, boolean[] cols, boolean[] d1, boolean[] d2) {
    if (r == n) return 1;                          // all rows filled
    int count = 0;
    for (int c = 0; c < n; c++) {
        if (cols[c] || d1[r - c + n] || d2[r + c]) continue;   // attacked
        cols[c] = d1[r - c + n] = d2[r + c] = true;
        count += place(r + 1, n, cols, d1, d2);
        cols[c] = d1[r - c + n] = d2[r + c] = false;
    }
    return count;
}` }
      ]
    }
  ],

  javaUsed: [
    ['List<List<Integer>> res = new ArrayList<>()', 'All answers.', 'Pass it into the helper or keep it as a field.'],
    ['res.add(new ArrayList<>(path))', 'Save a snapshot of the path.', '`res.add(path)` saves a reference that you later empty.'],
    ['path.add(x); path.remove(path.size() - 1);', 'Choose and un-choose.', 'For `List<Integer>`, `remove(int index)` removes by position.'],
    ['boolean[] used = new boolean[n]', 'Which items are in the path.', 'Permutations.'],
    ['StringBuilder sb; sb.append(c); sb.deleteCharAt(sb.length() - 1)', 'String path with cheap undo.', '`sb.toString()` when saving.'],
    ['Arrays.sort(nums)', 'Group duplicates and enable `break` pruning.', 'Do it once before the first call.'],
    ['s.substring(start, end + 1)', 'Piece from start to end, both included.', 'Second argument is exclusive.'],
    ["map[digits.charAt(i) - '0']", 'Digit char to array index.', 'Phone letters.']
  ],
  concepts: [
    { name: 'Why copy the path when saving', text: 'There is only one `path` list shared by every call. If you store `path` itself, every saved answer is the same object, and by the end it is empty. `new ArrayList<>(path)` stores a snapshot.', code: J`res.add(path);                      // WRONG: all entries become []
res.add(new ArrayList<>(path));     // right: a frozen copy` },
    { name: 'remove(int) vs remove(Object)', text: 'For a `List<Integer>`, `path.remove(2)` removes the item at **index 2**, not the value 2. That is what you want for un-choose: `path.remove(path.size() - 1)`. To remove a value use `path.remove(Integer.valueOf(2))`.' },
    { name: 'start vs used[]', text: 'Combinations ignore order, so only look forward (`start`). Permutations care about order, so look at everything not used yet (`used[]`). Picking the wrong one gives duplicates or missing answers.' },
    { name: 'Pruning', text: 'Stop exploring a branch the moment it cannot succeed: sum already too big, remaining slots fewer than needed, prefix not a palindrome. Pruning does not change correctness, only speed.' }
  ],
  loops: [
    ['`for (int i = start; i < n; i++)`', 'Only look forward.', 'Subsets, combinations'],
    ['`for (int i = 0; i < n; i++) { if (used[i]) continue; ... }`', 'Any unused item.', 'Permutations'],
    ['`if (i > start && nums[i] == nums[i - 1]) continue;`', 'Skip duplicate siblings.', 'Subsets II, Combination Sum II'],
    ['`if (c[i] > remain) break;`', 'Sorted input: rest is too big.', 'Combination sum']
  ],
  movesTitle: 'The three moves',
  moves: [
    ['`path.add(nums[i]);`', 'Choose', 'Every template'],
    ['`backtrack(i + 1, ...);`', 'Explore, each item once', 'Subsets, combos'],
    ['`backtrack(i, ...);`', 'Explore, item may repeat', 'Combination sum'],
    ['`path.remove(path.size() - 1);`', 'Un-choose', 'Every template'],
    ["`b[r][c] = '#'; ... b[r][c] = saved;`", 'Mark and restore a board cell', 'Word search']
  ],
  bugs: [
    ['Saving the path without copying', 'All answers end up equal (often empty).', '`new ArrayList<>(path)`.'],
    ['Forgot to un-choose', 'Path keeps growing across branches.', 'undo exactly what you did, right after the recursive call.'],
    ['Recursing with i instead of i + 1', 'Items reused when they should not be (or infinite recursion).', 'reuse → `i`, no reuse → `i + 1`.'],
    ['Duplicate answers', 'Input has repeated values.', 'sort + `if (i > start && nums[i] == nums[i - 1]) continue;`'],
    ['Not restoring the board', 'Later searches see `#` cells.', 'restore before returning, even when found.'],
    ['Missing return after saving', 'Recursion keeps going past a complete answer.', '`return;` right after `res.add(...)` when the goal is reached.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-subsets', title: 'Subsets', ask: 'Save every path; choose, explore with i + 1, un-choose.', code: J`void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add([[new ArrayList<>(path)]]);
    for (int i = [[start]]; i < nums.length; i++) {
        path.[[add]](nums[i]);
        backtrack(nums, [[i + 1]], path, res);
        path.remove([[path.size() - 1]]);
    }
}` },
      { id: 'fb-perm', title: 'Permutations', ask: 'Any unused item can go next.', code: J`void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == [[nums.length]]) { res.add(new ArrayList<>(path)); [[return]]; }
    for (int i = [[0]]; i < nums.length; i++) {
        if ([[used[i]]]) continue;
        used[i] = [[true]];
        path.add(nums[i]);
        backtrack(nums, used, path, res);
        path.remove(path.size() - 1);
        used[i] = [[false]];
    }
}` },
      { id: 'fb-combsum', title: 'Combination sum', ask: 'Reuse allowed; stop when remain hits 0.', code: J`void backtrack(int[] c, int start, int remain, List<Integer> path, List<List<Integer>> res) {
    if (remain == [[0]]) { res.add(new ArrayList<>(path)); return; }
    for (int i = start; i < c.length; i++) {
        if (c[i] > remain) [[break]];
        path.add(c[i]);
        backtrack(c, [[i]], [[remain - c[i]]], path, res);
        path.remove(path.size() - 1);
    }
}` }
    ],
    order: [
      { id: 'od-subsets2', title: 'Subsets II (duplicates in input)',
        ideaSteps: ['Save the current path.', 'Try each next number from `start`.', 'Skip a number equal to the one before it at this same level.', 'Choose it, explore from the next index, un-choose.'],
        lines: [
          'void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {',
          '    res.add(new ArrayList<>(path));',
          '    for (int i = start; i < nums.length; i++) {',
          '        if (i > start && nums[i] == nums[i - 1]) continue;',
          '        path.add(nums[i]);',
          '        backtrack(nums, i + 1, path, res);',
          '        path.remove(path.size() - 1);',
          '    }',
          '}'
        ],
        extra: ['        if (i > 0 && nums[i] == nums[i - 1]) continue;', '    res.add(path);'],
        wrap: '@@' },
      { id: 'od-word', title: 'Word search helper',
        ideaSteps: ['All letters matched: success.', 'Off the board or wrong letter: fail.', 'Mark this cell so it is not reused.', 'Try the 4 neighbours for the next letter.', 'Restore the cell and return the result.'],
        lines: [
          'boolean dfs(char[][] b, String w, int i, int r, int c) {',
          '    if (i == w.length()) return true;',
          '    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(i)) return false;',
          '    char saved = b[r][c];',
          "    b[r][c] = '#';",
          '    boolean found = dfs(b, w, i + 1, r + 1, c) || dfs(b, w, i + 1, r - 1, c) || dfs(b, w, i + 1, r, c + 1) || dfs(b, w, i + 1, r, c - 1);',
          '    b[r][c] = saved;',
          '    return found;',
          '}'
        ],
        wrap: '@@' }
    ]
  },
  practice: {
    easy: [['78', 'Subsets'], ['77', 'Combinations'], ['46', 'Permutations'], ['17', 'Letter Combinations of a Phone Number'], ['22', 'Generate Parentheses']],
    next: [['39', 'Combination Sum'], ['90', 'Subsets II'], ['40', 'Combination Sum II'], ['47', 'Permutations II'], ['79', 'Word Search'], ['131', 'Palindrome Partitioning'], ['51', 'N-Queens'], ['37', 'Sudoku Solver']]
  }
});
})();
