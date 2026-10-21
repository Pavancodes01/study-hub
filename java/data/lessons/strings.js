(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const pool = (id, s) => ({ id, type: 'String', val: '"' + s + '"', pool: true });
  const str = (id, s) => ({ id, type: 'String', val: '"' + s + '"' });

  registerLesson({
    slug: 'strings',
    track: 'basics',
    title: 'Strings, the String pool and == vs equals',
    one: '`==` asks *"same object?"*. `equals` asks *"same text?"*. For Strings you almost always want `equals`.',
    idea: [
      'A `String` is an immutable object on the heap. String literals written in your code, like `"hi"`, are stored once in a shared area called the **String pool**, so two identical literals point at the same object.',
      '`new String("hi")` always makes a fresh object outside the pool. It has the same text but is a different object, so `==` is false while `equals` is true.',
      'Because pooling depends on how a string was made, `==` on Strings gives answers that look random. Use `equals` for text and keep `==` for checking identity.'
    ],
    stages: [
      {
        title: 'Literals, new and intern',
        code: `public class Main {
    public static void main(String[] args) {
        String a = "hi";
        String b = "hi";
        String c = new String("hi");
        String d = c.intern();
        System.out.println(a == b);
        System.out.println(a == c);
        System.out.println(a.equals(c));
        System.out.println(a == d);
    }
}`,
        steps: [
          { line: 3, text: 'The literal `"hi"` lives in the String pool. `a` points at that pooled object.',
            stack: [{ frame: 'main', vars: [r('a', 'p1')] }], heap: [pool('p1', 'hi')], out: '' },
          { line: 4, text: 'The same literal again. Java reuses the pooled object, so `b` points at the **same** String as `a`.',
            stack: [{ frame: 'main', vars: [r('a', 'p1'), r('b', 'p1')] }] },
          { line: 5, text: '`new` always creates a new object, outside the pool. Same text, different object.',
            stack: [{ frame: 'main', vars: [r('a', 'p1'), r('b', 'p1'), r('c', 's1')] }], heap: [pool('p1', 'hi'), str('s1', 'hi')] },
          { line: 6, text: '`intern()` looks up the pool and returns the pooled String with the same text. `d` points at the pool copy.',
            stack: [{ frame: 'main', vars: [r('a', 'p1'), r('b', 'p1'), r('c', 's1'), r('d', 'p1')] }] },
          { line: 7, text: '`a == b` compares the two arrows. Both point at the pooled object: **true**.', out: 'true\n' },
          { line: 8, text: '`a == c`: different objects, so **false**, even though the text matches.', out: 'true\nfalse\n' },
          { line: 9, text: '`equals` compares the characters: **true**.', out: 'true\nfalse\ntrue\n' },
          { line: 10, text: '`d` came from the pool, so `a == d` is **true**.', out: 'true\nfalse\ntrue\ntrue\n' }
        ]
      },
      {
        title: 'Built at runtime vs constant',
        code: `public class Main {
    public static void main(String[] args) {
        String s = "ja";
        String t = s + "va";
        String u = "java";
        System.out.println(t == u);
        System.out.println(t.equals(u));
        final String f = "ja";
        System.out.println((f + "va") == u);
    }
}`,
        steps: [
          { line: 3, text: '`s` points at the pooled literal `"ja"`.',
            stack: [{ frame: 'main', vars: [r('s', 'p1')] }], heap: [pool('p1', 'ja')], out: '' },
          { line: 4, text: '`s` is a normal variable, so `s + "va"` is computed **at run time** and produces a brand-new String that is not in the pool.',
            stack: [{ frame: 'main', vars: [r('s', 'p1'), r('t', 's1')] }], heap: [pool('p1', 'ja'), pool('p2', 'va'), str('s1', 'java')] },
          { line: 5, text: 'The literal `"java"` is pooled. `u` points there.',
            stack: [{ frame: 'main', vars: [r('s', 'p1'), r('t', 's1'), r('u', 'p3')] }], heap: [pool('p1', 'ja'), pool('p2', 'va'), pool('p3', 'java'), str('s1', 'java')] },
          { line: 6, text: '`t` and `u` are different objects: **false**.', out: 'false\n' },
          { line: 7, text: 'Same characters: **true**.', out: 'false\ntrue\n' },
          { line: 8, text: '`f` is `final` and set from a literal, which makes it a **compile-time constant**.',
            stack: [{ frame: 'main', vars: [r('s', 'p1'), r('t', 's1'), r('u', 'p3'), r('f', 'p1')] }] },
          { line: 9, text: 'The compiler folds `f + "va"` into the literal `"java"`, which is the pooled object. **true**.', out: 'false\ntrue\ntrue\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'What `==` and `equals` compare',
        text: [
          [
            '`==` on references compares the arrows: are both variables pointing at the same object?',
            '`equals` is a method. `String` overrides it to compare the characters one by one.',
            'For primitives (`int`, `char`…) `==` compares values, which is what you want.'
          ],
          'Rule of thumb: compare Strings with `equals` (or `equalsIgnoreCase`). Use `==` only to check for `null`.'
        ]
      },
      {
        name: 'The String pool',
        text: [
          'The pool (also called the string table) is part of the heap. Every string literal and every compile-time constant expression is stored there once.',
          [
            'Two identical literals anywhere in the program share one object.',
            '`"a" + "b"` is folded by the compiler into `"ab"`, so it is pooled too.',
            'Strings made at run time (`+` with a variable, `substring`, `StringBuilder.toString()`, input from a file) are new objects, not pooled.',
            '`intern()` returns the pooled copy, adding it if missing.'
          ],
          'Pooling is safe only because Strings are immutable: no one sharing the object can change it.'
        ]
      },
      {
        name: 'Null-safe comparison',
        text: [
          'Calling `equals` on a `null` variable throws `NullPointerException`. Put the literal first, or use `Objects.equals`.'
        ],
        code: `import java.util.Objects;

public class Main {
    public static void main(String[] args) {
        String role = null;
        System.out.println("admin".equals(role));       // false, no exception
        System.out.println(Objects.equals(role, null)); // true
    }
}`,
        expect: 'false\ntrue'
      },
      {
        name: 'Immutability in practice',
        text: [
          'No String method changes the String. `toUpperCase`, `trim`, `replace`, `substring` and `concat` all return a **new** String, so you must use the result.'
        ],
        code: `public class Main {
    public static void main(String[] args) {
        String s = "  Java  ";
        s.trim();                 // result thrown away
        System.out.println("[" + s + "]");
        s = s.trim();             // keep the result
        System.out.println("[" + s + "]");
    }
}`,
        expect: '[  Java  ]\n[Java]'
      },
      {
        name: 'Methods you will use every day',
        text: [
          [
            '`length()`, `charAt(i)`, `isEmpty()`, `isBlank()`',
            '`substring(begin, end)`: end is **exclusive**',
            '`indexOf`, `contains`, `startsWith`, `endsWith`',
            '`split(regex)`, `String.join(", ", list)`, `strip()`, `repeat(n)`',
            '`compareTo` for ordering: negative, zero or positive'
          ]
        ]
      }
    ],
    table: {
      head: ['Expression', '`==` with the literal `"java"`', 'Why'],
      rows: [
        ['`"java"`', 'true', 'same pooled literal'],
        ['`"ja" + "va"`', 'true', 'folded at compile time'],
        ['`final` constant `+ "va"`', 'true', 'compile-time constant, folded'],
        ['`s + "va"` (s not final)', 'false', 'built at run time'],
        ['`new String("java")`', 'false', '`new` always makes a new object'],
        ['`new String("java").intern()`', 'true', 'returns the pooled copy']
      ]
    },
    pitfalls: [
      ['Comparing Strings with `==`', 'It may pass in tests with literals and fail with real input. Always use `equals`.'],
      ['`x.equals("y")` when `x` can be null', 'Throws NullPointerException. Write `"y".equals(x)` or `Objects.equals(x, "y")`.'],
      ['Ignoring the return value', '`s.toLowerCase();` on its own does nothing. Assign the result.'],
      ['`substring(1, 3)` gives 3 characters', 'No: the end index is exclusive, so it returns 2 characters.'],
      ['Using `new String("x")`', 'It creates a needless extra object. Just use the literal.']
    ],
    interview: [
      ['What is the String pool and why does it exist?', ['A table in the heap that stores one copy of each literal and constant String. It saves memory because identical literals share one object. It works because Strings are immutable.']],
      ['How many objects does `new String("hi")` create?', ['Up to two: the literal `"hi"` in the pool (if not already there, created when the class is loaded/resolved) and one new String object on the heap. Since Java 7u6 they may share the same internal byte array.']],
      ['Why is String immutable?', ['Safe sharing in the pool, safe use as a HashMap key (the hash cannot change), thread safety without locks, and security: a String passed to a method (like a file path) cannot be changed after it was checked. The hash code is also cached.']],
      ['What does `intern()` do?', ['It returns the pooled String with the same text, adding this one to the pool if none exists. After interning, `==` works for equal text, but `equals` is still the clearer choice.']]
    ],
    say: [
      '`==` checks identity, `equals` checks content.',
      'Literals and compile-time constants are pooled; Strings built at run time are not.',
      'Strings are immutable, so every "change" returns a new String.'
    ],
    checklist: [
      'Draw the heap for `a = "x"`, `b = new String("x")`.',
      'Predict `==` for a literal, a folded constant and a runtime concatenation.',
      'Write a null-safe String comparison.',
      'Give three reasons String is immutable.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        String x = "a" + "b";
        String y = "ab";
        System.out.println(x == y);
    }
}`,
          answer: 'true',
          why: 'Both parts are literals, so the compiler folds them into `"ab"`, which is the same pooled object as `y`.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        String a = new String("x");
        String b = new String("x");
        System.out.println(a == b);
        System.out.println(a.equals(b));
        System.out.println(a.hashCode() == b.hashCode());
    }
}`,
          answer: 'false\ntrue\ntrue',
          why: 'Two `new` calls make two objects. Their text is equal, and equal Strings must have equal hash codes.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        String s = "hello";
        s.toUpperCase();
        System.out.println(s);
        String t = s.concat("!");
        System.out.println(s + " " + t);
    }
}`,
          answer: 'hello\nhello hello!',
          why: 'The first result is thrown away. `concat` returns a new String and `s` is unchanged.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        System.out.println("a".compareTo("c"));
        System.out.println("Java".equalsIgnoreCase("JAVA"));
        System.out.println("banana".substring(1, 3));
    }
}`,
          answer: '-2\ntrue\nan',
          why: '`compareTo` returns the difference of the first differing chars (`a` - `c` = -2). `substring` end is exclusive: indexes 1 and 2.'
        }
      ],
      fill: [
        {
          q: 'Compare without risking a NullPointerException.',
          code: `public class Main {
    public static void main(String[] args) {
        String role = null;
        boolean isAdmin = [["admin"]].equals(role);
        System.out.println(isAdmin);
    }
}`,
          expect: 'false',
          why: 'The literal is never null, so calling `equals` on it is safe.'
        },
        {
          q: 'Check the text, not the object.',
          code: `public class Main {
    public static void main(String[] args) {
        String typed = new String("secret");
        if (typed.[[equals]]("secret")) {
            System.out.println("ok");
        }
    }
}`,
          expect: 'ok',
          why: '`typed` is a new object, so `==` would be false. `equals` compares characters.'
        }
      ],
      bug: [
        {
          q: '`isYes` should return true for the input "yes".',
          code: `public class Main {
    static boolean isYes(String answer) {
        return answer == "yes";
    }
    public static void main(String[] args) {
        String input = new String("yes");
        System.out.println(isYes(input));
    }
}`,
          line: 3,
          fix: 'return "yes".equals(answer);',
          expect: 'true',
          why: '`input` is not the pooled literal, so `==` is false. Compare content with `equals`.'
        },
        {
          q: 'This should print `[ana]`.',
          code: `public class Main {
    public static void main(String[] args) {
        String name = "  ana  ";
        name.trim();
        System.out.println("[" + name + "]");
    }
}`,
          line: 4,
          fix: 'name = name.trim();',
          expect: '[ana]',
          why: 'Strings are immutable. `trim()` returns a new String that must be assigned.'
        }
      ]
    }
  });
})();
