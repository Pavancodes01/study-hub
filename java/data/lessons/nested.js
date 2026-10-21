(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const M = (n) => ({ id: 'm1', type: 'Main', fields: [v('count', n)] });
  const C = { id: 'c1', type: 'Main.Clicker (inner)', fields: [r('this$0 (hidden)', 'm1')] };
  const G = { id: 'g1', type: 'Main.Config (static nested)', fields: [v('size', 3)] };

  registerLesson({
    slug: 'nested',
    track: 'oop',
    title: 'Nested, inner and anonymous classes',
    one: 'An inner class object carries a *hidden reference* to its outer object. A static nested class does not.',
    idea: [
      'A class declared inside another class is **nested**. If it is `static`, it is just a class that lives in the outer class\'s namespace. If it is not static, it is an **inner** class, and each instance is tied to an instance of the outer class.',
      'The tie is a hidden field (`this$0`) pointing at the outer object. That is how the inner class can read outer fields, and also why an inner object keeps its outer object alive.',
      'Anonymous classes and lambdas can use local variables from the enclosing method, but only if those variables are **effectively final**, because they get a copy.'
    ],
    stages: [
      {
        title: 'Hidden references and captured copies',
        code: `public class Main {
    private int count = 0;
    class Clicker {
        void click() { count++; }
    }
    static class Config {
        int size = 3;
    }
    public static void main(String[] args) {
        Main outer = new Main();
        Main.Clicker c = outer.new Clicker();
        c.click();
        c.click();
        Config cfg = new Config();
        int base = 10;
        Runnable r = new Runnable() {
            public void run() { System.out.println(base + outer.count + cfg.size); }
        };
        r.run();
    }
}`,
        steps: [
          { line: 10, text: 'An outer object.', stack: [{ frame: 'main', vars: [r('outer', 'm1')] }], heap: [M(0)], out: '' },
          { line: 11, text: 'An inner object can only be made from an outer one: `outer.new Clicker()`. It stores a hidden reference to `outer`.',
            stack: [{ frame: 'main', vars: [r('outer', 'm1'), r('c', 'c1')] }], heap: [M(0), C] },
          { line: 4, text: '`count++` inside Clicker really means `this$0.count++`. It changes the outer object.',
            stack: [{ frame: 'main', vars: [r('outer', 'm1'), r('c', 'c1')] }, { frame: 'Clicker.click', vars: [r('this', 'c1')] }], heap: [M(1), C] },
          { line: 13, text: 'Second click.', stack: [{ frame: 'main', vars: [r('outer', 'm1'), r('c', 'c1')] }], heap: [M(2), C] },
          { line: 14, text: 'A static nested class needs no outer object and has no hidden reference.',
            stack: [{ frame: 'main', vars: [r('outer', 'm1'), r('c', 'c1'), r('cfg', 'g1')] }], heap: [M(2), C, G] },
          { line: 15, text: 'A plain local int.', stack: [{ frame: 'main', vars: [r('outer', 'm1'), r('c', 'c1'), r('cfg', 'g1'), v('base', 10)] }] },
          { line: 16, text: 'The anonymous class object gets **copies** of the locals it uses: the value 10 and the two references. That is why those locals must not change afterwards.',
            stack: [{ frame: 'main', vars: [r('outer', 'm1'), r('c', 'c1'), r('cfg', 'g1'), v('base', 10), r('r', 'a1')] }],
            heap: [M(2), C, G, { id: 'a1', type: 'Main$1 (anonymous)', fields: [v('val$base', 10), r('val$outer', 'm1'), r('val$cfg', 'g1')] }] },
          { line: 17, text: '`run()` reads its captured copies: 10 + 2 + 3.',
            stack: [{ frame: 'main', vars: [r('outer', 'm1'), r('c', 'c1'), r('cfg', 'g1'), v('base', 10), r('r', 'a1')] }, { frame: 'Main$1.run', vars: [r('this', 'a1')] }], out: '15\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Four kinds',
        text: [
          [
            '**Static nested**: `static class Node`. No outer instance. Use it by default (linked-list nodes, builders, map entries).',
            '**Inner**: `class Itr`. Needs an outer instance and can use its fields. Typical for iterators over the outer collection.',
            '**Local**: declared inside a method. Rare.',
            '**Anonymous**: `new Interface() { ... }` in an expression. Mostly replaced by lambdas for single-method interfaces.'
          ]
        ]
      },
      {
        name: 'Anonymous class vs lambda',
        text: [
          'Inside an anonymous class, `this` is the anonymous object. Inside a lambda, `this` is the enclosing object, because a lambda does not create a new scope. An anonymous class can also have fields and implement interfaces with several methods.'
        ],
        code: `public class Main {
    String name = "outer";
    void test() {
        Runnable a = new Runnable() {
            String name = "anon";
            public void run() { System.out.println(this.name); }
        };
        Runnable b = () -> System.out.println(this.name);
        a.run();
        b.run();
    }
    public static void main(String[] args) {
        new Main().test();
    }
}`,
        expect: 'anon\nouter'
      },
      {
        name: 'Effectively final',
        text: [
          'A local variable is effectively final if it is never reassigned after it is set. Only such variables can be used inside lambdas and anonymous or local classes. If you need a changing counter, use an `AtomicInteger`, a one-element array, or a field.'
        ]
      }
    ],
    pitfalls: [
      ['Inner class where static nested would do', 'Every instance keeps the outer object alive: a classic memory leak (for example, long-lived listeners).'],
      ['`new Inner()` from a static method', 'Compile error: there is no outer instance. Make the class static or use `outer.new Inner()`.'],
      ['Reassigning a captured local', 'Compile error: it must be effectively final.'],
      ['Shadowed fields in inner classes', 'Plain `count` means the inner one. Use `Outer.this.count` for the outer field.']
    ],
    interview: [
      ['Static nested vs inner class?', ['A static nested class has no link to an outer instance and can be created alone. An inner class instance holds a hidden reference to its outer instance and can access its fields, which costs memory and can cause leaks.']],
      ['Why must captured variables be effectively final?', ['The lambda or anonymous class gets a copy of the value. If the original could change, the copy would be stale and confusing, so Java forbids it.']],
      ['Lambda vs anonymous class?', ['A lambda only implements a functional interface, has no own state, and `this` refers to the enclosing instance. An anonymous class creates a real class, can have fields, and `this` refers to itself.']]
    ],
    say: [
      'Prefer static nested classes; inner classes hold a hidden outer reference.',
      'Captured locals are copied, so they must be effectively final.',
      'In a lambda `this` is the enclosing object.'
    ],
    checklist: [
      'Create an inner class instance from `main`.',
      'Draw the hidden `this$0` reference.',
      'Read an outer field shadowed by an inner one.',
      'Explain `this` in a lambda vs an anonymous class.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    int x = 1;
    class In {
        int x = 2;
        String show(int x) { return x + " " + this.x + " " + Main.this.x; }
    }
    public static void main(String[] args) {
        System.out.println(new Main().new In().show(3));
    }
}`,
          answer: '3 2 1',
          why: 'Plain `x` is the parameter, `this.x` the inner field, `Main.this.x` the outer field.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>() {{ add("a"); add("b"); }};
        System.out.println(l + " " + (l.getClass() == ArrayList.class));
    }
}`,
          answer: '[a, b] false',
          why: '"Double brace" initialization makes an anonymous subclass of ArrayList with an instance initializer, so the class is not ArrayList itself.'
        },
        {
          code: `import java.util.*;
import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        List<Supplier<Integer>> fs = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            int j = i;
            fs.add(() -> j * j);
        }
        for (Supplier<Integer> f : fs) System.out.print(f.get() + " ");
        System.out.println();
    }
}`,
          answer: '0 1 4',
          why: 'Each round has its own `j`, and each lambda captured a copy of that round\'s value.'
        },
        {
          code: `public class Main {
    static class Node {
        int val;
        Node next;
        Node(int val, Node next) { this.val = val; this.next = next; }
    }
    public static void main(String[] args) {
        Node head = new Node(1, new Node(2, new Node(3, null)));
        int sum = 0;
        for (Node n = head; n != null; n = n.next) sum += n.val;
        System.out.println(sum);
    }
}`,
          answer: '6',
          why: 'A static nested Node needs no outer instance, so `main` can create it directly.'
        }
      ],
      fill: [
        {
          q: 'Create an inner object from an outer one.',
          code: `public class Main {
    class Inner { String hi() { return "hi"; } }
    public static void main(String[] args) {
        Main out = new Main();
        Main.Inner in = out.[[new]] Inner();
        System.out.println(in.hi());
    }
}`,
          expect: 'hi',
          why: 'An inner class needs an outer instance: `outer.new Inner()`.'
        },
        {
          q: 'Sort by length with an anonymous Comparator.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(List.of("ccc", "a", "bb"));
        Collections.sort(l, new [[Comparator]]<String>() {
            public int [[compare]](String a, String b) { return a.length() - b.length(); }
        });
        System.out.println(l);
    }
}`,
          expect: '[a, bb, ccc]',
          why: 'An anonymous class implements the interface right where it is needed. Today you would write a lambda.'
        }
      ],
      bug: [
        {
          q: '`main` should be able to create a Node.',
          code: `public class Main {
    class Node {
        int val = 5;
    }
    public static void main(String[] args) {
        Node n = new Node();
        System.out.println(n.val);
    }
}`,
          line: 2,
          fix: 'static class Node {',
          expect: '5',
          why: 'An inner class needs an outer instance, which a static method does not have.'
        },
        {
          q: 'Two steps should advance the outer counter to 2.',
          code: `public class Main {
    static class Counter {
        int count = 0;
        class Step {
            int count = 0;
            void go() { count++; }
        }
    }
    public static void main(String[] args) {
        Counter c = new Counter();
        Counter.Step s = c.new Step();
        s.go();
        s.go();
        System.out.println(c.count);
    }
}`,
          line: 6,
          fix: 'void go() { Counter.this.count++; }',
          expect: '2',
          why: 'The inner field `count` shadows the outer one. Name the outer field with `Counter.this`.'
        }
      ]
    }
  });
})();
