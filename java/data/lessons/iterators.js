(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const L = (cells, mod) => ({ id: 'l', type: 'ArrayList', fields: [v('size', cells.length), v('modCount', mod)], cells: cells.map((c) => '"' + c + '"') });
  const It = (id, cur, last, exp, gone) => ({ id, type: 'ArrayList.Itr', fields: [v('cursor', cur), v('lastRet', last), v('expectedModCount', exp)], gone: !!gone });
  const F = (vars) => [{ frame: 'main', vars }];

  registerLesson({
    slug: 'iterators',
    track: 'core',
    title: 'Iterators and fail-fast',
    one: 'Every for-each loop uses a hidden *Iterator*. Change the list behind its back and the next `next()` throws `ConcurrentModificationException`.',
    idea: [
      '`for (String s : list)` is compiled into `Iterator<String> it = list.iterator(); while (it.hasNext()) { String s = it.next(); ... }`.',
      'The list keeps a counter `modCount` that goes up on every structural change. The iterator remembers the value it saw (`expectedModCount`) and checks it on each `next()`. A mismatch means someone changed the list, so it fails fast instead of returning garbage.',
      'The iterator\'s own `remove()` updates both counters, which is why it is the safe way to delete while iterating (or use `removeIf`).'
    ],
    stages: [
      {
        title: 'Safe remove vs CME',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(List.of("a", "b", "c"));
        Iterator<String> it = l.iterator();
        while (it.hasNext()) {
            String s = it.next();
            if (s.equals("b")) it.remove();
        }
        System.out.println(l);
        try {
            for (String s : l) {
                if (s.equals("c")) l.remove(s);
            }
        } catch (ConcurrentModificationException e) {
            System.out.println("CME");
        }
    }
}`,
        steps: [
          { line: 5, text: 'A list of three. `modCount` starts at 0.', stack: F([r('l', 'l')]), heap: [L(['a', 'b', 'c'], 0)], out: '' },
          { line: 6, text: 'The iterator starts before element 0 and records modCount 0.', stack: F([r('l', 'l'), r('it', 'i1')]), heap: [L(['a', 'b', 'c'], 0), It('i1', 0, -1, 0)] },
          { line: 8, text: '`next()` checks modCount (ok), returns "a" and moves the cursor.', stack: F([r('l', 'l'), r('it', 'i1'), v('s', '"a"')]), heap: [L(['a', 'b', 'c'], 0), It('i1', 1, 0, 0)] },
          { line: 8, text: 'Returns "b".', stack: F([r('l', 'l'), r('it', 'i1'), v('s', '"b"')]), heap: [L(['a', 'b', 'c'], 0), It('i1', 2, 1, 0)] },
          { line: 9, text: '`it.remove()` deletes the last returned element, steps the cursor back, and **updates expectedModCount** to match.', heap: [L(['a', 'c'], 1), It('i1', 1, -1, 1)] },
          { line: 8, text: 'Counts still match, so "c" is returned normally.', stack: F([r('l', 'l'), r('it', 'i1'), v('s', '"c"')]), heap: [L(['a', 'c'], 1), It('i1', 2, 1, 1)] },
          { line: 7, text: '`hasNext()`: cursor 2 equals size 2, so the loop ends.' },
          { line: 11, text: 'b is gone.', stack: F([r('l', 'l')]), heap: [L(['a', 'c'], 1), It('i1', 2, 1, 1, true)], out: '[a, c]\n' },
          { line: 13, text: 'The for-each makes its own hidden iterator, recording modCount 1.', stack: F([r('l', 'l'), r('(hidden)', 'i2')]), heap: [L(['a', 'c'], 1), It('i2', 0, -1, 1)] },
          { line: 14, text: 'At "c" the loop calls `l.remove(s)` on the **list**, not the iterator. modCount becomes 2; the iterator still expects 1.',
            stack: F([r('l', 'l'), r('(hidden)', 'i2'), v('s', '"c"')]), heap: [L(['a'], 2), It('i2', 2, 1, 1)] },
          { line: 13, text: '`hasNext()` sees cursor 2 ≠ size 1, so `next()` runs, notices 2 ≠ 1, and throws.' },
          { line: 17, text: 'Fail-fast: a clear error instead of skipped or repeated elements.', stack: F([r('l', 'l')]), heap: [L(['a'], 2)], out: '[a, c]\nCME\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Safe ways to change a collection while looping',
        text: [
          [
            '`iterator.remove()` inside an explicit iterator loop.',
            '`collection.removeIf(predicate)`: simplest.',
            '`ListIterator` for `set` and `add` at the current position.',
            'Loop over a copy: `for (T x : List.copyOf(list))`.',
            'Collect changes and apply them after the loop.'
          ]
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(1, 2, 3));
        ListIterator<Integer> it = l.listIterator();
        while (it.hasNext()) {
            int x = it.next();
            if (x == 2) it.add(25);
            else it.set(x * 10);
        }
        System.out.println(l);
    }
}`,
        expect: '[10, 2, 25, 30]'
      },
      {
        name: 'Fail-fast vs fail-safe',
        text: [
          'The `java.util` collections are fail-fast, on a best-effort basis: do not rely on the exception for correctness. Concurrent collections such as `CopyOnWriteArrayList` and `ConcurrentHashMap` are fail-safe / weakly consistent: their iterators never throw CME, they work on a snapshot or tolerate changes.'
        ]
      },
      {
        name: 'Making your own Iterable',
        text: [
          'Implement `Iterable<T>` and return an `Iterator<T>` from `iterator()`, and your class works in for-each loops.'
        ],
        code: `import java.util.*;

public class Main {
    record Range(int lo, int hi) implements Iterable<Integer> {
        public Iterator<Integer> iterator() {
            return new Iterator<>() {
                int cur = lo;
                public boolean hasNext() { return cur < hi; }
                public Integer next() {
                    if (!hasNext()) throw new NoSuchElementException();
                    return cur++;
                }
            };
        }
    }
    public static void main(String[] args) {
        for (int i : new Range(1, 4)) System.out.print(i + " ");
        System.out.println();
    }
}`,
        expect: '1 2 3'
      }
    ],
    pitfalls: [
      ['`list.remove(x)` inside for-each', 'ConcurrentModificationException, or worse, silently skipping an element when removing the second-to-last.'],
      ['Calling `next()` twice per loop', 'You skip elements and can hit NoSuchElementException.'],
      ['`it.remove()` twice in a row', 'IllegalStateException: you must call `next()` between removes.'],
      ['Treating CME as a thread-safety guarantee', 'It is best-effort detection, not synchronization.']
    ],
    interview: [
      ['What is a fail-fast iterator?', ['An iterator that throws ConcurrentModificationException if the collection is structurally modified after the iterator was created, other than through the iterator itself. It compares the collection\'s modCount with the value it recorded.']],
      ['How do you remove items while iterating?', ['Use `Iterator.remove()`, `removeIf`, or iterate over a copy. Never call the collection\'s `remove` inside a for-each.']],
      ['Why does removing the second-to-last element not throw?', ['After the removal, the cursor equals the new size, so `hasNext()` returns false and `next()` (where the check happens) is never called. The loop ends early and silently skips the last element.']]
    ],
    say: [
      'for-each uses a hidden Iterator.',
      'modCount vs expectedModCount drives fail-fast.',
      'Remove with `iterator.remove()` or `removeIf`.'
    ],
    checklist: [
      'Rewrite a for-each as an explicit iterator loop.',
      'Explain modCount and expectedModCount.',
      'Remove while iterating, three different ways.',
      'Implement Iterable for a custom class.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(List.of("a", "b", "c"));
        for (String s : l) {
            if (s.equals("b")) l.remove(s);
        }
        System.out.println(l);
    }
}`,
          answer: '[a, c]',
          why: 'Removing the second-to-last element makes cursor == size, so the loop simply ends. No exception, but "c" was never visited.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new TreeMap<>(Map.of("a", 1, "b", 2));
        for (Map.Entry<String, Integer> e : m.entrySet()) {
            e.setValue(e.getValue() * 2);
        }
        System.out.println(m);
    }
}`,
          answer: '{a=2, b=4}',
          why: '`setValue` changes a value, not the structure, so it is allowed during iteration.'
        },
        {
          code: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        List<String> cow = new CopyOnWriteArrayList<>(List.of("a", "b"));
        for (String s : cow) {
            if (s.equals("a")) cow.add("z");
        }
        System.out.println(cow);
    }
}`,
          answer: '[a, b, z]',
          why: 'The iterator walks a snapshot of the array, so adding does not throw, and "z" is not visited in this loop.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Iterator<Integer> it = List.of(7).iterator();
        System.out.println(it.next());
        System.out.println(it.hasNext());
        try {
            it.next();
        } catch (NoSuchElementException e) {
            System.out.println("done");
        }
    }
}`,
          answer: '7\nfalse\ndone',
          why: 'Calling `next()` past the end throws NoSuchElementException.'
        }
      ],
      fill: [
        {
          q: 'Remove negatives with an explicit iterator.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> nums = new ArrayList<>(List.of(3, -1, 4, -2));
        Iterator<Integer> it = nums.[[iterator]]();
        while (it.[[hasNext]]()) {
            if (it.next() < 0) it.[[remove]]();
        }
        System.out.println(nums);
    }
}`,
          expect: '[3, 4]',
          why: 'Only the iterator\'s `remove()` keeps the counts in sync.'
        },
        {
          q: 'Make Countdown usable in a for-each.',
          code: `import java.util.*;

public class Main {
    static class Countdown implements [[Iterable]]<Integer> {
        public Iterator<Integer> iterator() {
            return new Iterator<>() {
                int n = 3;
                public boolean hasNext() { return n > 0; }
                public Integer next() { return [[n--]]; }
            };
        }
    }
    public static void main(String[] args) {
        for (int x : new Countdown()) System.out.print(x);
        System.out.println();
    }
}`,
          expect: '321',
          why: 'For-each works with any Iterable; `n--` returns the current value and then counts down.'
        }
      ],
      bug: [
        {
          q: 'Remove the empty strings.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(List.of("x", "", "y", ""));
        for (String s : l) {
            if (s.isEmpty()) l.remove(s);
        }
        System.out.println(l);
    }
}`,
          line: 6,
          fix: 'for (String s : List.copyOf(l)) {',
          expect: '[x, y]',
          why: 'Removing from the list during its own for-each throws CME. Iterate over a copy (or use `removeIf`).'
        },
        {
          q: 'Sum all values greater than 1; expect 9.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Iterator<Integer> it = List.of(1, 2, 3, 4).iterator();
        int sum = 0;
        while (it.hasNext()) {
            if (it.next() > 1) sum += it.next();
        }
        System.out.println(sum);
    }
}`,
          line: 8,
          fix: 'int x = it.next(); if (x > 1) sum += x;',
          expect: '9',
          why: 'Each `next()` consumes an element. Calling it twice skips values and runs past the end.'
        }
      ]
    }
  });
})();
