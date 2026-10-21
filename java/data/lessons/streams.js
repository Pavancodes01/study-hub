(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const st = (id, type, next) => ({ id, type, fields: [next ? r('then', next) : v('then', 'toList()')], row: 'pipe' });
  const pipe = [st('s0', 'source [1..5]', 's1'), st('s1', 'filter odd', 's2'), st('s2', 'map ×10', 's3'), st('s3', 'limit 2', null)];
  const res = (t) => ({ id: 'res', type: 'result', val: t });
  const M = { frame: 'main', vars: [] };

  registerLesson({
    slug: 'streams',
    track: 'func',
    title: 'Streams: map, filter, reduce',
    one: 'A stream is a *lazy pipeline*. Nothing runs until a terminal operation, and then each element flows through every step *one at a time*.',
    idea: [
      'A stream has a **source** (a collection, `Stream.of`, `IntStream.range`), zero or more **intermediate** operations (`filter`, `map`, `sorted`, `limit`) that each return a new stream, and one **terminal** operation (`toList`, `count`, `reduce`, `forEach`) that produces a result.',
      'Intermediate operations only record what to do. When the terminal operation starts, elements are pulled through the whole chain individually, not stage by stage. Short-circuiting operations like `limit` and `findFirst` can stop early.',
      'A stream can be used once. It does not store data and must not change its source.'
    ],
    stages: [
      {
        title: 'Lazy, one element at a time',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> out = List.of(1, 2, 3, 4, 5).stream()
            .filter(n -> { System.out.println("filter " + n); return n % 2 == 1; })
            .map(n -> { System.out.println("map " + n); return n * 10; })
            .limit(2)
            .toList();
        System.out.println(out);
    }
}`,
        steps: [
          { line: 5, text: 'A stream over the list. Nothing has been read yet.', stack: [M], heap: [{ id: 's0', type: 'source [1..5]', fields: [v('then', '(nothing yet)')] }], out: '' },
          { line: 8, text: 'Each intermediate call adds a stage to the pipeline. **No lambda has run**: nothing is printed.', heap: pipe },
          { line: 6, text: '`toList()` starts pulling. Element 1 enters `filter`: it is odd, so it continues.', stack: [M, { frame: 'filter lambda', vars: [v('n', 1)] }], heap: pipe.concat([res('[]')]), out: 'filter 1\n' },
          { line: 7, text: 'The **same element** goes straight on to `map`, before 2 is even read. 10 is collected.', stack: [M, { frame: 'map lambda', vars: [v('n', 1)] }], heap: pipe.concat([res('[10]')]), out: 'filter 1\nmap 1\n' },
          { line: 6, text: '2 is even and is dropped at `filter`. `map` never sees it.', stack: [M, { frame: 'filter lambda', vars: [v('n', 2)] }], out: 'filter 1\nmap 1\nfilter 2\n' },
          { line: 6, text: '3 passes the filter.', stack: [M, { frame: 'filter lambda', vars: [v('n', 3)] }], out: 'filter 1\nmap 1\nfilter 2\nfilter 3\n' },
          { line: 7, text: '30 is collected. `limit(2)` now has two elements and stops the pipeline.', stack: [M, { frame: 'map lambda', vars: [v('n', 3)] }], heap: pipe.concat([res('[10, 30]')]), out: 'filter 1\nmap 1\nfilter 2\nfilter 3\nmap 3\n' },
          { line: 9, text: '4 and 5 are **never read**. The pipeline is used up.', stack: [{ frame: 'main', vars: [r('out', 'res')] }], heap: [res('[10, 30]')] },
          { line: 10, text: 'Two results.', out: 'filter 1\nmap 1\nfilter 2\nfilter 3\nmap 3\n[10, 30]\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The operations you need',
        text: [
          [
            'Intermediate: `filter`, `map`, `flatMap`, `distinct`, `sorted`, `limit`, `skip`, `peek`, `mapToInt`, `boxed`, `takeWhile`, `dropWhile`.',
            'Terminal: `toList()` (Java 16, unmodifiable), `collect`, `forEach`, `count`, `sum`, `min`/`max`, `reduce`, `anyMatch`/`allMatch`/`noneMatch`, `findFirst`.',
            'Stateful operations (`sorted`, `distinct`) must see everything before passing elements on.'
          ]
        ],
        code: `import java.util.*;
import java.util.stream.*;

public class Main {
    record Order(String customer, int amount) {}
    public static void main(String[] args) {
        List<Order> orders = List.of(new Order("ana", 30), new Order("bo", 5), new Order("ana", 20));
        int bigTotal = orders.stream()
            .filter(o -> o.amount() >= 10)
            .mapToInt(Order::amount)
            .sum();
        List<String> names = orders.stream().map(Order::customer).distinct().sorted().toList();
        boolean anyHuge = orders.stream().anyMatch(o -> o.amount() > 100);
        System.out.println(bigTotal + " " + names + " " + anyHuge);
        System.out.println(IntStream.rangeClosed(1, 5).map(i -> i * i).boxed().toList());
    }
}`,
        expect: '50 [ana, bo] false\n[1, 4, 9, 16, 25]'
      },
      {
        name: 'reduce',
        text: [
          '`reduce(identity, op)` folds all elements into one value. The identity must be neutral for the operation (0 for sum, 1 for product, "" for concat), and the operation must be associative so it can run in parallel.'
        ],
        code: `import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        int sum = IntStream.rangeClosed(1, 4).reduce(0, Integer::sum);
        int product = IntStream.rangeClosed(1, 4).reduce(1, (a, b) -> a * b);
        String joined = Stream.of("a", "b", "c").reduce("", String::concat);
        System.out.println(sum + " " + product + " " + joined);
    }
}`,
        expect: '10 24 abc'
      },
      {
        name: 'Rules of good stream code',
        text: [
          [
            'No side effects in `map`/`filter`: do not add to outside lists; collect instead.',
            'Use primitive streams (`IntStream`) for numbers to avoid boxing.',
            '`parallel()` only pays off for large, CPU-heavy, easily split work with no shared state. Measure first.',
            'A plain loop is fine when it is clearer, especially with `break` or checked exceptions.'
          ]
        ]
      }
    ],
    pitfalls: [
      ['No terminal operation', 'Nothing runs. `stream.map(...)` alone does nothing.'],
      ['Reusing a stream', 'IllegalStateException: "stream has already been operated upon or closed".'],
      ['`peek` for logic', 'It is for debugging and may not run at all for some pipelines.'],
      ['`toList()` result is unmodifiable', 'Use `collect(Collectors.toCollection(ArrayList::new))` if you need to add later.']
    ],
    interview: [
      ['Intermediate vs terminal operations?', ['Intermediate operations return a new stream and are lazy; they only describe the pipeline. A terminal operation triggers processing and produces a result or side effect, after which the stream is consumed.']],
      ['What does "lazy" mean for streams?', ['No element is processed until a terminal operation runs. Then elements flow one by one through all stages, which allows short-circuiting and avoids building intermediate collections.']],
      ['map vs flatMap?', ['`map` turns each element into exactly one element. `flatMap` turns each element into a stream and flattens all of them into one stream, for example a list of lists into a list.']],
      ['When is a parallel stream a bad idea?', ['Small data, I/O-bound work, shared mutable state, operations that depend on order, or sources that split poorly like LinkedList. It also uses the common ForkJoinPool shared by the whole app.']]
    ],
    say: [
      'Streams are lazy; a terminal operation pulls elements through one at a time.',
      'Streams are single-use and must not modify their source.',
      'Prefer primitive streams for number crunching.'
    ],
    checklist: [
      'Trace the print order of a filter/map/limit pipeline.',
      'Write a sum with `mapToInt().sum()` and with `reduce`.',
      'Flatten a list of lists with flatMap.',
      'Explain why a stream cannot be reused.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Stream<Integer> s = Stream.of(1, 2);
        s.count();
        try {
            s.count();
        } catch (IllegalStateException e) {
            System.out.println("used");
        }
    }
}`,
          answer: 'used',
          why: 'A stream can be consumed only once.'
        },
        {
          code: `import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Stream.of("a", "b").peek(System.out::println);
        System.out.println("end");
    }
}`,
          answer: 'end',
          why: 'There is no terminal operation, so the pipeline never runs and `peek` never prints.'
        },
        {
          code: `import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(Stream.of(5, 3, 5, 1, 3).distinct().sorted().skip(1).toList());
    }
}`,
          answer: '[3, 5]',
          why: 'distinct → 5, 3, 1; sorted → 1, 3, 5; skip(1) drops 1.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(List.of(List.of(1, 2), List.of(3)).stream()
            .flatMap(List::stream)
            .map(x -> x * x)
            .toList());
    }
}`,
          answer: '[1, 4, 9]',
          why: '`flatMap` turns the two inner lists into one stream of 1, 2, 3.'
        }
      ],
      fill: [
        {
          q: 'Keep long words, upper-cased.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = List.of("hi", "java", "stream");
        List<String> r = words.stream().[[filter]](w -> w.length() > 2).[[map]](String::toUpperCase).toList();
        System.out.println(r);
    }
}`,
          expect: '[JAVA, STREAM]',
          why: '`filter` keeps matching elements; `map` transforms each one.'
        },
        {
          q: 'Sum without boxing.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> nums = List.of(4, 5, 6);
        int total = nums.stream().mapToInt(Integer::intValue).[[sum]]();
        System.out.println(total);
    }
}`,
          expect: '15',
          why: '`mapToInt` gives an IntStream, which has `sum()`.'
        }
      ],
      bug: [
        {
          q: 'Count and list the names.',
          code: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        List<String> names = List.of("a", "b");
        Stream<String> s = names.stream();
        long n = s.count();
        List<String> l = s.toList();
        System.out.println(n + " " + l);
    }
}`,
          line: 9,
          fix: 'List<String> l = names.stream().toList();',
          expect: '2 [a, b]',
          why: 'The stream was consumed by `count()`. Create a new stream for each pipeline.'
        },
        {
          q: 'Copy every name into the log.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> names = List.of("a", "b");
        List<String> log = new ArrayList<>();
        names.stream().map(n -> log.add(n));
        System.out.println(log.size());
    }
}`,
          line: 7,
          fix: 'names.stream().forEach(log::add);',
          expect: '2',
          why: '`map` is lazy and there is no terminal operation, so nothing runs. Use a terminal operation.'
        }
      ]
    }
  });
})();
