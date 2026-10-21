(function () {
  const v = (name, value) => ({ name, value });
  const L = (id, name, owner, waiting) => ({ id, type: 'lock ' + name, fields: [v('owner', owner), v('waiting', waiting)], row: 'locks' });
  const st = (t1, s1, t2, s2) => [{ thread: 'main', frame: 'main (ended)', vars: [] }, { thread: 't1', frame: t1, state: s1, vars: [] }, { thread: 't2', frame: t2, state: s2, vars: [] }];

  registerLesson({
    slug: 'deadlock',
    track: 'conc',
    title: 'Deadlock',
    one: 'Two threads each hold one lock and wait for the other\'s. Neither can move, forever. *Always take locks in the same order.*',
    idea: [
      'A deadlock needs four conditions at once: locks are exclusive, a thread **holds** one lock while **waiting** for another, locks cannot be taken away, and there is a **cycle** of waiting threads.',
      'Break any one and deadlock is impossible. The usual fix breaks the cycle: give every lock a global order and always acquire in that order. Another is `tryLock` with a timeout, which breaks hold-and-wait by backing off.',
      'Related problems: **livelock** (threads keep reacting to each other and make no progress) and **starvation** (a thread never gets the lock because others always win).'
    ],
    stages: [
      {
        title: 'The circular wait',
        norun: true,
        code: `public class Main {
    static final Object A = new Object(), B = new Object();
    public static void main(String[] args) {
        new Thread(() -> {
            synchronized (A) {
                pause();
                synchronized (B) { System.out.println("t1 done"); }
            }
        }, "t1").start();
        new Thread(() -> {
            synchronized (B) {
                pause();
                synchronized (A) { System.out.println("t2 done"); }
            }
        }, "t2").start();
    }
    static void pause() {
        try { Thread.sleep(100); } catch (InterruptedException e) { }
    }
}`,
        steps: [
          { line: 5, text: 't1 takes lock A.', stack: [{ thread: 'main', frame: 'main', vars: [] }, { thread: 't1', frame: 'run', vars: [v('holds', 'A')] }], heap: [L('a', 'A', 't1', '—'), L('b', 'B', 'free', '—')], out: '' },
          { line: 11, text: 't2 takes lock B. Both now pause while holding one lock each.', stack: st('run', '', 'run', ''), heap: [L('a', 'A', 't1', '—'), L('b', 'B', 't2', '—')] },
          { line: 7, text: 't1 wakes and wants B. t2 has it, so t1 is BLOCKED.', stack: st('run (wants B)', 'BLOCKED', 'run', ''), heap: [L('a', 'A', 't1', '—'), L('b', 'B', 't2', 't1')] },
          { line: 13, text: 't2 wakes and wants A. t1 has it. Now t1 waits for t2 and t2 waits for t1: a **cycle**.', stack: st('run (wants B)', 'BLOCKED', 'run (wants A)', 'BLOCKED'), heap: [L('a', 'A', 't1', 't2'), L('b', 'B', 't2', 't1')] },
          { line: 16, text: 'Nothing is printed and the program never exits. A thread dump (`jstack`) would report "Found one Java-level deadlock".' }
        ]
      }
    ],
    sections: [
      {
        name: 'Fix 1: a global lock order',
        text: [
          'Decide an order (for example by account id) and always lock the lower one first. Then a cycle cannot form.'
        ],
        code: `public class Main {
    static class Account {
        final int id; int bal;
        Account(int id, int bal) { this.id = id; this.bal = bal; }
    }
    static void transfer(Account from, Account to, int amt) {
        Account first = from.id < to.id ? from : to;
        Account second = first == from ? to : from;
        synchronized (first) {
            synchronized (second) {
                from.bal -= amt;
                to.bal += amt;
            }
        }
    }
    public static void main(String[] args) throws InterruptedException {
        Account a = new Account(1, 100), b = new Account(2, 100);
        Thread t1 = new Thread(() -> { for (int i = 0; i < 1000; i++) transfer(a, b, 1); });
        Thread t2 = new Thread(() -> { for (int i = 0; i < 1000; i++) transfer(b, a, 2); });
        t1.start(); t2.start(); t1.join(); t2.join();
        System.out.println(a.bal + " " + b.bal);
    }
}`,
        expect: '1100 -900'
      },
      {
        name: 'Fix 2: tryLock with a timeout',
        text: [
          'With `ReentrantLock.tryLock(timeout)`, a thread that cannot get the second lock releases the first and retries later, so it never waits forever. Add a small random back-off to avoid livelock.'
        ]
      },
      {
        name: 'Finding deadlocks',
        text: [
          [
            '`jstack <pid>` or `jcmd <pid> Thread.print` prints all stacks and detects monitor deadlocks.',
            '`ThreadMXBean.findDeadlockedThreads()` does the same from code.',
            'Symptoms: CPU near zero, requests hang, threads stuck in BLOCKED or WAITING.'
          ]
        ]
      }
    ],
    table: {
      head: ['Condition', 'How to break it'],
      rows: [
        ['Mutual exclusion', 'lock-free structures, immutable data'],
        ['Hold and wait', 'take all locks at once, or `tryLock` and back off'],
        ['No preemption', 'timeouts, interruptible locking'],
        ['Circular wait', 'global lock ordering']
      ]
    },
    pitfalls: [
      ['Calling unknown code (callbacks, listeners) while holding a lock', 'That code may take other locks in a different order.'],
      ['Holding a lock while joining or waiting on another thread that needs it', 'The other thread can never finish.'],
      ['Nested locks taken in parameter order', '`transfer(a, b)` and `transfer(b, a)` lock in opposite orders.'],
      ['Thinking timeouts fix everything', 'Without back-off, threads can retry in lockstep (livelock).']
    ],
    interview: [
      ['What are the conditions for deadlock?', ['Mutual exclusion, hold and wait, no preemption, and circular wait (the Coffman conditions). All four must hold.']],
      ['How do you prevent deadlock?', ['Acquire locks in a consistent global order; minimise nested locking; use tryLock with timeouts; keep critical sections short and avoid calling external code while holding locks.']],
      ['Deadlock vs livelock vs starvation?', ['Deadlock: threads block forever waiting on each other. Livelock: threads stay active but keep undoing each other\'s progress. Starvation: one thread rarely or never gets the resource because others keep taking it.']]
    ],
    say: [
      'Deadlock = hold-and-wait in a cycle.',
      'Prevent it with a global lock order or tryLock with timeouts.',
      'Diagnose with jstack / thread dumps.'
    ],
    checklist: [
      'Name the four deadlock conditions.',
      'Fix a transfer method with lock ordering.',
      'Explain how tryLock avoids deadlock.',
      'Read a thread dump for BLOCKED threads.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.concurrent.*;
import java.util.concurrent.locks.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ReentrantLock l = new ReentrantLock();
        CountDownLatch held = new CountDownLatch(1);
        Thread t = new Thread(() -> {
            l.lock();
            held.countDown();
            try { Thread.sleep(300); } catch (InterruptedException e) { }
            l.unlock();
        });
        t.start();
        held.await();
        System.out.println(l.tryLock(50, TimeUnit.MILLISECONDS));
        t.join();
        System.out.println(l.tryLock());
    }
}`,
          answer: 'false\ntrue',
          why: 'The first try gives up after 50 ms while t holds the lock for 300 ms. After t finishes, the lock is free.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Object a = new Object();
        synchronized (a) {
            synchronized (a) {
                System.out.println("ok");
            }
        }
    }
}`,
          answer: 'ok',
          why: 'A thread cannot deadlock with itself on a monitor: monitors are reentrant.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Object lock = new Object();
        Thread t = new Thread(() -> { synchronized (lock) { } });
        synchronized (lock) {
            t.start();
            while (t.getState() != Thread.State.BLOCKED) Thread.onSpinWait();
            System.out.println(t.getState());
        }
        t.join();
        System.out.println(t.getState());
    }
}`,
          answer: 'BLOCKED\nTERMINATED',
          why: 'While main holds the monitor, t waits to enter it (BLOCKED). Once main leaves, t runs and finishes.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        CountDownLatch ready = new CountDownLatch(2);
        Runnable r = ready::countDown;
        new Thread(r).start();
        new Thread(r).start();
        System.out.println(ready.await(1, TimeUnit.SECONDS) + " " + ready.getCount());
    }
}`,
          answer: 'true 0',
          why: 'Both threads count down, so `await` returns true well before the timeout.'
        }
      ],
      fill: [
        {
          q: 'Lock accounts in id order.',
          code: `public class Main {
    record Acct(int id) {}
    static String order(Acct from, Acct to) {
        Acct first = from.id() < to.id() ? [[from]] : to;
        Acct second = first == from ? [[to]] : from;
        return first.id() + "," + second.id();
    }
    public static void main(String[] args) {
        System.out.println(order(new Acct(2), new Acct(1)) + " " + order(new Acct(1), new Acct(2)));
    }
}`,
          expect: '1,2 1,2',
          why: 'Both directions lock the same order, so no cycle can form.'
        },
        {
          q: 'Give up instead of waiting forever.',
          code: `import java.util.concurrent.*;
import java.util.concurrent.locks.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        ReentrantLock lock = new ReentrantLock();
        if (lock.[[tryLock]](100, TimeUnit.[[MILLISECONDS]])) {
            try { System.out.println("got it"); } finally { lock.unlock(); }
        }
    }
}`,
          expect: 'got it',
          why: '`tryLock(time, unit)` waits at most that long.'
        }
      ],
      bug: [
        {
          q: 'Opposite transfers must not deadlock.',
          code: `public class Main {
    static class Account { final int id; int bal; Account(int id, int bal) { this.id = id; this.bal = bal; } }
    static void transfer(Account from, Account to, int amt) {
        Account first = from, second = to;
        synchronized (first) {
            try { Thread.sleep(50); } catch (InterruptedException e) { }
            synchronized (second) { from.bal -= amt; to.bal += amt; }
        }
    }
    public static void main(String[] args) throws InterruptedException {
        Account a = new Account(1, 100), b = new Account(2, 100);
        Thread t1 = new Thread(() -> transfer(a, b, 50));
        Thread t2 = new Thread(() -> transfer(b, a, 20));
        t1.start(); t2.start(); t1.join(); t2.join();
        System.out.println(a.bal + " " + b.bal);
    }
}`,
          line: 4,
          hangs: true,
          fix: 'Account first = from.id < to.id ? from : to, second = first == from ? to : from;',
          expect: '70 130',
          why: 'Locking in parameter order means the two threads lock in opposite orders. Order by id instead.'
        },
        {
          q: 'Main should wait for the worker without freezing.',
          code: `public class Main {
    public static void main(String[] args) throws InterruptedException {
        Object lock = new Object();
        Thread t = new Thread(() -> { synchronized (lock) { System.out.println("worker"); } });
        synchronized (lock) { t.start(); t.join(); }
        System.out.println("main");
    }
}`,
          line: 5,
          hangs: true,
          fix: 'synchronized (lock) { t.start(); } t.join();',
          expect: 'worker\nmain',
          why: 'main holds the lock while waiting for t, and t needs that lock to finish. Never join (or wait for) a thread while holding a lock it needs.'
        }
      ]
    }
  });
})();
