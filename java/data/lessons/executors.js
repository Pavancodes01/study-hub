(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const P = (w1, w2, q) => ({ id: 'p', type: 'ThreadPoolExecutor (2 threads)', fields: [v('worker-1', w1), v('worker-2', w2), v('queue', q)] });
  const F = (id, n, st) => ({ id, type: 'Future #' + n, fields: [v('state', st)], row: 'f' });
  const M = (vars) => [{ thread: 'main', frame: 'main', vars }];

  registerLesson({
    slug: 'executors',
    track: 'conc',
    title: 'ExecutorService and thread pools',
    one: 'Submit *tasks*, not threads. A pool reuses a few threads, queues the rest, and hands you a `Future` for each result.',
    idea: [
      'Creating a thread per task is slow and unbounded. An `ExecutorService` keeps a pool of worker threads. `submit(task)` puts the task in a queue; a free worker takes it, runs it and goes back for the next one.',
      '`submit` returns immediately with a `Future`, a handle to a result that may not exist yet. `future.get()` blocks until the task finishes and returns its value, or throws `ExecutionException` wrapping the task\'s exception.',
      'Always shut a pool down. Its worker threads are not daemon threads, so a forgotten pool keeps the JVM alive.'
    ],
    stages: [
      {
        title: 'Tasks, queue, futures',
        code: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Future<Integer>> fs = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            int n = i;
            fs.add(pool.submit(() -> n * n));
        }
        int sum = 0;
        for (Future<Integer> f : fs) sum += f.get();
        pool.shutdown();
        System.out.println(sum + " " + pool.awaitTermination(1, TimeUnit.SECONDS));
    }
}`,
        steps: [
          { line: 6, text: 'A pool with two worker threads, both idle.', stack: M([r('pool', 'p')]), heap: [P('idle', 'idle', '[]')], out: '' },
          { line: 10, text: 'Task 1 (1·1) is submitted. A Future comes back at once; worker-1 picks the task up.', stack: M([r('pool', 'p'), v('i', 1)]), heap: [P('task 1', 'idle', '[]'), F('f1', 1, 'running')] },
          { line: 10, text: 'Task 2 goes to worker-2.', stack: M([r('pool', 'p'), v('i', 2)]), heap: [P('task 1', 'task 2', '[]'), F('f1', 1, 'running'), F('f2', 2, 'running')] },
          { line: 10, text: 'Both workers are busy, so task 3 **waits in the queue**.', stack: M([r('pool', 'p'), v('i', 3)]), heap: [P('task 1', 'task 2', '[task 3]'), F('f1', 1, 'running'), F('f2', 2, 'running'), F('f3', 3, 'queued')] },
          { line: 10, text: 'Worker-1 finishes task 1 (result 1) and takes task 3 from the queue. The same thread is reused.', heap: [P('task 3', 'task 2', '[]'), F('f1', 1, 'done: 1'), F('f2', 2, 'running'), F('f3', 3, 'running')] },
          { line: 13, text: '`get()` returns each result, blocking if it is not ready yet. 1 + 4 + 9.', stack: M([r('pool', 'p'), v('sum', 14)]), heap: [P('idle', 'idle', '[]'), F('f1', 1, 'done: 1'), F('f2', 2, 'done: 4'), F('f3', 3, 'done: 9')] },
          { line: 14, text: '`shutdown()` stops accepting tasks; workers exit once the queue is empty.', heap: [P('stopped', 'stopped', '[]'), F('f1', 1, 'done: 1'), F('f2', 2, 'done: 4'), F('f3', 3, 'done: 9')] },
          { line: 15, text: '`awaitTermination` returns true: everything finished.', out: '14 true\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Ready-made pools',
        text: [],
        code: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        try (ExecutorService pool = Executors.newFixedThreadPool(3)) {   // Java 19+: close() waits
            List<Callable<String>> jobs = List.of(() -> "a", () -> "b", () -> "c");
            StringBuilder sb = new StringBuilder();
            for (Future<String> f : pool.invokeAll(jobs)) sb.append(f.get());
            System.out.println(sb);
        }
    }
}`,
        expect: 'abc'
      },
      {
        name: 'Under the hood: ThreadPoolExecutor',
        text: [
          'The factory methods wrap `ThreadPoolExecutor(core, max, keepAlive, queue, threadFactory, rejectionHandler)`. New tasks first fill core threads, then the queue, then extra threads up to max, and finally the rejection policy (default: throw `RejectedExecutionException`). `newFixedThreadPool` uses an **unbounded** queue, which can grow until memory runs out under heavy load. In production, a bounded queue and an explicit policy are safer.'
        ]
      },
      {
        name: 'Shutting down',
        text: [
          [
            '`shutdown()`: no new tasks, finish queued ones.',
            '`shutdownNow()`: interrupt running tasks and return the queued ones unrun.',
            '`awaitTermination(t, unit)`: wait for completion.',
            '`close()` (Java 19+): shutdown and wait, so the pool fits in try-with-resources.'
          ]
        ]
      }
    ],
    table: {
      head: ['Factory', 'Threads', 'Good for'],
      rows: [
        ['`newFixedThreadPool(n)`', 'exactly n', 'CPU-bound work (n ≈ cores)'],
        ['`newCachedThreadPool()`', 'grows, reuses idle', 'many short tasks (can explode)'],
        ['`newSingleThreadExecutor()`', '1', 'tasks that must run in order'],
        ['`newScheduledThreadPool(n)`', 'n', 'delayed / periodic tasks'],
        ['`newVirtualThreadPerTaskExecutor()`', 'one virtual thread per task', 'many blocking I/O tasks (Java 21)'],
        ['`ForkJoinPool.commonPool()`', '≈ cores − 1', 'parallel streams, CompletableFuture default']
      ]
    },
    pitfalls: [
      ['Forgetting `shutdown()`', 'The JVM never exits because worker threads stay alive.'],
      ['Ignoring the Future', 'Exceptions from `submit` tasks are stored in the Future and silently lost if you never call `get()`.'],
      ['`shutdownNow()` when you meant "finish up"', 'Running tasks are interrupted and queued ones dropped.'],
      ['Unbounded queues', 'Under overload the queue grows until OutOfMemoryError.']
    ],
    interview: [
      ['Why use a thread pool?', ['Thread creation is expensive; a pool reuses threads, bounds concurrency, queues excess work, and gives lifecycle control and Futures for results.']],
      ['execute vs submit?', ['`execute(Runnable)` returns nothing and lets exceptions reach the thread\'s uncaught handler. `submit` accepts Runnable or Callable and returns a Future; exceptions are captured and rethrown from `get()` as ExecutionException.']],
      ['How do you size a pool?', ['CPU-bound: about the number of cores. I/O-bound: more, roughly cores × (1 + wait time / compute time). Or use virtual threads for blocking I/O.']],
      ['What happens when the queue is full?', ['The pool adds threads up to max; beyond that the RejectedExecutionHandler runs: Abort (throw, default), CallerRuns, Discard, or DiscardOldest.']]
    ],
    say: [
      'Submit tasks to a pool; get results through Futures.',
      'Always shut the pool down (or use try-with-resources in Java 19+).',
      'Exceptions surface from `Future.get()` as ExecutionException.'
    ],
    checklist: [
      'Trace tasks through workers and the queue.',
      'Get a task\'s exception from its Future.',
      'Compare shutdown and shutdownNow.',
      'Pick a pool type for CPU-bound vs I/O-bound work.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newSingleThreadExecutor();
        Future<Integer> f = pool.submit(() -> { if (true) throw new IllegalStateException("bad"); return 1; });
        try {
            f.get();
        } catch (ExecutionException e) {
            System.out.println(e.getCause().getMessage());
        }
        pool.shutdown();
    }
}`,
          answer: 'bad',
          why: 'The task\'s exception is stored in the Future and rethrown by `get()` wrapped in ExecutionException.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService one = Executors.newSingleThreadExecutor();
        for (int i = 1; i <= 3; i++) {
            int n = i;
            one.submit(() -> System.out.println(n));
        }
        one.shutdown();
        one.awaitTermination(1, TimeUnit.SECONDS);
    }
}`,
          answer: '1\n2\n3',
          why: 'A single-thread executor runs tasks one by one in submission order.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ExecutorService pool = Executors.newFixedThreadPool(1);
        pool.shutdown();
        try {
            pool.submit(() -> 1);
        } catch (RejectedExecutionException e) {
            System.out.println("rejected");
        }
    }
}`,
          answer: 'rejected',
          why: 'After `shutdown()` new tasks are rejected.'
        },
        {
          code: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Future<String>> fs = pool.invokeAll(List.of(() -> "x", () -> "y"));
        System.out.println(fs.get(0).get() + fs.get(1).get() + " " + fs.get(0).isDone());
        pool.shutdown();
    }
}`,
          answer: 'xy true',
          why: '`invokeAll` waits for all tasks and returns their Futures in the same order as the tasks.'
        }
      ],
      fill: [
        {
          q: 'Run a Callable on a pool and read the result.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.[[newFixedThreadPool]](4);
        Future<Integer> f = pool.[[submit]](() -> 6 * 7);
        System.out.println(f.[[get]]());
        pool.shutdown();
    }
}`,
          expect: '42',
          why: '`submit` returns a Future; `get` waits for the value.'
        },
        {
          q: 'Stop the pool and wait for it.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        pool.submit(() -> System.out.println("task"));
        pool.[[shutdown]]();
        System.out.println(pool.[[awaitTermination]](1, TimeUnit.SECONDS));
    }
}`,
          expect: 'task\ntrue',
          why: '`shutdown` lets queued work finish; `awaitTermination` waits for it.'
        }
      ],
      bug: [
        {
          q: 'Make it compile.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ExecutorService pool = Executors.newFixedThreadPool(1);
        Future<Integer> f = pool.submit(() -> 7);
        int v = f.get();
        System.out.println(v);
        pool.shutdown();
    }
}`,
          line: 4,
          fix: 'public static void main(String[] args) throws Exception {',
          expect: '7',
          why: '`Future.get()` throws the checked InterruptedException and ExecutionException. Handle or declare them.'
        },
        {
          q: 'Both tasks should finish.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newSingleThreadExecutor();
        pool.submit(() -> {
            try { Thread.sleep(100); System.out.println("first"); }
            catch (InterruptedException e) { System.out.println("interrupted"); }
        });
        pool.submit(() -> System.out.println("second"));
        pool.shutdownNow();
        pool.awaitTermination(1, TimeUnit.SECONDS);
    }
}`,
          line: 11,
          fix: 'pool.shutdown();',
          expect: 'first\nsecond',
          why: '`shutdownNow` interrupts the running task and drops the queued one. `shutdown` lets them finish.'
        }
      ]
    }
  });
})();
