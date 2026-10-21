(function(){
var J = String.raw;
function list(vals, marks, extra){ var p = { type: 'list', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
function ends(n){ var m = []; if (n){ m.push({ i: 0, label: 'head', c: 'l' }); m.push({ i: n - 1, label: 'tail', c: 'r' }); } return m; }
// Java's LinkedList.get(i) walks from whichever end is closer.
function walk(n, i){ var out = []; if (i < (n >> 1)) for (var k = 0; k <= i; k++) out.push(k); else for (var j = n - 1; j >= i; j--) out.push(j); return out; }
function oob(i, n){ return '`IndexOutOfBoundsException: Index: ' + i + ', Size: ' + n + '`.'; }

registerStructure({
  slug: 'linked-list', order: 4, group: 'linear', title: 'Linked List',
  oneLiner: 'Items live in separate **nodes** anywhere in memory; each node points to the next. Adding or removing at a node you already hold is O(1), but reaching the i-th node means walking: O(n).',
  legend: [['l', 'head'], ['r', 'tail'], ['a', 'walked past'], ['hit', 'target']],
  compare: { access: 'O(n)', search: 'O(n)', insert: 'O(1) at ends', remove: 'O(1) at ends', ordered: 'by links', space: 'O(n) + 2 refs per node', java: 'LinkedList', note: 'no indexing' },
  idea: [
    'An array is one block. A linked list is a chain: each **node** is its own small object holding a value and a reference to the next node. The nodes can be scattered anywhere in memory.',
    'There is no address arithmetic, so `get(5)` must start at the head and follow 5 links. That is O(n).',
    'In exchange, you never shift anything. To insert after a node, make a new node and rewire two references. To delete, point the previous node past it. Both O(1) once you are there.',
    'Java\'s `LinkedList` is **doubly** linked (each node also points back) and keeps both `first` and `last`, so all four end operations are O(1).'
  ],
  anatomy: {
    title: 'Nodes are scattered, links hold them together',
    panels: [
      list([3, 8, 1], ends(3), { name: 'what you draw', nulls: true }),
      { type: 'refs', name: 'what is in memory', rows: [
        { name: 'head', val: '@5120 { val 3, next @1032 }', cls: 'on-l' },
        { name: '', val: '@1032 { val 8, next @7744 }' },
        { name: 'tail', val: '@7744 { val 1, next null }', cls: 'on-r' }
      ] }
    ],
    notes: [
      'The addresses jump around. That is why scanning a linked list is slower than scanning an array, even though both are O(n): the CPU cache cannot help.',
      'Each node costs extra memory for its references and object header. A `LinkedList<Integer>` uses several times more memory than an `int[]`.',
      'The last node\'s `next` is `null`. Every loop over a list ends with `cur != null`.'
    ]
  },
  demo: {
    title: 'Reverse a list by flipping links',
    sub: 'Three references walk the chain: `prev`, `cur` and `next`. Each step flips one arrow.',
    code: [
      'ListNode prev = null, cur = head;',
      'while (cur != null) {',
      '    ListNode next = cur.next;   // save the rest',
      '    cur.next = prev;            // flip the arrow',
      '    prev = cur;                 // move both forward',
      '    cur = next;',
      '}',
      'return prev;                    // new head'
    ],
    steps: function(){
      var rest = [1, 2, 3, 4], done = [], out = [];
      function P(hiRest){ return [list(done.slice(), done.length ? [{ i: 0, label: 'prev', c: 'hit' }] : [], { name: 'reversed so far (prev)', nulls: true }), list(rest.slice(), rest.length ? [{ i: 0, label: 'cur', c: 'a' }].concat(rest.length > 1 && hiRest ? [{ i: 1, label: 'next', c: 'l' }] : []) : [], { name: 'still to do (cur)', nulls: true })]; }
      out.push({ panels: P(false), line: 0, vars: { prev: 'null', cur: 1 }, msg: 'Start with `prev = null`: the new tail must point to nothing.' });
      while (rest.length){
        var c = rest[0];
        out.push({ panels: P(true), line: 2, vars: { cur: c, next: rest[1] === undefined ? 'null' : rest[1] }, msg: 'Save `next = cur.next` first. If we flip the arrow before saving, we lose the rest of the list.' });
        rest.shift(); done.unshift(c);
        out.push({ panels: P(false), line: [3, 4, 5], vars: { prev: c, cur: rest[0] === undefined ? 'null' : rest[0] }, msg: '`cur.next = prev` flips ' + c + '\'s arrow backwards. Then `prev` and `cur` both step forward.' });
      }
      out.push({ panels: P(false), line: 7, ok: true, vars: { prev: done[0] }, msg: '`cur` is null, so stop. `prev` is the new head: **4 → 3 → 2 → 1**. O(n) time, O(1) extra space.' });
      return out;
    }
  },
  play: {
    title: 'LinkedList playground',
    hint: 'A doubly linked list, like `java.util.LinkedList`. Ends are O(1). `get(i)` and `add(i, v)` have to **walk**: count the highlighted nodes.',
    inputs: [{ ph: 'value', type: 'number' }, { ph: 'index', type: 'number' }],
    setup: 'LinkedList<Integer> list = new LinkedList<>();',
    start: 'Empty list: `first` and `last` are both null.',
    init: function(){ return { a: [] }; },
    ops: [
      { id: 'addL', label: 'addLast(v)', args: 1, use: [0], cost: 'O(1)', run: function(s, v){
        s.a.push(v); var c = {}; c[s.a.length - 1] = 'on-hit new';
        return { java: 'list.addLast(' + v + ');', hl: { cls: c }, msg: 'New node linked after `last`. Two references set, nothing walked.' };
      } },
      { id: 'addF', label: 'addFirst(v)', args: 1, use: [0], cost: 'O(1)', run: function(s, v){
        s.a.unshift(v);
        return { java: 'list.addFirst(' + v + ');', hl: { cls: { 0: 'on-hit new' } }, msg: 'New node linked before `first`. Nothing shifted: compare with `ArrayList.add(0, x)`.' };
      } },
      { id: 'rmF', label: 'removeFirst()', cost: 'O(1)', run: function(s){
        if (!s.a.length) return { err: '`removeFirst()` on an empty list throws `NoSuchElementException`.' };
        var v = s.a.shift();
        return { java: 'list.removeFirst();', ret: v, msg: '`first` now points at the second node. ' + v + ' is unlinked and becomes garbage.' };
      } },
      { id: 'rmL', label: 'removeLast()', cost: 'O(1)', run: function(s){
        if (!s.a.length) return { err: '`removeLast()` on an empty list throws `NoSuchElementException`.' };
        var v = s.a.pop();
        return { java: 'list.removeLast();', ret: v, msg: 'O(1) because each node has a `prev` link: `last = last.prev`.' };
      } },
      { id: 'get', label: 'get(i)', args: 1, use: [1], cost: 'O(n)', run: function(s, i){
        if (i < 0 || i >= s.a.length) return { err: '`get(' + i + ')` throws ' + oob(i, s.a.length) };
        var w = walk(s.a.length, i), c = {};
        w.forEach(function(k){ c[k] = 'on-a'; }); c[i] = 'on-hit';
        return { java: 'list.get(' + i + ');', ret: s.a[i], hl: { cls: c }, msg: 'Walked **' + w.length + '** node' + (w.length === 1 ? '' : 's') + ' from the ' + (i < (s.a.length >> 1) ? 'front' : 'back') + ' (Java starts from the closer end). Value ' + s.a[i] + '.' };
      } },
      { id: 'addAt', label: 'add(i, v)', args: 2, use: [1, 0], cost: 'O(n)', run: function(s, i, v){
        if (i < 0 || i > s.a.length) return { err: '`add(' + i + ', ' + v + ')` throws ' + oob(i, s.a.length) };
        var w = i === s.a.length ? [] : walk(s.a.length, i);
        s.a.splice(i, 0, v);
        var c = {}; w.forEach(function(k){ c[k >= i ? k + 1 : k] = 'on-a'; }); c[i] = 'on-hit new';
        return { java: 'list.add(' + i + ', ' + v + ');', hl: { cls: c }, msg: 'Walked ' + w.length + ' node(s) to find the spot, then linked the new node in with **4 reference changes**. The walking is the expensive part.' };
      } },
      { id: 'rmV', label: 'remove(Integer v)', args: 1, use: [0], cost: 'O(n)', run: function(s, v){
        var i = s.a.indexOf(v), c = {};
        if (i < 0){ s.a.forEach(function(_, k){ c[k] = 'on-a'; }); return { java: 'list.remove(Integer.valueOf(' + v + '));', ret: false, hl: { cls: c }, msg: 'Walked the whole list and did not find ' + v + '.' }; }
        s.a.splice(i, 1);
        for (var k = 0; k < i; k++) c[k] = 'on-a';
        return { java: 'list.remove(Integer.valueOf(' + v + '));', ret: true, hl: { cls: c }, msg: 'Walked to ' + v + ', then `prev.next = node.next` and `next.prev = node.prev`. No shifting.' };
      } }
    ],
    random: function(s, rnd){ return [['addL', rnd(1, 99)], ['addL', rnd(1, 99)], ['addF', rnd(1, 99)], ['addL', rnd(1, 99)], ['addL', rnd(1, 99)]]; },
    view: function(s, hl){ return [{ type: 'dlist', name: 'LinkedList  (size = ' + s.a.length + ')', vals: s.a.slice(), marks: ends(s.a.length), cls: hl.cls || {}, nulls: true }]; }
  },
  ops: [
    ['Read the i-th item', 'list.get(i)', 'O(n)', 'Must follow links from an end. No address math.'],
    ['Add / remove at either end', 'addFirst, addLast, removeFirst, removeLast', 'O(1)', 'Head and tail are stored; only a few links change.'],
    ['Insert / delete at a node you hold', 'it.add(x), it.remove()', 'O(1)', 'Rewire neighbours. Nothing shifts.'],
    ['Insert / delete at an index', 'list.add(i, x), list.remove(i)', 'O(n)', 'Walking to `i` dominates.'],
    ['Search', 'list.contains(x)', 'O(n)', 'Walk and compare.'],
    ['Size', 'list.size()', 'O(1)', 'Counter kept by `LinkedList`. (A bare `ListNode` chain has no size: you count.)']
  ],
  when: ['LeetCode ListNode problems', 'reverse / reorder links', 'fast & slow pointers', 'merge sorted lists', 'LRU cache (with a map)', 'O(1) insert at a held node', 'cycle detection'],
  whenNot: [
    ['Access by index', 'ArrayList / array', 'arraylist'],
    ['A plain queue or stack', 'ArrayDeque (faster, less memory)', 'queue-deque'],
    ['Find by value fast', 'HashMap / HashSet', 'hashmap'],
    ['O(1) "move to front" by key', 'LinkedHashMap', 'linkedhashmap']
  ],
  classes: [
    ['ListNode (LeetCode)', 'A bare singly linked node: `int val; ListNode next;`. Most interview problems use this.'],
    ['LinkedList<E>', 'Doubly linked, implements both `List` and `Deque`. Allows `null`.'],
    ['ArrayDeque<E>', 'Usually the better choice when you only need the ends.']
  ],
  api: [
    { name: 'LinkedList basics', code: J`LinkedList<Integer> list = new LinkedList<>();
list.add(2);
list.addFirst(1);
list.addLast(3);
System.out.println(list + " first " + list.getFirst() + " last " + list.getLast());
list.removeFirst();
list.removeLast();
System.out.println(list + " size " + list.size());`, out: `[1, 2, 3] first 1 last 3
[2] size 1` },
    { name: 'ListIterator', code: J`LinkedList<String> list = new LinkedList<>(List.of("a", "b", "c", "d"));
ListIterator<String> it = list.listIterator();
while (it.hasNext()) {
    String s = it.next();
    if (s.equals("b")) it.remove();       // O(1): unlink this node
    if (s.equals("c")) it.add("c2");      // O(1): link after it
}
System.out.println(list);`, out: `[a, c, c2, d]`, note: 'The iterator already holds the node, so insert and remove are true O(1). This is where a linked list beats an array.' },
    { name: 'ListNode chain', code: J`// LeetCode gives you:  class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }
ListNode head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
for (ListNode cur = head; cur != null; cur = cur.next) System.out.print(cur.val + " -> ");
System.out.println("null");`, out: `1 -> 2 -> 3 -> null` },
    { name: 'Dummy head', code: J`int[] vals = {4, 8, 15};
ListNode dummy = new ListNode(0), tail = dummy;   // dummy: no special case for the first node
for (int v : vals) {
    tail.next = new ListNode(v);
    tail = tail.next;
}
ListNode head = dummy.next;
StringBuilder sb = new StringBuilder();
for (ListNode c = head; c != null; c = c.next) sb.append(c.val).append(' ');
System.out.println(sb.toString().trim());`, out: `4 8 15`, note: 'A dummy node before the head removes the "is the list empty?" branch. Return `dummy.next`.' },
    { name: 'Fast & slow', code: J`ListNode head = null;
for (int v = 5; v >= 1; v--) head = new ListNode(v, head);   // build 1..5 by adding at the front
ListNode slow = head, fast = head;
while (fast != null && fast.next != null) {
    slow = slow.next;          // 1 step
    fast = fast.next.next;     // 2 steps
}
System.out.println("middle " + slow.val);`, out: `middle 3`, note: 'When `fast` hits the end, `slow` is in the middle. The same trick detects cycles: if they ever meet, there is a loop.' }
  ],
  build: {
    intro: 'A singly linked list with `head`, `tail` and `size`. Every method is a few reference updates; the bugs are always in the empty-list and one-node cases.',
    code: J`class MyLinkedList {
    private static class Node {
        int val;
        Node next;
        Node(int val) { this.val = val; }
    }
    private Node head, tail;
    private int size;

    void addFirst(int x) {
        Node n = new Node(x);
        n.next = head;
        head = n;
        if (tail == null) tail = n;        // was empty
        size++;
    }

    void addLast(int x) {
        Node n = new Node(x);
        if (tail == null) head = tail = n;
        else { tail.next = n; tail = n; }
        size++;
    }

    int removeFirst() {
        if (head == null) throw new NoSuchElementException();
        int x = head.val;
        head = head.next;
        if (head == null) tail = null;     // became empty
        size--;
        return x;
    }

    int get(int i) {
        Node cur = head;
        for (int k = 0; k < i; k++) cur = cur.next;    // walk: O(i)
        return cur.val;
    }

    void reverse() {
        Node prev = null, cur = head;
        tail = head;
        while (cur != null) {
            Node next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        head = prev;
    }

    public String toString() {
        StringBuilder sb = new StringBuilder();
        for (Node c = head; c != null; c = c.next) sb.append(c.val).append(" -> ");
        return sb.append("null").toString();
    }
}`,
    notes: [
      ['private static class Node', 'The node is a helper only this class needs. `static` means it does not hold a hidden reference to the list.'],
      ['Keep tail in sync', 'Every method that can empty the list or add the first node must update `tail` too.'],
      ['removeLast is O(n) here', 'With only `next` links you must walk to the second-to-last node. That is why Java\'s `LinkedList` adds `prev` links.']
    ],
    demo: J`MyLinkedList l = new MyLinkedList();
l.addLast(2);
l.addLast(3);
l.addFirst(1);
System.out.println(l + "   get(2) = " + l.get(2));
l.reverse();
System.out.println(l);
System.out.println(l.removeFirst() + " removed, now " + l);`,
    out: `1 -> 2 -> 3 -> null   get(2) = 3
3 -> 2 -> 1 -> null
3 removed, now 2 -> 1 -> null`
  },
  gotchas: [
    ['Losing the rest of the list', 'Setting `cur.next = prev` before saving `cur.next` cuts the chain.', 'Save `ListNode next = cur.next;` first.'],
    ['NullPointerException on fast.next.next', 'If `fast` is null or `fast.next` is null, `.next` crashes.', '`while (fast != null && fast.next != null)`.'],
    ['get(i) inside a loop', '`for (i…) list.get(i)` on a `LinkedList` is O(n²).', 'Use a for-each loop or an iterator.'],
    ['Special-casing the head', 'Deleting or inserting at the head needs a different branch.', 'Start with a dummy node and return `dummy.next`.'],
    ['Infinite loop on a cycle', 'A loop that walks until `null` never ends if the list has a cycle.', 'Detect it with fast & slow pointers.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-reverse', title: 'Reverse a linked list', ask: 'prev, cur, next. Save, flip, move.', code: J`ListNode reverseList(ListNode head) {
    ListNode prev = [[null]], cur = head;
    while (cur != null) {
        ListNode next = [[cur.next]];
        cur.next = [[prev]];
        prev = [[cur]];
        cur = [[next]];
    }
    return [[prev]];
}`, test: 'ListNode h = new ListNode(1, new ListNode(2, new ListNode(3))); h = new Sol().reverseList(h); StringBuilder sb = new StringBuilder(); for (ListNode c = h; c != null; c = c.next) sb.append(c.val); System.out.println(sb);', out: '321' },
      { id: 'fb-nth', title: 'Remove the n-th node from the end', ask: 'Move `fast` n steps ahead, then move both until `fast` is on the last node.', code: J`ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head);
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i < [[n]]; i++) fast = fast.next;
    while (fast.[[next]] != null) {
        fast = fast.next;
        slow = slow.next;
    }
    slow.next = [[slow.next.next]];
    return [[dummy.next]];
}`, test: 'ListNode h = null; for (int v = 5; v >= 1; v--) h = new ListNode(v, h); h = new Sol().removeNthFromEnd(h, 2); StringBuilder sb = new StringBuilder(); for (ListNode c = h; c != null; c = c.next) sb.append(c.val); System.out.println(sb);', out: '1235' }
    ],
    order: [
      { id: 'od-merge', title: 'Merge two sorted lists',
        ideaSteps: ['Make a dummy node and a `tail` pointer at it.', 'While both lists have nodes, attach the smaller one and move that list forward.', 'Move `tail` to the node just attached.', 'Attach whatever is left of either list.', 'Return the node after the dummy.'],
        lines: [
          'ListNode mergeTwoLists(ListNode a, ListNode b) {',
          '    ListNode dummy = new ListNode(0), tail = dummy;',
          '    while (a != null && b != null) {',
          '        if (a.val <= b.val) { tail.next = a; a = a.next; }',
          '        else { tail.next = b; b = b.next; }',
          '        tail = tail.next;',
          '    }',
          '    tail.next = (a != null) ? a : b;',
          '    return dummy.next;',
          '}'
        ],
        extra: ['    return dummy;'],
        check: { wrap: 'sol', test: 'ListNode a = new ListNode(1, new ListNode(3, new ListNode(5))); ListNode b = new ListNode(2, new ListNode(4)); StringBuilder sb = new StringBuilder(); for (ListNode c = new Sol().mergeTwoLists(a, b); c != null; c = c.next) sb.append(c.val); System.out.println(sb);', out: '12345' } }
    ]
  },
  patterns: ['linked-list', 'two-pointers', 'heap'],
  patternWhy: {
    'linked-list': 'Dummy nodes, reversal and fast/slow pointers.',
    'two-pointers': 'Fast & slow pointers are two pointers on a chain.',
    heap: 'Merge k sorted lists keeps list heads in a heap.'
  },
  problems: [['206', 'Reverse Linked List'], ['21', 'Merge Two Sorted Lists'], ['876', 'Middle of the Linked List'], ['141', 'Linked List Cycle'], ['19', 'Remove Nth Node From End of List'], ['707', 'Design Linked List']]
});
})();
