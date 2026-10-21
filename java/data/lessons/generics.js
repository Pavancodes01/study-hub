(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const at = (id) => ({ ref: id });
  const nil = { ref: null };

  registerLesson({
    slug: 'generics',
    track: 'core',
    title: 'Generics: bounds, wildcards and erasure',
    one: 'Generics are checked by the *compiler* and then *erased*. At run time a `List<String>` is just a `List` of Objects.',
    idea: [
      'A type parameter like `<T>` lets one class or method work with many types while the compiler still checks them. `List<String>` will not accept an Integer, and `get` returns a String without a cast.',
      'After checking, the compiler **erases** the type arguments and inserts the casts for you. The JVM never sees `<String>`. That is why you cannot write `new T()`, `instanceof List<String>` or `List<int>`.',
      '`List<Integer>` is **not** a `List<Number>`. To accept "a list of some kind of Number" you use wildcards: `? extends` to read, `? super` to write. Remember **PECS**: Producer Extends, Consumer Super.'
    ],
    stages: [
      {
        title: 'Erasure in memory',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = new ArrayList<>();
        words.add("hi");
        List<Integer> nums = new ArrayList<>();
        nums.add(7);
        System.out.println(words.getClass() == nums.getClass());
        String w = words.get(0);
        System.out.println(w.length() + nums.get(0));
    }
}`,
        steps: [
          { line: 5, text: 'An empty ArrayList. There is nothing about `String` stored in the object.', stack: [{ frame: 'main', vars: [r('words', 'l1')] }], heap: [{ id: 'l1', type: 'ArrayList', fields: [v('size', 0), v('elementData', '{} (empty)')] }], out: '' },
          { line: 6, text: 'The first add creates the backing array, an `Object[10]` (only the first slots shown).',
            heap: [{ id: 'l1', type: 'ArrayList', fields: [v('size', 1), r('elementData', 'a1')] }, { id: 'a1', type: 'Object[10]', cells: [at('s'), nil, nil, '…'] }, { id: 's', type: 'String', val: '"hi"' }] },
          { line: 8, text: 'Another ArrayList, also backed by an `Object[]`. 7 is boxed into an Integer.',
            stack: [{ frame: 'main', vars: [r('words', 'l1'), r('nums', 'l2')] }],
            heap: [{ id: 'l1', type: 'ArrayList', fields: [v('size', 1), r('elementData', 'a1')] }, { id: 'a1', type: 'Object[10]', cells: [at('s'), nil, nil, '…'] }, { id: 's', type: 'String', val: '"hi"' },
              { id: 'l2', type: 'ArrayList', fields: [v('size', 1), r('elementData', 'a2')] }, { id: 'a2', type: 'Object[10]', cells: [at('n'), nil, nil, '…'] }, { id: 'n', type: 'Integer', val: '7' }] },
          { line: 9, text: 'At run time both are just `ArrayList`. The type arguments were erased.', out: 'true\n' },
          { line: 10, text: '`get` returns `Object` at run time; the compiler inserted a hidden `(String)` cast for you.',
            stack: [{ frame: 'main', vars: [r('words', 'l1'), r('nums', 'l2'), r('w', 's')] }] },
          { line: 11, text: '2 + 7. The Integer is cast and unboxed automatically.', out: 'true\n9\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Generic classes and methods',
        text: [
          'Declare the type parameter on the class (`class Box<T>`) or just before a method\'s return type (`static <T> T first(List<T> l)`). The compiler usually infers it from the arguments.'
        ],
        code: `import java.util.*;

public class Main {
    static class Box<T> {
        private final T value;
        Box(T value) { this.value = value; }
        T get() { return value; }
        <R> Box<R> map(java.util.function.Function<T, R> f) { return new Box<>(f.apply(value)); }
    }
    static <T extends Comparable<T>> T max(List<T> list) {
        T best = list.get(0);
        for (T x : list) if (x.compareTo(best) > 0) best = x;
        return best;
    }
    public static void main(String[] args) {
        System.out.println(new Box<>("java").map(String::length).get());
        System.out.println(max(List.of(3, 9, 2)) + " " + max(List.of("pear", "apple")));
    }
}`,
        expect: '4\n9 pear'
      },
      {
        name: 'Wildcards and PECS',
        text: [
          [
            '`List<? extends Number>`: a list of some subtype of Number. You can **read** Numbers from it, but you cannot add (the compiler does not know which subtype). It **produces** values.',
            '`List<? super Integer>`: a list of Integer or a supertype. You can **add** Integers, but reads come back as `Object`. It **consumes** values.',
            '`List<?>`: any list; read as Object, add nothing but null.'
          ],
          'This is exactly the signature of `Collections.copy(List<? super T> dest, List<? extends T> src)`.'
        ],
        code: `import java.util.*;

public class Main {
    static double sum(List<? extends Number> nums) {
        double s = 0;
        for (Number n : nums) s += n.doubleValue();
        return s;
    }
    static void addOnes(List<? super Integer> sink) {
        sink.add(1);
        sink.add(1);
    }
    public static void main(String[] args) {
        List<Number> mixed = new ArrayList<>(List.of(2.5));
        addOnes(mixed);
        System.out.println(sum(mixed) + " " + sum(List.of(1, 2)));
    }
}`,
        expect: '4.5 3.0'
      },
      {
        name: 'What erasure forbids',
        text: [
          [
            '`new T()` and `new T[n]`: the type is unknown at run time.',
            '`obj instanceof List<String>`: only `List<?>` can be checked.',
            'Primitives as type arguments: use `List<Integer>`, not `List<int>`.',
            'Overloads that differ only in type arguments, like `f(List<String>)` and `f(List<Integer>)`: both erase to `f(List)`.',
            'Static fields of type `T`: one static field is shared by every parameterization.'
          ]
        ]
      }
    ],
    pitfalls: [
      ['Expecting `List<Integer>` to be a `List<Number>`', 'Generics are invariant. Use `List<? extends Number>`.'],
      ['Raw types (`List` with no `<>`)', 'They turn off type checks, and errors show up later as ClassCastException.'],
      ['Adding to a `? extends` list', 'Not allowed: the real element type is unknown.'],
      ['Trying `new T[]`', 'Use `List<T>`, or pass a `Class<T>` / `IntFunction<T[]>` to create arrays.']
    ],
    interview: [
      ['What is type erasure?', ['The compiler checks generic types, then removes them, replacing type parameters with their bounds (Object by default) and inserting casts. Generic information is not available at run time, except in some signatures read through reflection.']],
      ['Explain PECS.', ['Producer Extends, Consumer Super. If a parameter gives you values, declare it `? extends T`. If it accepts values from you, declare it `? super T`.']],
      ['Why is `List<Object>` not a supertype of `List<String>`?', ['If it were, you could add an Integer to a `List<String>` through the `List<Object>` reference, breaking type safety. Arrays allow this and fail at run time with ArrayStoreException; generics prevent it at compile time.']]
    ],
    say: [
      'Generics are compile-time only; they are erased at run time.',
      'Generics are invariant: `List<Integer>` is not a `List<Number>`.',
      'PECS: producer extends, consumer super.'
    ],
    checklist: [
      'Write a generic method with a bound.',
      'Choose `extends` or `super` for a parameter.',
      'List three things erasure forbids.',
      'Explain why raw types are dangerous.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        List raw = new ArrayList<String>();
        raw.add(5);
        List<String> strs = raw;
        try {
            String s = strs.get(0);
        } catch (ClassCastException e) {
            System.out.println("CCE");
        }
        System.out.println(strs.size());
    }
}`,
          answer: 'CCE\n1',
          why: 'The raw type skipped the compile-time check, so an Integer got in. The hidden `(String)` cast fails only when you read it.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> ints = new ArrayList<>();
        List<? super Integer> sink = ints;
        sink.add(4);
        Object o = sink.get(0);
        System.out.println(o + " " + ints);
    }
}`,
          answer: '4 [4]',
          why: 'A `? super Integer` list accepts Integers; reading gives Object. Both variables share one list.'
        },
        {
          code: `import java.util.*;

public class Main {
    static <T> T pick(T a, T b, boolean first) { return first ? a : b; }
    public static void main(String[] args) {
        Object x = pick("s", 1, false);
        System.out.println(x + " " + x.getClass().getSimpleName());
    }
}`,
          answer: '1 Integer',
          why: 'T is inferred as a common supertype of String and Integer. The object returned is still the Integer.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Object[] arr = new String[1];
        try {
            arr[0] = 1;
        } catch (ArrayStoreException e) {
            System.out.println("ASE");
        }
    }
}`,
          answer: 'ASE',
          why: 'Arrays are covariant (a String[] is an Object[]), so the check happens at run time. Generics block the same mistake at compile time.'
        }
      ],
      fill: [
        {
          q: 'Write a generic method.',
          code: `import java.util.*;

public class Main {
    static [[<T>]] T last(List<T> l) {
        return l.get(l.size() - 1);
    }
    public static void main(String[] args) {
        String s = last(List.of("a", "b"));
        System.out.println(s);
    }
}`,
          expect: 'b',
          why: 'The type parameter is declared before the return type.'
        },
        {
          q: 'Copy from a producer into a consumer.',
          code: `import java.util.*;

public class Main {
    static <T> void copy(List<? [[extends]] T> src, List<? [[super]] T> dst) {
        for (T x : src) dst.add(x);
    }
    public static void main(String[] args) {
        List<Object> out = new ArrayList<>();
        copy(List.of(1, 2), out);
        System.out.println(out);
    }
}`,
          expect: '[1, 2]',
          why: 'PECS: the source produces T (extends), the destination consumes T (super).'
        }
      ],
      bug: [
        {
          q: 'Should accept a list of Integers.',
          code: `import java.util.*;

public class Main {
    static double total(List<Number> nums) {
        double t = 0;
        for (Number n : nums) t += n.doubleValue();
        return t;
    }
    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2);
        System.out.println(total(ints));
    }
}`,
          line: 4,
          fix: 'static double total(List<? extends Number> nums) {',
          expect: '3.0',
          why: '`List<Integer>` is not a `List<Number>`. A `? extends Number` parameter accepts both.'
        },
        {
          q: 'Make the type check compile.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Object obj = List.of("a", "b");
        if (obj instanceof List<String>) {
            System.out.println("list");
        }
    }
}`,
          line: 6,
          fix: 'if (obj instanceof List<?>) {',
          expect: 'list',
          why: 'Because of erasure, the run time cannot check `<String>`. Only the wildcard form is allowed.'
        }
      ]
    }
  });
})();
