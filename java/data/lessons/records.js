(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const P = (id) => ({ id, type: 'Point (record)', fields: [v('x (final)', 3), v('y (final)', 4)] });

  registerLesson({
    slug: 'records',
    track: 'jvm',
    title: 'Records',
    one: 'A `record` is a class for *plain data*: you list the components, and Java writes the constructor, accessors, `equals`, `hashCode` and `toString`.',
    idea: [
      '`record Point(int x, int y) {}` declares a final class with two `private final` fields, a canonical constructor, accessor methods `x()` and `y()`, and value-based `equals`, `hashCode` and `toString`.',
      'A **compact constructor** (`Point { ... }`) runs before the fields are assigned. Use it to validate or normalise the parameters.',
      'Records can have methods, static fields and implement interfaces, but no extra instance fields and no `extends`. They are shallowly immutable and pair naturally with pattern matching.'
    ],
    stages: [
      {
        title: 'Generated for you',
        code: `public class Main {
    record Point(int x, int y) {
        Point {
            if (x < 0) throw new IllegalArgumentException("x < 0");
        }
        double dist() { return Math.sqrt(x * x + y * y); }
    }
    public static void main(String[] args) {
        Point p = new Point(3, 4);
        Point q = new Point(3, 4);
        System.out.println(p.x() + " " + p.dist());
        System.out.println(p.equals(q) + " " + (p == q));
        System.out.println(p);
    }
}`,
        steps: [
          { line: 4, text: '`new Point(3, 4)` runs the compact constructor first. The check passes.', stack: [{ frame: 'main', vars: [] }, { frame: 'Point(compact)', vars: [v('x', 3), v('y', 4)] }], heap: [], out: '' },
          { line: 9, text: 'After the compact body, the parameters are assigned to the final fields automatically.', stack: [{ frame: 'main', vars: [r('p', 'p1')] }], heap: [P('p1')] },
          { line: 10, text: 'A second, separate object with the same values.', stack: [{ frame: 'main', vars: [r('p', 'p1'), r('q', 'p2')] }], heap: [P('p1'), P('p2')] },
          { line: 11, text: 'The accessor is `x()`, not `getX()`. Your own methods can use the fields.', out: '3 5.0\n' },
          { line: 12, text: 'Generated `equals` compares components: true. They are still two objects: `==` is false.', out: '3 5.0\ntrue false\n' },
          { line: 13, text: 'Generated `toString`.', out: '3 5.0\ntrue false\nPoint[x=3, y=4]\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'What you may add',
        text: [
          [
            'Instance methods and static methods.',
            'Static fields (not instance fields).',
            'Extra constructors, which must delegate to the canonical one with `this(...)`.',
            'Your own versions of accessors, `equals`, `hashCode` or `toString`.',
            '`implements` clauses. Records are implicitly `final` and extend `java.lang.Record`.',
            'Nested records are implicitly static; local records can be declared inside methods.'
          ]
        ],
        code: `import java.util.*;

public class Main {
    record Range(int lo, int hi) {
        Range {
            if (lo > hi) { int t = lo; lo = hi; hi = t; }   // normalise
        }
        Range(int single) { this(single, single); }
        static Range of(int a, int b) { return new Range(a, b); }
        int length() { return hi - lo; }
    }
    public static void main(String[] args) {
        System.out.println(new Range(5, 2) + " " + Range.of(1, 4).length() + " " + new Range(7));
    }
}`,
        expect: 'Range[lo=2, hi=5] 3 Range[lo=7, hi=7]'
      },
      {
        name: 'Records with collections',
        text: [
          'Fields are final, but a `List` component can still be changed by whoever holds that list. Copy in the compact constructor: `items = List.copyOf(items);`.'
        ]
      }
    ],
    table: {
      head: ['', 'Record', 'Regular class'],
      rows: [
        ['Fields', 'private final, from components', 'anything'],
        ['Constructor, accessors, equals/hashCode/toString', 'generated', 'write yourself'],
        ['Inheritance', 'cannot extend; is final', 'can extend / be extended'],
        ['Extra instance fields', 'not allowed', 'allowed'],
        ['Use for', 'DTOs, values, map keys, results', 'behaviour and mutable state']
      ]
    },
    pitfalls: [
      ['Expecting `getX()`', 'Accessors are named after the component: `x()`.'],
      ['Adding an instance field', 'Compile error. Compute it in a method instead.'],
      ['Mutable components', 'The record is only shallowly immutable. Copy lists in the compact constructor.'],
      ['Assigning `this.x` in a compact constructor', 'Not allowed; assign the parameter (`x = ...`) and let Java copy it.']
    ],
    interview: [
      ['What does a record generate?', ['A private final field and a public accessor per component, a canonical constructor, and `equals`, `hashCode` and `toString` based on all components. The class is final and extends `java.lang.Record`.']],
      ['What is a compact constructor?', ['A canonical constructor without a parameter list. Its body runs before the fields are assigned, so it is used to validate or normalise the parameters.']],
      ['Record vs Lombok @Value?', ['Similar purpose, but records are a language feature: no annotation processor, integrate with pattern matching (record patterns) and serialization, but cannot extend classes or have extra instance fields.']]
    ],
    say: [
      'Records are transparent data carriers with generated boilerplate.',
      'Validate or normalise in the compact constructor.',
      'Records are final and only shallowly immutable.'
    ],
    checklist: [
      'Write a record with validation.',
      'Add a static factory and an extra constructor.',
      'Explain why records make good map keys.',
      'Make a record with a List component truly immutable.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    record R(String name) {}
    public static void main(String[] args) {
        R r = new R("a");
        System.out.println(r.name() + " " + r);
    }
}`,
          answer: 'a R[name=a]',
          why: 'The accessor has the component\'s name; `toString` lists the components.'
        },
        {
          code: `public class Main {
    record Range(int lo, int hi) {
        Range {
            if (lo > hi) { int t = lo; lo = hi; hi = t; }
        }
    }
    public static void main(String[] args) {
        System.out.println(new Range(5, 2));
    }
}`,
          answer: 'Range[lo=2, hi=5]',
          why: 'The compact constructor swaps the parameters before they are stored.'
        },
        {
          code: `import java.util.*;

public class Main {
    record Pt(int x, int y) {}
    public static void main(String[] args) {
        Set<Pt> s = new HashSet<>(List.of(new Pt(1, 1), new Pt(2, 2)));
        s.add(new Pt(1, 1));
        System.out.println(s.size() + " " + s.contains(new Pt(2, 2)));
    }
}`,
          answer: '2 true',
          why: 'Records have value-based equals and hashCode, so equal points are duplicates.'
        },
        {
          code: `public class Main {
    record Name(String v) {
        public String v() { return v.toUpperCase(); }
    }
    public static void main(String[] args) {
        Name n = new Name("x");
        System.out.println(n.v() + " " + n);
    }
}`,
          answer: 'X Name[v=x]',
          why: 'You can override an accessor, but the generated `toString` reads the field itself.'
        }
      ],
      fill: [
        {
          q: 'Declare a data carrier.',
          code: `public class Main {
    [[record]] Pair(String a, int b) {}
    public static void main(String[] args) {
        System.out.println(new Pair("k", 2));
    }
}`,
          expect: 'Pair[a=k, b=2]',
          why: 'One line gives you constructor, accessors, equals, hashCode and toString.'
        },
        {
          q: 'Reject a bad email.',
          code: `public class Main {
    record Email(String value) {
        Email {
            if (value == null || !value.contains("@")) throw new [[IllegalArgumentException]]("bad");
        }
    }
    public static void main(String[] args) {
        try {
            new Email("nope");
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
          expect: 'bad',
          why: 'Validation belongs in the compact constructor.'
        }
      ],
      bug: [
        {
          q: 'Make it compile and print 212.0.',
          code: `public class Main {
    record Temp(double c) {
        double f = c * 9 / 5 + 32;
    }
    public static void main(String[] args) {
        System.out.println(new Temp(100).f());
    }
}`,
          line: 3,
          fix: 'double f() { return c * 9 / 5 + 32; }',
          expect: '212.0',
          why: 'Records cannot declare instance fields. Compute derived values in a method.'
        },
        {
          q: 'Move the point to x = 5.',
          code: `public class Main {
    record Point(int x, int y) {}
    public static void main(String[] args) {
        Point p = new Point(1, 2);
        p.x = 5;
        System.out.println(p);
    }
}`,
          line: 5,
          fix: 'p = new Point(5, p.y());',
          expect: 'Point[x=5, y=2]',
          why: 'Record fields are private and final. Make a new record instead.'
        }
      ]
    }
  });
})();
