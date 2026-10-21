(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const S = (id, t, gone) => ({ id, type: 'String', val: '"' + t + '"', gone: !!gone, row: 's' });
  const K = (t) => ({ id: 'k', type: 'ArrayList (keep)', val: t });
  const N = (id, next, gone) => ({ id, type: 'Node', fields: [r('next', next)], gone: !!gone, row: 'n' });

  registerLesson({
    slug: 'gc',
    track: 'jvm',
    title: 'Garbage collection',
    one: 'An object is garbage when *no chain of references from a GC root* reaches it. Cycles do not keep objects alive.',
    idea: [
      'The collector starts from **GC roots**: local variables in live stack frames, static fields, active threads, JNI references. It marks every object reachable from them. Everything unmarked is garbage, no matter what still points at it.',
      'Most objects die young, so the heap is split into generations. New objects go to the **young** generation (Eden), which is collected often and cheaply; survivors are copied to survivor spaces and eventually **promoted** to the old generation, which is collected rarely.',
      'Java\'s default collector since Java 9 is **G1**, which splits the heap into regions and aims for short pauses. ZGC and Shenandoah keep pauses under a few milliseconds even for huge heaps.'
    ],
    stages: [
      {
        title: 'Reachability, including cycles',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> keep = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            String tmp = "item" + i;
            if (i % 2 == 0) keep.add(tmp);
        }
        Node a = new Node(), b = new Node();
        a.next = b;
        b.next = a;
        a = null;
        b = null;
        System.out.println(keep);
    }
}
class Node { Node next; }`,
        steps: [
          { line: 5, text: '`keep` is a local in a live frame: a **GC root** for its list.', stack: [{ frame: 'main', vars: [r('keep', 'k')] }], heap: [K('[]')], out: '' },
          { line: 8, text: 'item0 is reachable both through `tmp` and through the list.', stack: [{ frame: 'main', vars: [r('keep', 'k'), v('i', 0), r('tmp', 's0')] }], heap: [K('[item0]'), S('s0', 'item0')] },
          { line: 8, text: 'item1 is not added. Once `tmp` moves on, nothing references it.', stack: [{ frame: 'main', vars: [r('keep', 'k'), v('i', 1), r('tmp', 's1')] }], heap: [K('[item0]'), S('s0', 'item0'), S('s1', 'item1')] },
          { line: 8, text: 'item1 is now unreachable: garbage. item2 is kept.', stack: [{ frame: 'main', vars: [r('keep', 'k'), v('i', 2), r('tmp', 's2')] }], heap: [K('[item0, item2]'), S('s0', 'item0'), S('s1', 'item1', true), S('s2', 'item2')] },
          { line: 12, text: 'Two nodes pointing at each other, plus local references to both.', stack: [{ frame: 'main', vars: [r('keep', 'k'), r('a', 'n1'), r('b', 'n2')] }], heap: [K('[item0, item2]'), S('s0', 'item0'), S('s1', 'item1', true), S('s2', 'item2'), N('n1', 'n2'), N('n2', 'n1')] },
          { line: 14, text: 'With both locals cleared, each node is still referenced **by the other**, but no root reaches them. A tracing GC collects the whole cycle. (Reference counting could not.)',
            stack: [{ frame: 'main', vars: [r('keep', 'k'), r('a', null), r('b', null)] }], heap: [K('[item0, item2]'), S('s0', 'item0'), S('s1', 'item1', true), S('s2', 'item2'), N('n1', 'n2', true), N('n2', 'n1', true)] },
          { line: 15, text: 'Only reachable objects matter to the program.', out: '[item0, item2]\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'How a collection works',
        text: [
          [
            '**Mark**: walk the graph from the roots and mark live objects.',
            '**Sweep / copy / compact**: reclaim unmarked memory. Young collections copy live objects to a survivor space (cheap when few survive). Old collections compact to avoid fragmentation.',
            '**Stop-the-world**: some phases pause all application threads. Modern collectors do most work concurrently to keep pauses short.'
          ]
        ]
      },
      {
        name: 'Memory leaks still happen',
        text: [
          'GC frees only unreachable objects. A leak in Java is an object that is still reachable but no longer needed:',
          [
            'Static collections that only grow (caches without eviction).',
            'Listeners or callbacks registered and never removed.',
            'ThreadLocals in pooled threads never cleared.',
            'Mutable keys whose hash changed, so they can never be removed.'
          ]
        ],
        code: `import java.util.*;

public class Main {
    static final Map<String, byte[]> SESSIONS = new HashMap<>();
    static void login(String id) { SESSIONS.put(id, new byte[1024]); }
    static void logout(String id) { SESSIONS.remove(id); }   // forgetting this = leak
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) login("u" + i);
        for (int i = 0; i < 3; i++) logout("u" + i);
        System.out.println(SESSIONS.size());
    }
}`,
        expect: '0'
      },
      {
        name: 'Reference types',
        text: [
          [
            '**Strong**: normal references; never collected while reachable.',
            '**Soft** (`SoftReference`): cleared only when memory is tight; for caches.',
            '**Weak** (`WeakReference`, `WeakHashMap`): cleared at the next GC once no strong references remain.',
            '**Phantom** (`PhantomReference`, `Cleaner`): for cleanup after collection. `finalize()` is deprecated.'
          ]
        ]
      }
    ],
    table: {
      head: ['Collector', 'Flag', 'Good for'],
      rows: [
        ['Serial', '`-XX:+UseSerialGC`', 'tiny heaps, single core'],
        ['Parallel', '`-XX:+UseParallelGC`', 'throughput (batch jobs)'],
        ['G1 (default)', '`-XX:+UseG1GC`', 'balanced; pause-time goals'],
        ['ZGC', '`-XX:+UseZGC`', 'very low pauses, huge heaps'],
        ['Shenandoah', '`-XX:+UseShenandoahGC`', 'low pauses (some JDK builds)']
      ]
    },
    pitfalls: [
      ['Calling `System.gc()`', 'Only a hint; may cause full pauses. Let the JVM decide.'],
      ['Relying on `finalize()`', 'Deprecated, unpredictable. Use try-with-resources or Cleaner.'],
      ['Assuming no leaks in Java', 'Reachable-but-unused objects leak just fine.'],
      ['Huge heaps without the right collector', 'Long pauses. Consider G1 tuning or ZGC.']
    ],
    interview: [
      ['How does the JVM decide what is garbage?', ['By reachability: objects not reachable through any chain of strong references from GC roots (thread stacks, static fields, JNI handles, etc.) are garbage.']],
      ['What is generational GC?', ['Based on the observation that most objects die young. New objects go to Eden; minor GCs copy survivors between survivor spaces and promote long-lived ones to the old generation, which is collected less often.']],
      ['Can Java have memory leaks?', ['Yes: objects that remain reachable though unused, such as entries in static maps, unremoved listeners, ThreadLocals in thread pools, or unbounded caches.']],
      ['Minor vs major/full GC?', ['A minor GC collects only the young generation, usually fast. A major/full GC also collects the old generation (and possibly Metaspace), which takes longer.']]
    ],
    say: [
      'Garbage = unreachable from GC roots; cycles are fine.',
      'Generational: most objects die young in Eden.',
      'Leaks are reachable-but-unneeded objects.'
    ],
    checklist: [
      'List four kinds of GC roots.',
      'Explain why a reference cycle is collectable.',
      'Describe Eden → survivor → old.',
      'Spot a leak in a static cache.'
    ],
    drills: {
      predict: [
        {
          code: `import java.lang.ref.*;

public class Main {
    public static void main(String[] args) {
        Object o = new Object();
        WeakReference<Object> w = new WeakReference<>(o);
        System.gc();
        System.out.println(w.get() == o);
    }
}`,
          answer: 'true',
          why: '`o` still strongly references the object, so the weak reference is not cleared.'
        },
        {
          code: `import java.lang.ref.*;

public class Main {
    public static void main(String[] args) {
        SoftReference<String> s = new SoftReference<>(new String("cache"));
        s.clear();
        System.out.println(s.get());
    }
}`,
          answer: 'null',
          why: '`clear()` empties the reference itself, regardless of GC.'
        },
        {
          code: `import java.util.*;

public class Main {
    static final List<byte[]> CACHE = new ArrayList<>();
    public static void main(String[] args) {
        for (int i = 0; i < 1000; i++) CACHE.add(new byte[16]);
        System.out.println(CACHE.size());
    }
}`,
          answer: '1000',
          why: 'Every array stays reachable through a static field, so none can ever be collected. This is how leaks grow.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        Runtime rt = Runtime.getRuntime();
        System.out.println(rt.totalMemory() <= rt.maxMemory());
    }
}`,
          answer: 'true',
          why: 'The current heap size never exceeds the maximum (`-Xmx`).'
        }
      ],
      fill: [
        {
          q: 'Hold an object weakly.',
          code: `import java.lang.ref.*;

public class Main {
    public static void main(String[] args) {
        String strong = new String("img");
        WeakReference<String> ref = new [[WeakReference]]<>(strong);
        System.out.println(ref.[[get]]());
    }
}`,
          expect: 'img',
          why: '`get()` returns the object while it is still strongly reachable elsewhere.'
        },
        {
          q: 'Release cache entries you no longer need.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, byte[]> cache = new HashMap<>();
        cache.put("k", new byte[8]);
        cache.[[remove]]("k");
        System.out.println(cache.size());
    }
}`,
          expect: '0',
          why: 'Removing the entry drops the last strong reference, so the array becomes collectable.'
        }
      ],
      bug: [
        {
          q: 'After everyone logs out, no sessions should remain.',
          code: `import java.util.*;

public class Main {
    static final Map<String, Object> SESSIONS = new HashMap<>();
    static void login(String id) { SESSIONS.put(id, new Object()); }
    static void logout(String id) { }
    public static void main(String[] args) {
        for (String u : List.of("a", "b", "c")) login(u);
        for (String u : List.of("a", "b", "c")) logout(u);
        System.out.println(SESSIONS.size());
    }
}`,
          line: 6,
          fix: 'static void logout(String id) { SESSIONS.remove(id); }',
          expect: '0',
          why: 'The static map keeps every session reachable forever: a leak.'
        },
        {
          q: 'The session must be removable after its status changes.',
          code: `import java.util.*;

public class Main {
    static class Session {
        final int id; String status = "new";
        Session(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof Session s && s.id == id; }
        @Override public int hashCode() { return Objects.hash(id, status); }
    }
    public static void main(String[] args) {
        Set<Session> live = new HashSet<>();
        Session s = new Session(1);
        live.add(s);
        s.status = "active";
        live.remove(s);
        System.out.println(live.size());
    }
}`,
          line: 8,
          fix: '@Override public int hashCode() { return id; }',
          expect: '0',
          why: 'The hash used the mutable status, so after the change the set looks in the wrong bucket and the entry leaks.'
        }
      ]
    }
  });
})();
