(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const e = (id, key, val, left, right, color, row) => ({ id, type: 'Entry · ' + color, fields: [v('key', key), v('val', '"' + val + '"'), left ? r('left', left) : r('left', null), right ? r('right', right) : r('right', null)], row });
  const TM = (root, size) => ({ id: 'tm', type: 'TreeMap', fields: [root ? r('root', root) : r('root', null), v('size', size)] });
  const S = [{ frame: 'main', vars: [r('t', 'tm')] }];
  const L = (order) => ({ id: 'lh', type: 'LinkedHashMap (access order)', fields: [v('eldest → newest', order), v('size', order === '—' ? 0 : order.split(',').length)] });

  registerLesson({
    slug: 'sets-maps',
    track: 'core',
    title: 'HashSet, TreeMap and LinkedHashMap',
    one: 'Same `Map` interface, three orders: HashMap has *none*, LinkedHashMap keeps *insertion (or access)* order, TreeMap keeps keys *sorted*.',
    idea: [
      'A **HashSet** is a HashMap that only uses keys (every value is the same dummy object). So everything from the HashMap lesson applies: O(1) average, hashCode/equals required, no order.',
      'A **TreeMap** is a red-black tree: a self-balancing binary search tree. Smaller keys go left, larger go right, so iteration is sorted and you get `floorKey`, `ceilingKey`, `headMap` and friends. Operations are O(log n). TreeSet is a TreeMap with dummy values.',
      'A **LinkedHashMap** is a HashMap whose entries are also chained in a doubly linked list, giving predictable iteration. In access-order mode plus `removeEldestEntry`, it becomes an LRU cache in a few lines.'
    ],
    stages: [
      {
        title: 'TreeMap is a search tree',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        TreeMap<Integer, String> t = new TreeMap<>();
        t.put(50, "m");
        t.put(30, "c");
        t.put(70, "t");
        t.put(60, "p");
        System.out.println(t.firstKey() + " " + t.ceilingKey(55) + " " + t.headMap(60));
    }
}`,
        steps: [
          { line: 5, text: 'An empty tree.', stack: S, heap: [TM(null, 0)], out: '' },
          { line: 6, text: '50 becomes the root.', heap: [TM('e50', 1), e('e50', 50, 'm', null, null, 'black', 'a')] },
          { line: 7, text: '30 < 50, so it goes to the left.', heap: [TM('e50', 2), e('e50', 50, 'm', 'e30', null, 'black', 'a'), e('e30', 30, 'c', null, null, 'red', 'b')] },
          { line: 8, text: '70 > 50, so it goes to the right.', heap: [TM('e50', 3), e('e50', 50, 'm', 'e30', 'e70', 'black', 'a'), e('e30', 30, 'c', null, null, 'red', 'b'), e('e70', 70, 't', null, null, 'red', 'b')] },
          { line: 9, text: '60: right of 50, left of 70. Two reds in a row are not allowed, so 30 and 70 are recoloured black. The tree stays balanced, so every lookup is O(log n).',
            heap: [TM('e50', 4), e('e50', 50, 'm', 'e30', 'e70', 'black', 'a'), e('e30', 30, 'c', null, null, 'black', 'b'), e('e70', 70, 't', 'e60', null, 'black', 'b'), e('e60', 60, 'p', null, null, 'red', 'c')] },
          { line: 10, text: '`firstKey`: walk left to 30. `ceilingKey(55)`: smallest key ≥ 55 is 60. `headMap(60)`: keys strictly below 60.', out: '30 60 {30=c, 50=m}\n' }
        ]
      },
      {
        title: 'LinkedHashMap as an LRU cache',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> lru = new LinkedHashMap<>(16, 0.75f, true) {
            protected boolean removeEldestEntry(Map.Entry<String, Integer> e) {
                return size() > 2;
            }
        };
        lru.put("a", 1);
        lru.put("b", 2);
        lru.get("a");
        lru.put("c", 3);
        System.out.println(lru.keySet());
    }
}`,
        steps: [
          { line: 5, text: 'The third constructor argument `true` means **access order**: every get or put moves the entry to the newest end.', stack: [{ frame: 'main', vars: [r('lru', 'lh')] }], heap: [L('—')], out: '' },
          { line: 10, text: 'a is added.', heap: [L('a')] },
          { line: 11, text: 'b is added after it.', heap: [L('a, b')] },
          { line: 12, text: 'Reading a counts as using it, so it moves to the newest end.', heap: [L('b, a')] },
          { line: 13, text: 'c is added, size becomes 3, and `removeEldestEntry` returns true, so the least recently used entry (b) is evicted.', heap: [L('a, c')] },
          { line: 14, text: 'b is gone.', out: '[a, c]\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Navigating a TreeMap / TreeSet',
        text: [
          [
            '`firstKey`, `lastKey`, `pollFirstEntry`',
            '`floorKey(k)` ≤ k, `ceilingKey(k)` ≥ k, `lowerKey(k)` < k, `higherKey(k)` > k (null if none)',
            '`headMap(k)` keys < k, `tailMap(k)` keys ≥ k, `subMap(a, b)` keys in [a, b)',
            '`descendingMap()` / `descendingSet()`'
          ]
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        TreeMap<Integer, String> grade = new TreeMap<>(Map.of(0, "F", 60, "D", 70, "C", 80, "B", 90, "A"));
        for (int score : new int[]{55, 85, 90}) {
            System.out.print(grade.floorEntry(score).getValue() + " ");
        }
        System.out.println();
    }
}`,
        expect: 'F B A'
      },
      {
        name: 'Set algebra',
        text: [
          '`addAll` is union, `retainAll` is intersection, `removeAll` is difference. They change the receiver, so copy first if you need the original.'
        ]
      }
    ],
    table: {
      head: ['', 'HashMap / HashSet', 'LinkedHashMap / LinkedHashSet', 'TreeMap / TreeSet'],
      rows: [
        ['Order', 'none', 'insertion (or access)', 'sorted by key'],
        ['get / put / contains', 'O(1)', 'O(1)', 'O(log n)'],
        ['Needs', '`hashCode` + `equals`', '`hashCode` + `equals`', '`Comparable` or a `Comparator`'],
        ['null key', 'one allowed', 'one allowed', 'no (natural order)'],
        ['Extra', '', 'LRU with `removeEldestEntry`', 'floor / ceiling / ranges']
      ]
    },
    pitfalls: [
      ['TreeSet of a class that is not Comparable', 'ClassCastException on the first add. Pass a Comparator.'],
      ['A comparator that says two different items are equal', 'TreeSet/TreeMap treat them as duplicates and drop one.'],
      ['Expecting sorted output from HashMap', 'Use TreeMap.'],
      ['Access-order LinkedHashMap and `get`', 'In access mode `get` changes the order, which surprises code that only reads.']
    ],
    interview: [
      ['How is HashSet implemented?', ['With a HashMap: elements are keys, and every value is a shared dummy object. `add` is `map.put(e, PRESENT) == null`.']],
      ['How is TreeMap implemented?', ['As a red-black tree, a binary search tree that keeps itself balanced with node colours and rotations, so height stays O(log n).']],
      ['How would you build an LRU cache in Java?', ['Extend LinkedHashMap with `accessOrder = true` and override `removeEldestEntry` to return `size() > capacity`. Both get and put are O(1). For concurrency, wrap it or use a library such as Caffeine.']]
    ],
    say: [
      'HashSet is a HashMap of keys.',
      'TreeMap is a red-black tree: sorted, O(log n), with floor/ceiling.',
      'LinkedHashMap in access order plus removeEldestEntry is an LRU cache.'
    ],
    checklist: [
      'Insert keys into a BST by hand.',
      'Use floor/ceiling to look up a range.',
      'Write an LRU cache with LinkedHashMap.',
      'Choose between the three maps for a given need.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(new LinkedHashSet<>(List.of(3, 1, 2)));
        System.out.println(new TreeSet<>(List.of(3, 1, 2)).descendingSet());
    }
}`,
          answer: '[3, 1, 2]\n[3, 2, 1]',
          why: 'LinkedHashSet keeps insertion order; a TreeSet\'s descending view goes from largest to smallest.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        TreeMap<Integer, String> m = new TreeMap<>(Map.of(10, "a", 20, "b", 30, "c"));
        System.out.println(m.floorKey(25) + " " + m.higherKey(30) + " " + m.lowerKey(10));
    }
}`,
          answer: '20 null null',
          why: 'The largest key ≤ 25 is 20; there is no key above 30 or below 10.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Set<Integer> a = new TreeSet<>(List.of(1, 2, 3));
        a.retainAll(Set.of(2, 3, 4));
        System.out.println(a);
    }
}`,
          answer: '[2, 3]',
          why: '`retainAll` keeps only elements also in the argument: the intersection.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        TreeMap<String, Integer> m = new TreeMap<>();
        m.put("b", 1);
        m.put("a", 2);
        m.put("c", 3);
        System.out.println(m.subMap("a", "c") + " " + m.firstEntry());
    }
}`,
          answer: '{a=2, b=1} a=2',
          why: '`subMap(from, to)` includes `from` and excludes `to`.'
        }
      ],
      fill: [
        {
          q: 'Find the grade band for a score.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        TreeMap<Integer, String> bands = new TreeMap<>(Map.of(0, "F", 70, "C", 80, "B", 90, "A"));
        System.out.println(bands.[[floorEntry]](85).getValue());
    }
}`,
          expect: 'B',
          why: '`floorEntry(k)` returns the entry with the greatest key ≤ k.'
        },
        {
          q: 'Keep keys in the order they were added.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new [[LinkedHashMap]]<>();
        m.put("z", 1);
        m.put("a", 2);
        System.out.println(m);
    }
}`,
          expect: '{z=1, a=2}',
          why: 'TreeMap would sort to `{a=2, z=1}`.'
        }
      ],
      bug: [
        {
          q: 'Jobs should be kept ordered by priority.',
          code: `import java.util.*;

public class Main {
    record Job(int priority) {}
    public static void main(String[] args) {
        Set<Job> jobs = new TreeSet<>();
        jobs.add(new Job(5));
        jobs.add(new Job(1));
        System.out.println(jobs.iterator().next().priority());
    }
}`,
          line: 6,
          fix: 'Set<Job> jobs = new TreeSet<>(Comparator.comparingInt(Job::priority));',
          expect: '1',
          why: 'Job is not Comparable, so the TreeSet throws ClassCastException. Give it a Comparator.'
        },
        {
          q: 'Print the scores sorted by name.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> scores = new HashMap<>();
        scores.put("bob", 3);
        scores.put("al", 9);
        scores.put("cy", 5);
        System.out.println(scores);
    }
}`,
          line: 5,
          fix: 'Map<String, Integer> scores = new TreeMap<>();',
          expect: '{al=9, bob=3, cy=5}',
          why: 'HashMap order follows the buckets (here bob, cy, al). TreeMap sorts by key.'
        }
      ]
    }
  });
})();
