(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const L = (t) => ({ id: 'l', type: 'ArrayList<String>', val: t });

  registerLesson({
    slug: 'var-textblocks',
    track: 'jvm',
    title: 'var and text blocks',
    one: '`var` lets the compiler *infer* a local\'s type; the type is still fixed. Text blocks (`"""`) write multi-line strings without escapes.',
    idea: [
      '`var list = new ArrayList<String>();` is exactly the same as writing `ArrayList<String> list = ...`. The compiler fills in the type from the initializer, and it can never change afterwards. Java stays statically typed.',
      '`var` works only for local variables with an initializer (and in for loops, try-with-resources and lambda parameters). Not for fields, method parameters or return types.',
      'A **text block** starts with `"""` and a newline. The common leading indentation is removed, line breaks are kept, and quotes need no escaping. Ideal for JSON, SQL and HTML snippets.'
    ],
    stages: [
      {
        title: 'Inferred types, multi-line text',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        var names = new ArrayList<String>();
        names.add("ana");
        var count = names.size();
        var json = """
            {"name": "%s", "count": %d}
            """.formatted(names.get(0), count);
        System.out.print(json);
    }
}`,
        steps: [
          { line: 5, text: 'The compiler infers `ArrayList<String>` from the right side. That is the variable\'s type, permanently.', stack: [{ frame: 'main', vars: [r('names : ArrayList<String>', 'l')] }], heap: [L('[]')], out: '' },
          { line: 6, text: 'Normal method calls; nothing dynamic.', heap: [L('[ana]')] },
          { line: 7, text: '`size()` returns `int`, so `count` is an `int`.', stack: [{ frame: 'main', vars: [r('names : ArrayList<String>', 'l'), v('count : int', 1)] }] },
          { line: 10, text: 'The text block\'s shared indentation (up to the closing `"""`) is stripped. The quotes inside need no backslashes. `formatted` fills the placeholders.',
            stack: [{ frame: 'main', vars: [r('names : ArrayList<String>', 'l'), v('count : int', 1), r('json : String', 'j')] }], heap: [L('[ana]'), { id: 'j', type: 'String', val: '{"name": "ana", "count": 1}⏎' }] },
          { line: 11, text: 'The text block ends with a line break because the closing `"""` is on its own line.', out: '{"name": "ana", "count": 1}\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Where var helps and where it hurts',
        text: [
          [
            'Good: long generic types (`var map = new HashMap<String, List<Order>>()`), obvious initializers, for-each over entries.',
            'Bad: when the type is not obvious from the right side (`var x = service.process()`).',
            'Careful with the diamond: `var list = new ArrayList<>()` infers `ArrayList<Object>`.',
            'Careful with literals: `var n = 1` is `int`; `var big = 1L` is `long`.'
          ]
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        var byLen = new TreeMap<Integer, List<String>>();
        for (var w : List.of("hi", "yo", "cat")) {
            byLen.computeIfAbsent(w.length(), k -> new ArrayList<>()).add(w);
        }
        for (var e : byLen.entrySet()) {
            System.out.println(e.getKey() + " -> " + e.getValue());
        }
    }
}`,
        expect: '2 -> [hi, yo]\n3 -> [cat]'
      },
      {
        name: 'Text block details',
        text: [
          [
            'Indentation is measured against the least-indented line, **including** the closing `"""`. Move the closing delimiter left to keep indentation.',
            'Trailing spaces on each line are stripped. Use `\\s` to keep one.',
            'A `\\` at the end of a line joins it with the next line (no line break).',
            'Put the closing `"""` right after the text to avoid the final newline.'
          ]
        ],
        code: `public class Main {
    public static void main(String[] args) {
        String sql = """
            SELECT *
              FROM users
             WHERE age > 18""";
        System.out.println(sql);
        String oneLine = """
            Hello, \\
            world""";
        System.out.println(oneLine);
    }
}`,
        expect: 'SELECT *\n  FROM users\n WHERE age > 18\nHello, world'
      }
    ],
    table: {
      head: ['Allowed', 'Not allowed'],
      rows: [
        ['`var x = 5;` (local with initializer)', '`var x;` (no initializer)'],
        ['`for (var e : map.entrySet())`', '`var x = null;`'],
        ['`try (var in = open())`', 'fields, parameters, return types'],
        ['`(var a, var b) -> a + b` (lambda params)', '`var arr = {1, 2};` (array initializer)']
      ]
    },
    pitfalls: [
      ['`var list = new ArrayList<>();`', 'Infers `ArrayList<Object>`. Give the type argument.'],
      ['`var` hides an important type', 'If the reader cannot tell the type, write it out.'],
      ['Text block closing delimiter placement', 'It controls both the indentation and the trailing newline.'],
      ['Thinking `var` is dynamic typing', 'The type is fixed at compile time; assigning a different type fails.']
    ],
    interview: [
      ['Does var make Java dynamically typed?', ['No. The compiler infers the static type from the initializer, and it cannot change. The bytecode is identical to writing the type.']],
      ['Where can you not use var?', ['Fields, method parameters, return types, catch parameters, without an initializer, with `null` or an array initializer alone, and for lambdas without a target type.']],
      ['How is a text block\'s indentation decided?', ['The compiler finds the minimum indentation across all non-blank lines and the closing delimiter line, and removes that much from every line.']]
    ],
    say: [
      'var is compile-time inference for locals; the type never changes.',
      'Use var when the type is obvious from the right-hand side.',
      'Text blocks strip common indentation; the closing delimiter controls it.'
    ],
    checklist: [
      'List three places var is not allowed.',
      'Explain the diamond-with-var trap.',
      'Write a JSON text block with formatted.',
      'Control the trailing newline of a text block.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        var list = new ArrayList<>();
        list.add(1);
        list.add("x");
        System.out.println(list);
    }
}`,
          answer: '[1, x]',
          why: 'With the diamond and no target type, `var` infers `ArrayList<Object>`, so anything goes in.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        String t = """
            a
              b
            """;
        System.out.print(t);
    }
}`,
          answer: 'a\n  b',
          why: 'The common 12-space indentation is removed; the extra 2 spaces before b stay.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        var x = 10;
        var y = 2.5;
        var z = x * y;
        System.out.println(z);
    }
}`,
          answer: '25.0',
          why: '`x` is int, `y` is double, so `z` is inferred as double.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        String s = """
            one \\
            two""";
        System.out.println(s + "|");
    }
}`,
          answer: 'one two|',
          why: 'A backslash at the end of a line joins it to the next; closing right after "two" means no final newline.'
        }
      ],
      fill: [
        {
          q: 'Let the compiler infer the map type.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        [[var]] map = new HashMap<String, Integer>();
        map.put("a", 1);
        System.out.println(map);
    }
}`,
          expect: '{a=1}',
          why: 'The type `HashMap<String, Integer>` comes from the initializer.'
        },
        {
          q: 'Write an HTML snippet as a text block.',
          code: `public class Main {
    public static void main(String[] args) {
        String html = [["""]]
            <p>hi</p>
            """;
        System.out.print(html);
    }
}`,
          expect: '<p>hi</p>',
          why: 'A text block opens with `"""` followed by a line break.'
        }
      ],
      bug: [
        {
          q: 'Make it compile.',
          code: `public class Main {
    public static void main(String[] args) {
        var total;
        total = 5;
        System.out.println(total);
    }
}`,
          line: 3,
          fix: 'var total = 0;',
          expect: '5',
          why: '`var` needs an initializer to infer the type.'
        },
        {
          q: 'Make it compile.',
          code: `public class Main {
    public static void main(String[] args) {
        var nothing = null;
        System.out.println(nothing == null);
    }
}`,
          line: 3,
          fix: 'String nothing = null;',
          expect: 'true',
          why: '`null` has no useful type to infer. Declare the type explicitly.'
        }
      ]
    }
  });
})();
