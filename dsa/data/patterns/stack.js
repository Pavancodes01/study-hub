(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'stack', order: 6, title: 'Stack and monotonic stack',
  oneLiner: 'Last in, first out. Use a stack when the newest unfinished thing must be handled first: matching brackets, undo, nested strings, and "next greater element".',
  legend: [['r', 'current index'], ['a', 'top of stack'], ['hit', 'answer filled']],
  clues: ['matching brackets', 'nested / innermost first', 'undo / backspace', 'next greater / smaller element', 'previous greater / smaller', 'days until warmer', 'largest rectangle', 'evaluate expression', 'remove adjacent duplicates'],
  idea: [
    'A stack holds things that are **waiting for something**. An open bracket waits for its close. A day waits for a warmer day.',
    'When the current item resolves the waiting item on top, **pop it and record the answer**. Repeat while it keeps resolving things.',
    'Monotonic stack: you keep the stack sorted (e.g. decreasing) by popping everything the new item beats. Each index is pushed once and popped once: O(n).'
  ],
  pick: [
    ['Brackets, nesting, undo, backspace', 'Plain stack', '`Deque<Character> st = new ArrayDeque<>();`'],
    ['Next greater / warmer / bigger to the right', 'Monotonic decreasing stack of indexes', '`while (!st.isEmpty() && nums[i] > nums[st.peek()])`'],
    ['Next smaller, largest rectangle', 'Monotonic increasing stack', '`while (... nums[i] < nums[st.peek()])`'],
    ['Max / min of each sliding window', 'Monotonic deque', '`Deque<Integer> dq`, remove from both ends']
  ],
  fourQuestions: [
    ['What waits on the stack?', 'Chars, numbers, or (most often) **indexes**. `Deque<Integer> st = new ArrayDeque<>();`'],
    ['When does the current item resolve the top?', 'That is the `while` condition: close bracket matches, or `nums[i] > nums[st.peek()]`.'],
    ['What do I record when popping?', '`int j = st.pop(); ans[j] = i - j;` (distance) or `ans[j] = nums[i];` (value).'],
    ['What is left at the end?', 'Items still on the stack never got resolved: default answer (0, -1) or "invalid".']
  ],

  demo: {
    title: 'Daily temperatures: days until a warmer day',
    sub: 'Temps `[73, 74, 75, 71, 69, 72, 76, 73]`. Stack holds indexes of days still waiting for a warmer day.',
    code: [
      'Deque<Integer> st = new ArrayDeque<>();   // waiting days',
      'for (int i = 0; i < n; i++) {',
      '    while (!st.isEmpty() && t[i] > t[st.peek()]) {',
      '        int j = st.pop();',
      '        ans[j] = i - j;',
      '    }',
      '    st.push(i);',
      '}'
    ],
    steps: function(){
      var t = [73, 74, 75, 71, 69, 72, 76, 73], ans = t.map(function(){ return 0; }), st = [], out = [];
      function P(i, hit){
        var c = {}; ans.forEach(function(v, k){ if (v) c[k] = 'on-hit'; });
        return [arr(t, i === null ? [] : [{i: i, label: 'i', c: 'r'}], {name: 'temps', cls: c}),
                { type: 'stack', name: 'stack (indexes)', vals: st.map(function(k){ return k + ' (' + t[k] + ')'; }) },
                arr(ans.slice(), [], {name: 'ans', cls: hit !== undefined ? (function(){ var o = {}; o[hit] = 'on-hit'; return o; })() : {}})];
      }
      for (var i = 0; i < t.length; i++){
        while (st.length && t[i] > t[st[st.length - 1]]){
          var j = st.pop(); ans[j] = i - j;
          out.push({ panels: P(i, j), line: [3, 4], ok: true, vars: {i: i, popped: j}, msg: 'Day ' + i + ' (' + t[i] + '°) is warmer than day ' + j + ' (' + t[j] + '°) on top. Pop it: `ans[' + j + '] = ' + i + ' - ' + j + ' = ' + (i - j) + '`.' });
        }
        st.push(i);
        out.push({ panels: P(i), line: 6, vars: {i: i}, msg: 'Nothing else on top is colder than ' + t[i] + '°. Push day ' + i + '; it waits for a warmer day.' });
      }
      out.push({ panels: P(null), line: 7, ok: true, msg: 'Days still on the stack never found a warmer day, so they keep 0. Each index was pushed once and popped at most once: O(n).' });
      return out;
    }
  },

  variants: [
    {
      id: 'basic', name: 'Plain stack: matching and nesting', short: 'Matching',
      intro: 'Push openers. On a closer, the top must be its partner. At the end the stack must be empty.',
      start: 'Deque<Character> st = new ArrayDeque<>();',
      panels: [arr(['(', '[', '{', '}', ']', ')'], [{i: 3, label: 'i', c: 'r'}], {name: 's'}), { type: 'stack', name: 'stack', vals: ['(', '[', '{'] }],
      rules: [
        ['Use it when', 'Valid parentheses, remove adjacent duplicates, backspace compare, simplify path, evaluate RPN.'],
        ['Push / pop', '`st.push(x)`, `st.pop()`, look without removing: `st.peek()`.'],
        ['Before pop', 'Always check `st.isEmpty()`; popping an empty ArrayDeque throws.'],
        ['Cost', 'O(n) time, O(n) space.']
      ],
      probs: '20 Valid Parentheses, 1047 Remove All Adjacent Duplicates, 150 Evaluate Reverse Polish Notation, 155 Min Stack, 71 Simplify Path',
      tabs: [
        { name: 'Valid parentheses', code: J`boolean isValid(String s) {
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);
        } else {
            if (st.isEmpty()) return false;
            char open = st.pop();
            if (c == ')' && open != '(') return false;
            if (c == ']' && open != '[') return false;
            if (c == '}' && open != '{') return false;
        }
    }
    return st.isEmpty();               // leftovers = unmatched openers
}` },
        { name: 'Eval RPN', code: J`int evalRPN(String[] tokens) {
    Deque<Integer> st = new ArrayDeque<>();
    for (String tok : tokens) {
        switch (tok) {
            case "+": st.push(st.pop() + st.pop()); break;
            case "*": st.push(st.pop() * st.pop()); break;
            case "-": { int b = st.pop(), a = st.pop(); st.push(a - b); break; }
            case "/": { int b = st.pop(), a = st.pop(); st.push(a / b); break; }
            default: st.push(Integer.parseInt(tok));
        }
    }
    return st.pop();
}`, note: 'Pop order matters for `-` and `/`: the first pop is the **right** operand. Compare Strings with `switch` or `.equals()`, never `==`.' },
        { name: 'Remove adjacent dups', code: J`String removeDuplicates(String s) {
    StringBuilder sb = new StringBuilder();    // acts as a stack of chars
    for (char c : s.toCharArray()) {
        int n = sb.length();
        if (n > 0 && sb.charAt(n - 1) == c) sb.deleteCharAt(n - 1);  // pop
        else sb.append(c);                                            // push
    }
    return sb.toString();
}` },
        { name: 'Min stack', code: J`class MinStack {
    private Deque<int[]> st = new ArrayDeque<>();   // {value, min so far}

    void push(int val) {
        int min = st.isEmpty() ? val : Math.min(val, st.peek()[1]);
        st.push(new int[]{val, min});
    }
    void pop()    { st.pop(); }
    int top()     { return st.peek()[0]; }
    int getMin()  { return st.peek()[1]; }
}` }
      ]
    },
    {
      id: 'mono', name: 'Monotonic stack: next greater / smaller', short: 'Monotonic stack',
      intro: 'Store **indexes**. Before pushing `i`, pop every index whose value `nums[i]` beats; `i` is their answer. The stack stays sorted, hence "monotonic".',
      start: 'while (!st.isEmpty() && nums[i] > nums[st.peek()]) { int j = st.pop(); ans[j] = ...; }',
      panels: [arr([2, 1, 2, 4, 3], [{i: 3, label: 'i', c: 'r'}], {name: 'nums'}), { type: 'stack', name: 'stack (indexes)', vals: ['0', '2'] }],
      rules: [
        ['Next greater', 'Decreasing stack. Pop while `nums[i] > nums[top]`.'],
        ['Next smaller', 'Increasing stack. Pop while `nums[i] < nums[top]`.'],
        ['Previous greater / smaller', 'After popping, the new top (if any) is the previous greater / smaller of `i`.'],
        ['Circular array', 'Loop `i` from 0 to `2n - 1` and use `i % n`.'],
        ['Cost', 'Each index pushed once, popped once: O(n).']
      ],
      probs: '739 Daily Temperatures, 496 Next Greater Element I, 503 Next Greater Element II, 901 Online Stock Span, 84 Largest Rectangle in Histogram',
      tabs: [
        { name: 'Daily temperatures', code: J`int[] dailyTemperatures(int[] t) {
    int n = t.length;
    int[] ans = new int[n];                  // default 0 = never warmer
    Deque<Integer> st = new ArrayDeque<>();  // indexes, temps decreasing
    for (int i = 0; i < n; i++) {
        while (!st.isEmpty() && t[i] > t[st.peek()]) {
            int j = st.pop();
            ans[j] = i - j;
        }
        st.push(i);
    }
    return ans;
}` },
        { name: 'Next greater (circular)', code: J`int[] nextGreaterElements(int[] nums) {
    int n = nums.length;
    int[] ans = new int[n];
    Arrays.fill(ans, -1);
    Deque<Integer> st = new ArrayDeque<>();
    for (int i = 0; i < 2 * n; i++) {        // walk twice for wrap-around
        int x = nums[i % n];
        while (!st.isEmpty() && x > nums[st.peek()]) {
            ans[st.pop()] = x;
        }
        if (i < n) st.push(i);
    }
    return ans;
}` },
        { name: 'Largest rectangle', code: J`int largestRectangleArea(int[] h) {
    Deque<Integer> st = new ArrayDeque<>();   // indexes, heights increasing
    int best = 0;
    for (int i = 0; i <= h.length; i++) {
        int cur = (i == h.length) ? 0 : h[i];  // 0 at the end flushes the stack
        while (!st.isEmpty() && cur < h[st.peek()]) {
            int height = h[st.pop()];
            int left = st.isEmpty() ? -1 : st.peek();   // previous smaller
            best = Math.max(best, height * (i - left - 1));
        }
        st.push(i);
    }
    return best;
}`, note: 'When a bar is popped, `i` is its next smaller and the new top is its previous smaller. The bar can stretch between them.' }
      ]
    },
    {
      id: 'decode', name: 'Stack of states (nested strings)', short: 'Nested strings',
      intro: 'On `[`, save what you have built so far and start fresh. On `]`, finish the inner part and glue it onto the saved outer part.',
      start: 'Deque<StringBuilder> strs = new ArrayDeque<>();  Deque<Integer> counts = new ArrayDeque<>();',
      panels: [{ type: 'text', name: 's = "3[a2[c]]"', text: '3[  a  2[  c  ]  ]  →  "accaccacc"' }],
      rules: [
        ['Use it when', 'Decode string, basic calculator with parentheses, nested lists, simplify path.'],
        ['Digits', 'Numbers can have many digits: `num = num * 10 + (c - \'0\');`'],
        ['Two stacks', 'One for counts, one for the outer strings. Push both on `[`, pop both on `]`.']
      ],
      probs: '394 Decode String, 224 Basic Calculator, 227 Basic Calculator II, 71 Simplify Path',
      tabs: [
        { name: 'Decode string', code: J`String decodeString(String s) {
    Deque<Integer> counts = new ArrayDeque<>();
    Deque<StringBuilder> outer = new ArrayDeque<>();
    StringBuilder cur = new StringBuilder();
    int num = 0;
    for (char c : s.toCharArray()) {
        if (Character.isDigit(c)) {
            num = num * 10 + (c - '0');
        } else if (c == '[') {
            counts.push(num);
            outer.push(cur);              // save the outside
            cur = new StringBuilder();    // start the inside
            num = 0;
        } else if (c == ']') {
            String inner = cur.toString();
            cur = outer.pop();
            cur.append(inner.repeat(counts.pop()));
        } else {
            cur.append(c);
        }
    }
    return cur.toString();
}` },
        { name: 'Calculator II', code: J`int calculate(String s) {
    Deque<Integer> st = new ArrayDeque<>();
    int num = 0;
    char op = '+';                            // operator before num
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (Character.isDigit(c)) num = num * 10 + (c - '0');
        if ((!Character.isDigit(c) && c != ' ') || i == s.length() - 1) {
            if (op == '+') st.push(num);
            else if (op == '-') st.push(-num);
            else if (op == '*') st.push(st.pop() * num);
            else st.push(st.pop() / num);
            op = c;
            num = 0;
        }
    }
    int sum = 0;
    for (int x : st) sum += x;
    return sum;
}` }
      ]
    },
    {
      id: 'deque', name: 'Monotonic deque (window max)', short: 'Monotonic deque',
      intro: 'A deque of indexes with values decreasing from front to back. The front is always the window max. Drop the front when it leaves the window; drop smaller items from the back when a bigger one arrives.',
      start: 'Deque<Integer> dq = new ArrayDeque<>();   // front = max',
      panels: [arr([1, 3, -1, -3, 5, 3, 6, 7], [{i: 4, label: 'i', c: 'r'}], {cls: {2: 'win', 3: 'win', 4: 'win'}}), { type: 'stack', name: 'deque (front at bottom)', vals: ['4 (5)'] }],
      rules: [
        ['Use it when', 'Sliding window maximum / minimum, shortest subarray with sum ≥ k (with prefix sums).'],
        ['Back', '`while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();` then `dq.offerLast(i)`.'],
        ['Front', '`if (dq.peekFirst() <= i - k) dq.pollFirst();`'],
        ['Cost', 'O(n): each index enters and leaves once.']
      ],
      probs: '239 Sliding Window Maximum, 1438 Longest Subarray With Abs Diff ≤ Limit, 862 Shortest Subarray with Sum at Least K',
      tabs: [
        { name: 'Window max', code: J`int[] maxSlidingWindow(int[] nums, int k) {
    int n = nums.length;
    int[] res = new int[n - k + 1];
    Deque<Integer> dq = new ArrayDeque<>();      // indexes, values decreasing
    for (int i = 0; i < n; i++) {
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();   // left the window
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();  // useless now
        dq.offerLast(i);
        if (i >= k - 1) res[i - k + 1] = nums[dq.peekFirst()];
    }
    return res;
}` }
      ]
    }
  ],

  javaUsed: [
    ['Deque<Integer> st = new ArrayDeque<>()', 'The recommended stack in Java.', 'Faster than the old `Stack` class, which is synchronized and legacy.'],
    ['st.push(x) / st.pop() / st.peek()', 'Add on top / remove top / look at top.', '`pop` on empty throws; `peek` on empty returns null.'],
    ['st.isEmpty() / st.size()', 'Check before pop or peek.', 'Put `!st.isEmpty() &&` first in every while condition.'],
    ['dq.offerLast / pollLast / peekLast', 'Back of a deque.', 'Use these names for a deque so the direction is clear.'],
    ['dq.offerFirst / pollFirst / peekFirst', 'Front of a deque.', '`push`/`pop`/`peek` are the same as the First versions.'],
    ['StringBuilder sb; sb.append(c); sb.deleteCharAt(sb.length() - 1)', 'Char stack that is also the answer string.', '`sb.toString()` at the end.'],
    ['str.repeat(n)', 'String repeated n times (Java 11+).', 'Decode string.'],
    ['Integer.parseInt(s)', 'String to int.', 'Tokens in RPN or calculators.'],
    ["Character.isDigit(c), c - '0'", 'Detect and convert a digit.', 'Build multi-digit numbers: `num = num * 10 + (c - \'0\')`.'],
    ['Arrays.fill(ans, -1)', 'Default "no answer" value.', 'Next greater element problems.']
  ],
  concepts: [
    { name: 'Store indexes, not values', text: 'With an index you can get the value (`nums[j]`) **and** the distance (`i - j`) and write into `ans[j]`. A value alone gives you none of the other two.' },
    { name: 'Why the monotonic stack is O(n)', text: 'The while loop looks scary inside a for loop, but each index is pushed exactly once and popped at most once. Total pops ≤ n, so the total work is O(n).' },
    { name: 'ArrayDeque iteration order', text: 'With `push`, the newest item is first. `for (int x : st)` goes from top to bottom. The sum in Calculator II does not care, but printing does.', code: J`Deque<Integer> st = new ArrayDeque<>();
st.push(1); st.push(2); st.push(3);
System.out.println(st);   // [3, 2, 1]  (top first)` },
    { name: 'ArrayDeque does not allow null', text: '`push(null)` throws. Use a sentinel value like -1 instead.' }
  ],
  loops: [
    ['`while (!st.isEmpty() && cond(st.peek()))`', 'Pop everything the current item resolves.', 'Monotonic stack'],
    ['`for (int i = 0; i < 2 * n; i++)` with `i % n`', 'Walk a circular array twice.', 'Next greater II'],
    ['`for (int i = 0; i <= n; i++)` with a 0 at `i == n`', 'Extra step to flush the stack.', 'Largest rectangle']
  ],
  movesTitle: 'Stack moves',
  moves: [
    ['`st.push(i);`', 'Item starts waiting', 'Every pattern'],
    ['`int j = st.pop(); ans[j] = i - j;`', 'Resolve the top, record distance', 'Daily temperatures'],
    ['`ans[st.pop()] = nums[i];`', 'Resolve the top, record value', 'Next greater element'],
    ['`int left = st.isEmpty() ? -1 : st.peek();`', 'Previous smaller after popping', 'Largest rectangle'],
    ['`cur = outer.pop(); cur.append(inner.repeat(k));`', 'Close a nested level', 'Decode string']
  ],
  bugs: [
    ['Pop / peek on empty stack', '`NoSuchElementException` or a null unboxing crash.', 'check `!st.isEmpty()` first.'],
    ['Pushing values instead of indexes', 'Cannot compute distance or write into `ans[j]`.', 'push `i`, read `nums[i]`.'],
    ['Wrong comparison direction', '`>` vs `>=` changes how equal values are handled.', 'decide: should an equal value resolve the top? Daily temps: no (strictly warmer).'],
    ['Forgot leftover items', 'Items left on the stack have no answer.', 'pre-fill `ans` with 0 or -1, or check `st.isEmpty()` at the end for brackets.'],
    ['Operand order in RPN', '`a - b` with pops in the wrong order.', 'first pop is b (right), second pop is a (left).'],
    ['Using Stack class', 'Works but slow and legacy.', '`Deque<Integer> st = new ArrayDeque<>();`']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-paren', title: 'Valid parentheses', ask: 'Push openers. A closer must match the popped opener.', code: J`boolean isValid(String s) {
    Deque<Character> st = new [[ArrayDeque<>()]];
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') st.[[push]](c);
        else {
            if (st.[[isEmpty()]]) return false;
            char open = st.[[pop()]];
            if (c == ')' && open != '(') return false;
            if (c == ']' && open != '[') return false;
            if (c == '}' && open != '{') return false;
        }
    }
    return [[st.isEmpty()]];
}` },
      { id: 'fb-temps', title: 'Daily temperatures', ask: 'Stack of waiting days. A warmer day resolves them.', code: J`int[] dailyTemperatures(int[] t) {
    int[] ans = new int[t.length];
    Deque<Integer> st = new ArrayDeque<>();
    for (int i = 0; i < t.length; i++) {
        while (!st.isEmpty() && t[i] [[>]] t[ [[st.peek()]] ]) {
            int j = st.pop();
            ans[j] = [[i - j]];
        }
        st.push([[i]]);
    }
    return ans;
}` },
      { id: 'fb-wmax', title: 'Sliding window maximum', ask: 'Front of the deque is the max. Drop old indexes from the front, smaller values from the back.', code: J`int[] maxSlidingWindow(int[] nums, int k) {
    int[] res = new int[nums.length - k + 1];
    Deque<Integer> dq = new ArrayDeque<>();
    for (int i = 0; i < nums.length; i++) {
        if (!dq.isEmpty() && dq.peekFirst() <= [[i - k]]) dq.pollFirst();
        while (!dq.isEmpty() && nums[dq.[[peekLast()]] ] <= nums[i]) dq.[[pollLast()]];
        dq.offerLast(i);
        if (i >= k - 1) res[i - k + 1] = nums[dq.[[peekFirst()]] ];
    }
    return res;
}` }
    ],
    order: [
      { id: 'od-nge', title: 'Next greater element (circular)',
        ideaSteps: ['Answer starts as -1 everywhere.', 'Walk the array twice (index `i % n`) so items can see past the end.', 'While the current value is bigger than the value at the top index, pop and set its answer.', 'Only push indexes during the first pass.'],
        lines: [
          'int n = nums.length;',
          'int[] ans = new int[n];',
          'Arrays.fill(ans, -1);',
          'Deque<Integer> st = new ArrayDeque<>();',
          'for (int i = 0; i < 2 * n; i++) {',
          '    while (!st.isEmpty() && nums[i % n] > nums[st.peek()]) ans[st.pop()] = nums[i % n];',
          '    if (i < n) st.push(i);',
          '}',
          'return ans;'
        ],
        extra: ['    st.push(i % n);', '    if (nums[i % n] > nums[st.peek()]) ans[st.pop()] = nums[i % n];'],
        wrap: 'int[] nextGreaterElements(int[] nums) {\n@@\n}' },
      { id: 'od-dups', title: 'Remove all adjacent duplicates',
        ideaSteps: ['Use a StringBuilder as a stack of chars.', 'For each char: if it equals the last char, delete the last char (pop).', 'Otherwise append it (push).', 'Return the builder as a String.'],
        lines: [
          'StringBuilder sb = new StringBuilder();',
          'for (char c : s.toCharArray()) {',
          '    int n = sb.length();',
          '    if (n > 0 && sb.charAt(n - 1) == c) sb.deleteCharAt(n - 1);',
          '    else sb.append(c);',
          '}',
          'return sb.toString();'
        ],
        wrap: 'String removeDuplicates(String s) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['20', 'Valid Parentheses'], ['1047', 'Remove All Adjacent Duplicates In String'], ['844', 'Backspace String Compare'], ['155', 'Min Stack'], ['496', 'Next Greater Element I'], ['232', 'Implement Queue using Stacks']],
    next: [['739', 'Daily Temperatures'], ['150', 'Evaluate Reverse Polish Notation'], ['394', 'Decode String'], ['503', 'Next Greater Element II'], ['901', 'Online Stock Span'], ['239', 'Sliding Window Maximum'], ['84', 'Largest Rectangle in Histogram'], ['227', 'Basic Calculator II']]
  }
});
})();
