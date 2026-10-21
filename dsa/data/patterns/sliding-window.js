(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
function winCls(n, L, R){ var c = {}; for (var i = 0; i < n; i++) if (i >= L && i <= R) c[i] = 'win'; return c; }

registerPattern({
  slug: 'sliding-window', order: 2, title: 'Sliding window',
  oneLiner: 'A window `[left, right]` slides over an array or string. Add the item that enters on the right, remove the item that leaves on the left, and never recompute the whole window.',
  legend: [['l', 'left edge (shrinks the window)'], ['r', 'right edge (grows the window)']],
  clues: ['subarray / substring', 'contiguous', 'longest / shortest / max / min window', 'at most K distinct', 'window of size k', 'anagram / permutation in string', 'without repeating characters'],
  idea: [
    'Brute force tries every start and every end: O(n²) windows, each summed again. A sliding window reuses work: when the window moves, only **one item enters** and **one item leaves**.',
    '`right` always moves forward in a for loop. `left` only moves forward when the window breaks a rule. Each index enters once and leaves once, so the whole thing is O(n).',
    'Keep a running state for the window: a `sum`, an `int[26]` count, or a `HashMap`. Update it on enter, undo it on leave.'
  ],
  pick: [
    ['Window has a fixed size k', 'Fixed window', '`for right`, remove `nums[right - k]` once `right >= k`'],
    ['Longest window that stays valid', 'Grow, then shrink while invalid', 'Update the answer **after** the while loop'],
    ['Shortest window that is valid', 'Grow, then shrink while valid', 'Update the answer **inside** the while loop'],
    ['Count letters, anagram, permutation', 'Counting window', '`int[] count = new int[26];`']
  ],
  fourQuestions: [
    ['What is the window state?', 'A `sum`, a count array, or a map. Declare it before the loop: `int sum = 0;`'],
    ['What happens when right enters?', 'One line inside `for (int right = 0; right < n; right++)`: `sum += nums[right];`'],
    ['When is the window broken, and how does left leave?', '`while (broken) { sum -= nums[left]; left++; }` Undo exactly what enter did.'],
    ['Where do I record the answer?', 'Longest: after the while. Shortest: inside the while. Size of window = `right - left + 1`.']
  ],

  demo: {
    title: 'Shortest subarray with sum ≥ 7',
    sub: 'Array `[2, 3, 1, 2, 4, 3]`. Grow with `right`. While the sum is big enough, record the length and shrink from `left`.',
    code: [
      'int left = 0, sum = 0, best = Integer.MAX_VALUE;',
      'for (int right = 0; right < n; right++) {',
      '    sum += nums[right];                 // enter',
      '    while (sum >= target) {',
      '        best = Math.min(best, right - left + 1);',
      '        sum -= nums[left];              // leave',
      '        left++;',
      '    }',
      '}'
    ],
    steps: function(){
      var a = [2, 3, 1, 2, 4, 3], t = 7, L = 0, sum = 0, best = Infinity, out = [];
      function snap(R, line, msg, ok){
        var marks = [{i: L, label: 'L', c: 'l'}]; if (R >= 0) marks.push({i: R, label: 'R', c: 'r'});
        out.push({ panels: [arr(a, marks, {cls: winCls(a.length, L, R)})], line: line, ok: ok, msg: msg,
          vars: {left: L, right: R, sum: sum, best: best === Infinity ? '∞' : best} });
      }
      for (var R = 0; R < a.length; R++){
        sum += a[R];
        snap(R, 2, '`nums[' + R + '] = ' + a[R] + '` enters. Window sum is now ' + sum + (sum >= t ? ', which is ≥ 7. Valid window.' : ', still less than 7. Keep growing.'));
        while (sum >= t){
          best = Math.min(best, R - L + 1);
          snap(R, 4, 'Valid, so record its length `' + (R - L + 1) + '`. Best so far: ' + best + '. Now try to make it shorter.', true);
          sum -= a[L]; L++;
          snap(R, [5, 6], '`nums[' + (L - 1) + '] = ' + a[L - 1] + '` leaves, `left++`. Sum is ' + sum + '.');
        }
      }
      out.push({ panels: [arr(a, [], {})], line: 8, ok: true, vars: {best: best}, msg: 'Done. Every index entered once and left at most once. Answer: **' + best + '** (the window `[4, 3]`).' });
      return out;
    }
  },

  variants: [
    {
      id: 'fixed', name: 'Fixed-size window', intro: 'The window always holds exactly `k` items. Each step: add the new right item, remove the item that fell off the left (`right - k`).',
      start: 'int sum = 0;  for (int right = 0; right < n; right++)',
      panels: [arr([1, 12, -5, -6, 50, 3], [{i: 1, label: 'right - k', c: 'l'}, {i: 4, label: 'right', c: 'r'}], {cls: winCls(6, 2, 4)})],
      rules: [
        ['Use it when', 'The problem gives you `k`: max sum of size k, average of each window, count windows that match.'],
        ['Enter', '`sum += nums[right];`'],
        ['Leave', 'Once `right >= k`: `sum -= nums[right - k];`'],
        ['Record', 'Once `right >= k - 1` the window is full: compare `sum` with the best.'],
        ['Cost', 'O(n) time, O(1) space.']
      ],
      probs: '643 Maximum Average Subarray I, 1456 Max Vowels in a Substring, 2090 K Radius Averages, 438 Find All Anagrams',
      tabs: [
        { name: 'Max sum of size k', code: J`int maxSumK(int[] nums, int k) {
    int sum = 0, best = Integer.MIN_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];                  // enter
        if (right >= k) sum -= nums[right - k];   // leave
        if (right >= k - 1) best = Math.max(best, sum);   // full window
    }
    return best;
}` },
        { name: 'Max vowels in k', code: J`int maxVowels(String s, int k) {
    int count = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        if (isVowel(s.charAt(right))) count++;
        if (right >= k && isVowel(s.charAt(right - k))) count--;
        best = Math.max(best, count);
    }
    return best;
}

boolean isVowel(char c) {
    return "aeiou".indexOf(c) >= 0;
}`, note: '`"aeiou".indexOf(c)` returns -1 when `c` is not in the string. Quick membership check for a few chars.' }
      ]
    },
    {
      id: 'longest', name: 'Variable window: longest valid', short: 'Longest valid',
      intro: 'Grow `right` every step. When the window breaks the rule, shrink from `left` until it is valid again. Then the window is valid, so record its size.',
      start: 'int left = 0;  for (int right = 0; right < n; right++) { ...; while (invalid) left++; best = max(...) }',
      panels: [arr(['a', 'b', 'c', 'a', 'b', 'c', 'b', 'b'], [{i: 1, label: 'L', c: 'l'}, {i: 3, label: 'R', c: 'r'}], {cls: winCls(8, 1, 3)})],
      rules: [
        ['Use it when', '"Longest substring / subarray such that…": no repeats, at most K distinct, at most K flips.'],
        ['Shape', ['`for` on `right`: add `right` to the state', '`while (window invalid)`: remove `left` from the state, `left++`', 'After the while: `best = Math.max(best, right - left + 1);`']],
        ['Why while, not if', 'One new item can need several items to leave before the window is valid again.'],
        ['Cost', 'O(n): `left` and `right` each move at most n times.']
      ],
      probs: '3 Longest Substring Without Repeating Characters, 1004 Max Consecutive Ones III, 904 Fruit Into Baskets, 424 Longest Repeating Character Replacement',
      tabs: [
        { name: 'No repeating chars', code: J`int lengthOfLongestSubstring(String s) {
    Set<Character> window = new HashSet<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        while (window.contains(c)) {          // c would repeat
            window.remove(s.charAt(left));
            left++;
        }
        window.add(c);
        best = Math.max(best, right - left + 1);
    }
    return best;
}` },
        { name: 'At most K zeros flipped', code: J`int longestOnes(int[] nums, int k) {
    int left = 0, zeros = 0, best = 0;
    for (int right = 0; right < nums.length; right++) {
        if (nums[right] == 0) zeros++;
        while (zeros > k) {                   // too many flips
            if (nums[left] == 0) zeros--;
            left++;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}` },
        { name: 'At most 2 kinds (map)', code: J`int totalFruit(int[] fruits) {
    Map<Integer, Integer> count = new HashMap<>();
    int left = 0, best = 0;
    for (int right = 0; right < fruits.length; right++) {
        count.merge(fruits[right], 1, Integer::sum);       // +1
        while (count.size() > 2) {
            int f = fruits[left];
            count.put(f, count.get(f) - 1);
            if (count.get(f) == 0) count.remove(f);       // keep size() honest
            left++;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}`, note: 'Remove a key when its count hits 0, otherwise `count.size()` still counts it.' }
      ]
    },
    {
      id: 'shortest', name: 'Variable window: shortest valid', short: 'Shortest valid',
      intro: 'Grow `right` until the window becomes valid. Then, while it stays valid, record the size and shrink from `left` to look for a shorter one.',
      start: 'while (valid) { best = min(best, right - left + 1); remove left; left++; }',
      panels: [arr([2, 3, 1, 2, 4, 3], [{i: 3, label: 'L', c: 'l'}, {i: 5, label: 'R', c: 'r'}], {cls: winCls(6, 3, 5)})],
      rules: [
        ['Use it when', '"Minimum length / smallest window such that…": sum at least target, contains all chars of t.'],
        ['Key difference', 'Record the answer **inside** the while loop, before you shrink.'],
        ['No answer', 'Start `best` at `Integer.MAX_VALUE` and return 0 or "" if it never changed.']
      ],
      probs: '209 Minimum Size Subarray Sum, 76 Minimum Window Substring, 1234 Replace the Substring for Balanced String',
      tabs: [
        { name: 'Min size sum ≥ target', code: J`int minSubArrayLen(int target, int[] nums) {
    int left = 0, sum = 0, best = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {               // valid: try shorter
            best = Math.min(best, right - left + 1);
            sum -= nums[left];
            left++;
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}` },
        { name: 'Minimum window substring', code: J`String minWindow(String s, String t) {
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    int missing = t.length();          // chars of t still not covered
    int left = 0, bestLen = Integer.MAX_VALUE, bestStart = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (need[c] > 0) missing--;     // this char was useful
        need[c]--;
        while (missing == 0) {          // window covers all of t
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s.charAt(left);
            need[out]++;
            if (need[out] > 0) missing++;   // we just lost a needed char
            left++;
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
}`, note: '`int[128]` indexed by the char itself covers all ASCII. `s.substring(a, b)` takes `a` up to but not including `b`.' }
      ]
    },
    {
      id: 'counting', name: 'Counting window (anagrams)', short: 'Counting window',
      intro: 'Track how many of each letter are in the window with `int[26]`. Compare with the target counts. Window size is fixed to the pattern length.',
      start: 'int[] need = new int[26], have = new int[26];',
      panels: [arr(['c', 'b', 'a', 'e', 'b', 'a', 'b'], [{i: 0, label: 'L', c: 'l'}, {i: 2, label: 'R', c: 'r'}], {cls: winCls(7, 0, 2), name: 's = "cbaebab", p = "abc"'})],
      rules: [
        ['Use it when', 'Find anagrams, permutation in string, any problem that compares letter counts.'],
        ['Index trick', '`c - \'a\'` turns `\'a\'..\'z\'` into `0..25`.'],
        ['Compare', '`Arrays.equals(have, need)` is 26 checks, so still O(n) overall.']
      ],
      probs: '438 Find All Anagrams in a String, 567 Permutation in String, 424 Longest Repeating Character Replacement',
      tabs: [
        { name: 'Find anagrams', code: J`List<Integer> findAnagrams(String s, String p) {
    List<Integer> res = new ArrayList<>();
    if (p.length() > s.length()) return res;
    int[] need = new int[26], have = new int[26];
    for (char c : p.toCharArray()) need[c - 'a']++;
    int k = p.length();
    for (int right = 0; right < s.length(); right++) {
        have[s.charAt(right) - 'a']++;                    // enter
        if (right >= k) have[s.charAt(right - k) - 'a']--; // leave
        if (right >= k - 1 && Arrays.equals(have, need)) {
            res.add(right - k + 1);                        // window start
        }
    }
    return res;
}` },
        { name: 'Char replacement', code: J`int characterReplacement(String s, int k) {
    int[] count = new int[26];
    int left = 0, maxFreq = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        count[s.charAt(right) - 'A']++;
        maxFreq = Math.max(maxFreq, count[s.charAt(right) - 'A']);
        // chars to change = window size - most common char
        while (right - left + 1 - maxFreq > k) {
            count[s.charAt(left) - 'A']--;
            left++;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}` }
      ]
    }
  ],

  javaUsed: [
    ['for (int right = 0; right < n; right++)', 'The right edge moves every step.', 'Let the for loop own `right`; you only manage `left`.'],
    ['right - left + 1', 'Number of items in the window `[left, right]`.', 'Both ends included, hence `+ 1`.'],
    ['int[] count = new int[26]', 'Letter counts. Starts at all zeros.', 'Faster and simpler than a map for lowercase letters.'],
    ["c - 'a'", "Char to index 0..25.", "Use `c - 'A'` for uppercase. `int[128]` with `count[c]` covers any ASCII char."],
    ['Arrays.equals(a, b)', 'True if two arrays hold the same values.', '`a == b` only checks if they are the same object.'],
    ['Set<Character> set = new HashSet<>()', 'Window contents for "no repeats".', '`add`, `remove`, `contains` are O(1).'],
    ['map.merge(key, 1, Integer::sum)', 'Add 1 to the count, or put 1 if missing.', 'Same as `map.put(key, map.getOrDefault(key, 0) + 1)`.'],
    ['map.size()', 'Number of keys = number of distinct values in the window.', 'Remove keys whose count hits 0.'],
    ['Integer.MAX_VALUE / MIN_VALUE', 'Start values for min / max answers.', 'Check for MAX_VALUE at the end to detect "no answer".'],
    ['s.substring(a, b)', 'Chars from index a up to b - 1.', 'Return the best window as a String.']
  ],
  concepts: [
    { name: 'Why it is O(n), even with a while inside a for', text: '`left` only moves forward and never passes `right`. Over the whole run it moves at most n times in total, not n times per step. So the inner while adds O(n) total, not O(n²).' },
    { name: 'Enter and leave must mirror each other', text: 'Whatever you do when `right` enters, undo exactly that when `left` leaves. If enter is `count[c]++`, leave is `count[c]--`. Mismatched updates are the #1 sliding-window bug.' },
    { name: 'Longest vs shortest: where the answer line goes', text: 'Longest valid: shrink until valid, then record (after the while). Shortest valid: record while valid, then shrink (inside the while).', code: J`// longest
while (invalid) { remove(left); left++; }
best = Math.max(best, right - left + 1);

// shortest
while (valid) { best = Math.min(best, right - left + 1); remove(left); left++; }` },
    { name: 'When sliding window does NOT work', text: 'With negative numbers, adding an item can make the sum smaller, so "shrink while too big" is no longer safe. For subarray sum = k with negatives, use prefix sum + HashMap instead.' }
  ],
  loops: [
    ['`for (int right = 0; right < n; right++)`', 'Right edge visits every index once.', 'Every window problem'],
    ['`while (window invalid)`', 'Shrink until valid again.', 'Longest valid window'],
    ['`while (window valid)`', 'Record, then shrink to search for a smaller one.', 'Shortest valid window'],
    ['`if (right >= k)`', 'The window has k + 1 items, so one must leave.', 'Fixed window'],
    ['`if (right >= k - 1)`', 'The window is full (exactly k items).', 'Fixed window record']
  ],
  movesTitle: 'Window updates',
  moves: [
    ['`sum += nums[right];`', 'Right item enters', 'Sum windows'],
    ['`sum -= nums[left]; left++;`', 'Left item leaves', 'Shrinking'],
    ['`sum -= nums[right - k];`', 'Item that fell off a size-k window leaves', 'Fixed window'],
    ["`count[s.charAt(right) - 'a']++;`", 'Count the entering letter', 'Anagrams'],
    ['`set.remove(s.charAt(left)); left++;`', 'Remove leaving char from the set', 'No repeating chars'],
    ['`best = Math.max(best, right - left + 1);`', 'Record the current window size', 'Longest']
  ],
  bugs: [
    ['Using if instead of while to shrink', 'One step of shrinking may not be enough.', '`while (invalid)` so `left` moves as far as needed.'],
    ['Off-by-one window size', '`right - left` is one less than the item count.', '`right - left + 1`.'],
    ['Forgot to remove zero-count keys', '`map.size()` counts keys whose value is 0.', '`if (map.get(f) == 0) map.remove(f);`'],
    ['Recording the answer in the wrong place', 'Longest records after shrinking; shortest records inside the shrink loop.', 'see the concept card above.'],
    ['Negative numbers', 'Shrinking does not reliably reduce the sum.', 'switch to prefix sum + HashMap.'],
    ['Returning MAX_VALUE', 'No valid window was found.', '`return best == Integer.MAX_VALUE ? 0 : best;`']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-fixed', title: 'Max sum of a window of size k', ask: 'Add the new item, remove the one that fell off, record once the window is full.', code: J`int maxSumK(int[] nums, int k) {
    int sum = 0, best = Integer.MIN_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum [[+=]] nums[right];
        if (right >= k) sum -= nums[ [[right - k]] ];
        if (right >= [[k - 1]]) best = Math.max(best, sum);
    }
    return best;
}` },
      { id: 'fb-norepeat', title: 'Longest substring without repeating characters', ask: 'Grow right. While the new char is already in the window, remove from the left.', code: J`int lengthOfLongestSubstring(String s) {
    Set<Character> window = new HashSet<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        [[while]] (window.contains(c)) {
            window.remove(s.charAt([[left]]));
            left++;
        }
        window.[[add]](c);
        best = Math.max(best, [[right - left + 1]]);
    }
    return best;
}` },
      { id: 'fb-minlen', title: 'Minimum size subarray sum', ask: 'Shortest window with sum ≥ target. Record inside the shrink loop.', code: J`int minSubArrayLen(int target, int[] nums) {
    int left = 0, sum = 0, best = [[Integer.MAX_VALUE]];
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum [[>=]] target) {
            best = [[Math.min]](best, right - left + 1);
            sum -= nums[left];
            [[left++|left += 1|++left]];
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}` },
      { id: 'fb-anagram', title: 'Find all anagrams', ask: 'Fixed window of size `p.length()` with letter counts.', code: J`List<Integer> findAnagrams(String s, String p) {
    List<Integer> res = new ArrayList<>();
    int[] need = new int[26], have = new int[26];
    for (char c : p.toCharArray()) need[ [[c - 'a']] ]++;
    int k = p.length();
    for (int right = 0; right < s.length(); right++) {
        have[s.charAt(right) - 'a']++;
        if (right >= k) have[s.charAt([[right - k]]) - 'a']--;
        if (right >= k - 1 && [[Arrays.equals(have, need)|Arrays.equals(need, have)]]) res.add(right - k + 1);
    }
    return res;
}` }
    ],
    order: [
      { id: 'od-ones', title: 'Max consecutive ones with at most k flips',
        ideaSteps: ['Count zeros inside the window.', 'Move `right` over every index; if it is a zero, count it.', 'While more than k zeros: if the left item is zero, uncount it; move left.', 'The window is valid now: record its size.'],
        lines: [
          'int left = 0, zeros = 0, best = 0;',
          'for (int right = 0; right < nums.length; right++) {',
          '    if (nums[right] == 0) zeros++;',
          '    while (zeros > k) {',
          '        if (nums[left] == 0) zeros--;',
          '        left++;',
          '    }',
          '    best = Math.max(best, right - left + 1);',
          '}',
          'return best;'
        ],
        extra: ['    if (zeros > k) left++;', '    best = Math.max(best, right - left);'],
        wrap: 'int longestOnes(int[] nums, int k) {\n@@\n}' },
      { id: 'od-fruit', title: 'Fruit into baskets (at most 2 kinds)',
        ideaSteps: ['Map from fruit type to how many are in the window.', 'Add the right fruit to the map.', 'While the map has more than 2 kinds, take the left fruit out (drop it when its count is 0) and move left.', 'Record the window size.'],
        lines: [
          'Map<Integer, Integer> count = new HashMap<>();',
          'int left = 0, best = 0;',
          'for (int right = 0; right < fruits.length; right++) {',
          '    count.merge(fruits[right], 1, Integer::sum);',
          '    while (count.size() > 2) {',
          '        count.merge(fruits[left], -1, Integer::sum);',
          '        if (count.get(fruits[left]) == 0) count.remove(fruits[left]);',
          '        left++;',
          '    }',
          '    best = Math.max(best, right - left + 1);',
          '}',
          'return best;'
        ],
        wrap: 'int totalFruit(int[] fruits) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['643', 'Maximum Average Subarray I'], ['1456', 'Maximum Number of Vowels in a Substring'], ['3', 'Longest Substring Without Repeating Characters'], ['209', 'Minimum Size Subarray Sum'], ['1004', 'Max Consecutive Ones III']],
    next: [['904', 'Fruit Into Baskets'], ['438', 'Find All Anagrams in a String'], ['567', 'Permutation in String'], ['424', 'Longest Repeating Character Replacement'], ['76', 'Minimum Window Substring'], ['239', 'Sliding Window Maximum']]
  }
});
})();
