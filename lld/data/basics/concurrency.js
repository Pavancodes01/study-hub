(function(){
var SRC = String.raw`import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.concurrent.locks.*;

class Account {
    private int balance;
    synchronized void deposit(int amount) { balance += amount; }   // one thread at a time
    synchronized int balance() { return balance; }
}

class Inventory {
    private final Map<String, Integer> stock = new ConcurrentHashMap<>();
    void add(String sku, int qty) { stock.merge(sku, qty, Integer::sum); }   // atomic per key
    int get(String sku) { return stock.getOrDefault(sku, 0); }
}

class Seat {
    private final ReentrantLock lock = new ReentrantLock();
    private String holder;
    boolean tryBook(String user) {
        if (!lock.tryLock()) return false;          // someone else is booking: do not wait
        try {
            if (holder != null) return false;
            holder = user;
            return true;
        } finally {
            lock.unlock();                          // always unlock in finally
        }
    }
}

class ConcurrencyDemo {
    public static void main(String[] args) throws Exception {
        Account acc = new Account();
        AtomicInteger hits = new AtomicInteger();
        Inventory inv = new Inventory();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        for (int i = 0; i < 1000; i++) {
            pool.submit(() -> { acc.deposit(1); hits.incrementAndGet(); inv.add("pen", 1); });
        }
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println(acc.balance() + " " + hits.get() + " " + inv.get("pen"));
        Seat seat = new Seat();
        System.out.println(seat.tryBook("maya") + " " + seat.tryBook("ravi"));
    }
}`;
var race = { kind: 'seq', w: 760, parts: [{ id: 'a', name: 'Thread A' }, { id: 'acc', name: 'balance = 100' }, { id: 'b', name: 'Thread B' }], msgs: [
  { from: 'a', to: 'acc', label: 'read → 100', text: 'Without locking, `balance += 50` is really three steps: read, add, write. Thread A reads 100.', code: ['synchronized void deposit(int amount) { balance += amount; }'] },
  { from: 'b', to: 'acc', label: 'read → 100', text: 'Before A writes, Thread B also reads 100.', code: ['synchronized void deposit(int amount) { balance += amount; }'] },
  { from: 'a', to: 'acc', label: 'write 150', text: 'A adds 50 and writes 150.', code: ['balance += amount;'] },
  { from: 'b', to: 'acc', label: 'write 130', text: 'B adds 30 to its stale 100 and writes 130. A\'s deposit is lost: a **race condition**.', code: ['balance += amount;'] },
  { from: 'a', to: 'acc', label: 'synchronized deposit(50)', text: 'Fix: `synchronized` makes read-add-write one step. A holds the lock…', code: ['synchronized void deposit(int amount) { balance += amount; }'] },
  { from: 'b', to: 'acc', label: 'waits, then deposit(30)', text: '…B waits for the lock, then reads the updated value. Result 180, nothing lost.', code: ['synchronized int balance() { return balance; }'] }
] };
registerBasic({
  slug: 'concurrency', order: 9, group: 'Modeling', title: 'Concurrency basics for LLD',
  one: 'When many threads share an object, ==check-then-act and read-modify-write must be atomic==, or updates get lost and resources get double-booked.',
  picture: ['Two cashiers sell the last concert ticket at the same moment, each having checked "1 left". Both sell it. The check and the sale had to be one step.', 'LLD interviews (parking lot, booking, ATM, rate limiter) almost always ask "what if two requests come at once?". Know `synchronized`, `ReentrantLock`, atomics and concurrent collections, and say where the critical section is.'],
  mainCode: SRC, mainFile: 'ConcurrencyDemo.java', mainExpect: '1000 1000 1000\ntrue false',
  flows: [{ name: 'Lost update', title: 'A race condition, then the fix', diagram: race, code: '@main' }],
  sections: [
    { name: 'The tools', text: ['`synchronized` methods or blocks: simplest mutual exclusion. `ReentrantLock`: same, plus `tryLock`, timeouts and fairness. `AtomicInteger` / `AtomicLong`: lock-free counters. `ConcurrentHashMap`: thread-safe map with atomic `merge`, `compute`, `putIfAbsent`. `ExecutorService`: run tasks on a thread pool instead of creating threads.'] },
    { name: 'Check-then-act', text: ['"If the seat is free, book it" must be one atomic step. Put both inside the same lock, or use an atomic operation like `putIfAbsent`.'], code: String.raw`import java.util.concurrent.*;
class Seats {
    private final ConcurrentHashMap<String, String> booked = new ConcurrentHashMap<>();
    boolean book(String seat, String user) {
        return booked.putIfAbsent(seat, user) == null;   // check and set in one atomic call
    }
}` },
    { name: 'Lock granularity', text: ['One lock around everything is safe but slow. Lock per resource (per seat, per account, per parking floor) lets unrelated work run in parallel. When locking two resources, always lock them in the same order (e.g. by ID) to avoid deadlock.'] },
    { name: 'Immutability', text: ['Objects whose fields are all `final` and never change can be shared between threads with no locking at all. Prefer immutable value objects (`record Money(long cents, String currency)`).'] }
  ],
  table: { title: 'Which tool?', lead: null, head: ['Need', 'Use'], rows: [
    ['Counter shared by threads', '`AtomicInteger` / `LongAdder`'],
    ['Map shared by threads', '`ConcurrentHashMap` with `merge` / `compute`'],
    ['Several fields changed together', '`synchronized` block or `ReentrantLock`'],
    ['Try to grab, else give up', '`ReentrantLock.tryLock()`'],
    ['Many readers, few writers', '`ReadWriteLock` or `CopyOnWriteArrayList`'],
    ['Run tasks in parallel', '`ExecutorService`, `CompletableFuture`']
  ]},
  pitfalls: [['Check outside the lock', '`if (free) { lock; book; }` still races. Check inside.'], ['Forgetting unlock', 'Always `unlock()` in `finally`.'], ['Deadlock', 'Two threads lock A then B and B then A. Use a fixed lock order.'], ['Synchronizing on the wrong object', 'Each instance has its own monitor; a static resource needs a shared lock.'], ['Thinking volatile makes ++ atomic', '`volatile` gives visibility, not atomicity.']],
  probe: [['How do you prevent double booking?', ['Make check-and-reserve atomic: a lock per seat, `putIfAbsent` on a concurrent map, or a database unique constraint / conditional update.']], ['synchronized vs ReentrantLock?', ['Both give mutual exclusion. ReentrantLock adds `tryLock`, timeouts, interruptible waits and fair ordering, but you must unlock in finally yourself.']], ['How do you avoid deadlock?', ['Lock resources in a consistent global order, hold locks briefly, use `tryLock` with timeouts, or avoid needing two locks.']]],
  say: ['Booking a seat is check-then-act, so it happens inside one lock per seat.', 'Counters are `AtomicInteger` and shared maps are `ConcurrentHashMap` with `merge`.', 'When two accounts are locked, I lock them in ID order to avoid deadlock.'],
  facts: [['race', 'unsynchronized read-modify-write'], ['atomic', 'check + act together'], ['finally', 'always unlock'], ['order', 'locks to avoid deadlock']],
  checklist: ['Explain a race condition with a diagram.', 'Make check-then-act atomic two ways.', 'Explain how to avoid deadlock.', 'Pick the right tool for a counter, a map and a multi-field update.'],
  drills: {
    mcq: [{ id: 'mcq-cc1', title: 'Lost increments', ask: '`count++` from 8 threads gives a total below the expected 8000. Simplest fix?', options: [['`AtomicInteger.incrementAndGet()`', true, 'An atomic read-modify-write.'], ['Make `count` volatile', false, 'Visibility only; `++` is still three steps.'], ['Add `Thread.sleep`', false, 'Hides the race.'], ['Use more threads', false, 'Worse.']] },
      { id: 'mcq-cc2', title: 'Transfer deadlock', ask: 'Transfers lock `from` then `to`. Two opposite transfers sometimes freeze. Fix?', options: [['Always lock the account with the smaller ID first', true, 'A global lock order prevents circular waiting.'], ['Use synchronized instead of locks', false, 'Same circular wait.'], ['Retry forever', false, 'Still deadlocks.'], ['Remove locking', false, 'Corrupts balances.']] }],
    code: [{ id: 'code-cc', title: 'Atomic booking', ask: 'Book a seat only if nobody has it.', run: 'BookDemo', expect: 'true\nfalse', code: String.raw`import java.util.concurrent.*;
class Seats {
    private final ConcurrentHashMap<String, String> booked = new [[ConcurrentHashMap<>()]];
    boolean book(String seat, String user) { return booked.[[putIfAbsent(seat, user)]] == null; }
}
class BookDemo { public static void main(String[] a) { Seats s = new Seats(); System.out.println(s.book("A1", "maya")); System.out.println(s.book("A1", [["ravi"]])); } }` }],
    order: [{ id: 'ord-cc', title: 'Safe lock usage', ask: 'Order the steps with ReentrantLock.', steps: ['Call lock.lock() (or tryLock)', 'Enter try', 'Check the condition and update shared state', 'In finally, call lock.unlock()'], extra: ['Check the condition before taking the lock'] }]
  }
});
})();
