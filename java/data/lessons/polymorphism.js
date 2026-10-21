(function () {
  const r = (name, ref) => ({ name, ref });
  const D = (id) => ({ id, type: 'Dog', fields: [] });
  const main2 = [{ frame: 'main', vars: [r('a : Animal', 'o1'), r('d : Dog', 'o2')] }];

  registerLesson({
    slug: 'polymorphism',
    track: 'oop',
    title: 'Polymorphism: overriding vs overloading',
    one: 'Overriding is chosen at *run time* by the object. Overloading is chosen at *compile time* by the declared types.',
    idea: [
      'A variable has a declared type (`Animal a`) and points at an object with a real class (`Dog`). The declared type decides **which methods you may call**. The object decides **which override runs**. That second part is dynamic dispatch.',
      'Overloading is different: several methods with the same name but different parameter lists. The compiler picks one by looking only at the declared types of the arguments, before the program runs.',
      'Mixing them up is the source of many interview puzzles.'
    ],
    stages: [
      {
        title: 'Which method runs?',
        code: `public class Main {
    static String kind(Animal a) { return "animal"; }
    static String kind(Dog d) { return "dog"; }
    public static void main(String[] args) {
        Animal a = new Dog();
        Dog d = new Dog();
        System.out.println(a.speak());
        System.out.println(kind(a));
        System.out.println(kind(d));
    }
}
class Animal {
    String speak() { return "..."; }
}
class Dog extends Animal {
    @Override String speak() { return "woof"; }
}`,
        steps: [
          { line: 5, text: 'The variable is declared `Animal` but the object is a `Dog`.', stack: [{ frame: 'main', vars: [r('a : Animal', 'o1')] }], heap: [D('o1')], out: '' },
          { line: 6, text: 'A second Dog, this time in a `Dog` variable.', stack: main2, heap: [D('o1'), D('o2')] },
          { line: 16, text: '`a.speak()`: the JVM checks the **object\'s** class at run time. It is a Dog, so Dog\'s override runs.',
            stack: [main2[0], { frame: 'Dog.speak', vars: [r('this', 'o1')] }] },
          { line: 7, text: 'Overriding follows the object.', stack: main2, out: 'woof\n' },
          { line: 2, text: '`kind(a)`: the compiler chose this overload from the declared type `Animal`. The object being a Dog does not matter.',
            stack: [main2[0], { frame: 'kind(Animal)', vars: [r('a', 'o1')] }] },
          { line: 8, text: 'Overloading follows the declared type.', stack: main2, out: 'woof\nanimal\n' },
          { line: 3, text: 'With a `Dog`-typed argument the compiler picks the more specific overload.',
            stack: [main2[0], { frame: 'kind(Dog)', vars: [r('d', 'o2')] }] },
          { line: 9, text: 'Same object type, different result, because the declared types differ.', stack: main2, out: 'woof\nanimal\ndog\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Why polymorphism matters',
        text: [
          'Code written against a parent type keeps working with every new subclass. A loop over `List<Shape>` calls `area()` on each element and each shape computes its own.'
        ],
        code: `import java.util.*;

public class Main {
    interface Shape { double area(); }
    record Square(double s) implements Shape { public double area() { return s * s; } }
    record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }

    public static void main(String[] args) {
        List<Shape> shapes = List.of(new Square(2), new Circle(1));
        double total = 0;
        for (Shape s : shapes) total += s.area();
        System.out.printf(Locale.ROOT, "%.2f%n", total);
    }
}`,
        expect: '7.14'
      },
      {
        name: 'How overloads are chosen',
        text: [
          'The compiler tries three phases and stops at the first that finds a match:',
          [
            '1. Exact match or **widening** of primitives (`int` to `long`), without boxing.',
            '2. Allow **boxing/unboxing** (`int` to `Integer`).',
            '3. Allow **varargs** (`int...`).'
          ],
          'If several methods match in a phase, the most specific one wins. With `null`, a `String` parameter is more specific than `Object`.'
        ]
      },
      {
        name: 'Casting',
        text: [
          '**Upcasting** (Dog to Animal) is automatic and always safe. **Downcasting** (Animal to Dog) needs an explicit cast and throws `ClassCastException` if the object is not really a Dog. Check first, ideally with pattern matching: `if (a instanceof Dog d) d.fetch();`'
        ]
      }
    ],
    table: {
      head: ['', 'Overriding', 'Overloading'],
      rows: [
        ['Where', 'subclass, same signature', 'same class (or subclass), different parameters'],
        ['Chosen', 'at run time, by object class', 'at compile time, by declared argument types'],
        ['Return type', 'same or covariant', 'can differ freely'],
        ['Applies to static / private', 'no', 'yes'],
        ['Also called', 'runtime polymorphism', 'compile-time polymorphism']
      ]
    },
    pitfalls: [
      ['Expecting overloads to follow the object type', 'They follow the declared type. `kind(a)` with `Animal a = new Dog()` picks `kind(Animal)`.'],
      ['Expecting fields to be polymorphic', 'Only methods are dispatched dynamically. Fields use the declared type.'],
      ['Downcasting without checking', '`ClassCastException`. Use `instanceof` with a pattern variable.'],
      ['"Overriding" a private method', 'Private methods are not inherited, so the child just declares a new method and the parent keeps calling its own.']
    ],
    interview: [
      ['What is dynamic dispatch?', ['When an overridden method is called through a reference, the JVM picks the implementation from the object\'s actual class at run time (via the class\'s method table), not from the reference type.']],
      ['Can you override a static or private method?', ['No. Static methods are hidden and resolved at compile time. Private methods are not visible to subclasses, so a same-named method in the child is unrelated.']],
      ['`f(null)` with `f(Object)` and `f(String)`: which runs?', ['`f(String)`, the most specific applicable method. With `f(String)` and `f(Integer)` it would be ambiguous and not compile.']]
    ],
    say: [
      'Declared type decides what you can call; object type decides which override runs.',
      'Overloads are resolved at compile time, overrides at run time.',
      'Widening beats boxing, which beats varargs.'
    ],
    checklist: [
      'Predict a call with `Animal a = new Dog()` for both an override and an overload.',
      'Explain why fields are not polymorphic.',
      'Downcast safely with `instanceof`.',
      'Order the three overload-resolution phases.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    static void f(Object o) { System.out.println("Object"); }
    static void f(String s) { System.out.println("String"); }
    public static void main(String[] args) {
        f(null);
    }
}`,
          answer: 'String',
          why: 'Both accept `null`. `String` is more specific than `Object`, so it wins.'
        },
        {
          code: `public class Main {
    static void g(long x) { System.out.println("long"); }
    static void g(Integer x) { System.out.println("Integer"); }
    public static void main(String[] args) {
        g(5);
    }
}`,
          answer: 'long',
          why: 'Phase 1 (widening without boxing) already finds `g(long)`, so boxing is never considered.'
        },
        {
          code: `public class Main {
    static class P {
        String name = "P";
        String get() { return name; }
    }
    static class C extends P {
        String name = "C";
        @Override String get() { return name; }
    }
    public static void main(String[] args) {
        P p = new C();
        System.out.println(p.name + " " + p.get());
    }
}`,
          answer: 'P C',
          why: 'The field is read from the declared type P. The method is dispatched to C, which reads its own field.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Object o = "hi";
        try {
            Integer i = (Integer) o;
            System.out.println(i);
        } catch (ClassCastException e) {
            System.out.println("CCE");
        }
    }
}`,
          answer: 'CCE',
          why: 'The cast compiles because `Object` might be an Integer, but at run time the object is a String.'
        }
      ],
      fill: [
        {
          q: 'Sum the areas through the interface.',
          code: `import java.util.*;

public class Main {
    interface Shape { int area(); }
    static class Sq implements Shape { public int area() { return 4; } }
    static class Rect implements Shape { public int area() { return 6; } }
    public static void main(String[] args) {
        List<Shape> shapes = List.of(new Sq(), new Rect());
        int total = 0;
        for (Shape s : shapes) total += s.[[area]]();
        System.out.println(total);
    }
}`,
          expect: '10',
          why: 'Each element runs its own `area()` through the common interface.'
        },
        {
          q: 'Let the compiler check the override.',
          code: `public class Main {
    static class Item {
        String label = "pen";
        @[[Override]]
        public String toString() { return "Item:" + label; }
    }
    public static void main(String[] args) {
        System.out.println(new Item());
    }
}`,
          expect: 'Item:pen',
          why: '`@Override` makes the compiler fail if the method does not really override something.'
        }
      ],
      bug: [
        {
          q: 'Sub should change what `show()` prints.',
          code: `public class Main {
    static class Base {
        private String id() { return "base"; }
        String show() { return id(); }
    }
    static class Sub extends Base {
        String id() { return "sub"; }
    }
    public static void main(String[] args) {
        System.out.println(new Sub().show());
    }
}`,
          line: 3,
          fix: 'String id() { return "base"; }',
          expect: 'sub',
          why: 'A private method cannot be overridden, so `show()` always calls Base\'s own `id()`.'
        },
        {
          q: 'Only dogs should fetch; cats are skipped.',
          code: `import java.util.*;

public class Main {
    static class Animal {}
    static class Dog extends Animal { String fetch() { return "ball"; } }
    static class Cat extends Animal {}
    public static void main(String[] args) {
        List<Animal> zoo = List.of(new Dog(), new Cat());
        for (Animal a : zoo) {
            System.out.println(((Dog) a).fetch());
        }
    }
}`,
          line: 10,
          fix: 'if (a instanceof Dog d) System.out.println(d.fetch());',
          expect: 'ball',
          why: 'Casting the Cat throws ClassCastException. Check the type with a pattern first.'
        }
      ]
    }
  });
})();
