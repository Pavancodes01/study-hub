(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
function iv(list){ return list.map(function(x){ return '[' + x[0] + ',' + x[1] + ']'; }); }

registerPattern({
  slug: 'intervals', order: 9, title: 'Intervals',
  oneLiner: 'Sort by start, then sweep left to right. Two intervals overlap when the next one starts before the current one ends. Almost every interval problem is that one check.',
  legend: [['r', 'current interval'], ['a', 'last merged interval'], ['hit', 'result']],
  clues: ['intervals [start, end]', 'merge overlapping', 'insert interval', 'meeting rooms', 'minimum arrows / removals', 'free time', 'overlap', 'calendar booking'],
  idea: [
    'Unsorted intervals are a mess. **Sort by start** and each interval only needs to be compared with the **last one you kept**.',
    'Overlap test after sorting: `next.start <= last.end`. If yes, merge by stretching `last.end = max(last.end, next.end)`. If no, start a new group.',
    'For "max non-overlapping" or "min removals", sort by **end** instead: finishing early leaves the most room (greedy).'
  ],
  pick: [
    ['Merge overlaps, insert, free time', 'Sort by start, compare with last', '`Arrays.sort(a, (x, y) -> x[0] - y[0])`'],
    ['Max non-overlapping / min removals / min arrows', 'Sort by end, greedy', '`Arrays.sort(a, (x, y) -> x[1] - y[1])`'],
    ['How many overlap at the same time (rooms)', 'Sweep line or heap of ends', 'separate starts and ends arrays'],
    ['Two sorted interval lists', 'Two pointers', 'advance the one that ends first']
  ],
  fourQuestions: [
    ['Sort by what?', 'Merging: start `a[0]`. Keeping the most intervals: end `a[1]`.'],
    ['What do I compare with?', 'The last kept interval: `int[] last = res.get(res.size() - 1);` or a variable `end`.'],
    ['What is the overlap test?', '`cur[0] <= last[1]` (touching counts) or `<` (touching does not). Read the problem.'],
    ['How do I return?', '`res.toArray(new int[0][])` turns a `List<int[]>` into `int[][]`.']
  ],

  demo: {
    title: 'Merge overlapping intervals',
    sub: 'Input `[[1,3],[8,10],[2,6],[15,18],[9,12]]`. Sort by start, then extend or start new.',
    code: [
      'Arrays.sort(intervals, (a, b) -> a[0] - b[0]);',
      'List<int[]> res = new ArrayList<>();',
      'for (int[] cur : intervals) {',
      '    if (res.isEmpty() || cur[0] > res.get(res.size() - 1)[1]) {',
      '        res.add(cur);                         // no overlap',
      '    } else {',
      '        int[] last = res.get(res.size() - 1);',
      '        last[1] = Math.max(last[1], cur[1]);  // stretch',
      '    }',
      '}'
    ],
    steps: function(){
      var input = [[1, 3], [8, 10], [2, 6], [15, 18], [9, 12]];
      var a = input.map(function(x){ return x.slice(); }).sort(function(x, y){ return x[0] - y[0]; });
      var res = [], out = [];
      out.push({ panels: [arr(iv(input), [], {name: 'input', ix: false}), arr(iv(a), [], {name: 'sorted by start', ix: false})], line: 0, vars: {}, msg: 'Sort by start. Now overlapping intervals sit next to each other.' });
      a.forEach(function(cur, i){
        var last = res[res.length - 1];
        var resPanel = function(hot){ var c = {}; if (hot !== undefined) c[hot] = 'on-a'; return arr(iv(res), [], {name: 'res', ix: false, cls: c}); };
        if (!last || cur[0] > last[1]){
          res.push(cur.slice());
          out.push({ panels: [arr(iv(a), [{i: i, label: 'cur', c: 'r'}], {name: 'sorted', ix: false}), resPanel(res.length - 1)], line: 4, vars: {cur: '[' + cur + ']'},
            msg: last ? '`' + cur[0] + ' > ' + last[1] + '`: starts after the last one ends. No overlap, add it.' : 'Result is empty. Add the first interval.' });
        } else {
          var old = last[1];
          last[1] = Math.max(last[1], cur[1]);
          out.push({ panels: [arr(iv(a), [{i: i, label: 'cur', c: 'r'}], {name: 'sorted', ix: false}), resPanel(res.length - 1)], line: [6, 7], vars: {cur: '[' + cur + ']'},
            msg: '`' + cur[0] + ' <= ' + old + '`: overlaps the last one. Stretch its end to `max(' + old + ', ' + cur[1] + ') = ' + last[1] + '`.' });
        }
      });
      out.push({ panels: [arr(iv(res), [], {name: 'res', ix: false, cls: {0: 'on-hit', 1: 'on-hit', 2: 'on-hit'}})], line: 9, ok: true, msg: 'Done: **' + iv(res).join(' ') + '**. Sorting O(n log n) + one pass.' });
      return out;
    }
  },

  variants: [
    {
      id: 'merge', name: 'Merge overlapping', short: 'Merge', intro: 'Sort by start. Keep a result list. Each new interval either stretches the last one or becomes the new last.',
      start: 'Arrays.sort(intervals, (a, b) -> a[0] - b[0]);',
      panels: [arr(['[1,3]', '[2,6]', '[8,10]', '[15,18]'], [{i: 1, label: 'cur', c: 'r'}, {i: 0, label: 'last', c: 'a'}], {ix: false})],
      rules: [
        ['Use it when', 'Merge intervals, insert interval, employee free time, summary ranges.'],
        ['Overlap', '`cur[0] <= last[1]` (they touch or cross).'],
        ['Merge', '`last[1] = Math.max(last[1], cur[1]);` (the new one might be fully inside).'],
        ['Cost', 'O(n log n) for the sort, O(n) for the sweep.']
      ],
      probs: '56 Merge Intervals, 57 Insert Interval, 228 Summary Ranges, 986 Interval List Intersections',
      tabs: [
        { name: 'Merge intervals', code: J`int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    List<int[]> res = new ArrayList<>();
    for (int[] cur : intervals) {
        if (res.isEmpty() || cur[0] > res.get(res.size() - 1)[1]) {
            res.add(cur);                              // new group
        } else {
            int[] last = res.get(res.size() - 1);
            last[1] = Math.max(last[1], cur[1]);       // stretch
        }
    }
    return res.toArray(new int[0][]);
}` },
        { name: 'Insert interval', code: J`int[][] insert(int[][] intervals, int[] add) {
    List<int[]> res = new ArrayList<>();
    int i = 0, n = intervals.length;
    while (i < n && intervals[i][1] < add[0]) {        // fully before
        res.add(intervals[i++]);
    }
    while (i < n && intervals[i][0] <= add[1]) {       // overlaps: absorb
        add[0] = Math.min(add[0], intervals[i][0]);
        add[1] = Math.max(add[1], intervals[i][1]);
        i++;
    }
    res.add(add);
    while (i < n) res.add(intervals[i++]);              // fully after
    return res.toArray(new int[0][]);
}`, note: 'Input is already sorted, so no sort: three phases (before, overlapping, after).' },
        { name: 'List intersections', code: J`int[][] intervalIntersection(int[][] a, int[][] b) {
    List<int[]> res = new ArrayList<>();
    int i = 0, j = 0;
    while (i < a.length && j < b.length) {
        int lo = Math.max(a[i][0], b[j][0]);
        int hi = Math.min(a[i][1], b[j][1]);
        if (lo <= hi) res.add(new int[]{lo, hi});
        if (a[i][1] < b[j][1]) i++;                    // drop the one ending first
        else j++;
    }
    return res.toArray(new int[0][]);
}` }
      ]
    },
    {
      id: 'byend', name: 'Sort by end (greedy keep)', short: 'Sort by end',
      intro: 'To keep the most non-overlapping intervals, always keep the one that **ends first**. It leaves the most room for the rest. Count what you keep or what you throw away.',
      start: 'Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));  int end = Integer.MIN_VALUE;',
      panels: [arr(['[1,2]', '[1,3]', '[2,3]', '[3,4]'], [{i: 0, label: 'keep', c: 'hit'}, {i: 1, label: 'drop', c: 'r'}], {ix: false, cls: {0: 'on-hit', 1: 'gone', 2: 'on-hit', 3: 'on-hit'}})],
      rules: [
        ['Use it when', 'Non-overlapping intervals (min removals), minimum arrows to burst balloons, max meetings in one room.'],
        ['Keep?', '`if (cur[0] >= end)` (or `>` if touching counts as overlap): keep it, `end = cur[1]`.'],
        ['Removals', 'Total minus kept.'],
        ['Comparator', 'Use `Integer.compare` here: balloon coordinates can be near ±2³¹.']
      ],
      probs: '435 Non-overlapping Intervals, 452 Minimum Number of Arrows to Burst Balloons, 646 Maximum Length of Pair Chain',
      tabs: [
        { name: 'Min removals', code: J`int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));   // by end
    int kept = 0;
    int end = Integer.MIN_VALUE;
    for (int[] cur : intervals) {
        if (cur[0] >= end) {          // fits after the last kept one
            kept++;
            end = cur[1];
        }
    }
    return intervals.length - kept;
}` },
        { name: 'Min arrows', code: J`int findMinArrowShots(int[][] points) {
    Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));
    int arrows = 1;
    int end = points[0][1];               // shoot at the first end
    for (int[] p : points) {
        if (p[0] > end) {                 // this balloon is past the arrow
            arrows++;
            end = p[1];
        }
    }
    return arrows;
}` }
      ]
    },
    {
      id: 'sweep', name: 'Sweep line (count overlaps)', short: 'Sweep line',
      intro: 'Turn each interval into +1 at its start and -1 at its end. Walk the events in time order and track the running total: the max is the most overlaps at once.',
      start: 'int[] starts, ends; sort both; two pointers over them',
      panels: [arr([0, 5, 15], [{i: 1, label: 's', c: 'l'}], {name: 'starts (sorted)'}), arr([10, 20, 30], [{i: 0, label: 'e', c: 'r'}], {name: 'ends (sorted)'})],
      rules: [
        ['Use it when', 'Meeting rooms II, car pooling, max people in a room, my calendar, corporate flight bookings (with a difference array).'],
        ['Rule', 'If the next start is before the next end, a new room opens; otherwise one closes first.'],
        ['Difference array', 'For integer positions: `diff[start] += x; diff[end] -= x;` then prefix-sum.']
      ],
      probs: '253 Meeting Rooms II, 1094 Car Pooling, 1109 Corporate Flight Bookings, 252 Meeting Rooms',
      tabs: [
        { name: 'Rooms via sweep', code: J`int minMeetingRooms(int[][] intervals) {
    int n = intervals.length;
    int[] starts = new int[n], ends = new int[n];
    for (int i = 0; i < n; i++) {
        starts[i] = intervals[i][0];
        ends[i] = intervals[i][1];
    }
    Arrays.sort(starts);
    Arrays.sort(ends);
    int rooms = 0, best = 0, e = 0;
    for (int s = 0; s < n; s++) {
        while (e < n && ends[e] <= starts[s]) { rooms--; e++; }   // free rooms first
        rooms++;
        best = Math.max(best, rooms);
    }
    return best;
}` },
        { name: 'Car pooling', code: J`boolean carPooling(int[][] trips, int capacity) {
    int[] diff = new int[1001];             // positions 0..1000
    for (int[] t : trips) {
        diff[t[1]] += t[0];                 // passengers get on
        diff[t[2]] -= t[0];                 // and get off
    }
    int load = 0;
    for (int d : diff) {
        load += d;
        if (load > capacity) return false;
    }
    return true;
}` },
        { name: 'Can attend all', code: J`boolean canAttendMeetings(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] < intervals[i - 1][1]) return false;   // overlap
    }
    return true;
}` }
      ]
    }
  ],

  javaUsed: [
    ['Arrays.sort(a, (x, y) -> x[0] - y[0])', 'Sort an `int[][]` by the first field.', 'Comparator on rows. Sort by end: `x[1] - y[1]`.'],
    ['Arrays.sort(a, (x, y) -> Integer.compare(x[1], y[1]))', 'Overflow-safe version.', 'Use when coordinates are near int limits.'],
    ['Arrays.sort(a, Comparator.comparingInt(x -> x[0]))', 'Same as above, readable form.', '`.thenComparingInt(x -> x[1])` breaks ties.'],
    ['List<int[]> res = new ArrayList<>()', 'Growable list of intervals.', 'Arrays are fixed size; collect in a list first.'],
    ['res.get(res.size() - 1)', 'Last element of a list.', 'Returns the same `int[]` object, so editing it edits the list.'],
    ['res.toArray(new int[0][])', '`List<int[]>` back to `int[][]`.', 'The empty array only tells Java the type.'],
    ['int[] cur : intervals', 'Loop over rows of a 2D array.', '`cur[0]` start, `cur[1]` end.'],
    ['new int[]{lo, hi}', 'Make a new interval.', '']
  ],
  concepts: [
    { name: 'Overlap test in one line', text: 'Two intervals `a` and `b` overlap when `a[0] <= b[1] && b[0] <= a[1]`. After sorting by start, you only need `b[0] <= a[1]` because `a[0] <= b[0]` is guaranteed.' },
    { name: 'Touching: <= or <?', text: '`[1,2]` and `[2,3]`: merge intervals treats them as overlapping (`<=`). Meetings treat them as fine back-to-back (`<`). Read the examples to decide.' },
    { name: 'Editing the last interval in place', text: '`res.get(res.size() - 1)` returns a reference to the array inside the list. Changing `last[1]` changes the stored interval; no need to remove and re-add.' },
    { name: 'Why sort by end for "keep the most"', text: 'Among intervals that fit, the one ending first can be swapped into any optimal answer without hurting it. So picking it greedily is always safe (exchange argument).' }
  ],
  loops: [
    ['`for (int[] cur : intervals)`', 'Sweep sorted intervals once.', 'Merge, greedy'],
    ['`while (i < n && intervals[i][1] < add[0])`', 'Copy intervals fully before the new one.', 'Insert interval'],
    ['`while (i < a.length && j < b.length)`', 'Two sorted lists.', 'Intersections']
  ],
  movesTitle: 'Key lines',
  moves: [
    ['`if (res.isEmpty() || cur[0] > last[1]) res.add(cur);`', 'Start a new group', 'Merge'],
    ['`last[1] = Math.max(last[1], cur[1]);`', 'Stretch the last group', 'Merge'],
    ['`if (cur[0] >= end) { kept++; end = cur[1]; }`', 'Keep an interval that fits', 'Sort by end'],
    ['`if (a[i][1] < b[j][1]) i++; else j++;`', 'Drop the one that ends first', 'Intersections'],
    ['`diff[start] += x; diff[end] -= x;`', 'Mark a range change', 'Car pooling']
  ],
  bugs: [
    ['Forgot to sort', 'Overlaps are not adjacent.', '`Arrays.sort(intervals, (a, b) -> a[0] - b[0]);`'],
    ['Overwriting end with cur[1]', 'A small interval inside a big one shrinks it.', '`Math.max(last[1], cur[1])`.'],
    ['Comparator overflow', '`a[1] - b[1]` with values near ±2³¹ (balloons).', '`Integer.compare`.'],
    ['Wrong touching rule', '`<` vs `<=` changes answers for `[1,2],[2,3]`.', 'check the examples.'],
    ['Returning a List', 'Method expects `int[][]`.', '`res.toArray(new int[0][])`.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-merge', title: 'Merge intervals', ask: 'Sort by start; stretch or add.', code: J`int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> [[a[0] - b[0]|Integer.compare(a[0], b[0])]]);
    List<int[]> res = new ArrayList<>();
    for (int[] cur : intervals) {
        if (res.isEmpty() || cur[0] > res.get([[res.size() - 1]])[1]) res.add(cur);
        else {
            int[] last = res.get(res.size() - 1);
            last[1] = [[Math.max(last[1], cur[1])|Math.max(cur[1], last[1])]];
        }
    }
    return res.[[toArray]](new int[0][]);
}` },
      { id: 'fb-erase', title: 'Non-overlapping intervals', ask: 'Sort by end; count what you keep.', code: J`int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[ [[1]] ], b[1]));
    int kept = 0, end = [[Integer.MIN_VALUE]];
    for (int[] cur : intervals) {
        if (cur[0] [[>=]] end) { kept++; end = [[cur[1]]]; }
    }
    return [[intervals.length - kept]];
}` }
    ],
    order: [
      { id: 'od-insert', title: 'Insert interval (input already sorted)',
        ideaSteps: ['Copy every interval that ends before the new one starts.', 'Absorb every interval that starts before the new one ends: widen the new one.', 'Add the (widened) new interval.', 'Copy the rest.'],
        lines: [
          'List<int[]> res = new ArrayList<>();',
          'int i = 0, n = intervals.length;',
          'while (i < n && intervals[i][1] < add[0]) res.add(intervals[i++]);',
          'while (i < n && intervals[i][0] <= add[1]) {',
          '    add[0] = Math.min(add[0], intervals[i][0]);',
          '    add[1] = Math.max(add[1], intervals[i][1]);',
          '    i++;',
          '}',
          'res.add(add);',
          'while (i < n) res.add(intervals[i++]);',
          'return res.toArray(new int[0][]);'
        ],
        extra: ['Arrays.sort(intervals, (a, b) -> a[1] - b[1]);'],
        wrap: 'int[][] insert(int[][] intervals, int[] add) {\n@@\n}' },
      { id: 'od-arrows', title: 'Minimum arrows to burst balloons',
        ideaSteps: ['Sort balloons by end.', 'Shoot the first arrow at the first end.', 'For each balloon that starts after the arrow, shoot a new arrow at its end.', 'Return the arrow count.'],
        lines: [
          'Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));',
          'int arrows = 1, end = points[0][1];',
          'for (int[] p : points) {',
          '    if (p[0] > end) { arrows++; end = p[1]; }',
          '}',
          'return arrows;'
        ],
        wrap: 'int findMinArrowShots(int[][] points) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['252', 'Meeting Rooms'], ['228', 'Summary Ranges'], ['56', 'Merge Intervals'], ['57', 'Insert Interval']],
    next: [['435', 'Non-overlapping Intervals'], ['452', 'Minimum Number of Arrows to Burst Balloons'], ['986', 'Interval List Intersections'], ['253', 'Meeting Rooms II'], ['1094', 'Car Pooling'], ['759', 'Employee Free Time']]
  }
});
})();
