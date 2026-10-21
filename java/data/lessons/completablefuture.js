(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const CF = (id, label, state) => ({ id, type: 'CF · ' + label, fields: [v('state', state)], row: 'cf' });
  const vars = [r('price', 'a'), r('rate', 'b'), r('label', 'c')];

  registerLesson({
    slug: 'completablefuture',
    track: 'conc',
    title: 'CompletableFuture',
    one: 'A `CompletableFuture` is a Future you can *chain*: say what to do with the result when it arrives, without blocking a thread to wait for it.',
    idea: [
      '`supplyAsync(supplier)` starts work on a pool (the common ForkJoinPool by default) and immediately returns a CompletableFuture.',
      'Instead of calling `get()` and blocking, you attach callbacks: `thenApply` transforms the result, `thenCompose` chains another async call, `thenCombine` joins two futures, `exceptionally`/`handle` recover from errors. Each call returns a new future, so you build a pipeline.',
      'At the very edge (a `main` method, a test) you call `join()` to wait for the final result.'
    ],
    stages: [
      {
        title: 'Two calls, combined',
        code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        CompletableFuture<Integer> price = CompletableFuture.supplyAsync(() -> 100);
        CompletableFuture<Double> rate = CompletableFuture.supplyAsync(() -> 0.5);
        CompletableFuture<String> label = price
            .thenCombine(rate, (p, r) -> p * r)
            .thenApply(v -> "total=" + v);
        System.out.println(label.join());
    }
}`,
        steps: [
          { line: 5, text: '`supplyAsync` hands the work to a pool thread and returns at once with a pending future.', stack: [{ thread: 'main', frame: 'main', vars: [r('price', 'a')] }, { thread: 'pool-1', frame: 'supplier', vars: [] }], heap: [CF('a', 'price', 'running')], out: '' },
          { line: 6, text: 'A second task runs in parallel on another pool thread.', stack: [{ thread: 'main', frame: 'main', vars: [r('price', 'a'), r('rate', 'b')] }, { thread: 'pool-1', frame: 'supplier', vars: [] }, { thread: 'pool-2', frame: 'supplier', vars: [] }], heap: [CF('a', 'price', 'running'), CF('b', 'rate', 'running')] },
          { line: 9, text: 'The pipeline is only **declared**: combine when both are done, then format. `main` is not blocked.',
            stack: [{ thread: 'main', frame: 'main', vars: vars }], heap: [CF('a', 'price', 'done: 100'), CF('b', 'rate', 'done: 0.5'), CF('m', 'combine', 'waiting'), CF('c', 'label', 'waiting')] },
          { line: 8, text: 'Both inputs are complete, so the combine function runs: 100 × 0.5.', heap: [CF('a', 'price', 'done: 100'), CF('b', 'rate', 'done: 0.5'), CF('m', 'combine', 'done: 50.0'), CF('c', 'label', 'waiting')] },
          { line: 9, text: '`thenApply` formats it.', heap: [CF('a', 'price', 'done: 100'), CF('b', 'rate', 'done: 0.5'), CF('m', 'combine', 'done: 50.0'), CF('c', 'label', 'done: "total=50.0"')] },
          { line: 10, text: '`join()` waits (if needed) and returns the value.', out: 'total=50.0\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The core methods',
        text: [
          [
            '`thenApply(f)`: transform the value (like `map`).',
            '`thenCompose(f)`: f returns another CompletableFuture; flatten it (like `flatMap`).',
            '`thenCombine(other, f)`: wait for two, combine.',
            '`thenAccept`, `thenRun`: side effects at the end.',
            '`allOf(...)`, `anyOf(...)`: wait for all / the first.',
            '`exceptionally(f)`, `handle((v, e) -> ...)`, `whenComplete`: errors.',
            '`...Async` variants run the callback on a pool instead of the completing thread.'
          ]
        ],
        code: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    static CompletableFuture<Integer> fetch(int id) {
        return CompletableFuture.supplyAsync(() -> id * 10);
    }
    public static void main(String[] args) {
        List<CompletableFuture<Integer>> all = List.of(fetch(1), fetch(2), fetch(3));
        int total = CompletableFuture.allOf(all.toArray(new CompletableFuture[0]))
            .thenApply(v -> all.stream().mapToInt(CompletableFuture::join).sum())
            .join();
        System.out.println(total);
    }
}`,
        expect: '60'
      },
      {
        name: 'Errors flow down the chain',
        text: [
          'If a stage throws, every dependent stage is skipped and completes exceptionally with a `CompletionException` wrapping the cause, until an `exceptionally` or `handle` recovers. `join()` throws the unchecked CompletionException; `get()` throws the checked ExecutionException.'
        ]
      },
      {
        name: 'Use your own executor for blocking work',
        text: [
          'The common ForkJoinPool is small and shared by the whole JVM (parallel streams too). Pass an executor for I/O: `supplyAsync(task, ioPool)`. With Java 21, a virtual-thread executor is a natural fit.'
        ]
      }
    ],
    pitfalls: [
      ['`thenApply` with a function that returns a future', 'You get `CompletableFuture<CompletableFuture<T>>`. Use `thenCompose`.'],
      ['Calling `join()` everywhere', 'Blocking defeats the purpose. Join once at the edge.'],
      ['Blocking I/O on the common pool', 'Starves other users of it. Supply an executor.'],
      ['Forgetting error handling', 'A failed stage silently completes exceptionally; nobody notices unless someone joins or handles.']
    ],
    interview: [
      ['Future vs CompletableFuture?', ['A Future can only be polled or blocked on with `get()`. A CompletableFuture can be completed manually, composed with callbacks (thenApply, thenCompose, thenCombine), combined (allOf/anyOf) and given error handling, without blocking.']],
      ['thenApply vs thenCompose?', ['thenApply maps the result with a plain function. thenCompose takes a function that returns another CompletionStage and flattens it, for chaining dependent async calls.']],
      ['Which thread runs a thenApply callback?', ['Either the thread that completed the previous stage or, if it was already complete, the thread that called thenApply. The Async variants always use an executor.']]
    ],
    say: [
      'Chain callbacks instead of blocking; join once at the end.',
      'thenApply = map, thenCompose = flatMap, thenCombine = zip.',
      'Pass your own executor for blocking work.'
    ],
    checklist: [
      'Combine two async results.',
      'Chain a dependent async call with thenCompose.',
      'Recover from a failure with exceptionally.',
      'Wait for a list of futures with allOf.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        int r = CompletableFuture.supplyAsync(() -> 1 / 0).exceptionally(e -> -1).join();
        System.out.println(r);
    }
}`,
          answer: '-1',
          why: 'Division by zero fails the stage; `exceptionally` replaces the failure with -1.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        int r = CompletableFuture.completedFuture(2)
            .thenCompose(x -> CompletableFuture.supplyAsync(() -> x * 10))
            .thenApply(x -> x + 1)
            .join();
        System.out.println(r);
    }
}`,
          answer: '21',
          why: '`thenCompose` flattens the inner future: 2 → 20 → 21.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        String s = CompletableFuture.supplyAsync(() -> {
                if (true) throw new IllegalStateException("x");
                return 1;
            })
            .handle((v, e) -> e == null ? "ok " + v : "err " + e.getCause().getMessage())
            .join();
        System.out.println(s);
    }
}`,
          answer: 'err x',
          why: '`handle` always runs. Downstream stages see a CompletionException whose cause is the original exception.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        CompletableFuture<String> cf = new CompletableFuture<>();
        CompletableFuture<Integer> len = cf.thenApply(String::length);
        System.out.println(len.isDone());
        cf.complete("hello");
        System.out.println(len.join());
    }
}`,
          answer: 'false\n5',
          why: 'A CompletableFuture can be completed manually. The dependent stage runs once it is.'
        }
      ],
      fill: [
        {
          q: 'Upper-case an async result.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        String s = CompletableFuture.[[supplyAsync]](() -> "hi").[[thenApply]](String::toUpperCase).join();
        System.out.println(s);
    }
}`,
          expect: 'HI',
          why: 'Start async work, then transform its result.'
        },
        {
          q: 'Add two async numbers.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        CompletableFuture<Integer> a = CompletableFuture.supplyAsync(() -> 2);
        CompletableFuture<Integer> b = CompletableFuture.supplyAsync(() -> 3);
        System.out.println(a.[[thenCombine]](b, Integer::sum).join());
    }
}`,
          expect: '5',
          why: '`thenCombine` waits for both and applies the function.'
        }
      ],
      bug: [
        {
          q: 'Chain the second async call.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        CompletableFuture<Integer> f = CompletableFuture.supplyAsync(() -> 1);
        CompletableFuture<Integer> r = f.thenApply(x -> CompletableFuture.supplyAsync(() -> x + 1));
        System.out.println(r.join());
    }
}`,
          line: 6,
          fix: 'CompletableFuture<Integer> r = f.thenCompose(x -> CompletableFuture.supplyAsync(() -> x + 1));',
          expect: '2',
          why: '`thenApply` would give a future of a future. `thenCompose` flattens it.'
        },
        {
          q: 'Make it compile without changing the method signature.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        CompletableFuture<Integer> cf = CompletableFuture.supplyAsync(() -> 9);
        int v = cf.get();
        System.out.println(v);
    }
}`,
          line: 6,
          fix: 'int v = cf.join();',
          expect: '9',
          why: '`get()` throws checked exceptions; `join()` throws only unchecked CompletionException.'
        }
      ]
    }
  });
})();
