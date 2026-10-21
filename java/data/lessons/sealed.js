(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const C = { id: 'c', type: 'Circle', fields: [v('r', 1.0)], row: 's' };
  const Q = { id: 'q', type: 'Square', fields: [v('side', 2.0)], row: 's' };
  const M = { frame: 'main', vars: [r('a', 'c'), r('b', 'q')] };

  registerLesson({
    slug: 'sealed',
    track: 'jvm',
    title: 'Sealed classes and interfaces',
    one: '`sealed` fixes the list of subtypes. The compiler then *knows every case*, so a switch over them needs no `default`.',
    idea: [
      'A sealed type names exactly which classes may extend or implement it: `sealed interface Shape permits Circle, Square`. Nobody else can add a subtype.',
      'Each permitted subtype must say how it continues: `final` (no further subclasses), `sealed` (its own fixed list) or `non-sealed` (open again). Records are implicitly final, so they fit perfectly.',
      'Because the set is closed, a `switch` that covers every permitted subtype is **exhaustive**. If someone adds a new subtype later, every such switch stops compiling until it handles the new case. That is the safety net enums give you, but for types that carry different data.'
    ],
    stages: [
      {
        title: 'Exhaustive dispatch',
        code: `public class Main {
    sealed interface Shape permits Circle, Square {}
    record Circle(double r) implements Shape {}
    record Square(double side) implements Shape {}
    static double area(Shape s) {
        return switch (s) {
            case Circle c -> 3 * c.r() * c.r();
            case Square q -> q.side() * q.side();
        };
    }
    public static void main(String[] args) {
        Shape a = new Circle(1), b = new Square(2);
        System.out.println(area(a) + area(b));
    }
}`,
        steps: [
          { line: 12, text: 'Two shapes. Only Circle and Square can ever be Shapes.', stack: [M], heap: [C, Q], out: '' },
          { line: 7, text: '`area(a)`: the switch tests the object\'s type. It is a Circle, so `c` is bound to it.', stack: [M, { frame: 'area', vars: [r('s', 'c'), r('c', 'c')] }] },
          { line: 7, text: '3 × 1 × 1 = 3.0.', stack: [M, { frame: 'area', vars: [r('s', 'c'), v('(returns)', 3.0)] }] },
          { line: 8, text: '`area(b)`: a Square, so the second case binds `q`. 2 × 2 = 4.0.', stack: [M, { frame: 'area', vars: [r('s', 'q'), r('q', 'q'), v('(returns)', 4.0)] }] },
          { line: 13, text: 'No `default` was needed: the compiler knows these two cases cover every Shape.', stack: [M], out: '7.0\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The rules',
        text: [
          [
            'Permitted subclasses must be in the same module (or the same package if there is no module).',
            'If all subtypes are in the same file, `permits` can be left out.',
            'Each subtype must be `final`, `sealed` or `non-sealed`.',
            '`non-sealed` opens that branch again for any subclass.'
          ]
        ],
        code: `public class Main {
    sealed interface Vehicle permits Car, Truck {}
    static non-sealed class Car implements Vehicle {}
    static final class Truck implements Vehicle {}
    static class SportsCar extends Car {}            // allowed: Car is non-sealed
    public static void main(String[] args) {
        Vehicle v = new SportsCar();
        System.out.println((v instanceof Car) + " " + Vehicle.class.isSealed()
            + " " + Vehicle.class.getPermittedSubclasses().length);
    }
}`,
        expect: 'true true 2'
      },
      {
        name: 'Modelling with sealed types and records',
        text: [
          'A sealed interface plus records is Java\'s way to write algebraic data types: "a Result is either Ok(value) or Err(message)". Pattern matching then takes each case apart safely.'
        ],
        code: `public class Main {
    sealed interface Result permits Ok, Err {}
    record Ok(int value) implements Result {}
    record Err(String message) implements Result {}

    static Result parse(String s) {
        try { return new Ok(Integer.parseInt(s)); }
        catch (NumberFormatException e) { return new Err("not a number: " + s); }
    }
    public static void main(String[] args) {
        for (String in : new String[]{"42", "x"}) {
            String out = switch (parse(in)) {
                case Ok ok -> "ok " + ok.value();
                case Err err -> err.message();
            };
            System.out.println(out);
        }
    }
}`,
        expect: 'ok 42\nnot a number: x'
      }
    ],
    table: {
      head: ['', 'enum', 'sealed hierarchy'],
      rows: [
        ['Instances', 'fixed set of single objects', 'fixed set of types, any number of objects'],
        ['Data per case', 'same fields for all constants', 'each subtype has its own fields'],
        ['Exhaustive switch', 'yes', 'yes'],
        ['Typical use', 'statuses, days, operations', 'results, events, AST nodes, shapes']
      ]
    },
    pitfalls: [
      ['Subclass not listed in `permits`', 'Compile error.'],
      ['Permitted class without `final`/`sealed`/`non-sealed`', 'Compile error (records and enums are implicitly final).'],
      ['Adding `default` to a switch over a sealed type', 'It hides the compile error you would want when a new subtype is added.'],
      ['Permitted subtype in another package without modules', 'Not allowed.']
    ],
    interview: [
      ['What problem do sealed classes solve?', ['They let a library author control which types extend a hierarchy, so the set of subtypes is known. This makes domain models explicit and lets the compiler check switches for exhaustiveness.']],
      ['What must a permitted subclass declare?', ['One of `final`, `sealed` (with its own permits) or `non-sealed`. Records and enums are implicitly final.']],
      ['Sealed vs final?', ['`final` allows no subclasses at all; `sealed` allows exactly the listed ones.']]
    ],
    say: [
      'sealed + permits = closed set of subtypes.',
      'Subtypes must be final, sealed or non-sealed.',
      'Exhaustive switches without default catch new cases at compile time.'
    ],
    checklist: [
      'Write a sealed interface with record subtypes.',
      'Switch over it without default.',
      'Explain non-sealed.',
      'Compare sealed types with enums.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    sealed interface Expr permits Num, Add {}
    record Num(int v) implements Expr {}
    record Add(Expr l, Expr r) implements Expr {}
    static int eval(Expr e) {
        return switch (e) {
            case Num n -> n.v();
            case Add a -> eval(a.l()) + eval(a.r());
        };
    }
    public static void main(String[] args) {
        System.out.println(eval(new Add(new Num(2), new Add(new Num(3), new Num(4)))));
    }
}`,
          answer: '9',
          why: 'The evaluator recurses through the tree: 2 + (3 + 4).'
        },
        {
          code: `public class Main {
    sealed interface Shape permits Circle, Square {}
    record Circle(double r) implements Shape {}
    record Square(double s) implements Shape {}
    static String size(Shape sh) {
        return switch (sh) {
            case Circle c when c.r() > 10 -> "big circle";
            case Circle c -> "circle";
            case Square s -> "square";
        };
    }
    public static void main(String[] args) {
        System.out.println(size(new Circle(1)) + ", " + size(new Circle(20)));
    }
}`,
          answer: 'circle, big circle',
          why: 'Cases are tried in order; the guarded case catches only large circles.'
        },
        {
          code: `public class Main {
    sealed interface Animal permits Dog, Cat {}
    static final class Dog implements Animal {}
    static final class Cat implements Animal {}
    public static void main(String[] args) {
        System.out.println(Animal.class.isSealed() + " " + Dog.class.isSealed());
    }
}`,
          answer: 'true false',
          why: 'Only the parent is sealed; the subclasses are final.'
        },
        {
          code: `public class Main {
    sealed interface Vehicle permits Car {}
    static non-sealed class Car implements Vehicle {}
    static class Taxi extends Car {}
    public static void main(String[] args) {
        Vehicle v = new Taxi();
        System.out.println(v instanceof Vehicle);
    }
}`,
          answer: 'true',
          why: '`non-sealed` reopens the Car branch, so Taxi may extend it.'
        }
      ],
      fill: [
        {
          q: 'Close the hierarchy.',
          code: `public class Main {
    [[sealed]] interface Animal [[permits]] Dog, Cat {}
    record Dog() implements Animal {}
    record Cat() implements Animal {}
    public static void main(String[] args) {
        Animal a = new Cat();
        System.out.println(switch (a) { case Dog d -> "woof"; case Cat c -> "meow"; });
    }
}`,
          expect: 'meow',
          why: 'With a sealed parent the switch is exhaustive without default.'
        },
        {
          q: 'Declare how the subclass continues.',
          code: `public class Main {
    sealed interface Pet permits Fish {}
    static [[final|non-sealed]] class Fish implements Pet {}
    public static void main(String[] args) {
        System.out.println(new Fish() instanceof Pet);
    }
}`,
          expect: 'true',
          why: 'A permitted subclass must be final, sealed or non-sealed.'
        }
      ],
      bug: [
        {
          q: 'Allow triangles too.',
          code: `public class Main {
    sealed interface Shape permits Circle, Square {}
    record Circle(double r) implements Shape {}
    record Square(double s) implements Shape {}
    record Triangle(double b, double h) implements Shape {}
    public static void main(String[] args) {
        Shape s = new Triangle(2, 3);
        System.out.println(s instanceof Triangle);
    }
}`,
          line: 2,
          fix: 'sealed interface Shape permits Circle, Square, Triangle {}',
          expect: 'true',
          why: 'Triangle is not in the permits list, so it may not implement Shape.'
        },
        {
          q: 'Make it compile.',
          code: `public class Main {
    sealed interface Vehicle permits Car {}
    static class Car implements Vehicle {}
    public static void main(String[] args) {
        System.out.println(new Car() instanceof Vehicle);
    }
}`,
          line: 3,
          fix: 'static final class Car implements Vehicle {}',
          expect: 'true',
          why: 'A permitted subclass must declare final, sealed or non-sealed.'
        }
      ]
    }
  });
})();
