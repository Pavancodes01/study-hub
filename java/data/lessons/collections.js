(function () {
  const r = (name, ref) => ({ name, ref });
  const c = (id, type, val) => ({ id, type, val });
  const F = (vars) => [{ frame: 'main', vars }];
  const vars3 = [r('list', 'L'), r('hash', 'H'), r('tree', 'T')];
  const three = (l, h, t) => [c('L', 'ArrayList', l), c('H', 'HashSet', h), c('T', 'TreeSet', t)];

  registerLesson({
    slug: 'collections',
    track: 'core',
    title: 'The Collections Framework',
    one: 'Pick by the question you ask most: *by position* (List), *is it there?* (Set), *by key* (Map), *next in line* (Queue/Deque).',
    idea: [
      'The framework is a set of interfaces with several implementations each. Code against the interface (`List<String> l = new ArrayList<>()`) and choose the implementation for its performance and ordering.',
      '`List` keeps order and allows duplicates. `Set` rejects duplicates. `Map` stores key→value pairs and is not a `Collection`. `Queue` and `Deque` model waiting lines and stacks.',
      'Ordering differs: HashSet/HashMap have no defined order, LinkedHashSet/LinkedHashMap keep insertion order, TreeSet/TreeMap keep sorted order.'
    ],
    stages: [
      {
        title: 'Same input, three collections',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();
        Set<String> hash = new HashSet<>();
        Set<String> tree = new TreeSet<>();
        for (String s : new String[]{"b", "a", "b"}) {
            list.add(s);
            hash.add(s);
            tree.add(s);
        }
        System.out.println(list + " " + hash + " " + tree);
        Deque<String> stack = new ArrayDeque<>();
        stack.push("x");
        stack.push("y");
        System.out.println(stack.pop() + stack.peek());
    }
}`,
        steps: [
          { line: 7, text: 'Three empty collections. Contents are shown in their iteration order.', stack: F(vars3), heap: three('[]', '[]', '[]'), out: '' },
          { line: 11, text: '"b" goes into all three.', stack: F(vars3.concat([{ name: 's', value: '"b"' }])), heap: three('[b]', '[b]', '[b]') },
          { line: 11, text: '"a": the list appends at the end; the TreeSet keeps it sorted; the HashSet places it by hash.', stack: F(vars3.concat([{ name: 's', value: '"a"' }])), heap: three('[b, a]', '[a, b]', '[a, b]') },
          { line: 11, text: '"b" again: the list accepts the duplicate. Both sets ignore it (`add` returns false).', stack: F(vars3.concat([{ name: 's', value: '"b"' }])), heap: three('[b, a, b]', '[a, b]', '[a, b]') },
          { line: 13, text: 'Lists keep duplicates and insertion order; sets do not keep duplicates.', stack: F(vars3), out: '[b, a, b] [a, b] [a, b]\n' },
          { line: 14, text: '`ArrayDeque` is the recommended stack and queue.', stack: F(vars3.concat([r('stack', 'D')])), heap: three('[b, a, b]', '[a, b]', '[a, b]').concat([c('D', 'ArrayDeque', '[]')]) },
          { line: 16, text: '`push` adds at the front (head).', heap: three('[b, a, b]', '[a, b]', '[a, b]').concat([c('D', 'ArrayDeque', '[y, x]')]) },
          { line: 17, text: '`pop` removes the head (y); `peek` looks at the new head (x) without removing it.', heap: three('[b, a, b]', '[a, b]', '[a, b]').concat([c('D', 'ArrayDeque', '[x]')]), out: '[b, a, b] [a, b] [a, b]\nyx\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The family tree',
        text: [
          [
            '`Collection` → `List` (ArrayList, LinkedList), `Set` (HashSet, LinkedHashSet, TreeSet), `Queue` → `Deque` (ArrayDeque, LinkedList), PriorityQueue.',
            '`Map` (HashMap, LinkedHashMap, TreeMap) is a separate hierarchy.',
            '`SortedSet`/`NavigableSet` and `SortedMap`/`NavigableMap` add range and nearest-match methods (`floor`, `ceiling`, `headMap`).',
            'Java 21 adds `SequencedCollection`: `getFirst()`, `getLast()`, `reversed()` on lists, deques and linked/sorted sets.'
          ]
        ]
      },
      {
        name: 'Immutable factories',
        text: [
          '`List.of`, `Set.of` and `Map.of` create small **unmodifiable** collections. They reject nulls, and `Set.of`/`Map.of` reject duplicates and have no fixed iteration order. `Arrays.asList` is different: fixed size, but `set` is allowed and it writes through to the array.'
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> fixed = Arrays.asList("a", "b");
        fixed.set(0, "z");
        System.out.println(fixed);
        try {
            List.of(1, 2).add(3);
        } catch (UnsupportedOperationException e) {
            System.out.println("List.of is unmodifiable");
        }
    }
}`,
        expect: '[z, b]\nList.of is unmodifiable'
      },
      {
        name: 'Priority queue',
        text: [
          '`PriorityQueue` is a binary heap: `offer` and `poll` are O(log n), `peek` is O(1), and `poll` always returns the smallest element (or the largest with a reversed comparator). Its iteration order is **not** sorted.'
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        PriorityQueue<Integer> pq = new PriorityQueue<>(Comparator.reverseOrder());
        pq.addAll(List.of(4, 9, 1));
        System.out.println(pq.poll() + " " + pq.poll() + " " + pq.poll());
    }
}`,
        expect: '9 4 1'
      }
    ],
    table: {
      head: ['Need', 'Use', 'Key operations'],
      rows: [
        ['indexed list', '`ArrayList`', 'get O(1), add at end O(1)*'],
        ['unique items, fast lookup', '`HashSet`', 'add / contains O(1)'],
        ['unique, insertion order', '`LinkedHashSet`', 'O(1), ordered iteration'],
        ['unique, sorted, ranges', '`TreeSet`', 'O(log n), floor / ceiling'],
        ['key → value', '`HashMap`', 'O(1) get / put'],
        ['sorted keys', '`TreeMap`', 'O(log n), first / last / subMap'],
        ['stack or queue', '`ArrayDeque`', 'push / pop / offer / poll O(1)'],
        ['always take smallest', '`PriorityQueue`', 'offer / poll O(log n)']
      ]
    },
    pitfalls: [
      ['Using `Stack` or `Vector`', 'Legacy and synchronized. Use `ArrayDeque`.'],
      ['Modifying `List.of(...)`', 'Throws UnsupportedOperationException. Copy into `new ArrayList<>(...)` first.'],
      ['Expecting HashSet/HashMap order', 'There is none. Choose LinkedHash* or Tree*.'],
      ['`queue.remove()` / `element()` on empty', 'They throw. `poll()` / `peek()` return null instead.']
    ],
    interview: [
      ['List vs Set vs Map?', ['A List is ordered and allows duplicates, accessed by index. A Set holds unique elements. A Map associates keys with values and is not a Collection.']],
      ['Why prefer ArrayDeque over Stack?', ['Stack extends Vector, so every call is synchronized, and it exposes index methods that break the stack idea. ArrayDeque is faster and has a clean Deque API.']],
      ['What does a PriorityQueue guarantee?', ['Only that the head is the minimum according to its ordering. Iterating or printing it does not give sorted order.']]
    ],
    say: [
      'Code to interfaces; choose the implementation for its order and complexity.',
      'Hash: no order. Linked: insertion order. Tree: sorted.',
      'Use ArrayDeque for stacks and queues.'
    ],
    checklist: [
      'Pick a collection for five common needs.',
      'Explain `Arrays.asList` vs `List.of`.',
      'Use a Deque as both a stack and a queue.',
      'Say what PriorityQueue does and does not sort.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Queue<Integer> q = new PriorityQueue<>(List.of(5, 1, 3));
        System.out.println(q.poll() + " " + q.poll());
    }
}`,
          answer: '1 3',
          why: 'A min-heap always gives the smallest remaining element.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new TreeMap<>(Map.of("b", 2, "a", 1));
        System.out.println(m.keySet() + " " + m.values());
    }
}`,
          answer: '[a, b] [1, 2]',
          why: 'TreeMap sorts by key, and `values()` follows the key order.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Deque<Integer> d = new ArrayDeque<>();
        d.offer(1);
        d.offer(2);
        d.push(0);
        System.out.println(d.pollLast() + " " + d.peekFirst() + " " + d);
    }
}`,
          answer: '2 0 [0, 1]',
          why: '`offer` adds at the tail, `push` at the head. `pollLast` removes 2 from the tail.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Set<Integer> s = new HashSet<>();
        System.out.println(s.add(1) + " " + s.add(1) + " " + s.size());
    }
}`,
          answer: 'true false 1',
          why: '`add` returns false when the element is already present.'
        }
      ],
      fill: [
        {
          q: 'Use a deque as a stack.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Deque<Integer> stack = new [[ArrayDeque]]<>();
        stack.[[push]](1);
        stack.push(2);
        System.out.println(stack.pop());
    }
}`,
          expect: '2',
          why: '`push` and `pop` work at the head, giving last-in first-out.'
        },
        {
          q: 'Remove duplicates but keep first-seen order.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Set<String> unique = new [[LinkedHashSet]]<>(List.of("b", "a", "b"));
        System.out.println(unique);
    }
}`,
          expect: '[b, a]',
          why: 'LinkedHashSet keeps insertion order. TreeSet would sort, HashSet has no defined order.'
        }
      ],
      bug: [
        {
          q: 'Should print [a, b].',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> todo = List.of("a");
        todo.add("b");
        System.out.println(todo);
    }
}`,
          line: 5,
          fix: 'List<String> todo = new ArrayList<>(List.of("a"));',
          expect: '[a, b]',
          why: '`List.of` is unmodifiable. Copy it into an ArrayList to change it.'
        },
        {
          q: 'An empty queue should print "none".',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Queue<String> q = new ArrayDeque<>();
        String next = q.remove();
        System.out.println(next == null ? "none" : next);
    }
}`,
          line: 6,
          fix: 'String next = q.poll();',
          expect: 'none',
          why: '`remove()` throws on an empty queue; `poll()` returns null.'
        }
      ]
    }
  });
})();
