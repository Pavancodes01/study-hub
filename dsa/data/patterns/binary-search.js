(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'binary-search', order: 5, title: 'Binary search',
  oneLiner: 'Cut the search space in half every step. Works on any range where a yes/no question flips once: sorted arrays, first bad version, smallest speed that works.',
  legend: [['l', 'lo'], ['a', 'mid'], ['r', 'hi']],
  clues: ['sorted array', 'O(log n) required', 'find first / last position', 'insert position', 'minimum speed / capacity / days that works', 'rotated sorted array', 'peak element', 'sqrt'],
  idea: [
    'Keep a range `[lo, hi]` that surely holds the answer. Look at the middle. One comparison tells you which half **cannot** hold the answer, so drop it.',
    'Think of the range as `false false false TRUE TRUE TRUE`. You are hunting the **first true**. That one picture covers exact search, lower bound, and "search on the answer".',
    'Each step halves the range: 1,000,000 items need about 20 steps.'
  ],
  pick: [
    ['Find exact value, return index or -1', 'Classic', '`while (lo <= hi)`, `hi = mid - 1`'],
    ['First index where condition becomes true (lower bound, insert position, first/last)', 'First true', '`while (lo < hi)`, `hi = mid`'],
    ['Smallest value of X that works (speed, capacity, days)', 'Search on the answer', '`lo = min possible`, `hi = max possible`'],
    ['Rotated sorted array', 'Find the sorted half', 'compare `nums[mid]` with `nums[lo]` or `nums[hi]`']
  ],
  fourQuestions: [
    ['What is the search range?', 'Indexes `0..n-1`, or answer values like `1..max(piles)`. `int lo = 0, hi = n - 1;`'],
    ['Which loop shape?', 'Exact match: `while (lo <= hi)`. First true: `while (lo < hi)`.'],
    ['What is the yes/no test at mid?', '`nums[mid] >= target`, `canFinish(mid)`, `isBad(mid)`… Write it as a helper if it is long.'],
    ['How do lo and hi move?', 'Test true → answer is mid or left: `hi = mid`. False → answer is right: `lo = mid + 1`. Return `lo`.']
  ],

  demo: {
    title: 'Find 9 in a sorted array',
    sub: 'Array `[1, 3, 5, 7, 9, 11, 13, 15]`. Each step looks at `mid` and throws half away.',
    code: [
      'int lo = 0, hi = nums.length - 1;',
      'while (lo <= hi) {',
      '    int mid = lo + (hi - lo) / 2;',
      '    if (nums[mid] == target) return mid;',
      '    else if (nums[mid] < target) lo = mid + 1;',
      '    else hi = mid - 1;',
      '}',
      'return -1;'
    ],
    steps: function(){
      var a = [1, 3, 5, 7, 9, 11, 13, 15], t = 9, lo = 0, hi = a.length - 1, out = [];
      function gone(){ var c = {}; a.forEach(function(_, i){ if (i < lo || i > hi) c[i] = 'gone'; }); return c; }
      while (lo <= hi){
        var mid = lo + Math.floor((hi - lo) / 2);
        var m = [{i: lo, label: 'lo', c: 'l'}, {i: mid, label: 'mid', c: 'a'}, {i: hi, label: 'hi', c: 'r'}];
        if (a[mid] === t){
          var c = gone(); c[mid] = 'on-hit';
          out.push({ panels: [arr(a, [{i: mid, label: 'found', c: 'hit'}], {cls: c})], line: 3, ok: true, vars: {lo: lo, mid: mid, hi: hi}, msg: '`nums[' + mid + '] = ' + a[mid] + '`. Found it at index **' + mid + '** after ' + (out.length + 1) + ' looks, not 8.' });
          break;
        }
        var less = a[mid] < t;
        out.push({ panels: [arr(a, m, {cls: gone()})], line: less ? 4 : 5, vars: {lo: lo, mid: mid, hi: hi},
          msg: '`mid = ' + lo + ' + (' + hi + ' - ' + lo + ') / 2 = ' + mid + '`, `nums[mid] = ' + a[mid] + '`. ' + (less ? 'Too small: 9 must be to the right. **lo = mid + 1**.' : 'Too big: 9 must be to the left. **hi = mid - 1**.') });
        if (less) lo = mid + 1; else hi = mid - 1;
      }
      return out;
    }
  },

  variants: [
    {
      id: 'classic', name: 'Classic: find exact value', short: 'Exact match',
      intro: 'Range is inclusive on both ends. Stop when the range is empty (`lo > hi`). Each branch moves past `mid` because `mid` was already checked.',
      start: 'int lo = 0, hi = n - 1;  while (lo <= hi)',
      panels: [arr([1, 3, 5, 7, 9, 11, 13, 15], [{i: 0, label: 'lo', c: 'l'}, {i: 3, label: 'mid', c: 'a'}, {i: 7, label: 'hi', c: 'r'}])],
      rules: [
        ['Use it when', 'Find a target in a sorted array; return its index or -1.'],
        ['Loop', '`while (lo <= hi)`: a 1-item range still needs checking.'],
        ['Moves', '`lo = mid + 1` or `hi = mid - 1`. Never `lo = mid` here (infinite loop).'],
        ['Mid', '`lo + (hi - lo) / 2` avoids int overflow of `(lo + hi) / 2`.']
      ],
      probs: '704 Binary Search, 374 Guess Number Higher or Lower, 74 Search a 2D Matrix, 69 Sqrt(x)',
      tabs: [
        { name: 'Exact search', code: J`int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}` },
        { name: 'Search 2D matrix', code: J`boolean searchMatrix(int[][] matrix, int target) {
    int m = matrix.length, n = matrix[0].length;
    int lo = 0, hi = m * n - 1;                 // treat as one long array
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int val = matrix[mid / n][mid % n];     // index -> row, col
        if (val == target) return true;
        else if (val < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}` },
        { name: 'Built-in', code: J`int builtIn(int[] nums, int target) {
    int i = Arrays.binarySearch(nums, target);
    // i >= 0: found at i.  i < 0: not found, insert position is -(i + 1)
    return i >= 0 ? i : -1;
}`, note: 'Handy for quick checks, but interviews usually want you to write the loop.' }
      ]
    },
    {
      id: 'firsttrue', name: 'First true (lower bound)', short: 'First true',
      intro: 'Find the first index where a test becomes true. Keep `mid` in the range when the test is true (it might be the answer). The loop ends when `lo == hi`, which is the answer.',
      start: 'int lo = 0, hi = n;  while (lo < hi)',
      panels: [arr(['F', 'F', 'F', 'T', 'T', 'T'], [{i: 3, label: 'answer', c: 'hit'}], {cls: {3: 'on-hit', 4: 'win', 5: 'win'}})],
      rules: [
        ['Use it when', 'Insert position, first / last occurrence, first bad version, smallest element ≥ x.'],
        ['Loop', '`while (lo < hi)`: stop when one candidate is left.'],
        ['Moves', ['Test true at mid: `hi = mid` (mid could be the first true)', 'Test false: `lo = mid + 1`']],
        ['Range', 'Use `hi = n` (not n - 1) if "no true at all" should return n, like insert position.'],
        ['Last true instead?', 'Find the first index where it becomes false, then subtract 1. Last occurrence of x = (first index > x) - 1.']
      ],
      probs: '35 Search Insert Position, 278 First Bad Version, 34 Find First and Last Position, 744 Find Smallest Letter Greater Than Target',
      tabs: [
        { name: 'Lower bound', code: J`int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;            // answer can be n
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] >= target) hi = mid;   // true: keep mid
        else lo = mid + 1;                   // false: go right
    }
    return lo;                               // first index with nums[i] >= target
}` },
        { name: 'First and last', code: J`int[] searchRange(int[] nums, int target) {
    int first = lowerBound(nums, target);
    if (first == nums.length || nums[first] != target) return new int[]{-1, -1};
    int last = lowerBound(nums, target + 1) - 1;   // first bigger, minus one
    return new int[]{first, last};
}

int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] >= target) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}` },
        { name: 'First bad version', code: J`int firstBadVersion(int n) {
    int lo = 1, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (isBadVersion(mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

boolean isBadVersion(int v) { return v >= 4; }   // given by the problem` }
      ]
    },
    {
      id: 'answer', name: 'Search on the answer', short: 'On the answer',
      intro: 'The array is not what you search. You search the **answer value** itself: speeds, capacities, days. Write `canDo(x)`. If x works, every bigger x works too, so find the first x that works.',
      start: 'int lo = smallest possible answer, hi = largest possible answer;',
      panels: [arr([1, 2, 3, 4, 5, 6, 7, 8], [{i: 3, label: 'first ok', c: 'hit'}], {name: 'speed k → canFinish?', cls: {0: 'gone', 1: 'gone', 2: 'gone', 3: 'on-hit', 4: 'win', 5: 'win', 6: 'win', 7: 'win'}})],
      rules: [
        ['Use it when', '"Minimum speed / capacity / largest minimum / smallest maximum such that…" and the input is too big to try every value.'],
        ['Range', '`lo` = smallest answer that could ever work, `hi` = one that surely works (often the max element or the sum).'],
        ['Helper', '`boolean canDo(int x)` runs a greedy O(n) check.'],
        ['Cost', 'O(n log(range)).']
      ],
      probs: '875 Koko Eating Bananas, 1011 Capacity To Ship Packages, 410 Split Array Largest Sum, 1482 Minimum Days to Make Bouquets',
      tabs: [
        { name: 'Koko bananas', code: J`int minEatingSpeed(int[] piles, int h) {
    int lo = 1, hi = 0;
    for (int p : piles) hi = Math.max(hi, p);   // max pile always works
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (canFinish(piles, mid, h)) hi = mid; // works: try slower
        else lo = mid + 1;                      // too slow
    }
    return lo;
}

boolean canFinish(int[] piles, int k, int h) {
    long hours = 0;
    for (int p : piles) hours += (p + k - 1) / k;  // ceil(p / k)
    return hours <= h;
}` },
        { name: 'Ship within D days', code: J`int shipWithinDays(int[] weights, int days) {
    int lo = 0, hi = 0;
    for (int w : weights) { lo = Math.max(lo, w); hi += w; }
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (daysNeeded(weights, mid) <= days) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int daysNeeded(int[] weights, int cap) {
    int d = 1, load = 0;
    for (int w : weights) {
        if (load + w > cap) { d++; load = 0; }   // start a new day
        load += w;
    }
    return d;
}` }
      ]
    },
    {
      id: 'rotated', name: 'Rotated sorted array', short: 'Rotated',
      intro: 'After rotation, one half around `mid` is always sorted. Check which half is sorted, then check whether the target lies inside it.',
      start: 'if (nums[lo] <= nums[mid])  // left half sorted',
      panels: [arr([4, 5, 6, 7, 0, 1, 2], [{i: 0, label: 'lo', c: 'l'}, {i: 3, label: 'mid', c: 'a'}, {i: 6, label: 'hi', c: 'r'}], {cls: {0: 'win', 1: 'win', 2: 'win', 3: 'win'}})],
      rules: [
        ['Use it when', 'Search in rotated sorted array, find minimum in rotated array.'],
        ['Decide', ['`nums[lo] <= nums[mid]`: left half `[lo..mid]` is sorted', 'Target inside it? `hi = mid - 1`. Else `lo = mid + 1`.', 'Otherwise the right half is sorted; mirror the logic']],
        ['Find minimum', 'Compare `nums[mid]` with `nums[hi]`: bigger means the drop is to the right.']
      ],
      probs: '33 Search in Rotated Sorted Array, 153 Find Minimum in Rotated Sorted Array, 162 Find Peak Element',
      tabs: [
        { name: 'Search rotated', code: J`int searchRotated(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {                       // left half sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                           // right half sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}` },
        { name: 'Find minimum', code: J`int findMin(int[] nums) {
    int lo = 0, hi = nums.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] > nums[hi]) lo = mid + 1;   // drop is to the right
        else hi = mid;                            // mid could be the min
    }
    return nums[lo];
}` },
        { name: 'Peak element', code: J`int findPeakElement(int[] nums) {
    int lo = 0, hi = nums.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < nums[mid + 1]) lo = mid + 1;   // going uphill
        else hi = mid;
    }
    return lo;
}` }
      ]
    }
  ],

  javaUsed: [
    ['int mid = lo + (hi - lo) / 2;', 'Middle index without overflow.', '`(lo + hi) / 2` can pass 2.1 billion when both are large.'],
    ['(p + k - 1) / k', 'Integer ceiling of p / k.', 'Or `(int) Math.ceil((double) p / k)`.'],
    ['Arrays.binarySearch(arr, x)', 'Built-in search on a sorted array.', 'Negative result means not found: insert point is `-(r + 1)`.'],
    ['Collections.binarySearch(list, x)', 'Same for a sorted List.', ''],
    ['mid / n, mid % n', 'Turn a flat index into row and column.', '2D matrix as one sorted array.'],
    ['long', 'Sums inside `canDo` can overflow int.', '`long hours = 0;`'],
    ['TreeMap.floorKey(x) / ceilingKey(x)', 'Largest key ≤ x / smallest key ≥ x.', 'Binary search on a sorted map, O(log n).']
  ],
  concepts: [
    { name: 'The two templates and when each ends', text: '`lo <= hi` with `mid ± 1` ends when the range is empty: good for exact match. `lo < hi` with `hi = mid` ends when one item is left: good for "first true". Do not mix their moves.' },
    { name: 'Why `lo = mid` can loop forever', text: 'With 2 items, `mid` equals `lo`. If the branch sets `lo = mid`, nothing changes. In "first true" always use `lo = mid + 1` and `hi = mid`, so mid rounds down safely.' },
    { name: 'Monotonic test = binary-searchable', text: 'Binary search does not need a sorted array. It needs a test that is false for a while, then true forever (or the reverse). "Can Koko finish at speed k?" is false for small k and true for big k.' },
    { name: 'Integer overflow in mid', text: 'Both `lo` and `hi` fit in int, but their sum might not.', code: J`int bad  = (lo + hi) / 2;        // may overflow
int good = lo + (hi - lo) / 2;   // safe
int alt  = (lo + hi) >>> 1;      // unsigned shift, also safe` }
  ],
  loops: [
    ['`while (lo <= hi)`', 'Range `[lo, hi]` not empty yet.', 'Exact match, rotated search'],
    ['`while (lo < hi)`', 'More than one candidate left.', 'First true, min in rotated, peak, search on answer']
  ],
  movesTitle: 'Pointer moves',
  moves: [
    ['`lo = mid + 1;`', 'Answer is strictly right of mid', 'Both templates'],
    ['`hi = mid - 1;`', 'Answer is strictly left of mid', 'Exact match only'],
    ['`hi = mid;`', 'Mid could still be the answer', 'First true'],
    ['`return lo;`', 'Where lo and hi met', 'First true'],
    ['`return -1;`', 'Range became empty: not found', 'Exact match']
  ],
  bugs: [
    ['Infinite loop', '`lo = mid` with `while (lo < hi)` never shrinks a 2-item range.', 'use `lo = mid + 1`.'],
    ['Mixing templates', '`while (lo < hi)` with `hi = mid - 1` skips answers.', 'match the loop condition with its moves.'],
    ['Overflow in mid', '`(lo + hi) / 2` with large values.', '`lo + (hi - lo) / 2`.'],
    ['Wrong hi for insert position', '`hi = n - 1` cannot return n.', 'start with `hi = n`.'],
    ['Wrong range on the answer', '`lo = 0` for speed makes `canDo` divide by zero.', 'start at the smallest valid value (1, or max weight).'],
    ['Overflow inside canDo', 'Adding many hours or loads.', 'use `long`.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-exact', title: 'Classic binary search', ask: 'Return the index of target, or -1.', code: J`int search(int[] nums, int target) {
    int lo = 0, hi = [[nums.length - 1]];
    while (lo [[<=]] hi) {
        int mid = [[lo + (hi - lo) / 2|(lo + hi) >>> 1]];
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) lo = [[mid + 1]];
        else hi = [[mid - 1]];
    }
    return -1;
}` },
      { id: 'fb-lower', title: 'Lower bound (search insert position)', ask: 'First index where `nums[i] >= target`.', code: J`int searchInsert(int[] nums, int target) {
    int lo = 0, hi = [[nums.length]];
    while (lo [[<]] hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] >= target) hi = [[mid]];
        else lo = [[mid + 1]];
    }
    return [[lo|hi]];
}` },
      { id: 'fb-koko', title: 'Koko eating bananas', ask: 'Smallest speed that finishes in h hours.', code: J`int minEatingSpeed(int[] piles, int h) {
    int lo = [[1]], hi = 0;
    for (int p : piles) hi = Math.max(hi, p);
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        long hours = 0;
        for (int p : piles) hours += [[(p + mid - 1) / mid]];
        if (hours <= h) [[hi = mid]];
        else [[lo = mid + 1]];
    }
    return lo;
}` }
    ],
    order: [
      { id: 'od-min', title: 'Find minimum in rotated sorted array',
        ideaSteps: ['Range is the whole array.', 'While more than one candidate is left, look at mid.', 'If mid is bigger than the last item, the drop (minimum) is to the right of mid.', 'Otherwise the minimum is at mid or to its left.', 'Return the item where they meet.'],
        lines: [
          'int lo = 0, hi = nums.length - 1;',
          'while (lo < hi) {',
          '    int mid = lo + (hi - lo) / 2;',
          '    if (nums[mid] > nums[hi]) lo = mid + 1;',
          '    else hi = mid;',
          '}',
          'return nums[lo];'
        ],
        extra: ['    else hi = mid - 1;', 'while (lo <= hi) {'],
        wrap: 'int findMin(int[] nums) {\n@@\n}' },
      { id: 'od-ship', title: 'Capacity to ship within D days',
        ideaSteps: ['Smallest capacity: the heaviest package. Largest: the sum of all.', 'Binary search the capacity.', 'Count days needed at capacity mid (greedy).', 'If it fits in the days, try smaller (`hi = mid`), else go bigger.', 'Return lo.'],
        lines: [
          'int lo = 0, hi = 0;',
          'for (int w : weights) { lo = Math.max(lo, w); hi += w; }',
          'while (lo < hi) {',
          '    int mid = lo + (hi - lo) / 2;',
          '    int d = 1, load = 0;',
          '    for (int w : weights) { if (load + w > mid) { d++; load = 0; } load += w; }',
          '    if (d <= days) hi = mid;',
          '    else lo = mid + 1;',
          '}',
          'return lo;'
        ],
        wrap: 'int shipWithinDays(int[] weights, int days) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['704', 'Binary Search'], ['35', 'Search Insert Position'], ['278', 'First Bad Version'], ['69', 'Sqrt(x)'], ['744', 'Find Smallest Letter Greater Than Target']],
    next: [['34', 'Find First and Last Position of Element'], ['74', 'Search a 2D Matrix'], ['153', 'Find Minimum in Rotated Sorted Array'], ['33', 'Search in Rotated Sorted Array'], ['162', 'Find Peak Element'], ['875', 'Koko Eating Bananas'], ['1011', 'Capacity To Ship Packages Within D Days'], ['410', 'Split Array Largest Sum']]
  }
});
})();
