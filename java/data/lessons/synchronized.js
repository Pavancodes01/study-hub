(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const C = (n, owner, waiting) => ({ id: 'c', type: 'Counter', fields: [v('n', n), v('monitor owner', owner), v('blocked', waiting)] });
  const S = (n) => ({ id: 's', type: 'Main · static', fields: [v('n', n)] });

  registerLesson({
    slug: 'synchronized',
    track: 'conc',
    title: 'synchronized and the monitor',
    one: '`n++` is *read, add, write*: three steps another thread can cut into. `synchronized` lets only *one thread at a time* hold an object\'s lock.',
    idea: [
      'A **race condition** happens when two threads read and write shared data and the result depends on timing. `n++` looks atomic but compiles to read n, add 1, write n. Two threads can both read 5 and both write 6: one increment is lost.',
      'Every Java object has a built-in lock called a **monitor**. `synchronized` acquires it on entry and releases it on exit, even on exceptions. Other threads trying to enter are BLOCKED until it is free.',
      'Releasing a lock also **publishes** all writes made while holding it to the next thread that takes the same lock (happens-before). So synchronized gives both atomicity and visibility.'
    ],
    stages: [
      {
        title: 'Lost update (no lock)',
        norun: true,
        code: `public class Main {
    static int n = 0;
    public static void main(String[] args) throws InterruptedException {
        Runnable task = () -> { for (int i = 0; i < 100_000; i++) n++; };
        Thread a = new Thread(task), b = new Thread(task);
        a.start(); b.start();
        a.join(); b.join();
        System.out.println(n);
    }
}`,
        steps: [
          { line: 6, text: 'Two threads run the same loop on the shared static `n`. Suppose `n` is 5 right now.',
            stack: [{ thread: 'main', frame: 'main', vars: [] }, { thread: 'a', frame: 'run', vars: [] }, { thread: 'b', frame: 'run', vars: [] }], heap: [S(5)], out: '' },
          { line: 4, text: 'Thread a **reads** n into a register: 5.', stack: [{ thread: 'main', frame: 'main', vars: [] }, { thread: 'a', frame: 'run', vars: [v('tmp', 5)] }, { thread: 'b', frame: 'run', vars: [] }] },
          { line: 4, text: 'Before a writes back, b also **reads** n: still 5.', stack: [{ thread: 'main', frame: 'main', vars: [] }, { thread: 'a', frame: 'run', vars: [v('tmp', 5)] }, { thread: 'b', frame: 'run', vars: [v('tmp', 5)] }] },
          { line: 4, text: 'a writes 5 + 1 = 6.', heap: [S(6)] },
          { line: 4, text: 'b writes its own 5 + 1 = 6. Two increments, but n only went up by one: a **lost update**.', heap: [S(6)] },
          { line: 8, text: 'This program usually prints less than 200000, and a different number each run. That is why no output is shown here.' }
        ]
      },
      {
        title: 'One thread at a time',
        code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Counter c = new Counter();
        Runnable task = () -> { for (int i = 0; i < 1000; i++) c.inc(); };
        Thread a = new Thread(task), b = new Thread(task);
        a.start(); b.start();
        a.join(); b.join();
        System.out.println(c.get());
    }
}
class Counter {
    private int n;
    synchronized void inc() { n++; }
    synchronized int get() { return n; }
}`,
        steps: [
          { line: 3, text: 'The Counter\'s monitor is free.', stack: [{ thread: 'main', frame: 'main', vars: [r('c', 'c')] }], heap: [C(0, 'none', 'none')], out: '' },
          { line: 13, text: 'Thread a enters `inc()` and takes the monitor. b also calls `inc()` and must wait: **BLOCKED**.',
            stack: [{ thread: 'main', frame: 'main (join)', vars: [r('c', 'c')] }, { thread: 'a', frame: 'inc', vars: [r('this', 'c')] }, { thread: 'b', frame: 'inc', state: 'BLOCKED', vars: [r('this', 'c')] }], heap: [C(1, 'a', 'b')] },
          { line: 13, text: 'a leaves `inc`, releasing the lock. b gets it and sees n = 1, because a\'s write was published with the release.',
            stack: [{ thread: 'main', frame: 'main (join)', vars: [r('c', 'c')] }, { thread: 'a', frame: 'run', vars: [] }, { thread: 'b', frame: 'inc', vars: [r('this', 'c')] }], heap: [C(2, 'b', 'none')] },
          { line: 7, text: 'This repeats 2000 times. Increments never overlap, so none are lost.', stack: [{ thread: 'main', frame: 'main', vars: [r('c', 'c')] }], heap: [C(2000, 'none', 'none')] },
          { line: 8, text: 'Always 2000.', out: '2000\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Method vs block',
        text: [
          [
            '`synchronized void m()` locks `this`.',
            '`static synchronized void m()` locks the `Class` object.',
            '`synchronized (lock) { ... }` locks any object you choose, and only around the critical part.',
            'All code that touches the shared state must use the **same** lock.'
          ]
        ],
        code: `public class Main {
    private final Object lock = new Object();
    private int total;
    void add(int x) {
        int doubled = x * 2;          // no lock needed for local work
        synchronized (lock) {
            total += doubled;
        }
    }
    public static void main(String[] args) throws InterruptedException {
        Main m = new Main();
        Thread a = new Thread(() -> { for (int i = 0; i < 500; i++) m.add(1); });
        Thread b = new Thread(() -> { for (int i = 0; i < 500; i++) m.add(1); });
        a.start(); b.start(); a.join(); b.join();
        System.out.println(m.total);
    }
}`,
        expect: '2000'
      },
      {
        name: 'wait and notify',
        text: [
          '`wait()` releases the monitor and sleeps until another thread calls `notify()`/`notifyAll()` on the same object. Both must be called while holding that monitor, and `wait` must be in a `while` loop that re-checks the condition (spurious wakeups). Higher-level tools (`BlockingQueue`, `CountDownLatch`) are usually better.'
        ],
        code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Object lock = new Object();
        boolean[] ready = {false};
        Thread t = new Thread(() -> {
            synchronized (lock) {
                while (!ready[0]) {
                    try { lock.wait(); } catch (InterruptedException e) { return; }
                }
                System.out.println("go");
            }
        });
        t.start();
        synchronized (lock) {
            ready[0] = true;
            lock.notifyAll();
        }
        t.join();
        System.out.println("done");
    }
}`,
        expect: 'go\ndone'
      }
    ],
    pitfalls: [
      ['Different locks for the same data', 'Two threads using different objects as locks do not exclude each other.'],
      ['Locking on a String literal or boxed Integer', 'Those objects are shared JVM-wide. Use a private final Object.'],
      ['`wait()` without holding the lock', 'IllegalMonitorStateException.'],
      ['`if` instead of `while` around `wait()`', 'After waking, the condition may be false again.']
    ],
    interview: [
      ['What does synchronized guarantee?', ['Mutual exclusion (one thread at a time per monitor) and visibility: everything written before releasing a lock is visible to the next thread that acquires the same lock.']],
      ['Is synchronized reentrant?', ['Yes. A thread that holds a monitor can enter other synchronized code on the same object without blocking itself. The JVM counts the nesting.']],
      ['synchronized method vs static synchronized method?', ['An instance method locks `this`; a static one locks the Class object. They are different locks, so they do not block each other.']],
      ['Why must wait() be in a loop?', ['Spurious wakeups are allowed, and with notifyAll another thread may have consumed the condition first. Re-check after waking.']]
    ],
    say: [
      '`n++` is read-modify-write; without a lock, updates get lost.',
      'synchronized gives mutual exclusion and visibility.',
      'Every access to shared state must use the same lock.'
    ],
    checklist: [
      'Walk through a lost update step by step.',
      'Say which object each form of synchronized locks.',
      'Write a correct wait/notify pair.',
      'Explain reentrancy.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    synchronized void outer() {
        System.out.print("outer ");
        inner();
    }
    synchronized void inner() {
        System.out.println("inner");
    }
    public static void main(String[] args) {
        new Main().outer();
    }
}`,
          answer: 'outer inner',
          why: 'The monitor is reentrant: the thread already holds it, so entering `inner` does not block.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Object o = new Object();
        System.out.println(Thread.holdsLock(o));
        synchronized (o) {
            System.out.println(Thread.holdsLock(o));
        }
    }
}`,
          answer: 'false\ntrue',
          why: 'Inside the block the current thread owns the monitor.'
        },
        {
          code: `public class Main {
    static int n;
    static final Object LOCK = new Object();
    public static void main(String[] args) throws InterruptedException {
        Runnable r = () -> { for (int i = 0; i < 500; i++) synchronized (LOCK) { n++; } };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start();
        a.join(); b.join();
        System.out.println(n);
    }
}`,
          answer: '1000',
          why: 'Both threads use the same lock, so no increment is lost.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Object lock = new Object();
        try {
            lock.notify();
        } catch (IllegalMonitorStateException e) {
            System.out.println("IMSE");
        }
    }
}`,
          answer: 'IMSE',
          why: '`notify` (and `wait`) require holding the object\'s monitor.'
        }
      ],
      fill: [
        {
          q: 'Make the counter safe.',
          code: `public class Main {
    private int n;
    [[synchronized]] void inc() { n++; }
    public static void main(String[] args) throws InterruptedException {
        Main m = new Main();
        Runnable r = () -> { for (int i = 0; i < 1000; i++) m.inc(); };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(m.n);
    }
}`,
          expect: '2000',
          why: 'A synchronized method locks `this`, so increments are serialized.'
        },
        {
          q: 'Guard only the shared update.',
          code: `public class Main {
    static final Object lock = new Object();
    static long total;
    public static void main(String[] args) throws InterruptedException {
        Runnable r = () -> {
            for (int x = 0; x < 100; x++) {
                synchronized ([[lock]]) { total += x; }
            }
        };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(total);
    }
}`,
          expect: '9900',
          why: 'Both threads must lock the same object.'
        }
      ],
      bug: [
        {
          q: 'Wait 10 ms on the lock.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Object lock = new Object();
        lock.wait(10);
        System.out.println("waited");
    }
}`,
          line: 4,
          fix: 'synchronized (lock) { lock.wait(10); }',
          expect: 'waited',
          why: '`wait` requires holding the monitor; otherwise IllegalMonitorStateException.'
        },
        {
          q: 'Make the counter compile and stay correct.',
          code: `public class Main {
    private int count;
    void inc() {
        synchronized (count) { count++; }
    }
    public static void main(String[] args) throws InterruptedException {
        Main m = new Main();
        Runnable r = () -> { for (int i = 0; i < 1000; i++) m.inc(); };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(m.count);
    }
}`,
          line: 4,
          fix: 'synchronized (this) { count++; }',
          expect: '2000',
          why: 'You can only lock an object, not a primitive. (Locking a boxed Integer would also be wrong: it changes on every increment.)'
        }
      ]
    }
  });
})();
