(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
// Ring buffer state: { buf:[...cap], head, size }. tail = next free slot.
function ringP(s, cls, name){
  var c = {}; if (s.size) c[s.head] = 'on-l';
  for (var k in cls) c[k] = cls[k];
  return { type: 'ring', name: name || 'circular array  (capacity ' + s.buf.length + ', size ' + s.size + ')', vals: s.buf.slice(), head: s.size ? s.head : undefined, tail: s.size === s.buf.length ? undefined : (s.head + s.size) % s.buf.length, cls: c };
}
function order(s){ var o = []; for (var i = 0; i < s.size; i++) o.push(s.buf[(s.head + i) % s.buf.length]); return o; }
function lineP(s){ var o = order(s), m = []; if (o.length){ m.push({ i: 0, label: 'front', c: 'l' }); m.push({ i: o.length - 1, label: 'back', c: 'r' }); } return arr(o, m, { name: 'queue order (front → back)', ix: false }); }
function grow(s){
  var o = order(s), cap = s.buf.length * 2, b = [];
  for (var i = 0; i < cap; i++) b.push(i < o.length ? o[i] : null);
  s.buf = b; s.head = 0;
}
function mk(cap){ var b = []; for (var i = 0; i < cap; i++) b.push(null); return { buf: b, head: 0, size: 0 }; }

registerStructure({
  slug: 'queue-deque', order: 6, group: 'linear', title: 'Queue & Deque',
  oneLiner: 'First in, first out: join at the **back**, leave from the **front**, like a line at a shop. A deque lets you add and remove at both ends. Java\'s `ArrayDeque` does all of it in O(1) with a **circular array**.',
  legend: [['l', 'head (front)'], ['r', 'tail (next free slot)'], ['hit', 'just written']],
  compare: { access: 'O(1) ends', search: 'O(n)', insert: 'O(1) ends', remove: 'O(1) ends', ordered: 'by arrival, oldest first', space: 'O(n)', java: 'ArrayDeque', note: 'both ends' },
  idea: [
    'A queue serves items in the order they arrived. `offer` adds at the back, `poll` takes from the front. That is exactly what BFS needs: explore everything 1 step away before anything 2 steps away.',
    'A plain array would make `poll` slow: removing index 0 shifts everything left. `ArrayDeque` avoids that. It keeps a `head` index and lets the items **wrap around** the end of the array, like seats around a round table.',
    'When `poll` runs, `head` just moves forward one seat. When the back reaches the last slot, the next item goes into slot 0 if it is free. Index math with `% capacity` does the wrapping. Nothing ever shifts.'
  ],
  anatomy: {
    title: 'A line bent into a circle',
    panels: [
      { type: 'ring', name: 'circular array, capacity 8', vals: [7, 8, null, null, null, 4, 5, 6], head: 5, tail: 2, cls: { 5: 'on-l' } },
      arr([4, 5, 6, 7, 8], [{ i: 0, label: 'front', c: 'l' }, { i: 4, label: 'back', c: 'r' }], { name: 'the queue it represents', ix: false })
    ],
    notes: [
      'The front is at index 5. The items continue 6, 7, then **wrap** to 0 and 1.',
      'Index of the i-th item = `(head + i) % capacity`.',
      'When every slot is full, Java allocates a bigger array and copies the items in order, so they start at index 0 again.'
    ]
  },
  demo: {
    title: 'Wrap-around in a ring of 6',
    sub: 'Offer 1–5, poll three, then offer 6–8. Watch the back wrap past the end without moving any item.',
    code: [
      'void offer(int x) {',
      '    buf[tail] = x;',
      '    tail = (tail + 1) % buf.length;   // wrap',
      '    size++;',
      '}',
      'int poll() {',
      '    int x = buf[head];',
      '    head = (head + 1) % buf.length;   // wrap',
      '    size--;',
      '    return x;',
      '}'
    ],
    steps: function(){
      var s = mk(6), out = [];
      function P(c){ return [ringP(s, c, 'ring (capacity 6)'), lineP(s)]; }
      out.push({ panels: P(), line: null, vars: { head: 0, tail: 0, size: 0 }, msg: 'Empty. `head` and `tail` are both 0.' });
      function offer(x){
        var t = (s.head + s.size) % 6; s.buf[t] = x; s.size++;
        var c = {}; c[t] = 'on-hit';
        out.push({ panels: P(c), line: [1, 2], vars: { head: s.head, tail: (s.head + s.size) % 6, size: s.size }, msg: '`offer(' + x + ')` writes slot ' + t + (t === 0 && x > 5 ? ' — it **wrapped** from slot 5 to slot 0' : '') + '.' });
      }
      function poll(){
        var x = s.buf[s.head], h = s.head; s.buf[h] = null; s.head = (s.head + 1) % 6; s.size--;
        out.push({ panels: P(), line: [6, 7], vars: { returned: x, head: s.head, size: s.size }, msg: '`poll()` returns ' + x + ' from slot ' + h + ' and moves `head` to ' + s.head + '. Nothing shifts.' });
      }
      [1, 2, 3, 4, 5].forEach(offer);
      poll(); poll(); poll();
      [6, 7, 8].forEach(offer);
      out.push({ panels: P(), line: null, ok: true, vars: { head: s.head, size: s.size }, msg: 'The queue is **4 5 6 7 8**, stored in slots 3, 4, 5, 0, 1. Every offer and poll was O(1).' });
      return out;
    }
  },
  play: {
    title: 'ArrayDeque playground',
    hint: 'Shown with 8 slots that double when full (the real `ArrayDeque` starts at 16). Use it as a queue (`offer` / `poll`) or both ends.',
    setup: 'Deque<Integer> dq = new ArrayDeque<>();',
    start: 'Empty ring. `head` will appear once there is an item.',
    init: function(){ return mk(8); },
    ops: [
      { id: 'offer', label: 'offer(v)', args: 1, cost: 'O(1)', run: function(s, v){
        var grew = s.size === s.buf.length; if (grew) grow(s);
        var t = (s.head + s.size) % s.buf.length; s.buf[t] = v; s.size++;
        var c = {}; c[t] = 'on-hit';
        return { java: 'dq.offer(' + v + ');', hl: { cls: c }, msg: (grew ? 'Full, so the array doubled and items were copied in order. ' : '') + v + ' joins the **back** at slot ' + t + '.' };
      } },
      { id: 'offerF', label: 'offerFirst(v)', args: 1, cost: 'O(1)', run: function(s, v){
        var grew = s.size === s.buf.length; if (grew) grow(s);
        s.head = (s.head - 1 + s.buf.length) % s.buf.length; s.buf[s.head] = v; s.size++;
        var c = {}; c[s.head] = 'on-hit';
        return { java: 'dq.offerFirst(' + v + ');', hl: { cls: c }, msg: (grew ? 'Doubled first. ' : '') + '`head` steps back one seat (wrapping below 0) to slot ' + s.head + '. ' + v + ' is the new front.' };
      } },
      { id: 'poll', label: 'poll()', cost: 'O(1)', run: function(s){
        if (!s.size) return { java: 'dq.poll();', ret: 'null', msg: 'Empty: `poll()` returns `null` (no exception). `remove()` would throw.' };
        var h = s.head, x = s.buf[h]; s.buf[h] = null; s.head = (s.head + 1) % s.buf.length; s.size--;
        return { java: 'dq.poll();', ret: x, msg: 'Took ' + x + ' from the **front** (slot ' + h + '). `head` moved to ' + s.head + '.' };
      } },
      { id: 'pollL', label: 'pollLast()', cost: 'O(1)', run: function(s){
        if (!s.size) return { java: 'dq.pollLast();', ret: 'null', msg: 'Empty: returns `null`.' };
        var t = (s.head + s.size - 1) % s.buf.length, x = s.buf[t]; s.buf[t] = null; s.size--;
        return { java: 'dq.pollLast();', ret: x, msg: 'Took ' + x + ' from the **back** (slot ' + t + '). Used this way, a deque is a stack.' };
      } },
      { id: 'peek', label: 'peek()', cost: 'O(1)', run: function(s){
        var x = s.size ? s.buf[s.head] : 'null', c = {}; if (s.size) c[s.head] = 'on-a';
        return { java: 'dq.peek();', ret: x, hl: { cls: c }, msg: s.size ? 'Front is ' + x + '. Not removed.' : 'Empty: `peek()` returns `null`.' };
      } }
    ],
    random: function(s, rnd){ return [['offer', rnd(1, 99)], ['offer', rnd(1, 99)], ['offer', rnd(1, 99)], ['poll'], ['offer', rnd(1, 99)], ['offer', rnd(1, 99)]]; },
    view: function(s, hl){ return [ringP(s, hl.cls), lineP(s)]; }
  },
  ops: [
    ['Add at the back', 'q.offer(x)', 'O(1) amortized', 'Write slot `tail`, move `tail` with wrap. Doubles when full.'],
    ['Remove from the front', 'q.poll()', 'O(1)', 'Read slot `head`, move `head` with wrap. Nothing shifts.'],
    ['Look at the front', 'q.peek()', 'O(1)', 'One read.'],
    ['Add / remove at the other end', 'offerFirst, pollLast, peekLast', 'O(1)', 'Same index math in the other direction.'],
    ['Search', 'q.contains(x)', 'O(n)', 'Walks every item.'],
    ['Size', 'q.size()', 'O(1)', 'Stored.']
  ],
  when: ['BFS / shortest path in unweighted graph', 'level order traversal', 'process in arrival order', 'sliding window max / min', 'recent N events', 'task scheduling round-robin', 'both ends (deque)'],
  whenNot: [
    ['Most recent first', 'Stack (same `ArrayDeque`, use push / pop)', 'stack'],
    ['Smallest / highest priority first', 'PriorityQueue', 'heap'],
    ['Access by index', 'ArrayList', 'arraylist'],
    ['Look up items by key', 'HashMap', 'hashmap']
  ],
  classes: [
    ['ArrayDeque<E>', 'Default for queue, stack and deque. Circular array, no nulls.'],
    ['LinkedList<E>', 'Also a `Deque`. Allows `null`, uses more memory, slower.'],
    ['PriorityQueue<E>', 'Not FIFO! Always hands out the smallest item first.'],
    ['ArrayBlockingQueue / LinkedBlockingQueue', 'Thread-safe queues for producer/consumer code.']
  ],
  api: [
    { name: 'Queue', code: J`Queue<Integer> q = new ArrayDeque<>();
q.offer(1);
q.offer(2);
q.offer(3);
System.out.println(q + " peek " + q.peek());
System.out.println(q.poll() + " " + q.poll() + " left " + q);
System.out.println(q.poll() + " then " + q.poll());     // empty: poll returns null`, out: `[1, 2, 3] peek 1
1 2 left [3]
3 then null` },
    { name: 'Deque', code: J`Deque<Integer> dq = new ArrayDeque<>();
dq.offerLast(2);
dq.offerFirst(1);
dq.offerLast(3);
System.out.println(dq + " first " + dq.peekFirst() + " last " + dq.peekLast());
dq.pollLast();
dq.pollFirst();
System.out.println(dq);`, out: `[1, 2, 3] first 1 last 3
[2]` },
    { name: 'Throw vs null', code: J`Queue<Integer> q = new ArrayDeque<>();
System.out.println(q.poll() + " " + q.peek());          // safe: null
try { q.remove(); } catch (NoSuchElementException e) { System.out.println("remove() throws"); }
try { q.element(); } catch (NoSuchElementException e) { System.out.println("element() throws"); }`, out: `null null
remove() throws
element() throws`, note: 'Pairs: `offer`/`add`, `poll`/`remove`, `peek`/`element`. The first of each returns a special value, the second throws.' },
    { name: 'BFS on a grid', code: J`int[][] grid = {
    {0, 0, 1},
    {1, 0, 1},
    {0, 0, 0}
};                                          // 1 = wall
int n = 3;
int[][] dist = new int[n][n];
for (int[] row : dist) Arrays.fill(row, -1);
Deque<int[]> q = new ArrayDeque<>();
q.offer(new int[]{0, 0});
dist[0][0] = 0;
int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
while (!q.isEmpty()) {
    int[] cur = q.poll();
    for (int[] d : dirs) {
        int r = cur[0] + d[0], c = cur[1] + d[1];
        if (r < 0 || c < 0 || r >= n || c >= n || grid[r][c] == 1 || dist[r][c] != -1) continue;
        dist[r][c] = dist[cur[0]][cur[1]] + 1;
        q.offer(new int[]{r, c});
    }
}
System.out.println("steps to bottom-right: " + dist[n - 1][n - 1]);`, out: `steps to bottom-right: 4`, note: 'FIFO order means cells are reached in order of distance, so the first time you see a cell is the shortest way there.' },
    { name: 'Monotonic deque', code: J`int[] a = {1, 3, -1, -3, 5, 3, 6, 7};
int k = 3;
Deque<Integer> dq = new ArrayDeque<>();     // indexes; their values decrease front to back
List<Integer> res = new ArrayList<>();
for (int i = 0; i < a.length; i++) {
    if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();      // slid out of the window
    while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();  // can never be the max again
    dq.offerLast(i);
    if (i >= k - 1) res.add(a[dq.peekFirst()]);
}
System.out.println(res);`, out: `[3, 3, 5, 5, 6, 7]`, note: 'Uses both ends: old indexes leave from the front, useless ones from the back. Sliding window maximum in O(n).' }
  ],
  build: {
    intro: 'A queue on a circular int array. Only `head` and `size` are stored; the back is computed as `(head + size) % length`. Growing "unwraps" the items into a bigger array.',
    code: J`class IntQueue {
    private int[] buf = new int[4];
    private int head = 0, size = 0;            // head = index of the front item

    void offer(int x) {
        if (size == buf.length) grow();
        buf[(head + size) % buf.length] = x;   // slot after the back, wrapping
        size++;
    }

    int poll() {
        if (size == 0) throw new NoSuchElementException();
        int x = buf[head];
        head = (head + 1) % buf.length;
        size--;
        return x;
    }

    int peek() {
        if (size == 0) throw new NoSuchElementException();
        return buf[head];
    }

    int size() { return size; }

    private void grow() {
        int[] nb = new int[buf.length * 2];
        for (int i = 0; i < size; i++) nb[i] = buf[(head + i) % buf.length];   // unwrap
        buf = nb;
        head = 0;
    }
}`,
    notes: [
      ['% does the wrapping', '`(head + size) % length` turns index 4 of a length-4 array back into 0.'],
      ['Why not shift?', 'Shifting on every poll would make it O(n). Moving `head` is O(1).'],
      ['grow() unwraps', 'Copying `Arrays.copyOf(buf, …)` would keep the wrapped order broken. Copy item by item from `head`.']
    ],
    demo: J`IntQueue q = new IntQueue();
for (int i = 1; i <= 3; i++) q.offer(i);      // slots 0, 1, 2
q.poll();
q.poll();                                      // head moves to slot 2
for (int i = 4; i <= 7; i++) q.offer(i);      // wraps to slots 3, 0, 1, then grows
StringBuilder sb = new StringBuilder();
while (q.size() > 0) sb.append(q.poll()).append(' ');
System.out.println(sb.toString().trim());`,
    out: `3 4 5 6 7`
  },
  gotchas: [
    ['PriorityQueue is not FIFO', '`new PriorityQueue<>()` hands out the smallest item, not the oldest.', 'Use `ArrayDeque` for first in, first out.'],
    ['Mixing push and offer', 'On a `Deque`, `push` adds at the **front** and `offer` at the **back**. Mixing them scrambles the order.', 'Queue: `offer` + `poll`. Stack: `push` + `pop`.'],
    ['q.size() changes inside a BFS level', '`for (int i = 0; i < q.size(); i++)` keeps seeing new children.', '`int n = q.size();` before the loop.'],
    ['Null in ArrayDeque', '`offer(null)` throws `NullPointerException`; `poll()` uses `null` to mean "empty".', 'Do not store `null`; use a sentinel.'],
    ['Marking visited too late', 'Marking a cell visited when you **poll** it lets it be added many times.', 'Mark when you **offer** it.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-level', title: 'Level order traversal', ask: 'Take the queue size first: that many nodes are on the current level.', code: J`List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Queue<TreeNode> q = new ArrayDeque<>();
    q.[[offer|add]](root);
    while (!q.isEmpty()) {
        int n = [[q.size()]];                   // nodes on this level
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            TreeNode node = q.[[poll()|remove()]];
            level.add(node.val);
            if (node.left != null) q.offer([[node.left]]);
            if (node.right != null) q.offer(node.right);
        }
        res.add(level);
    }
    return res;
}`, test: 'TreeNode r = new TreeNode(3, new TreeNode(9), new TreeNode(20, new TreeNode(15), new TreeNode(7))); System.out.println(new Sol().levelOrder(r));', out: '[[3], [9, 20], [15, 7]]' },
      { id: 'fb-twostacks', title: 'Queue from two stacks', ask: 'Push into `in`. When `out` is empty, pour all of `in` into it: that reverses the order.', wrap: 'top', code: J`class MyQueue {
    Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
    void push(int x) { in.push(x); }
    int pop() { move(); return out.[[pop()]]; }
    int peek() { move(); return out.[[peek()]]; }
    boolean empty() { return in.isEmpty() && out.isEmpty(); }
    private void move() {
        if (out.[[isEmpty()]])
            while (!in.isEmpty()) out.push(in.[[pop()]]);
    }
}`, test: 'MyQueue q = new MyQueue(); q.push(1); q.push(2); System.out.print(q.peek() + " "); System.out.print(q.pop() + " "); q.push(3); System.out.println(q.pop() + " " + q.pop() + " " + q.empty());', out: '1 1 2 3 true' }
    ],
    order: [
      { id: 'od-movavg', title: 'Moving average of the last N values',
        ideaSteps: ['Keep the last N values in a queue, plus their running sum.', 'On each new value, offer it and add it to the sum.', 'If the queue is now longer than N, poll the oldest and subtract it.', 'Return sum divided by the queue size.'],
        lines: [
          'class MovingAverage {',
          '    private final Queue<Integer> q = new ArrayDeque<>();',
          '    private final int size;',
          '    private double sum = 0;',
          '    MovingAverage(int size) { this.size = size; }',
          '    double next(int val) {',
          '        q.offer(val);',
          '        sum += val;',
          '        if (q.size() > size) sum -= q.poll();',
          '        return sum / q.size();',
          '    }',
          '}'
        ],
        extra: ['        if (q.size() > size) sum -= q.peek();'],
        check: { wrap: 'top', test: 'MovingAverage m = new MovingAverage(3); System.out.println(m.next(1) + " " + m.next(10) + " " + m.next(3) + " " + m.next(5));', out: '1.0 5.5 4.666666666666667 6.0' } }
    ]
  },
  patterns: ['graphs', 'trees', 'sliding-window'],
  patternWhy: {
    graphs: 'BFS and topological sort (Kahn) run on a queue.',
    trees: 'Level order traversal processes one level at a time from a queue.',
    'sliding-window': 'Window max / min keeps a monotonic deque.'
  },
  problems: [['232', 'Implement Queue using Stacks'], ['933', 'Number of Recent Calls'], ['102', 'Binary Tree Level Order Traversal'], ['994', 'Rotting Oranges'], ['239', 'Sliding Window Maximum'], ['641', 'Design Circular Deque']]
});
})();
