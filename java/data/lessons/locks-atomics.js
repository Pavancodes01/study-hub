(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const A = (n) => ({ id: 'h', type: 'AtomicInteger', fields: [v('value (volatile)', n)] });
  const th = (a, b) => [{ thread: 'main', frame: 'main (join)', vars: [r('hits', 'h')] }, { thread: 'a', frame: 'incrementAndGet', vars: a }, { thread: 'b', frame: 'incrementAndGet', vars: b }];

  registerLesson({
    slug: 'locks-atomics',
    track: 'conc',
    title: 'Locks and atomics',
    one: 'Atomics update one variable *without locking*, using compare-and-set retries. `ReentrantLock` is synchronized with extra powers: try, timeout, fairness, conditions.',
    idea: [
      '`AtomicInteger.incrementAndGet()` uses a CPU instruction called **compare-and-set (CAS)**: "set to 8 only if it is still 7". If another thread changed it first, CAS fails and the loop simply reads again and retries. No thread ever blocks.',
      '`ReentrantLock` does what `synchronized` does, but as an object: you call `lock()` and must call `unlock()` in a `finally`. In exchange you get `tryLock()`, timeouts, interruptible waiting, fair ordering and multiple `Condition`s.',
      'Rule of thumb: atomics for single counters and references, `synchronized` for simple critical sections, ReentrantLock when you need its extra features, ReadWriteLock for read-heavy data.'
    ],
    stages: [
      {
        title: 'CAS: try, fail, retry',
        code: `import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        AtomicInteger hits = new AtomicInteger();
        Runnable task = () -> { for (int i = 0; i < 1000; i++) hits.incrementAndGet(); };
        Thread a = new Thread(task), b = new Thread(task);
        a.start(); b.start();
        a.join(); b.join();
        System.out.println(hits.get());
    }
}`,
        steps: [
          { line: 5, text: 'An AtomicInteger wraps a volatile int.', stack: [{ thread: 'main', frame: 'main', vars: [r('hits', 'h')] }], heap: [A(0)], out: '' },
          { line: 6, text: 'Say both threads are mid-loop and the value is 7. Each reads 7 and computes 8.', stack: th([v('read', 7), v('want', 8)], [v('read', 7), v('want', 8)]), heap: [A(7)] },
          { line: 6, text: 'a runs CAS(7 → 8): the value is still 7, so it **succeeds**.', stack: th([v('CAS', 'ok')], [v('read', 7), v('want', 8)]), heap: [A(8)] },
          { line: 6, text: 'b runs CAS(7 → 8): the value is 8 now, so it **fails**. Nothing is overwritten; no update is lost.', stack: th([], [v('read', 7), v('CAS', 'failed')]) },
          { line: 6, text: 'b loops: reads 8, CAS(8 → 9) succeeds. No lock, no blocking, just a retry.', stack: th([], [v('read', 8), v('CAS', 'ok')]), heap: [A(9)] },
          { line: 10, text: 'Every increment counted: 2000.', stack: [{ thread: 'main', frame: 'main', vars: [r('hits', 'h')] }], heap: [A(2000)], out: '2000\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'ReentrantLock pattern',
        text: [
          'Lock before the `try`, unlock in `finally`. Otherwise an exception leaves the lock held forever.'
        ],
        code: `import java.util.concurrent.locks.*;

public class Main {
    private final ReentrantLock lock = new ReentrantLock();
    private int balance = 100;

    boolean withdraw(int amount) {
        lock.lock();
        try {
            if (amount > balance) return false;
            balance -= amount;
            return true;
        } finally {
            lock.unlock();
        }
    }
    public static void main(String[] args) {
        Main acct = new Main();
        System.out.println(acct.withdraw(70) + " " + acct.withdraw(70) + " " + acct.balance);
    }
}`,
        expect: 'true false 30'
      },
      {
        name: 'The atomic toolbox',
        text: [
          [
            '`AtomicInteger`/`AtomicLong`: `incrementAndGet`, `getAndAdd`, `compareAndSet`, `updateAndGet(f)`, `accumulateAndGet(x, f)`.',
            '`AtomicReference<T>`: CAS on a reference, for lock-free swaps of immutable state.',
            '`LongAdder`: spreads the count across cells; much faster than AtomicLong under heavy contention, at the cost of a slower `sum()`.',
            '`ReadWriteLock`: many readers or one writer. `StampedLock` adds optimistic reads.'
          ]
        ]
      }
    ],
    table: {
      head: ['', '`synchronized`', '`ReentrantLock`', 'Atomics'],
      rows: [
        ['Unlock', 'automatic', 'manual, in finally', 'n/a'],
        ['Try / timeout', 'no', '`tryLock()`, `tryLock(t, unit)`', 'never blocks'],
        ['Fairness option', 'no', 'yes', 'n/a'],
        ['Conditions', 'one (`wait`/`notify`)', 'many `newCondition()`', 'n/a'],
        ['Scope', 'any block', 'any block', 'one variable']
      ]
    },
    pitfalls: [
      ['`unlock()` not in `finally`', 'An exception leaves the lock held, blocking everyone.'],
      ['Two atomics that must change together', 'Each is atomic alone; together they are not. Use a lock or one AtomicReference to an immutable pair.'],
      ['`get()` then `set()` on an atomic', 'Check-then-act race. Use `compareAndSet` or `updateAndGet`.'],
      ['Using `++` on an AtomicInteger', 'Does not compile; call `incrementAndGet()`.']
    ],
    interview: [
      ['What is CAS?', ['Compare-and-set: an atomic CPU instruction that writes a new value only if the current value equals an expected one, and reports success. Lock-free algorithms loop: read, compute, CAS, retry on failure.']],
      ['ReentrantLock vs synchronized?', ['Both are reentrant mutual-exclusion locks with the same memory effects. ReentrantLock adds tryLock, timed and interruptible locking, fairness and multiple conditions, but must be unlocked manually.']],
      ['What is the ABA problem?', ['A CAS sees value A, another thread changes it to B and back to A, and the CAS succeeds although the state changed in between. `AtomicStampedReference` adds a version stamp to detect it.']],
      ['When would you use LongAdder?', ['For counters updated by many threads and read rarely, such as metrics. It reduces contention by keeping per-thread cells.']]
    ],
    say: [
      'Atomics use CAS: lock-free retries instead of blocking.',
      'ReentrantLock: lock, try, finally unlock.',
      'Atomics protect one variable; invariants across several need a lock.'
    ],
    checklist: [
      'Trace a failed CAS and its retry.',
      'Write the lock/try/finally pattern.',
      'Use tryLock with a timeout.',
      'Pick between AtomicLong and LongAdder.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) {
        AtomicInteger a = new AtomicInteger(5);
        System.out.println(a.getAndIncrement() + " " + a.incrementAndGet() + " " + a.compareAndSet(7, 10) + " " + a.get());
    }
}`,
          answer: '5 7 true 10',
          why: '`getAndIncrement` returns the old 5 (now 6); `incrementAndGet` returns 7; CAS(7→10) succeeds.'
        },
        {
          code: `import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) {
        AtomicInteger a = new AtomicInteger(2);
        System.out.println(a.updateAndGet(x -> x * 3) + " " + a.accumulateAndGet(4, Integer::sum));
    }
}`,
          answer: '6 10',
          why: '2·3 = 6, then 6 + 4 = 10, each applied atomically.'
        },
        {
          code: `import java.util.concurrent.locks.*;

public class Main {
    public static void main(String[] args) {
        ReentrantLock lock = new ReentrantLock();
        lock.lock();
        lock.lock();
        int twice = lock.getHoldCount();
        lock.unlock();
        System.out.println(twice + " " + lock.getHoldCount() + " " + lock.isLocked());
        lock.unlock();
    }
}`,
          answer: '2 1 true',
          why: 'The lock is reentrant: each `lock()` must be matched by an `unlock()`.'
        },
        {
          code: `import java.util.concurrent.locks.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        ReentrantLock lock = new ReentrantLock();
        lock.lock();
        boolean[] got = new boolean[1];
        Thread t = new Thread(() -> got[0] = lock.tryLock());
        t.start();
        t.join();
        System.out.println(got[0]);
        lock.unlock();
    }
}`,
          answer: 'false',
          why: '`tryLock()` returns false at once instead of blocking when another thread holds the lock.'
        }
      ],
      fill: [
        {
          q: 'Guard the counter with a lock.',
          code: `import java.util.concurrent.locks.*;

public class Main {
    static final ReentrantLock lock = new ReentrantLock();
    static int count;
    public static void main(String[] args) throws InterruptedException {
        Runnable r = () -> {
            for (int i = 0; i < 1000; i++) {
                lock.[[lock]]();
                try { count++; } finally { lock.[[unlock]](); }
            }
        };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(count);
    }
}`,
          expect: '2000',
          why: 'Lock before `try`, unlock in `finally`.'
        },
        {
          q: 'Add atomically and read the new value.',
          code: `import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) {
        AtomicLong total = new AtomicLong(10);
        System.out.println(total.[[addAndGet]](5));
    }
}`,
          expect: '15',
          why: '`addAndGet` returns the updated value (`getAndAdd` would return 10).'
        }
      ],
      bug: [
        {
          q: 'The lock must be free after a failure.',
          code: `import java.util.concurrent.locks.*;

public class Main {
    static void risky() { throw new IllegalStateException("x"); }
    static void work(ReentrantLock lock) {
        lock.lock();
        risky(); lock.unlock();
    }
    public static void main(String[] args) {
        ReentrantLock lock = new ReentrantLock();
        try { work(lock); } catch (IllegalStateException e) { }
        System.out.println(lock.isLocked());
    }
}`,
          line: 7,
          fix: 'try { risky(); } finally { lock.unlock(); }',
          expect: 'false',
          why: 'The exception skips `unlock()`. Always unlock in `finally`.'
        },
        {
          q: 'Make it compile.',
          code: `import java.util.concurrent.atomic.*;

public class Main {
    public static void main(String[] args) {
        AtomicInteger hits = new AtomicInteger();
        hits++;
        System.out.println(hits.get());
    }
}`,
          line: 6,
          fix: 'hits.incrementAndGet();',
          expect: '1',
          why: 'Operators do not work on AtomicInteger; use its atomic methods.'
        }
      ]
    }
  });
})();
