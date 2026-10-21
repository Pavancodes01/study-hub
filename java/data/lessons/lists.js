(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const nil = { ref: null };
  const AL = (size, arr) => ({ id: 'al', type: 'ArrayList', fields: [v('size', size), r('elementData', arr)] });
  const arr = (id, cells, gone) => ({ id, type: 'Object[' + cells.length + ']', cells: cells.map((c) => (c === null ? nil : c)), gone: !!gone });
  const LL = (size, first, last) => ({ id: 'll', type: 'LinkedList', fields: [v('size', size), first ? r('first', first) : r('first', null), last ? r('last', last) : r('last', null)] });
  const node = (id, item, next, prev) => ({ id, type: 'Node', fields: [v('item', item), next ? r('next', next) : r('next', null), v('prev', prev)], row: 'nodes' });
  const A = [{ frame: 'main', vars: [r('arr', 'al')] }];
  const B = [{ frame: 'main', vars: [r('arr', 'al'), r('link', 'll')] }];
  const alDone = [AL(5, 'e6'), arr('e6', [9, 1, 2, 3, 4, null])];

  registerLesson({
    slug: 'lists',
    track: 'core',
    title: 'ArrayList vs LinkedList',
    one: 'ArrayList is a *growable array*: instant `get(i)`, costly inserts in the middle. LinkedList is a *chain of nodes*: cheap at the ends, slow to reach index i.',
    idea: [
      'An ArrayList stores elements in an `Object[]`. When the array is full it allocates one about 1.5 times bigger and copies everything over. Appending is O(1) on average; inserting at the front shifts every element.',
      'A LinkedList stores each element in its own `Node` with links to the next and previous nodes. Adding or removing at either end is O(1), but `get(i)` must walk the chain.',
      'In practice ArrayList wins almost always: arrays are compact and cache-friendly, and each LinkedList node costs an extra object. Use ArrayDeque when you need a queue.'
    ],
    stages: [
      {
        title: 'Growing and linking',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> arr = new ArrayList<>(3);
        arr.add(1);
        arr.add(2);
        arr.add(3);
        arr.add(4);
        arr.add(0, 9);
        LinkedList<Integer> link = new LinkedList<>();
        link.add(1);
        link.add(2);
        link.addFirst(9);
        System.out.println(arr + " " + link);
    }
}`,
        steps: [
          { line: 5, text: 'Initial capacity 3: an empty array of 3 slots.', stack: A, heap: [AL(0, 'e3'), arr('e3', [null, null, null])], out: '' },
          { line: 8, text: 'Three appends fill the array. Each one just writes the next slot: O(1).', heap: [AL(3, 'e3'), arr('e3', [1, 2, 3])] },
          { line: 9, text: 'Full. A new array of 3 + 3/2 = 4 slots is allocated and the old contents copied. The old array becomes garbage.',
            heap: [AL(4, 'e4'), arr('e4', [1, 2, 3, 4]), arr('e3', [1, 2, 3], true)] },
          { line: 10, text: '`add(0, 9)` must shift every element one place right, and the array is full again, so it grows to 6 first. O(n).',
            heap: alDone.concat([arr('e4', [1, 2, 3, 4], true)]) },
          { line: 11, text: 'An empty LinkedList: just a size and two end pointers.', stack: B, heap: alDone.concat([LL(0)]) },
          { line: 13, text: 'Each element lives in its own Node object. The list points at the first and last node.',
            heap: alDone.concat([LL(2, 'n1', 'n2'), node('n1', 1, 'n2', 'null'), node('n2', 2, null, '← 1')]) },
          { line: 14, text: '`addFirst` creates one node and relinks two pointers. Nothing is shifted: O(1).',
            heap: alDone.concat([LL(3, 'n0', 'n2'), node('n0', 9, 'n1', 'null'), node('n1', 1, 'n2', '← 9'), node('n2', 2, null, '← 1')]) },
          { line: 15, text: 'Both print in list order.', out: '[9, 1, 2, 3, 4] [9, 1, 2]\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Costs side by side',
        text: [
          'Big-O is not the whole story. Even where LinkedList wins on paper (insert in the middle), you first have to walk to that position, which is O(n) and slow because each node is a separate object scattered in memory.'
        ]
      },
      {
        name: 'Useful List methods',
        text: [],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(5, 3, 8, 3));
        l.sort(null);                              // natural order
        System.out.println(l + " " + l.indexOf(3) + " " + l.lastIndexOf(3));
        l.removeIf(x -> x < 4);
        l.replaceAll(x -> x * 10);
        System.out.println(l);
        List<Integer> view = l.subList(0, 1);      // a view, not a copy
        view.set(0, 0);
        System.out.println(l + " " + l.getFirst() + " " + l.reversed());
    }
}`,
        expect: '[3, 3, 5, 8] 0 1\n[50, 80]\n[0, 80] 0 [80, 0]'
      },
      {
        name: 'Removing while looping',
        text: [
          'Removing by index in a forward loop skips the element after each removal. Loop backwards, use an iterator\'s `remove()`, or simply `removeIf`.'
        ]
      }
    ],
    table: {
      head: ['Operation', 'ArrayList', 'LinkedList'],
      rows: [
        ['`get(i)` / `set(i)`', 'O(1)', 'O(n)'],
        ['`add(x)` at end', 'O(1) amortized', 'O(1)'],
        ['`add(0, x)` / remove first', 'O(n) shift', 'O(1)'],
        ['insert/remove in middle', 'O(n) shift', 'O(n) to walk there, then O(1)'],
        ['`contains`', 'O(n)', 'O(n)'],
        ['memory per element', 'one slot', 'node object (~24+ bytes)']
      ]
    },
    pitfalls: [
      ['`for (int i...) list.get(i)` on a LinkedList', 'Each `get` walks from an end: O(n²) total. Use for-each.'],
      ['Removing by index in a forward loop', 'Indexes shift and elements get skipped.'],
      ['`list.remove(1)` on `List<Integer>`', 'Removes index 1, not the value 1.'],
      ['Changing the parent list while a `subList` view exists', 'The view becomes invalid and throws ConcurrentModificationException.']
    ],
    interview: [
      ['How does ArrayList grow?', ['When full, it creates a new array of about 1.5× the old capacity (`old + old >> 1`) and copies the elements with `Arrays.copyOf`. So appends are amortized O(1).']],
      ['When would you choose LinkedList?', ['Rarely. Mainly when you constantly add and remove at both ends and already hold an iterator at the position, and even then ArrayDeque is usually faster for ends.']],
      ['What is the default capacity of an ArrayList?', ['10, but allocated lazily on the first add; `new ArrayList<>()` starts with a shared empty array.']]
    ],
    say: [
      'ArrayList: O(1) index access, O(n) inserts at the front.',
      'LinkedList: O(1) at the ends, O(n) to reach an index.',
      'Default to ArrayList; use ArrayDeque for queues.'
    ],
    checklist: [
      'Describe what happens when an ArrayList is full.',
      'Give the cost of `get(i)` for both lists.',
      'Remove matching elements safely.',
      'Explain why LinkedList is rarely faster in practice.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(10, 20, 30));
        l.remove(Integer.valueOf(10));
        l.remove(0);
        System.out.println(l);
    }
}`,
          answer: '[30]',
          why: 'First remove by value (10), then by index (20 is now at index 0).'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(1, 2, 3, 4));
        List<Integer> s = l.subList(1, 3);
        s.set(0, 99);
        System.out.println(l + " " + s);
    }
}`,
          answer: '[1, 99, 3, 4] [99, 3]',
          why: '`subList` is a view of indexes 1 and 2 of the same list, so writing through it changes the original.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        LinkedList<Integer> d = new LinkedList<>();
        d.add(1);
        d.push(0);
        d.offerLast(2);
        System.out.println(d + " " + d.peekLast());
    }
}`,
          answer: '[0, 1, 2] 2',
          why: 'LinkedList is also a Deque: `push` adds at the front, `offerLast` at the back.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(3, 1, 2));
        l.sort(null);
        System.out.println(l + " " + l.indexOf(2) + " " + l.contains(5));
    }
}`,
          answer: '[1, 2, 3] 1 false',
          why: '`sort(null)` uses natural order. After sorting, 2 is at index 1.'
        }
      ],
      fill: [
        {
          q: 'Replace the first element and read it back.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(1, 2));
        l.[[set]](0, 100);
        System.out.println(l.[[get]](0));
    }
}`,
          expect: '100',
          why: '`set(i, x)` replaces, `add(i, x)` inserts and shifts.'
        },
        {
          q: 'Drop the even numbers.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(1, 2, 3, 4));
        l.[[removeIf]](x -> x % 2 == 0);
        System.out.println(l);
    }
}`,
          expect: '[1, 3]',
          why: '`removeIf` removes safely in one pass.'
        }
      ],
      bug: [
        {
          q: 'Remove all even numbers; expect [5].',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(2, 4, 5));
        for (int i = 0; i < l.size(); i++) {
            if (l.get(i) % 2 == 0) l.remove(i);
        }
        System.out.println(l);
    }
}`,
          line: 6,
          fix: 'for (int i = l.size() - 1; i >= 0; i--) {',
          expect: '[5]',
          why: 'After removing index 0, the 4 slides into index 0 and the loop moves on to index 1, skipping it. Going backwards avoids that.'
        },
        {
          q: 'Remove the value 1; expect [2, 3].',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(1, 2, 3));
        l.remove(1);
        System.out.println(l);
    }
}`,
          line: 6,
          fix: 'l.remove(Integer.valueOf(1));',
          expect: '[2, 3]',
          why: 'With an `int` argument, `remove` treats it as an index.'
        }
      ]
    }
  });
})();
