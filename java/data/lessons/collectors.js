(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const W = { id: 'w', type: 'List<String>', val: '[apple, avocado, banana, blueberry, cherry]' };
  const G = (t) => ({ id: 'g', type: 'HashMap (groupingBy)', val: t });
  const C = (t) => ({ id: 'c', type: 'TreeMap (counting)', val: t });
  const F = (vars) => [{ frame: 'main', vars }];

  registerLesson({
    slug: 'collectors',
    track: 'func',
    title: 'Collectors and groupingBy',
    one: '`collect` folds a stream into a container. `groupingBy` builds a map of *key → bucket*, and a downstream collector decides what each bucket becomes.',
    idea: [
      'A `Collector` describes how to build a result: create an empty container, add each element, and (for parallel streams) merge partial containers. `Collectors` has ready-made ones: `toList`, `toSet`, `toMap`, `joining`, `groupingBy`, `partitioningBy`, `counting`, `summingInt`, `averagingInt`, `mapping`.',
      '`groupingBy(classifier)` computes a key for each element and appends the element to that key\'s list. Add a **downstream** collector to turn each list into something else: a count, a sum, a set of names.',
      'This is the stream version of the `map.computeIfAbsent(key, k -> new ArrayList<>()).add(x)` loop.'
    ],
    stages: [
      {
        title: 'Grouping, element by element',
        code: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = List.of("apple", "avocado", "banana", "blueberry", "cherry");
        Map<Character, List<String>> byLetter = words.stream()
            .collect(Collectors.groupingBy(w -> w.charAt(0)));
        Map<Character, Long> counts = words.stream()
            .collect(Collectors.groupingBy(w -> w.charAt(0), TreeMap::new, Collectors.counting()));
        System.out.println(byLetter);
        System.out.println(counts);
    }
}`,
        steps: [
          { line: 6, text: 'Five words.', stack: F([r('words', 'w')]), heap: [W], out: '' },
          { line: 8, text: 'The collector starts with an empty HashMap. "apple" → key `a`: a new list is created for it.', heap: [W, G('{a=[apple]}')] },
          { line: 8, text: '"avocado" → key `a` exists, so it is appended.', heap: [W, G('{a=[apple, avocado]}')] },
          { line: 8, text: '"banana" → new key `b`.', heap: [W, G('{a=[apple, avocado], b=[banana]}')] },
          { line: 8, text: '"blueberry" → appended to `b`.', heap: [W, G('{a=[apple, avocado], b=[banana, blueberry]}')] },
          { line: 8, text: '"cherry" → new key `c`. The finished map is assigned to `byLetter`.', stack: F([r('words', 'w'), r('byLetter', 'g')]), heap: [W, G('{a=[apple, avocado], b=[banana, blueberry], c=[cherry]}')] },
          { line: 10, text: 'Same keys, but `TreeMap::new` picks the map type and `counting()` turns each bucket into a Long instead of a list.',
            stack: F([r('words', 'w'), r('byLetter', 'g'), r('counts', 'c')]), heap: [W, G('{a=[apple, avocado], b=[banana, blueberry], c=[cherry]}'), C('{a=2, b=2, c=1}')] },
          { line: 11, text: 'Buckets of words.', out: '{a=[apple, avocado], b=[banana, blueberry], c=[cherry]}\n' },
          { line: 12, text: 'Counts, sorted by key.', out: '{a=[apple, avocado], b=[banana, blueberry], c=[cherry]}\n{a=2, b=2, c=1}\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Downstream collectors',
        text: [
          '`groupingBy(key, downstream)` or `groupingBy(key, mapFactory, downstream)`.'
        ],
        code: `import java.util.*;
import java.util.stream.*;

public class Main {
    record Emp(String dept, String name, int salary) {}
    public static void main(String[] args) {
        List<Emp> staff = List.of(new Emp("eng", "ana", 120), new Emp("eng", "bo", 100), new Emp("ops", "cy", 90));
        Map<String, Integer> total = staff.stream().collect(Collectors.groupingBy(Emp::dept, TreeMap::new,
            Collectors.summingInt(Emp::salary)));
        Map<String, String> names = staff.stream().collect(Collectors.groupingBy(Emp::dept, TreeMap::new,
            Collectors.mapping(Emp::name, Collectors.joining("+"))));
        Map<String, Double> avg = staff.stream().collect(Collectors.groupingBy(Emp::dept, TreeMap::new,
            Collectors.averagingInt(Emp::salary)));
        Map<String, Optional<Emp>> top = staff.stream().collect(Collectors.groupingBy(Emp::dept,
            Collectors.maxBy(Comparator.comparingInt(Emp::salary))));
        System.out.println(total);
        System.out.println(names);
        System.out.println(avg);
        System.out.println(top.get("eng").get().name());
    }
}`,
        expect: '{eng=220, ops=90}\n{eng=ana+bo, ops=cy}\n{eng=110.0, ops=90.0}\nana'
      },
      {
        name: 'toMap',
        text: [
          '`toMap(keyFn, valueFn)` throws `IllegalStateException` on a duplicate key. Pass a merge function as the third argument to combine values, and a map factory as the fourth to choose the map type.'
        ],
        code: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Map<Character, Integer> freq = "hello".chars()
            .mapToObj(c -> (char) c)
            .collect(Collectors.toMap(c -> c, c -> 1, Integer::sum, TreeMap::new));
        System.out.println(freq);
    }
}`,
        expect: '{e=1, h=1, l=2, o=1}'
      },
      {
        name: 'partitioningBy and joining',
        text: [
          '`partitioningBy(predicate)` always returns a map with exactly two keys, `false` and `true`. `joining(sep, prefix, suffix)` concatenates strings.'
        ]
      }
    ],
    table: {
      head: ['Collector', 'Result'],
      rows: [
        ['`toList()` / `toSet()`', 'List / Set'],
        ['`toMap(k, v[, merge[, factory]])`', 'Map; throws on duplicate keys without merge'],
        ['`joining(", ", "[", "]")`', 'String'],
        ['`groupingBy(k)`', '`Map<K, List<T>>`'],
        ['`groupingBy(k, counting())`', '`Map<K, Long>`'],
        ['`partitioningBy(p)`', '`Map<Boolean, List<T>>`'],
        ['`summingInt` / `averagingInt`', 'Integer / Double'],
        ['`mapping(f, downstream)`', 'transform before collecting']
      ]
    },
    pitfalls: [
      ['`toMap` with duplicate keys', 'IllegalStateException. Add a merge function.'],
      ['Expecting sorted groups', '`groupingBy` uses a HashMap. Pass `TreeMap::new`.'],
      ['`counting()` type', 'It is `Long`, not `Integer`.'],
      ['`averagingInt` type', 'It is `Double`.']
    ],
    interview: [
      ['How do you count occurrences with streams?', ['`stream.collect(groupingBy(Function.identity(), counting()))`, or `toMap(x -> x, x -> 1, Integer::sum)`.']],
      ['groupingBy vs partitioningBy?', ['groupingBy makes as many groups as there are distinct keys. partitioningBy splits by a predicate into exactly two groups, true and false, both always present.']],
      ['What does a Collector consist of?', ['A supplier (new container), an accumulator (add one element), a combiner (merge two containers, used in parallel), and an optional finisher (convert the container to the final result).']]
    ],
    say: [
      'groupingBy builds key → list; a downstream collector reshapes each list.',
      'toMap needs a merge function when keys can repeat.',
      'Pass TreeMap::new for sorted keys.'
    ],
    checklist: [
      'Group and count with one collector.',
      'Sum a field per group.',
      'Build a frequency map with toMap.',
      'Partition numbers into two lists.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(Stream.of(1, 2, 3, 4, 5).collect(Collectors.partitioningBy(n -> n > 3)));
    }
}`,
          answer: '{false=[1, 2, 3], true=[4, 5]}',
          why: 'Two groups, always printed false first.'
        },
        {
          code: `import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(Stream.of("a", "b", "c").collect(Collectors.joining(", ", "[", "]")));
    }
}`,
          answer: '[a, b, c]',
          why: '`joining` takes a separator, prefix and suffix.'
        },
        {
          code: `import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        try {
            Stream.of("a", "a").collect(Collectors.toMap(s -> s, s -> 1));
        } catch (IllegalStateException e) {
            System.out.println("dup");
        }
    }
}`,
          answer: 'dup',
          why: 'Without a merge function, a duplicate key is an error.'
        },
        {
          code: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Map<Character, List<Integer>> m = Stream.of("ant", "bee", "ape", "bumblebee")
            .collect(Collectors.groupingBy(s -> s.charAt(0), TreeMap::new,
                Collectors.mapping(String::length, Collectors.toList())));
        System.out.println(m);
    }
}`,
          answer: '{a=[3, 3], b=[3, 9]}',
          why: '`mapping` turns each word into its length before it goes into the bucket.'
        }
      ],
      fill: [
        {
          q: 'Count words by length.',
          code: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = List.of("hi", "yo", "cat");
        Map<Integer, Long> byLen = words.stream()
            .collect(Collectors.groupingBy(String::length, TreeMap::new, Collectors.[[counting]]()));
        System.out.println(byLen);
    }
}`,
          expect: '{2=2, 3=1}',
          why: '`counting()` turns each bucket into a Long count.'
        },
        {
          q: 'Build a name → age map.',
          code: `import java.util.*;
import java.util.stream.*;

public class Main {
    record Person(String name, int age) {}
    public static void main(String[] args) {
        Map<String, Integer> m = Stream.of(new Person("bo", 4), new Person("al", 9))
            .collect(Collectors.[[toMap]](Person::name, Person::age));
        System.out.println(new TreeMap<>(m));
    }
}`,
          expect: '{al=9, bo=4}',
          why: '`toMap(keyFn, valueFn)` creates one entry per element.'
        }
      ],
      bug: [
        {
          q: 'Count each letter.',
          code: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Map<Character, Integer> m = "abca".chars().mapToObj(c -> (char) c)
            .collect(Collectors.toMap(c -> c, c -> 1));
        System.out.println(new TreeMap<>(m));
    }
}`,
          line: 7,
          fix: '.collect(Collectors.toMap(c -> c, c -> 1, Integer::sum));',
          expect: '{a=2, b=1, c=1}',
          why: '"a" appears twice. A merge function says how to combine values for the same key.'
        },
        {
          q: 'Average salary per team.',
          code: `import java.util.*;
import java.util.stream.*;

public class Main {
    record Emp(String team, int pay) {}
    public static void main(String[] args) {
        List<Emp> es = List.of(new Emp("x", 10), new Emp("x", 15));
        Map<String, Integer> avg = es.stream().collect(Collectors.groupingBy(Emp::team, Collectors.averagingInt(Emp::pay)));
        System.out.println(avg);
    }
}`,
          line: 8,
          fix: 'Map<String, Double> avg = es.stream().collect(Collectors.groupingBy(Emp::team, Collectors.averagingInt(Emp::pay)));',
          expect: '{x=12.5}',
          why: '`averagingInt` produces a Double.'
        }
      ]
    }
  });
})();
