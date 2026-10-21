(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const dog = (name, good) => ({ id: 'o1', type: 'Dog', fields: [v('name (from Animal)', name), v('goodBoy (Dog)', good)] });

  registerLesson({
    slug: 'inheritance',
    track: 'oop',
    title: 'Inheritance and super',
    one: 'A `Dog` object is *one* object containing Animal\'s fields and Dog\'s fields. Constructors run *parent first*.',
    idea: [
      '`class Dog extends Animal` means a Dog has everything an Animal has, plus more. At run time there is a single object on the heap holding the fields of both classes.',
      'Every constructor starts by calling a parent constructor, either explicitly with `super(...)` or with a hidden `super()`. So construction goes from `Object` down to the most specific class.',
      'A subclass can **override** a parent method with the same signature, and call the parent version with `super.method()`.'
    ],
    stages: [
      {
        title: 'Parent first',
        code: `public class Main {
    public static void main(String[] args) {
        Dog d = new Dog("Rex");
        System.out.println(d.describe());
    }
}
class Animal {
    String name;
    Animal(String name) {
        this.name = name;
        System.out.println("Animal ctor");
    }
    String describe() { return name + " the animal"; }
}
class Dog extends Animal {
    boolean goodBoy = true;
    Dog(String name) {
        super(name);
        System.out.println("Dog ctor");
    }
    @Override
    String describe() { return super.describe() + ", a dog"; }
}`,
        steps: [
          { line: 17, text: 'One object is allocated with room for **both** classes\' fields, all set to defaults.',
            stack: [{ frame: 'main', vars: [] }, { frame: 'Dog(String)', vars: [r('this', 'o1'), v('name', '"Rex"')] }], heap: [dog(null, false)], out: '' },
          { line: 9, text: '`super(name)` runs the Animal constructor on the same object.',
            stack: [{ frame: 'main', vars: [] }, { frame: 'Dog(String)', vars: [r('this', 'o1'), v('name', '"Rex"')] }, { frame: 'Animal(String)', vars: [r('this', 'o1'), v('name', '"Rex"')] }] },
          { line: 10, text: 'Animal sets its field.', heap: [dog('"Rex"', false)] },
          { line: 11, text: 'Animal prints first.', out: 'Animal ctor\n' },
          { line: 19, text: 'Back in Dog. Dog\'s field initializers run **after** `super(...)` returns, so `goodBoy` becomes true only now.',
            stack: [{ frame: 'main', vars: [] }, { frame: 'Dog(String)', vars: [r('this', 'o1'), v('name', '"Rex"')] }], heap: [dog('"Rex"', true)], out: 'Animal ctor\nDog ctor\n' },
          { line: 3, text: 'Construction is done; `d` gets the reference.', stack: [{ frame: 'main', vars: [r('d', 'o1')] }] },
          { line: 22, text: 'The object is a Dog, so Dog\'s `describe` runs.', stack: [{ frame: 'main', vars: [r('d', 'o1')] }, { frame: 'Dog.describe', vars: [r('this', 'o1')] }] },
          { line: 13, text: '`super.describe()` calls Animal\'s version on the same object.', stack: [{ frame: 'main', vars: [r('d', 'o1')] }, { frame: 'Dog.describe', vars: [r('this', 'o1')] }, { frame: 'Animal.describe', vars: [r('this', 'o1')] }] },
          { line: 4, text: 'Dog adds its part to the parent\'s result.', stack: [{ frame: 'main', vars: [r('d', 'o1')] }], out: 'Animal ctor\nDog ctor\nRex the animal, a dog\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'What is inherited',
        text: [
          [
            'All fields and methods of the parent are part of the child object. `private` ones exist but cannot be named from the child.',
            'Constructors are **not** inherited.',
            'Java has single inheritance for classes: one `extends`. Multiple types come from interfaces.',
            'Every class ultimately extends `Object`, which gives `equals`, `hashCode`, `toString`, `getClass` and others.'
          ]
        ]
      },
      {
        name: 'Overriding rules',
        text: [
          [
            'Same name and parameter types. Use `@Override` so the compiler checks it.',
            'Return type: same, or a subtype (covariant return).',
            'Access: same or **wider** (`protected` can become `public`, not `private`).',
            'Checked exceptions: same, fewer or narrower.',
            '`final` methods cannot be overridden; `final` classes cannot be extended. `private` and `static` methods are not overridden.'
          ]
        ]
      },
      {
        name: 'Never call overridable methods from a constructor',
        text: [
          'The parent constructor runs before the child\'s fields are initialized. If it calls a method that the child overrides, the child\'s version sees default values.'
        ],
        code: `public class Main {
    static class Base {
        Base() { show(); }
        void show() { System.out.println("base"); }
    }
    static class Sub extends Base {
        String msg = "ready";
        @Override void show() { System.out.println("sub sees " + msg); }
    }
    public static void main(String[] args) {
        new Sub();
    }
}`,
        expect: 'sub sees null'
      },
      {
        name: 'Composition over inheritance',
        text: [
          'Use `extends` only for a true "is-a" relationship where the child can be used anywhere the parent is expected. For "has-a" or "uses-a", keep a field of the other type instead. It is more flexible and does not tie you to the parent\'s internals.'
        ]
      }
    ],
    pitfalls: [
      ['Parent without a no-arg constructor', 'The child must call `super(args)` explicitly, or it will not compile.'],
      ['Misspelled override without `@Override`', 'You silently add a new method and the parent version keeps running.'],
      ['Fields with the same name in parent and child', 'Fields are hidden, not overridden: the declared type decides which one you read.'],
      ['Calling overridable methods in a constructor', 'The override runs before the subclass is initialized.']
    ],
    interview: [
      ['In what order are constructors called?', ['From the top of the hierarchy down: `Object`, then the parent, then the child. Each class\'s field initializers run right after its `super(...)` call returns and before the rest of its constructor body.']],
      ['Why does Java not allow multiple inheritance of classes?', ['To avoid the diamond problem with state and conflicting implementations. Interfaces give multiple inheritance of type, and default-method conflicts must be resolved explicitly.']],
      ['What does `super` do?', ['`super(...)` calls a parent constructor (first line only). `super.m()` calls the parent\'s version of an overridden method. `super.field` reads a hidden parent field.']]
    ],
    say: [
      'A subclass object is one object holding the fields of every class in the chain.',
      'Constructors run parent first; child field initializers run after `super(...)`.',
      'Always use `@Override`.'
    ],
    checklist: [
      'Write the constructor order for a three-class chain.',
      'Explain why an override called from a parent constructor sees null.',
      'List the overriding rules for return type and access.',
      'Fix a child class whose parent has no no-arg constructor.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    static class Base {
        Base() { show(); }
        void show() { System.out.println("base"); }
    }
    static class Sub extends Base {
        int x = 7;
        @Override void show() { System.out.println("sub " + x); }
    }
    public static void main(String[] args) {
        new Sub();
    }
}`,
          answer: 'sub 0',
          why: 'The Base constructor runs before `x = 7`, but the call is dispatched to Sub\'s override, which sees the default 0.'
        },
        {
          code: `public class Main {
    static class A { String n = "A"; }
    static class B extends A { String n = "B"; }
    public static void main(String[] args) {
        A o = new B();
        System.out.println(o.n + ((B) o).n);
    }
}`,
          answer: 'AB',
          why: 'Fields are not polymorphic. The declared type picks which `n` you read.'
        },
        {
          code: `public class Main {
    static class A { A() { System.out.print("A "); } }
    static class B extends A { B() { System.out.print("B "); } }
    static class C extends B { C() { System.out.print("C"); } }
    public static void main(String[] args) {
        new C();
        System.out.println();
    }
}`,
          answer: 'A B C',
          why: 'Each constructor first calls its parent\'s, so the top of the hierarchy prints first.'
        },
        {
          code: `public class Main {
    static class Animal {}
    static class Dog extends Animal {}
    public static void main(String[] args) {
        Object o = new Dog();
        System.out.println(o instanceof Animal);
        System.out.println(o.getClass().getSimpleName());
    }
}`,
          answer: 'true\nDog',
          why: 'A Dog is an Animal. `getClass()` reports the real class of the object, not the variable\'s type.'
        }
      ],
      fill: [
        {
          q: 'Extend Animal and pass the name up.',
          code: `public class Main {
    static class Animal {
        String name;
        Animal(String name) { this.name = name; }
    }
    static class Cat [[extends]] Animal {
        Cat(String n) {
            [[super]](n);
        }
    }
    public static void main(String[] args) {
        System.out.println(new Cat("Tom").name);
    }
}`,
          expect: 'Tom',
          why: 'Animal has no no-arg constructor, so Cat must call `super(n)`.'
        },
        {
          q: 'Reuse the parent\'s sound.',
          code: `public class Main {
    static class Bird { String sound() { return "tweet"; } }
    static class Parrot extends Bird {
        @Override String sound() { return [[super]].sound() + "!"; }
    }
    public static void main(String[] args) {
        System.out.println(new Parrot().sound());
    }
}`,
          expect: 'tweet!',
          why: '`super.sound()` calls the overridden parent version.'
        }
      ],
      bug: [
        {
          q: 'Car should compile and keep its id.',
          code: `public class Main {
    static class Vehicle {
        String id;
        Vehicle(String id) { this.id = id; }
    }
    static class Car extends Vehicle {
        Car(String id) {
            this.id = id;
        }
    }
    public static void main(String[] args) {
        System.out.println(new Car("K-9").id);
    }
}`,
          line: 8,
          fix: 'super(id);',
          expect: 'K-9',
          why: 'Without an explicit call, Java inserts `super()`, but Vehicle has no no-arg constructor.'
        },
        {
          q: 'A cow should say "moo".',
          code: `public class Main {
    static class Animal { String sound() { return "..."; } }
    static class Cow extends Animal {
        String Sound() { return "moo"; }
    }
    public static void main(String[] args) {
        Animal a = new Cow();
        System.out.println(a.sound());
    }
}`,
          line: 4,
          fix: '@Override String sound() { return "moo"; }',
          expect: 'moo',
          why: '`Sound` with a capital S is a new method, not an override. `@Override` would have caught it.'
        }
      ]
    }
  });
})();
