(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const L1 = { id: 'f', type: 'lambda : Function', fields: [v('captured base', 10)] };
  const L2 = { id: 'p', type: 'lambda : Predicate', fields: [v('captured', '(none)')] };
  const L3 = { id: 's', type: 'lambda : Supplier', fields: [v('captured', '(none)')] };
  const vars = (extra) => [{ frame: 'main', vars: [v('base', 10), r('addBase', 'f'), r('isBig', 'p')].concat(extra || []) }];

  registerLesson({
    slug: 'lambdas',
    track: 'func',
    title: 'Lambdas and functional interfaces',
    one: 'A lambda is a short way to create an object that implements an interface with *one abstract method*.',
    idea: [
      'A **functional interface** has exactly one abstract method: `Runnable.run()`, `Comparator.compare()`, `Function.apply()`. A lambda `x -> x + 1` supplies the body of that one method.',
      'At run time the lambda is an object. If it uses local variables from around it, their values are **captured** (copied) into that object, which is why those variables must be effectively final.',
      '`java.util.function` gives you ready-made shapes: Function (T→R), Predicate (T→boolean), Supplier (()→T), Consumer (T→void), and two-argument and primitive versions.'
    ],
    stages: [
      {
        title: 'Lambdas are objects',
        code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        int base = 10;
        Function<Integer, Integer> addBase = x -> x + base;
        Predicate<Integer> isBig = n -> n > 12;
        int r = addBase.apply(5);
        System.out.println(r + " " + isBig.test(r));
        Supplier<String> hi = () -> "hi";
        System.out.println(hi.get());
    }
}`,
        steps: [
          { line: 5, text: 'A plain local int.', stack: [{ frame: 'main', vars: [v('base', 10)] }], heap: [], out: '' },
          { line: 6, text: 'The lambda becomes an object implementing `Function`. It uses `base`, so the value 10 is **copied into it**.', stack: [{ frame: 'main', vars: [v('base', 10), r('addBase', 'f')] }], heap: [L1] },
          { line: 7, text: 'This lambda captures nothing. The JVM can reuse one shared instance for it.', stack: vars(), heap: [L1, L2] },
          { line: 6, text: '`apply(5)` runs the lambda body in a new frame. `x` is the argument; `base` comes from the captured copy.', stack: vars().concat([{ frame: 'lambda body', vars: [v('x', 5), v('base', 10)] }]) },
          { line: 8, text: 'The result is stored in `r`.', stack: vars([v('r', 15)]) },
          { line: 9, text: '`test(15)`: 15 > 12.', out: '15 true\n' },
          { line: 10, text: 'A Supplier takes nothing and returns a value.', stack: vars([v('r', 15), r('hi', 's')]), heap: [L1, L2, L3] },
          { line: 11, text: '`get()` runs its body.', out: '15 true\nhi\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Lambda syntax',
        text: [
          [
            '`() -> 42` no parameters',
            '`x -> x * 2` one parameter, no parentheses needed',
            '`(a, b) -> a + b` several parameters',
            '`(String s) -> s.length()` explicit types (or `var`)',
            '`x -> { int y = x * 2; return y + 1; }` block body needs `return`'
          ]
        ]
      },
      {
        name: 'Composing functions',
        text: [
          'The standard interfaces have default methods to combine them.'
        ],
        code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Function<Integer, Integer> plus1 = x -> x + 1;
        Function<Integer, Integer> times2 = x -> x * 2;
        System.out.println(plus1.andThen(times2).apply(3));   // (3+1)*2
        System.out.println(plus1.compose(times2).apply(3));   // 3*2+1
        Predicate<String> empty = String::isEmpty;
        Predicate<String> shortWord = empty.negate().and(s -> s.length() < 4);
        System.out.println(shortWord.test("") + " " + shortWord.test("cat"));
    }
}`,
        expect: '8\n7\nfalse true'
      },
      {
        name: 'Your own functional interface',
        text: [
          'Mark it with `@FunctionalInterface` so the compiler rejects a second abstract method. Default and static methods are still allowed.'
        ],
        code: `public class Main {
    @FunctionalInterface
    interface Discount { double apply(double price); }

    public static void main(String[] args) {
        Discount tenOff = p -> p * 0.9;
        Discount none = p -> p;
        System.out.println(tenOff.apply(200) + " " + none.apply(200));
    }
}`,
        expect: '180.0 200.0'
      }
    ],
    table: {
      head: ['Interface', 'Method', 'Shape', 'Example'],
      rows: [
        ['`Function<T,R>`', '`apply`', 'T → R', '`s -> s.length()`'],
        ['`BiFunction<T,U,R>`', '`apply`', '(T, U) → R', '`(a, b) -> a + b`'],
        ['`Predicate<T>`', '`test`', 'T → boolean', '`n -> n > 0`'],
        ['`Supplier<T>`', '`get`', '() → T', '`() -> new ArrayList<>()`'],
        ['`Consumer<T>`', '`accept`', 'T → void', '`s -> System.out.println(s)`'],
        ['`UnaryOperator<T>`', '`apply`', 'T → T', '`s -> s.trim()`'],
        ['`BinaryOperator<T>`', '`apply`', '(T, T) → T', '`Integer::sum`'],
        ['`IntPredicate`, `ToIntFunction`…', '', 'no boxing', '`i -> i % 2 == 0`']
      ]
    },
    pitfalls: [
      ['Changing a captured local', 'Compile error: it must be effectively final. Use an AtomicInteger or a field if you really need a counter.'],
      ['Block body without `return`', '`x -> { x * 2; }` does not compile. Add `return` or drop the braces.'],
      ['Wrong interface shape', 'A lambda returning boolean cannot be a `Function<Integer, Integer>`.'],
      ['Heavy logic in lambdas', 'Hard to read and test. Extract a named method and use a method reference.']
    ],
    interview: [
      ['What is a functional interface?', ['An interface with exactly one abstract method, so a lambda or method reference can implement it. Examples: Runnable, Callable, Comparator, Function. `@FunctionalInterface` makes the compiler enforce it.']],
      ['How are lambdas implemented?', ['The compiler turns the body into a private method and emits an `invokedynamic` call. At run time `LambdaMetafactory` creates a class implementing the interface; non-capturing lambdas can reuse a single instance.']],
      ['Why must captured variables be effectively final?', ['The lambda gets a copy of the value, and it may run later or on another thread. Allowing the local to change would make the copy stale and invite races.']]
    ],
    say: [
      'A lambda implements a functional interface: one abstract method.',
      'Captured locals are copied and must be effectively final.',
      'Know Function, Predicate, Supplier, Consumer and their composition methods.'
    ],
    checklist: [
      'Write each standard functional interface as a lambda.',
      'Predict `andThen` vs `compose`.',
      'Define your own `@FunctionalInterface`.',
      'Explain what "capturing" means in memory.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Function<Integer, Integer> f = x -> x + 1;
        Function<Integer, Integer> g = x -> x * 2;
        System.out.println(f.andThen(g).apply(3) + " " + f.compose(g).apply(3));
    }
}`,
          answer: '8 7',
          why: '`f.andThen(g)` runs f first: (3+1)·2. `f.compose(g)` runs g first: 3·2+1.'
        },
        {
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Predicate<String> empty = String::isEmpty;
        Predicate<String> p = empty.negate().and(s -> s.length() < 3);
        System.out.println(p.test("") + " " + p.test("ab") + " " + p.test("abc"));
    }
}`,
          answer: 'false true false',
          why: 'p means "not empty and shorter than 3".'
        },
        {
          code: `import java.util.*;
import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        BinaryOperator<Integer> max = BinaryOperator.maxBy(Comparator.naturalOrder());
        UnaryOperator<String> shout = s -> s.toUpperCase() + "!";
        System.out.println(max.apply(3, 9) + " " + shout.apply("hey"));
    }
}`,
          answer: '9 HEY!',
          why: '`maxBy` builds a BinaryOperator from a comparator; UnaryOperator is a Function from T to T.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Runnable> tasks = new ArrayList<>();
        for (String s : List.of("a", "b")) {
            tasks.add(() -> System.out.print(s));
        }
        tasks.forEach(Runnable::run);
        System.out.println();
    }
}`,
          answer: 'ab',
          why: 'The enhanced-for variable is a fresh effectively final variable each round, so each lambda captures its own value.'
        }
      ],
      fill: [
        {
          q: 'Test whether a number is even.',
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        [[Predicate]]<Integer> even = n -> n % 2 == 0;
        System.out.println(even.[[test]](4));
    }
}`,
          expect: 'true',
          why: 'A Predicate takes a value and returns boolean via `test`.'
        },
        {
          q: 'Add two numbers.',
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        BiFunction<Integer, Integer, Integer> add = ([[a, b|Integer a, Integer b|var a, var b]]) -> a + b;
        System.out.println(add.apply(2, 3));
    }
}`,
          expect: '5',
          why: 'Two parameters need parentheses; types are optional.'
        }
      ],
      bug: [
        {
          q: 'Make the code compile and print true.',
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Function<Integer, Integer> isEven = n -> n % 2 == 0;
        System.out.println(isEven.apply(4));
    }
}`,
          line: 5,
          fix: 'Function<Integer, Boolean> isEven = n -> n % 2 == 0;',
          expect: 'true',
          why: 'The lambda returns a boolean, so the result type must be Boolean (or use a Predicate).'
        },
        {
          q: 'Should print 16.',
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Function<Integer, Integer> sq = x -> { x * x; };
        System.out.println(sq.apply(4));
    }
}`,
          line: 5,
          fix: 'Function<Integer, Integer> sq = x -> { return x * x; };',
          expect: '16',
          why: 'A block body needs an explicit `return`. (Or write `x -> x * x`.)'
        }
      ]
    }
  });
})();
