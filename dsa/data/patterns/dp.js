(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'dp', order: 13, title: 'Dynamic programming',
  oneLiner: 'Write the answer for a big input in terms of answers for smaller inputs, then store each small answer so it is computed once. Recursion → memo → table: always the same three steps.',
  legend: [['a', 'cell being filled'], ['l', 'cells it reads'], ['hit', 'final answer']],
  clues: ['number of ways', 'minimum / maximum cost', 'can you reach / is it possible', 'longest / shortest subsequence', 'choose or skip each item', 'grid paths', 'two strings: edit, match, common', 'overlapping choices (greedy fails)'],
  idea: [
    'Step 1: define the **state** in words: "`dp[i]` = best answer using the first i items" or "`dp[i][j]` = answer for `s[0..i)` and `t[0..j)`".',
    'Step 2: the **transition**: how does `dp[i]` follow from smaller states? Usually "last choice" thinking: what was the last step, and what were the options?',
    'Step 3: **base cases** and **order**: fill small states first so every cell you read is already done. If you can write the recursion, you can always add a memo and stop there.'
  ],
  pick: [
    ['One sequence, answer depends on the last 1–2 items', '1D DP', '`int[] dp = new int[n + 1];`'],
    ['Moving right/down in a grid', '2D grid DP', '`dp[r][c] = f(dp[r - 1][c], dp[r][c - 1])`'],
    ['Two strings', '2D DP on prefixes', '`int[][] dp = new int[m + 1][n + 1];`'],
    ['Pick items under a capacity / target sum', 'Knapsack', '`boolean[] dp = new boolean[target + 1];`'],
    ['Hard to see the table', 'Recursion + memo (top-down)', '`Integer[] memo` or `HashMap`']
  ],
  fourQuestions: [
    ['What does dp[i] mean, in one sentence?', 'Write it as a comment above the array. If you cannot say it, you cannot code it.'],
    ['What are the base cases?', 'The smallest inputs you can answer directly: `dp[0] = 1;`, `dp[0][j] = j;`'],
    ['What is the transition?', 'One line for the last choice: `dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i - 1]);`'],
    ['Where is the answer, and what order fills it?', 'Usually `dp[n]` or `dp[m][n]`. Loop `i` upward so smaller states are ready.']
  ],

  demo: {
    title: 'House robber: no two adjacent houses',
    sub: 'Houses `[2, 7, 9, 3, 1]`. `dp[i]` = most money from the first i houses. For each house: skip it, or rob it plus `dp[i - 2]`.',
    code: [
      'int[] dp = new int[n + 1];       // dp[i] = best from first i houses',
      'dp[0] = 0;',
      'dp[1] = nums[0];',
      'for (int i = 2; i <= n; i++) {',
      '    int skip = dp[i - 1];',
      '    int rob  = dp[i - 2] + nums[i - 1];',
      '    dp[i] = Math.max(skip, rob);',
      '}',
      'return dp[n];'
    ],
    steps: function(){
      var a = [2, 7, 9, 3, 1], n = a.length, dp = [0, a[0]], out = [];
      function P(i, reads){ var c = {}; (reads || []).forEach(function(k){ c[k] = 'on-l'; }); if (i !== null) c[i] = 'on-a';
        var shown = []; for (var k = 0; k <= n; k++) shown.push(k < dp.length ? dp[k] : '');
        return [arr(a, i !== null && i >= 1 ? [{i: i - 1, label: 'house ' + (i - 1), c: 'r'}] : [], {name: 'nums'}), arr(shown, [], {name: 'dp', cls: c})]; }
      out.push({ panels: P(1, [0]), line: [1, 2], vars: {}, msg: 'Base cases. No houses: 0. One house: rob it, `dp[1] = 2`.' });
      for (var i = 2; i <= n; i++){
        var skip = dp[i - 1], rob = dp[i - 2] + a[i - 1];
        dp[i] = Math.max(skip, rob);
        out.push({ panels: P(i, [i - 1, i - 2]), line: [4, 5, 6], vars: {i: i, skip: skip, rob: rob, 'dp[i]': dp[i]},
          msg: 'House ' + (i - 1) + ' has ' + a[i - 1] + '. Skip: `dp[' + (i - 1) + '] = ' + skip + '`. Rob: `dp[' + (i - 2) + '] + ' + a[i - 1] + ' = ' + rob + '`. Keep the max: **' + dp[i] + '**.' });
      }
      var c = {}; c[n] = 'on-hit';
      out.push({ panels: [arr(a, [], {name: 'nums'}), arr(dp, [], {name: 'dp', cls: c})], line: 8, ok: true, msg: 'Answer `dp[' + n + '] = ' + dp[n] + '` (rob houses 2 + 9 + 1). Each cell used only the two before it, so O(n) time.' });
      return out;
    }
  },

  variants: [
    {
      id: 'oned', name: '1D DP (and recursion → memo → table)', short: '1D DP',
      intro: 'Start from a plain recursion. Add a memo so each state is solved once. Then flip it into a loop that fills the table from small to big. All three give the same answer.',
      start: 'int[] dp = new int[n + 1];  dp[0] = base;  for (int i = 1; i <= n; i++) dp[i] = f(dp[i - 1], dp[i - 2]);',
      panels: [arr([1, 1, 2, 3, 5, 8], [{i: 5, label: 'dp[i]', c: 'a'}], {name: 'climbing stairs dp', cls: {3: 'on-l', 4: 'on-l'}})],
      rules: [
        ['Use it when', 'Climbing stairs, house robber, decode ways, coin change, word break, longest increasing subsequence.'],
        ['Space trick', 'If `dp[i]` only reads `dp[i - 1]` and `dp[i - 2]`, keep two variables instead of an array.'],
        ['"Min" problems', 'Fill with a big value (`amount + 1`, not `MAX_VALUE` which overflows on `+ 1`).'],
        ['Cost', 'states × work per state.']
      ],
      probs: '70 Climbing Stairs, 198 House Robber, 322 Coin Change, 139 Word Break, 300 Longest Increasing Subsequence, 91 Decode Ways',
      tabs: [
        { name: '1. Recursion', code: J`int climbStairsRec(int n) {
    if (n <= 1) return 1;                         // base cases
    return climbStairsRec(n - 1) + climbStairsRec(n - 2);   // last step was 1 or 2
}`, note: 'Correct but exponential: the same n is solved again and again.' },
        { name: '2. Memo', code: J`int climbStairsMemo(int n) {
    return ways(n, new Integer[n + 1]);
}

int ways(int n, Integer[] memo) {
    if (n <= 1) return 1;
    if (memo[n] != null) return memo[n];          // already solved
    memo[n] = ways(n - 1, memo) + ways(n - 2, memo);
    return memo[n];
}`, note: '`Integer[]` starts as all `null`, so null means "not solved yet". Now O(n).' },
        { name: '3. Table', code: J`int climbStairs(int n) {
    int[] dp = new int[n + 1];                    // dp[i] = ways to reach step i
    dp[0] = 1;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}` },
        { name: 'Coin change', code: J`int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];               // dp[a] = fewest coins for a
    Arrays.fill(dp, amount + 1);                  // "infinity" that won't overflow
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);   // last coin was c
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}` },
        { name: 'LIS', code: J`int lengthOfLIS(int[] nums) {
    int n = nums.length, best = 1;
    int[] dp = new int[n];                        // dp[i] = LIS ending at i
    Arrays.fill(dp, 1);
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        best = Math.max(best, dp[i]);
    }
    return best;
}` },
        { name: 'Word break', code: J`boolean wordBreak(String s, List<String> wordDict) {
    Set<String> words = new HashSet<>(wordDict);
    boolean[] dp = new boolean[s.length() + 1];  // dp[i] = s[0..i) can be split
    dp[0] = true;
    for (int i = 1; i <= s.length(); i++) {
        for (int j = 0; j < i; j++) {
            if (dp[j] && words.contains(s.substring(j, i))) {   // last word is s[j..i)
                dp[i] = true;
                break;
            }
        }
    }
    return dp[s.length()];
}` }
      ]
    },
    {
      id: 'grid', name: '2D grid DP', short: 'Grid DP',
      intro: 'You can only move right or down, so each cell is reached from the cell above or the cell to the left. Fill row by row.',
      start: 'dp[r][c] = dp[r - 1][c] + dp[r][c - 1];',
      panels: [{ type: 'grid', name: 'unique paths, 3 × 4', rows: [[1, 1, 1, 1], [1, 2, 3, 4], [1, 3, 6, 10]], cls: {'2,3': 'on-hit', '1,3': 'on-l', '2,2': 'on-l'} }],
      rules: [
        ['Use it when', 'Unique paths, minimum path sum, paths with obstacles, maximal square, triangle.'],
        ['Base cases', 'First row and first column have only one way in.'],
        ['Space trick', 'Only the previous row is needed: one `int[] dp` of width n, updated in place.']
      ],
      probs: '62 Unique Paths, 64 Minimum Path Sum, 63 Unique Paths II, 221 Maximal Square, 120 Triangle',
      tabs: [
        { name: 'Unique paths', code: J`int uniquePaths(int m, int n) {
    int[][] dp = new int[m][n];
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (r == 0 || c == 0) dp[r][c] = 1;          // edges: one way
            else dp[r][c] = dp[r - 1][c] + dp[r][c - 1]; // from above + from left
        }
    }
    return dp[m - 1][n - 1];
}` },
        { name: 'Min path sum', code: J`int minPathSum(int[][] grid) {
    int m = grid.length, n = grid[0].length;
    int[][] dp = new int[m][n];
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (r == 0 && c == 0) dp[r][c] = grid[0][0];
            else if (r == 0) dp[r][c] = dp[r][c - 1] + grid[r][c];
            else if (c == 0) dp[r][c] = dp[r - 1][c] + grid[r][c];
            else dp[r][c] = Math.min(dp[r - 1][c], dp[r][c - 1]) + grid[r][c];
        }
    }
    return dp[m - 1][n - 1];
}` },
        { name: '1D space', code: J`int uniquePaths1D(int m, int n) {
    int[] dp = new int[n];
    Arrays.fill(dp, 1);                   // first row
    for (int r = 1; r < m; r++) {
        for (int c = 1; c < n; c++) {
            dp[c] += dp[c - 1];           // dp[c] (above) + dp[c - 1] (left)
        }
    }
    return dp[n - 1];
}` }
      ]
    },
    {
      id: 'strings', name: 'Two strings (prefix table)', short: 'Two strings',
      intro: '`dp[i][j]` describes the first `i` chars of one string and the first `j` chars of the other. Row 0 and column 0 are the empty-string base cases.',
      start: 'int[][] dp = new int[m + 1][n + 1];   compare s.charAt(i - 1) with t.charAt(j - 1)',
      panels: [{ type: 'grid', name: 'LCS of "ace" and "abcde"', rowHeads: ['""', 'a', 'c', 'e'], colHeads: ['""', 'a', 'b', 'c', 'd', 'e'],
        rows: [[0, 0, 0, 0, 0, 0], [0, 1, 1, 1, 1, 1], [0, 1, 1, 2, 2, 2], [0, 1, 1, 2, 2, 3]], cls: {'3,5': 'on-hit', '2,4': 'on-l'} }],
      rules: [
        ['Use it when', 'Longest common subsequence, edit distance, distinct subsequences, interleaving string, longest palindromic subsequence.'],
        ['Chars match', 'Usually take the diagonal: `dp[i - 1][j - 1] + 1` (LCS) or `dp[i - 1][j - 1]` (edit distance).'],
        ['No match', 'Best of dropping a char from one side: `dp[i - 1][j]`, `dp[i][j - 1]` (and replace for edit distance).'],
        ['Index shift', 'Table index i means "first i chars", so the char is `s.charAt(i - 1)`.']
      ],
      probs: '1143 Longest Common Subsequence, 72 Edit Distance, 583 Delete Operation for Two Strings, 516 Longest Palindromic Subsequence, 115 Distinct Subsequences',
      tabs: [
        { name: 'LCS', code: J`int longestCommonSubsequence(String s, String t) {
    int m = s.length(), n = t.length();
    int[][] dp = new int[m + 1][n + 1];          // row/col 0 = empty string
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s.charAt(i - 1) == t.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;  // use both chars
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);  // drop one
            }
        }
    }
    return dp[m][n];
}` },
        { name: 'Edit distance', code: J`int minDistance(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;   // delete everything
    for (int j = 0; j <= n; j++) dp[0][j] = j;   // insert everything
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];      // free
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],            // replace
                               Math.min(dp[i - 1][j], dp[i][j - 1])); // delete, insert
            }
        }
    }
    return dp[m][n];
}` }
      ]
    },
    {
      id: 'knapsack', name: 'Knapsack (choose or skip)', short: 'Knapsack',
      intro: 'Each item is either taken or not. `dp[s]` answers "can I make sum s?" (or "how many ways"). Loop items outside, sums inside.',
      start: 'boolean[] dp = new boolean[target + 1];  dp[0] = true;',
      panels: [arr(['T', 'T', 'F', 'F', 'F', 'T', 'T', 'F', 'F', 'F', 'T', 'T'], [{i: 11, label: 'target', c: 'hit'}], {name: 'dp[s] = can make sum s from [1, 5, 5]', cls: {11: 'on-hit'}})],
      rules: [
        ['Use it when', 'Partition equal subset sum, target sum, coin change II (number of ways), last stone weight II, ones and zeroes.'],
        ['Each item once (0/1)', 'Loop sums **downward**: `for (int s = target; s >= x; s--)`. Going up would reuse the item.'],
        ['Unlimited items', 'Loop sums **upward**: `for (int s = x; s <= target; s++)`.'],
        ['Count ways', '`dp[s] += dp[s - x]` with `dp[0] = 1`.']
      ],
      probs: '416 Partition Equal Subset Sum, 494 Target Sum, 518 Coin Change II, 1049 Last Stone Weight II, 474 Ones and Zeroes',
      tabs: [
        { name: 'Partition equal subset', code: J`boolean canPartition(int[] nums) {
    int total = 0;
    for (int x : nums) total += x;
    if (total % 2 != 0) return false;
    int target = total / 2;
    boolean[] dp = new boolean[target + 1];      // dp[s] = some subset sums to s
    dp[0] = true;
    for (int x : nums) {
        for (int s = target; s >= x; s--) {      // downward: each item once
            dp[s] = dp[s] || dp[s - x];
        }
    }
    return dp[target];
}` },
        { name: 'Coin change II (ways)', code: J`int change(int amount, int[] coins) {
    int[] dp = new int[amount + 1];              // dp[s] = ways to make s
    dp[0] = 1;
    for (int c : coins) {                        // coins outside: combinations
        for (int s = c; s <= amount; s++) {      // upward: unlimited coins
            dp[s] += dp[s - c];
        }
    }
    return dp[amount];
}` },
        { name: 'Memo with a map', code: J`Map<String, Integer> memo = new HashMap<>();

int findTargetSumWays(int[] nums, int target) {
    return count(nums, 0, target);
}

int count(int[] nums, int i, int remain) {
    if (i == nums.length) return remain == 0 ? 1 : 0;
    String key = i + "," + remain;               // state = (index, remaining)
    if (memo.containsKey(key)) return memo.get(key);
    int ways = count(nums, i + 1, remain - nums[i]) + count(nums, i + 1, remain + nums[i]);
    memo.put(key, ways);
    return ways;
}`, note: 'When the state has a negative or huge value, a `HashMap` memo with a String or long key is easier than an array.' }
      ]
    }
  ],

  javaUsed: [
    ['int[] dp = new int[n + 1]', 'Table with room for the empty case at 0.', 'Answer usually at `dp[n]`.'],
    ['int[][] dp = new int[m + 1][n + 1]', '2D table, all zeros.', 'Row 0 / column 0 = empty prefix.'],
    ['Integer[] memo = new Integer[n + 1]', 'Memo where null = not computed.', '`int[]` would start at 0, which may be a real answer.'],
    ['Arrays.fill(dp, amount + 1)', 'Set "infinity" for min problems.', 'Avoid `MAX_VALUE + 1` overflow.'],
    ['Arrays.fill(dp, 1)', 'Each item alone is length 1.', 'LIS.'],
    ['boolean[] dp', 'Feasibility (can I make it?).', 'Starts all false.'],
    ['Math.max / Math.min', 'Pick the best transition.', 'Nest for three options: `Math.min(a, Math.min(b, c))`.'],
    ['s.charAt(i - 1)', 'Char for table row i.', 'Because row 0 is the empty string.'],
    ['Map<String, Integer> memo; key = i + "," + j', 'Memo for any state shape.', 'Slower than arrays, but always works.']
  ],
  concepts: [
    { name: 'DP = recursion that remembers', text: 'If the brute-force recursion calls itself with the same arguments many times, those are overlapping subproblems. Store each result once (memo) and the exponential tree collapses to one call per state.' },
    { name: 'Think about the LAST step', text: 'Ask: "what was the last decision?" Last stair step was 1 or 2. Last house was robbed or skipped. Last coin was c. Last chars of both strings matched or not. Each option points to a smaller state.' },
    { name: 'Loop order decides correctness', text: 'Every cell must be filled before it is read. `dp[i]` reads `dp[i - 1]`: loop i upward. 0/1 knapsack in 1D reads the **previous item\'s** `dp[s - x]`: loop s downward so you do not see this item\'s update.' },
    { name: 'Top-down or bottom-up?', text: 'Top-down (memo) is closer to the recursion you already thought of and only computes needed states. Bottom-up (table) avoids recursion depth limits and makes space optimizations easy. In interviews, a correct memo solution is fine.' }
  ],
  loops: [
    ['`for (int i = 2; i <= n; i++)`', 'Fill states after the base cases.', '1D DP'],
    ['`for (int r...) for (int c...)`', 'Row by row so above and left are ready.', 'Grid DP'],
    ['`for (int i = 1; i <= m; i++) for (int j = 1; j <= n; j++)`', 'Prefixes of two strings.', 'LCS, edit distance'],
    ['`for (int x : nums) for (int s = target; s >= x; s--)`', 'Each item used once.', '0/1 knapsack'],
    ['`for (int c : coins) for (int s = c; s <= amount; s++)`', 'Items can repeat.', 'Unbounded knapsack']
  ],
  movesTitle: 'Transitions',
  moves: [
    ['`dp[i] = dp[i - 1] + dp[i - 2];`', 'Ways from the last step', 'Climbing stairs'],
    ['`dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i - 1]);`', 'Skip or take', 'House robber'],
    ['`dp[a] = Math.min(dp[a], dp[a - c] + 1);`', 'Best with last coin c', 'Coin change'],
    ['`dp[i][j] = dp[i - 1][j - 1] + 1;`', 'Both chars used', 'LCS'],
    ['`dp[s] = dp[s] || dp[s - x];`', 'Without x, or with x', 'Subset sum']
  ],
  bugs: [
    ['Undefined state', 'Coding before you can say what `dp[i]` means.', 'write the meaning as a comment first.'],
    ['Off-by-one with prefixes', 'Using `s.charAt(i)` with a table of size m + 1.', 'row i ↔ `charAt(i - 1)`.'],
    ['Overflow from MAX_VALUE + 1', 'Min problems with `Integer.MAX_VALUE` as infinity.', 'use `amount + 1` or check before adding.'],
    ['Wrong loop direction in knapsack', 'Upward loop reuses an item in 0/1 knapsack.', 'downward for 0/1, upward for unlimited.'],
    ['int[] memo with 0 as "unset"', '0 can be a real answer, so it gets recomputed (or wrong).', '`Integer[]` with null, or fill with -1.'],
    ['Reading an unfilled cell', 'Loop order does not match dependencies.', 'draw which cells a cell reads, then loop so those come first.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-rob', title: 'House robber', ask: '`dp[i]` = most money from the first i houses.', code: J`int rob(int[] nums) {
    int n = nums.length;
    int[] dp = new int[ [[n + 1]] ];
    dp[0] = 0;
    dp[1] = [[nums[0]]];
    for (int i = 2; i <= n; i++) {
        dp[i] = Math.max([[dp[i - 1]]], [[dp[i - 2] + nums[i - 1]]]);
    }
    return [[dp[n]]];
}` },
      { id: 'fb-coin', title: 'Coin change (fewest coins)', ask: '`dp[a]` = fewest coins that make amount a.', code: J`int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, [[amount + 1]]);
    dp[ [[0]] ] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a) dp[a] = Math.min(dp[a], [[dp[a - c] + 1]]);
    return dp[amount] > amount ? [[-1]] : dp[amount];
}` },
      { id: 'fb-lcs', title: 'Longest common subsequence', ask: 'Match: diagonal + 1. No match: best of up and left.', code: J`int longestCommonSubsequence(String s, String t) {
    int m = s.length(), n = t.length();
    int[][] dp = new int[ [[m + 1]] ][ [[n + 1]] ];
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (s.charAt([[i - 1]]) == t.charAt(j - 1)) dp[i][j] = [[dp[i - 1][j - 1] + 1]];
            else dp[i][j] = Math.max(dp[i - 1][j], [[dp[i][j - 1]]]);
    return dp[m][n];
}` }
    ],
    order: [
      { id: 'od-partition', title: 'Partition equal subset sum',
        ideaSteps: ['Odd total cannot be split in two.', 'Target = half the total.', '`dp[s]` = some subset sums to s; sum 0 is always possible.', 'For each number, update sums from high to low so it is used at most once.', 'Answer: can we make the target?'],
        lines: [
          'int total = 0;',
          'for (int x : nums) total += x;',
          'if (total % 2 != 0) return false;',
          'int target = total / 2;',
          'boolean[] dp = new boolean[target + 1];',
          'dp[0] = true;',
          'for (int x : nums) {',
          '    for (int s = target; s >= x; s--) dp[s] = dp[s] || dp[s - x];',
          '}',
          'return dp[target];'
        ],
        extra: ['    for (int s = x; s <= target; s++) dp[s] = dp[s] || dp[s - x];'],
        wrap: 'boolean canPartition(int[] nums) {\n@@\n}' },
      { id: 'od-memo', title: 'Climbing stairs with a memo',
        ideaSteps: ['0 or 1 steps: one way.', 'If this n is already solved, return it.', 'Ways = ways(n - 1) + ways(n - 2) (last step was 1 or 2).', 'Store, then return.'],
        lines: [
          'int ways(int n, Integer[] memo) {',
          '    if (n <= 1) return 1;',
          '    if (memo[n] != null) return memo[n];',
          '    memo[n] = ways(n - 1, memo) + ways(n - 2, memo);',
          '    return memo[n];',
          '}'
        ],
        extra: ['    if (memo[n] == 0) return memo[n];'],
        wrap: '@@' }
    ]
  },
  practice: {
    easy: [['70', 'Climbing Stairs'], ['746', 'Min Cost Climbing Stairs'], ['198', 'House Robber'], ['62', 'Unique Paths'], ['1143', 'Longest Common Subsequence']],
    next: [['322', 'Coin Change'], ['300', 'Longest Increasing Subsequence'], ['139', 'Word Break'], ['64', 'Minimum Path Sum'], ['416', 'Partition Equal Subset Sum'], ['518', 'Coin Change II'], ['72', 'Edit Distance'], ['91', 'Decode Ways'], ['213', 'House Robber II']]
  }
});
})();
