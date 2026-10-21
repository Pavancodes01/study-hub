(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const E = (id, name, ord, g) => ({ id, type: 'Planet.' + name, fields: [v('ordinal', ord), v('gravity', g)], row: 'e' });
  const all = [E('e0', 'MERCURY', 0, 3.7), E('e1', 'EARTH', 1, 9.8), E('e2', 'MARS', 2, 3.7)];

  registerLesson({
    slug: 'enums',
    track: 'oop',
    title: 'Enums',
    one: 'Each enum constant is a *single object* created once when the enum loads. So comparing enums with `==` is correct.',
    idea: [
      'An `enum` is a class with a fixed set of instances. `Planet.EARTH` is a `public static final` field holding the one and only EARTH object.',
      'Enums can have fields, constructors (always private), methods, and even a different method body per constant. They implicitly extend `java.lang.Enum`, which gives `name()`, `ordinal()`, `compareTo` and `valueOf`.',
      'Because there is exactly one object per constant, `==` and `equals` mean the same thing, and `switch` works on them.'
    ],
    stages: [
      {
        title: 'Constants are singletons',
        code: `public class Main {
    public static void main(String[] args) {
        Planet p = Planet.EARTH;
        Planet q = Planet.valueOf("EARTH");
        System.out.println(p == q);
        System.out.println(p.ordinal() + " " + p.gravity);
        System.out.println(Planet.MARS.compareTo(p));
    }
}
enum Planet {
    MERCURY(3.7), EARTH(9.8), MARS(3.7);
    final double gravity;
    Planet(double gravity) { this.gravity = gravity; }
}`,
        steps: [
          { line: 11, text: 'First use of `Planet` initializes the enum: the constructor runs three times, once per constant, in declaration order.',
            stack: [{ frame: 'main', vars: [] }], heap: all, out: '' },
          { line: 3, text: '`p` points at the EARTH object.', stack: [{ frame: 'main', vars: [r('p', 'e1')] }] },
          { line: 4, text: '`valueOf("EARTH")` looks the constant up by name. It returns the **same** object, never a new one.', stack: [{ frame: 'main', vars: [r('p', 'e1'), r('q', 'e1')] }] },
          { line: 5, text: 'One object, so `==` is true.', out: 'true\n' },
          { line: 6, text: '`ordinal()` is the position in the declaration (from 0).', out: 'true\n1 9.8\n' },
          { line: 7, text: '`compareTo` compares ordinals: 2 − 1 = 1.', out: 'true\n1 9.8\n1\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Enums with behaviour',
        text: [
          'Each constant can supply its own method body. This replaces long `switch` statements.'
        ],
        code: `public class Main {
    enum Op {
        ADD("+") { int apply(int a, int b) { return a + b; } },
        MUL("*") { int apply(int a, int b) { return a * b; } };

        final String symbol;
        Op(String symbol) { this.symbol = symbol; }
        abstract int apply(int a, int b);
    }
    public static void main(String[] args) {
        for (Op op : Op.values()) {
            System.out.println("3 " + op.symbol + " 4 = " + op.apply(3, 4));
        }
    }
}`,
        expect: '3 + 4 = 7\n3 * 4 = 12'
      },
      {
        name: 'Switch on an enum',
        text: [
          'Inside `case` you write the bare constant name. An arrow switch used as an expression must cover every constant (or have `default`), and the compiler checks it.'
        ],
        code: `public class Main {
    enum Light { RED, YELLOW, GREEN }
    static String action(Light l) {
        return switch (l) {
            case RED -> "stop";
            case YELLOW -> "slow";
            case GREEN -> "go";
        };
    }
    public static void main(String[] args) {
        System.out.println(action(Light.YELLOW));
    }
}`,
        expect: 'slow'
      },
      {
        name: 'EnumMap and EnumSet',
        text: [
          '`EnumMap` and `EnumSet` are special collections backed by an array and a bit mask indexed by ordinal. They are very fast and iterate in declaration order. Use them instead of HashMap/HashSet when the keys are enum constants.'
        ]
      },
      {
        name: 'The enum singleton',
        text: [
          '`enum Registry { INSTANCE; ... }` is the simplest thread-safe singleton. The JVM creates it exactly once, and it cannot be cloned or duplicated by reflection or deserialization.'
        ]
      }
    ],
    pitfalls: [
      ['Storing `ordinal()` in a database', 'Reordering constants changes ordinals. Store `name()` or an explicit code field.'],
      ['`valueOf` with unknown or wrong-case text', 'Throws `IllegalArgumentException`. Catch it or check first.'],
      ['Comparing an enum to a String', '`status.equals("OPEN")` is always false. Compare with `Status.OPEN`.'],
      ['`public` enum constructor', 'Not allowed: enum constructors are implicitly private.']
    ],
    interview: [
      ['Can you compare enums with `==`?', ['Yes. Each constant is a single instance, so `==` is correct, null-safe and checked at compile time for type.']],
      ['Can an enum extend a class or implement an interface?', ['It cannot extend anything because it already extends `java.lang.Enum`. It can implement interfaces.']],
      ['Why is an enum a good singleton?', ['The JVM guarantees one instance per constant, initialization is thread-safe, and serialization and reflection cannot create extra copies.']]
    ],
    say: [
      'Each enum constant is one object; `==` is the right comparison.',
      'Enums can hold fields, constructors and per-constant behaviour.',
      'Use EnumMap/EnumSet for enum keys; never persist ordinals.'
    ],
    checklist: [
      'Add a field and constructor to an enum.',
      'Give each constant its own method body.',
      'Write an exhaustive arrow switch over an enum.',
      'Explain why `ordinal()` is fragile.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    enum Size { S, M, L }
    public static void main(String[] args) {
        System.out.println(Size.valueOf("M").ordinal() + " " + Size.values().length + " " + Size.L);
    }
}`,
          answer: '1 3 L',
          why: 'M is at position 1, there are 3 constants, and `toString` returns the name.'
        },
        {
          code: `public class Main {
    enum Size { S, M }
    public static void main(String[] args) {
        try {
            System.out.println(Size.valueOf("m"));
        } catch (IllegalArgumentException e) {
            System.out.println("bad");
        }
    }
}`,
          answer: 'bad',
          why: '`valueOf` is case-sensitive and throws for unknown names.'
        },
        {
          code: `import java.util.*;

public class Main {
    enum Size { S, M, L }
    public static void main(String[] args) {
        Map<Size, Integer> m = new EnumMap<>(Size.class);
        m.put(Size.L, 1);
        m.put(Size.S, 2);
        System.out.println(m);
    }
}`,
          answer: '{S=2, L=1}',
          why: 'EnumMap always iterates in declaration order, not insertion order.'
        },
        {
          code: `public class Main {
    enum Coin {
        PENNY(1), DIME(10);
        final int cents;
        Coin(int cents) { this.cents = cents; System.out.print(name() + " "); }
    }
    public static void main(String[] args) {
        System.out.println("start");
        System.out.println(Coin.DIME.cents);
    }
}`,
          answer: 'start\nPENNY DIME 10',
          why: 'The enum is initialized on first use, after "start". All constants are built then, in order.'
        }
      ],
      fill: [
        {
          q: 'Map each light to an action.',
          code: `public class Main {
    enum Light { RED, GREEN }
    public static void main(String[] args) {
        Light l = Light.RED;
        String a = switch (l) {
            case [[RED]] -> "stop";
            case [[GREEN]] -> "go";
        };
        System.out.println(a);
    }
}`,
          expect: 'stop',
          why: 'Inside `case`, use the bare constant name without `Light.`.'
        },
        {
          q: 'Give each coin a value.',
          code: `public class Main {
    enum Coin {
        NICKEL(5), QUARTER(25);
        private final int cents;
        Coin(int cents) { [[this.cents]] = cents; }
        int cents() { return cents; }
    }
    public static void main(String[] args) {
        System.out.println(Coin.QUARTER.cents());
    }
}`,
          expect: '25',
          why: 'Enum constructors work like class constructors and run once per constant.'
        }
      ],
      bug: [
        {
          q: 'Should print "open".',
          code: `public class Main {
    enum Status { OPEN, CLOSED }
    public static void main(String[] args) {
        Status status = Status.OPEN;
        if (status.equals("OPEN")) {
            System.out.println("open");
        } else {
            System.out.println("closed");
        }
    }
}`,
          line: 5,
          fix: 'if (status == Status.OPEN) {',
          expect: 'open',
          why: 'An enum constant is never equal to a String. Compare constants directly.'
        },
        {
          q: 'The enum should compile.',
          code: `public class Main {
    enum Level {
        LOW(1), HIGH(9);
        final int n;
        public Level(int n) { this.n = n; }
    }
    public static void main(String[] args) {
        System.out.println(Level.HIGH.n);
    }
}`,
          line: 5,
          fix: 'Level(int n) { this.n = n; }',
          expect: '9',
          why: 'Enum constructors are always private; `public` is a compile error.'
        }
      ]
    }
  });
})();
