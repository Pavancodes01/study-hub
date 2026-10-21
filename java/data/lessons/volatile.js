(function () {
  const v = (name, value) => ({ name, value });
  const S = (b) => ({ id: 's', type: 'Main · static (main memory)', fields: [v('running (volatile)', b)] });

  registerLesson({
    slug: 'volatile',
    track: 'conc',
    title: 'volatile and visibility',
    one: 'Without a happens-before edge, one thread may *never see* another thread\'s write. `volatile` makes every read go to the latest written value.',
    idea: [
      'CPUs keep values in registers and caches, and the JIT compiler may reorder or hoist reads. So a write by one thread is not automatically visible to another. The **Java Memory Model** defines when it is: through **happens-before** edges.',
      'A write to a `volatile` field happens-before every later read of that field. Everything the writer did before the volatile write is visible to the reader after the volatile read. It is the lightest tool for a "stop" flag or a published reference.',
      '`volatile` gives visibility and ordering, **not atomicity**. `count++` on a volatile is still a race. Use atomics or locks for that.'
    ],
    stages: [
      {
        title: 'A stop flag',
        code: `public class Main {
    static volatile boolean running = true;
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            long spins = 0;
            while (running) spins++;
            System.out.println("stopped");
        });
        worker.start();
        Thread.sleep(50);
        running = false;
        worker.join();
        System.out.println("main done");
    }
}`,
        steps: [
          { line: 9, text: 'The worker starts and spins while the flag is true.', stack: [{ thread: 'main', frame: 'main', vars: [] }, { thread: 'worker', frame: 'run', vars: [v('spins', 0)] }], heap: [S(true)], out: '' },
          { line: 6, text: 'Each loop iteration **re-reads** `running` from memory because it is volatile. Without volatile, the JIT could read it once and loop forever.', stack: [{ thread: 'main', frame: 'main (sleeping)', vars: [] }, { thread: 'worker', frame: 'run', vars: [v('spins', 'millions')] }] },
          { line: 11, text: 'main writes `false`. A volatile write is immediately published.', heap: [S(false)] },
          { line: 6, text: 'The worker\'s next read sees `false` and leaves the loop.' },
          { line: 7, text: 'The worker finishes.', out: 'stopped\n' },
          { line: 13, text: '`join` waits for it, then main ends.', stack: [{ thread: 'main', frame: 'main', vars: [] }], out: 'stopped\nmain done\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Happens-before edges you get for free',
        text: [
          [
            'Program order within one thread.',
            'Unlocking a monitor → later locking of the same monitor.',
            'Writing a volatile field → later reading of it.',
            '`Thread.start()` → everything in the started thread.',
            'Everything in a thread → another thread returning from `join()` on it.',
            'Actions before putting into a concurrent collection → after taking out.',
            'Constructor end → reads of its `final` fields (safe publication of immutables).'
          ]
        ]
      },
      {
        name: 'volatile is not atomic',
        text: [
          '`count++` on a volatile field is still read, add, write; two threads can interleave and lose updates. Use `AtomicInteger.incrementAndGet()` instead.'
        ]
      },
      {
        name: 'Double-checked locking',
        text: [
          'The classic lazy singleton needs `volatile`; without it another thread could see a non-null reference to a not-yet-fully-constructed object. (The holder-class idiom or an enum is simpler.)'
        ],
        code: `public class Main {
    static class Config {
        private static volatile Config instance;
        static Config get() {
            Config c = instance;
            if (c == null) {
                synchronized (Config.class) {
                    c = instance;
                    if (c == null) instance = c = new Config();
                }
            }
            return c;
        }
    }
    public static void main(String[] args) {
        System.out.println(Config.get() == Config.get());
    }
}`,
        expect: 'true'
      }
    ],
    table: {
      head: ['', 'volatile', 'synchronized', 'Atomic*'],
      rows: [
        ['Visibility', 'yes', 'yes', 'yes'],
        ['Atomic compound updates', 'no', 'yes', 'yes (single variable)'],
        ['Blocking', 'never', 'can block', 'never (CAS retries)'],
        ['Typical use', 'flags, published references', 'multi-field invariants', 'counters, accumulators']
      ]
    },
    pitfalls: [
      ['`volatile int count; count++`', 'Still a race. Use AtomicInteger.'],
      ['Non-volatile stop flag', 'The loop may never see the change.'],
      ['volatile on a reference to a mutable object', 'Only the reference is volatile; changes inside the object are not covered.'],
      ['Double-checked locking without volatile', 'Can publish a half-built object.']
    ],
    interview: [
      ['What does volatile do?', ['It guarantees that reads see the most recent write to that field by any thread, and it prevents reordering around the access (a volatile write publishes all earlier writes). It does not make compound actions atomic.']],
      ['What is happens-before?', ['The Java Memory Model\'s ordering relation: if A happens-before B, then A\'s effects are visible to B. It comes from program order, locks, volatile, thread start/join and similar rules.']],
      ['When is volatile enough?', ['When only one thread writes, or writes do not depend on the current value (like setting a flag), and no invariant involves other variables.']]
    ],
    say: [
      'volatile = visibility + ordering, not atomicity.',
      'Visibility comes from happens-before edges: locks, volatile, start/join.',
      'Use volatile for flags; atomics or locks for counters.'
    ],
    checklist: [
      'Explain why a non-volatile flag can loop forever.',
      'List four happens-before rules.',
      'Write double-checked locking correctly.',
      'Choose between volatile, synchronized and atomics.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        int[] box = {0};
        Thread t = new Thread(() -> box[0] = 42);
        t.start();
        t.join();
        System.out.println(box[0]);
    }
}`,
          answer: '42',
          why: 'Everything a thread does happens-before another thread returns from `join()` on it.'
        },
        {
          code: `public class Main {
    static String msg;
    public static void main(String[] args) throws InterruptedException {
        msg = "ready";
        Thread t = new Thread(() -> System.out.println(msg));
        t.start();
        t.join();
    }
}`,
          answer: 'ready',
          why: 'Writes before `start()` are visible to the started thread.'
        },
        {
          code: `public class Main {
    static volatile boolean stop;
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> {
            int n = 0;
            while (!stop) n++;
            System.out.println("exited");
        });
        t.start();
        Thread.sleep(20);
        stop = true;
        t.join();
    }
}`,
          answer: 'exited',
          why: 'The volatile write becomes visible to the loop\'s next read.'
        },
        {
          code: `import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        AtomicInteger n = new AtomicInteger();
        Runnable r = () -> { for (int i = 0; i < 1000; i++) n.incrementAndGet(); };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(n.get());
    }
}`,
          answer: '2000',
          why: 'An atomic increment cannot be split, unlike `volatile int` with `++`.'
        }
      ],
      fill: [
        {
          q: 'Let the worker see the stop request.',
          code: `public class Main {
    static [[volatile]] boolean stop = false;
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> {
            while (!stop) Thread.onSpinWait();
            System.out.println("exited");
        });
        t.start();
        Thread.sleep(20);
        stop = true;
        t.join();
    }
}`,
          expect: 'exited',
          why: 'A volatile flag is re-read on every iteration and sees the write from main.'
        },
        {
          q: 'Complete the double-checked singleton.',
          code: `public class Main {
    static class Db {
        private static [[volatile]] Db instance;
        static Db get() {
            if (instance == null) {
                synchronized (Db.[[class]]) {
                    if (instance == null) instance = new Db();
                }
            }
            return instance;
        }
    }
    public static void main(String[] args) {
        System.out.println(Db.get() == Db.get());
    }
}`,
          expect: 'true',
          why: '`volatile` prevents publishing a half-built object; locking on the Class object guards creation.'
        }
      ],
      bug: [
        {
          q: 'Make it compile.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        volatile boolean[] done = {false};
        Thread t = new Thread(() -> done[0] = true);
        t.start();
        t.join();
        System.out.println(done[0]);
    }
}`,
          line: 3,
          fix: 'boolean[] done = {false};',
          expect: 'true',
          why: '`volatile` applies only to fields. Local variables are never shared; here `join()` already provides visibility.'
        },
        {
          q: 'Make it compile.',
          code: `public class Main {
    private final volatile int limit = 3;
    public static void main(String[] args) {
        System.out.println(new Main().limit);
    }
}`,
          line: 2,
          fix: 'private final int limit = 3;',
          expect: '3',
          why: 'A field cannot be both `final` and `volatile`. Final fields are already safely visible after construction.'
        }
      ]
    }
  });
})();
