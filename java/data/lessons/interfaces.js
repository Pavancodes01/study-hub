(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const c = { id: 'o1', type: 'Circle', fields: [v('r', 2.0)] };
  const m2 = { frame: 'main', vars: [r('s : Shape', 'o1'), r('p : Printable', 'o1')] };

  registerLesson({
    slug: 'interfaces',
    track: 'oop',
    title: 'Abstract classes and interfaces',
    one: 'An interface says *what* a type can do. An abstract class is a *partly built* parent that can hold state.',
    idea: [
      'An **interface** is a contract: a list of methods a class promises to provide. A class can implement many interfaces. Since Java 8 interfaces can also carry `default` and `static` methods, but no instance fields.',
      'An **abstract class** cannot be instantiated. It can have fields, constructors and finished methods, plus `abstract` methods that subclasses must fill in. A class can extend only one.',
      'One object can be seen through several types at once: the same Circle is a `Shape`, a `Printable` and an `Object`.'
    ],
    stages: [
      {
        title: 'One object, two views',
        code: `public class Main {
    public static void main(String[] args) {
        Shape s = new Circle(2);
        Printable p = (Printable) s;
        System.out.println(s.describe());
        System.out.println(p.label());
    }
}
interface Printable {
    default String label() { return "[" + name() + "]"; }
    String name();
}
abstract class Shape implements Printable {
    abstract double area();
    String describe() { return name() + " area " + area(); }
}
class Circle extends Shape {
    final double r;
    Circle(double r) { this.r = r; }
    double area() { return 3 * r * r; }
    public String name() { return "circle"; }
}`,
        steps: [
          { line: 3, text: 'You cannot write `new Shape()`, but a `Shape` variable can point at a concrete Circle.', stack: [{ frame: 'main', vars: [r('s : Shape', 'o1')] }], heap: [c], out: '' },
          { line: 4, text: 'A `Printable` view of the **same** object. No new object, just another reference type.', stack: [m2] },
          { line: 15, text: '`describe()` is a finished method in the abstract class. It calls `name()` and `area()` without knowing how they are implemented.',
            stack: [m2, { frame: 'Shape.describe', vars: [r('this', 'o1')] }] },
          { line: 20, text: '`area()` dispatches to Circle, the object\'s real class.',
            stack: [m2, { frame: 'Shape.describe', vars: [r('this', 'o1')] }, { frame: 'Circle.area', vars: [r('this', 'o1')] }] },
          { line: 5, text: 'The template in the parent, the details in the child.', stack: [m2], out: 'circle area 12.0\n' },
          { line: 10, text: '`label()` is a **default** method from the interface. Circle never wrote it but inherits it.', stack: [m2, { frame: 'Printable.label', vars: [r('this', 'o1')] }] },
          { line: 6, text: 'The default method calls the abstract `name()`, which Circle implements.', stack: [m2], out: 'circle area 12.0\n[circle]\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'What an interface can contain',
        text: [
          [
            'Abstract methods (implicitly `public abstract`).',
            '`default` methods with a body, inherited by implementers (Java 8).',
            '`static` methods, called as `Interface.method()` and not inherited (Java 8).',
            '`private` helper methods (Java 9).',
            'Constants: every field is implicitly `public static final`.'
          ]
        ]
      },
      {
        name: 'Default method conflicts',
        text: [
          'If a class gets the same default method from two interfaces, it must override it. It can pick one with `Name.super.method()`. A method from a superclass always beats an interface default ("class wins").'
        ],
        code: `public class Main {
    interface Walker { default String move() { return "walk"; } }
    interface Swimmer { default String move() { return "swim"; } }
    static class Duck implements Walker, Swimmer {
        public String move() { return Walker.super.move() + "+" + Swimmer.super.move(); }
    }
    public static void main(String[] args) {
        System.out.println(new Duck().move());
    }
}`,
        expect: 'walk+swim'
      },
      {
        name: 'Which one should I use?',
        text: [
          [
            'Default to an **interface**. It keeps types flexible and lets a class have several roles (`Comparable`, `Runnable`, `Closeable`).',
            'Use an **abstract class** when subclasses share state or constructor logic, or when you want a template method with fixed steps.',
            'A common mix: an interface for the type plus an abstract base class that implements the boring parts (`List` and `AbstractList`).'
          ]
        ]
      }
    ],
    table: {
      head: ['', 'Interface', 'Abstract class'],
      rows: [
        ['Instance fields', 'no (constants only)', 'yes'],
        ['Constructors', 'no', 'yes'],
        ['Method bodies', '`default`, `static`, `private`', 'any'],
        ['A class can have', 'many', 'one'],
        ['Method access', 'public (or private helpers)', 'any'],
        ['Use for', 'capability / role', 'shared base with state']
      ]
    },
    pitfalls: [
      ['Implementing an interface method without `public`', 'Interface methods are public; narrowing access is a compile error.'],
      ['`new` on an abstract class', 'Not allowed. Instantiate a concrete subclass (or an anonymous one).'],
      ['Adding state to an interface', 'Fields in interfaces are constants. Put state in a class.'],
      ['Two defaults with the same signature', 'Compile error until the class overrides the method.']
    ],
    interview: [
      ['Abstract class vs interface?', ['An abstract class can have state, constructors and any access level, and a class can extend only one. An interface has no instance state, its methods are public, and a class can implement many. Since Java 8 both can have method bodies, so the main difference is state and single vs multiple inheritance.']],
      ['Why were default methods added?', ['To evolve interfaces without breaking every implementation. Java 8 added `forEach`, `stream` and others to `Collection` this way.']],
      ['Can an abstract class have a constructor?', ['Yes. It runs when a concrete subclass is created, through `super(...)`, to initialize the shared fields.']],
      ['What is a marker interface?', ['An interface with no methods that tags a class, like `Serializable` or `RandomAccess`. Annotations are often used for this today.']]
    ],
    say: [
      'Interface = contract and roles; abstract class = shared base with state.',
      'A class extends one class but can implement many interfaces.',
      'Default-method conflicts must be resolved with `X.super.m()`; class methods win over defaults.'
    ],
    checklist: [
      'List what an interface may contain since Java 9.',
      'Resolve a diamond between two default methods.',
      'Write a template method in an abstract class.',
      'Choose between an interface and an abstract class for a given design.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    interface A { default String hi() { return "A"; } }
    interface B { default String hi() { return "B"; } }
    static class C implements A, B {
        public String hi() { return B.super.hi() + A.super.hi(); }
    }
    public static void main(String[] args) {
        System.out.println(new C().hi());
    }
}`,
          answer: 'BA',
          why: 'C must override `hi`, and it calls the two defaults explicitly in the order B then A.'
        },
        {
          code: `public class Main {
    interface Greeter { default String greet() { return "interface"; } }
    static class Base { public String greet() { return "class"; } }
    static class Impl extends Base implements Greeter {}
    public static void main(String[] args) {
        System.out.println(new Impl().greet());
    }
}`,
          answer: 'class',
          why: 'A method inherited from a superclass always wins over an interface default.'
        },
        {
          code: `public class Main {
    static abstract class Task {
        Task() { System.out.println("Task"); }
        abstract void run();
    }
    public static void main(String[] args) {
        new Task() {
            void run() { System.out.println("run"); }
        }.run();
    }
}`,
          answer: 'Task\nrun',
          why: 'An anonymous subclass makes the abstract class usable. Its constructor runs first, then `run()`.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Object o = new ArrayList<String>();
        System.out.println(o instanceof List);
        System.out.println(o instanceof RandomAccess);
        System.out.println(o instanceof Deque);
    }
}`,
          answer: 'true\ntrue\nfalse',
          why: 'ArrayList implements List and the marker interface RandomAccess, but not Deque (LinkedList does).'
        }
      ],
      fill: [
        {
          q: 'Give every Shape a describe method for free.',
          code: `public class Main {
    interface Shape {
        double area();
        [[default]] String describe() { return "area=" + area(); }
    }
    static class Sq implements Shape { public double area() { return 9; } }
    public static void main(String[] args) {
        System.out.println(new Sq().describe());
    }
}`,
          expect: 'area=9.0',
          why: 'Only `default` (or `static`/`private`) interface methods may have a body.'
        },
        {
          q: 'Force subclasses to provide a sound.',
          code: `public class Main {
    static [[abstract]] class Animal {
        [[abstract]] String sound();
        String speak() { return "says " + sound(); }
    }
    static class Cow extends Animal { String sound() { return "moo"; } }
    public static void main(String[] args) {
        System.out.println(new Cow().speak());
    }
}`,
          expect: 'says moo',
          why: 'An abstract method has no body; any class containing one must itself be abstract.'
        }
      ],
      bug: [
        {
          q: 'Square should implement Shape.',
          code: `public class Main {
    interface Shape { double area(); }
    static class Square implements Shape {
        double side = 2;
        double area() { return side * side; }
    }
    public static void main(String[] args) {
        System.out.println(new Square().area());
    }
}`,
          line: 5,
          fix: 'public double area() { return side * side; }',
          expect: '4.0',
          why: 'Interface methods are public. Implementing one with package access weakens it, which is a compile error.'
        },
        {
          q: 'Should print "woof".',
          code: `public class Main {
    static abstract class Animal { abstract String sound(); }
    static class Dog extends Animal { String sound() { return "woof"; } }
    public static void main(String[] args) {
        Animal a = new Animal();
        System.out.println(a.sound());
    }
}`,
          line: 5,
          fix: 'Animal a = new Dog();',
          expect: 'woof',
          why: 'Abstract classes cannot be instantiated. Create a concrete subclass.'
        }
      ]
    }
  });
})();
