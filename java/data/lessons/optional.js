(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const U = { id: 'u', type: 'User', fields: [v('name', '"ana"'), v('email', '"a@x.io"')] };
  const O = (id, inner) => ({ id, type: 'Optional', fields: [typeof inner === 'string' && inner.indexOf('"') === 0 ? v('value', inner) : r('value', inner)] });
  const E = { id: 'e', type: 'Optional.EMPTY', fields: [r('value', null)], pool: true };

  registerLesson({
    slug: 'optional',
    track: 'func',
    title: 'Optional',
    one: 'An `Optional` is a box that holds *one value or nothing*. It makes "might be missing" part of the return type instead of a surprise `null`.',
    idea: [
      'A method that might not find something can return `Optional<User>` instead of a `User` that is sometimes null. The caller is forced to think about the empty case.',
      'You work with it like a tiny stream: `map` transforms the value if present, `filter` may empty it, `flatMap` chains another Optional-returning call, and `orElse`/`orElseGet`/`orElseThrow` unwrap it at the end.',
      'On an empty Optional, `map` and `filter` do nothing and simply pass the emptiness along, so a whole chain needs only one fallback at the end.'
    ],
    stages: [
      {
        title: 'A chain with one fallback',
        code: `import java.util.*;

public class Main {
    record User(String name, String email) {}
    static Optional<User> find(String name) {
        return name.equals("ana") ? Optional.of(new User("ana", "a@x.io")) : Optional.empty();
    }
    public static void main(String[] args) {
        Optional<User> u = find("ana");
        String domain = u.map(User::email)
            .map(e -> e.substring(e.indexOf('@') + 1))
            .orElse("none");
        String other = find("bob").map(User::email).orElse("none");
        System.out.println(domain + " " + other);
    }
}`,
        steps: [
          { line: 6, text: 'The user exists, so `find` wraps it in an Optional.', stack: [{ frame: 'main', vars: [] }, { frame: 'find', vars: [v('name', '"ana"')] }], heap: [U, O('o1', 'u')], out: '' },
          { line: 9, text: '`u` holds the box, not the user.', stack: [{ frame: 'main', vars: [r('u', 'o1')] }] },
          { line: 10, text: '`map(User::email)` opens the box, applies the function, and puts the result in a new box.', heap: [U, O('o1', 'u'), O('o2', '"a@x.io"')] },
          { line: 11, text: 'Another `map`: the domain part.', heap: [U, O('o1', 'u'), O('o2', '"a@x.io"'), O('o3', '"x.io"')] },
          { line: 12, text: '`orElse` unwraps the value because it is present.', stack: [{ frame: 'main', vars: [r('u', 'o1'), v('domain', '"x.io"')] }], heap: [U, O('o1', 'u')] },
          { line: 13, text: '"bob" is not found: `find` returns the shared empty Optional. `map` sees it is empty and **never calls** `User::email`.', heap: [U, O('o1', 'u'), E] },
          { line: 13, text: '`orElse` supplies the fallback.', stack: [{ frame: 'main', vars: [r('u', 'o1'), v('domain', '"x.io"'), v('other', '"none"')] }] },
          { line: 14, text: 'No null checks anywhere.', out: 'x.io none\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Creating and unwrapping',
        text: [
          [
            '`Optional.of(x)`: x must not be null (throws NPE).',
            '`Optional.ofNullable(x)`: empty if x is null.',
            '`Optional.empty()`',
            '`orElse(v)`: v is computed even when not needed.',
            '`orElseGet(() -> v)`: computed only when empty. Use for anything expensive.',
            '`orElseThrow()`: throws NoSuchElementException (or your exception) when empty.',
            '`ifPresent(consumer)`, `ifPresentOrElse(consumer, runnable)`, `isPresent()`, `isEmpty()`'
          ]
        ],
        code: `import java.util.*;

public class Main {
    static String expensive() {
        System.out.println("computed");
        return "default";
    }
    public static void main(String[] args) {
        String a = Optional.of("x").orElse(expensive());
        String b = Optional.of("x").orElseGet(Main::expensive);
        System.out.println(a + b);
    }
}`,
        expect: 'computed\nxx'
      },
      {
        name: 'Where Optional belongs',
        text: [
          [
            '**Yes**: as a return type for "may not find" lookups (`findFirst`, `max`, repository finders).',
            '**No**: as a field, a method parameter, or inside collections. Use null checks, overloads, or empty collections instead.',
            '**Never** return `null` from a method declared to return Optional.',
            'For primitives use `OptionalInt`, `OptionalDouble`.'
          ]
        ]
      }
    ],
    pitfalls: [
      ['`opt.get()` without checking', 'Throws NoSuchElementException when empty. Prefer `orElse`/`orElseThrow`.'],
      ['`Optional.of(maybeNull)`', 'Throws NPE immediately. Use `ofNullable`.'],
      ['`if (opt.isPresent()) opt.get()`', 'Works but misses the point; use `map`/`ifPresent`/`orElse`.'],
      ['`orElse(expensiveCall())`', 'The call always runs. Use `orElseGet`.']
    ],
    interview: [
      ['Why was Optional introduced?', ['To make the possible absence of a value explicit in an API\'s return type, especially for stream operations like `findFirst`, and to reduce NullPointerExceptions by encouraging callers to handle the empty case.']],
      ['orElse vs orElseGet?', ['`orElse` takes a value, so its argument is evaluated even when the Optional has a value. `orElseGet` takes a Supplier and calls it only when empty.']],
      ['map vs flatMap on Optional?', ['`map` wraps the function\'s result in an Optional. If the function already returns an Optional, `map` gives `Optional<Optional<T>>`; `flatMap` avoids the nesting.']]
    ],
    say: [
      'Optional is for return types that may be empty.',
      'Chain map/filter/flatMap, unwrap once with orElse/orElseGet/orElseThrow.',
      'orElse is eager; orElseGet is lazy.'
    ],
    checklist: [
      'Convert a null-returning finder to Optional.',
      'Chain two maps with one fallback.',
      'Explain orElse vs orElseGet with output.',
      'Say where not to use Optional.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(Optional.ofNullable(null).isPresent());
        try {
            Optional.of(null);
        } catch (NullPointerException e) {
            System.out.println("NPE");
        }
    }
}`,
          answer: 'false\nNPE',
          why: '`ofNullable` accepts null and gives empty; `of` rejects null.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(Optional.of(5).filter(n -> n > 10).map(n -> n * 2).orElse(-1));
    }
}`,
          answer: '-1',
          why: '`filter` empties the Optional, so `map` is skipped and the fallback is used.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(Optional.of("a").flatMap(s -> Optional.of(s + "b")).get());
        Optional.empty().ifPresentOrElse(
            x -> System.out.println("has"),
            () -> System.out.println("empty"));
    }
}`,
          answer: 'ab\nempty',
          why: '`flatMap` avoids a nested Optional; `ifPresentOrElse` runs the second action for empty.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Optional<Integer> max = List.of(3, 8, 1).stream().max(Integer::compare);
        Optional<Integer> none = List.<Integer>of().stream().max(Integer::compare);
        System.out.println(max.get() + " " + none.isEmpty());
    }
}`,
          answer: '8 true',
          why: '`max` returns an Optional because the stream may be empty.'
        }
      ],
      fill: [
        {
          q: 'Trim a possibly null input, or use "anon".',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        String input = null;
        String name = Optional.ofNullable(input).[[map]](String::trim).[[orElse]]("anon");
        System.out.println(name);
    }
}`,
          expect: 'anon',
          why: 'Empty skips `map`; `orElse` supplies the default.'
        },
        {
          q: 'Wrap a map lookup that may return null.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, String> env = Map.of("HOME", "/home/me");
        Optional.[[ofNullable]](env.get("HOME")).ifPresent(System.out::println);
        Optional.ofNullable(env.get("PATH")).ifPresent(System.out::println);
    }
}`,
          expect: '/home/me',
          why: '`ofNullable` turns a possible null into an empty Optional; `ifPresent` then does nothing.'
        }
      ],
      bug: [
        {
          q: 'Print "none" when there is no first long word.',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Optional<String> opt = List.of("a", "bb").stream().filter(s -> s.length() > 5).findFirst();
        String v = opt.get();
        System.out.println(v);
    }
}`,
          line: 6,
          fix: 'String v = opt.orElse("none");',
          expect: 'none',
          why: '`get()` on an empty Optional throws NoSuchElementException.'
        },
        {
          q: 'A missing nickname should give "?".',
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        String nick = null;
        String shown = Optional.of(nick).orElse("?");
        System.out.println(shown);
    }
}`,
          line: 6,
          fix: 'String shown = Optional.ofNullable(nick).orElse("?");',
          expect: '?',
          why: '`Optional.of(null)` throws NullPointerException.'
        }
      ]
    }
  });
})();
