(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'greedy', order: 14, title: 'Greedy',
  oneLiner: 'Make the choice that looks best right now and never undo it. It is short to code, but only correct when you can argue that the local best choice never hurts the final answer.',
  legend: [['r', 'current item'], ['a', 'best so far / reach'], ['hit', 'chosen']],
  clues: ['maximum number of …', 'minimum number of jumps / arrows / coins (special cases)', 'can you reach the end', 'schedule / assign', 'sort then pick', 'buy and sell (any number of times)', 'gas station', 'one pass, keep the best so far'],
  idea: [
    'Greedy keeps **one running decision** (farthest reach, current sum, best price so far) and updates it item by item. No table, no recursion.',
    'Usually you **sort first** so the "best next choice" is simply the next item: smallest end time, biggest value per weight, smallest child greed.',
    'Before trusting greedy, look for a counterexample. Coin change with coins `[1, 3, 4]` and amount 6: greedy picks 4+1+1 (3 coins), best is 3+3 (2 coins). When greedy fails, use DP.'
  ],
  pick: [
    ['Reach the end / farthest point', 'Track max reach', '`reach = Math.max(reach, i + nums[i])`'],
    ['Max subarray sum', "Kadane: drop a negative running sum", '`cur = Math.max(x, cur + x)`'],
    ['Assign / match two sorted lists', 'Sort both + two pointers', 'smallest that fits'],
    ['Keep most non-overlapping', 'Sort by end (see Intervals)', '`if (start >= end)`'],
    ['Profit from every up-move', 'Add every positive difference', '`profit += Math.max(0, p[i] - p[i - 1])`']
  ],
  fourQuestions: [
    ['What is the one running value?', '`reach`, `cur`, `minPrice`, `tank`, `count`. Declare it before the loop.'],
    ['Do I need to sort first? By what?', 'If "best next" depends on order: `Arrays.sort(a)` or by a field with a comparator.'],
    ['What is the update at each item?', 'One or two lines: `best = Math.max(best, ...)`, or reset when it goes bad.'],
    ['Why is it safe?', 'Say it in one sentence ("taking the earliest end leaves the most room"). If you cannot, test small cases or switch to DP.']
  ],

  demo: {
    title: 'Jump game: can you reach the last index?',
    sub: 'Array `[2, 3, 1, 1, 4]`. `nums[i]` is the max jump from i. Track the farthest index you can reach so far.',
    code: [
      'int reach = 0;',
      'for (int i = 0; i < nums.length; i++) {',
      '    if (i > reach) return false;        // stuck before i',
      '    reach = Math.max(reach, i + nums[i]);',
      '}',
      'return true;'
    ],
    steps: function(){
      var a = [2, 3, 1, 1, 4], reach = 0, out = [];
      function P(i){ var c = {}; for (var k = 0; k <= Math.min(reach, a.length - 1); k++) c[k] = 'win'; c[i] = 'on-r';
        var m = [{i: i, label: 'i', c: 'r'}]; if (reach < a.length) m.push({i: reach, label: 'reach', c: 'a'});
        return [arr(a, m, {cls: c})]; }
      for (var i = 0; i < a.length; i++){
        var old = reach;
        reach = Math.max(reach, i + a[i]);
        out.push({ panels: P(i), line: 3, vars: {i: i, reach: reach}, ok: reach >= a.length - 1,
          msg: '`i = ' + i + '` is within reach (' + old + '). From here you can get to `' + i + ' + ' + a[i] + ' = ' + (i + a[i]) + '`. Reach is now ' + reach + '.' + (reach >= a.length - 1 ? ' That covers the last index.' : '') });
        if (reach >= a.length - 1){
          out.push({ panels: P(i), line: 5, ok: true, vars: {reach: reach}, msg: 'Reach ≥ last index, so the answer is **true**. No need to try every jump combination: O(n).' });
          break;
        }
      }
      return out;
    }
  },

  variants: [
    {
      id: 'reach', name: 'Running best (reach, Kadane, min price)', short: 'Running best',
      intro: 'One pass, one or two variables. At each item: update the running value, and update the answer.',
      start: 'int best = ...; for (int x : nums) { update running value; best = Math.max(best, running); }',
      panels: [arr([-2, 1, -3, 4, -1, 2, 1, -5, 4], [{i: 3, label: 'restart', c: 'a'}], {cls: {3: 'win', 4: 'win', 5: 'win', 6: 'win'}, name: 'Kadane: best subarray [4,-1,2,1] = 6'})],
      rules: [
        ['Use it when', 'Jump game, max subarray (Kadane), best time to buy and sell stock, gas station.'],
        ['Kadane', 'If the running sum would be worse than starting fresh at x, start fresh: `cur = Math.max(x, cur + x)`.'],
        ['Stock (one trade)', 'Track the lowest price so far; profit = today − lowest.'],
        ['Cost', 'O(n) time, O(1) space.']
      ],
      probs: '55 Jump Game, 53 Maximum Subarray, 121 Best Time to Buy and Sell Stock, 122 Best Time II, 134 Gas Station, 45 Jump Game II',
      tabs: [
        { name: 'Max subarray', code: J`int maxSubArray(int[] nums) {
    int cur = nums[0], best = nums[0];
    for (int i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);   // extend or restart
        best = Math.max(best, cur);
    }
    return best;
}` },
        { name: 'Stock (one trade)', code: J`int maxProfit(int[] prices) {
    int minPrice = Integer.MAX_VALUE, best = 0;
    for (int p : prices) {
        minPrice = Math.min(minPrice, p);        // cheapest day so far
        best = Math.max(best, p - minPrice);     // sell today
    }
    return best;
}` },
        { name: 'Stock (many trades)', code: J`int maxProfitMany(int[] prices) {
    int profit = 0;
    for (int i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];   // take every rise
    }
    return profit;
}` },
        { name: 'Jump game II', code: J`int jump(int[] nums) {
    int jumps = 0, end = 0, farthest = 0;
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == end) {             // used up this jump's range
            jumps++;
            end = farthest;
        }
    }
    return jumps;
}`, note: 'Like BFS by levels: each "level" is the range one more jump can reach.' },
        { name: 'Gas station', code: J`int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < gas.length; i++) {
        int diff = gas[i] - cost[i];
        total += diff;
        tank += diff;
        if (tank < 0) {             // cannot reach i + 1 from start
            start = i + 1;
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}` }
      ]
    },
    {
      id: 'sortpick', name: 'Sort, then pick', short: 'Sort then pick',
      intro: 'Sorting puts the "obvious next choice" at the front. Then a simple loop or two pointers makes the assignments.',
      start: 'Arrays.sort(a);  Arrays.sort(b);  int i = 0, j = 0;',
      panels: [arr([1, 2, 3], [{i: 0, label: 'child i', c: 'l'}], {name: 'greed (sorted)'}), arr([1, 1], [{i: 0, label: 'cookie j', c: 'r'}], {name: 'cookies (sorted)'})],
      rules: [
        ['Use it when', 'Assign cookies, boats to save people, two city scheduling, largest number, task assignment.'],
        ['Pattern', 'Satisfy the easiest request with the smallest thing that works, or pair the heaviest with the lightest.'],
        ['Custom order', '`Arrays.sort(arr, (a, b) -> ...)` needs an object array (`Integer[]`, `int[][]`, `String[]`), not `int[]`.']
      ],
      probs: '455 Assign Cookies, 881 Boats to Save People, 1029 Two City Scheduling, 179 Largest Number, 1710 Maximum Units on a Truck',
      tabs: [
        { name: 'Assign cookies', code: J`int findContentChildren(int[] greed, int[] cookies) {
    Arrays.sort(greed);
    Arrays.sort(cookies);
    int child = 0;
    for (int c = 0; c < cookies.length && child < greed.length; c++) {
        if (cookies[c] >= greed[child]) child++;   // smallest cookie that works
    }
    return child;
}` },
        { name: 'Boats', code: J`int numRescueBoats(int[] people, int limit) {
    Arrays.sort(people);
    int boats = 0, light = 0, heavy = people.length - 1;
    while (light <= heavy) {
        if (people[light] + people[heavy] <= limit) light++;   // pair them
        heavy--;                                               // heaviest always goes
        boats++;
    }
    return boats;
}` },
        { name: 'Max units on truck', code: J`int maximumUnits(int[][] boxTypes, int truckSize) {
    Arrays.sort(boxTypes, (a, b) -> b[1] - a[1]);   // most units per box first
    int units = 0;
    for (int[] b : boxTypes) {
        int take = Math.min(truckSize, b[0]);
        units += take * b[1];
        truckSize -= take;
        if (truckSize == 0) break;
    }
    return units;
}` },
        { name: 'Largest number', code: J`String largestNumber(int[] nums) {
    String[] s = new String[nums.length];
    for (int i = 0; i < nums.length; i++) s[i] = String.valueOf(nums[i]);
    Arrays.sort(s, (a, b) -> (b + a).compareTo(a + b));   // which order is bigger?
    if (s[0].equals("0")) return "0";
    return String.join("", s);
}` }
      ]
    },
    {
      id: 'counting', name: 'Greedy with counts', short: 'Greedy counts',
      intro: 'Count first, then decide from the counts. Often the answer is a formula over the most frequent item.',
      start: 'int[] count = new int[26];',
      panels: [{ type: 'map', name: 'tasks A A A B B C, n = 2', entries: [['A', 3, 'on-a'], ['B', 2], ['C', 1]] }, { type: 'text', name: 'schedule', text: 'A B C A B _ A  →  7 slots' }],
      rules: [
        ['Use it when', 'Task scheduler, partition labels, hand of straights, reorganize string, valid parenthesis string.'],
        ['Partition labels', 'Record the last index of each letter; cut when `i` reaches the farthest last index seen.']
      ],
      probs: '763 Partition Labels, 621 Task Scheduler, 846 Hand of Straights, 678 Valid Parenthesis String, 1899 Merge Triplets',
      tabs: [
        { name: 'Partition labels', code: J`List<Integer> partitionLabels(String s) {
    int[] last = new int[26];
    for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;
    List<Integer> res = new ArrayList<>();
    int start = 0, end = 0;
    for (int i = 0; i < s.length(); i++) {
        end = Math.max(end, last[s.charAt(i) - 'a']);   // part must reach here
        if (i == end) {                                 // safe to cut
            res.add(end - start + 1);
            start = i + 1;
        }
    }
    return res;
}` },
        { name: 'Task scheduler', code: J`int leastInterval(char[] tasks, int n) {
    int[] count = new int[26];
    int maxCount = 0;
    for (char t : tasks) maxCount = Math.max(maxCount, ++count[t - 'A']);
    int tied = 0;                                  // tasks sharing the max count
    for (int c : count) if (c == maxCount) tied++;
    int frame = (maxCount - 1) * (n + 1) + tied;   // A _ _ A _ _ A
    return Math.max(frame, tasks.length);
}` },
        { name: 'Valid parenthesis (*)', code: J`boolean checkValidString(String s) {
    int lo = 0, hi = 0;               // range of possible open counts
    for (char c : s.toCharArray()) {
        if (c == '(') { lo++; hi++; }
        else if (c == ')') { lo--; hi--; }
        else { lo--; hi++; }          // * can be ), empty, or (
        if (hi < 0) return false;     // too many )
        lo = Math.max(lo, 0);
    }
    return lo == 0;
}` }
      ]
    }
  ],

  javaUsed: [
    ['Math.max(best, cur)', 'Keep the best value seen.', 'The core line of most greedy loops.'],
    ['Integer.MAX_VALUE', 'Start value for "minimum so far".', 'Min price, min cost.'],
    ['Arrays.sort(int[])', 'Ascending sort of primitives.', 'Cannot take a comparator.'],
    ['Arrays.sort(T[], (a, b) -> ...)', 'Custom order for objects or rows.', 'Box ints with `Integer[]` if you need custom order on numbers.'],
    ['(b + a).compareTo(a + b)', 'Compare two Strings lexicographically.', 'Negative, 0, positive like any comparator.'],
    ['String.valueOf(x) / String.join("", arr)', 'Number to text; glue Strings together.', 'Largest number.'],
    ['++count[i]', 'Increment and use the new value.', 'Track the max count in the same line.'],
    ['last[s.charAt(i) - \'a\'] = i', 'Last index of each letter.', 'Overwriting keeps the latest.']
  ],
  concepts: [
    { name: 'Greedy vs DP', text: 'Both make choices. DP tries every option for each subproblem and keeps the best. Greedy commits to one option and never looks back. Greedy is faster, but only correct when the local best is provably part of some global best.' },
    { name: 'Exchange argument (how to convince yourself)', text: 'Take any optimal answer. Show you can swap its first choice for the greedy choice without making it worse. Then the greedy choice is safe, and the same argument repeats for the rest.' },
    { name: 'Kadane is greedy (and DP)', text: '`cur` = best sum of a subarray ending here. A negative running sum can only hurt anything after it, so drop it and restart. That one-line rule is both a greedy choice and a 1D DP with O(1) space.' },
    { name: 'Counterexample first', text: 'Before coding greedy, try to break it with a tiny input. Coins `[1, 3, 4]` for 6 breaks "take the biggest coin". If you find one quickly, it is a DP problem.', code: J`// greedy: 4 + 1 + 1 = 3 coins
// best:   3 + 3     = 2 coins  -> use DP (coin change)` }
  ],
  loops: [
    ['`for (int i = 0; i < n; i++) { if (i > reach) return false; ... }`', 'Walk while still reachable.', 'Jump game'],
    ['`for (int i = 0; i < n - 1; i++)`', 'Stop before the last index (no jump needed from it).', 'Jump game II'],
    ['`while (light <= heavy)`', 'Pair from both ends; one person alone is allowed.', 'Boats'],
    ['`for (...; c < cookies.length && child < greed.length; ...)`', 'Stop when either list runs out.', 'Assign cookies']
  ],
  movesTitle: 'Key lines',
  moves: [
    ['`reach = Math.max(reach, i + nums[i]);`', 'Farthest index reachable', 'Jump game'],
    ['`cur = Math.max(nums[i], cur + nums[i]);`', 'Extend or restart', 'Kadane'],
    ['`best = Math.max(best, p - minPrice);`', 'Profit if sold today', 'Stock'],
    ['`if (tank < 0) { start = i + 1; tank = 0; }`', 'Restart after a failing stretch', 'Gas station'],
    ['`if (i == end) { res.add(end - start + 1); start = i + 1; }`', 'Close a part', 'Partition labels']
  ],
  bugs: [
    ['Greedy where DP is needed', 'Passes examples, fails hidden tests.', 'try a tiny counterexample first.'],
    ['Kadane with best = 0', 'All-negative arrays should return the largest negative.', 'start `best` and `cur` at `nums[0]`.'],
    ['Custom sort on int[]', '`Arrays.sort(int[], comparator)` does not compile.', 'use `Integer[]` or sort rows of `int[][]`.'],
    ['Comparator overflow', '`b[1] - a[1]` with huge values.', '`Integer.compare(b[1], a[1])`.'],
    ['Off by one in jump game II', 'Looping to the last index adds an extra jump.', 'loop to `n - 2` (`i < n - 1`).']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-jump', title: 'Jump game', ask: 'Track the farthest reachable index.', code: J`boolean canJump(int[] nums) {
    int reach = [[0]];
    for (int i = 0; i < nums.length; i++) {
        if (i [[>]] reach) return false;
        reach = Math.max(reach, [[i + nums[i]]]);
    }
    return [[true]];
}` },
      { id: 'fb-kadane', title: "Maximum subarray (Kadane)", ask: 'Extend the running sum or restart at this number.', code: J`int maxSubArray(int[] nums) {
    int cur = [[nums[0]]], best = nums[0];
    for (int i = 1; i < nums.length; i++) {
        cur = Math.max([[nums[i]]], [[cur + nums[i]]]);
        best = [[Math.max(best, cur)|Math.max(cur, best)]];
    }
    return best;
}` },
      { id: 'fb-stock', title: 'Best time to buy and sell stock', ask: 'Cheapest day so far; profit if selling today.', code: J`int maxProfit(int[] prices) {
    int minPrice = [[Integer.MAX_VALUE]], best = 0;
    for (int p : prices) {
        minPrice = [[Math.min(minPrice, p)|Math.min(p, minPrice)]];
        best = Math.max(best, [[p - minPrice]]);
    }
    return best;
}` }
    ],
    order: [
      { id: 'od-labels', title: 'Partition labels',
        ideaSteps: ['Record the last index of every letter.', 'Walk the string; the current part must extend to the farthest last index of any letter in it.', 'When `i` reaches that end, cut: save the part size and start a new part.'],
        lines: [
          'int[] last = new int[26];',
          "for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;",
          'List<Integer> res = new ArrayList<>();',
          'int start = 0, end = 0;',
          'for (int i = 0; i < s.length(); i++) {',
          "    end = Math.max(end, last[s.charAt(i) - 'a']);",
          '    if (i == end) { res.add(end - start + 1); start = i + 1; }',
          '}',
          'return res;'
        ],
        extra: ["    end = last[s.charAt(i) - 'a'];"],
        wrap: 'List<Integer> partitionLabels(String s) {\n@@\n}' },
      { id: 'od-gas', title: 'Gas station',
        ideaSteps: ['Track total gas minus cost over the whole loop, and the tank since the current start.', 'If the tank goes negative, no station from start..i works: start after i with an empty tank.', 'If the total is negative, no start works.'],
        lines: [
          'int total = 0, tank = 0, start = 0;',
          'for (int i = 0; i < gas.length; i++) {',
          '    total += gas[i] - cost[i];',
          '    tank += gas[i] - cost[i];',
          '    if (tank < 0) { start = i + 1; tank = 0; }',
          '}',
          'return total >= 0 ? start : -1;'
        ],
        wrap: 'int canCompleteCircuit(int[] gas, int[] cost) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['121', 'Best Time to Buy and Sell Stock'], ['122', 'Best Time to Buy and Sell Stock II'], ['455', 'Assign Cookies'], ['53', 'Maximum Subarray'], ['55', 'Jump Game']],
    next: [['45', 'Jump Game II'], ['134', 'Gas Station'], ['763', 'Partition Labels'], ['881', 'Boats to Save People'], ['621', 'Task Scheduler'], ['678', 'Valid Parenthesis String'], ['846', 'Hand of Straights'], ['179', 'Largest Number']]
  }
});
})();
