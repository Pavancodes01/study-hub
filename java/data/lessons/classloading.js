(function () {
  const v = (name, value) => ({ name, value });
  const K = (state, port) => ({ id: 'cfg', type: 'class Config', fields: [v('state', state), v('port', port)] });
  const MC = { id: 'mc', type: 'class Main', fields: [v('state', 'initialized')] };

  registerLesson({
    slug: 'classloading',
    track: 'jvm',
    title: 'Class loading and initialization',
    one: 'Classes are loaded *lazily*, the first time they are really needed, and their static initializer runs *exactly once*.',
    idea: [
      'Before a class can be used it goes through **loading** (find the bytes and create a Class object), **linking** (verify the bytecode, prepare static fields with default values, resolve references) and **initialization** (run static initializers and static field assignments, in source order).',
      'Initialization happens on first *active use*: `new`, calling a static method, reading or writing a non-constant static field, or a subclass being initialized. Merely declaring a variable, creating an array of the type or reading a compile-time constant does not trigger it.',
      'Class loaders form a hierarchy (bootstrap → platform → application) and use **parent delegation**: a loader asks its parent first, so core classes like `java.lang.String` always come from the bootstrap loader.'
    ],
    stages: [
      {
        title: 'Lazy initialization',
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println("start");
        System.out.println(Config.NAME);
        System.out.println(Config.port);
        Config.hello();
    }
}
class Config {
    static final String NAME = "app";
    static int port = 8080;
    static {
        System.out.println("Config initialized");
    }
    static void hello() { System.out.println("hello"); }
}`,
        steps: [
          { line: 3, text: '`Main` is initialized so that `main` can run. `Config` has not been touched.', stack: [{ frame: 'main', vars: [] }], heap: [MC, K('not loaded', '—')], out: 'start\n' },
          { line: 4, text: '`NAME` is a compile-time constant (`static final` String from a literal). The compiler copied "app" into Main\'s bytecode, so **Config is not initialized**.', out: 'start\napp\n' },
          { line: 11, text: 'Reading `port` is an active use. Config is loaded and linked (`port` prepared as 0), then initialized: field assignments and static blocks run top to bottom.', stack: [{ frame: 'main', vars: [] }, { frame: 'Config.<clinit>', vars: [] }], heap: [MC, K('initializing', 8080)] },
          { line: 13, text: 'The static block runs as part of the same initializer.', out: 'start\napp\nConfig initialized\n' },
          { line: 5, text: 'Initialization is finished; now `port` is read.', stack: [{ frame: 'main', vars: [] }], heap: [MC, K('initialized', 8080)], out: 'start\napp\nConfig initialized\n8080\n' },
          { line: 6, text: 'Config is already initialized, so the static block does **not** run again.', out: 'start\napp\nConfig initialized\n8080\nhello\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The class loader hierarchy',
        text: [
          [
            '**Bootstrap**: core JDK classes (`java.lang.*`). Implemented in the JVM; shown as `null` from Java.',
            '**Platform**: other JDK modules (`java.sql`, …).',
            '**Application** (system): your classpath / module path.',
            'Custom loaders (application servers, plugins) can load the same class name separately: a class is identified by its name **plus** its loader.'
          ]
        ],
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println(String.class.getClassLoader());
        System.out.println(Main.class.getClassLoader().getName());
        System.out.println(Main.class.getClassLoader().getParent().getName());
    }
}`,
        expect: 'null\napp\nplatform'
      },
      {
        name: 'Lazy singletons for free',
        text: [
          'The "holder" idiom uses lazy class initialization, which the JVM makes thread-safe, to create a singleton only when first needed, with no locks in your code.'
        ],
        code: `public class Main {
    static class Holder {
        static { System.out.println("holder init"); }
        static final Main INSTANCE = new Main();
    }
    static Main get() { return Holder.INSTANCE; }
    public static void main(String[] args) {
        System.out.println("before");
        System.out.println(get() == get());
    }
}`,
        expect: 'before\nholder init\ntrue'
      }
    ],
    table: {
      head: ['Action', 'Initializes the class?'],
      rows: [
        ['`new Config()`', 'yes'],
        ['`Config.hello()` (static method)', 'yes'],
        ['`Config.port` (non-constant static field)', 'yes'],
        ['`Config.NAME` (compile-time constant)', 'no, value is inlined'],
        ['`Config[] arr = new Config[3]`', 'no'],
        ['`Config.class`', 'no'],
        ['`Class.forName("Config")`', 'yes (by default)'],
        ['initializing a subclass', 'yes, parent first']
      ]
    },
    pitfalls: [
      ['Static fields that depend on later static fields', 'They see default values (0/null) because initialization runs top to bottom.'],
      ['Exceptions in static initializers', 'ExceptionInInitializerError, then NoClassDefFoundError on every later use.'],
      ['Changing a constant in a library', 'Callers compiled against the old value keep the inlined old value until recompiled.'],
      ['`ClassNotFoundException` vs `NoClassDefFoundError`', 'The first is from explicit loading (`forName`) failing; the second is a class that was present at compile time but missing or broken at run time.']
    ],
    interview: [
      ['What are the phases of class loading?', ['Loading (read bytes, create Class object), linking (verification, preparation of static fields with defaults, resolution of symbolic references), and initialization (running `<clinit>`: static field initializers and static blocks).']],
      ['What is parent delegation?', ['A class loader first asks its parent to load a class and only tries itself if the parent cannot. It prevents user code from replacing core classes and avoids duplicate loading.']],
      ['When is a class initialized?', ['On first active use: instance creation, static method call, non-constant static field access, reflection like `Class.forName`, subclass initialization, or being the main class.']]
    ],
    say: [
      'Load, link, initialize; initialization is lazy and happens once.',
      'Compile-time constants are inlined and do not trigger initialization.',
      'Parent delegation: bootstrap, platform, application.'
    ],
    checklist: [
      'List what does and does not trigger initialization.',
      'Explain why reading a constant did not run a static block.',
      'Write the holder-idiom singleton.',
      'Name the three built-in class loaders.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    static class Lazy {
        static { System.out.println("init"); }
        static int x = 1;
    }
    public static void main(String[] args) {
        Lazy[] arr = new Lazy[3];
        System.out.println("array " + arr.length);
        System.out.println(Lazy.x);
    }
}`,
          answer: 'array 3\ninit\n1',
          why: 'Creating an array of the type does not initialize it; reading the non-constant static field does.'
        },
        {
          code: `public class Main {
    static class Lazy {
        static { System.out.println("init"); }
    }
    public static void main(String[] args) throws Exception {
        Class<?> c = Lazy.class;
        System.out.println("literal");
        Class.forName("Main$Lazy");
        System.out.println("forName");
    }
}`,
          answer: 'literal\ninit\nforName',
          why: 'A class literal does not initialize; `Class.forName` does by default. Nested classes are named with `$`.'
        },
        {
          code: `public class Main {
    static class P { static { System.out.print("P "); } }
    static class C extends P { static { System.out.print("C "); } static int v = 7; }
    public static void main(String[] args) {
        System.out.println(C.v);
    }
}`,
          answer: 'P C 7',
          why: 'Initializing a class initializes its superclass first.'
        },
        {
          code: `public class Main {
    static int a = b() + 1;
    static int c = 5;
    static int b() { return c; }
    public static void main(String[] args) {
        System.out.println(a + " " + c);
    }
}`,
          answer: '1 5',
          why: 'When `a` is initialized, `c` has only its default 0. Initializers run top to bottom.'
        }
      ],
      fill: [
        {
          q: 'Run code once, when the class initializes.',
          code: `public class Main {
    static int limit;
    [[static]] {
        limit = 3 * 4;
    }
    public static void main(String[] args) {
        System.out.println(limit);
    }
}`,
          expect: '12',
          why: 'A static block runs once during class initialization.'
        },
        {
          q: 'Load a class by name.',
          code: `public class Main {
    public static void main(String[] args) throws Exception {
        Class<?> c = Class.[[forName]]("java.util.ArrayList");
        System.out.println(c.getSimpleName());
    }
}`,
          expect: 'ArrayList',
          why: '`Class.forName` loads (and initializes) a class from its fully qualified name.'
        }
      ],
      bug: [
        {
          q: 'The instance should see a limit of 10.',
          code: `public class Main {
    static final Main INSTANCE = new Main();
    static int count = 10;
    final int seen;
    Main() { seen = count; }
    public static void main(String[] args) {
        System.out.println(INSTANCE.seen);
    }
}`,
          line: 3,
          fix: 'static final int count = 10;',
          expect: '10',
          why: 'INSTANCE is built before `count = 10` runs, so it sees 0. As a compile-time constant, `count` is inlined and already 10.'
        },
        {
          q: 'Load the nested class by name.',
          code: `public class Main {
    static class Plugin { }
    public static void main(String[] args) throws Exception {
        Class<?> c = Class.forName("Main.Plugin");
        System.out.println(c.getSimpleName());
    }
}`,
          line: 4,
          fix: 'Class<?> c = Class.forName("Main$Plugin");',
          expect: 'Plugin',
          why: 'The binary name of a nested class uses `$`, so "Main.Plugin" throws ClassNotFoundException.'
        }
      ]
    }
  });
})();
