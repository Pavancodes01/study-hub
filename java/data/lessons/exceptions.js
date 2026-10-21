(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const ex = { id: 'x', type: 'NumberFormatException', fields: [v('message', 'For input string: "x"')] };
  const M = { frame: 'main', vars: [] };

  registerLesson({
    slug: 'exceptions',
    track: 'core',
    title: 'Exceptions and try-with-resources',
    one: 'A thrown exception *pops stack frames* until a matching `catch` is found. `finally` runs on the way out, no matter what.',
    idea: [
      'An exception is an object. `throw` stops the current method; the JVM then removes frames one by one, looking for a `catch` that matches the exception\'s type. If none is found, the thread dies and the stack trace is printed.',
      '**Checked** exceptions (subclasses of `Exception` but not `RuntimeException`) must be caught or declared with `throws`. **Unchecked** ones (`RuntimeException`, `Error`) need not be.',
      'Anything that must be released (files, sockets, locks) goes in `finally` or, better, in **try-with-resources**, which closes it automatically.'
    ],
    stages: [
      {
        title: 'Unwinding the stack',
        code: `public class Main {
    static int parse(String s) {
        return Integer.parseInt(s);
    }
    static int load(String s) {
        try {
            return parse(s) * 2;
        } finally {
            System.out.println("finally");
        }
    }
    public static void main(String[] args) {
        try {
            System.out.println(load("21"));
            System.out.println(load("x"));
        } catch (NumberFormatException e) {
            System.out.println("bad: " + e.getMessage());
        }
    }
}`,
        steps: [
          { line: 14, text: '`main` enters its try block.', stack: [M], heap: [], out: '' },
          { line: 3, text: 'Three frames deep: main, load, parse.', stack: [M, { frame: 'load', vars: [v('s', '"21"')] }, { frame: 'parse', vars: [v('s', '"21"')] }] },
          { line: 7, text: '`parse` returned 21. `load` has its return value ready: 42.', stack: [M, { frame: 'load', vars: [v('s', '"21"'), v('(return)', 42)] }] },
          { line: 9, text: 'Before `load` really returns, its `finally` block runs.', out: 'finally\n' },
          { line: 14, text: 'Now 42 reaches `main` and is printed.', stack: [M], out: 'finally\n42\n' },
          { line: 3, text: '`parseInt("x")` fails. An exception object is created and thrown out of `parse`.',
            stack: [M, { frame: 'load', vars: [v('s', '"x"')] }, { frame: 'parse', vars: [v('s', '"x"')] }], heap: [ex] },
          { line: 9, text: '`parse`\'s frame is gone. `load` has no `catch`, but its `finally` still runs while the exception passes through.',
            stack: [M, { frame: 'load', vars: [v('s', '"x"')] }], out: 'finally\n42\nfinally\n' },
          { line: 17, text: '`load`\'s frame is gone too. `main`\'s catch matches, and `e` points at the exception. Line 15 never printed anything.',
            stack: [{ frame: 'main', vars: [r('e', 'x')] }], out: 'finally\n42\nfinally\nbad: For input string: "x"\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The hierarchy',
        text: [
          [
            '`Throwable` is the root.',
            '`Error`: serious JVM problems (`OutOfMemoryError`, `StackOverflowError`). Do not catch these normally.',
            '`Exception`: conditions a program may want to handle. Checked, except for…',
            '`RuntimeException`: programming errors (`NullPointerException`, `IllegalArgumentException`, `IndexOutOfBoundsException`). Unchecked.'
          ]
        ]
      },
      {
        name: 'try-with-resources',
        text: [
          'Any `AutoCloseable` declared in the parentheses is closed when the block ends, in **reverse** order of opening, even if an exception is thrown. If both the body and `close()` throw, the body\'s exception wins and the other is attached as a **suppressed** exception.'
        ],
        code: `public class Main {
    static class Res implements AutoCloseable {
        final String name;
        Res(String name) { this.name = name; System.out.println("open " + name); }
        public void close() { System.out.println("close " + name); }
    }
    public static void main(String[] args) {
        try (Res a = new Res("a"); Res b = new Res("b")) {
            System.out.println("work");
        }
    }
}`,
        expect: 'open a\nopen b\nwork\nclose b\nclose a'
      },
      {
        name: 'Custom exceptions and good habits',
        text: [
          [
            'Extend `RuntimeException` for programming errors and `Exception` when the caller can reasonably recover and you want to force handling.',
            'Catch the most specific type first; one `catch (A | B e)` handles several.',
            'Never swallow: an empty `catch` hides bugs. At least log it, or rethrow wrapped: `throw new ServiceException("load failed", e);` keeps the cause.',
            'Do not use exceptions for normal control flow; they are slow to create because they capture the stack trace.'
          ]
        ],
        code: `public class Main {
    static class InsufficientFunds extends Exception {
        InsufficientFunds(String msg) { super(msg); }
    }
    static void withdraw(int balance, int amount) throws InsufficientFunds {
        if (amount > balance) throw new InsufficientFunds("need " + (amount - balance) + " more");
        System.out.println("ok");
    }
    public static void main(String[] args) {
        try {
            withdraw(50, 80);
        } catch (InsufficientFunds e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        expect: 'need 30 more'
      }
    ],
    table: {
      head: ['', 'Checked', 'Unchecked'],
      rows: [
        ['Extends', '`Exception`', '`RuntimeException` or `Error`'],
        ['Must catch or declare', 'yes', 'no'],
        ['Typical cause', 'outside world (I/O, network)', 'bugs (null, bad index, bad argument)'],
        ['Examples', '`IOException`, `SQLException`', '`NullPointerException`, `IllegalStateException`']
      ]
    },
    pitfalls: [
      ['`return` inside `finally`', 'Overrides the try\'s return value and discards any exception. Never do it.'],
      ['Catching `Exception` before a subclass', 'The later catch is unreachable: compile error.'],
      ['Empty catch blocks', 'The error disappears and the program continues in a bad state.'],
      ['Closing resources by hand', 'An exception before `close()` leaks the resource. Use try-with-resources.']
    ],
    interview: [
      ['Checked vs unchecked exceptions?', ['Checked exceptions must be caught or declared; they model recoverable conditions from outside the program. Unchecked exceptions (RuntimeException and Error) need not be declared; they usually signal bugs.']],
      ['Does `finally` always run?', ['It runs after try/catch whether they complete normally, return or throw. It does not run if the JVM exits (`System.exit`), the thread is killed, or the machine crashes.']],
      ['What are suppressed exceptions?', ['In try-with-resources, if the body throws and `close()` also throws, the close exception is attached to the primary one with `addSuppressed` instead of replacing it. Read them with `getSuppressed()`.']],
      ['`throw` vs `throws`?', ['`throw` throws an exception object at run time. `throws` in a method signature declares which checked exceptions the method may let escape.']]
    ],
    say: [
      'Exceptions unwind frames until a matching catch; finally runs on the way.',
      'Checked must be handled or declared; unchecked signal bugs.',
      'Use try-with-resources for anything closeable.'
    ],
    checklist: [
      'Trace which `finally` blocks run when an exception passes through.',
      'Write try-with-resources with two resources and state the close order.',
      'Create a checked custom exception.',
      'Explain why `return` in finally is dangerous.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    @SuppressWarnings("finally")
    static int f() {
        try {
            return 1;
        } finally {
            return 2;
        }
    }
    public static void main(String[] args) {
        System.out.println(f());
    }
}`,
          answer: '2',
          why: 'The `finally` runs after the try\'s return value is prepared and replaces it with its own return.'
        },
        {
          code: `public class Main {
    static int g() {
        int x = 1;
        try {
            return x;
        } finally {
            x = 5;
        }
    }
    public static void main(String[] args) {
        System.out.println(g());
    }
}`,
          answer: '1',
          why: 'The value 1 was already saved as the return value. Changing `x` afterwards does not affect it.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        try {
            int[] a = new int[1];
            a[2] = 1;
            System.out.println("after");
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("A");
        } catch (RuntimeException e) {
            System.out.println("R");
        } finally {
            System.out.println("F");
        }
    }
}`,
          answer: 'A\nF',
          why: 'The first matching catch wins, then finally runs. "after" is skipped.'
        },
        {
          code: `public class Main {
    static class R implements AutoCloseable {
        public void close() { throw new IllegalStateException("close"); }
    }
    public static void main(String[] args) {
        try (R r = new R()) {
            throw new RuntimeException("body");
        } catch (RuntimeException e) {
            System.out.println(e.getMessage() + " " + e.getSuppressed()[0].getMessage());
        }
    }
}`,
          answer: 'body close',
          why: 'The body\'s exception is the primary one. The exception from `close()` is attached as suppressed.'
        }
      ],
      fill: [
        {
          q: 'Read a line and close the reader automatically.',
          code: `import java.io.*;

public class Main {
    public static void main(String[] args) {
        try ([[BufferedReader]] r = new BufferedReader(new StringReader("hi"))) {
            System.out.println(r.readLine());
        } catch ([[IOException]] e) {
            System.out.println("failed");
        }
    }
}`,
          expect: 'hi',
          why: 'The resource is declared in the parentheses; `readLine` can throw the checked IOException.'
        },
        {
          q: 'Declare and throw a checked exception.',
          code: `public class Main {
    static class TooBig extends Exception {
        TooBig(String m) { super(m); }
    }
    static void check(int n) [[throws]] TooBig {
        if (n > 10) [[throw]] new TooBig("n=" + n);
    }
    public static void main(String[] args) {
        try { check(12); } catch (TooBig e) { System.out.println(e.getMessage()); }
    }
}`,
          expect: 'n=12',
          why: '`throws` in the signature declares it; `throw` actually raises it.'
        }
      ],
      bug: [
        {
          q: 'The connection must close even when `use` fails.',
          code: `public class Main {
    static class Conn implements AutoCloseable {
        void use() { throw new IllegalStateException("boom"); }
        public void close() { System.out.println("closed"); }
    }
    public static void main(String[] args) {
        Conn c = new Conn();
        try {
            c.use();
            c.close();
        } catch (IllegalStateException e) {
            System.out.println("caught");
        }
    }
}`,
          line: 8,
          fix: 'try (c) {',
          expect: 'closed\ncaught',
          why: 'The exception skips `c.close()`. Since Java 9 an effectively final variable can go straight into try-with-resources, which always closes it.'
        },
        {
          q: 'Make the code compile.',
          code: `import java.io.IOException;

public class Main {
    static void save() {
        throw new IOException("disk");
    }
    public static void main(String[] args) {
        try {
            save();
        } catch (IOException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
          line: 4,
          fix: 'static void save() throws IOException {',
          expect: 'disk',
          why: 'IOException is checked: a method that throws it must declare it with `throws`.'
        }
      ]
    }
  });
})();
