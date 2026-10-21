(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const map = (table, size, threshold) => ({ id: 'hm', type: 'HashMap', fields: [table ? r('table', table) : r('table', null), v('size', size), v('threshold', threshold)] });
  const node = (id, key, val, next, row) => ({ id, type: 'Node · hash ' + key, fields: [v('key', key), v('val', '"' + val + '"'), next ? r('next', next) : r('next', null)], row: 'chains', col: row || 'b1' });
  const main = [{ frame: 'main', vars: [r('m', 'hm')] }];
  const nil = { ref: null };
  const at = (id) => ({ ref: id });

  registerLesson({
    slug: 'hashmap',
    track: 'core',
    title: 'HashMap internals',
    one: 'A HashMap is an *array of buckets*. The key\'s hash picks the bucket; `equals` finds the key inside it.',
    idea: [
      '`put(k, v)` computes `k.hashCode()`, mixes the high bits in, and uses `hash & (capacity - 1)` as the array index. Different keys can land in the same bucket; that is a **collision**, and the bucket becomes a small linked list.',
      '`get(k)` repeats the same calculation, jumps to that bucket and walks it, comparing hashes first and then `equals`. That is why get and put are O(1) on average.',
      'When the map is more than 75% full it **doubles** the array and redistributes the entries. Very long buckets (8+) turn into red-black trees.'
    ],
    stages: [
      {
        title: 'put, collide, resize',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<Integer, String> m = new HashMap<>(4);
        m.put(1, "one");
        m.put(5, "five");
        m.put(2, "two");
        m.put(9, "nine");
        System.out.println(m);
        System.out.println(m.get(9));
    }
}`,
        steps: [
          { line: 5, text: 'The map remembers capacity 4 but does not create the table yet. It is made on the first `put`. (An `Integer`\'s hash is just its value.)',
            stack: main, heap: [map(null, 0, 4)], out: '' },
          { line: 6, text: 'First put: the table of 4 buckets is created. Index = `1 & 3` = **1**. Threshold becomes 4 × 0.75 = 3.',
            heap: [map('t4', 1, 3), { id: 't4', type: 'Node[4]', cells: [nil, at('n1'), nil, nil] }, node('n1', 1, 'one')] },
          { line: 7, text: '`5 & 3` = **1** too: a collision. Key 5 is not `equals` to key 1, so a new node is linked after it.',
            heap: [map('t4', 2, 3), { id: 't4', type: 'Node[4]', cells: [nil, at('n1'), nil, nil] }, node('n1', 1, 'one', 'n5'), node('n5', 5, 'five')] },
          { line: 8, text: '`2 & 3` = **2**, an empty bucket. Size is 3, which is not above the threshold of 3.',
            heap: [map('t4', 3, 3), { id: 't4', type: 'Node[4]', cells: [nil, at('n1'), at('n2'), nil] }, node('n1', 1, 'one', 'n5'), node('n5', 5, 'five'), node('n2', 2, 'two', null, 'b2')] },
          { line: 9, text: '`9 & 3` = **1** again, so it goes to the end of bucket 1. Size is now 4, which is above 3, so a resize is triggered.',
            heap: [map('t4', 4, 3), { id: 't4', type: 'Node[4]', cells: [nil, at('n1'), at('n2'), nil] }, node('n1', 1, 'one', 'n5'), node('n5', 5, 'five', 'n9'), node('n9', 9, 'nine'), node('n2', 2, 'two', null, 'b2')] },
          { line: 9, text: 'Resize: a table of 8 is made. Each entry either stays at its index or moves up by exactly 4 (the old size), depending on one bit of its hash. 1 and 9 stay at **1**; 5 moves to **5**. Threshold is now 6.',
            heap: [map('t8', 4, 6), { id: 't8', type: 'Node[8]', cells: [nil, at('n1'), at('n2'), nil, nil, at('n5'), nil, nil] }, node('n1', 1, 'one', 'n9'), node('n9', 9, 'nine'), node('n2', 2, 'two', null, 'b2'), node('n5', 5, 'five', null, 'b5'), { id: 't4', type: 'Node[4]', cells: [nil, nil, nil, nil], gone: true }] },
          { line: 10, text: 'Printing walks the table from bucket 0 upward, so the order follows the buckets, not the insertion order.',
            out: '{1=one, 9=nine, 2=two, 5=five}\n' },
          { line: 11, text: '`get(9)`: `9 & 7` = 1. Walk bucket 1: key 1 does not match, key 9 does. Two checks, not four.',
            out: '{1=one, 9=nine, 2=two, 5=five}\nnine\n' }
        ]
      },
      {
        title: 'A mutable key gets lost',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> key = new ArrayList<>(List.of(1));
        Map<List<Integer>, String> m = new HashMap<>(4);
        m.put(key, "found");
        key.add(2);
        System.out.println(m.get(key));
        System.out.println(m.size());
    }
}`,
        steps: [
          { line: 5, text: 'A list used as a key. A List\'s `hashCode` is computed from its elements.',
            stack: [{ frame: 'main', vars: [r('key', 'l1')] }], heap: [{ id: 'l1', type: 'ArrayList', cells: [1] }], out: '' },
          { line: 6, text: 'An empty map with room for 4 buckets.',
            stack: [{ frame: 'main', vars: [r('key', 'l1'), r('m', 'hm')] }], heap: [{ id: 'l1', type: 'ArrayList', cells: [1] }, map(null, 0, 4)] },
          { line: 7, text: '`[1].hashCode()` is 32, and `32 & 3` = **0**. The node stores the hash 32 and a reference to the list.',
            heap: [{ id: 'l1', type: 'ArrayList', cells: [1] }, map('t4', 1, 3), { id: 't4', type: 'Node[4]', cells: [at('k1'), nil, nil, nil] },
              { id: 'k1', type: 'Node · hash 32', fields: [r('key', 'l1'), v('val', '"found"'), r('next', null)] }] },
          { line: 8, text: 'The list is changed **through the key**. The node still sits in bucket 0 with the old hash 32.',
            heap: [{ id: 'l1', type: 'ArrayList', cells: [1, 2] }, map('t4', 1, 3), { id: 't4', type: 'Node[4]', cells: [at('k1'), nil, nil, nil] },
              { id: 'k1', type: 'Node · hash 32', fields: [r('key', 'l1'), v('val', '"found"'), r('next', null)] }] },
          { line: 9, text: '`[1, 2].hashCode()` is 994, and `994 & 3` = **2**. Bucket 2 is empty, so `get` returns `null`.', out: 'null\n' },
          { line: 10, text: 'The entry still exists and counts toward size, but no lookup can reach it. Keys must not change while they are in a map.', out: 'null\n1\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'From key to bucket',
        text: [
          [
            '`h = key.hashCode()`',
            '`hash = h ^ (h >>> 16)`: mixes the high bits into the low bits, because only the low bits pick the bucket.',
            '`index = hash & (n - 1)`: the same as `hash % n` when `n` is a power of two, but faster. That is why capacity is always a power of two.'
          ],
          'A `null` key is allowed (one only) and always goes to bucket 0.'
        ]
      },
      {
        name: 'Inside a bucket: hash, then equals',
        text: [
          'In a bucket, each node stores the full hash. A lookup checks `node.hash == hash` first (cheap) and only then `key.equals(node.key)`. Two keys that are `equals` must therefore have the same `hashCode`, or the lookup goes to the wrong bucket.'
        ],
        code: `import java.util.*;

public class Main {
    record Point(int x, int y) {}   // records generate equals and hashCode

    public static void main(String[] args) {
        Map<Point, String> grid = new HashMap<>();
        grid.put(new Point(1, 2), "tree");
        System.out.println(grid.get(new Point(1, 2)));   // tree
    }
}`,
        expect: 'tree'
      },
      {
        name: 'Load factor and resize',
        text: [
          'Default capacity is 16 and the default load factor is 0.75, so the first resize happens when the 13th entry is added. Each resize doubles the table and is O(n), but it happens rarely, so `put` stays O(1) amortized.',
          'Because the size doubles, each entry either stays at index `i` or moves to `i + oldCapacity`. Java checks one bit (`hash & oldCap`) to decide, without recomputing anything.',
          'If you know the final size, pass it in: `new HashMap<>(expected * 4 / 3 + 1)`, or since Java 19, `HashMap.newHashMap(expected)`.'
        ]
      },
      {
        name: 'Treeify: the worst case gets better',
        text: [
          'Since Java 8, when one bucket reaches 8 nodes and the table has at least 64 buckets, the bucket turns into a red-black tree. Lookups in that bucket become O(log n) instead of O(n). If the table is smaller than 64, the map resizes instead.',
          'When a tree bucket shrinks to 6 nodes it turns back into a list.'
        ]
      },
      {
        name: 'Handy methods',
        text: [
          [
            '`getOrDefault(k, d)`',
            '`putIfAbsent(k, v)`',
            '`merge(k, 1, Integer::sum)` for counting',
            '`computeIfAbsent(k, x -> new ArrayList<>()).add(v)` for grouping',
            '`entrySet()` to loop over keys and values together'
          ]
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> count = new TreeMap<>();
        for (String w : "to be or not to be".split(" ")) {
            count.merge(w, 1, Integer::sum);
        }
        System.out.println(count);
    }
}`,
        expect: '{be=2, not=1, or=1, to=2}'
      }
    ],
    table: {
      head: ['Operation', 'Average', 'Worst (Java 8+)', 'Note'],
      rows: [
        ['`put` / `get` / `remove`', 'O(1)', 'O(log n)', 'worst case needs many collisions in one bucket'],
        ['`containsKey`', 'O(1)', 'O(log n)', 'same lookup as `get`'],
        ['`containsValue`', 'O(n)', 'O(n)', 'scans every bucket'],
        ['resize', 'O(n)', 'O(n)', 'rare; amortized into `put`'],
        ['iteration', 'O(n + capacity)', '', 'walks empty buckets too']
      ]
    },
    pitfalls: [
      ['Overriding `equals` without `hashCode`', 'Equal keys land in different buckets and `get` returns null. Override both, or use a `record`.'],
      ['Changing a key after putting it', 'Its hash changes but the node does not move, so the entry is lost. Use immutable keys.'],
      ['Relying on iteration order', 'HashMap order depends on hashes and capacity and can change after a resize. Use `LinkedHashMap` or `TreeMap` when order matters.'],
      ['Removing inside a for-each over `keySet()`', 'Throws `ConcurrentModificationException`. Use `iterator.remove()` or `removeIf`.'],
      ['Sharing a HashMap between threads', 'It is not thread-safe. Use `ConcurrentHashMap`.']
    ],
    interview: [
      ['How does `HashMap.put` work?', ['Compute `hashCode`, spread it with `h ^ (h >>> 16)`, take `hash & (n - 1)` as the index. If the bucket is empty, add a node. Otherwise walk it: if a node has the same hash and an `equals` key, replace the value; else append a node. Then, if size exceeds capacity × load factor, resize.']],
      ['Why is the capacity a power of two?', ['So `hash & (n - 1)` can replace the slower `%`, and so that during a resize each entry either stays put or moves by exactly the old capacity.']],
      ['What changed in Java 8?', ['Buckets with 8 or more entries (when the table has at least 64 buckets) become red-black trees, so worst-case lookups are O(log n). New nodes are also appended at the tail instead of the head, which fixed an infinite loop that could happen during concurrent resizes.']],
      ['What happens if two keys have the same hashCode?', ['They go into the same bucket. Lookups still work because `equals` tells them apart; it is only slower.']],
      ['HashMap vs Hashtable vs ConcurrentHashMap?', ['HashMap: not synchronized, allows one null key and null values. Hashtable: legacy, every method synchronized, no nulls. ConcurrentHashMap: thread-safe with fine-grained locking and CAS, no nulls, and the one to use for shared maps.']]
    ],
    say: [
      'Index = `hash & (capacity - 1)`; the hash finds the bucket, `equals` finds the key.',
      'Load factor 0.75: the table doubles when size passes three quarters of capacity.',
      'Since Java 8, long buckets become red-black trees, so the worst case is O(log n).'
    ],
    checklist: [
      'Compute the bucket index for an Integer key in a table of 8.',
      'Explain what happens to each entry during a resize.',
      'Say why `equals` without `hashCode` breaks a HashMap.',
      'Count words with `merge` and group with `computeIfAbsent`.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new HashMap<>();
        System.out.println(m.put("a", 1));
        System.out.println(m.put("a", 2));
        System.out.println(m);
    }
}`,
          answer: 'null\n1\n{a=2}',
          why: '`put` returns the previous value for the key, or `null` if there was none. The second put replaces the value.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<Character, Integer> c = new HashMap<>();
        for (char ch : "banana".toCharArray()) {
            c.merge(ch, 1, Integer::sum);
        }
        System.out.println(c);
    }
}`,
          answer: '{a=3, b=1, n=2}',
          why: '`merge` puts 1 for a new key and adds 1 for an existing one. Small char codes land in buckets in a-b-n order.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, String> m = new HashMap<>();
        m.put(null, "x");
        m.put(null, "y");
        System.out.println(m.get(null) + " " + m.size());
    }
}`,
          answer: 'y 1',
          why: 'HashMap allows a single `null` key, stored in bucket 0. The second put replaces its value.'
        },
        {
          code: `import java.util.*;

public class Main {
    static class Key {
        int id;
        Key(int id) { this.id = id; }
        @Override public boolean equals(Object o) {
            return o instanceof Key k && k.id == id;
        }
    }
    public static void main(String[] args) {
        Map<Key, String> m = new HashMap<>();
        m.put(new Key(1), "a");
        m.put(new Key(1), "b");
        System.out.println(m.size());
    }
}`,
          answer: '2',
          why: '`hashCode` is not overridden, so each `Key` gets its own identity hash. The second key lands elsewhere and the map never calls `equals`.'
        }
      ],
      fill: [
        {
          q: 'Count each word.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> counts = new TreeMap<>();
        for (String w : "a b a c a".split(" ")) {
            counts.[[merge]](w, 1, [[Integer::sum|(a, b) -> a + b|(a,b)->a+b|(x, y) -> x + y]]);
        }
        System.out.println(counts);
    }
}`,
          expect: '{a=3, b=1, c=1}',
          why: '`merge` stores 1 the first time and combines old and new values with the function after that.'
        },
        {
          q: 'Group words by length.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<Integer, List<String>> byLen = new TreeMap<>();
        for (String w : List.of("hi", "yo", "cat", "a")) {
            byLen.[[computeIfAbsent]](w.length(), k -> new [[ArrayList<>()|ArrayList<String>()]]).add(w);
        }
        System.out.println(byLen);
    }
}`,
          expect: '{1=[a], 2=[hi, yo], 3=[cat]}',
          why: '`computeIfAbsent` creates the list only when the key is new, then returns the list so you can add to it.'
        }
      ],
      bug: [
        {
          q: 'The set should find the point.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Set<Point> seen = new HashSet<>();
        seen.add(new Point(1, 2));
        System.out.println(seen.contains(new Point(1, 2)));
    }
}
class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof Point p && p.x == x && p.y == y;
    }
    @Override public int hashCode() {
        return super.hashCode();
    }
}`,
          line: 17,
          fix: 'return Objects.hash(x, y);',
          expect: 'true',
          why: '`super.hashCode()` is the identity hash, so equal points get different hashes and land in different buckets.'
        },
        {
          q: 'Remove every entry whose value is 0.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new TreeMap<>(Map.of("a", 0, "b", 1, "c", 2));
        for (String k : m.keySet()) {
            if (m.get(k) == 0) m.remove(k);
        }
        System.out.println(m);
    }
}`,
          line: 6,
          fix: 'for (String k : new ArrayList<>(m.keySet())) {',
          expect: '{b=1, c=2}',
          why: 'Removing from a map while looping over its key set throws `ConcurrentModificationException`. Loop over a copy, or use `m.values().removeIf(v -> v == 0)`.'
        }
      ]
    }
  });
})();
