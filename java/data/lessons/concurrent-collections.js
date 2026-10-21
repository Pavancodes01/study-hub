(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const B = (id, key, val, lock) => ({ id, type: 'bin "' + key + '"', fields: [v('value', val), v('locked by', lock)], row: 'bins' });
  const T = (t1, t2) => [{ thread: 'main', frame: 'main (join)', vars: [r('counts', 'm')] }, { thread: 't1', frame: 'merge', vars: t1 }, { thread: 't2', frame: 'merge', vars: t2 }];
  const map = { id: 'm', type: 'ConcurrentHashMap', fields: [v('table', 'bins below')] };

  registerLesson({
    slug: 'concurrent-collections',
    track: 'conc',
    title: 'Concurrent collections',
    one: 'ConcurrentHashMap locks *one bucket at a time*, so threads touching different keys never wait for each other, and `merge`/`compute` are atomic.',
    idea: [
      'A plain HashMap shared between threads can lose entries or corrupt itself. `Collections.synchronizedMap` fixes that with one big lock, so only one thread works at a time.',
      '`ConcurrentHashMap` is smarter: reads take no lock, inserting into an empty bucket uses CAS, and updating a bucket locks only that bucket\'s first node. Compound operations like `merge`, `compute` and `putIfAbsent` are atomic.',
      'Other tools: `CopyOnWriteArrayList` for rarely-changed lists that are read a lot, `BlockingQueue` for producer/consumer hand-offs, `ConcurrentLinkedQueue` and `ConcurrentSkipListMap` for lock-free queues and sorted maps.'
    ],
    stages: [
      {
        title: 'Two threads, per-bucket locking',
        code: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        Map<String, Integer> counts = new ConcurrentHashMap<>();
        Runnable task = () -> {
            for (String w : List.of("a", "b", "a")) counts.merge(w, 1, Integer::sum);
        };
        Thread t1 = new Thread(task), t2 = new Thread(task);
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println(new TreeMap<>(counts));
    }
}`,
        steps: [
          { line: 6, text: 'An empty ConcurrentHashMap.', stack: [{ thread: 'main', frame: 'main', vars: [r('counts', 'm')] }], heap: [map], out: '' },
          { line: 8, text: 't1 merges "a" into an empty bin with a single CAS; no lock needed. t2 starts at the same time.', stack: T([v('w', '"a"')], [v('w', '"a"')]), heap: [map, B('ba', 'a', 1, '—')] },
          { line: 8, text: 't2 also merges "a". The bin is not empty, so t2 locks **only that bin** and adds 1 atomically.', stack: T([v('w', '"b"')], [v('w', '"a"')]), heap: [map, B('ba', 'a', 2, 't2')] },
          { line: 8, text: 'Meanwhile t1 updates "b" in a **different bin**, in parallel, without waiting for t2.', stack: T([v('w', '"b"')], [v('w', '"b"')]), heap: [map, B('ba', 'a', 2, '—'), B('bb', 'b', 1, 't1')] },
          { line: 12, text: 'All six merges counted: no lost updates even though `merge` reads and writes.', stack: [{ thread: 'main', frame: 'main', vars: [r('counts', 'm')] }], heap: [map, B('ba', 'a', 4, '—'), B('bb', 'b', 2, '—')] },
          { line: 13, text: 'Copied into a TreeMap for sorted printing.', out: '{a=4, b=2}\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Producer and consumer with a BlockingQueue',
        text: [
          '`put` blocks when a bounded queue is full; `take` blocks when it is empty. The queue does all the waiting and signalling for you.'
        ],
        code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<Integer> q = new ArrayBlockingQueue<>(2);
        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) q.put(i);
                q.put(-1);                          // poison pill: "no more"
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        producer.start();
        int sum = 0;
        for (int x = q.take(); x != -1; x = q.take()) sum += x;
        System.out.println(sum);
    }
}`,
        expect: '15'
      },
      {
        name: 'ConcurrentHashMap details',
        text: [
          [
            'No `null` keys or values: `get` returning null must mean "absent".',
            'Iterators are weakly consistent: never throw CME, may or may not show concurrent changes.',
            '`size()` is an estimate while other threads write.',
            'Use `merge`, `compute`, `computeIfAbsent`, `putIfAbsent` instead of get-then-put.'
          ]
        ]
      }
    ],
    table: {
      head: ['Need', 'Use'],
      rows: [
        ['shared map', '`ConcurrentHashMap`'],
        ['shared sorted map', '`ConcurrentSkipListMap`'],
        ['list read often, written rarely', '`CopyOnWriteArrayList`'],
        ['producer / consumer', '`ArrayBlockingQueue`, `LinkedBlockingQueue`'],
        ['non-blocking queue', '`ConcurrentLinkedQueue`'],
        ['delayed tasks / priorities', '`DelayQueue`, `PriorityBlockingQueue`']
      ]
    },
    pitfalls: [
      ['Check-then-act on a concurrent map', '`if (!m.containsKey(k)) m.put(k, v)` is still a race. Use `putIfAbsent`/`computeIfAbsent`.'],
      ['Putting null into ConcurrentHashMap', 'NullPointerException.'],
      ['`synchronizedList` iteration', 'You must hold the list\'s lock while iterating.'],
      ['`add`/`remove` on a full/empty BlockingQueue', 'They throw. Use `offer`/`poll` (or `put`/`take` to block).']
    ],
    interview: [
      ['How does ConcurrentHashMap achieve concurrency?', ['Since Java 8: lock-free reads with volatile fields, CAS to insert into empty bins, and `synchronized` on the first node of a bin for updates, so different bins proceed in parallel. Resizing is done cooperatively by several threads. (Java 7 used segments.)']],
      ['Why does ConcurrentHashMap disallow null?', ['With concurrent access, `get` returning null would be ambiguous (absent or mapped to null), and you cannot follow up with `containsKey` atomically.']],
      ['When is CopyOnWriteArrayList a good choice?', ['When reads and iteration vastly outnumber writes, like listener lists. Every write copies the whole array, so frequent writes are expensive.']]
    ],
    say: [
      'ConcurrentHashMap locks per bin; reads are lock-free.',
      'Use atomic compound methods: merge, compute, putIfAbsent.',
      'BlockingQueue is the standard producer/consumer hand-off.'
    ],
    checklist: [
      'Count words from several threads with merge.',
      'Write a producer/consumer with a poison pill.',
      'Explain weakly consistent iterators.',
      'Choose a concurrent collection for five needs.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        try {
            new ConcurrentHashMap<String, String>().put("k", null);
        } catch (NullPointerException e) {
            System.out.println("NPE");
        }
    }
}`,
          answer: 'NPE',
          why: 'ConcurrentHashMap rejects null keys and values.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ConcurrentMap<String, Integer> m = new ConcurrentHashMap<>();
        System.out.println(m.putIfAbsent("x", 1) + " " + m.putIfAbsent("x", 2) + " " + m.get("x"));
    }
}`,
          answer: 'null 1 1',
          why: 'The first call inserts and returns null; the second finds 1 and leaves it.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ArrayBlockingQueue<Integer> q = new ArrayBlockingQueue<>(1);
        System.out.println(q.offer(1) + " " + q.offer(2) + " " + q.poll() + " " + q.poll());
    }
}`,
          answer: 'true false 1 null',
          why: 'Capacity 1: the second offer is refused; the second poll finds nothing.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ConcurrentHashMap<String, Integer> m = new ConcurrentHashMap<>();
        m.compute("x", (k, v) -> v == null ? 1 : v + 1);
        m.compute("x", (k, v) -> v == null ? 1 : v + 1);
        System.out.println(m);
    }
}`,
          answer: '{x=2}',
          why: '`compute` receives null the first time and the current value the second time.'
        }
      ],
      fill: [
        {
          q: 'Count safely from two threads.',
          code: `import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        Map<String, Integer> counts = new ConcurrentHashMap<>();
        Runnable r = () -> { for (int i = 0; i < 100; i++) counts.[[merge]]("k", 1, Integer::sum); };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(counts);
    }
}`,
          expect: '{k=200}',
          why: '`merge` reads and updates the value atomically.'
        },
        {
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<String> q = new LinkedBlockingQueue<>();
        Thread p = new Thread(() -> {
            try { q.[[put]]("job"); } catch (InterruptedException e) { }
        });
        p.start();
        System.out.println(q.[[take]]());
    }
}`,
          q: 'Hand a job from one thread to another.',
          expect: 'job',
          why: '`put` adds (blocking if full); `take` waits until something arrives.'
        }
      ],
      bug: [
        {
          q: 'A full queue should just refuse the item.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        BlockingQueue<Integer> q = new ArrayBlockingQueue<>(1);
        q.add(1);
        boolean accepted = q.add(2);
        System.out.println(accepted + " " + q.size());
    }
}`,
          line: 7,
          fix: 'boolean accepted = q.offer(2);',
          expect: 'false 1',
          why: '`add` throws IllegalStateException when full; `offer` returns false.'
        },
        {
          q: 'A null key lookup should print null, not crash.',
          code: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ConcurrentHashMap<String, Integer> m = new ConcurrentHashMap<>();
        String key = null;
        System.out.println(m.get(key));
    }
}`,
          line: 7,
          fix: 'System.out.println(key == null ? null : m.get(key));',
          expect: 'null',
          why: 'ConcurrentHashMap throws NullPointerException even for `get(null)`.'
        }
      ]
    }
  });
})();
