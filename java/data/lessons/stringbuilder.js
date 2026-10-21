(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const s = (id, t, extra) => Object.assign({ id, type: 'String', val: '"' + t + '"' }, extra || {});
  const sb = (id, t, cap) => ({ id, type: 'StringBuilder', fields: [v('text', '"' + t + '"'), v('length', t.length), v('capacity', cap || 16)] });

  registerLesson({
    slug: 'stringbuilder',
    track: 'basics',
    title: 'StringBuilder',
    one: 'A String never changes, so `s = s + x` in a loop makes a new String every time. A StringBuilder edits *one buffer* in place.',
    idea: [
      '`s + x` creates a brand-new String and copies both parts into it. In a loop of n rounds that is n new objects and about n²/2 characters copied.',
      '`StringBuilder` keeps a growable character buffer. `append` writes into it, and the buffer doubles when it runs out of room, so building a string is O(n) overall.',
      'StringBuilder is mutable and **not** thread-safe. `StringBuffer` is the old synchronized version; you rarely need it.'
    ],
    stages: [
      {
        title: 'Concatenation vs builder',
        code: `public class Main {
    public static void main(String[] args) {
        String s = "";
        for (int i = 0; i < 3; i++) {
            s = s + i;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 3; i++) {
            sb.append(i);
        }
        System.out.println(s + " " + sb);
    }
}`,
        steps: [
          { line: 3, text: '`s` points at the empty literal in the pool.', stack: [{ frame: 'main', vars: [r('s', 'e')] }], heap: [s('e', '', { pool: true })], out: '' },
          { line: 5, text: '`s + 0` builds a **new** String "0". The old one is no longer referenced by `s`.', stack: [{ frame: 'main', vars: [r('s', 's0'), v('i', 0)] }], heap: [s('e', '', { pool: true }), s('s0', '0')] },
          { line: 5, text: 'Another new String "01". "0" is now garbage.', stack: [{ frame: 'main', vars: [r('s', 's1'), v('i', 1)] }], heap: [s('e', '', { pool: true }), s('s0', '0', { gone: true }), s('s1', '01')] },
          { line: 5, text: 'And again: "012". Three rounds, three new objects, each copying everything before it.', stack: [{ frame: 'main', vars: [r('s', 's2'), v('i', 2)] }], heap: [s('e', '', { pool: true }), s('s0', '0', { gone: true }), s('s1', '01', { gone: true }), s('s2', '012')] },
          { line: 7, text: 'One StringBuilder with a buffer of 16 characters.', stack: [{ frame: 'main', vars: [r('s', 's2'), r('sb', 'b')] }], heap: [s('s2', '012'), sb('b', '')] },
          { line: 9, text: '`append(0)` writes into the buffer. No new object.', stack: [{ frame: 'main', vars: [r('s', 's2'), r('sb', 'b'), v('i', 0)] }], heap: [s('s2', '012'), sb('b', '0')] },
          { line: 9, text: 'Still the same object.', stack: [{ frame: 'main', vars: [r('s', 's2'), r('sb', 'b'), v('i', 1)] }], heap: [s('s2', '012'), sb('b', '01')] },
          { line: 9, text: 'Three appends, one object.', stack: [{ frame: 'main', vars: [r('s', 's2'), r('sb', 'b'), v('i', 2)] }], heap: [s('s2', '012'), sb('b', '012')] },
          { line: 11, text: 'Same text, very different cost for large loops.', stack: [{ frame: 'main', vars: [r('s', 's2'), r('sb', 'b')] }], out: '012 012\n' }
        ]
      },
      {
        title: 'One builder, two names',
        code: `public class Main {
    public static void main(String[] args) {
        StringBuilder a = new StringBuilder("ab");
        StringBuilder b = a;
        b.append("c");
        a.reverse();
        String snap = a.toString();
        a.setLength(0);
        System.out.println(snap + " [" + b + "]");
    }
}`,
        steps: [
          { line: 3, text: 'A builder holding "ab". Its capacity is 16 + 2.', stack: [{ frame: 'main', vars: [r('a', 'b1')] }], heap: [sb('b1', 'ab', 18)], out: '' },
          { line: 4, text: '`b` is a second reference to the same builder.', stack: [{ frame: 'main', vars: [r('a', 'b1'), r('b', 'b1')] }] },
          { line: 5, text: 'Appending through `b` changes what `a` sees.', heap: [sb('b1', 'abc', 18)] },
          { line: 6, text: '`reverse()` works in place and returns the same builder.', heap: [sb('b1', 'cba', 18)] },
          { line: 7, text: '`toString()` copies the current text into a new, independent String.', stack: [{ frame: 'main', vars: [r('a', 'b1'), r('b', 'b1'), r('snap', 'st')] }], heap: [sb('b1', 'cba', 18), s('st', 'cba')] },
          { line: 8, text: '`setLength(0)` empties the builder. The String snapshot is unaffected.', heap: [sb('b1', '', 18), s('st', 'cba')] },
          { line: 9, text: '`b` is the emptied builder.', out: 'cba []\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The API',
        text: [
          [
            '`append(x)` for any type; returns the builder, so calls chain.',
            '`insert(i, x)`, `delete(start, end)`, `deleteCharAt(i)`, `replace(start, end, str)`',
            '`reverse()`, `setCharAt(i, c)`, `charAt(i)`, `length()`, `setLength(n)`',
            '`toString()` to get an immutable String'
          ]
        ],
        code: `public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("hello");
        sb.setCharAt(0, 'J');
        sb.append(" world").insert(5, ",");
        sb.delete(6, 12);
        System.out.println(sb);
        System.out.println(sb.reverse());
    }
}`,
        expect: 'Jello,\n,olleJ'
      },
      {
        name: 'When does the compiler help?',
        text: [
          'For a single expression like `"a" + x + "b"`, the compiler already produces efficient code (since Java 9 it uses `invokedynamic` string concatenation). The problem is only in loops, where each round makes a new String. Use a builder there, or `String.join` / `Collectors.joining`.'
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> parts = List.of("a", "b", "c");
        System.out.println(String.join(", ", parts));
    }
}`,
        expect: 'a, b, c'
      },
      {
        name: 'Capacity',
        text: [
          'Default capacity is 16 characters (or 16 + the initial text length). When it overflows, the buffer grows to about twice its size plus 2 and the contents are copied. If you know the final size, pass it: `new StringBuilder(1000)`.'
        ]
      }
    ],
    table: {
      head: ['', 'String', 'StringBuilder', 'StringBuffer'],
      rows: [
        ['Mutable', 'no', 'yes', 'yes'],
        ['Thread-safe', 'yes (immutable)', 'no', 'yes (synchronized)'],
        ['Speed', 'new object per change', 'fast', 'slower (locking)'],
        ['`equals` compares text', 'yes', 'no (identity)', 'no (identity)']
      ]
    },
    pitfalls: [
      ['`s += x` inside a big loop', 'O(n²) copying. Use a StringBuilder.'],
      ['`sb.equals("abc")`', 'Always false: StringBuilder does not override `equals`. Compare `sb.toString()` or use `"abc".contentEquals(sb)`.'],
      ['`sb.append(\'a\' + \'b\')`', 'Two chars add as ints (195). Append them separately.'],
      ['Sharing one builder between threads', 'Not thread-safe. Give each thread its own.']
    ],
    interview: [
      ['String vs StringBuilder vs StringBuffer?', ['String is immutable. StringBuilder is a mutable buffer for building text, not synchronized. StringBuffer is the same but synchronized, which is slower and rarely needed.']],
      ['Why is `+` in a loop slow?', ['Each `+` creates a new String and copies all characters so far, so n appends cost O(n²) time and create n temporary objects.']],
      ['Does StringBuilder override equals?', ['No. It uses identity from Object. Convert to String first.']]
    ],
    say: [
      'Use StringBuilder when building a string in a loop.',
      'StringBuilder edits one buffer; String makes a new object per change.',
      'StringBuilder does not override `equals`.'
    ],
    checklist: [
      'Explain the O(n²) cost of `s += x` in a loop.',
      'Reverse a string with StringBuilder.',
      'Remove a trailing ", " with `setLength`.',
      'Compare a builder\'s content to a String.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("java");
        sb.insert(0, "I ").append('!').deleteCharAt(2);
        System.out.println(sb);
    }
}`,
          answer: 'I ava!',
          why: 'After insert: "I java". Append: "I java!". Index 2 is `j`, which is deleted.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        StringBuilder a = new StringBuilder("abc");
        StringBuilder b = new StringBuilder("abc");
        System.out.println(a.equals(b));
        System.out.println("abc".contentEquals(a));
    }
}`,
          answer: 'false\ntrue',
          why: 'StringBuilder keeps Object\'s identity `equals`. `contentEquals` compares characters.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        sb.append('a' + 'b');
        sb.append("-").append('a').append('b');
        System.out.println(sb);
    }
}`,
          answer: '195-ab',
          why: '`\'a\' + \'b\'` is int addition: 97 + 98 = 195. Separate appends keep the characters.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("hello");
        sb.replace(1, 4, "ipp");
        System.out.println(sb);
    }
}`,
          answer: 'hippo',
          why: 'Indexes 1 to 3 ("ell") are replaced by "ipp"; the end index is exclusive.'
        }
      ],
      fill: [
        {
          q: 'Join names with ", " and no trailing comma.',
          code: `public class Main {
    public static void main(String[] args) {
        String[] names = {"Ann", "Bo", "Cy"};
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < names.length; i++) {
            if (i > 0) sb.[[append]](", ");
            sb.append(names[i]);
        }
        String out = sb.[[toString()]];
        System.out.println(out);
    }
}`,
          expect: 'Ann, Bo, Cy',
          why: 'Add the separator before every element except the first.'
        },
        {
          q: 'Check for a palindrome.',
          code: `public class Main {
    public static void main(String[] args) {
        String s = "level";
        boolean pal = new StringBuilder(s).[[reverse()]].toString().equals(s);
        System.out.println(pal);
    }
}`,
          expect: 'true',
          why: '`reverse()` flips the builder in place and returns it, so you can chain `toString()`.'
        }
      ],
      bug: [
        {
          q: 'Should print "match".',
          code: `public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("ab").append("c");
        if (sb.equals("abc")) {
            System.out.println("match");
        } else {
            System.out.println("no");
        }
    }
}`,
          line: 4,
          fix: 'if (sb.toString().equals("abc")) {',
          expect: 'match',
          why: 'A StringBuilder is never `equals` to a String. Convert it first.'
        },
        {
          q: 'Remove the trailing ", ".',
          code: `public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        for (String s : new String[]{"a", "b"}) sb.append(s).append(", ");
        sb.deleteCharAt(sb.length());
        System.out.println(sb);
    }
}`,
          line: 5,
          fix: 'sb.setLength(sb.length() - 2);',
          expect: 'a, b',
          why: 'Index `length()` is past the end, so it throws. And two characters must go: shorten by 2.'
        }
      ]
    }
  });
})();
