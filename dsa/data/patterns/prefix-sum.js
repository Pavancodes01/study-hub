(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'prefix-sum', order: 3, title: 'Prefix sum',
  oneLiner: 'Precompute running totals once. Then the sum of any range is one subtraction: `prefix[r + 1] - prefix[l]`. Pair it with a HashMap to count subarrays.',
  legend: [['l', 'range start'], ['r', 'range end'], ['a', 'prefix value used']],
  clues: ['sum of range i..j', 'many range queries', 'subarray sum equals k', 'count subarrays', 'negative numbers allowed', 'divisible by k', 'equal 0s and 1s', 'product except self'],
  idea: [
    '`prefix[i]` = sum of the first `i` items. So `prefix[0] = 0`, `prefix[1] = nums[0]`, and so on. The array is one longer than `nums`.',
    'Sum of `nums[l..r]` = (sum of first r+1 items) − (sum of first l items) = `prefix[r + 1] - prefix[l]`.',
    'For "count subarrays with sum k": walk left to right with a running sum. A subarray ending here has sum k when some **earlier** running sum equals `sum - k`. A HashMap counts earlier sums.'
  ],
  pick: [
    ['Many "sum from i to j" queries', 'Prefix array', '`int[] prefix = new int[n + 1];`'],
    ['Count / find subarrays with sum k (negatives allowed)', 'Running sum + HashMap', '`map.put(0, 1);`'],
    ['Longest subarray with sum k / equal 0s and 1s', 'Running sum + first index map', '`map.put(0, -1);`'],
    ['Range sums in a grid', '2D prefix', '`int[][] P = new int[m + 1][n + 1];`'],
    ['Product of everything except me', 'Prefix and suffix products', 'two passes, left then right']
  ],
  fourQuestions: [
    ['What do I accumulate?', 'Usually a sum. Sometimes a count, a product, or a value mod k. `sum += nums[i];`'],
    ['Do I need the whole array or just a running value?', 'Many queries: build `prefix[]`. One pass counting: a running `sum` plus a map.'],
    ['What earlier value am I looking for?', 'For sum k: `sum - k`. Look it up: `map.getOrDefault(sum - k, 0)`.'],
    ['What is the starting value?', 'Empty prefix has sum 0. Seed it: `prefix[0] = 0` or `map.put(0, 1)`.']
  ],

  demo: {
    title: 'Count subarrays with sum = 3',
    sub: 'Array `[1, 2, 1, -1, 2]`. Running sum plus a map of how many times each earlier sum appeared.',
    code: [
      'Map<Integer, Integer> seen = new HashMap<>();',
      'seen.put(0, 1);                  // empty prefix',
      'int sum = 0, count = 0;',
      'for (int x : nums) {',
      '    sum += x;',
      '    count += seen.getOrDefault(sum - k, 0);',
      '    seen.merge(sum, 1, Integer::sum);',
      '}'
    ],
    steps: function(){
      var a = [1, 2, 1, -1, 2], k = 3, seen = {0: 1}, sum = 0, count = 0, out = [];
      function mp(hot){ return { type: 'map', name: 'seen (sum → times)', entries: Object.keys(seen).map(function(s){ return [s, seen[s], +s === hot ? 'on-a' : '']; }) }; }
      out.push({ panels: [arr(a, []), mp(null)], line: 1, vars: {sum: 0, count: 0}, msg: 'Before any item, the running sum is 0 once (the empty prefix). This lets a subarray that starts at index 0 be counted.' });
      a.forEach(function(x, i){
        sum += x;
        var need = sum - k, hits = seen[need] || 0;
        count += hits;
        var c = {}; for (var j = 0; j <= i; j++) c[j] = 'win';
        out.push({ panels: [arr(a, [{i: i, label: 'i', c: 'r'}], {cls: c}), mp(need)], line: 5, ok: hits > 0, vars: {sum: sum, 'sum - k': need, count: count},
          msg: 'Running sum = ' + sum + '. Look up `sum - k = ' + need + '`: ' + (hits ? 'seen **' + hits + '** time(s), so ' + hits + ' subarray(s) ending here sum to 3.' : 'never seen, nothing to add.') });
        seen[sum] = (seen[sum] || 0) + 1;
        out.push({ panels: [arr(a, [{i: i, label: 'i', c: 'r'}], {cls: c}), mp(sum)], line: 6, vars: {sum: sum, count: count}, msg: 'Store this running sum so later indexes can use it.' });
      });
      out.push({ panels: [arr(a, []), mp(null)], line: 7, ok: true, vars: {count: count}, msg: 'Done: **' + count + '** subarrays: `[1,2]`, `[2,1]` and `[1,2,1,-1]`. One pass, and it works with negatives.' });
      return out;
    }
  },

  variants: [
    {
      id: 'array', name: 'Prefix array for range queries', short: 'Prefix array',
      intro: 'Build `prefix` once in O(n). Then every range sum is O(1). The array has `n + 1` slots so `prefix[0] = 0` handles ranges that start at index 0.',
      start: 'int[] prefix = new int[n + 1];  prefix[i + 1] = prefix[i] + nums[i];',
      panels: [arr([3, 1, 4, 1, 5], [{i: 1, label: 'l', c: 'l'}, {i: 3, label: 'r', c: 'r'}], {name: 'nums'}),
               arr([0, 3, 4, 8, 9, 14], [{i: 1, label: 'prefix[l]', c: 'a'}, {i: 4, label: 'prefix[r+1]', c: 'a'}], {name: 'prefix'})],
      rules: [
        ['Use it when', 'Many "sum of i..j" questions on an array that does not change.'],
        ['Build', '`for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];`'],
        ['Query', 'Sum of `nums[l..r]` (both included) = `prefix[r + 1] - prefix[l]`.'],
        ['Cost', 'O(n) build, O(1) per query, O(n) space.']
      ],
      probs: '303 Range Sum Query, 1480 Running Sum of 1d Array, 724 Find Pivot Index, 1991 Find the Middle Index',
      tabs: [
        { name: 'Range sum query', code: J`class NumArray {
    private int[] prefix;

    NumArray(int[] nums) {
        prefix = new int[nums.length + 1];
        for (int i = 0; i < nums.length; i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
    }

    int sumRange(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
}` },
        { name: 'Pivot index', code: J`int pivotIndex(int[] nums) {
    int total = 0;
    for (int x : nums) total += x;
    int leftSum = 0;                          // running prefix
    for (int i = 0; i < nums.length; i++) {
        int rightSum = total - leftSum - nums[i];
        if (leftSum == rightSum) return i;
        leftSum += nums[i];
    }
    return -1;
}`, note: 'You often only need a running prefix variable, not the whole array.' }
      ]
    },
    {
      id: 'hashmap', name: 'Running sum + HashMap', short: 'Sum + HashMap',
      intro: 'For counting or finding subarrays with a target sum. Keep a running sum. A subarray `(j, i]` has sum k when `sum_i - sum_j = k`, so look up `sum - k` among earlier sums.',
      start: 'Map<Integer, Integer> seen = new HashMap<>();  seen.put(0, 1);',
      panels: [arr([1, 2, 1, -1, 2], [{i: 2, label: 'i', c: 'r'}], {cls: {1: 'win', 2: 'win'}})],
      rules: [
        ['Use it when', 'Subarray sum equals k, divisible by k, equal 0s and 1s. Works with **negative** numbers (sliding window does not).'],
        ['Order matters', 'Look up first, then store. Otherwise a sum could match itself (an empty subarray).'],
        ['Counting', 'Map value = how many times that sum appeared. Seed `put(0, 1)`.'],
        ['Longest', 'Map value = **first** index that sum appeared. Seed `put(0, -1)`. Use `putIfAbsent` so later indexes do not overwrite it.']
      ],
      probs: '560 Subarray Sum Equals K, 974 Subarray Sums Divisible by K, 525 Contiguous Array, 523 Continuous Subarray Sum',
      tabs: [
        { name: 'Count sum = k', code: J`int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> seen = new HashMap<>();
    seen.put(0, 1);                         // empty prefix
    int sum = 0, count = 0;
    for (int x : nums) {
        sum += x;
        count += seen.getOrDefault(sum - k, 0);   // look up first
        seen.merge(sum, 1, Integer::sum);         // then store
    }
    return count;
}` },
        { name: 'Divisible by k', code: J`int subarraysDivByK(int[] nums, int k) {
    int[] seen = new int[k];                // remainders 0..k-1
    seen[0] = 1;
    int sum = 0, count = 0;
    for (int x : nums) {
        sum += x;
        int mod = ((sum % k) + k) % k;      // fix negative remainder
        count += seen[mod];
        seen[mod]++;
    }
    return count;
}`, note: 'Two prefixes with the same remainder mod k mean the part between them is divisible by k. In Java, `-7 % 5` is `-2`, so add k and mod again.' },
        { name: 'Equal 0s and 1s (longest)', code: J`int findMaxLength(int[] nums) {
    Map<Integer, Integer> first = new HashMap<>();
    first.put(0, -1);                       // sum 0 "before" index 0
    int sum = 0, best = 0;
    for (int i = 0; i < nums.length; i++) {
        sum += nums[i] == 1 ? 1 : -1;       // treat 0 as -1
        if (first.containsKey(sum)) {
            best = Math.max(best, i - first.get(sum));
        } else {
            first.put(sum, i);              // keep the earliest index
        }
    }
    return best;
}` }
      ]
    },
    {
      id: 'twod', name: '2D prefix sum', short: '2D prefix',
      intro: '`P[r][c]` = sum of the rectangle from the top-left corner to `(r-1, c-1)`. Any sub-rectangle sum is four lookups (inclusion-exclusion).',
      start: 'int[][] P = new int[m + 1][n + 1];',
      panels: [{ type: 'grid', name: 'grid', rows: [[3, 0, 1], [5, 6, 3], [1, 2, 0]], cls: {'1,1': 'win', '1,2': 'win', '2,1': 'win', '2,2': 'win'} },
               { type: 'grid', name: 'P (one extra row and column of 0s)', rows: [[0, 0, 0, 0], [0, 3, 3, 4], [0, 8, 14, 18], [0, 9, 17, 21]], cls: {'3,3': 'on-r', '1,3': 'on-l', '3,1': 'on-l', '1,1': 'on-a'} }],
      rules: [
        ['Build', '`P[i+1][j+1] = grid[i][j] + P[i][j+1] + P[i+1][j] - P[i][j]`'],
        ['Query (r1,c1)..(r2,c2)', '`P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]`'],
        ['Why minus / plus', 'Subtract the strip above and the strip to the left. The top-left corner was subtracted twice, so add it back once.']
      ],
      probs: '304 Range Sum Query 2D, 1314 Matrix Block Sum, 238 Product of Array Except Self (1D cousin)',
      tabs: [
        { name: 'Range sum 2D', code: J`class NumMatrix {
    private int[][] P;

    NumMatrix(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        P = new int[m + 1][n + 1];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                P[i + 1][j + 1] = grid[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
            }
        }
    }

    int sumRegion(int r1, int c1, int r2, int c2) {
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
}` },
        { name: 'Product except self', code: J`int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] res = new int[n];
    res[0] = 1;
    for (int i = 1; i < n; i++) {
        res[i] = res[i - 1] * nums[i - 1];  // product of everything left of i
    }
    int right = 1;                          // product of everything right of i
    for (int i = n - 1; i >= 0; i--) {
        res[i] *= right;
        right *= nums[i];
    }
    return res;
}`, note: 'Same idea with products: a prefix pass from the left and a suffix pass from the right. No division needed.' }
      ]
    }
  ],

  javaUsed: [
    ['new int[n + 1]', 'Prefix array, one bigger than the input.', 'Slot 0 holds the empty sum, so no special case for l = 0.'],
    ['for (int x : nums)', 'Enhanced for loop: x is each value.', 'Use it when you do not need the index.'],
    ['map.getOrDefault(key, 0)', 'Value for key, or 0 if missing.', 'Avoids a NullPointerException when unboxing.'],
    ['map.merge(key, 1, Integer::sum)', 'Increment a count.', 'Puts 1 when the key is new.'],
    ['map.putIfAbsent(key, i)', 'Store only the first time.', 'Keeps the earliest index for "longest" problems.'],
    ['map.containsKey(key)', 'Has this key been stored?', 'Check before `get` when 0 or null matters.'],
    ['((sum % k) + k) % k', 'Remainder in range 0..k-1, even for negative sum.', 'Java `%` keeps the sign of the left side.'],
    ['long sum', 'Running sums of many ints can overflow.', 'Use `long` when values or n are large.'],
    ['int[][] P = new int[m + 1][n + 1]', '2D array; `P.length` rows, `P[0].length` columns.', 'All cells start at 0.']
  ],
  concepts: [
    { name: 'Why prefix has n + 1 slots', text: 'With `prefix[0] = 0`, the sum of `nums[0..r]` is `prefix[r + 1] - prefix[0]`, same formula as every other range. No `if (l == 0)` special case.' },
    { name: 'Why seed the map with 0', text: 'A subarray that starts at index 0 has sum = the running sum itself. Its "earlier prefix" is the empty prefix with sum 0. `seen.put(0, 1)` represents it.' },
    { name: 'Look up before you store', text: 'If you store `sum` first and then look up `sum - k` with k = 0, you would count the current position against itself. Always: update sum, look up, then store.' },
    { name: 'Autoboxing: map values are Integer, not int', text: '`map.get(key)` returns `null` if missing. Unboxing null to int throws NullPointerException. And comparing two `Integer` objects with `==` can fail above 127. Use `getOrDefault` and `.equals()`.', code: J`Integer a = 1000, b = 1000;
boolean same = a.equals(b);   // true
// a == b may be false: compares object references` }
  ],
  loops: [
    ['`for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];`', 'Build the prefix array.', 'Prefix array'],
    ['`for (int x : nums) { sum += x; ... }`', 'One pass with a running sum.', 'HashMap counting'],
    ['`for (int i = n - 1; i >= 0; i--)`', 'Suffix pass from the right.', 'Product except self']
  ],
  movesTitle: 'Key lines',
  moves: [
    ['`prefix[r + 1] - prefix[l]`', 'Sum of nums[l..r], both included', 'Range query'],
    ['`count += seen.getOrDefault(sum - k, 0);`', 'Subarrays ending here with sum k', 'Counting'],
    ['`seen.merge(sum, 1, Integer::sum);`', 'Remember this prefix sum', 'Counting'],
    ['`best = Math.max(best, i - first.get(sum));`', 'Length from the first time we saw this sum', 'Longest'],
    ['`sum += nums[i] == 1 ? 1 : -1;`', 'Turn 0/1 balance into a sum problem', 'Equal 0s and 1s']
  ],
  bugs: [
    ['Forgot map.put(0, 1)', 'Subarrays that start at index 0 are never counted.', 'seed the map before the loop.'],
    ['Off by one in range query', '`prefix[r] - prefix[l]` misses `nums[r]`.', '`prefix[r + 1] - prefix[l]`.'],
    ['Negative remainder', '`-1 % 5` is `-1` in Java, not 4.', '`((sum % k) + k) % k`.'],
    ['Overwriting the first index', 'For "longest", a later `put` replaces the earliest index.', '`putIfAbsent`, or put only in the else branch.'],
    ['Using sliding window with negatives', 'Shrinking does not reduce the sum reliably.', 'running sum + HashMap.'],
    ['Overflow', 'Sums of up to 10⁵ values of 10⁹ exceed int.', 'use `long`.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-build', title: 'Build and query a prefix array', ask: 'Sum of `nums[l..r]`, both included.', code: J`int rangeSum(int[] nums, int l, int r) {
    int[] prefix = new int[ [[nums.length + 1]] ];
    for (int i = 0; i < nums.length; i++) {
        prefix[ [[i + 1]] ] = prefix[i] + nums[i];
    }
    return [[prefix[r + 1] - prefix[l]]];
}` },
      { id: 'fb-count', title: 'Subarray sum equals k', ask: 'Count subarrays that sum to k, negatives allowed.', code: J`int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> seen = new HashMap<>();
    seen.put([[0]], [[1]]);
    int sum = 0, count = 0;
    for (int x : nums) {
        sum += x;
        count += seen.[[getOrDefault]](sum - k, 0);
        seen.merge([[sum]], 1, Integer::sum);
    }
    return count;
}` },
      { id: 'fb-longest', title: 'Contiguous array (equal 0s and 1s)', ask: 'Longest subarray with the same number of 0s and 1s.', code: J`int findMaxLength(int[] nums) {
    Map<Integer, Integer> first = new HashMap<>();
    first.put(0, [[-1]]);
    int sum = 0, best = 0;
    for (int i = 0; i < nums.length; i++) {
        sum += nums[i] == 1 ? 1 : [[-1]];
        if (first.[[containsKey]](sum)) best = Math.max(best, [[i - first.get(sum)]]);
        else first.put(sum, i);
    }
    return best;
}` }
    ],
    order: [
      { id: 'od-pivot', title: 'Find pivot index',
        ideaSteps: ['Get the total of all numbers.', 'Walk left to right keeping the sum of everything to the left.', 'Right sum = total − left sum − current item.', 'If they match, return this index.', 'Add the current item to the left sum and keep going.', 'No pivot: return -1.'],
        lines: [
          'int total = 0;',
          'for (int x : nums) total += x;',
          'int leftSum = 0;',
          'for (int i = 0; i < nums.length; i++) {',
          '    if (leftSum == total - leftSum - nums[i]) return i;',
          '    leftSum += nums[i];',
          '}',
          'return -1;'
        ],
        extra: ['    leftSum += nums[i + 1];'],
        wrap: 'int pivotIndex(int[] nums) {\n@@\n}' },
      { id: 'od-divk', title: 'Subarray sums divisible by k',
        ideaSteps: ['Count how many prefixes had each remainder (0..k-1). The empty prefix has remainder 0.', 'Add each number to the running sum.', 'Get a non-negative remainder.', 'Every earlier prefix with the same remainder forms a valid subarray.', 'Record this remainder.'],
        lines: [
          'int[] seen = new int[k];',
          'seen[0] = 1;',
          'int sum = 0, count = 0;',
          'for (int x : nums) {',
          '    sum += x;',
          '    int mod = ((sum % k) + k) % k;',
          '    count += seen[mod];',
          '    seen[mod]++;',
          '}',
          'return count;'
        ],
        wrap: 'int subarraysDivByK(int[] nums, int k) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['1480', 'Running Sum of 1d Array'], ['303', 'Range Sum Query - Immutable'], ['724', 'Find Pivot Index'], ['560', 'Subarray Sum Equals K']],
    next: [['525', 'Contiguous Array'], ['974', 'Subarray Sums Divisible by K'], ['523', 'Continuous Subarray Sum'], ['238', 'Product of Array Except Self'], ['304', 'Range Sum Query 2D - Immutable'], ['1314', 'Matrix Block Sum']]
  }
});
})();
