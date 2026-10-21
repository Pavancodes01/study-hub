(function () {
  const r = (name, ref) => ({ name, ref });
  const v = (name, value) => ({ name, value });
  const M = (id, c) => ({ id, type: 'Money (final)', fields: [v('cents', c), v('cur', '"EUR"')] });

  registerLesson({
    slug: 'immutability',
    track: 'core',
    title: 'Immutability',
    one: 'An immutable object can never change after construction, so you can *share it freely*: across methods, threads and as map keys.',
    idea: [
      'With a mutable object, everyone holding a reference can change it under everyone else. With an immutable object, "changing" means making a **new** object, and old references keep seeing the old value.',
      'Recipe: make the class `final`, every field `private final`, no setters, copy mutable inputs in the constructor, and never hand out a mutable internal object.',
      'String, the wrappers, `LocalDate`, `BigDecimal`, `List.of` and records (shallowly) are immutable. Immutable objects are automatically thread-safe and make safe HashMap keys.'
    ],
    stages: [
      {
        title: 'Change means a new object',
        code: `public class Main {
    public static void main(String[] args) {
        Money a = new Money(100, "EUR");
        Money b = a;
        Money c = a.plus(50);
        System.out.println(a + " " + b + " " + c);
    }
}
final class Money {
    private final long cents;
    private final String cur;
    Money(long cents, String cur) { this.cents = cents; this.cur = cur; }
    Money plus(long more) { return new Money(cents + more, cur); }
    @Override public String toString() { return cents + " " + cur; }
}`,
        steps: [
          { line: 3, text: 'An immutable Money: both fields are `final`.', stack: [{ frame: 'main', vars: [r('a', 'm1')] }], heap: [M('m1', 100)], out: '' },
          { line: 4, text: 'Sharing is completely safe: nobody can change this object.', stack: [{ frame: 'main', vars: [r('a', 'm1'), r('b', 'm1')] }] },
          { line: 13, text: '`plus` does not touch `this`; it builds a new Money with the result.',
            stack: [{ frame: 'main', vars: [r('a', 'm1'), r('b', 'm1')] }, { frame: 'Money.plus', vars: [r('this', 'm1'), v('more', 50)] }], heap: [M('m1', 100), M('m2', 150)] },
          { line: 5, text: '`c` gets the new object. `a` and `b` still see 100.', stack: [{ frame: 'main', vars: [r('a', 'm1'), r('b', 'm1'), r('c', 'm2')] }] },
          { line: 6, text: 'Old value, old value, new value.', out: '100 EUR 100 EUR 150 EUR\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The full recipe',
        text: [
          [
            '`final class` (or private constructor + factory) so no subclass can add mutable state.',
            'All fields `private final`.',
            'No setters; "modifiers" return new instances (`withX`, `plus`).',
            'Defensive copies of mutable inputs (`List.copyOf`, `array.clone()`).',
            'Never return internal mutable objects; return copies or unmodifiable views.',
            'Do not let `this` escape from the constructor.'
          ]
        ]
      },
      {
        name: 'Records are shallowly immutable',
        text: [
          'A record\'s fields are final, but if a component is a mutable List, the list itself can still change. Copy in the compact constructor.'
        ],
        code: `import java.util.*;

public class Main {
    record Team(String name, List<String> members) {
        Team {
            members = List.copyOf(members);
        }
    }
    public static void main(String[] args) {
        List<String> raw = new ArrayList<>(List.of("ana"));
        Team t = new Team("core", raw);
        raw.add("intruder");
        System.out.println(t.members());
    }
}`,
        expect: '[ana]'
      },
      {
        name: 'JDK immutables you use every day',
        text: [
          'The API style gives it away: methods return a new object, so you must use the result.'
        ],
        code: `import java.math.BigDecimal;
import java.time.LocalDate;

public class Main {
    public static void main(String[] args) {
        LocalDate d = LocalDate.of(2024, 1, 31);
        d.plusDays(1);                          // result ignored
        System.out.println(d + " " + d.plusMonths(1));
        BigDecimal price = new BigDecimal("1.10");
        price = price.add(new BigDecimal("0.20"));
        System.out.println(price);
    }
}`,
        expect: '2024-01-31 2024-02-29\n1.30'
      }
    ],
    table: {
      head: ['', 'Immutable', 'Unmodifiable view', 'Mutable'],
      rows: [
        ['Example', '`List.of`, `String`, record of immutables', '`Collections.unmodifiableList(l)`', '`ArrayList`'],
        ['Can it change?', 'never', 'yes, through the original', 'yes'],
        ['Thread-safe to share', 'yes', 'only if the original is not changed', 'no']
      ]
    },
    pitfalls: [
      ['Ignoring the return value', '`date.plusDays(1);` alone does nothing.'],
      ['`final` field holding a mutable list', 'The reference is fixed; the list is not. Copy and wrap it.'],
      ['Record with a mutable component', 'Copy in the compact constructor.'],
      ['Non-final class', 'A subclass can add setters and break the guarantee.']
    ],
    interview: [
      ['How do you make a class immutable?', ['Final class, private final fields, no setters, defensive copies of mutable constructor arguments, no leaking of mutable internals, and methods that return new instances instead of modifying.']],
      ['Why are immutable objects thread-safe?', ['Their state cannot change after construction, so there is nothing to race on. Final fields also get a JMM guarantee: they are visible to all threads once the constructor finishes, without synchronization.']],
      ['What are the downsides?', ['A new object for every change, which costs allocation for large or frequently updated values. Builders (like StringBuilder) or mutable working copies help.']]
    ],
    say: [
      'Immutable objects can be shared freely, including across threads.',
      'Final class, private final fields, defensive copies, no setters.',
      'Records are only shallowly immutable.'
    ],
    checklist: [
      'Write an immutable class with a `with` method.',
      'Fix a record with a mutable List component.',
      'Explain immutable vs unmodifiable view.',
      'List four immutable JDK types.'
    ],
    drills: {
      predict: [
        {
          code: `import java.time.LocalDate;

public class Main {
    public static void main(String[] args) {
        LocalDate d = LocalDate.of(2023, 12, 31);
        d.plusDays(1);
        System.out.println(d.getYear());
    }
}`,
          answer: '2023',
          why: '`plusDays` returns a new date. `d` never changes.'
        },
        {
          code: `import java.math.BigDecimal;

public class Main {
    public static void main(String[] args) {
        BigDecimal x = new BigDecimal("1.10");
        x.add(BigDecimal.ONE);
        System.out.println(x + " " + x.add(BigDecimal.ONE));
    }
}`,
          answer: '1.10 2.10',
          why: 'BigDecimal is immutable; the first result is thrown away.'
        },
        {
          code: `import java.util.*;

public class Main {
    record Team(List<String> names) {}
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(List.of("a"));
        Team t = new Team(l);
        l.add("b");
        System.out.println(t.names());
    }
}`,
          answer: '[a, b]',
          why: 'The record stores the same list reference. Its field is final, but the list is mutable.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        String s = "aaa";
        String t = s.replace('a', 'b');
        System.out.println(s + t);
    }
}`,
          answer: 'aaabbb',
          why: '`replace` returns a new String; `s` is unchanged.'
        }
      ],
      fill: [
        {
          q: 'Lock the class and its field.',
          code: `public class Main {
    static [[final]] class Point {
        private [[final]] int x;
        Point(int x) { this.x = x; }
        int x() { return x; }
    }
    public static void main(String[] args) {
        System.out.println(new Point(4).x());
    }
}`,
          expect: '4',
          why: 'A final class cannot be subclassed; a final field can be set only once.'
        },
        {
          q: 'Return a changed copy.',
          code: `public class Main {
    record Point(int x, int y) {
        Point withX(int nx) { return [[new Point(nx, y)|new Point(nx, this.y)]]; }
    }
    public static void main(String[] args) {
        Point p = new Point(1, 2);
        Point q = p.withX(9);
        System.out.println(p + " " + q);
    }
}`,
          expect: 'Point[x=1, y=2] Point[x=9, y=2]',
          why: 'A "wither" builds a new object with one field changed.'
        }
      ],
      bug: [
        {
          q: 'The team must not change when the caller\'s list does.',
          code: `import java.util.*;

public class Main {
    record Team(List<String> names) {
        Team {}
    }
    public static void main(String[] args) {
        List<String> raw = new ArrayList<>(List.of("ana"));
        Team t = new Team(raw);
        raw.add("x");
        System.out.println(t.names().size());
    }
}`,
          line: 5,
          fix: 'Team { names = List.copyOf(names); }',
          expect: '1',
          why: 'Without a copy, the record shares the caller\'s list.'
        },
        {
          q: '`a` should stay 100.',
          code: `public class Main {
    static final class Money {
        private long cents;
        Money(long cents) { this.cents = cents; }
        Money plus(long more) { cents += more; return this; }
        long cents() { return cents; }
    }
    public static void main(String[] args) {
        Money a = new Money(100);
        Money c = a.plus(50);
        System.out.println(a.cents() + " " + c.cents());
    }
}`,
          line: 5,
          fix: 'Money plus(long more) { return new Money(cents + more); }',
          expect: '100 150',
          why: '`plus` mutated the shared object. An immutable type returns a new instance.'
        }
      ]
    }
  });
})();
