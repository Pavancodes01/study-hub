(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const N = (id, n, row) => ({ id, type: 'Num', fields: [v('v', n)], row });
  const heap = [
    { id: 'add', type: 'Add', fields: [r('l', 'n2'), r('r', 'mul')], row: 'l0' },
    N('n2', 2, 'l1'), { id: 'mul', type: 'Mul', fields: [r('l', 'n3'), r('r', 'n4')], row: 'l1' },
    N('n3', 3, 'l2'), N('n4', 4, 'l2')
  ];
  const M = { frame: 'main', vars: [r('e', 'add')] };
  const ev = (vars) => ({ frame: 'eval', vars });

  registerLesson({
    slug: 'pattern-matching',
    track: 'jvm',
    title: 'Pattern matching for instanceof and switch',
    one: 'Patterns *test a type and pull out the parts* in one step: `case Add(Expr l, Expr r) -> eval(l) + eval(r)`.',
    idea: [
      '`if (o instanceof String s)` checks the type and, if it matches, declares `s` already cast. No separate cast line, no chance of casting to the wrong type (Java 16).',
      'In Java 21, `switch` accepts patterns: type patterns (`case Circle c`), **record patterns** that deconstruct components (`case Point(int x, int y)`), guards (`case Integer i when i > 0`) and `case null`.',
      'With sealed types the compiler checks the switch covers every case. Together, records + sealed + patterns let you write data-oriented code that is short and type-safe.'
    ],
    stages: [
      {
        title: 'Deconstructing a tree',
        code: `public class Main {
    sealed interface Expr permits Num, Add, Mul {}
    record Num(int v) implements Expr {}
    record Add(Expr l, Expr r) implements Expr {}
    record Mul(Expr l, Expr r) implements Expr {}
    static int eval(Expr e) {
        return switch (e) {
            case Num n -> n.v();
            case Add(Expr l, Expr r) -> eval(l) + eval(r);
            case Mul(Expr l, Expr r) -> eval(l) * eval(r);
        };
    }
    public static void main(String[] args) {
        Expr e = new Add(new Num(2), new Mul(new Num(3), new Num(4)));
        System.out.println(eval(e));
    }
}`,
        steps: [
          { line: 14, text: 'A small expression tree: 2 + (3 × 4).', stack: [M], heap: heap, out: '' },
          { line: 9, text: 'The root is an Add. The **record pattern** matches it and binds its components to `l` and `r` directly.', stack: [M, ev([r('e', 'add'), r('l', 'n2'), r('r', 'mul')])] },
          { line: 8, text: 'Recursing into `l`: a Num, so the type pattern binds `n` and returns 2.', stack: [M, ev([r('e', 'add'), r('l', 'n2'), r('r', 'mul')]), ev([r('e', 'n2'), r('n', 'n2'), v('(returns)', 2)])] },
          { line: 10, text: 'Now `r`: a Mul. Its components are bound in the new frame.', stack: [M, ev([r('e', 'add'), r('l', 'n2'), r('r', 'mul')]), ev([r('e', 'mul'), r('l', 'n3'), r('r', 'n4')])] },
          { line: 10, text: 'Both sides are Nums: 3 × 4 = 12.', stack: [M, ev([r('e', 'add'), r('l', 'n2'), r('r', 'mul')]), ev([r('e', 'mul'), v('(returns)', 12)])] },
          { line: 9, text: '2 + 12.', stack: [M, ev([r('e', 'add'), v('(returns)', 14)])] },
          { line: 15, text: 'No casts, no instanceof chains, and the compiler checked all three cases are covered.', stack: [M], out: '14\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'instanceof patterns and flow scoping',
        text: [
          'The pattern variable is in scope wherever the compiler can prove the match succeeded, including after an early return.'
        ],
        code: `public class Main {
    static int len(Object o) {
        if (!(o instanceof String s)) return -1;
        return s.length();                     // s is in scope here
    }
    public static void main(String[] args) {
        Object o = "hello";
        if (o instanceof String s && s.length() > 3) System.out.println(s.toUpperCase());
        System.out.println(len(o) + " " + len(42));
    }
}`,
        expect: 'HELLO\n5 -1'
      },
      {
        name: 'Switch patterns in detail',
        text: [
          [
            'Cases are checked top to bottom. A case that can never match because an earlier one covers it ("dominated") is a compile error.',
            '`when` adds a condition to a pattern.',
            'Without `case null`, a null selector throws NullPointerException as before.',
            'Record patterns nest: `case Line(Point(var x1, var y1), Point p2)`.'
          ]
        ],
        code: `public class Main {
    record Point(int x, int y) {}
    static String describe(Object o) {
        return switch (o) {
            case null -> "null!";
            case Integer i when i > 40 -> "big int";
            case Integer i -> "int " + i;
            case Point(int x, int y) when x == y -> "diagonal point";
            case Point(var x, var y) -> "point " + (x + y);
            case String s -> "string of " + s.length();
            default -> "other";
        };
    }
    public static void main(String[] args) {
        for (Object o : new Object[]{42, 7, new Point(2, 2), new Point(1, 3), "hey", null, 1.5}) {
            System.out.println(describe(o));
        }
    }
}`,
        expect: 'big int\nint 7\ndiagonal point\npoint 4\nstring of 3\nnull!\nother'
      }
    ],
    pitfalls: [
      ['A general case before a specific one', '`case CharSequence cs` before `case String s` is a dominance error.'],
      ['Switching over Object without `default`', 'Not exhaustive: compile error.'],
      ['Forgetting `case null`', 'A null selector still throws NullPointerException.'],
      ['Using the pattern variable outside its scope', '`if (!(o instanceof String s)) { s... }` does not compile: there `s` is not definitely matched.']
    ],
    interview: [
      ['What is a record pattern?', ['A pattern like `Point(int x, int y)` that matches a record type and binds its components to variables in one step. Patterns can nest to take apart whole structures.']],
      ['How do sealed types and pattern matching work together?', ['Sealed types make the set of subtypes known, so a switch with a case for each subtype is exhaustive without default, and adding a subtype breaks compilation until every switch handles it.']],
      ['What is a guard?', ['A `when` clause after a pattern that adds a boolean condition; the case matches only if the pattern matches and the condition is true.']]
    ],
    say: [
      'Patterns combine type test, cast and extraction.',
      'Order matters: specific cases before general ones.',
      'Sealed + records + switch patterns = exhaustive, cast-free code.'
    ],
    checklist: [
      'Rewrite an instanceof-and-cast with a pattern.',
      'Deconstruct a nested record in a switch.',
      'Add a guard and a null case.',
      'Explain a dominance error.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        Object o = 42;
        String s = switch (o) {
            case Integer i when i > 40 -> "big int";
            case Integer i -> "int";
            case String str -> "str";
            default -> "other";
        };
        System.out.println(s);
    }
}`,
          answer: 'big int',
          why: '42 matches the guarded Integer case first.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Object o = null;
        String a = switch (o) {
            case null -> "null!";
            default -> "x";
        };
        System.out.println(a);
        try {
            String b = switch (o) { default -> "x"; };
            System.out.println(b);
        } catch (NullPointerException e) {
            System.out.println("NPE");
        }
    }
}`,
          answer: 'null!\nNPE',
          why: 'Only an explicit `case null` handles null; otherwise the switch throws.'
        },
        {
          code: `public class Main {
    record Box(Object content) {}
    public static void main(String[] args) {
        Object o = new Box(new Box("gift"));
        if (o instanceof Box(Box(String s))) {
            System.out.println(s.length());
        }
    }
}`,
          answer: '4',
          why: 'Nested record patterns match a Box inside a Box holding a String and bind it.'
        },
        {
          code: `public class Main {
    static String kind(Object o) {
        if (o instanceof Integer n && n % 2 == 0) return "even";
        if (o instanceof Integer n) return "odd";
        return "not a number";
    }
    public static void main(String[] args) {
        System.out.println(kind(4) + " " + kind(7) + " " + kind("x"));
    }
}`,
          answer: 'even odd not a number',
          why: 'The pattern variable can be used in the rest of the `&&` condition.'
        }
      ],
      fill: [
        {
          q: 'Test and cast in one go.',
          code: `public class Main {
    public static void main(String[] args) {
        Object obj = "pattern";
        if (obj [[instanceof]] String [[s]]) {
            System.out.println(s.length());
        }
    }
}`,
          expect: '7',
          why: 'The binding variable is declared right in the instanceof.'
        },
        {
          q: 'Deconstruct the point.',
          code: `public class Main {
    record Point(int x, int y) {}
    public static void main(String[] args) {
        Object o = new Point(3, 4);
        int sum = switch (o) {
            case Point(int x, [[int y|var y]]) -> x + y;
            default -> 0;
        };
        System.out.println(sum);
    }
}`,
          expect: '7',
          why: 'A record pattern lists the components; `var` lets the type be inferred.'
        }
      ],
      bug: [
        {
          q: 'Make it compile; a String should give "string".',
          code: `public class Main {
    static String what(Object o) {
        return switch (o) {
            case CharSequence cs -> "chars";
            case String s -> "string";
            default -> "other";
        };
    }
    public static void main(String[] args) {
        System.out.println(what("hi"));
    }
}`,
          line: 4,
          fix: 'case CharSequence cs when !(cs instanceof String) -> "chars";',
          expect: 'string',
          why: 'Every String is a CharSequence, so the String case could never be reached (dominance). Put specific cases first or guard the general one.'
        },
        {
          q: 'Make the switch exhaustive.',
          code: `public class Main {
    static String what(Object o) {
        return switch (o) {
            case String s -> "string";
            case Integer i -> "int";
        };
    }
    public static void main(String[] args) {
        System.out.println(what(1.5));
    }
}`,
          line: 5,
          fix: 'case Integer i -> "int"; default -> "?";',
          expect: '?',
          why: 'Object has unlimited subtypes, so a pattern switch over it needs a default.'
        }
      ]
    }
  });
})();
