(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'two-pointers', order: 1, title: 'Two pointers',
  oneLiner: 'Two index variables walk the array or string instead of a nested loop. Turns many O(n²) brute-force ideas into one O(n) pass.',
  legend: [['l', 'first pointer (left, slow, write, i, low)'], ['r', 'second pointer (right, fast, read, j, high)'], ['a', 'third pointer (mid, k, fixed i)']],
  clues: ['sorted array', 'find a pair / triplet', 'palindrome', 'reverse in place', 'remove / move items in place', 'O(1) extra space', 'merge two sorted', 'linked list cycle or middle'],
  idea: [
    'Brute force checks every pair with two nested loops. Two pointers keeps **two indexes** and moves only one of them each step, based on what you just saw.',
    'Every move throws away items that can never be part of the answer. That is why one pass is enough.',
    'Your whole job: decide **where each pointer starts**, **when to stop**, and **which one to move** in each case.'
  ],
  pick: [
    ['Sorted array, find a pair, palindrome, reverse', 'Opposite ends', '`left = 0, right = n - 1`'],
    ['Remove or move items in place, return new length', 'Read and write', '`write = 0`, `read` in a for loop'],
    ['Linked list: cycle, middle, nth from end', 'Fast and slow', '`slow = head, fast = head`'],
    ['Two arrays or strings: merge, compare, subsequence', 'Two sequences', '`i = 0, j = 0`'],
    ['Triplets (3Sum) or quadruplets', 'Fix one, then pair', '`i` loop, `left = i + 1, right = n - 1`'],
    ['Sort 0s, 1s, 2s; three groups', 'Three-way split', '`low = 0, mid = 0, high = n - 1`'],
    ['Merge into array with space at end; sorted squares', 'Fill from the back', '`k = last index`']
  ],
  fourQuestions: [
    ['Where do pointers start?', 'Gives your first line: `int left = 0, right = n - 1;`'],
    ['When should I stop?', 'Gives the loop: `while (left < right)`'],
    ['In each case, which pointer moves?', 'Gives the if / else with `left++` or `right--`. Every branch must move something.'],
    ['What do I return?', 'A pair, a count, a length, `true` / `false`, or the modified array.']
  ],

  demo: {
    title: 'Watch it work: find two numbers that add up to 10',
    sub: 'Sorted array, one pointer at each end. Press Next step and see which pointer moves and why.',
    code: [
      'int left = 0, right = arr.length - 1;',
      'while (left < right) {',
      '    int sum = arr[left] + arr[right];',
      '    if (sum == target) return new int[]{left, right};',
      '    else if (sum < target) left++;',
      '    else right--;',
      '}'
    ],
    steps: function(){
      var a = [1, 3, 4, 6, 8, 11], target = 10, L = 0, R = a.length - 1, out = [];
      function gone(L, R){ var c = {}; a.forEach(function(_, i){ if (i < L || i > R) c[i] = 'gone'; }); return c; }
      while (L < R){
        var s = a[L] + a[R];
        var base = '`arr[' + L + '] + arr[' + R + '] = ' + a[L] + ' + ' + a[R] + ' = ' + s + '`. ';
        if (s === target){
          var c = gone(L, R); c[L] = 'on-hit'; c[R] = 'on-hit';
          out.push({ panels: [arr(a, [{i: L, label: 'L', c: 'hit'}, {i: R, label: 'R', c: 'hit'}], {cls: c})], line: 3, ok: true, vars: {left: L, right: R, sum: s},
            msg: base + 'Equals the target. Return **[' + L + ', ' + R + ']**. Faded boxes were ruled out without checking every pair.' });
          break;
        }
        var lt = s < target;
        out.push({ panels: [arr(a, [{i: L, label: 'L →', c: 'l'}, {i: R, label: '← R', c: 'r'}], {cls: gone(L, R)})], line: lt ? 4 : 5, vars: {left: L, right: R, sum: s},
          msg: base + (lt ? 'Less than ' + target + ', need a bigger number. Bigger numbers are on the right, so **left++**.'
                          : 'More than ' + target + ', need a smaller number. Smaller numbers are on the left, so **right--**.') });
        if (lt) L++; else R--;
      }
      return out;
    }
  },

  variants: [
    {
      id: 'opposite', name: 'Opposite ends', intro: 'One pointer at the start, one at the end. They walk toward each other and stop when they meet. Works because the array is sorted (or because you compare mirror positions).',
      start: 'int left = 0, right = arr.length - 1;',
      panels: [arr([1, 3, 4, 6, 8, 11], [{i: 0, label: 'L →', c: 'l'}, {i: 5, label: '← R', c: 'r'}])],
      rules: [
        ['Use it when', 'Sorted array + pair sum, reverse, palindrome, container with most water.'],
        ['Loop', '`while (left < right)` because you need two different items.'],
        ['How to move', ['Sum too small: `left++` (bigger values are on the right)', 'Sum too big: `right--` (smaller values are on the left)', 'Match or swap done: `left++; right--;`', 'Container problems: move the side with the smaller height']],
        ['Cost', 'O(n) time, O(1) space.']
      ],
      probs: '167 Two Sum II, 125 Valid Palindrome, 344 Reverse String, 11 Container With Most Water, 680 Valid Palindrome II',
      tabs: [
        { name: 'Pair sum', code: J`int[] twoSum(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) {
            return new int[]{left, right};
        } else if (sum < target) {
            left++;          // need a bigger sum
        } else {
            right--;         // need a smaller sum
        }
    }
    return new int[]{-1, -1};   // not found
}` },
        { name: 'Palindrome', code: J`boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        char a = s.charAt(left);
        char b = s.charAt(right);
        if (!Character.isLetterOrDigit(a)) { left++;  continue; }
        if (!Character.isLetterOrDigit(b)) { right--; continue; }
        if (Character.toLowerCase(a) != Character.toLowerCase(b)) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}`, note: '`continue` jumps back to the `while` check after moving just one pointer.' },
        { name: 'Reverse', code: J`void reverse(char[] s) {
    int left = 0, right = s.length - 1;
    while (left < right) {
        char temp = s[left];     // swap in 3 lines
        s[left] = s[right];
        s[right] = temp;
        left++;
        right--;
    }
}` },
        { name: 'Most water', code: J`int maxArea(int[] height) {
    int left = 0, right = height.length - 1;
    int best = 0;
    while (left < right) {
        int h = Math.min(height[left], height[right]);
        int width = right - left;
        best = Math.max(best, h * width);
        if (height[left] < height[right]) left++;   // move the shorter wall
        else right--;
    }
    return best;
}` }
      ]
    },
    {
      id: 'readwrite', name: 'Read and write (same direction)', short: 'Read and write',
      intro: 'Both pointers go left to right. `read` looks at every item. `write` marks where the next item you keep should go. Everything before `write` is the answer.',
      start: 'int write = 0;  for (int read = 0; read < n; read++)',
      panels: [arr([1, 2, 2, 2, 3, 3], [{i: 2, label: 'write', c: 'l'}, {i: 4, label: 'read →', c: 'r'}])],
      rules: [
        ['Use it when', '"In place", "O(1) extra space", "return the new length", move zeroes, remove duplicates.'],
        ['Loop', 'A normal `for` loop on `read`. It moves every time by itself.'],
        ['How to move', ['`read`: every step (the for loop does it)', '`write`: only when you keep an item: `nums[write] = nums[read]; write++;`']],
        ['Return', '`write` is the new length.']
      ],
      probs: '26 Remove Duplicates, 27 Remove Element, 283 Move Zeroes, 80 Remove Duplicates II',
      tabs: [
        { name: 'Remove element', code: J`int removeElement(int[] nums, int val) {
    int write = 0;
    for (int read = 0; read < nums.length; read++) {
        if (nums[read] != val) {      // keep it
            nums[write] = nums[read];
            write++;
        }
    }
    return write;                      // new length
}` },
        { name: 'Remove duplicates', code: J`int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;
    int write = 1;                     // nums[0] is always kept
    for (int read = 1; read < nums.length; read++) {
        if (nums[read] != nums[write - 1]) {   // new value
            nums[write] = nums[read];
            write++;
        }
    }
    return write;
}` },
        { name: 'Move zeroes', code: J`void moveZeroes(int[] nums) {
    int write = 0;
    for (int read = 0; read < nums.length; read++) {
        if (nums[read] != 0) {
            int temp = nums[write];    // swap keeps the zeros behind
            nums[write] = nums[read];
            nums[read] = temp;
            write++;
        }
    }
}` }
      ]
    },
    {
      id: 'fastslow', name: 'Fast and slow (linked lists)', short: 'Fast and slow',
      intro: 'Both start at the head. `slow` moves one node, `fast` moves two. If there is a loop, fast catches slow. When fast reaches the end, slow is in the middle.',
      start: 'ListNode slow = head, fast = head;',
      panels: [{ type: 'list', vals: [1, 2, 3, 4, 5, 'null'], marks: [{i: 1, label: 'slow +1', c: 'l'}, {i: 2, label: 'fast +2', c: 'r'}] }],
      rules: [
        ['Use it when', 'Cycle detection, middle of list, nth node from end, palindrome linked list, happy number.'],
        ['Loop', '`while (fast != null && fast.next != null)`. Fast jumps two, so both must exist. Check `fast` first.'],
        ['How to move', ['`slow = slow.next;`', '`fast = fast.next.next;`', 'Nth from end: move `fast` ahead n steps first, then move both by one']],
        ['Compare nodes', 'Use `slow == fast` (same node object), not the values.']
      ],
      probs: '141 Linked List Cycle, 876 Middle of the Linked List, 19 Remove Nth Node From End, 142 Linked List Cycle II, 234 Palindrome Linked List',
      tabs: [
        { name: 'Has cycle', code: J`boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;           // 1 step
        fast = fast.next.next;      // 2 steps
        if (slow == fast) return true;
    }
    return false;                   // fast fell off the end
}` },
        { name: 'Middle', code: J`ListNode middleNode(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;     // for even length, this is the 2nd middle
}` },
        { name: 'Nth from end', code: J`ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head);   // handles removing head
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i <= n; i++) {            // make a gap of n + 1
        fast = fast.next;
    }
    while (fast != null) {
        fast = fast.next;
        slow = slow.next;
    }
    slow.next = slow.next.next;                // skip the target
    return dummy.next;
}` }
      ]
    },
    {
      id: 'twoseq', name: 'Two sequences', intro: 'One pointer per array or string. Compare the two current items, then move the pointer whose item you just used.',
      start: 'int i = 0, j = 0;',
      panels: [arr([1, 4, 7], [{i: 0, label: 'i →', c: 'l'}], {name: 'a', ix: false}), arr([2, 3, 5, 8], [{i: 0, label: 'j →', c: 'r'}], {name: 'b', ix: false})],
      rules: [
        ['Use it when', 'Merge two sorted lists, is-subsequence, intersection of sorted arrays, compare version strings.'],
        ['Loop', '`while (i < a.length && j < b.length)`. Stops when either runs out.'],
        ['How to move', ['Took from `a`: `i++`. Took from `b`: `j++`.', 'Equal and you need both: `i++; j++;`', 'After the loop, copy leftovers with two small `while` loops']],
        ['Shortcut', '`res[k++] = a[i++];` means: use the current index, then add 1 to it.']
      ],
      probs: '392 Is Subsequence, 21 Merge Two Sorted Lists, 349 / 350 Intersection of Arrays, 844 Backspace String Compare',
      tabs: [
        { name: 'Merge sorted', code: J`int[] merge(int[] a, int[] b) {
    int[] res = new int[a.length + b.length];
    int i = 0, j = 0, k = 0;
    while (i < a.length && j < b.length) {
        if (a[i] <= b[j]) res[k++] = a[i++];
        else              res[k++] = b[j++];
    }
    while (i < a.length) res[k++] = a[i++];   // leftovers of a
    while (j < b.length) res[k++] = b[j++];   // leftovers of b
    return res;
}` },
        { name: 'Is subsequence', code: J`boolean isSubsequence(String s, String t) {
    int i = 0, j = 0;
    while (i < s.length() && j < t.length()) {
        if (s.charAt(i) == t.charAt(j)) {
            i++;            // matched, move to next char of s
        }
        j++;                // t always moves
    }
    return i == s.length();  // matched every char of s?
}` }
      ]
    },
    {
      id: 'fixone', name: 'Fix one, then pair', intro: 'Sort first. A `for` loop fixes one number, then run opposite ends on the rest to find the other two. This turns 3Sum from O(n³) into O(n²).',
      start: 'Arrays.sort(nums);  left = i + 1, right = n - 1',
      panels: [arr([-4, -1, -1, 0, 1, 2], [{i: 1, label: 'i fixed', c: 'a'}, {i: 2, label: 'L →', c: 'l'}, {i: 5, label: '← R', c: 'r'}])],
      rules: [
        ['Use it when', '3Sum, 3Sum closest, 4Sum, count triplets with a condition.'],
        ['Loop', 'Outer `for (int i = 0; i < n - 2; i++)`, inner `while (left < right)`.'],
        ['Skip duplicates', ['For `i`: `if (i > 0 && nums[i] == nums[i - 1]) continue;`', 'After a match, skip equal neighbours of `left` and `right`, and keep `left < right` inside those loops']],
        ['4Sum', 'Two outer loops, then the same pair search. Use `long` for the sum.']
      ],
      probs: '15 3Sum, 16 3Sum Closest, 18 4Sum, 259 3Sum Smaller',
      tabs: [
        { name: '3Sum', code: J`List<List<Integer>> threeSum(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    Arrays.sort(nums);                                   // must sort
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;   // skip same i
        int left = i + 1, right = nums.length - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum == 0) {
                res.add(Arrays.asList(nums[i], nums[left], nums[right]));
                while (left < right && nums[left] == nums[left + 1]) left++;
                while (left < right && nums[right] == nums[right - 1]) right--;
                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return res;
}` },
        { name: '3Sum closest', code: J`int threeSumClosest(int[] nums, int target) {
    Arrays.sort(nums);
    int best = nums[0] + nums[1] + nums[2];
    for (int i = 0; i < nums.length - 2; i++) {
        int left = i + 1, right = nums.length - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (Math.abs(sum - target) < Math.abs(best - target)) {
                best = sum;
            }
            if (sum < target) left++;
            else if (sum > target) right--;
            else return sum;          // exact match
        }
    }
    return best;
}` }
      ]
    },
    {
      id: 'threeway', name: 'Three-way split (Dutch flag)', short: 'Three-way split',
      intro: 'Three pointers make three zones: 0s before `low`, 1s between `low` and `mid`, 2s after `high`. `mid` scans the unknown middle part.',
      start: 'int low = 0, mid = 0, high = nums.length - 1;',
      panels: [arr([2, 0, 2, 1, 1, 0], [{i: 0, label: 'low', c: 'l'}, {i: 0, label: 'mid →', c: 'a'}, {i: 5, label: '← high', c: 'r'}])],
      rules: [
        ['Use it when', 'Sort colors (0, 1, 2), partition around a pivot, put negatives / zeros / positives into groups.'],
        ['Loop', '`while (mid <= high)`. Uses `<=` because the item at `high` is not checked yet.'],
        ['How to move', ['Got 0: swap(low, mid), `low++`, `mid++`', 'Got 1: `mid++`', 'Got 2: swap(mid, high), `high--` only. Don\'t move `mid`: the value swapped in is still unchecked.']]
      ],
      probs: '75 Sort Colors, 905 Sort Array By Parity, 2161 Partition Array by Pivot',
      tabs: [
        { name: 'Sort colors', code: J`void sortColors(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;
    while (mid <= high) {
        if (nums[mid] == 0) {
            swap(nums, low, mid);
            low++;
            mid++;
        } else if (nums[mid] == 1) {
            mid++;
        } else {                    // nums[mid] == 2
            swap(nums, mid, high);
            high--;                 // mid stays: recheck new value
        }
    }
}

void swap(int[] a, int i, int j) {
    int t = a[i]; a[i] = a[j]; a[j] = t;
}` }
      ]
    },
    {
      id: 'back', name: 'Fill from the back', intro: 'When the biggest answer is easiest to find, write the result from the last index backwards. Nothing gets overwritten before it is read.',
      start: 'int i = m - 1, j = n - 1, k = m + n - 1;',
      panels: [arr([1, 2, 3, 0, 0, 0], [{i: 2, label: '← i', c: 'l'}, {i: 5, label: '← k', c: 'a'}], {name: 'nums1'}), arr([2, 5, 6], [{i: 2, label: '← j', c: 'r'}], {name: 'nums2'})],
      rules: [
        ['Use it when', 'Merge into an array with free space at the end, squares of a sorted array (with negatives), add strings / binary numbers.'],
        ['Loop', 'Counting down: `while (j >= 0)` or `for (int k = n - 1; k >= 0; k--)`.'],
        ['How to move', ['Put the bigger item at `k`, then move that pointer and `k` down', '`nums1[k--] = nums1[i--];` writes, then moves both left']]
      ],
      probs: '88 Merge Sorted Array, 977 Squares of a Sorted Array, 415 Add Strings, 67 Add Binary',
      tabs: [
        { name: 'Merge in place', code: J`void merge(int[] nums1, int m, int[] nums2, int n) {
    int i = m - 1, j = n - 1, k = m + n - 1;
    while (j >= 0) {                 // done when nums2 is used up
        if (i >= 0 && nums1[i] > nums2[j]) {
            nums1[k--] = nums1[i--];
        } else {
            nums1[k--] = nums2[j--];
        }
    }
}` },
        { name: 'Sorted squares', code: J`int[] sortedSquares(int[] nums) {
    int n = nums.length;
    int[] res = new int[n];
    int left = 0, right = n - 1;
    for (int k = n - 1; k >= 0; k--) {     // biggest square first
        if (Math.abs(nums[left]) > Math.abs(nums[right])) {
            res[k] = nums[left] * nums[left];
            left++;
        } else {
            res[k] = nums[right] * nums[right];
            right--;
        }
    }
    return res;
}` }
      ]
    }
  ],

  javaUsed: [
    ['s.charAt(i)', 'The char at index i of a String.', 'Strings are read-only. To swap chars, convert with `s.toCharArray()` first.'],
    ['s.length() / arr.length', 'String length has brackets. Array length has none.', 'Lists use `list.size()`.'],
    ['Character.isLetterOrDigit(c)', 'True for a-z, A-Z, 0-9.', 'Skip spaces and symbols in palindrome checks.'],
    ['Character.toLowerCase(c)', 'Lowercase a char.', 'Compare ignoring case.'],
    ['Arrays.sort(nums)', 'Sorts an int[] in place, ascending.', 'Required before opposite-ends pair sum and 3Sum.'],
    ['Arrays.asList(a, b, c)', 'Makes a List from values.', 'Add a triplet to the result list.'],
    ['new int[]{left, right}', 'Array literal.', 'Return two indices at once.'],
    ['Math.abs(x), Math.max, Math.min', 'Distance, best so far, shorter side.', 'Closest sum, container area.'],
    ['new String(chars)', 'char[] back to String.', 'After swapping in a char array.']
  ],
  concepts: [
    { name: 'Why sorting makes "move left or right" safe', text: 'In a sorted array, moving `left` right can only make the sum bigger and moving `right` left can only make it smaller. So when the sum is too small, every pair using the current `left` is too small too, and you can drop it.' },
    { name: 'i++ vs ++i inside an expression', text: 'On its own line they do the same thing. Inside an expression `a[i++]` uses the old `i` then adds 1. `a[++i]` adds 1 first.', code: J`int i = 0;
res[k++] = a[i++];   // same as: res[k] = a[i]; k++; i++;` },
    { name: 'continue vs break', text: '`continue` skips the rest of this loop round and goes back to the condition. `break` leaves the loop. Palindrome skipping uses `continue` so the `left < right` check runs again.' },
    { name: 'Swap needs a temp variable', text: 'Java has no built-in swap for array items. Write the three lines, or a small helper.', code: J`int temp = a[i];
a[i] = a[j];
a[j] = temp;` }
  ],
  loopsIntro: 'Ask: "Do the pointers need two different items, or can they look at the same one?"',
  loops: [
    ['`while (left < right)`', 'Need two different items. Stops when they meet.', 'Pair sum, palindrome, reverse, 3Sum inner loop'],
    ['`while (left <= right)`', 'The last single item still needs checking.', 'Dutch flag (`mid <= high`), binary search'],
    ['`for (int read = 0; read < n; read++)`', 'Visit every item exactly once.', 'Read and write'],
    ['`while (fast != null && fast.next != null)`', 'Safe to jump two nodes. Check `fast` first.', 'Fast and slow'],
    ['`while (i < a.length && j < b.length)`', 'Stop when either side runs out, then handle leftovers.', 'Two sequences'],
    ['`while (j >= 0)`', 'Counting down to index 0.', 'Fill from the back'],
    ['`for (int i = 0; i < n - 2; i++)`', 'Leave room for two more items after `i`.', '3Sum outer loop']
  ],
  movesTitle: 'Pointer moves',
  movesIntro: 'Every branch of your if / else must move at least one pointer. If a branch moves nothing, the loop runs forever.',
  moves: [
    ['`left++;`', 'Move left pointer one step right', 'Need a bigger value, or skip a bad char'],
    ['`right--;`', 'Move right pointer one step left', 'Need a smaller value'],
    ['`left++; right--;`', 'Both move inward', 'After a match or a swap'],
    ['`res[k++] = a[i++];`', 'Use current `k` and `i`, then add 1 to both', 'Merging'],
    ['`nums1[k--] = nums2[j--];`', 'Use current indices, then subtract 1', 'Filling from the back'],
    ['`slow = slow.next; fast = fast.next.next;`', 'One step and two steps in a linked list', 'Cycle, middle'],
    ['`while (left < right && nums[left] == nums[left + 1]) left++;`', 'Jump over repeated values', '3Sum, avoiding duplicate answers']
  ],
  bugs: [
    ['Infinite loop', 'One branch of the if / else does not move any pointer.', 'every branch ends with `left++`, `right--`, or both.'],
    ['Forgot to sort', 'Opposite ends for pair sums only works on a sorted array.', '`Arrays.sort(nums)`. If you must return original indices, use a HashMap instead.'],
    ['Index out of bounds while skipping', '`nums[left + 1]` crashes at the end of the array.', 'always keep `left < right &&` first in the skip loop.'],
    ['NullPointerException in lists', '`fast.next.next` when `fast.next` is null.', '`fast != null && fast.next != null`, in that order.'],
    ['Integer overflow', 'Adding 3 or 4 big ints goes past about 2.1 billion.', '`long sum = (long) a + b + c + d;`'],
    ['Moving mid after swapping with high', 'The value that came from `high` has not been checked.', 'only `high--` in that branch.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-pair', title: 'Pair sum in a sorted array', ask: 'Return the indexes of two numbers that add to `target`.', code: J`int[] twoSum(int[] arr, int target) {
    int left = [[0]], right = [[arr.length - 1]];
    while ([[left < right]]) {
        int sum = arr[left] + arr[right];
        if (sum == target) return new int[]{left, right};
        else if (sum < target) [[left++|left += 1|++left]];
        else [[right--|right -= 1|--right]];
    }
    return new int[]{-1, -1};
}` },
      { id: 'fb-rw', title: 'Remove element in place', ask: 'Keep every value that is not `val`. Return the new length.', code: J`int removeElement(int[] nums, int val) {
    int write = 0;
    for (int read = 0; read < [[nums.length]]; read++) {
        if (nums[read] [[!=]] val) {
            nums[ [[write]] ] = nums[read];
            [[write++|write += 1|++write]];
        }
    }
    return [[write]];
}` },
      { id: 'fb-cycle', title: 'Linked list has a cycle', ask: 'Slow moves 1, fast moves 2. If they meet, there is a cycle.', code: J`boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && [[fast.next != null]]) {
        slow = [[slow.next]];
        fast = [[fast.next.next]];
        if ([[slow == fast]]) return true;
    }
    return false;
}` },
      { id: 'fb-dutch', title: 'Sort colors (Dutch flag)', ask: 'Put 0s, then 1s, then 2s in one pass.', code: J`void sortColors(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;
    while (mid [[<=]] high) {
        if (nums[mid] == 0) { swap(nums, low, mid); low++; [[mid++|mid += 1|++mid]]; }
        else if (nums[mid] == 1) { mid++; }
        else { swap(nums, mid, [[high]]); [[high--|high -= 1|--high]]; }
    }
}` }
    ],
    order: [
      { id: 'od-pal', title: 'Valid palindrome (letters and digits only)',
        ideaSteps: ['Put one pointer at each end.', 'While they have not met:', 'If left char is not a letter/digit, move left and re-check.', 'Same for the right char.', 'If the lowercase chars differ, it is not a palindrome.', 'Otherwise move both inward.', 'If the loop ends, it is a palindrome.'],
        lines: [
          'int left = 0, right = s.length() - 1;',
          'while (left < right) {',
          '    if (!Character.isLetterOrDigit(s.charAt(left))) { left++; continue; }',
          '    if (!Character.isLetterOrDigit(s.charAt(right))) { right--; continue; }',
          '    if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) return false;',
          '    left++; right--;',
          '}',
          'return true;'
        ],
        extra: ['while (left <= right + 1) {'],
        wrap: 'boolean isPalindrome(String s) {\n@@\n}' },
      { id: 'od-3sum', title: '3Sum: fix one, then pair',
        ideaSteps: ['Sort the array.', 'Fix index `i`; skip it if it equals the previous value.', 'Run opposite ends on the part after `i`.', 'On a zero sum, save the triplet and move both pointers.', 'Too small: move left. Too big: move right.'],
        lines: [
          'Arrays.sort(nums);',
          'for (int i = 0; i < nums.length - 2; i++) {',
          '    if (i > 0 && nums[i] == nums[i - 1]) continue;',
          '    int left = i + 1, right = nums.length - 1;',
          '    while (left < right) {',
          '        int sum = nums[i] + nums[left] + nums[right];',
          '        if (sum == 0) { res.add(Arrays.asList(nums[i], nums[left], nums[right])); left++; right--; }',
          '        else if (sum < 0) left++;',
          '        else right--;',
          '    }',
          '}'
        ],
        wrap: 'List<List<Integer>> threeSum(int[] nums) {\nList<List<Integer>> res = new ArrayList<>();\n@@\nreturn res;\n}' }
    ]
  },
  practice: {
    easy: [['344', 'Reverse String'], ['125', 'Valid Palindrome'], ['167', 'Two Sum II'], ['27', 'Remove Element'], ['26', 'Remove Duplicates from Sorted Array'], ['283', 'Move Zeroes'], ['876', 'Middle of the Linked List'], ['141', 'Linked List Cycle'], ['392', 'Is Subsequence'], ['88', 'Merge Sorted Array'], ['977', 'Squares of a Sorted Array']],
    next: [['11', 'Container With Most Water'], ['680', 'Valid Palindrome II'], ['15', '3Sum'], ['16', '3Sum Closest'], ['75', 'Sort Colors'], ['19', 'Remove Nth Node From End of List'], ['142', 'Linked List Cycle II'], ['80', 'Remove Duplicates II'], ['844', 'Backspace String Compare'], ['42', 'Trapping Rain Water']]
  }
});
})();
