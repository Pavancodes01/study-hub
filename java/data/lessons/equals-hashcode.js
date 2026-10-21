(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const P = (id) => ({ id, type: 'Point', fields: [v('x', 1), v('y', 2)] });
  const m = (vars) => ({ frame: 'main', vars });

  registerLesson({
    slug: 'equals-hashcode',
    track: 'oop',
    title: 'equals, hashCode and toString',
    one: 'If two objects are `equals`, they *must* have the same `hashCode`. Break that and HashMap and HashSet stop finding them.',
    idea: [
      '`Object.equals` compares references, like `==`. Override it when two different objects should count as "the same value" (two Points at 1,2).',
      'Hash-based collections first use `hashCode` to choose a bucket and only then call `equals`. So whenever you override `equals`, override `hashCode` using the **same fields**.',
      '`toString` is for humans: logs, debugging and printing. The default prints the class name and a hash, which tells you nothing.'
    ],
    stages: [
      {
        title: 'Equal values, separate objects',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Point a = new Point(1, 2);
        Point b = new Point(1, 2);
        System.out.println(a == b);
        System.out.println(a.equals(b));
        Set<Point> set = new HashSet<>();
        set.add(a);
        System.out.println(set.contains(b));
        System.out.println(a);
    }
}
class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point p)) return false;
        return x == p.x && y == p.y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
    @Override public String toString() { return "Point(" + x + ", " + y + ")"; }
}`,
        steps: [
          { line: 5, text: 'One Point.', stack: [m([r('a', 'p1')])], heap: [P('p1')], out: '' },
          { line: 6, text: 'A second, separate Point with the same values.', stack: [m([r('a', 'p1'), r('b', 'p2')])], heap: [P('p1'), P('p2')] },
          { line: 7, text: '`==` compares references: two objects, so false.', out: 'false\n' },
          { line: 21, text: '`equals` is our override. Not the same object, it is a Point, and the fields match.',
            stack: [m([r('a', 'p1'), r('b', 'p2')]), { frame: 'Point.equals', vars: [r('this', 'p1'), r('o', 'p2'), r('p', 'p2')] }] },
          { line: 8, text: 'Same value: true.', stack: [m([r('a', 'p1'), r('b', 'p2')])], out: 'false\ntrue\n' },
          { line: 9, text: 'An empty HashSet (a HashMap underneath, 16 buckets).', stack: [m([r('a', 'p1'), r('b', 'p2'), r('set', 'hs')])], heap: [{ id: 'hs', type: 'HashSet', fields: [v('size', 0)] }, P('p1'), P('p2')] },
          { line: 10, text: '`Objects.hash(1, 2)` is 994. `994 & 15` = 2, so `a` goes into bucket 2.', heap: [{ id: 'hs', type: 'HashSet', fields: [v('size', 1), r('bucket 2', 'p1')] }, P('p1'), P('p2')] },
          { line: 11, text: '`b` also hashes to 994, so the set looks in bucket 2, finds `a`, and `a.equals(b)` is true. Found.', out: 'false\ntrue\ntrue\n' },
          { line: 12, text: '`println` calls our `toString`.', out: 'false\ntrue\ntrue\nPoint(1, 2)\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The equals contract',
        text: [
          [
            '**Reflexive**: `x.equals(x)` is true.',
            '**Symmetric**: `x.equals(y)` exactly when `y.equals(x)`.',
            '**Transitive**: if x equals y and y equals z, then x equals z.',
            '**Consistent**: same answer each time while the fields do not change.',
            '`x.equals(null)` is false, never an exception.'
          ],
          'And the hashCode rule: equal objects must have equal hash codes. Unequal objects may share a hash (a collision), which is allowed but slower.'
        ]
      },
      {
        name: 'A correct implementation',
        text: [
          'The parameter must be `Object`. Writing `equals(Point p)` creates an **overload**, and collections keep calling `Object.equals`.'
        ],
        code: `import java.util.*;

public class Main {
    static final class Money {
        final long cents;
        final String currency;
        Money(long cents, String currency) { this.cents = cents; this.currency = currency; }

        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Money m)) return false;
            return cents == m.cents && currency.equals(m.currency);
        }
        @Override public int hashCode() { return Objects.hash(cents, currency); }
        @Override public String toString() { return cents + " " + currency; }
    }
    public static void main(String[] args) {
        Set<Money> s = new HashSet<>(List.of(new Money(100, "EUR"), new Money(100, "EUR")));
        System.out.println(s);
    }
}`,
        expect: '[100 EUR]'
      },
      {
        name: 'Let records do it',
        text: [
          'A `record` gets `equals`, `hashCode` and `toString` generated from its components. For simple value types this is the safest option.'
        ],
        code: `public class Main {
    record Point(int x, int y) {}
    public static void main(String[] args) {
        System.out.println(new Point(1, 2).equals(new Point(1, 2)));
        System.out.println(new Point(1, 2));
    }
}`,
        expect: 'true\nPoint[x=1, y=2]'
      }
    ],
    pitfalls: [
      ['Overriding `equals` but not `hashCode`', 'Equal objects land in different buckets; `contains` and `get` fail.'],
      ['`equals(MyType other)` instead of `equals(Object o)`', 'That is an overload. Collections never call it. Use `@Override` to catch this.'],
      ['Using mutable fields in `hashCode`', 'Changing them while the object is in a HashSet loses the object.'],
      ['`getClass() != o.getClass()` vs `instanceof`', '`instanceof` lets subclasses compare equal to parents, which can break symmetry. Make value classes `final` or use records.']
    ],
    interview: [
      ['Why must you override hashCode with equals?', ['Hash collections use the hash to find the bucket before calling `equals`. If equal objects have different hashes, they are looked for in different buckets and never compared, so lookups fail and duplicates appear in sets.']],
      ['Can two unequal objects have the same hashCode?', ['Yes, that is a collision. It is legal; it just makes those lookups slower. `"Aa"` and `"BB"` have the same String hash.']],
      ['What does the default `hashCode` return?', ['An identity hash chosen by the JVM, usually random-like and stored in the object header. It is not the memory address in modern JVMs.']],
      ['How do you write a good hashCode?', ['Combine the same fields used in `equals`, for example with `Objects.hash(a, b)` or `31 * h + field`. Records generate it for you.']]
    ],
    say: [
      'Equal objects must have equal hash codes.',
      'The `equals` parameter must be `Object`.',
      'For value types, prefer records.'
    ],
    checklist: [
      'State the five parts of the equals contract.',
      'Write equals and hashCode for a two-field class.',
      'Explain what goes wrong with `equals(Point p)`.',
      'Explain why mutable keys break HashSet.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    static class P {
        int x;
        P(int x) { this.x = x; }
        public boolean equals(P o) { return o.x == x; }
    }
    public static void main(String[] args) {
        P a = new P(1), b = new P(1);
        Object ob = b;
        System.out.println(a.equals(b));
        System.out.println(a.equals(ob));
        System.out.println(List.of(a).contains(b));
    }
}`,
          answer: 'true\nfalse\nfalse',
          why: '`equals(P)` is an overload. With an `Object` argument (and inside `contains`) the inherited `Object.equals` runs and compares references.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Ab".hashCode() == "BC".hashCode());
        System.out.println("Ab".equals("BC"));
    }
}`,
          answer: 'true\nfalse',
          why: 'Both hash to 2113 (65·31 + 98 and 66·31 + 67). Equal hashes do not mean equal objects.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Set<String> s = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        s.add("a");
        s.add("A");
        System.out.println(s.size() + " " + s);
    }
}`,
          answer: '1 [a]',
          why: 'TreeSet uses its comparator, not `equals`. The comparator says "a" and "A" are the same, so the second add is ignored.'
        },
        {
          code: `public class Main {
    record Pair(String a, int b) {}
    public static void main(String[] args) {
        Pair p = new Pair("x", 1);
        System.out.println(p.equals(new Pair("x", 1)) + " " + p);
    }
}`,
          answer: 'true Pair[a=x, b=1]',
          why: 'Records generate value-based `equals` and a readable `toString`.'
        }
      ],
      fill: [
        {
          q: 'Complete equals.',
          code: `import java.util.*;

public class Main {
    static final class Tag {
        final String name;
        Tag(String name) { this.name = name; }
        @Override public boolean equals([[Object]] o) {
            if (!(o instanceof Tag t)) return [[false]];
            return name.[[equals]](t.name);
        }
        @Override public int hashCode() { return name.hashCode(); }
    }
    public static void main(String[] args) {
        System.out.println(new HashSet<>(List.of(new Tag("a"))).contains(new Tag("a")));
    }
}`,
          expect: 'true',
          why: 'The parameter must be Object, non-matching types return false, and fields are compared by value.'
        },
        {
          q: 'Complete hashCode using the same fields as equals.',
          code: `import java.util.*;

public class Main {
    static final class Cell {
        final int row, col;
        Cell(int r, int c) { row = r; col = c; }
        @Override public boolean equals(Object o) {
            return o instanceof Cell c && c.row == row && c.col == col;
        }
        @Override public int hashCode() { return Objects.[[hash]](row, col); }
    }
    public static void main(String[] args) {
        Map<Cell, String> m = new HashMap<>();
        m.put(new Cell(0, 1), "wall");
        System.out.println(m.get(new Cell(0, 1)));
    }
}`,
          expect: 'wall',
          why: '`Objects.hash` combines the fields, so equal cells get equal hashes.'
        }
      ],
      bug: [
        {
          q: 'The set should find the point.',
          code: `import java.util.*;

public class Main {
    static class Point {
        final int x;
        Point(int x) { this.x = x; }
        public boolean equals(Point p) { return p.x == x; }
        @Override public int hashCode() { return x; }
    }
    public static void main(String[] args) {
        Set<Point> s = new HashSet<>();
        s.add(new Point(3));
        System.out.println(s.contains(new Point(3)));
    }
}`,
          line: 7,
          fix: '@Override public boolean equals(Object o) { return o instanceof Point p && p.x == x; }',
          expect: 'true',
          why: '`equals(Point)` does not override `equals(Object)`, so HashSet uses identity.'
        },
        {
          q: 'Users with the same id are the same user; expect size 1.',
          code: `import java.util.*;

public class Main {
    static class User {
        final int id;
        final String name;
        User(int id, String name) { this.id = id; this.name = name; }
        @Override public boolean equals(Object o) { return o instanceof User u && u.id == id; }
        @Override public int hashCode() { return Objects.hash(id, name); }
    }
    public static void main(String[] args) {
        Set<User> s = new HashSet<>(List.of(new User(7, "Ana"), new User(7, "ana")));
        System.out.println(s.size());
    }
}`,
          line: 9,
          fix: '@Override public int hashCode() { return Objects.hash(id); }',
          expect: '1',
          why: 'hashCode uses `name`, which `equals` ignores. Equal users then get different hashes. Hash exactly the fields that equals compares.'
        }
      ]
    }
  });
})();
