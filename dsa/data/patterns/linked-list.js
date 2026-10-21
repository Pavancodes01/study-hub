(function(){
var J = String.raw;
function list(vals, marks, extra){ var p = { type: 'list', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'linked-list', order: 7, title: 'Linked list',
  oneLiner: 'Most linked list problems are three tricks: a **dummy** node in front, **reverse** by rewiring `next`, and **fast / slow** pointers. Draw boxes and arrows before you code.',
  legend: [['l', 'prev / slow'], ['r', 'curr / fast'], ['a', 'next (saved)']],
  clues: ['ListNode head', 'reverse', 'merge sorted lists', 'remove node / remove nth', 'middle', 'cycle', 'reorder', 'add two numbers', 'intersection'],
  idea: [
    'A node only knows the next node. You cannot go back, and you cannot jump to index i. So you walk with variables and **rewire `next` pointers**.',
    'Before you change `curr.next`, **save** what it pointed to. Otherwise the rest of the list is lost.',
    'If the head might change (removed, reversed, merged), put a **dummy** node in front and return `dummy.next`. No special case for the head.'
  ],
  pick: [
    ['Head may be removed or replaced; building a new list', 'Dummy node', '`ListNode dummy = new ListNode(0, head);`'],
    ['Reverse all or part', 'prev / curr / next', '`ListNode prev = null, curr = head;`'],
    ['Middle, cycle, nth from end', 'Fast and slow', '`ListNode slow = head, fast = head;`'],
    ['Palindrome list, reorder list', 'Middle + reverse second half + compare/merge', 'combine the three']
  ],
  fourQuestions: [
    ['Can the head change?', 'Yes: start with `ListNode dummy = new ListNode(0, head);` and `return dummy.next;`'],
    ['Which pointers do I walk with?', '`curr` alone, `prev` + `curr`, or `slow` + `fast`. Declare them up front.'],
    ['What is the loop condition?', '`while (curr != null)` to visit every node. `while (curr.next != null)` when you need to look one ahead.'],
    ['In what order do I rewire?', 'Save `next`, change `curr.next`, then move the walkers. Draw it first.']
  ],

  demo: {
    title: 'Reverse a linked list',
    sub: 'List `1 → 2 → 3 → 4`. Three pointers: `prev`, `curr`, and a saved `next`.',
    code: [
      'ListNode prev = null, curr = head;',
      'while (curr != null) {',
      '    ListNode next = curr.next;   // save the rest',
      '    curr.next = prev;            // flip the arrow',
      '    prev = curr;                 // step forward',
      '    curr = next;',
      '}',
      'return prev;                    // new head'
    ],
    steps: function(){
      var vals = [1, 2, 3, 4], out = [];
      // reversed part shown separately from remaining part
      function P(done, rest, nextMark){
        var a = { type: 'list', name: 'reversed so far (prev)', vals: done.length ? done.slice().reverse().concat(['null']) : ['null'], marks: done.length ? [{i: 0, label: 'prev', c: 'l'}] : [{i: 0, label: 'prev', c: 'l'}] };
        var m = rest.length ? [{i: 0, label: 'curr', c: 'r'}] : [];
        if (nextMark && rest.length > 1) m.push({i: 1, label: 'next', c: 'a'});
        var b = { type: 'list', name: 'still to do (curr)', vals: rest.concat(['null']), marks: rest.length ? m : [{i: 0, label: 'curr', c: 'r'}] };
        return [a, b];
      }
      out.push({ panels: P([], vals, false), line: 0, vars: {prev: 'null', curr: 1}, msg: '`prev` starts at null: the old head will point to null at the end.' });
      for (var k = 0; k < vals.length; k++){
        var done = vals.slice(0, k), rest = vals.slice(k);
        out.push({ panels: P(done, rest, true), line: 2, vars: {curr: vals[k], next: vals[k + 1] || 'null'}, msg: 'Save `next = ' + (vals[k + 1] || 'null') + '` before touching `curr.next`.' });
        out.push({ panels: P(vals.slice(0, k + 1), vals.slice(k + 1), false), line: [3, 4, 5], vars: {prev: vals[k], curr: vals[k + 1] || 'null'},
          msg: 'Point ' + vals[k] + ' back to ' + (k ? vals[k - 1] : 'null') + '. Then `prev = ' + vals[k] + '`, `curr = ' + (vals[k + 1] || 'null') + '`.' });
      }
      out.push({ panels: P(vals, [], false), line: 7, ok: true, vars: {prev: 4, curr: 'null'}, msg: '`curr` is null, so stop. `prev` is the new head: **4 → 3 → 2 → 1**.' });
      return out;
    }
  },

  variants: [
    {
      id: 'dummy', name: 'Dummy node', intro: 'A fake node before the head. Every real node, including the head, now has a node before it, so delete and insert work the same everywhere.',
      start: 'ListNode dummy = new ListNode(0, head);  ...  return dummy.next;',
      panels: [list(['dummy', 1, 2, 6, 3, 'null'], [{i: 0, label: 'prev', c: 'l'}, {i: 1, label: 'head', c: 'a'}])],
      rules: [
        ['Use it when', 'Remove elements, merge lists, partition list, remove nth from end, add two numbers (building a new list).'],
        ['Delete next node', '`prev.next = prev.next.next;` (do not move prev).'],
        ['Build a list', 'Keep a `tail`: `tail.next = new ListNode(x); tail = tail.next;`'],
        ['Return', 'Always `dummy.next`, never `head` (head may be gone).']
      ],
      probs: '203 Remove Linked List Elements, 21 Merge Two Sorted Lists, 86 Partition List, 2 Add Two Numbers, 82 Remove Duplicates II',
      tabs: [
        { name: 'Remove elements', code: J`ListNode removeElements(ListNode head, int val) {
    ListNode dummy = new ListNode(0, head);
    ListNode prev = dummy;
    while (prev.next != null) {
        if (prev.next.val == val) {
            prev.next = prev.next.next;   // skip it, stay put
        } else {
            prev = prev.next;             // keep it, move on
        }
    }
    return dummy.next;
}` },
        { name: 'Merge two sorted', code: J`ListNode mergeTwoLists(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0);
    ListNode tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;      // attach the leftover
    return dummy.next;
}` },
        { name: 'Add two numbers', code: J`ListNode addTwoNumbers(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0), tail = dummy;
    int carry = 0;
    while (l1 != null || l2 != null || carry != 0) {
        int sum = carry;
        if (l1 != null) { sum += l1.val; l1 = l1.next; }
        if (l2 != null) { sum += l2.val; l2 = l2.next; }
        tail.next = new ListNode(sum % 10);
        tail = tail.next;
        carry = sum / 10;
    }
    return dummy.next;
}` }
      ]
    },
    {
      id: 'reverse', name: 'Reverse (prev, curr, next)', short: 'Reverse',
      intro: 'Walk the list and flip each arrow. Four lines in the loop, always in the same order: save, flip, move prev, move curr.',
      start: 'ListNode prev = null, curr = head;',
      panels: [list(['null', 1, 2, 3, 'null'], [{i: 1, label: 'prev', c: 'l'}, {i: 2, label: 'curr', c: 'r'}, {i: 3, label: 'next', c: 'a'}])],
      rules: [
        ['Use it when', 'Reverse list, reverse between m and n, reverse in k-groups, palindrome list, reorder list.'],
        ['Loop', '`while (curr != null)`.'],
        ['Order', ['`ListNode next = curr.next;`', '`curr.next = prev;`', '`prev = curr;`', '`curr = next;`']],
        ['Return', '`prev` is the new head.']
      ],
      probs: '206 Reverse Linked List, 92 Reverse Linked List II, 25 Reverse Nodes in k-Group, 24 Swap Nodes in Pairs',
      tabs: [
        { name: 'Iterative', code: J`ListNode reverseList(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;   // 1. save
        curr.next = prev;            // 2. flip
        prev = curr;                 // 3. move prev
        curr = next;                 // 4. move curr
    }
    return prev;
}` },
        { name: 'Recursive', code: J`ListNode reverseListRec(ListNode head) {
    if (head == null || head.next == null) return head;   // 0 or 1 node
    ListNode newHead = reverseListRec(head.next);         // reverse the rest
    head.next.next = head;      // the node after me points back to me
    head.next = null;
    return newHead;
}` },
        { name: 'Reverse between', code: J`ListNode reverseBetween(ListNode head, int left, int right) {
    ListNode dummy = new ListNode(0, head);
    ListNode before = dummy;
    for (int i = 1; i < left; i++) before = before.next;   // node before the part
    ListNode prev = null, curr = before.next;
    for (int i = left; i <= right; i++) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    before.next.next = curr;     // old start of part -> node after the part
    before.next = prev;          // node before -> new start of part
    return dummy.next;
}` }
      ]
    },
    {
      id: 'fastslow', name: 'Fast and slow combos', short: 'Fast and slow',
      intro: 'Find the middle with fast/slow, then do something with the second half. See the Two pointers page for cycle and nth-from-end.',
      start: 'while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }',
      panels: [list([1, 2, 3, 2, 1, 'null'], [{i: 2, label: 'slow', c: 'l'}, {i: 4, label: 'fast', c: 'r'}])],
      rules: [
        ['Palindrome list', 'Middle → reverse second half → compare both halves node by node.'],
        ['Reorder list', 'Middle → cut → reverse second half → weave the two halves.'],
        ['Cycle start', 'After slow meets fast, move one pointer back to head; step both by 1; they meet at the cycle start.']
      ],
      probs: '234 Palindrome Linked List, 143 Reorder List, 142 Linked List Cycle II, 2095 Delete the Middle Node',
      tabs: [
        { name: 'Palindrome list', code: J`boolean isPalindrome(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode prev = null, curr = slow;           // reverse second half
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    ListNode a = head, b = prev;
    while (b != null) {
        if (a.val != b.val) return false;
        a = a.next;
        b = b.next;
    }
    return true;
}` },
        { name: 'Reorder list', code: J`void reorderList(ListNode head) {
    if (head == null || head.next == null) return;
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {   // slow = end of 1st half
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode second = slow.next;
    slow.next = null;                            // cut
    ListNode prev = null;
    while (second != null) {                     // reverse 2nd half
        ListNode next = second.next;
        second.next = prev;
        prev = second;
        second = next;
    }
    ListNode a = head, b = prev;
    while (b != null) {                          // weave a1 b1 a2 b2 ...
        ListNode an = a.next, bn = b.next;
        a.next = b;
        b.next = an;
        a = an;
        b = bn;
    }
}` },
        { name: 'Cycle start', code: J`ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            ListNode p = head;
            while (p != slow) { p = p.next; slow = slow.next; }
            return p;
        }
    }
    return null;
}` }
      ]
    },
    {
      id: 'twolists', name: 'Two lists and extra structure', short: 'Two lists / map',
      intro: 'Sometimes the trick is a HashMap from old node to new node, or walking two lists so they line up.',
      start: 'ListNode a = headA, b = headB;',
      panels: [list(['a1', 'a2', 'c1', 'c2', 'null'], [{i: 2, label: 'meet', c: 'hit'}], {name: 'A'}), list(['b1', 'b2', 'b3', 'c1', 'c2', 'null'], [{i: 3, label: 'meet', c: 'hit'}], {name: 'B'})],
      rules: [
        ['Intersection', 'Walk A then B, and B then A. Both walk the same total length, so they meet at the shared node (or both reach null).'],
        ['Copy with random', 'Map old → new in one pass, wire `next` and `random` in a second pass.'],
        ['Sort a list', 'Merge sort: split at middle, sort halves, merge. O(n log n).']
      ],
      probs: '160 Intersection of Two Linked Lists, 138 Copy List with Random Pointer, 148 Sort List, 23 Merge k Sorted Lists',
      tabs: [
        { name: 'Intersection', code: J`ListNode getIntersectionNode(ListNode headA, ListNode headB) {
    ListNode a = headA, b = headB;
    while (a != b) {
        a = (a == null) ? headB : a.next;   // switch lists at the end
        b = (b == null) ? headA : b.next;
    }
    return a;                               // shared node or null
}` },
        { name: 'Copy random list', code: J`Node copyRandomList(Node head) {
    Map<Node, Node> copy = new HashMap<>();
    for (Node p = head; p != null; p = p.next) {
        copy.put(p, new Node(p.val));
    }
    for (Node p = head; p != null; p = p.next) {
        copy.get(p).next = copy.get(p.next);       // get(null) returns null
        copy.get(p).random = copy.get(p.random);
    }
    return copy.get(head);
}` },
        { name: 'Sort list', code: J`ListNode sortList(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode slow = head, fast = head.next;     // slow = end of left half
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode right = slow.next;
    slow.next = null;
    return merge(sortList(head), sortList(right));
}

ListNode merge(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;
    return dummy.next;
}` }
      ]
    }
  ],

  javaUsed: [
    ['class ListNode { int val; ListNode next; }', 'LeetCode gives you this class.', 'Constructors: `new ListNode(5)` and `new ListNode(5, nextNode)`.'],
    ['ListNode dummy = new ListNode(0, head)', 'Fake node in front of head.', 'Return `dummy.next`.'],
    ['node.next = node.next.next', 'Delete the node after `node`.', 'Garbage collection frees it.'],
    ['a == b', 'Same node object (identity).', 'Use for cycle and intersection. `a.val == b.val` compares values.'],
    ['for (ListNode p = head; p != null; p = p.next)', 'Walk every node.', 'A for loop keeps the walker local.'],
    ['(a != null) ? a : b', 'Ternary: pick one of two values.', 'Attach leftovers after merging.'],
    ['Map<Node, Node>', 'Objects as keys use identity by default.', 'Perfect for old → new copy maps.'],
    ['sum % 10, sum / 10', 'Last digit and carry.', 'Add two numbers.']
  ],
  concepts: [
    { name: 'References, not copies', text: '`ListNode p = head;` makes `p` point at the same node. Changing `p.next` changes the list. Changing `p` itself (`p = p.next`) only moves your finger, not the list.', code: J`ListNode p = head;
p = p.next;        // list unchanged, p moved
p.next = null;     // list CHANGED: cut after p` },
    { name: 'Save before you overwrite', text: 'Once you set `curr.next = prev`, the old `curr.next` is unreachable unless you saved it in `next` first. Most linked list bugs are a missing "save" line.' },
    { name: 'Draw three boxes', text: 'Before writing any rewiring, draw `prev`, `curr`, `next` as boxes with arrows on paper, and change one arrow per line of code. It turns guessing into copying.' },
    { name: 'Null checks follow the jumps', text: 'If you read `x.next.next`, you need `x != null && x.next != null`. Count the dots: each dot after a variable needs that part to be non-null.' }
  ],
  loops: [
    ['`while (curr != null)`', 'Visit every node.', 'Reverse, count, print'],
    ['`while (prev.next != null)`', 'Look one ahead so you can delete it.', 'Remove elements'],
    ['`while (fast != null && fast.next != null)`', 'Safe double jump.', 'Middle (2nd), cycle'],
    ['`while (fast.next != null && fast.next.next != null)`', 'Stops one earlier: slow lands on the 1st middle.', 'Reorder, split'],
    ['`while (a != null && b != null)`', 'Both lists still have nodes.', 'Merge']
  ],
  movesTitle: 'Rewiring moves',
  moves: [
    ['`ListNode next = curr.next; curr.next = prev; prev = curr; curr = next;`', 'Reverse one node', 'Reverse'],
    ['`prev.next = prev.next.next;`', 'Delete the node after prev', 'Remove'],
    ['`tail.next = node; tail = tail.next;`', 'Append to a new list', 'Merge, build'],
    ['`slow.next = null;`', 'Cut the list in two', 'Split for sort / reorder'],
    ['`a = (a == null) ? headB : a.next;`', 'Switch to the other list at the end', 'Intersection']
  ],
  bugs: [
    ['Lost the rest of the list', 'Changed `curr.next` before saving it.', '`ListNode next = curr.next;` first.'],
    ['NullPointerException', '`curr.next.val` when `curr.next` is null.', 'check every node you dot into.'],
    ['Returned the old head', 'After removing or reversing, `head` is no longer the first node.', 'return `dummy.next` or `prev`.'],
    ['Moved prev after deleting', 'Skips checking the new `prev.next`.', 'after a delete, stay; only move when you keep.'],
    ['Comparing values instead of nodes', 'Two different nodes can have the same value.', 'use `==` on nodes for identity.'],
    ['Forgot to cut', 'Splitting without `slow.next = null` keeps both halves connected (or makes a cycle).', 'cut explicitly.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-rev', title: 'Reverse a linked list', ask: 'Save, flip, move prev, move curr.', code: J`ListNode reverseList(ListNode head) {
    ListNode prev = [[null]], curr = head;
    while ([[curr != null]]) {
        ListNode next = [[curr.next]];
        curr.next = [[prev]];
        prev = [[curr]];
        curr = [[next]];
    }
    return [[prev]];
}` },
      { id: 'fb-merge', title: 'Merge two sorted lists', ask: 'Dummy + tail. Attach the smaller node, then attach leftovers.', code: J`ListNode mergeTwoLists(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = [[dummy]];
    while (a != null [[&&]] b != null) {
        if (a.val <= b.val) { tail.next = a; a = [[a.next]]; }
        else { tail.next = b; b = b.next; }
        tail = [[tail.next]];
    }
    tail.next = (a != null) ? [[a]] : [[b]];
    return [[dummy.next]];
}` },
      { id: 'fb-remove', title: 'Remove linked list elements', ask: 'Delete every node with value `val`.', code: J`ListNode removeElements(ListNode head, int val) {
    ListNode dummy = new ListNode(0, [[head]]);
    ListNode prev = dummy;
    while (prev.next != null) {
        if (prev.next.val == val) prev.next = [[prev.next.next]];
        else prev = [[prev.next]];
    }
    return dummy.next;
}` }
    ],
    order: [
      { id: 'od-addtwo', title: 'Add two numbers',
        ideaSteps: ['Dummy + tail to build the answer; carry starts at 0.', 'Loop while either list has nodes or there is a carry.', 'Sum = carry + the current digits that exist (move those lists forward).', 'Append `sum % 10`; new carry = `sum / 10`.', 'Return the list after the dummy.'],
        lines: [
          'ListNode dummy = new ListNode(0), tail = dummy;',
          'int carry = 0;',
          'while (l1 != null || l2 != null || carry != 0) {',
          '    int sum = carry;',
          '    if (l1 != null) { sum += l1.val; l1 = l1.next; }',
          '    if (l2 != null) { sum += l2.val; l2 = l2.next; }',
          '    tail.next = new ListNode(sum % 10);',
          '    tail = tail.next;',
          '    carry = sum / 10;',
          '}',
          'return dummy.next;'
        ],
        extra: ['while (l1 != null && l2 != null) {', 'return head;'],
        wrap: 'ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n@@\n}' },
      { id: 'od-middle-del', title: 'Delete the middle node',
        ideaSteps: ['A single node list becomes empty.', 'Start `fast` two nodes ahead so `slow` stops just **before** the middle.', 'Move slow by 1 and fast by 2 while fast can jump.', 'Skip the middle node.'],
        lines: [
          'if (head.next == null) return null;',
          'ListNode slow = head, fast = head.next.next;',
          'while (fast != null && fast.next != null) {',
          '    slow = slow.next;',
          '    fast = fast.next.next;',
          '}',
          'slow.next = slow.next.next;',
          'return head;'
        ],
        wrap: 'ListNode deleteMiddle(ListNode head) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['206', 'Reverse Linked List'], ['21', 'Merge Two Sorted Lists'], ['203', 'Remove Linked List Elements'], ['83', 'Remove Duplicates from Sorted List'], ['876', 'Middle of the Linked List'], ['160', 'Intersection of Two Linked Lists'], ['234', 'Palindrome Linked List']],
    next: [['2', 'Add Two Numbers'], ['19', 'Remove Nth Node From End of List'], ['92', 'Reverse Linked List II'], ['143', 'Reorder List'], ['142', 'Linked List Cycle II'], ['138', 'Copy List with Random Pointer'], ['148', 'Sort List'], ['25', 'Reverse Nodes in k-Group']]
  }
});
})();
