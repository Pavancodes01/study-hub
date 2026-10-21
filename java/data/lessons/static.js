(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const cls = (n) => ({ id: 'cls', type: 'User · static fields', fields: [v('count', n)] });
  const user = (id, uid, name) => ({ id, type: 'User', fields: [v('id', uid), v('name', name)] });

  registerLesson({
    slug: 'static',
    track: 'oop',
    title: 'static vs instance',
    one: 'An instance field exists *once per object*. A static field exists *once per class*, shared by everyone.',
    idea: [
      'Every `new User(...)` gets its own copy of the instance fields. A `static` field is stored with the class itself, so there is exactly one, no matter how many objects exist (even zero).',
      'Static methods belong to the class too. They have no `this`, so they cannot use instance fields or call instance methods directly.',
      'Static methods are chosen at compile time from the declared type. They are **hidden**, not overridden, by subclasses.'
    ],
    stages: [
      {
        title: 'One counter, many objects',
        code: `public class Main {
    public static void main(String[] args) {
        User a = new User("ana");
        User b = new User("bo");
        System.out.println(User.count + " " + a.id + " " + b.id);
    }
}
class User {
    static int count = 0;
    final int id;
    final String name;
    User(String name) {
        count++;
        this.id = count;
        this.name = name;
    }
}`,
        steps: [
          { line: 3, text: 'The first use of `User` loads and initializes the class. Its static field `count` is created once, set to 0.',
            stack: [{ frame: 'main', vars: [] }], heap: [cls(0)], out: '' },
          { line: 13, text: 'The first object is allocated. `count++` changes the **shared** class field.',
            stack: [{ frame: 'main', vars: [] }, { frame: 'User(String)', vars: [r('this', 'u1'), v('name', '"ana"')] }], heap: [cls(1), user('u1', 0, null)] },
          { line: 15, text: 'The instance fields are set from it.', heap: [cls(1), user('u1', 1, '"ana"')] },
          { line: 4, text: 'The second object runs the same constructor. `count` is now 2, and this object gets id 2.',
            stack: [{ frame: 'main', vars: [r('a', 'u1'), r('b', 'u2')] }], heap: [cls(2), user('u1', 1, '"ana"'), user('u2', 2, '"bo"')] },
          { line: 5, text: 'One `count`, two `id`s.', out: '2 1 2\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'What can see what',
        text: [
          [
            'An instance method can use everything: instance fields, static fields, both kinds of methods.',
            'A static method can use static members directly. To reach instance members it needs an object reference.',
            '`main` is static, which is why calling an instance method from it needs `new Main().run()`.'
          ]
        ]
      },
      {
        name: 'Static initialization',
        text: [
          'Static fields and `static { }` blocks run once, top to bottom, when the class is first used (creating an instance, calling a static method, or reading a non-constant static field).'
        ],
        code: `import java.util.*;

public class Main {
    static final Map<String, Integer> CODES = new HashMap<>();
    static {
        CODES.put("ok", 200);
        CODES.put("missing", 404);
    }
    public static void main(String[] args) {
        System.out.println(CODES.get("missing"));
    }
}`,
        expect: '404'
      },
      {
        name: 'Good uses of static',
        text: [
          [
            'Constants: `static final int MAX_SIZE = 100;`',
            'Utility methods with no state: `Math.max`, `Collections.sort`.',
            'Factory methods: `List.of(...)`, `Integer.valueOf(...)`.',
            'Shared counters or caches, with care in multithreaded code.'
          ],
          'Avoid static mutable state for everything else. It is global, hard to test and shared between threads.'
        ]
      }
    ],
    table: {
      head: ['', 'Instance', 'Static'],
      rows: [
        ['Belongs to', 'each object', 'the class'],
        ['Copies', 'one per object', 'one total'],
        ['Has `this`', 'yes', 'no'],
        ['Called as', '`obj.method()`', '`Class.method()`'],
        ['Subclass with the same signature', 'overrides (runtime choice)', 'hides (compile-time choice)']
      ]
    },
    pitfalls: [
      ['Using an instance field in `main`', 'Compile error: static context has no `this`.'],
      ['Calling a static method through an instance', 'Legal but misleading: the declared type decides, and even a `null` reference works.'],
      ['A counter as an instance field', 'Every object gets its own counter starting at 0. Make it static.'],
      ['Static mutable fields in multithreaded code', 'Shared by all threads, so they need synchronization or atomics.']
    ],
    interview: [
      ['Can a static method be overridden?', ['No. A subclass can declare one with the same signature, but that hides the parent\'s. Which one runs depends on the declared type at compile time, not on the object.']],
      ['Why is `main` static?', ['So the JVM can call it without creating an object first.']],
      ['When are static fields initialized?', ['When the class is initialized, which happens on first active use: creating an instance, calling a static method, or accessing a static field that is not a compile-time constant.']],
      ['Where are static fields stored?', ['With the class. Since Java 8 the static variables live in the heap with the `Class` object, and class metadata lives in Metaspace.']]
    ],
    say: [
      'Instance members belong to objects; static members belong to the class.',
      'Static methods have no `this`.',
      'Static methods are hidden, not overridden.'
    ],
    checklist: [
      'Draw the heap for two objects and one static counter.',
      'Explain why `main` cannot read an instance field directly.',
      'Predict a call to a hidden static method through a parent-typed variable.',
      'Write a static initializer block.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    static int s;
    int i;
    Main() {
        s++;
        i++;
    }
    public static void main(String[] args) {
        new Main();
        new Main();
        Main m = new Main();
        System.out.println(Main.s + " " + m.i);
    }
}`,
          answer: '3 1',
          why: '`s` is shared, so three constructors make it 3. Each object has its own `i`, which is 1.'
        },
        {
          code: `public class Main {
    static class A { static String who() { return "A"; } }
    static class B extends A { static String who() { return "B"; } }
    public static void main(String[] args) {
        A x = new B();
        System.out.println(x.who());
    }
}`,
          answer: 'A',
          why: 'Static methods are picked from the declared type (`A`) at compile time. There is no overriding.'
        },
        {
          code: `public class Main {
    static int a = 1;
    static {
        a = a * 10;
    }
    static int b = a + 1;
    public static void main(String[] args) {
        System.out.println(a + " " + b);
    }
}`,
          answer: '10 11',
          why: 'Static initializers run top to bottom: a = 1, then the block makes it 10, then b = 11.'
        },
        {
          code: `public class Main {
    static String hello() {
        return "hi";
    }
    public static void main(String[] args) {
        Main m = null;
        System.out.println(m.hello());
    }
}`,
          answer: 'hi',
          why: 'A static call through a variable only uses its declared type. The `null` value is never touched.'
        }
      ],
      fill: [
        {
          q: 'Give each ticket the next number.',
          code: `public class Main {
    static class Ticket {
        [[static]] int next = 1;
        final int no;
        Ticket() { no = next++; }
    }
    public static void main(String[] args) {
        Ticket a = new Ticket(), b = new Ticket();
        System.out.println(a.no + " " + b.no);
    }
}`,
          expect: '1 2',
          why: 'One shared counter. As an instance field, both tickets would get 1.'
        },
        {
          q: 'Make a utility method callable without an object.',
          code: `public class Main {
    static class MathUtil {
        [[static]] int square(int x) { return x * x; }
    }
    public static void main(String[] args) {
        System.out.println(MathUtil.square(4));
    }
}`,
          expect: '16',
          why: '`Class.method()` only works for static methods.'
        }
      ],
      bug: [
        {
          q: 'Print the total.',
          code: `public class Main {
    int total = 5;
    public static void main(String[] args) {
        System.out.println(total);
    }
}`,
          line: 4,
          fix: 'System.out.println(new Main().total);',
          expect: '5',
          why: '`main` is static, so there is no `this` and no instance field to read. Create an object first.'
        },
        {
          q: 'Should print 2.',
          code: `public class Main {
    static class Widget {
        int created = 0;
        Widget() { created++; }
    }
    public static void main(String[] args) {
        Widget w1 = new Widget();
        Widget w2 = new Widget();
        System.out.println(w2.created);
    }
}`,
          line: 3,
          fix: 'static int created = 0;',
          expect: '2',
          why: 'An instance counter starts at 0 in every object. A shared count must be static.'
        }
      ]
    }
  });
})();
