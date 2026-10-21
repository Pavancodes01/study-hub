(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const C = (n) => ({ id: 'c', type: 'Counter', fields: [v('value', n)] });
  const T = (state) => ({ id: 't', type: 'Thread "worker"', fields: [v('state', state), r('target', 'lam')] });
  const L = { id: 'lam', type: 'lambda : Runnable', fields: [r('captured c', 'c')] };
  const M = (vars) => ({ thread: 'main', frame: 'main', vars });

  registerLesson({
    slug: 'threads',
    track: 'conc',
    title: 'Threads and Runnable',
    one: 'Every thread has its *own stack* but they all share *one heap*. That sharing is both the point and the danger.',
    idea: [
      'A `Thread` runs code concurrently with the rest of the program. You give it a `Runnable` (usually a lambda) and call `start()`. The JVM creates a new call stack and runs `run()` on it.',
      'Local variables live in each thread\'s own stack, so they are private. Objects live on the shared heap, so two threads holding a reference to the same object can both change it. Everything in the next lessons is about controlling that.',
      '`join()` waits for a thread to finish. Calling `run()` directly does **not** start a thread; it just runs the code on the current one.'
    ],
    stages: [
      {
        title: 'Two stacks, one heap',
        code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Counter c = new Counter();
        Thread t = new Thread(() -> c.add(5), "worker");
        System.out.println(t.getState());
        t.start();
        t.join();
        System.out.println(t.getState() + " " + c.value);
    }
}
class Counter {
    int value;
    void add(int n) { value += n; }
}`,
        steps: [
          { line: 3, text: 'The `main` thread creates a Counter on the heap.', stack: [M([r('c', 'c')])], heap: [C(0)], out: '' },
          { line: 4, text: 'A Thread **object** is created, holding the Runnable. No new thread is running yet.', stack: [M([r('c', 'c'), r('t', 't')])], heap: [C(0), T('NEW'), L] },
          { line: 5, text: 'State NEW: not started.', out: 'NEW\n' },
          { line: 13, text: '`start()` asks the JVM for a new OS thread with **its own stack**. That stack runs the lambda, which calls `add` on the **shared** Counter.',
            stack: [M([r('c', 'c'), r('t', 't')]), { thread: 'worker', frame: 'run (lambda)', vars: [r('c', 'c')] }, { thread: 'worker', frame: 'Counter.add', vars: [r('this', 'c'), v('n', 5)] }],
            heap: [C(5), T('RUNNABLE'), L] },
          { line: 7, text: '`join()` blocks `main` until the worker finishes. The worker\'s stack is gone.', stack: [M([r('c', 'c'), r('t', 't')])], heap: [C(5), T('TERMINATED'), L] },
          { line: 8, text: 'After `join`, `main` is guaranteed to see the worker\'s write.', out: 'NEW\nTERMINATED 5\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Creating threads',
        text: [
          'Pass a Runnable rather than extending Thread: it keeps the task separate from the mechanism and works with executors later.'
        ],
        code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Runnable task = () -> System.out.println("hello from " + Thread.currentThread().getName());
        Thread t = new Thread(task, "t1");
        t.start();
        t.join();
        System.out.println("main continues");
    }
}`,
        expect: 'hello from t1\nmain continues'
      },
      {
        name: 'Useful methods',
        text: [
          [
            '`start()` starts it (once only). `run()` is just the body.',
            '`join()` / `join(ms)` waits for it to finish.',
            '`Thread.sleep(ms)` pauses the current thread; throws InterruptedException.',
            '`interrupt()` asks a thread to stop: sleeping/waiting threads get InterruptedException; others must check `isInterrupted()`.',
            '`setDaemon(true)` before start: the JVM will not wait for it at exit.'
          ]
        ]
      },
      {
        name: 'Why not a thread per task?',
        text: [
          'Platform threads are expensive: each has a stack of about 1 MB reserved and a real OS thread. Creating thousands is slow and can exhaust memory. Use an ExecutorService (a pool), or virtual threads for many blocking tasks.'
        ]
      }
    ],
    table: {
      head: ['State', 'Meaning'],
      rows: [
        ['NEW', 'created, `start()` not called yet'],
        ['RUNNABLE', 'running or ready to run'],
        ['BLOCKED', 'waiting to enter a `synchronized` block'],
        ['WAITING', '`wait()`, `join()`, `park()` with no timeout'],
        ['TIMED_WAITING', '`sleep(ms)`, `wait(ms)`, `join(ms)`'],
        ['TERMINATED', '`run()` has finished']
      ]
    },
    pitfalls: [
      ['Calling `run()` instead of `start()`', 'The code runs on the current thread; nothing is concurrent.'],
      ['Starting a thread twice', 'IllegalThreadStateException.'],
      ['Swallowing InterruptedException', 'At least restore the flag with `Thread.currentThread().interrupt()`.'],
      ['Reading results without `join()`', 'The thread may not have finished, and without a happens-before edge you may see stale data.']
    ],
    interview: [
      ['start() vs run()?', ['`start()` creates a new thread of execution and then calls `run()` on it. Calling `run()` directly is an ordinary method call on the current thread.']],
      ['Runnable vs Callable?', ['Runnable\'s `run()` returns nothing and cannot throw checked exceptions. Callable\'s `call()` returns a value and can throw. Executors accept both; Callable gives you a Future with the result.']],
      ['What is shared between threads?', ['The heap (all objects and static fields) is shared. Each thread has its own stack with its own local variables and its own program counter.']],
      ['How do you stop a thread?', ['Cooperatively: call `interrupt()` and have the task check `isInterrupted()` or handle InterruptedException, or use a volatile flag. `Thread.stop()` is unsafe and removed.']]
    ],
    say: [
      'Each thread has its own stack; all threads share the heap.',
      '`start()` creates a thread; `run()` does not.',
      '`join()` waits and makes the thread\'s writes visible.'
    ],
    checklist: [
      'Draw two thread stacks pointing at one heap object.',
      'List the six thread states.',
      'Explain interrupt-based cancellation.',
      'Say why a thread per task does not scale.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()), "w");
        t.run();
        t.start();
        t.join();
    }
}`,
          answer: 'main\nw',
          why: '`run()` executes on the calling thread (main). `start()` then runs it on the new thread "w".'
        },
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> {});
        t.start();
        t.join();
        try {
            t.start();
        } catch (IllegalThreadStateException e) {
            System.out.println("ISE");
        }
    }
}`,
          answer: 'ISE',
          why: 'A thread can be started only once.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        StringBuilder sb = new StringBuilder();
        Thread a = new Thread(() -> sb.append("a"));
        a.start();
        a.join();
        sb.append("m");
        System.out.println(sb);
    }
}`,
          answer: 'am',
          why: '`join()` makes main wait until "a" was appended.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> {
            try {
                Thread.sleep(10_000);
                System.out.println("woke");
            } catch (InterruptedException e) {
                System.out.println("interrupted");
            }
        });
        t.start();
        t.interrupt();
        t.join();
    }
}`,
          answer: 'interrupted',
          why: 'Interrupting a sleeping thread (or one about to sleep) makes `sleep` throw InterruptedException.'
        }
      ],
      fill: [
        {
          q: 'Run the task on a new thread and wait for it.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> System.out.println("task"));
        t.[[start]]();
        t.[[join]]();
        System.out.println("after");
    }
}`,
          expect: 'task\nafter',
          why: '`start` launches it; `join` waits so "after" comes second.'
        },
        {
          q: 'Write the Runnable as a lambda.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Runnable r = [[() ->|()->]] System.out.println("hi");
        Thread t = new Thread(r);
        t.start();
        t.join();
    }
}`,
          expect: 'hi',
          why: 'Runnable takes no arguments and returns nothing: `() -> statement`.'
        }
      ],
      bug: [
        {
          q: 'Should print the worker\'s name.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()), "worker");
        t.run();
        t.join();
    }
}`,
          line: 4,
          fix: 't.start();',
          expect: 'worker',
          why: '`run()` executes on main. Only `start()` creates the new thread.'
        },
        {
          q: 'Make it compile.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> {
            Thread.sleep(10);
            System.out.println("done");
        });
        t.start();
        t.join();
    }
}`,
          line: 4,
          fix: 'try { Thread.sleep(10); } catch (InterruptedException e) { return; }',
          expect: 'done',
          why: '`Runnable.run()` cannot throw checked exceptions, so InterruptedException must be handled inside.'
        }
      ]
    }
  });
})();
