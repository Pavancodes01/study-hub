(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
// Backing array of the hand-built stack: used slots, then empty capacity.
function backing(a, cap, hl){
  var vals = [], cls = {};
  for (var i = 0; i < cap; i++){ vals.push(i < a.length ? a[i] : ''); if (i >= a.length) cls[i] = 'empty'; }
  if (hl.pushed !== undefined) cls[hl.pushed] = 'new';
  if (hl.popped !== undefined){ vals[hl.popped] = hl.val; cls[hl.popped] = 'gone'; }
  var marks = a.length ? [{ i: a.length - 1, label: 'top', c: 'a' }] : [];
  return arr(vals, marks, { name: 'data[]  (size = ' + a.length + ', capacity = ' + cap + ')', cls: cls });
}

registerStructure({
  slug: 'stack', order: 5, group: 'linear', title: 'Stack',
  oneLiner: 'Last in, first out. You only ever touch the **top**: `push` puts an item on it, `pop` takes it off. Both are O(1). In Java, use `ArrayDeque`.',
  legend: [['a', 'top of the stack']],
  compare: { access: 'O(1) top', search: 'O(n)', insert: 'O(1)', remove: 'O(1)', ordered: 'by arrival, newest first', space: 'O(n)', java: 'ArrayDeque', note: 'only the top is reachable' },
  idea: [
    'Picture a pile of plates. You add a plate on top, and you take the top plate off. You never pull one from the middle.',
    'That rule is the whole point: the item you get back is always the **most recent** one still waiting. Undo, "go back", matching brackets and nested calls all work this way.',
    'Inside, a stack is just an array plus a counter. `push` writes at `data[size]` and adds 1. `pop` subtracts 1 and reads `data[size]`. Nothing moves, so both are O(1).'
  ],
  anatomy: {
    title: 'Two views of the same stack',
    panels: [
      { type: 'stack', name: 'what you think of', vals: [4, 7, 1] },
      arr([4, 7, 1, '', ''], [{ i: 2, label: 'top', c: 'a' }], { name: 'what is in memory: data[], size = 3', cls: { 3: 'empty', 4: 'empty' } })
    ],
    notes: [
      'The bottom of the stack is `data[0]`. The top is `data[size - 1]`.',
      'Empty slots after the top are spare capacity, so the next `push` costs nothing extra.',
      'When the array is full, a new array twice as big is made and the items are copied. That is rare, so `push` is O(1) **amortized**.'
    ]
  },
  demo: {
    title: 'Push and pop on the backing array',
    sub: 'A stack with capacity 4. Watch `size`: it is the top pointer and the next free slot at the same time.',
    code: [
      'void push(int x) {',
      '    if (size == data.length) data = Arrays.copyOf(data, size * 2);',
      '    data[size++] = x;',
      '}',
      'int pop() {',
      '    return data[--size];',
      '}'
    ],
    steps: function(){
      var a = [], cap = 4, out = [];
      function P(hl){ return [{ type: 'stack', name: 'stack', vals: a.slice() }, backing(a, cap, hl || {})]; }
      out.push({ panels: P(), line: null, vars: { size: 0 }, msg: 'Empty stack. `size` is 0, so the next push goes into `data[0]`.' });
      [4, 7, 1].forEach(function(x){
        a.push(x);
        out.push({ panels: P({ pushed: a.length - 1 }), line: 2, vars: { x: x, size: a.length }, msg: '`push(' + x + ')` writes `data[' + (a.length - 1) + '] = ' + x + '`, then `size` becomes ' + a.length + '. Nothing else moves.' });
      });
      var v = a.pop();
      out.push({ panels: P({ popped: a.length, val: v }), line: 5, vars: { returned: v, size: a.length }, msg: '`pop()` does `--size` and returns `data[2]` = **' + v + '**. The value is still in memory, but it is past `size`, so it no longer counts.' });
      a.push(9);
      out.push({ panels: P({ pushed: 2 }), line: 2, vars: { x: 9, size: a.length }, msg: '`push(9)` simply overwrites slot 2. Old values past the top are garbage.' });
      a.push(5);
      out.push({ panels: P({ pushed: 3 }), line: 2, vars: { x: 5, size: a.length }, msg: '`push(5)` fills the last slot. The array is now full.' });
      cap = 8; a.push(2);
      out.push({ panels: P({ pushed: 4 }), line: 1, vars: { x: 2, size: a.length, capacity: 8 }, msg: '`push(2)` finds `size == data.length`, so it copies everything into an array of 8, then writes. This copy is O(n), but it only happens after n cheap pushes.' });
      out.push({ panels: P(), line: null, ok: true, vars: { size: a.length }, msg: 'The rule never changed: add at the top, remove from the top. **Last in, first out.**' });
      return out;
    }
  },
  play: {
    title: 'Stack playground',
    hint: 'Type a number and press `push`. Watch both views: the pile and the array behind it.',
    setup: 'Deque<Integer> stack = new ArrayDeque<>();',
    start: 'Empty stack with capacity 4.',
    init: function(){ return { a: [], cap: 4 }; },
    ops: [
      { id: 'push', label: 'push(x)', args: 1, cost: 'O(1)', run: function(s, x){
        var grew = s.a.length === s.cap;
        if (grew) s.cap *= 2;
        s.a.push(x);
        return { java: 'stack.push(' + x + ');', hl: { pushed: s.a.length - 1 },
          msg: grew ? 'Array was full, so it grew to ' + s.cap + ' and copied the items. Then **' + x + '** went on top.' : '**' + x + '** goes on top at `data[' + (s.a.length - 1) + ']`.' };
      } },
      { id: 'pop', label: 'pop()', cost: 'O(1)', run: function(s){
        if (!s.a.length) return { err: '`pop()` on an empty `ArrayDeque` throws `NoSuchElementException`. Check `isEmpty()` first.' };
        var v = s.a.pop();
        return { java: 'stack.pop();', ret: v, hl: { popped: s.a.length, val: v }, msg: 'Removed and returned the top: **' + v + '**.' };
      } },
      { id: 'peek', label: 'peek()', cost: 'O(1)', run: function(s){
        var v = s.a.length ? s.a[s.a.length - 1] : null;
        return { java: 'stack.peek();', ret: v === null ? 'null' : v, msg: v === null ? '`peek()` on an empty stack returns `null` (no exception).' : 'Top is **' + v + '**. `peek` looks but does not remove.' };
      } },
      { id: 'size', label: 'size()', cost: 'O(1)', run: function(s){ return { java: 'stack.size();', ret: s.a.length, msg: 'Size is **' + s.a.length + '**. It is just a counter, no walking.' }; } },
      { id: 'empty', label: 'isEmpty()', cost: 'O(1)', run: function(s){ return { java: 'stack.isEmpty();', ret: !s.a.length, msg: '`isEmpty()` is **' + !s.a.length + '**.' }; } }
    ],
    view: function(s, hl){ return [{ type: 'stack', name: 'stack', vals: s.a.slice() }, backing(s.a, s.cap, hl)]; }
  },
  ops: [
    ['Push on top', 'stack.push(x)', 'O(1) amortized', 'Writes the next free slot. The array doubles only when full.'],
    ['Pop the top', 'stack.pop()', 'O(1)', 'Moves the top pointer down one. Throws if empty.'],
    ['Look at the top', 'stack.peek()', 'O(1)', 'Reads one slot. Returns `null` if empty.'],
    ['Size / empty?', 'stack.size(), stack.isEmpty()', 'O(1)', 'A stored counter.'],
    ['Find a value', 'stack.contains(x)', 'O(n)', 'Has to walk every item. A stack is not for searching.'],
    ['Walk all items', 'for (int x : stack)', 'O(n)', '`ArrayDeque` walks top to bottom.']
  ],
  when: ['most recent first', 'undo / go back', 'matching brackets', 'nested structure', 'next greater / smaller element', 'evaluate an expression', 'DFS without recursion', 'reverse something'],
  whenNot: [
    ['Oldest first (first in, first out)', 'Queue', 'queue-deque'],
    ['The smallest or largest item, not the newest', 'Heap / PriorityQueue', 'heap'],
    ['"Is x in here?" quickly', 'HashSet', 'hashset'],
    ['Add or remove at both ends', 'Deque (same `ArrayDeque`)', 'queue-deque']
  ],
  classes: [
    ['ArrayDeque<E>', 'Default choice. Fast, no locking. Does not allow `null`.'],
    ['Stack<E>', 'Old class (Java 1.0). Synchronized, extends `Vector`, prints bottom first. Avoid in new code.'],
    ['LinkedList<E>', 'Works as a `Deque` and allows `null`, but every item is a separate node, so it is slower.']
  ],
  api: [
    { name: 'Basics', code: J`Deque<Integer> stack = new ArrayDeque<>();
stack.push(4);
stack.push(7);
stack.push(1);
System.out.println(stack);            // printed top first
System.out.println(stack.peek());     // look, do not remove
System.out.println(stack.pop());      // remove and return
System.out.println(stack.size());
System.out.println(stack.isEmpty());`, out: `[1, 7, 4]
1
1
2
false`, note: 'Declare it as `Deque<Integer>`. `push`, `pop` and `peek` all work on the front of the deque, which is the top of the stack.' },
    { name: 'Empty stack', code: J`Deque<Integer> stack = new ArrayDeque<>();
System.out.println(stack.peek());     // null, no exception
System.out.println(stack.poll());     // null, no exception
try {
    stack.pop();
} catch (NoSuchElementException e) {
    System.out.println("pop on empty: " + e.getClass().getSimpleName());
}`, out: `null
null
pop on empty: NoSuchElementException`, note: '`pop()` throws on empty; `peek()` and `poll()` return `null`. Guard loops with `while (!stack.isEmpty())`.' },
    { name: 'Reverse', code: J`Deque<Character> st = new ArrayDeque<>();
for (char c : "stack".toCharArray()) st.push(c);
StringBuilder sb = new StringBuilder();
while (!st.isEmpty()) sb.append(st.pop());
System.out.println(sb);`, out: `kcats`, note: 'Pushing then popping everything reverses the order. That is LIFO in one line.' },
    { name: 'Monotonic stack', code: J`int[] a = {2, 1, 2, 4, 3};
int[] next = new int[a.length];             // next greater value to the right
Deque<Integer> st = new ArrayDeque<>();     // values, decreasing from bottom to top
for (int i = a.length - 1; i >= 0; i--) {
    while (!st.isEmpty() && st.peek() <= a[i]) st.pop();
    next[i] = st.isEmpty() ? -1 : st.peek();
    st.push(a[i]);
}
System.out.println(Arrays.toString(next));`, out: `[4, 2, 4, -1, -1]`, note: 'Pop everything that can never be an answer again, then the top is the answer. Each item is pushed and popped once: O(n).' },
    { name: 'Old Stack class', code: J`Stack<Integer> old = new Stack<>();
old.push(1);
old.push(2);
old.push(3);
System.out.println(old);              // printed bottom first!
System.out.println(old.peek());
Deque<Integer> modern = new ArrayDeque<>(List.of(1, 2, 3));
System.out.println(modern);           // a list copied in: first item is the top`, out: `[1, 2, 3]
3
[1, 2, 3]`, note: '`java.util.Stack` prints bottom first, `ArrayDeque` prints top first. Building an `ArrayDeque` from a list makes the list\'s first item the top.' }
  ],
  build: {
    intro: 'An int stack on a plain array. This is all `ArrayDeque` does for `push`/`pop` (it also wraps around, so it can be a queue too).',
    code: J`class IntStack {
    private int[] data = new int[4];
    private int size = 0;          // next free slot; top is data[size - 1]

    void push(int x) {
        if (size == data.length) data = Arrays.copyOf(data, size * 2);  // full: double
        data[size++] = x;
    }

    int pop() {
        if (size == 0) throw new RuntimeException("stack is empty");
        return data[--size];
    }

    int peek() {
        if (size == 0) throw new RuntimeException("stack is empty");
        return data[size - 1];
    }

    boolean isEmpty() { return size == 0; }
    int size() { return size; }
}`,
    notes: [
      ['size is the top pointer', '`data[size]` is where the next push goes; `data[size - 1]` is the top.'],
      ['pop does not erase', 'It only moves `size` down. The old value is overwritten by the next push.'],
      ['Why doubling', 'Copies happen at sizes 4, 8, 16… so n pushes copy fewer than 2n items in total. That is O(1) per push on average.']
    ],
    demo: J`IntStack s = new IntStack();
for (int i = 1; i <= 5; i++) s.push(i * 10);   // the 5th push grows 4 -> 8
System.out.println(s.pop() + " " + s.peek() + " " + s.size());`,
    out: `50 40 4`
  },
  gotchas: [
    ['Using java.util.Stack', 'It is synchronized (slow), extends `Vector` so you can insert in the middle by mistake, and prints bottom first.', '`Deque<Integer> st = new ArrayDeque<>();`'],
    ['pop() on an empty stack', 'Throws `NoSuchElementException`, which is a common runtime error in bracket problems.', 'Check `st.isEmpty()` before `pop()`.'],
    ['Unboxing a null peek', '`int top = st.peek();` on an empty stack throws `NullPointerException`: `peek()` returned `null`.', 'Check `isEmpty()` first.'],
    ['Comparing tops with ==', '`a.peek() == b.peek()` compares `Integer` objects. It works for -128..127 and fails for bigger numbers.', 'Use `a.peek().equals(b.peek())` or compare as `int`.'],
    ['Pushing null', '`ArrayDeque` throws `NullPointerException` on `push(null)`.', 'Push a sentinel value instead, or use `LinkedList`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-valid', title: 'Valid parentheses', ask: 'Push the closer you expect; on a closer, it must match the top.', wrap: 'sol', code: J`boolean isValid(String s) {
    Deque<Character> st = new [[ArrayDeque<>()]];
    for (char c : s.toCharArray()) {
        if (c == '(') st.push(')');
        else if (c == '[') st.push(']');
        else if (c == '{') st.push('}');
        else if (st.[[isEmpty()]] || st.[[pop()|poll()]] != c) return false;
    }
    return st.[[isEmpty()]];
}`, test: 'System.out.println(new Sol().isValid("([]{})") + " " + new Sol().isValid("(]") + " " + new Sol().isValid("(("));', out: 'true false false' },
      { id: 'fb-minstack', title: 'Min stack', ask: 'Store each value together with the minimum at that moment.', wrap: 'top', code: J`class MinStack {
    Deque<int[]> st = new ArrayDeque<>();      // {value, min so far}

    void push(int x) {
        int min = st.isEmpty() ? x : Math.min(x, [[st.peek()[1]]]);
        st.[[push]](new int[]{x, [[min]]});
    }
    void pop() { st.pop(); }
    int top() { return [[st.peek()[0]]]; }
    int getMin() { return st.peek()[1]; }
}`, test: 'MinStack m = new MinStack(); m.push(3); m.push(1); m.push(2); System.out.println(m.getMin()); m.pop(); m.pop(); System.out.println(m.getMin() + " " + m.top());', out: '1\n3 3' }
    ],
    order: [
      { id: 'od-rpn', title: 'Evaluate reverse Polish notation',
        ideaSteps: ['Make an empty stack of numbers.', 'Walk the tokens.', 'On an operator, pop the **right** operand first, then the left.', 'Apply the operator and push the result.', 'On a number, push it.', 'At the end, the answer is the only item left.'],
        lines: [
          'Deque<Integer> st = new ArrayDeque<>();',
          'for (String t : tokens) {',
          '    if (t.length() == 1 && "+-*/".contains(t)) {',
          '        int b = st.pop(), a = st.pop();',
          '        st.push(t.equals("+") ? a + b : t.equals("-") ? a - b : t.equals("*") ? a * b : a / b);',
          '    } else {',
          '        st.push(Integer.parseInt(t));',
          '    }',
          '}',
          'return st.pop();'
        ],
        extra: ['        int a = st.pop(), b = st.pop();'],
        check: { wrap: 'sol', pre: 'int evalRPN(String[] tokens) {', post: '}', test: 'System.out.println(new Sol().evalRPN(new String[]{"4", "13", "5", "/", "+"}) + " " + new Sol().evalRPN(new String[]{"3", "-4", "-"}));', out: '6 7' } }
    ]
  },
  patterns: ['stack', 'trees', 'graphs', 'backtracking'],
  patternWhy: {
    stack: 'Monotonic stacks and bracket matching are built on push/pop.',
    trees: 'Iterative in-order and pre-order traversal use an explicit stack.',
    graphs: 'Iterative DFS replaces recursion with a stack.',
    backtracking: 'Recursion is a stack: each call is pushed, each return pops.'
  },
  problems: [['20', 'Valid Parentheses'], ['155', 'Min Stack'], ['232', 'Implement Queue using Stacks'], ['150', 'Evaluate Reverse Polish Notation'], ['739', 'Daily Temperatures'], ['84', 'Largest Rectangle in Histogram']]
});
})();
