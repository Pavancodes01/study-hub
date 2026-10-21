(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const acct = (id, owner, bal) => ({ id, type: 'Account', fields: [v('owner', owner), v('balance', bal)] });

  registerLesson({
    slug: 'classes',
    track: 'oop',
    title: 'Classes, objects and constructors',
    one: '`new` does three things: *allocate* the object with default values, *run* the constructor chain, and *hand back* a reference.',
    idea: [
      'A class is a blueprint: fields describe what each object stores, methods describe what it can do. `new Account("Ana")` creates one object on the heap from that blueprint.',
      'Before your constructor runs, every field already exists with its default value (0, false, null). Then field initializers run, then the constructor body. Only after all that does the variable get the reference.',
      'Inside an instance method, `this` is a hidden parameter that points at the object the method was called on.'
    ],
    stages: [
      {
        title: 'Building an object',
        code: `public class Main {
    public static void main(String[] args) {
        Account a = new Account("Ana");
        Account b = new Account("Bo", 50);
        a.deposit(20);
        System.out.println(a.owner + " " + a.balance);
        System.out.println(b.owner + " " + b.balance);
    }
}
class Account {
    String owner;
    int balance = 10;
    Account(String owner) {
        this(owner, 10);
    }
    Account(String owner, int balance) {
        this.owner = owner;
        this.balance = balance;
    }
    void deposit(int amount) {
        balance += amount;
    }
}`,
        steps: [
          { line: 13, text: '`new` allocates the object first. All fields hold defaults: `null` and 0. The constructor gets `this` pointing at it.',
            stack: [{ frame: 'main', vars: [] }, { frame: 'Account(String)', vars: [r('this', 'o1'), v('owner', '"Ana"')] }], heap: [acct('o1', null, 0)], out: '' },
          { line: 16, text: '`this(owner, 10)` hands off to the other constructor. That one runs the field initializer `balance = 10` first.',
            stack: [{ frame: 'main', vars: [] }, { frame: 'Account(String)', vars: [r('this', 'o1'), v('owner', '"Ana"')] }, { frame: 'Account(String,int)', vars: [r('this', 'o1'), v('owner', '"Ana"'), v('balance', 10)] }],
            heap: [acct('o1', null, 10)] },
          { line: 17, text: '`this.owner` is the field; plain `owner` is the parameter. Without `this.` you would assign the parameter to itself.', heap: [acct('o1', '"Ana"', 10)] },
          { line: 18, text: 'Same for `balance`.' },
          { line: 3, text: 'Both constructor frames are gone. Only now does `a` receive the reference.', stack: [{ frame: 'main', vars: [r('a', 'o1')] }] },
          { line: 4, text: 'A second, independent object.', stack: [{ frame: 'main', vars: [r('a', 'o1'), r('b', 'o2')] }], heap: [acct('o1', '"Ana"', 10), acct('o2', '"Bo"', 50)] },
          { line: 21, text: '`a.deposit(20)`: `this` is `a`\'s object. `balance` means `this.balance`.',
            stack: [{ frame: 'main', vars: [r('a', 'o1'), r('b', 'o2')] }, { frame: 'deposit', vars: [r('this', 'o1'), v('amount', 20)] }], heap: [acct('o1', '"Ana"', 30), acct('o2', '"Bo"', 50)] },
          { line: 6, text: 'Each object keeps its own fields.', stack: [{ frame: 'main', vars: [r('a', 'o1'), r('b', 'o2')] }], out: 'Ana 30\n' },
          { line: 7, text: '`b` was never touched.', out: 'Ana 30\nBo 50\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Constructors',
        text: [
          [
            'Same name as the class, **no return type**. Add `void` and it becomes an ordinary method.',
            'If you write no constructor, Java adds an empty no-argument one. As soon as you write any constructor, that default disappears.',
            '`this(...)` calls another constructor of the same class; it must be the first statement.',
            'Constructors are not inherited and cannot be overridden.'
          ]
        ]
      },
      {
        name: 'Initialization order',
        text: [
          'For one class: fields get defaults, then field initializers and instance `{ }` blocks run top to bottom, then the constructor body runs.'
        ],
        code: `public class Main {
    String log = "field ";
    {
        log += "block ";
    }
    Main() {
        log += "constructor";
    }
    public static void main(String[] args) {
        System.out.println(new Main().log);
    }
}`,
        expect: 'field block constructor'
      },
      {
        name: 'Methods that return `this`',
        text: [
          'Returning `this` lets callers chain calls (a "fluent" API), as `StringBuilder.append` does.'
        ],
        code: `public class Main {
    static class Query {
        StringBuilder sql = new StringBuilder("SELECT *");
        Query from(String t) { sql.append(" FROM ").append(t); return this; }
        Query where(String c) { sql.append(" WHERE ").append(c); return this; }
    }
    public static void main(String[] args) {
        System.out.println(new Query().from("users").where("age > 18").sql);
    }
}`,
        expect: 'SELECT * FROM users WHERE age > 18'
      }
    ],
    pitfalls: [
      ['`void` on a constructor', 'It becomes a method named like the class. `new X(args)` then fails to compile.'],
      ['`name = name;` in a constructor', 'Assigns the parameter to itself. Write `this.name = name;`.'],
      ['Expecting a no-arg constructor after adding one with arguments', 'The default constructor is gone; declare it yourself if you need it.'],
      ['Calling overridable methods from a constructor', 'A subclass override can run before the subclass fields are set. See the inheritance lesson.']
    ],
    interview: [
      ['What happens when you call `new`?', ['The JVM makes sure the class is loaded, allocates memory on the heap, sets every field to its default, runs the constructor chain (superclass first, then field initializers and the constructor body of each class) and returns the reference.']],
      ['What is `this`?', ['A reference to the current object, passed implicitly to every instance method and constructor. It is used to reach fields hidden by parameters, to pass the object along, and as `this(...)` to chain constructors.']],
      ['Can a constructor be private?', ['Yes. It stops other classes from calling `new`. Used for singletons, factory methods (`of`, `valueOf`) and utility classes.']]
    ],
    say: [
      '`new` allocates with defaults, runs constructors, then returns the reference.',
      '`this` is the object the method was called on.',
      'Writing any constructor removes the default one.'
    ],
    checklist: [
      'State the initialization order of a single object.',
      'Chain constructors with `this(...)`.',
      'Spot a constructor that is accidentally a method.',
      'Explain why `name = name` does nothing useful.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    int x;
    Main(int x) {
        x = x;
    }
    public static void main(String[] args) {
        System.out.println(new Main(5).x);
    }
}`,
          answer: '0',
          why: 'Inside the constructor, `x` means the parameter. The field keeps its default 0.'
        },
        {
          code: `public class Main {
    String log = "f";
    {
        log += "i";
    }
    Main() {
        log += "c";
    }
    public static void main(String[] args) {
        System.out.println(new Main().log);
    }
}`,
          answer: 'fic',
          why: 'Field initializer, then instance block, then constructor body.'
        },
        {
          code: `public class Main {
    int n;
    Main inc() {
        n++;
        return this;
    }
    public static void main(String[] args) {
        System.out.println(new Main().inc().inc().inc().n);
    }
}`,
          answer: '3',
          why: 'Every `inc()` returns the same object, so all three calls change one counter.'
        },
        {
          code: `public class Main {
    static class Point { int x; }
    public static void main(String[] args) {
        Point p = new Point();
        Point q = p;
        q.x = 5;
        p = new Point();
        System.out.println(p.x + " " + q.x);
    }
}`,
          answer: '0 5',
          why: '`q` keeps pointing at the first object. `p` is re-pointed at a fresh Point with x = 0.'
        }
      ],
      fill: [
        {
          q: 'Store the parameter in the field.',
          code: `public class Main {
    String name;
    Main(String name) {
        this.[[name]] = name;
    }
    public static void main(String[] args) {
        System.out.println(new Main("Kai").name);
    }
}`,
          expect: 'Kai',
          why: '`this.name` is the field; `name` alone is the parameter.'
        },
        {
          q: 'Make the no-arg constructor reuse the other one.',
          code: `public class Main {
    int x, y;
    Main() {
        [[this]](1, 1);
    }
    Main(int x, int y) {
        this.x = x;
        this.y = y;
    }
    public static void main(String[] args) {
        Main p = new Main();
        System.out.println(p.x + "," + p.y);
    }
}`,
          expect: '1,1',
          why: '`this(...)` calls another constructor of the same class and must come first.'
        }
      ],
      bug: [
        {
          q: 'Should print "Rex".',
          code: `public class Main {
    public static void main(String[] args) {
        Dog d = new Dog("Rex");
        System.out.println(d.name);
    }
}
class Dog {
    String name;
    void Dog(String name) {
        this.name = name;
    }
}`,
          line: 9,
          fix: 'Dog(String name) {',
          expect: 'Rex',
          why: 'With `void` this is a method, so `Dog` has only the default constructor and `new Dog("Rex")` does not compile.'
        },
        {
          q: 'The title should be stored.',
          code: `public class Main {
    static class Book {
        String title;
        Book(String title) {
            title = title;
        }
    }
    public static void main(String[] args) {
        System.out.println(new Book("Dune").title);
    }
}`,
          line: 5,
          fix: 'this.title = title;',
          expect: 'Dune',
          why: 'The parameter hides the field. `this.` reaches the field.'
        }
      ]
    }
  });
})();
