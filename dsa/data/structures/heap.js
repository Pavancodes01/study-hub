(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
// Binary min-heap in an array, recording the path each sift takes.
function up(h, i, path){ path.push(i); while (i > 0){ var p = (i - 1) >> 1; if (h[p] <= h[i]) break; var t = h[p]; h[p] = h[i]; h[i] = t; i = p; path.push(i); } return i; }
function down(h, i, path){
  path.push(i);
  for (;;){ var l = 2 * i + 1, r = l + 1, m = i; if (l < h.length && h[l] < h[m]) m = l; if (r < h.length && h[r] < h[m]) m = r; if (m === i) return i; var t = h[m]; h[m] = h[i]; h[i] = t; i = m; path.push(i); }
}
function panels(h, cls, label){
  var c = {}; for (var k in cls) c[k] = cls[k];
  if (h.length && !c[0]) c[0] = 'on-l';
  var marks = h.length ? [{ i: 0, label: 'peek', c: 'l' }] : [];
  return [{ type: 'tree', name: label || 'the tree you picture', vals: h.slice(), cls: c }, arr(h.slice(), marks, { name: 'the array Java stores (parent of i is (i-1)/2)', cls: c })];
}
function pathCls(path){ var c = {}; path.forEach(function(i){ c[i] = 'on-a'; }); if (path.length) c[path[path.length - 1]] = 'on-hit'; return c; }

registerStructure({
  slug: 'heap', order: 10, group: 'tree', title: 'Heap / PriorityQueue',
  oneLiner: 'Always hands you the **smallest** item (or largest, with a comparator) in O(1), and adds or removes in O(log n). It is a binary tree packed into an array, kept only "half sorted": every parent ≤ its children.',
  legend: [['l', 'root = smallest'], ['a', 'sift path'], ['hit', 'where it settled']],
  compare: { access: 'O(1) min', search: 'O(n)', insert: 'O(log n)', remove: 'O(log n) min', ordered: 'only the top', space: 'O(n)', java: 'PriorityQueue', note: 'min (or max) on top' },
  idea: [
    'A heap is a **complete binary tree**: every level is full except maybe the last, which fills left to right. Because there are no gaps, it fits in a plain array: the children of index `i` are `2i + 1` and `2i + 2`, and the parent is `(i - 1) / 2`. No node objects, no pointers.',
    'The only rule (min-heap): **each parent is ≤ its children**. So the root, `a[0]`, is the smallest. Siblings are in no particular order; the heap is not sorted.',
    '`offer` puts the new item at the end, then **sifts it up**, swapping with its parent while it is smaller. `poll` takes the root, moves the last item to the root, then **sifts it down**, swapping with the smaller child. Each sift walks one root-to-leaf path: at most log₂ n swaps.'
  ],
  anatomy: {
    title: 'Same heap, two pictures',
    panels: [
      { type: 'tree', name: 'tree view', vals: [1, 3, 2, 7, 4, 5, 8], cls: { 0: 'on-l', 1: 'on-a', 2: 'on-a' } },
      arr([1, 3, 2, 7, 4, 5, 8], [{ i: 0, label: 'root', c: 'l' }, { i: 1, label: '2·0+1', c: 'a' }, { i: 2, label: '2·0+2', c: 'a' }], { name: 'array view', cls: { 0: 'on-l', 1: 'on-a', 2: 'on-a' } })
    ],
    notes: [
      'Children of `a[0]` are `a[1]` and `a[2]`. Children of `a[1]` are `a[3]` and `a[4]`.',
      '7 sits below 3 and 5 sits below 2, but 7 > 5: the heap does not care about cousins. That is why it is cheaper than keeping everything sorted.',
      'A heap of 1,000,000 items is only 20 levels deep, so a sift is at most about 20 swaps.'
    ]
  },
  demo: {
    title: 'poll(): take the root, sift down',
    sub: 'Min-heap `[1, 3, 2, 7, 4, 5, 8]`. Remove the smallest and repair the heap.',
    code: [
      'int top = a[0];',
      'a[0] = a[--size];               // last item jumps to the root',
      'int i = 0;',
      'while (has a child smaller than a[i]) {',
      '    int m = index of the smaller child;',
      '    swap(i, m);',
      '    i = m;',
      '}',
      'return top;'
    ],
    steps: function(){
      var h = [1, 3, 2, 7, 4, 5, 8], out = [];
      out.push({ panels: panels(h, {}), line: 0, vars: { size: 7, top: 1 }, msg: 'The answer is the root, **1**. The hard part is filling the hole without breaking the rule.' });
      var last = h.pop(); h[0] = last;
      out.push({ panels: panels(h, { 0: 'on-r' }), line: 1, vars: { size: 6 }, msg: 'Move the last item, ' + last + ', into the root. The tree shape is still complete, but 8 is too big for the top.' });
      var i = 0;
      for (;;){
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < h.length && h[l] < h[m]) m = l;
        if (r < h.length && h[r] < h[m]) m = r;
        if (m === i) break;
        var cl = {}; cl[i] = 'on-r'; cl[m] = 'on-a';
        out.push({ panels: panels(h, cl), line: [3, 4], vars: { i: i, smallerChild: h[m] }, msg: 'Children of index ' + i + ': ' + [l < h.length ? h[l] : '–', r < h.length ? h[r] : '–'].join(' and ') + '. The smaller is **' + h[m] + '**, and it is smaller than ' + h[i] + ', so swap.' });
        var t = h[m]; h[m] = h[i]; h[i] = t; i = m;
      }
      var fc = {}; fc[i] = 'on-hit';
      out.push({ panels: panels(h, fc), line: 8, ok: true, vars: { swaps: 2 }, msg: '8 has no smaller child now, so it stays. Heap restored: `[' + h.join(', ') + ']`. Two swaps for 6 items: O(log n).' });
      return out;
    }
  },
  play: {
    title: 'Min-heap playground',
    hint: 'A `PriorityQueue<Integer>`. Offer a few numbers and watch them sift up; poll and watch the last item sift down. The tree and the array are the same data.',
    setup: 'PriorityQueue<Integer> pq = new PriorityQueue<>();',
    start: 'Empty heap.',
    init: function(){ return { h: [] }; },
    ops: [
      { id: 'offer', label: 'offer(v)', args: 1, cost: 'O(log n)', run: function(s, x){
        s.h.push(x); var path = []; var at = up(s.h, s.h.length - 1, path);
        var sw = path.length - 1;
        return { java: 'pq.offer(' + x + ');', hl: { path: path }, msg: 'Added at index ' + (s.h.length - 1) + ', then sifted up ' + sw + ' time' + (sw === 1 ? '' : 's') + '. It settled at index ' + at + (at === 0 ? ': the new minimum.' : '.') };
      } },
      { id: 'poll', label: 'poll()', cost: 'O(log n)', run: function(s){
        if (!s.h.length) return { java: 'pq.poll();', ret: 'null', msg: 'Empty: `poll()` returns `null`.' };
        var top = s.h[0], last = s.h.pop(), path = [], at = 0;
        if (s.h.length){ s.h[0] = last; at = down(s.h, 0, path); }
        return { java: 'pq.poll();', ret: top, hl: { path: path }, msg: 'Removed **' + top + '**. ' + (s.h.length ? last + ' moved to the root and sifted down ' + (path.length - 1) + ' level(s) to index ' + at + '.' : 'Heap is empty now.') };
      } },
      { id: 'peek', label: 'peek()', cost: 'O(1)', run: function(s){
        return { java: 'pq.peek();', ret: s.h.length ? s.h[0] : 'null', hl: { path: s.h.length ? [0] : [] }, msg: s.h.length ? 'Just `a[0]`: **' + s.h[0] + '**. No searching.' : 'Empty: returns `null`.' };
      } },
      { id: 'size', label: 'size()', cost: 'O(1)', run: function(s){ return { java: 'pq.size();', ret: s.h.length, msg: 'Size ' + s.h.length + '.' }; } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 6; i++) o.push(['offer', rnd(1, 99)]); return o; },
    view: function(s, hl){ return panels(s.h, pathCls(hl.path || [])); }
  },
  ops: [
    ['Look at the min', 'pq.peek()', 'O(1)', 'It is always `a[0]`.'],
    ['Add', 'pq.offer(x)', 'O(log n)', 'Append, then sift up one path.'],
    ['Remove the min', 'pq.poll()', 'O(log n)', 'Last item to root, sift down one path.'],
    ['Build from n items', 'new PriorityQueue<>(collection)', 'O(n)', 'Heapify bottom-up is cheaper than n offers.'],
    ['Remove / find any item', 'pq.remove(x), pq.contains(x)', 'O(n)', 'Only the root is easy to find; the rest needs a scan.'],
    ['Iterate', 'for (int x : pq)', 'O(n)', 'Array order: **not** sorted.']
  ],
  when: ['k largest / smallest', 'k-th element', 'merge k sorted lists', 'always process the cheapest next', 'Dijkstra / Prim', 'running median (two heaps)', 'scheduling by time or priority'],
  whenNot: [
    ['Everything in sorted order once', 'Sort the array: O(n log n), simpler', 'array'],
    ['Remove or update arbitrary items, or need both min and max', 'TreeMap / TreeSet', 'bst-treemap'],
    ['Oldest first', 'Queue (ArrayDeque)', 'queue-deque'],
    ['Lookup by key', 'HashMap', 'hashmap']
  ],
  classes: [
    ['PriorityQueue<E>', 'Binary min-heap. Pass a comparator for anything else.'],
    ['new PriorityQueue<>(Collections.reverseOrder())', 'Max-heap.'],
    ['TreeSet / TreeMap', 'When you also need to delete arbitrary items or peek both ends.']
  ],
  api: [
    { name: 'Min-heap', code: J`PriorityQueue<Integer> pq = new PriorityQueue<>();
for (int x : new int[]{5, 1, 8, 3, 2}) pq.offer(x);
System.out.println(pq.peek() + " size " + pq.size());
StringBuilder sb = new StringBuilder();
while (!pq.isEmpty()) sb.append(pq.poll()).append(' ');
System.out.println(sb.toString().trim());`, out: `1 size 5
1 2 3 5 8`, note: 'Polling everything out gives sorted order. That is heap sort: O(n log n).' },
    { name: 'Max-heap', code: J`PriorityQueue<Integer> max = new PriorityQueue<>(Collections.reverseOrder());
max.addAll(List.of(5, 1, 8, 3));
System.out.println(max.poll() + " " + max.poll());
PriorityQueue<Integer> max2 = new PriorityQueue<>((a, b) -> Integer.compare(b, a));
max2.addAll(List.of(5, 1, 8, 3));
System.out.println(max2.peek());`, out: `8 5
8` },
    { name: 'Not sorted inside', code: J`PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(5, 1, 8, 3, 2));
System.out.println(pq);                              // the array, NOT sorted order
System.out.println(pq.contains(8) + " " + pq.remove(Integer.valueOf(8)) + " " + pq);`, out: `[1, 2, 8, 3, 5]
true true [1, 2, 5, 3]`, note: 'Printing or iterating shows the internal array. Only `poll` gives items in order.' },
    { name: 'Custom priority', code: J`record Task(String name, int priority) {}
PriorityQueue<Task> pq = new PriorityQueue<>(
    Comparator.comparingInt(Task::priority).thenComparing(Task::name));
pq.offer(new Task("write", 2));
pq.offer(new Task("deploy", 1));
pq.offer(new Task("test", 2));
while (!pq.isEmpty()) System.out.println(pq.poll());`, out: `Task[name=deploy, priority=1]
Task[name=test, priority=2]
Task[name=write, priority=2]`, note: 'Tie-break with `thenComparing` so the order is fully defined.' },
    { name: 'Two heaps: median', code: J`PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());  // max-heap: smaller half
PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap: bigger half
StringBuilder sb = new StringBuilder();
for (int x : new int[]{5, 15, 1, 3}) {
    low.offer(x);
    high.offer(low.poll());                         // biggest of the low half moves up
    if (high.size() > low.size()) low.offer(high.poll());
    double median = low.size() > high.size() ? low.peek() : (low.peek() + high.peek()) / 2.0;
    sb.append(median).append(' ');
}
System.out.println(sb.toString().trim());`, out: `5.0 10.0 5.0 4.0`, note: 'The two tops are the middle of the data. Each new number costs O(log n).' }
  ],
  build: {
    intro: 'A min-heap of ints on a growable array. Everything is index arithmetic plus two loops: sift up and sift down.',
    code: J`class MinHeap {
    private int[] a = new int[8];
    private int size = 0;

    void offer(int x) {
        if (size == a.length) a = Arrays.copyOf(a, size * 2);
        a[size] = x;
        siftUp(size++);
    }

    int peek() { return a[0]; }

    int poll() {
        int top = a[0];
        a[0] = a[--size];               // last item jumps to the root
        siftDown(0);
        return top;
    }

    int size() { return size; }

    private void siftUp(int i) {
        while (i > 0) {
            int p = (i - 1) / 2;
            if (a[p] <= a[i]) break;     // parent already smaller: done
            swap(i, p);
            i = p;
        }
    }

    private void siftDown(int i) {
        while (true) {
            int l = 2 * i + 1, r = l + 1, m = i;
            if (l < size && a[l] < a[m]) m = l;
            if (r < size && a[r] < a[m]) m = r;
            if (m == i) return;          // both children bigger: done
            swap(i, m);
            i = m;
        }
    }

    private void swap(int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
}`,
    notes: [
      ['Index math', 'Parent `(i - 1) / 2`, children `2i + 1` and `2i + 2`. Memorize these three.'],
      ['Swap with the smaller child', 'Swapping with the bigger child would put a big value above a small one.'],
      ['Bounds checks', '`l < size` and `r < size` stop at the leaves.'],
      ['Max-heap', 'Flip every `<` and `<=` comparison between items (or store `-x`).']
    ],
    demo: J`MinHeap h = new MinHeap();
for (int x : new int[]{9, 4, 7, 1, 8, 2, 6, 3, 5}) h.offer(x);   // 9 items: grows past 8
StringBuilder sb = new StringBuilder();
while (h.size() > 0) sb.append(h.poll()).append(' ');
System.out.println(sb.toString().trim());`,
    out: `1 2 3 4 5 6 7 8 9`
  },
  gotchas: [
    ['Expecting a sorted print', '`System.out.println(pq)` shows the internal array.', 'Poll items out, or copy and sort.'],
    ['(a, b) -> a - b overflow', 'With values near `Integer.MIN_VALUE`/`MAX_VALUE`, subtraction overflows and the order breaks.', '`Integer.compare(a, b)` or `Comparator.comparingInt(...)`.'],
    ['Max-heap by negating', '`-x` overflows for `Integer.MIN_VALUE`.', 'Use `Collections.reverseOrder()`.'],
    ['Changing an item inside the heap', 'If the field the comparator uses changes, the item is not re-sifted: the heap is now wrong.', 'Remove it, change it, offer it again (or push a new copy and skip stale ones).'],
    ['remove(x) is O(n)', 'Removing an arbitrary item scans the array.', 'Lazy deletion: mark it, skip it when polled. Or use a `TreeMap`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-stones', title: 'Last stone weight', ask: 'Max-heap. Smash the two heaviest; push back the difference.', code: J`int lastStoneWeight(int[] stones) {
    PriorityQueue<Integer> pq = new PriorityQueue<>([[Collections.reverseOrder()|(a, b) -> b - a]]);
    for (int s : stones) pq.offer(s);
    while (pq.[[size()]] > 1) {
        int y = pq.[[poll()]], x = pq.poll();
        if (y != x) pq.offer([[y - x]]);
    }
    return pq.isEmpty() ? 0 : pq.[[peek()]];
}`, test: 'System.out.println(new Sol().lastStoneWeight(new int[]{2, 7, 4, 1, 8, 1}));', out: '1' },
      { id: 'fb-sift', title: 'Sift down', ask: 'Find the smaller child; swap while it is smaller than the parent.', code: J`void siftDown(int[] a, int size, int i) {
    while (true) {
        int l = [[2 * i + 1]], r = l + 1, m = i;
        if (l < size && a[l] < a[m]) m = l;
        if (r < size && a[r] < a[m]) m = r;
        if (m == i) [[return]];
        int t = a[i];
        a[i] = [[a[m]]];
        a[m] = t;
        i = [[m]];
    }
}`, test: 'int[] a = {9, 2, 3, 5, 4}; new Sol().siftDown(a, 5, 0); System.out.println(Arrays.toString(a));', out: '[2, 4, 3, 5, 9]' }
    ],
    order: [
      { id: 'od-mergek', title: 'Merge k sorted arrays',
        ideaSteps: ['Min-heap of `{value, row, col}` ordered by value.', 'Push the first item of every non-empty row.', 'Poll the smallest, add it to the output.', 'If its row has a next item, push that.', 'Repeat until the heap is empty.'],
        lines: [
          'List<Integer> mergeK(int[][] arrs) {',
          '    PriorityQueue<int[]> pq = new PriorityQueue<>((x, y) -> Integer.compare(x[0], y[0]));',
          '    for (int i = 0; i < arrs.length; i++)',
          '        if (arrs[i].length > 0) pq.offer(new int[]{arrs[i][0], i, 0});',
          '    List<Integer> out = new ArrayList<>();',
          '    while (!pq.isEmpty()) {',
          '        int[] t = pq.poll();',
          '        out.add(t[0]);',
          '        int r = t[1], c = t[2] + 1;',
          '        if (c < arrs[r].length) pq.offer(new int[]{arrs[r][c], r, c});',
          '    }',
          '    return out;',
          '}'
        ],
        extra: ['        pq.offer(new int[]{arrs[r][c], r, c});'],
        check: { wrap: 'sol', test: 'System.out.println(new Sol().mergeK(new int[][]{{1, 4, 7}, {2, 5}, {0, 9}}));', out: '[0, 1, 2, 4, 5, 7, 9]' } }
    ]
  },
  patterns: ['heap', 'graphs', 'intervals', 'greedy'],
  patternWhy: {
    heap: 'Top K, k-way merge and two-heap median.',
    graphs: 'Dijkstra pops the closest unvisited node from a heap.',
    intervals: 'Meeting rooms keeps end times in a min-heap.',
    greedy: 'Many greedy choices are "take the cheapest next", which is `poll()`.'
  },
  problems: [['1046', 'Last Stone Weight'], ['703', 'Kth Largest Element in a Stream'], ['215', 'Kth Largest Element in an Array'], ['23', 'Merge k Sorted Lists'], ['295', 'Find Median from Data Stream'], ['621', 'Task Scheduler']]
});
})();
