(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const P = { id: 'pre', type: 'String', val: '"id-"' };
  const B = { id: 'b', type: 'ref : prefix::concat', fields: [r('bound receiver', 'pre')] };
  const U = { id: 'u', type: 'ref : String::toUpperCase', fields: [v('receiver', '(the argument)')] };
  const S = { id: 'st', type: 'ref : Integer::parseInt', fields: [v('static', 'yes')] };
  const C = { id: 'c', type: 'ref : ArrayList::new', fields: [v('makes', 'ArrayList')] };
  const base = [r('prefix', 'pre'), r('bound', 'b'), r('unbound', 'u'), r('stat', 'st'), r('ctor', 'c')];

  registerLesson({
    slug: 'method-refs',
    track: 'func',
    title: 'Method references',
    one: '`String::length` is shorthand for `s -> s.length()`. There are four kinds, and the *bound* kind captures its receiver when created.',
    idea: [
      'When a lambda only calls one existing method, a method reference says the same thing more clearly: `list.forEach(System.out::println)`.',
      'Four forms: **static** (`Integer::parseInt`), **bound** to a specific object (`prefix::concat`), **unbound** where the first argument becomes the receiver (`String::toUpperCase`), and **constructor** (`ArrayList::new`).',
      'A bound reference evaluates its receiver **once**, when the reference is created. A lambda evaluates its body every time it runs. That difference shows up in interview puzzles.'
    ],
    stages: [
      {
        title: 'The four kinds',
        code: `import java.util.*;
import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        String prefix = "id-";
        Function<String, String> bound = prefix::concat;
        Function<String, String> unbound = String::toUpperCase;
        Function<String, Integer> stat = Integer::parseInt;
        Supplier<List<String>> ctor = ArrayList::new;
        List<String> out = ctor.get();
        out.add(bound.apply("7"));
        out.add(unbound.apply("ok"));
        System.out.println(out + " " + (stat.apply("40") + 2));
    }
}`,
        steps: [
          { line: 6, text: 'A String to bind to.', stack: [{ frame: 'main', vars: [r('prefix', 'pre')] }], heap: [P], out: '' },
          { line: 7, text: '**Bound**: the receiver `prefix` is captured now. `bound.apply(x)` will run `prefix.concat(x)`.', stack: [{ frame: 'main', vars: base.slice(0, 2) }], heap: [P, B] },
          { line: 8, text: '**Unbound**: no receiver yet. `unbound.apply(s)` runs `s.toUpperCase()`: the argument becomes the receiver.', stack: [{ frame: 'main', vars: base.slice(0, 3) }], heap: [P, B, U] },
          { line: 9, text: '**Static**: `stat.apply(s)` runs `Integer.parseInt(s)`.', stack: [{ frame: 'main', vars: base.slice(0, 4) }], heap: [P, B, U, S] },
          { line: 10, text: '**Constructor**: `ctor.get()` runs `new ArrayList<>()`.', stack: [{ frame: 'main', vars: base }], heap: [P, B, U, S, C] },
          { line: 11, text: 'Calling the supplier creates the list.', stack: [{ frame: 'main', vars: base.concat([r('out', 'l')]) }], heap: [P, B, U, S, C, { id: 'l', type: 'ArrayList', val: '[]' }] },
          { line: 12, text: '`"id-".concat("7")`.', heap: [P, B, U, S, C, { id: 'l', type: 'ArrayList', val: '[id-7]' }] },
          { line: 13, text: '`"ok".toUpperCase()`.', heap: [P, B, U, S, C, { id: 'l', type: 'ArrayList', val: '[id-7, OK]' }] },
          { line: 14, text: '`Integer.parseInt("40") + 2`.', out: '[id-7, OK] 42\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Translating between lambdas and references',
        text: [],
        code: `import java.util.*;
import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Function<String, Integer> a1 = s -> Integer.parseInt(s);   // static
        Function<String, Integer> a2 = Integer::parseInt;
        BiFunction<String, String, Boolean> b1 = (x, y) -> x.equals(y); // unbound, 2 args
        BiFunction<String, String, Boolean> b2 = String::equals;
        Function<String, StringBuilder> c1 = s -> new StringBuilder(s);  // constructor
        Function<String, StringBuilder> c2 = StringBuilder::new;
        System.out.println(a2.apply("5") + " " + b2.apply("x", "x") + " " + c2.apply("ab").reverse());
    }
}`,
        expect: '5 true ba'
      },
      {
        name: 'When to prefer which',
        text: [
          [
            'Use a method reference when it names exactly what happens: `map(String::trim)`, `sorted(Comparator.comparing(User::age))`.',
            'Use a lambda when you need extra arguments, a different order, or more than one call: `x -> x.substring(1)`.',
            'Overloaded methods can make references ambiguous; a lambda with explicit types fixes that.'
          ]
        ]
      }
    ],
    table: {
      head: ['Kind', 'Reference', 'Equivalent lambda'],
      rows: [
        ['static', '`Integer::parseInt`', '`s -> Integer.parseInt(s)`'],
        ['bound', '`prefix::concat`', '`s -> prefix.concat(s)` (prefix read once)'],
        ['unbound', '`String::length`', '`s -> s.length()`'],
        ['constructor', '`ArrayList::new`', '`() -> new ArrayList<>()`'],
        ['array constructor', '`int[]::new`', '`n -> new int[n]`']
      ]
    },
    pitfalls: [
      ['Writing `String::length()`', 'No parentheses in a method reference.'],
      ['Bound receiver evaluated early', '`holder[0]::length` reads `holder[0]` when the reference is made; `null` there throws immediately.'],
      ['Constructor reference arity', '`StringBuilder::new` fits both `Supplier` and `Function<String, …>`; the target type decides which constructor.'],
      ['Ambiguous overloads', 'For example `Integer::toString` can be static or instance. Use a lambda.']
    ],
    interview: [
      ['What are the four kinds of method references?', ['Static (`Class::staticMethod`), bound instance (`obj::method`), unbound instance (`Class::instanceMethod`, the first argument is the receiver), and constructor (`Class::new`).']],
      ['Is a method reference always the same as a lambda?', ['Almost. The difference: a bound reference evaluates its receiver expression once at creation, while a lambda re-evaluates it on every call.']]
    ],
    say: [
      'Static, bound, unbound, constructor.',
      'Unbound: the first argument becomes the receiver.',
      'Bound receivers are evaluated once, when the reference is created.'
    ],
    checklist: [
      'Convert four lambdas into method references.',
      'Explain unbound `String::equals` as a BiFunction.',
      'Predict a bound vs lambda puzzle.',
      'Use `int[]::new` with `toArray`.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(List.of("b", "a").stream().map(String::toUpperCase).sorted().toList());
    }
}`,
          answer: '[A, B]',
          why: 'Each element is the receiver of `toUpperCase`, then the results are sorted.'
        },
        {
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("a");
        Supplier<String> s1 = sb::toString;
        sb.append("b");
        System.out.println(s1.get());
    }
}`,
          answer: 'ab',
          why: 'The reference is bound to the builder object, and reads its state when called.'
        },
        {
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        String[] holder = {"x"};
        Supplier<Integer> ref = holder[0]::length;
        Supplier<Integer> lam = () -> holder[0].length();
        holder[0] = "long";
        System.out.println(ref.get() + " " + lam.get());
    }
}`,
          answer: '1 4',
          why: 'The bound reference captured the String "x" when created. The lambda reads `holder[0]` each time it runs.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        String[] arr = List.of("p", "q").toArray(String[]::new);
        System.out.println(arr.length + arr[1]);
    }
}`,
          answer: '2q',
          why: '`String[]::new` is an IntFunction that builds an array of the right size.'
        }
      ],
      fill: [
        {
          q: 'Print each name.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List.of("ana", "bo").forEach(System.out::[[println]]);
    }
}`,
          expect: 'ana\nbo',
          why: '`System.out::println` is bound to the `System.out` object.'
        },
        {
          q: 'Parse text into a number.',
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Function<String, Integer> p = Integer::[[parseInt|valueOf]];
        System.out.println(p.apply("5") * 2);
    }
}`,
          expect: '10',
          why: 'A static method reference: `s -> Integer.parseInt(s)`.'
        }
      ],
      bug: [
        {
          q: 'Collect the word lengths.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = List.of("a", "bb");
        List<Integer> lens = words.stream().map(String::length()).toList();
        System.out.println(lens);
    }
}`,
          line: 6,
          fix: 'List<Integer> lens = words.stream().map(String::length).toList();',
          expect: '[1, 2]',
          why: 'Method references have no parentheses.'
        },
        {
          q: 'Build a StringBuilder from text.',
          code: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Supplier<StringBuilder> mk = StringBuilder::new;
        StringBuilder sb = mk.apply("hi");
        System.out.println(sb.append("!"));
    }
}`,
          line: 5,
          fix: 'Function<String, StringBuilder> mk = StringBuilder::new;',
          expect: 'hi!',
          why: 'A Supplier takes no argument. A `Function<String, StringBuilder>` selects the constructor that takes a String.'
        }
      ]
    }
  });
})();
