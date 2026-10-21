(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const at = (id) => ({ ref: id });
  const P = (id, n, a) => ({ id, type: 'Person', fields: [v('name', '"' + n + '"'), v('age', a)], row: 'p' });
  const people = [P('p1', 'Cy', 30), P('p2', 'Al', 25), P('p3', 'Bo', 30)];
  const list = (a, b, c) => ({ id: 'l', type: 'ArrayList', cells: [at(a), at(b), at(c)] });
  const S = [{ frame: 'main', vars: [r('people', 'l')] }];

  registerLesson({
    slug: 'comparators',
    track: 'core',
    title: 'Comparable vs Comparator',
    one: '`Comparable` is the type\'s *one natural order*. A `Comparator` is *any other order* you pass in from outside.',
    idea: [
      'A class implements `Comparable<T>` to define its natural ordering with `compareTo`: negative if this comes first, zero if equal, positive if after. `String`, `Integer` and `LocalDate` all do.',
      'A `Comparator<T>` is a separate object with `compare(a, b)`. You can build many for one class: by age, by name, reversed, with tie-breakers. Since Java 8 you compose them: `Comparator.comparing(Person::age).thenComparing(Person::name)`.',
      'Sorting moves **references** in the list. The objects themselves never move in memory.'
    ],
    stages: [
      {
        title: 'Sorting reorders references',
        code: `import java.util.*;

public class Main {
    record Person(String name, int age) {}
    public static void main(String[] args) {
        List<Person> people = new ArrayList<>(List.of(
            new Person("Cy", 30), new Person("Al", 25), new Person("Bo", 30)));
        people.sort(Comparator.comparingInt(Person::age));
        System.out.println(people);
        people.sort(Comparator.comparingInt(Person::age).reversed()
            .thenComparing(Person::name));
        System.out.println(people);
    }
}`,
        steps: [
          { line: 6, text: 'The list holds three references in the order they were added.', stack: S, heap: [list('p1', 'p2', 'p3')].concat(people), out: '' },
          { line: 8, text: 'Sort by age. Only the references in the list change places. Cy and Bo are both 30; the sort is **stable**, so Cy stays before Bo.', heap: [list('p2', 'p1', 'p3')].concat(people) },
          { line: 9, text: 'Records print as `Person[name=…, age=…]`.', out: '[Person[name=Al, age=25], Person[name=Cy, age=30], Person[name=Bo, age=30]]\n' },
          { line: 10, text: 'Age descending, then name ascending to break ties: Bo before Cy.', heap: [list('p3', 'p1', 'p2')].concat(people) },
          { line: 12, text: 'Same three objects, third arrangement of arrows.', out: '[Person[name=Al, age=25], Person[name=Cy, age=30], Person[name=Bo, age=30]]\n[Person[name=Bo, age=30], Person[name=Cy, age=30], Person[name=Al, age=25]]\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Implementing Comparable',
        text: [
          'Use `Integer.compare`, `Long.compare` or a chained comparator. Never return `a - b`: it overflows for large values.'
        ],
        code: `import java.util.*;

public class Main {
    record Version(int major, int minor) implements Comparable<Version> {
        public int compareTo(Version o) {
            int c = Integer.compare(major, o.major);
            return c != 0 ? c : Integer.compare(minor, o.minor);
        }
    }
    public static void main(String[] args) {
        List<Version> vs = new ArrayList<>(List.of(new Version(2, 0), new Version(1, 9), new Version(1, 10)));
        Collections.sort(vs);
        System.out.println(vs);
    }
}`,
        expect: '[Version[major=1, minor=9], Version[major=1, minor=10], Version[major=2, minor=0]]'
      },
      {
        name: 'Comparator building blocks',
        text: [
          [
            '`Comparator.comparing(keyFn)`, `comparingInt`, `comparingDouble`',
            '`.thenComparing(...)` for tie-breakers',
            '`.reversed()`, `Comparator.reverseOrder()`, `Comparator.naturalOrder()`',
            '`Comparator.nullsFirst(cmp)` / `nullsLast(cmp)`'
          ]
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = new ArrayList<>(List.of("bb", "a", "ab", "c"));
        words.sort(Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder()));
        System.out.println(words);
    }
}`,
        expect: '[a, c, ab, bb]'
      },
      {
        name: 'Consistent with equals',
        text: [
          'TreeSet and TreeMap use only the comparator to decide equality. If `compare` returns 0 for two objects that are not `equals`, one of them is silently dropped. Add tie-breakers until only truly equal objects compare as 0.'
        ]
      }
    ],
    table: {
      head: ['', 'Comparable', 'Comparator'],
      rows: [
        ['Package', '`java.lang`', '`java.util`'],
        ['Method', '`compareTo(T o)`', '`compare(T a, T b)`'],
        ['Where', 'inside the class', 'separate object / lambda'],
        ['How many', 'one natural order', 'as many as you want'],
        ['Used by', '`Collections.sort(list)`, TreeSet default', '`list.sort(cmp)`, `new TreeSet<>(cmp)`']
      ]
    },
    pitfalls: [
      ['`(a, b) -> a - b`', 'Overflows for large or negative values. Use `Integer.compare`.'],
      ['Comparator returns 0 for different items', 'TreeSet/TreeMap drop one of them.'],
      ['Uppercase vs lowercase', 'Natural String order puts all capitals first. Use `String.CASE_INSENSITIVE_ORDER`.'],
      ['`reversed()` placement', '`comparing(a).thenComparing(b).reversed()` reverses both keys; put `reversed()` right after the key you want reversed.']
    ],
    interview: [
      ['Comparable vs Comparator?', ['Comparable defines the natural order inside the class with `compareTo`. Comparator is an external strategy with `compare`, so you can sort the same type many ways without changing it.']],
      ['Is Java\'s sort stable?', ['For objects, yes: `List.sort` and `Arrays.sort(Object[])` use TimSort, which keeps equal elements in their original order. Primitive arrays use dual-pivot quicksort, where stability does not matter.']],
      ['Why is `a - b` a bad compare?', ['Integer overflow: `Integer.MIN_VALUE - 1` wraps to a large positive number, reversing the result.']]
    ],
    say: [
      'Comparable: one natural order. Comparator: any external order.',
      'Compose with comparing / thenComparing / reversed.',
      'Use Integer.compare, never subtraction.'
    ],
    checklist: [
      'Implement compareTo with two keys.',
      'Sort by one key descending and another ascending.',
      'Explain the subtraction overflow bug.',
      'Explain why a TreeSet can lose elements.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(List.of("b", "B", "a"));
        Collections.sort(l);
        System.out.println(l);
    }
}`,
          answer: '[B, a, b]',
          why: 'Natural String order compares char codes, and uppercase letters (65–90) come before lowercase (97–122).'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(Arrays.asList("b", null, "a"));
        l.sort(Comparator.nullsFirst(Comparator.naturalOrder()));
        System.out.println(l);
    }
}`,
          answer: '[null, a, b]',
          why: '`nullsFirst` wraps a comparator so nulls go first instead of throwing.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Comparator<Integer> bad = (a, b) -> a - b;
        System.out.println(bad.compare(Integer.MIN_VALUE, 1) > 0);
        System.out.println(Integer.compare(Integer.MIN_VALUE, 1) > 0);
    }
}`,
          answer: 'true\nfalse',
          why: '`MIN_VALUE - 1` overflows to `MAX_VALUE`, wrongly saying MIN_VALUE is bigger.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>(List.of(3, 1, 2));
        l.sort(Comparator.reverseOrder());
        System.out.println(l + " " + Collections.max(l) + " " + Collections.min(l, Comparator.reverseOrder()));
    }
}`,
          answer: '[3, 2, 1] 3 3',
          why: '`min` with a reversed comparator returns the largest element.'
        }
      ],
      fill: [
        {
          q: 'Give Version a natural order.',
          code: `import java.util.*;

public class Main {
    static class Version implements [[Comparable]]<Version> {
        final int major;
        Version(int major) { this.major = major; }
        public int [[compareTo]](Version o) { return Integer.compare(major, o.major); }
        public String toString() { return "v" + major; }
    }
    public static void main(String[] args) {
        List<Version> l = new ArrayList<>(List.of(new Version(3), new Version(1)));
        Collections.sort(l);
        System.out.println(l);
    }
}`,
          expect: '[v1, v3]',
          why: '`Collections.sort(list)` needs elements that implement Comparable.'
        },
        {
          q: 'Sort longest first.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> w = new ArrayList<>(List.of("a", "ccc", "bb"));
        w.sort(Comparator.[[comparing|comparingInt]](String::length).[[reversed]]());
        System.out.println(w);
    }
}`,
          expect: '[ccc, bb, a]',
          why: 'Build the key comparator, then reverse it.'
        }
      ],
      bug: [
        {
          q: 'The lowest score should come first.',
          code: `import java.util.*;

public class Main {
    record Player(String name, int score) {}
    public static void main(String[] args) {
        List<Player> ps = new ArrayList<>(List.of(new Player("hi", 2_000_000_000), new Player("lo", -2_000_000_000)));
        ps.sort((a, b) -> {
            return a.score() - b.score();
        });
        System.out.println(ps.get(0).name());
    }
}`,
          line: 8,
          fix: 'return Integer.compare(a.score(), b.score());',
          expect: 'lo',
          why: '2e9 − (−2e9) overflows to a negative number, so the order flips.'
        },
        {
          q: 'Both words should be kept.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Set<String> s = new TreeSet<>(Comparator.comparingInt(String::length));
        s.add("ab");
        s.add("cd");
        System.out.println(s.size());
    }
}`,
          line: 5,
          fix: 'Set<String> s = new TreeSet<>(Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder()));',
          expect: '2',
          why: 'Two words of the same length compare as 0, so the TreeSet treats them as duplicates. Add a tie-breaker.'
        }
      ]
    }
  });
})();
