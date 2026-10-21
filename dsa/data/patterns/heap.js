(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
// Tiny binary min-heap so the demo shows the real PriorityQueue layout.
function hpush(h, x){ h.push(x); var i = h.length - 1; while (i > 0){ var p = (i - 1) >> 1; if (h[p] <= h[i]) break; var t = h[p]; h[p] = h[i]; h[i] = t; i = p; } }
function hpop(h){ var top = h[0], last = h.pop(); if (h.length){ h[0] = last; var i = 0; for (;;){ var l = 2 * i + 1, r = l + 1, m = i; if (l < h.length && h[l] < h[m]) m = l; if (r < h.length && h[r] < h[m]) m = r; if (m === i) break; var t = h[m]; h[m] = h[i]; h[i] = t; i = m; } } return top; }

registerPattern({
  slug: 'heap', order: 8, title: 'Heap / priority queue (top K)',
  oneLiner: 'A `PriorityQueue` always hands you the smallest (or largest) item in O(log n). Use it for top K, K-th largest, merging sorted lists, and "always process the cheapest next".',
  legend: [['a', 'heap top (peek)'], ['r', 'item arriving'], ['hit', 'kept in answer']],
  clues: ['k largest / smallest', 'k-th largest', 'top k frequent', 'k closest', 'merge k sorted', 'median of a stream', 'schedule / always pick the smallest next', 'minimum cost to connect'],
  idea: [
    'A heap is a partly sorted tree: the parent is always ≤ its children (min-heap). Only the top is guaranteed smallest. That is enough for many problems and cheaper than full sorting.',
    '**Top K largest:** keep a **min**-heap of size k. When it grows past k, throw away the smallest. What stays are the k largest, and the top is the k-th largest.',
    'Opposite feels backwards but works: K largest → min-heap, K smallest → max-heap. The heap top is the one most likely to be thrown out.'
  ],
  pick: [
    ['K largest / k-th largest', 'Min-heap of size k', '`new PriorityQueue<>()`'],
    ['K smallest / k closest', 'Max-heap of size k', '`new PriorityQueue<>((a, b) -> b - a)`'],
    ['Merge k sorted lists / arrays', 'Min-heap of current heads', 'push one item from each list'],
    ['Running median', 'Two heaps: max-heap low half, min-heap high half', 'keep sizes balanced'],
    ['Meeting rooms, tasks by time', 'Sort by start + min-heap of end times', '`pq.peek() <= start` frees a room']
  ],
  fourQuestions: [
    ['Min-heap or max-heap?', 'Ask: which item do I want to throw away (or process) first? That one goes on top.'],
    ['What goes in the heap?', 'Plain ints, or `int[]` like `{value, index}` / `{dist, x, y}` with a comparator.'],
    ['What is the comparator?', '`(a, b) -> a[0] - b[0]` sorts by first field ascending. Safer: `Integer.compare(a[0], b[0])`.'],
    ['When do I poll?', 'Size limit: `if (pq.size() > k) pq.poll();`. Processing: `while (!pq.isEmpty()) { var x = pq.poll(); ... }`']
  ],

  demo: {
    title: 'Keep the 3 largest numbers with a min-heap',
    sub: 'Stream `[3, 1, 5, 12, 2, 11]`, k = 3. The heap top is the smallest of the kept numbers, so it is the first to go.',
    code: [
      'PriorityQueue<Integer> pq = new PriorityQueue<>();   // min-heap',
      'for (int x : nums) {',
      '    pq.offer(x);',
      '    if (pq.size() > k) pq.poll();   // drop the smallest',
      '}',
      'return pq.peek();                  // k-th largest'
    ],
    steps: function(){
      var a = [3, 1, 5, 12, 2, 11], k = 3, h = [], out = [];
      function P(i, label){ var c = {0: 'on-a'}; return [arr(a, i === null ? [] : [{i: i, label: label || 'x', c: 'r'}], {name: 'nums'}), { type: 'tree', name: 'min-heap (PriorityQueue)', vals: h.slice(), cls: h.length ? c : {} }]; }
      a.forEach(function(x, i){
        hpush(h, x);
        out.push({ panels: P(i), line: 2, vars: {x: x, size: h.length, peek: h[0]}, msg: '`offer(' + x + ')`. It sifts up until its parent is smaller. Top is now ' + h[0] + '.' });
        if (h.length > k){
          var gone = hpop(h);
          out.push({ panels: P(i), line: 3, vars: {removed: gone, size: h.length, peek: h[0]}, msg: 'Size ' + (k + 1) + ' > k, so `poll()` removes the smallest: **' + gone + '**. It can never be in the top 3.' });
        }
      });
      out.push({ panels: P(null), line: 5, ok: true, vars: {peek: h[0]}, msg: 'Heap holds the 3 largest: ' + h.slice().sort(function(x, y){ return y - x; }).join(', ') + '. The top, **' + h[0] + '**, is the 3rd largest. Cost O(n log k).' });
      return out;
    }
  },

  variants: [
    {
      id: 'topk', name: 'Top K with a size-k heap', short: 'Top K',
      intro: 'Push every item; when the heap is bigger than k, poll. The heap ends with the k best items. O(n log k) time, O(k) space.',
      start: 'PriorityQueue<Integer> pq = new PriorityQueue<>();  if (pq.size() > k) pq.poll();',
      panels: [{ type: 'tree', name: 'min-heap of the 3 largest', vals: [5, 12, 11], cls: {0: 'on-a'} }],
      rules: [
        ['Use it when', 'K-th largest, top k frequent, k closest points, k weakest rows.'],
        ['Rule of thumb', 'Want the k **largest** → min-heap. Want the k **smallest / closest** → max-heap.'],
        ['Return a list', 'Poll everything out. The order is worst-to-best; reverse if needed.'],
        ['Cost', 'O(n log k). Sorting everything is O(n log n).']
      ],
      probs: '215 Kth Largest Element in an Array, 347 Top K Frequent Elements, 973 K Closest Points to Origin, 703 Kth Largest Element in a Stream',
      tabs: [
        { name: 'K-th largest', code: J`int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> pq = new PriorityQueue<>();      // min-heap
    for (int x : nums) {
        pq.offer(x);
        if (pq.size() > k) pq.poll();                        // drop smallest
    }
    return pq.peek();
}` },
        { name: 'Top k frequent', code: J`int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> count = new HashMap<>();
    for (int x : nums) count.merge(x, 1, Integer::sum);
    // min-heap by frequency: least frequent on top
    PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> count.get(a) - count.get(b));
    for (int x : count.keySet()) {
        pq.offer(x);
        if (pq.size() > k) pq.poll();
    }
    int[] res = new int[k];
    for (int i = k - 1; i >= 0; i--) res[i] = pq.poll();     // most frequent first
    return res;
}` },
        { name: 'K closest points', code: J`int[][] kClosest(int[][] points, int k) {
    // max-heap by distance: farthest on top, so it gets removed
    PriorityQueue<int[]> pq = new PriorityQueue<>(
        (a, b) -> Integer.compare(b[0] * b[0] + b[1] * b[1], a[0] * a[0] + a[1] * a[1]));
    for (int[] p : points) {
        pq.offer(p);
        if (pq.size() > k) pq.poll();
    }
    return pq.toArray(new int[0][]);
}` }
      ]
    },
    {
      id: 'kway', name: 'K-way merge', intro: 'Each list is sorted. The next smallest overall is one of the current heads. Keep all heads in a min-heap; poll the smallest, then push its successor.',
      start: 'PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);',
      panels: [arr([1, 4, 5], [{i: 0, label: 'head', c: 'a'}], {name: 'list 1', ix: false}), arr([1, 3, 4], [{i: 0, label: 'head', c: 'a'}], {name: 'list 2', ix: false}), arr([2, 6], [{i: 0, label: 'head', c: 'a'}], {name: 'list 3', ix: false})],
      rules: [
        ['Use it when', 'Merge k sorted lists, k-th smallest in a sorted matrix, smallest range covering k lists.'],
        ['Heap size', 'At most k (one item per list), so each step is O(log k).'],
        ['Arrays instead of lists', 'Push `int[]{value, listIndex, indexInList}`.'],
        ['Cost', 'O(N log k) for N total items.']
      ],
      probs: '23 Merge k Sorted Lists, 378 Kth Smallest Element in a Sorted Matrix, 373 Find K Pairs with Smallest Sums, 632 Smallest Range Covering K Lists',
      tabs: [
        { name: 'Merge k lists', code: J`ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);
    for (ListNode head : lists) {
        if (head != null) pq.offer(head);
    }
    ListNode dummy = new ListNode(0), tail = dummy;
    while (!pq.isEmpty()) {
        ListNode node = pq.poll();          // smallest head
        tail.next = node;
        tail = node;
        if (node.next != null) pq.offer(node.next);
    }
    return dummy.next;
}` },
        { name: 'K-th smallest in matrix', code: J`int kthSmallest(int[][] matrix, int k) {
    int n = matrix.length;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]); // {val, row, col}
    for (int r = 0; r < n; r++) pq.offer(new int[]{matrix[r][0], r, 0});
    for (int i = 0; i < k - 1; i++) {
        int[] cur = pq.poll();
        int r = cur[1], c = cur[2];
        if (c + 1 < n) pq.offer(new int[]{matrix[r][c + 1], r, c + 1});
    }
    return pq.peek()[0];
}` }
      ]
    },
    {
      id: 'twoheaps', name: 'Two heaps (running median)', short: 'Two heaps',
      intro: 'Split numbers into a low half (max-heap) and a high half (min-heap). Keep sizes equal or the low half one bigger. The median is at the tops.',
      start: 'PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());  PriorityQueue<Integer> high = new PriorityQueue<>();',
      panels: [{ type: 'tree', name: 'low (max-heap)', vals: [5, 2, 3], cls: {0: 'on-l'} }, { type: 'tree', name: 'high (min-heap)', vals: [7, 9], cls: {0: 'on-r'} }],
      rules: [
        ['Use it when', 'Median from a data stream, sliding window median, IPO-style "best affordable" choices.'],
        ['Add', 'Push to `low`, move `low`\'s top to `high`, then if `high` is bigger move its top back. Keeps order and balance.'],
        ['Median', 'Odd count: `low.peek()`. Even: `(low.peek() + high.peek()) / 2.0`.']
      ],
      probs: '295 Find Median from Data Stream, 480 Sliding Window Median, 502 IPO',
      tabs: [
        { name: 'Median finder', code: J`class MedianFinder {
    private PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
    private PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap

    void addNum(int num) {
        low.offer(num);
        high.offer(low.poll());              // biggest of low moves up
        if (high.size() > low.size()) {
            low.offer(high.poll());          // keep low >= high in size
        }
    }

    double findMedian() {
        if (low.size() > high.size()) return low.peek();
        return (low.peek() + high.peek()) / 2.0;
    }
}` }
      ]
    },
    {
      id: 'schedule', name: 'Sort + heap scheduling', short: 'Scheduling',
      intro: 'Sort events by start time. A min-heap of end times tells you the earliest moment a resource frees up.',
      start: 'Arrays.sort(intervals, (a, b) -> a[0] - b[0]);  PriorityQueue<Integer> ends = new PriorityQueue<>();',
      panels: [{ type: 'text', name: 'meetings', text: '[0,30]  [5,10]  [15,20]  →  2 rooms' }],
      rules: [
        ['Use it when', 'Meeting rooms II, task scheduler, single-threaded CPU, car pooling, furthest building.'],
        ['Free a room', '`if (!ends.isEmpty() && ends.peek() <= start) ends.poll();`'],
        ['Answer', 'Most rooms in use at once = max heap size.']
      ],
      probs: '253 Meeting Rooms II, 621 Task Scheduler, 1834 Single-Threaded CPU, 1642 Furthest Building You Can Reach',
      tabs: [
        { name: 'Meeting rooms II', code: J`int minMeetingRooms(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);       // by start
    PriorityQueue<Integer> ends = new PriorityQueue<>(); // end times of busy rooms
    for (int[] m : intervals) {
        if (!ends.isEmpty() && ends.peek() <= m[0]) {
            ends.poll();                                 // reuse that room
        }
        ends.offer(m[1]);
    }
    return ends.size();
}` },
        { name: 'Last stone weight', code: J`int lastStoneWeight(int[] stones) {
    PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());
    for (int s : stones) pq.offer(s);
    while (pq.size() > 1) {
        int a = pq.poll(), b = pq.poll();               // two heaviest
        if (a != b) pq.offer(a - b);
    }
    return pq.isEmpty() ? 0 : pq.peek();
}` }
      ]
    }
  ],

  javaUsed: [
    ['new PriorityQueue<>()', 'Min-heap: smallest on top.', 'Works for Integer, String, anything Comparable.'],
    ['new PriorityQueue<>(Collections.reverseOrder())', 'Max-heap for Integer.', 'Or `(a, b) -> b - a`.'],
    ['new PriorityQueue<>((a, b) -> a[0] - b[0])', 'Heap of int[] ordered by first field.', 'Lambda comparator: negative means a comes first.'],
    ['Integer.compare(a, b)', 'Overflow-safe comparison.', 'Prefer it over `a - b` when values can be huge or negative.'],
    ['Comparator.comparingInt(a -> a[1])', 'Build a comparator from a key.', 'Chain: `.thenComparingInt(a -> a[0])`, `.reversed()`.'],
    ['pq.offer(x) / pq.poll() / pq.peek()', 'Insert O(log n) / remove top O(log n) / look at top O(1).', '`poll` and `peek` return null when empty.'],
    ['pq.size() / pq.isEmpty()', 'Size checks.', '`if (pq.size() > k) pq.poll();`'],
    ['pq.toArray(new int[0][])', 'Copy the heap into an array.', 'Order is heap order, not sorted.'],
    ['count.get(a) - count.get(b)', 'Comparator that reads from a map.', 'Lambdas can use outside variables if they are effectively final.']
  ],
  concepts: [
    { name: 'Comparator in one sentence', text: 'A comparator returns a negative number when `a` should come out of the heap first, positive when `b` should, and 0 for a tie. `(a, b) -> a - b` is ascending (min-heap); `(a, b) -> b - a` is descending (max-heap).' },
    { name: 'Why a - b can be wrong', text: 'If `a = 2_000_000_000` and `b = -2_000_000_000`, `a - b` overflows to a negative number and the order flips. Use `Integer.compare(a, b)` when values can be large.', code: J`PriorityQueue<int[]> pq = new PriorityQueue<>((x, y) -> Integer.compare(x[0], y[0]));` },
    { name: 'A heap is not sorted', text: 'Printing or iterating a PriorityQueue shows heap order, not sorted order. Only `poll()` gives items in order.' },
    { name: 'Heap vs sort vs TreeMap', text: 'Need only the min/max repeatedly while items arrive? Heap. Need everything in order once? Sort. Need to remove arbitrary items or find floor/ceiling? `TreeMap` / `TreeSet`.' }
  ],
  loops: [
    ['`for (int x : nums) { pq.offer(x); if (pq.size() > k) pq.poll(); }`', 'Keep only k items.', 'Top K'],
    ['`while (!pq.isEmpty()) { var cur = pq.poll(); ... }`', 'Process in priority order.', 'K-way merge, Dijkstra'],
    ['`while (pq.size() > 1)`', 'Combine two items until one is left.', 'Last stone, connect ropes']
  ],
  movesTitle: 'Heap moves',
  moves: [
    ['`pq.offer(x);`', 'Add, O(log n)', 'Everywhere'],
    ['`if (pq.size() > k) pq.poll();`', 'Drop the worst of the kept items', 'Top K'],
    ['`pq.offer(node.next);`', 'Replace a polled head with its successor', 'K-way merge'],
    ['`high.offer(low.poll());`', 'Move the top across heaps', 'Median'],
    ['`if (ends.peek() <= start) ends.poll();`', 'Free a finished resource', 'Meeting rooms']
  ],
  bugs: [
    ['Wrong heap direction', 'Using a max-heap for "k largest" keeps the smallest items.', 'k largest → min-heap, k smallest → max-heap.'],
    ['Comparator overflow', '`a - b` with huge or negative values.', '`Integer.compare(a, b)`.'],
    ['Expecting sorted iteration', '`for (int x : pq)` is not in order.', 'poll repeatedly.'],
    ['Null from poll/peek', 'Empty heap returns null; unboxing crashes.', 'check `isEmpty()` first.'],
    ['Pushing null nodes', 'Comparator calls `.val` on null.', '`if (head != null) pq.offer(head);`'],
    ['Integer median division', '`(a + b) / 2` drops the .5.', 'divide by `2.0`.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-kth', title: 'K-th largest element', ask: 'Min-heap of size k.', code: J`int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> pq = new [[PriorityQueue<>()]];
    for (int x : nums) {
        pq.[[offer|add]](x);
        if (pq.[[size()]] > k) pq.[[poll()]];
    }
    return pq.[[peek()]];
}` },
      { id: 'fb-closest', title: 'K closest points (max-heap)', ask: 'Farthest point on top so it is the one removed.', code: J`int[][] kClosest(int[][] points, int k) {
    PriorityQueue<int[]> pq = new PriorityQueue<>(
        (a, b) -> Integer.compare([[b[0] * b[0] + b[1] * b[1]]], a[0] * a[0] + a[1] * a[1]));
    for (int[] p : points) {
        pq.offer(p);
        if (pq.size() > [[k]]) pq.poll();
    }
    return pq.toArray(new int[0][]);
}` },
      { id: 'fb-mergek', title: 'Merge k sorted lists', ask: 'Heap of current heads ordered by value.', code: J`ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> [[a.val - b.val|Integer.compare(a.val, b.val)]]);
    for (ListNode h : lists) if (h [[!= null]]) pq.offer(h);
    ListNode dummy = new ListNode(0), tail = dummy;
    while (!pq.[[isEmpty()]]) {
        ListNode node = pq.poll();
        tail.next = node;
        tail = node;
        if (node.next != null) pq.offer([[node.next]]);
    }
    return dummy.next;
}` }
    ],
    order: [
      { id: 'od-topk', title: 'Top k frequent elements',
        ideaSteps: ['Count each number with a map.', 'Make a min-heap ordered by count (least frequent on top).', 'Push each distinct number; if the heap has more than k, poll.', 'Poll everything into the result array.'],
        lines: [
          'Map<Integer, Integer> count = new HashMap<>();',
          'for (int x : nums) count.merge(x, 1, Integer::sum);',
          'PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> count.get(a) - count.get(b));',
          'for (int x : count.keySet()) {',
          '    pq.offer(x);',
          '    if (pq.size() > k) pq.poll();',
          '}',
          'int[] res = new int[k];',
          'for (int i = 0; i < k; i++) res[i] = pq.poll();',
          'return res;'
        ],
        extra: ['PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> count.get(b) - count.get(a));'],
        wrap: 'int[] topKFrequent(int[] nums, int k) {\n@@\n}' },
      { id: 'od-rooms', title: 'Meeting rooms II',
        ideaSteps: ['Sort meetings by start time.', 'Min-heap of end times of rooms in use.', 'For each meeting: if the earliest-ending room is free by its start, reuse it (poll).', 'Add this meeting\'s end time.', 'Rooms needed = heap size.'],
        lines: [
          'Arrays.sort(intervals, (a, b) -> a[0] - b[0]);',
          'PriorityQueue<Integer> ends = new PriorityQueue<>();',
          'for (int[] m : intervals) {',
          '    if (!ends.isEmpty() && ends.peek() <= m[0]) ends.poll();',
          '    ends.offer(m[1]);',
          '}',
          'return ends.size();'
        ],
        wrap: 'int minMeetingRooms(int[][] intervals) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['1046', 'Last Stone Weight'], ['703', 'Kth Largest Element in a Stream'], ['215', 'Kth Largest Element in an Array'], ['347', 'Top K Frequent Elements']],
    next: [['973', 'K Closest Points to Origin'], ['23', 'Merge k Sorted Lists'], ['378', 'Kth Smallest Element in a Sorted Matrix'], ['253', 'Meeting Rooms II'], ['621', 'Task Scheduler'], ['295', 'Find Median from Data Stream'], ['767', 'Reorganize String']]
  }
});
})();
