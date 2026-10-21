(function () {
  const v = (name, value) => ({ name, value });
  const f = (vars) => [{ frame: 'main', vars }];
  const st = (n) => ({ id: 'st', type: 'Main · static fields', fields: [v('calls', n)] });

  registerLesson({
    slug: 'operators',
    track: 'basics',
    title: 'Operators and casting',
    one: 'Most operator puzzles come down to three rules: *integer division truncates*, `i++` returns the old value, and `&&` can skip its right side.',
    idea: [
      'Java evaluates expressions left to right, following precedence. The type of the result depends on the operands: `int / int` is an `int`, so `7 / 2` is 3.',
      '`i++` uses the current value and then adds one; `++i` adds one first. Compound assignments like `+=` include a hidden cast back to the left-hand type.',
      '`&&` and `||` stop as soon as the answer is known (short-circuit). `&` and `|` on booleans always evaluate both sides.'
    ],
    stages: [
      {
        title: 'Increment, division, hidden cast',
        code: `public class Main {
    public static void main(String[] args) {
        int i = 5;
        int a = i++;
        int b = ++i;
        int q = 7 / 2;
        int r = -7 % 3;
        double d = (double) 7 / 2;
        byte s = 10;
        s += 300;
        System.out.println(a + " " + b + " " + i);
        System.out.println(q + " " + r + " " + d);
        System.out.println(s);
    }
}`,
        steps: [
          { line: 3, text: '`i` starts at 5.', stack: f([v('i', 5)]), heap: [], out: '' },
          { line: 4, text: '`i++` hands back the **old** value (5) and then bumps `i` to 6.', stack: f([v('i', 6), v('a', 5)]) },
          { line: 5, text: '`++i` bumps first (to 7) and hands back the **new** value.', stack: f([v('i', 7), v('a', 5), v('b', 7)]) },
          { line: 6, text: 'Both sides are `int`, so the division drops the fraction: 3.', stack: f([v('i', 7), v('a', 5), v('b', 7), v('q', 3)]) },
          { line: 7, text: 'The remainder takes the sign of the left side: `-7 % 3` is −1, not 2.', stack: f([v('i', 7), v('a', 5), v('b', 7), v('q', 3), v('r', -1)]) },
          { line: 8, text: 'The cast applies to 7 first, so this is `7.0 / 2` = 3.5.', stack: f([v('i', 7), v('a', 5), v('b', 7), v('q', 3), v('r', -1), v('d', 3.5)]) },
          { line: 9, text: 'A `byte` holding 10.', stack: f([v('i', 7), v('a', 5), v('b', 7), v('q', 3), v('r', -1), v('d', 3.5), v('s', 10)]) },
          { line: 10, text: '`s += 300` means `s = (byte)(s + 300)`. 310 does not fit, so it wraps to 310 − 256 = 54. Writing `s = s + 300` would not compile.', stack: f([v('i', 7), v('a', 5), v('b', 7), v('q', 3), v('r', -1), v('d', 3.5), v('s', 54)]) },
          { line: 11, text: 'a = 5, b = 7, i = 7.', out: '5 7 7\n' },
          { line: 12, text: 'q = 3, r = −1, d = 3.5.', out: '5 7 7\n3 -1 3.5\n' },
          { line: 13, text: 'The wrapped byte.', out: '5 7 7\n3 -1 3.5\n54\n' }
        ]
      },
      {
        title: 'Short-circuit',
        code: `public class Main {
    static int calls = 0;
    static boolean check(boolean v) {
        calls++;
        return v;
    }
    public static void main(String[] args) {
        boolean x = check(false) && check(true);
        boolean y = check(false) & check(true);
        boolean z = check(true) || check(true);
        System.out.println(x + " " + y + " " + z + " " + calls);
    }
}`,
        steps: [
          { line: 8, text: 'The static field `calls` belongs to the class, not to a frame. `main` starts evaluating `x`.', stack: f([]), heap: [st(0)], out: '' },
          { line: 4, text: 'The left side `check(false)` runs: a new frame, and `calls` becomes 1.', stack: [{ frame: 'main', vars: [] }, { frame: 'check', vars: [v('v', false)] }], heap: [st(1)] },
          { line: 8, text: 'Left side is false, so `&&` already knows the answer. `check(true)` is **never called**.', stack: f([v('x', false)]) },
          { line: 9, text: 'Single `&` always runs both sides. Two more calls: `calls` is 3.', stack: f([v('x', false), v('y', false)]), heap: [st(3)] },
          { line: 10, text: '`||` with a true left side stops right away. One call: `calls` is 4.', stack: f([v('x', false), v('y', false), v('z', true)]), heap: [st(4)] },
          { line: 11, text: 'Only 4 calls, not 6.', out: 'false false true 4\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Arithmetic and promotion',
        text: [
          [
            'Before any arithmetic, `byte`, `short` and `char` are promoted to `int`.',
            'If either operand is `long`, `float` or `double`, the other is widened to match.',
            '`int / int` truncates toward zero: `-7 / 2` is −3.',
            '`%` keeps the sign of the left operand. For a non-negative index use `Math.floorMod(x, n)`.'
          ]
        ]
      },
      {
        name: 'String concatenation is left to right',
        text: [
          '`+` adds numbers until it meets a String; from then on it concatenates.'
        ],
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println(1 + 2 + "3");   // 33
        System.out.println("1" + 2 + 3);   // 123
        System.out.println("1" + (2 + 3)); // 15
    }
}`,
        expect: '33\n123\n15'
      },
      {
        name: 'Casting',
        text: [
          [
            '**Widening** (`int` to `long`, `long` to `double`) is automatic and safe, except that `long` to `double` can lose precision above 2⁵³.',
            '**Narrowing** (`double` to `int`, `int` to `byte`) needs an explicit cast. Doubles are truncated toward zero; integers keep only the low bits.',
            'Use `Math.round`, `Math.floor` or `Math.ceil` when you want rounding instead of truncation.'
          ]
        ],
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println((int) 3.99);        // 3
        System.out.println((int) -3.99);       // -3
        System.out.println(Math.round(3.5));   // 4
        System.out.println((int) 'z');         // 122
    }
}`,
        expect: '3\n-3\n4\n122'
      },
      {
        name: 'Bit operators in one breath',
        text: [
          '`&` and, `|` or, `^` xor, `~` not, `<<` shift left, `>>` shift right keeping the sign, `>>>` shift right filling with zeros. `x & 1` tests odd, `x >> 1` halves, `1 << k` is 2ᵏ.'
        ]
      }
    ],
    table: {
      head: ['Expression', 'Result', 'Why'],
      rows: [
        ['`7 / 2`', '3', 'int division'],
        ['`7 / 2.0`', '3.5', 'one double makes it double'],
        ['`-7 % 3`', '−1', 'sign of left side'],
        ['`(double)(7 / 2)`', '3.0', 'division happened first'],
        ['`1 + 2 + "3"`', '"33"', 'adds, then concatenates'],
        ['`(int) 3.99`', '3', 'truncates']
      ]
    },
    pitfalls: [
      ['`double avg = sum / count;` with ints', 'Integer division happens before the assignment. Cast one side: `(double) sum / count`.'],
      ['`(double)(a / b)`', 'The cast comes too late. Cast an operand, not the result.'],
      ['Using `&` instead of `&&`', 'Both sides run, so `s != null & s.isEmpty()` throws NullPointerException.'],
      ['Negative modulo as an index', '`-1 % 5` is −1. Use `Math.floorMod`.']
    ],
    interview: [
      ['Difference between `i++` and `++i`?', ['Both add one to `i`. As an expression, `i++` evaluates to the old value and `++i` to the new value. As a statement on its own line they behave the same.']],
      ['Why does `short s = 1; s = s + 1;` not compile but `s += 1;` does?', ['`s + 1` is promoted to `int`, and assigning an int to a short needs a cast. Compound assignment includes that cast automatically.']],
      ['What is short-circuit evaluation?', ['`&&` skips the right operand if the left is false; `||` skips it if the left is true. It is commonly used for null checks: `s != null && s.length() > 0`.']],
      ['`>>` vs `>>>`?', ['`>>` is an arithmetic shift that copies the sign bit, so negative numbers stay negative. `>>>` fills with zeros, so the result is always non-negative for int.']]
    ],
    say: [
      'Integer division truncates; cast an operand, not the result.',
      'Compound assignment casts back to the left-hand type.',
      '`&&` and `||` short-circuit; `&` and `|` do not.'
    ],
    checklist: [
      'Predict `x = x++ + ++x`.',
      'Explain why `s += 300` compiles for a byte.',
      'Write a null-safe condition with `&&`.',
      'Get a non-negative remainder with `Math.floorMod`.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        int x = 10;
        x = x++ + ++x;
        System.out.println(x);
    }
}`,
          answer: '22',
          why: '`x++` gives 10 (x becomes 11). `++x` makes x 12 and gives 12. 10 + 12 = 22 is then assigned to x.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        System.out.println(1 + 2 + "3" + 4 + 5);
    }
}`,
          answer: '3345',
          why: '1 + 2 = 3, then "3" + "3" = "33", and everything after a String is concatenated.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        System.out.println(5 / 2 * 2.0);
        System.out.println(5 / 2.0 * 2);
    }
}`,
          answer: '4.0\n5.0',
          why: 'In the first line `5 / 2` is int division (2) before the double appears. In the second the double comes first.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        int x = 0b1010;
        System.out.println(x >> 1);
        System.out.println(x ^ 3);
        System.out.println(-8 >>> 28);
    }
}`,
          answer: '5\n9\n15',
          why: '1010 shifted right is 101 (5). 1010 xor 0011 is 1001 (9). −8 is 0xFFFFFFF8; shifting in zeros 28 places leaves 0xF.'
        }
      ],
      fill: [
        {
          q: 'Print "odd" or "even" with one expression.',
          code: `public class Main {
    public static void main(String[] args) {
        int n = 7;
        String parity = n % 2 == 0 [[?]] "even" [[:]] "odd";
        System.out.println(parity);
    }
}`,
          expect: 'odd',
          why: 'The ternary `cond ? a : b` is an expression, so it can be assigned directly.'
        },
        {
          q: 'Get the real average.',
          code: `public class Main {
    public static void main(String[] args) {
        int sum = 7, count = 2;
        double avg = [[(double)]] sum / count;
        System.out.println(avg);
    }
}`,
          expect: '3.5',
          why: 'Casting `sum` before the division makes it double division.'
        }
      ],
      bug: [
        {
          q: 'Print "empty" for a null string without crashing.',
          code: `public class Main {
    public static void main(String[] args) {
        String s = null;
        if (s != null & s.length() > 0) {
            System.out.println("has text");
        } else {
            System.out.println("empty");
        }
    }
}`,
          line: 4,
          fix: 'if (s != null && s.length() > 0) {',
          expect: 'empty',
          why: 'Single `&` evaluates both sides, so `s.length()` runs on null. `&&` stops after the false null check.'
        },
        {
          q: 'Print "not five".',
          code: `public class Main {
    public static void main(String[] args) {
        int x = 3;
        if (x = 5) {
            System.out.println("five");
        } else {
            System.out.println("not five");
        }
    }
}`,
          line: 4,
          fix: 'if (x == 5) {',
          expect: 'not five',
          why: '`=` is assignment. An `int` is not a boolean, so this does not even compile. Use `==` to compare.'
        }
      ]
    }
  });
})();
