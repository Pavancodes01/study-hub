(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const D = (n) => ({ id: 'cls', type: 'Main · static fields', fields: [v('depth', n)] });
  const f = (n, ret) => ({ frame: 'fact(' + n + ')', vars: ret == null ? [v('n', n)] : [v('n', n), v('(returns)', ret)] });
  const M = (vars) => ({ frame: 'main', vars: vars || [] });

  registerLesson({
    slug: 'memory-model',
    track: 'jvm',
    title: 'JVM memory: stack, heap and metaspace',
    one: 'Each thread gets a *stack* of frames for method calls. All objects live in the shared *heap*. Class definitions live in *metaspace*.',
    idea: [
      'Every method call pushes a **frame** onto the current thread\'s stack. The frame holds the parameters, local variables and intermediate results. When the method returns, its frame is popped and all its locals vanish instantly; no garbage collector is involved.',
      'Every object (including arrays and Strings) is created on the **heap**, which all threads share and the garbage collector manages. Locals only hold references to them.',
      'Class metadata (method bytecode, field layouts, the constant pool) lives in **Metaspace**, native memory outside the heap. Static fields are stored with the class\'s `Class` object on the heap.'
    ],
    stages: [
      {
        title: 'Frames come and go',
        code: `public class Main {
    static int depth = 0;
    static int fact(int n) {
        depth++;
        if (n <= 1) return 1;
        return n * fact(n - 1);
    }
    public static void main(String[] args) {
        int r = fact(3);
        System.out.println(r + " " + depth);
    }
}`,
        steps: [
          { line: 9, text: '`main` has a frame. The static `depth` belongs to the class, not to any frame.', stack: [M()], heap: [D(0)], out: '' },
          { line: 4, text: '`fact(3)` pushes a new frame with its own `n`.', stack: [M(), f(3)], heap: [D(1)] },
          { line: 4, text: 'The recursive call pushes another frame. Same method, separate `n`.', stack: [M(), f(3), f(2)], heap: [D(2)] },
          { line: 5, text: 'A third frame. `n <= 1`, so it returns 1: the base case.', stack: [M(), f(3), f(2), f(1, 1)], heap: [D(3)] },
          { line: 6, text: 'The top frame is popped. `fact(2)` computes 2 × 1.', stack: [M(), f(3), f(2, 2)] },
          { line: 6, text: '`fact(3)` computes 3 × 2.', stack: [M(), f(3, 6)] },
          { line: 9, text: 'Back in `main`: every recursive frame is gone, instantly and without GC.', stack: [M([v('r', 6)])] },
          { line: 10, text: 'Three calls were made.', out: '6 3\n' }
        ]
      },
      {
        title: 'What lives where',
        code: `public class Main {
    static String greeting = "hi";
    public static void main(String[] args) {
        int count = 2;
        int[] arr = {count, 3};
        StringBuilder sb = new StringBuilder(greeting);
        sb.append(count);
        System.out.println(sb + " " + arr.length);
    }
}`,
        steps: [
          { line: 3, text: 'Loading `Main` put its bytecode in Metaspace and created the static `greeting`, pointing at a pooled String on the heap.', stack: [M()], heap: [{ id: 'cls', type: 'Main · static fields', fields: [r('greeting', 'g')] }, { id: 'g', type: 'String', val: '"hi"', pool: true }], out: '' },
          { line: 4, text: 'A primitive local: stored directly in the frame.', stack: [M([v('count', 2)])] },
          { line: 5, text: 'The array object is on the heap. The **value** of `count` was copied into it.', stack: [M([v('count', 2), r('arr', 'a')])], heap: [{ id: 'cls', type: 'Main · static fields', fields: [r('greeting', 'g')] }, { id: 'g', type: 'String', val: '"hi"', pool: true }, { id: 'a', type: 'int[2]', cells: [2, 3] }] },
          { line: 6, text: 'A StringBuilder on the heap with its own copy of the characters.', stack: [M([v('count', 2), r('arr', 'a'), r('sb', 'b')])], heap: [{ id: 'cls', type: 'Main · static fields', fields: [r('greeting', 'g')] }, { id: 'g', type: 'String', val: '"hi"', pool: true }, { id: 'a', type: 'int[2]', cells: [2, 3] }, { id: 'b', type: 'StringBuilder', val: '"hi"' }] },
          { line: 7, text: 'Appending changes the builder object in place.', heap: [{ id: 'cls', type: 'Main · static fields', fields: [r('greeting', 'g')] }, { id: 'g', type: 'String', val: '"hi"', pool: true }, { id: 'a', type: 'int[2]', cells: [2, 3] }, { id: 'b', type: 'StringBuilder', val: '"hi2"' }] },
          { line: 8, text: 'When `main` returns, its frame disappears; the heap objects become garbage unless something else still references them.', out: 'hi2 2\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Runtime data areas',
        text: [
          [
            '**Per thread**: program counter, JVM stack (frames), native method stack.',
            '**Shared**: heap (young and old generations), Metaspace (class metadata), code cache (JIT-compiled machine code).',
            'Stack size per thread is set with `-Xss` (often 512 KB to 1 MB). Heap size with `-Xms` / `-Xmx`. Metaspace grows automatically unless capped with `-XX:MaxMetaspaceSize`.'
          ]
        ]
      },
      {
        name: 'Two errors to recognise',
        text: [
          [
            '`StackOverflowError`: too many nested frames, usually recursion without a correct base case.',
            '`OutOfMemoryError: Java heap space`: too many live objects (a leak, or the heap is too small).',
            '`OutOfMemoryError: Metaspace`: too many classes loaded, often from class loader leaks.'
          ]
        ],
        code: `public class Main {
    static int calls = 0;
    static void down() { calls++; down(); }
    public static void main(String[] args) {
        try {
            down();
        } catch (StackOverflowError e) {
            System.out.println("overflow after many calls: " + (calls > 1000));
        }
    }
}`,
        expect: 'overflow after many calls: true'
      },
      {
        name: 'Escape analysis',
        text: [
          'The JIT can notice that an object never leaves a method (it does not "escape") and then skip the heap allocation entirely, keeping its fields in registers. So "every object is on the heap" is the language model; the optimised machine code may do better.'
        ]
      }
    ],
    table: {
      head: ['Area', 'Holds', 'Shared?', 'Freed by'],
      rows: [
        ['JVM stack', 'frames: params, locals, partial results', 'no, one per thread', 'method return'],
        ['Heap', 'all objects and arrays, static fields', 'yes', 'garbage collector'],
        ['Metaspace', 'class metadata, bytecode', 'yes', 'class unloading'],
        ['Code cache', 'JIT-compiled code', 'yes', 'JIT sweeping'],
        ['PC register', 'current instruction', 'no', '—']
      ]
    },
    pitfalls: [
      ['"Primitives are on the stack, objects on the heap"', 'Only primitive **locals** are in frames. Primitive fields live inside their objects on the heap.'],
      ['Deep recursion on big inputs', 'StackOverflowError. Convert to a loop or an explicit stack.'],
      ['Confusing Metaspace with the old PermGen', 'PermGen was removed in Java 8; Metaspace uses native memory.'],
      ['Thinking locals need GC', 'Frames are popped on return; only heap objects need collection.']
    ],
    interview: [
      ['Stack vs heap?', ['The stack is per thread, stores frames with local variables and references, and is freed automatically on return, LIFO. The heap is shared, stores all objects, and is managed by the garbage collector.']],
      ['Where are static variables stored?', ['Since Java 8, with the Class object on the heap. The class metadata itself is in Metaspace.']],
      ['What causes StackOverflowError vs OutOfMemoryError?', ['StackOverflowError: a thread\'s stack runs out of room, typically from runaway recursion. OutOfMemoryError: the heap (or Metaspace, or native memory) cannot satisfy an allocation even after GC.']]
    ],
    say: [
      'Frames on the per-thread stack, objects on the shared heap, class metadata in Metaspace.',
      'Locals disappear on return; heap objects wait for GC.',
      'Recursion depth is limited by stack size.'
    ],
    checklist: [
      'Draw the frames for a recursive call.',
      'Say where a primitive field lives.',
      'Name the error for runaway recursion vs a leak.',
      'Name the JVM flags for stack and heap size.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    static void f(int n) {
        if (n == 0) return;
        System.out.print(n);
        f(n - 1);
        System.out.print(n);
    }
    public static void main(String[] args) {
        f(3);
        System.out.println();
    }
}`,
          answer: '321123',
          why: 'Each frame prints its own `n` on the way down, then again after the deeper call returns.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Integer[] a = new Integer[2];
        int[] b = new int[2];
        System.out.println(a[0] + " " + b[0]);
    }
}`,
          answer: 'null 0',
          why: 'Array slots on the heap get defaults: null for references, 0 for ints.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        ThreadLocal<Integer> tl = ThreadLocal.withInitial(() -> 0);
        tl.set(5);
        Thread t = new Thread(() -> System.out.println("t sees " + tl.get()));
        t.start();
        t.join();
        System.out.println("main sees " + tl.get());
    }
}`,
          answer: 't sees 0\nmain sees 5',
          why: 'A ThreadLocal keeps a separate value per thread; the new thread gets the initial 0.'
        },
        {
          code: `public class Main {
    static int sum(int n) {
        return n == 0 ? 0 : n + sum(n - 1);
    }
    public static void main(String[] args) {
        System.out.println(sum(4));
        try {
            sum(-1);
        } catch (StackOverflowError e) {
            System.out.println("SOE");
        }
    }
}`,
          answer: '10\nSOE',
          why: 'With -1 the base case is never reached, so frames pile up until the stack overflows.'
        }
      ],
      fill: [
        {
          q: 'Stop the recursion.',
          code: `public class Main {
    static int fact(int n) {
        if (n [[<=]] 1) return 1;
        return n * fact(n - 1);
    }
    public static void main(String[] args) {
        System.out.println(fact(5));
    }
}`,
          expect: '120',
          why: 'Without a base case every call pushes another frame until StackOverflowError.'
        },
        {
          q: 'Measure used heap.',
          code: `public class Main {
    public static void main(String[] args) {
        Runtime rt = Runtime.[[getRuntime]]();
        long used = rt.totalMemory() - rt.[[freeMemory]]();
        System.out.println(used > 0 && rt.maxMemory() >= rt.totalMemory());
    }
}`,
          expect: 'true',
          why: '`totalMemory` is the current heap size, `freeMemory` the unused part, `maxMemory` the -Xmx limit.'
        }
      ],
      bug: [
        {
          q: 'Sum 1 to 5.',
          code: `public class Main {
    static int sum(int n) {
        return n + sum(n - 1);
    }
    public static void main(String[] args) {
        System.out.println(sum(5));
    }
}`,
          line: 3,
          fix: 'return n == 0 ? 0 : n + sum(n - 1);',
          expect: '15',
          why: 'There is no base case, so the stack overflows.'
        },
        {
          q: 'Print the last square computed.',
          code: `public class Main {
    public static void main(String[] args) {
        int last = 0;
        for (int i = 0; i < 3; i++) { int sq = i * i; }
        System.out.println(last);
    }
}`,
          line: 4,
          fix: 'for (int i = 0; i < 3; i++) { last = i * i; }',
          expect: '4',
          why: '`sq` is a new local that lives only inside the loop body; `last` is never assigned.'
        }
      ]
    }
  });
})();
