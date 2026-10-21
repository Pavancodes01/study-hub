(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const I = (id, n, cached) => ({ id, type: cached ? 'Integer (cache)' : 'Integer', val: String(n), pool: !!cached });

  registerLesson({
    slug: 'wrappers',
    track: 'core',
    title: 'Wrapper classes, autoboxing and the Integer cache',
    one: '`Integer` is an *object*. Small values (−128 to 127) are shared from a cache, so `==` works for them and silently fails for bigger ones.',
    idea: [
      'Collections and generics only hold objects, so each primitive has a wrapper class: `Integer`, `Long`, `Double`, `Boolean`, `Character` and so on. Java converts automatically: **boxing** (int to Integer) and **unboxing** (Integer to int).',
      'Boxing calls `Integer.valueOf`, which returns a cached object for −128 to 127 and a new object otherwise. That is why `==` between two Integers is true for 127 and false for 128.',
      'Unboxing a `null` wrapper throws `NullPointerException`. This often hides in `map.get(key)` returning null.'
    ],
    stages: [
      {
        title: 'The cache and ==',
        code: `public class Main {
    public static void main(String[] args) {
        Integer a = 127, b = 127;
        Integer c = 128, d = 128;
        System.out.println(a == b);
        System.out.println(c == d);
        System.out.println(c.equals(d));
        int sum = c + d;
        System.out.println(sum);
    }
}`,
        steps: [
          { line: 3, text: 'Boxing 127 calls `Integer.valueOf(127)`, which hands out the shared cached object. Both variables point at it.',
            stack: [{ frame: 'main', vars: [r('a', 'k'), r('b', 'k')] }], heap: [I('k', 127, true)], out: '' },
          { line: 4, text: '128 is outside the cache, so each boxing creates a **new** Integer.',
            stack: [{ frame: 'main', vars: [r('a', 'k'), r('b', 'k'), r('c', 'i1'), r('d', 'i2')] }], heap: [I('k', 127, true), I('i1', 128), I('i2', 128)] },
          { line: 5, text: 'Same object: true.', out: 'true\n' },
          { line: 6, text: 'Two objects: false, even though both hold 128.', out: 'true\nfalse\n' },
          { line: 7, text: '`equals` compares the values: true.', out: 'true\nfalse\ntrue\n' },
          { line: 8, text: 'Arithmetic unboxes both to `int`. `sum` is a plain primitive in the frame.',
            stack: [{ frame: 'main', vars: [r('a', 'k'), r('b', 'k'), r('c', 'i1'), r('d', 'i2'), v('sum', 256)] }] },
          { line: 9, text: 'The primitive result.', out: 'true\nfalse\ntrue\n256\n' }
        ]
      },
      {
        title: 'Unboxing null',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> stock = new HashMap<>();
        stock.put("tea", 3);
        Integer jam = stock.get("jam");
        System.out.println(jam);
        try {
            int n = jam;
        } catch (NullPointerException e) {
            System.out.println("NPE");
        }
    }
}`,
        steps: [
          { line: 5, text: 'A map from names to counts.', stack: [{ frame: 'main', vars: [r('stock', 'm')] }], heap: [{ id: 'm', type: 'HashMap', fields: [] }], out: '' },
          { line: 6, text: '3 is boxed (from the cache) and stored.', heap: [{ id: 'm', type: 'HashMap', fields: [r('"tea"', 'k3')] }, I('k3', 3, true)] },
          { line: 7, text: 'No "jam" key, so `get` returns `null`. An `Integer` variable can hold null.', stack: [{ frame: 'main', vars: [r('stock', 'm'), r('jam', null)] }] },
          { line: 8, text: 'Printing null is fine.', out: 'null\n' },
          { line: 10, text: '`int n = jam` really is `jam.intValue()`. Calling a method on null throws.', out: 'null\nNPE\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Boxing is a method call',
        text: [
          [
            '`Integer x = 5;` compiles to `Integer x = Integer.valueOf(5);`',
            '`int y = x;` compiles to `int y = x.intValue();`',
            '`Byte`, `Short`, `Integer`, `Long` and `Character` (0 to 127) cache small values. `Float` and `Double` never cache.',
            'The Integer cache upper bound can be raised with `-XX:AutoBoxCacheMax`, which is one more reason never to rely on `==`.'
          ]
        ]
      },
      {
        name: 'Useful wrapper methods',
        text: [],
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println(Integer.parseInt("42") + 1);      // String -> int
        System.out.println(Integer.valueOf("7"));             // String -> Integer
        System.out.println(Integer.toBinaryString(10));       // 1010
        System.out.println(Integer.compare(3, 9));            // -1
        System.out.println(Character.isDigit('7') + " " + Character.toUpperCase('q'));
        System.out.println(Integer.MAX_VALUE + " " + Long.MIN_VALUE);
    }
}`,
        expect: '43\n7\n1010\n-1\ntrue Q\n2147483647 -9223372036854775808'
      },
      {
        name: 'The cost of boxing',
        text: [
          'Each boxed value is an object (16 bytes or so instead of 4), and every boxing outside the cache allocates. In hot loops, `Long sum = 0L; sum += i;` creates millions of objects. Use primitives for arithmetic, and primitive streams (`IntStream`) for numeric pipelines.'
        ]
      }
    ],
    table: {
      head: ['Expression', 'Result', 'Why'],
      rows: [
        ['`Integer a = 127, b = 127; a == b`', 'true', 'cached object'],
        ['`Integer a = 128, b = 128; a == b`', 'false', 'two objects'],
        ['`Integer a = 128; int b = 128; a == b`', 'true', '`a` is unboxed'],
        ['`Long.valueOf(1).equals(1)`', 'false', '`1` boxes to Integer, a different class'],
        ['`int n = (Integer) null`', 'NullPointerException', 'unboxing null']
      ]
    },
    pitfalls: [
      ['Comparing wrappers with `==`', 'Works up to 127, fails after. Use `equals` or unbox.'],
      ['Unboxing a missing map value', '`int n = map.get(k)` throws when the key is missing. Use `getOrDefault`.'],
      ['`list.remove(1)` on a `List<Integer>`', 'Removes the element at index 1. Use `list.remove(Integer.valueOf(1))` to remove the value 1.'],
      ['`Long` vs `Integer` equals', '`Long.equals(Integer)` is always false, even for the same number.']
    ],
    interview: [
      ['What is autoboxing?', ['The compiler automatically converts between primitives and their wrappers: `valueOf` when a primitive is used where an object is needed, `xxxValue()` when an object is used where a primitive is needed.']],
      ['Why is `Integer 127 == 127` true but `128 == 128` false?', ['`Integer.valueOf` caches −128 to 127. Values in that range share one object; values outside get new objects, so reference comparison fails.']],
      ['Where can autoboxing throw NullPointerException?', ['Wherever a null wrapper is unboxed: assigning to a primitive, arithmetic, comparisons with `<`, and a ternary that mixes a primitive and a null wrapper.']]
    ],
    say: [
      'Boxing calls `valueOf`; −128 to 127 are cached.',
      'Compare wrappers with `equals`, never `==`.',
      'Unboxing null throws NullPointerException.'
    ],
    checklist: [
      'Explain the Integer cache.',
      'Spot the NPE in `int n = map.get(k)`.',
      'Remove the value 1 (not index 1) from a `List<Integer>`.',
      'Say why boxing in a loop is slow.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        Integer x = 1000;
        int y = 1000;
        System.out.println(x == y);
    }
}`,
          answer: 'true',
          why: 'One side is a primitive, so `x` is unboxed and two ints are compared.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Long n = 10L;
        System.out.println(n.equals(10));
        System.out.println(n.equals(10L));
    }
}`,
          answer: 'false\ntrue',
          why: '`10` boxes to an Integer, and `Long.equals` requires a Long.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        list.remove(1);
        System.out.println(list);
        list.remove(Integer.valueOf(1));
        System.out.println(list);
    }
}`,
          answer: '[1, 3]\n[3]',
          why: '`remove(int)` removes by index. `remove(Object)` removes by value.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Integer i = null;
        boolean flag = false;
        try {
            Integer r = flag ? 1 : i;
            System.out.println(r);
        } catch (NullPointerException e) {
            System.out.println("NPE");
        }
    }
}`,
          answer: 'NPE',
          why: 'Because one branch is the primitive `1`, the ternary has type `int`, so `i` is unboxed, which throws.'
        }
      ],
      fill: [
        {
          q: 'Turn text into a number.',
          code: `public class Main {
    public static void main(String[] args) {
        int n = Integer.[[parseInt]]("42");
        System.out.println(n + 1);
    }
}`,
          expect: '43',
          why: '`parseInt` returns a primitive `int`; `valueOf` returns an `Integer`.'
        },
        {
          q: 'Compare two boxed values correctly.',
          code: `public class Main {
    public static void main(String[] args) {
        Integer a = 500, b = 500;
        System.out.println(a.[[equals]](b));
    }
}`,
          expect: 'true',
          why: '500 is outside the cache, so `==` would be false.'
        }
      ],
      bug: [
        {
          q: 'Should print "same".',
          code: `public class Main {
    public static void main(String[] args) {
        Integer a = 1000, b = 1000;
        if (a == b) {
            System.out.println("same");
        } else {
            System.out.println("different");
        }
    }
}`,
          line: 4,
          fix: 'if (a.equals(b)) {',
          expect: 'same',
          why: '1000 is not cached, so the two Integers are different objects.'
        },
        {
          q: 'A missing key should count as 0.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> counts = new HashMap<>();
        int count = counts.get("x");
        System.out.println(count);
    }
}`,
          line: 6,
          fix: 'int count = counts.getOrDefault("x", 0);',
          expect: '0',
          why: '`get` returns null and unboxing null throws.'
        }
      ]
    }
  });
})();
