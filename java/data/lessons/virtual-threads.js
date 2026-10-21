(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const VT = (id, n, st) => ({ id, type: 'VirtualThread #' + n, fields: [v('state', st)], row: 'vt' });
  const CP = (c1, c2) => ({ id: 'cp', type: 'carrier pool (ForkJoinPool)', fields: [v('carrier-1 runs', c1), v('carrier-2 runs', c2)] });
  const D = (n) => ({ id: 'd', type: 'AtomicInteger done', fields: [v('value', n)] });
  const M = (extra) => [{ thread: 'main', frame: 'main', vars: [r('done', 'd'), r('exec', 'ex')].concat(extra || []) }];
  const EX = { id: 'ex', type: 'VirtualThreadPerTaskExecutor', fields: [v('tasks', '10 000')] };

  registerLesson({
    slug: 'virtual-threads',
    track: 'jvm',
    title: 'Virtual threads (Java 21)',
    one: 'A virtual thread is a *cheap* thread managed by the JVM. When it blocks, it steps off its carrier thread, so a few OS threads can serve *millions* of tasks.',
    idea: [
      'A classic (platform) thread is a thin wrapper around an OS thread with a big fixed stack. You can afford thousands, not millions. Code that blocks on I/O wastes those threads while it waits.',
      'A **virtual thread** is a Java object whose stack lives on the heap and grows as needed. The JVM **mounts** it on a small pool of carrier threads to run. When it blocks (sleep, socket read, lock wait), it is **unmounted**: its stack is parked on the heap and the carrier is free for another virtual thread.',
      'So you can keep the simple "one thread per request, blocking calls" style and still scale like asynchronous code. They help with **I/O-bound** waiting, not CPU-bound work.'
    ],
    stages: [
      {
        title: '10 000 sleeping tasks, two carriers',
        code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) {
        AtomicInteger done = new AtomicInteger();
        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 10_000; i++) {
                exec.submit(() -> {
                    Thread.sleep(10);
                    return done.incrementAndGet();
                });
            }
        }
        System.out.println(done.get());
    }
}`,
        steps: [
          { line: 7, text: 'An executor that starts a new virtual thread for every task. A small carrier pool (about one per CPU core) does the actual running.', stack: M(), heap: [D(0), EX, CP('—', '—')], out: '' },
          { line: 9, text: '10 000 virtual threads are created. Each is just an object on the heap, a few hundred bytes to start.', stack: M([v('i', '0 … 9999')]), heap: [D(0), EX, CP('—', '—'), VT('v1', 1, 'ready'), VT('v2', 2, 'ready'), VT('v3', 3, 'ready'), { id: 'more', type: '… 9 997 more', val: 'ready', row: 'vt' }] },
          { line: 10, text: 'VT #1 and #2 are mounted on the two carriers and run until `sleep(10)`.', heap: [D(0), EX, CP('VT #1', 'VT #2'), VT('v1', 1, 'running'), VT('v2', 2, 'running'), VT('v3', 3, 'ready'), { id: 'more', type: '… 9 997 more', val: 'ready', row: 'vt' }] },
          { line: 10, text: 'Sleeping **unmounts** them: their stacks are parked on the heap and the carriers immediately pick up #3, #4, … No OS thread sits idle.', heap: [D(0), EX, CP('VT #3', 'VT #4'), VT('v1', 1, 'parked (sleeping)'), VT('v2', 2, 'parked (sleeping)'), VT('v3', 3, 'running'), { id: 'more', type: '… 9 997 more', val: 'mostly parked', row: 'vt' }] },
          { line: 11, text: 'When a sleep ends, that virtual thread is remounted on any free carrier and finishes its task.', heap: [D(9_999), EX, CP('VT #9 999', 'VT #10 000'), VT('v1', 1, 'done'), VT('v2', 2, 'done'), VT('v3', 3, 'done'), { id: 'more', type: '… 9 997 more', val: 'finishing', row: 'vt' }] },
          { line: 14, text: 'Closing the executor waits for every task. With platform threads this would need 10 000 OS threads or take far longer.', stack: M(), heap: [D(10_000), EX, CP('—', '—')] },
          { line: 15, text: 'All tasks completed.', stack: [{ thread: 'main', frame: 'main', vars: [r('done', 'd')] }], heap: [D(10_000)], out: '10000\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Creating virtual threads',
        text: [],
        code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread a = Thread.startVirtualThread(() -> System.out.println("quick"));
        a.join();
        Thread b = Thread.ofVirtual().name("worker-", 1).start(() ->
            System.out.println(Thread.currentThread().getName() + " virtual=" + Thread.currentThread().isVirtual()));
        b.join();
    }
}`,
        expect: 'quick\nworker-1 virtual=true'
      },
      {
        name: 'Rules of thumb',
        text: [
          [
            '**Do not pool** virtual threads. They are cheap; create one per task.',
            'Use them for blocking I/O work (HTTP calls, database, files). For CPU-heavy work, a fixed pool sized to the cores is still right.',
            '**Pinning**: in Java 21, blocking inside a `synchronized` block (or native code) keeps the virtual thread stuck to its carrier. Prefer `ReentrantLock` around blocking calls. (Java 24 removed most synchronized pinning.)',
            'Limit concurrency to a scarce resource with a `Semaphore`, not with a small pool.',
            'Be careful with `ThreadLocal` caches: with millions of threads, each gets its own copy.'
          ]
        ]
      }
    ],
    table: {
      head: ['', 'Platform thread', 'Virtual thread'],
      rows: [
        ['Backed by', 'one OS thread for its whole life', 'mounted on a carrier only while running'],
        ['Stack', 'fixed size, reserved up front', 'on the heap, grows as needed'],
        ['Creation cost', 'expensive (~1 ms, ~1 MB)', 'cheap (~µs, ~hundreds of bytes)'],
        ['How many', 'thousands', 'millions'],
        ['Daemon', 'configurable', 'always'],
        ['Best for', 'CPU-bound work, pools', 'blocking I/O, thread-per-request']
      ]
    },
    pitfalls: [
      ['Pooling virtual threads in a fixed pool', 'Throws away the benefit. Use `newVirtualThreadPerTaskExecutor()`.'],
      ['Expecting CPU-bound code to get faster', 'Virtual threads do not add CPU. They only stop wasting threads while waiting.'],
      ['Long blocking calls inside `synchronized` (Java 21)', 'Pins the carrier. Use ReentrantLock.'],
      ['Forgetting they are daemon threads', 'The JVM may exit before they finish; join them or close the executor.']
    ],
    interview: [
      ['What are virtual threads?', ['Lightweight threads implemented by the JVM (Project Loom, final in Java 21). They are scheduled onto a small pool of carrier platform threads and unmounted when they block, so millions can exist and the blocking programming style scales.']],
      ['When should you not use them?', ['For CPU-bound tasks (no benefit over a core-sized pool), when code holds monitors across long blocking calls (pinning in Java 21), or when relying heavily on ThreadLocal caches.']],
      ['Virtual threads vs reactive programming?', ['Both handle many concurrent I/O operations without many OS threads. Virtual threads keep plain sequential code, stack traces and debugging; reactive libraries offer back-pressure and composition operators but are harder to read and debug.']]
    ],
    say: [
      'Virtual threads unmount on blocking, freeing the carrier.',
      'One virtual thread per task; never pool them.',
      'They help I/O-bound concurrency, not CPU-bound speed.'
    ],
    checklist: [
      'Explain mount and unmount.',
      'Start virtual threads three different ways.',
      'Say what pinning is and how to avoid it.',
      'Choose virtual or platform threads for a workload.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        Thread vt = Thread.ofVirtual().unstarted(() -> {});
        System.out.println(vt.isVirtual() + " " + Thread.currentThread().isVirtual());
    }
}`,
          answer: 'true false',
          why: '`main` runs on a platform thread; the new one is virtual.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread.startVirtualThread(() -> System.out.println("in vt")).join();
        System.out.println("after");
    }
}`,
          answer: 'in vt\nafter',
          why: '`join()` waits for the virtual thread just like a platform thread.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Thread t = Thread.ofVirtual().name("w-", 0).unstarted(() -> {});
        System.out.println(t.isDaemon() + " " + t.getName());
    }
}`,
          answer: 'true w-0',
          why: 'Virtual threads are always daemon threads; the builder sets the name with a counter.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<Boolean> f = exec.submit(() -> Thread.currentThread().isVirtual());
            System.out.println(f.get());
        }
    }
}`,
          answer: 'true',
          why: 'Each task submitted to this executor runs in its own virtual thread.'
        }
      ],
      fill: [
        {
          q: 'Run each task in its own virtual thread.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        try (var exec = Executors.[[newVirtualThreadPerTaskExecutor]]()) {
            System.out.println(exec.submit(() -> 6 * 7).get());
        }
    }
}`,
          expect: '42',
          why: 'This executor creates one virtual thread per task; closing it waits for them.'
        },
        {
          q: 'Start a virtual thread with the builder and wait for it.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = Thread.[[ofVirtual]]().start(() -> System.out.println("hi"));
        t.[[join]]();
    }
}`,
          expect: 'hi',
          why: '`Thread.ofVirtual()` returns a builder; `start` creates and starts the thread.'
        }
      ],
      bug: [
        {
          q: 'All 100 tasks should be counted.',
          code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) {
        AtomicInteger done = new AtomicInteger();
        var exec = Executors.newVirtualThreadPerTaskExecutor();
        for (int i = 0; i < 100; i++) {
            exec.submit(() -> { Thread.sleep(20); return done.incrementAndGet(); });
        }
        exec.shutdown();
        System.out.println(done.get());
    }
}`,
          line: 11,
          fix: 'exec.close();',
          expect: '100',
          why: '`shutdown()` does not wait. `close()` (or try-with-resources) waits for every task.'
        },
        {
          q: 'The thread should actually run.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = Thread.ofVirtual().unstarted(() -> System.out.println("ran"));
        t.join();
    }
}`,
          line: 3,
          fix: 'Thread t = Thread.ofVirtual().start(() -> System.out.println("ran"));',
          expect: 'ran',
          why: '`unstarted` only creates the thread; `join` on a thread that never started returns immediately.'
        }
      ]
    }
  });
})();
