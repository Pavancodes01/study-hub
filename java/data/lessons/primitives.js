(function () {
  const v = (name, value) => ({ name, value });
  const f = (vars) => [{ frame: 'main', vars }];

  registerLesson({
    slug: 'primitives',
    track: 'basics',
    title: 'Variables and primitive types',
    one: 'A primitive variable *is* its value. It lives right inside the stack frame, with no object and no arrow.',
    idea: [
      'Java has eight primitive types: `byte`, `short`, `int`, `long`, `float`, `double`, `char` and `boolean`. A variable of one of these types stores the value itself, inside the stack frame of the running method.',
      'Copying a primitive (`b = a`) copies the bits. The two variables have nothing to do with each other afterwards.',
      'Each type has a fixed size, so values can **overflow** silently, and `float`/`double` cannot store most decimals exactly. These two facts are behind most primitive-type interview questions.'
    ],
    stages: [
      {
        title: 'Copies, overflow, char maths',
        code: `public class Main {
    public static void main(String[] args) {
        int a = 7;
        int b = a;
        b = b + 1;
        long big = 3_000_000_000L;
        int max = Integer.MAX_VALUE;
        int over = max + 1;
        char c = 'A';
        int code = c + 2;
        System.out.println(a + " " + b);
        System.out.println(over);
        System.out.println(code + " " + (char) code);
    }
}`,
        steps: [
          { line: 3, text: '`a` is a slot in the `main` frame holding 7. Nothing is created on the heap.', stack: f([v('a', 7)]), heap: [], out: '' },
          { line: 4, text: '`b = a` copies the value 7 into a second slot.', stack: f([v('a', 7), v('b', 7)]) },
          { line: 5, text: 'Changing `b` does not touch `a`. They are separate boxes.', stack: f([v('a', 7), v('b', 8)]) },
          { line: 6, text: '3 billion does not fit in an `int` (max about 2.1 billion), so it needs a `long` and the `L` suffix.', stack: f([v('a', 7), v('b', 8), v('big', '3000000000')]) },
          { line: 7, text: '`Integer.MAX_VALUE` is 2³¹ − 1.', stack: f([v('a', 7), v('b', 8), v('big', '3000000000'), v('max', 2147483647)]) },
          { line: 8, text: 'Adding 1 **overflows**: the value wraps around to the most negative int. No error is thrown.', stack: f([v('a', 7), v('b', 8), v('big', '3000000000'), v('max', 2147483647), v('over', -2147483648)]) },
          { line: 9, text: 'A `char` is a 16-bit number (a UTF-16 code unit). `\'A\'` is 65.', stack: f([v('a', 7), v('b', 8), v('big', '3000000000'), v('max', 2147483647), v('over', -2147483648), v('c', "'A'")]) },
          { line: 10, text: '`c + 2` promotes the char to `int`, giving 67.', stack: f([v('a', 7), v('b', 8), v('big', '3000000000'), v('max', 2147483647), v('over', -2147483648), v('c', "'A'"), v('code', 67)]) },
          { line: 11, text: '`a` is still 7.', out: '7 8\n' },
          { line: 12, text: 'The overflowed value.', out: '7 8\n-2147483648\n' },
          { line: 13, text: 'Casting 67 back to `char` gives `C`.', out: '7 8\n-2147483648\n67 C\n' }
        ]
      },
      {
        title: 'Doubles are not exact',
        code: `public class Main {
    public static void main(String[] args) {
        double x = 0.1 + 0.2;
        System.out.println(x);
        System.out.println(x == 0.3);
        System.out.println(Math.abs(x - 0.3) < 1e-9);
    }
}`,
        steps: [
          { line: 3, text: '0.1 and 0.2 have no exact binary form, so each is stored as the nearest double. Their sum is slightly above 0.3.', stack: f([v('x', '0.30000000000000004')]), heap: [], out: '' },
          { line: 4, text: 'Printing shows the tiny error.', out: '0.30000000000000004\n' },
          { line: 5, text: 'So `==` against 0.3 is false.', out: '0.30000000000000004\nfalse\n' },
          { line: 6, text: 'Compare doubles with a small tolerance instead. For money, use `long` cents or `BigDecimal`.', out: '0.30000000000000004\nfalse\ntrue\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The eight primitives',
        text: [
          'Use `int` for whole numbers, `long` when values can pass about 2 billion (timestamps, money in cents, large sums), `double` for measurements, `boolean` for flags and `char` for single characters. `byte`, `short` and `float` are mostly for saving memory in large arrays.',
          'Fields and array elements get a default value (0, `false`, `\'\\u0000\'`). **Local variables do not**: using one before assigning it is a compile error.'
        ]
      },
      {
        name: 'Literals and widening',
        text: [
          [
            'Whole-number literals are `int` by default. Add `L` for `long`: `10_000_000_000L`.',
            'Decimal literals are `double`. Add `f` for `float`: `1.5f`.',
            'Underscores are allowed for readability: `1_000_000`.',
            'Smaller types widen to larger ones automatically (`int` to `long` to `double`). Going the other way needs a cast and may lose data.'
          ]
        ],
        code: `public class Main {
    public static void main(String[] args) {
        long wrong = 1_000_000 * 1_000_000;    // int maths overflows first
        long right = 1_000_000L * 1_000_000;   // long maths
        System.out.println(wrong);
        System.out.println(right);
    }
}`,
        expect: '-727379968\n1000000000000'
      },
      {
        name: 'Overflow is silent',
        text: [
          'Integer arithmetic wraps around without an error. If overflow matters (sums of large values, `mid = (lo + hi) / 2` on huge indexes), use `long` or `Math.addExact`, which throws `ArithmeticException` instead of wrapping.'
        ],
        code: `public class Main {
    public static void main(String[] args) {
        int lo = 2_000_000_000, hi = 2_100_000_000;
        System.out.println((lo + hi) / 2);         // overflowed
        System.out.println(lo + (hi - lo) / 2);    // safe
    }
}`,
        expect: '-97483648\n2050000000'
      }
    ],
    table: {
      head: ['Type', 'Size', 'Range / note', 'Default (fields)'],
      rows: [
        ['`byte`', '8 bit', '−128 to 127', '0'],
        ['`short`', '16 bit', '−32,768 to 32,767', '0'],
        ['`int`', '32 bit', 'about ±2.1 billion', '0'],
        ['`long`', '64 bit', 'about ±9.2 × 10¹⁸', '0L'],
        ['`float`', '32 bit', '~7 decimal digits', '0.0f'],
        ['`double`', '64 bit', '~15–16 decimal digits', '0.0'],
        ['`char`', '16 bit', '0 to 65,535 (UTF-16 unit)', "'\\u0000'"],
        ['`boolean`', 'JVM-dependent', '`true` / `false`', '`false`']
      ]
    },
    pitfalls: [
      ['`long x = a * b` with two ints', 'The multiply happens in `int` and overflows before it is widened. Make one operand `long`.'],
      ['Comparing doubles with `==`', 'Use a tolerance, or `BigDecimal` for money.'],
      ['Using a local variable before assigning it', 'Compile error: locals have no default value.'],
      ['`(lo + hi) / 2` on large ints', 'Can overflow. Use `lo + (hi - lo) / 2`.']
    ],
    interview: [
      ['Where are primitives stored?', ['A primitive local variable is stored in the stack frame of its method. A primitive field is stored inside its object on the heap. A primitive element is stored inside the array object, also on the heap.']],
      ['What happens on `Integer.MAX_VALUE + 1`?', ['It wraps to `Integer.MIN_VALUE` without an error. Use `Math.addExact` to get an exception instead.']],
      ['Why is `0.1 + 0.2 != 0.3`?', ['Doubles are binary fractions. 0.1 and 0.2 cannot be stored exactly, and the rounding errors add up. Compare with a tolerance or use `BigDecimal`.']],
      ['What is the size of a `boolean`?', ['The language does not define it. The JVM typically uses an int for a single local and a byte per element in a `boolean[]`.']]
    ],
    say: [
      'Primitives hold the value itself; copying one copies the value.',
      'Integer overflow wraps silently.',
      'Floating point is approximate: never use `==` and never use `double` for money.'
    ],
    checklist: [
      'List the eight primitive types and their sizes.',
      'Explain why `long x = 1_000_000 * 1_000_000;` is wrong.',
      'Write an overflow-safe midpoint.',
      'Compare two doubles safely.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        byte b = (byte) 130;
        System.out.println(b);
    }
}`,
          answer: '-126',
          why: 'A byte holds −128 to 127. 130 − 256 = −126: the cast keeps the low 8 bits.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        char c = 'a';
        c += 1;
        System.out.println(c);
        System.out.println('a' + 1);
    }
}`,
          answer: 'b\n98',
          why: '`c += 1` keeps the type `char`. In `\'a\' + 1` the char is promoted to `int`, so 97 + 1 prints as a number.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        long l = Integer.MAX_VALUE + 1;
        System.out.println(l);
    }
}`,
          answer: '-2147483648',
          why: 'The addition is done in `int` and overflows first. Only then is the result widened to `long`.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        float f = 1.1f;
        double d = 1.1;
        System.out.println(f == d);
        System.out.println(0.5f == 0.5);
    }
}`,
          answer: 'false\ntrue',
          why: '1.1 is rounded differently in 32 and 64 bits. 0.5 is an exact binary fraction, so both types store it exactly.'
        }
      ],
      fill: [
        {
          q: 'Compute milliseconds in a year without overflow.',
          code: `public class Main {
    public static void main(String[] args) {
        long yearMs = 365[[L|l]] * 24 * 60 * 60 * 1000;
        System.out.println(yearMs);
    }
}`,
          expect: '31536000000',
          why: 'Making the first operand `long` makes the whole chain `long`, so nothing overflows.'
        },
        {
          q: 'Compare two doubles safely.',
          code: `public class Main {
    public static void main(String[] args) {
        double a = 0.1 * 3, b = 0.3;
        boolean same = Math.[[abs]](a - b) < [[1e-9|1e-6|0.000001|1e-12]];
        System.out.println(same);
    }
}`,
          expect: 'true',
          why: 'Two doubles are "equal" when their difference is smaller than a tolerance you choose.'
        }
      ],
      bug: [
        {
          q: 'Should print 4000000000.',
          code: `public class Main {
    public static void main(String[] args) {
        int a = 2_000_000_000, b = 2_000_000_000;
        long total = a + b;
        System.out.println(total);
    }
}`,
          line: 4,
          fix: 'long total = (long) a + b;',
          expect: '4000000000',
          why: '`a + b` is computed as an `int` and overflows before being stored in the `long`.'
        },
        {
          q: 'Should print "match".',
          code: `public class Main {
    public static void main(String[] args) {
        double price = 0.1 + 0.2;
        if (price == 0.3) {
            System.out.println("match");
        } else {
            System.out.println("no");
        }
    }
}`,
          line: 4,
          fix: 'if (Math.abs(price - 0.3) < 1e-9) {',
          expect: 'match',
          why: '`0.1 + 0.2` is 0.30000000000000004, so `==` fails. Compare with a tolerance.'
        }
      ]
    }
  });
})();
