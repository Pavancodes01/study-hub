(function () {
  const r = (name, ref) => ({ name, ref });
  const L = (id, cells, extra) => Object.assign({ id, type: 'ArrayList', cells: cells.map((c) => '"' + c + '"') }, extra || {});
  const team = { id: 't1', type: 'Team', fields: [r('members (private)', 'l2')] };

  registerLesson({
    slug: 'access',
    track: 'oop',
    title: 'Access modifiers and encapsulation',
    one: '`private` hides a field, but a getter that returns your *internal list* hands the key to everyone. Copy on the way in and on the way out.',
    idea: [
      'Encapsulation means an object controls its own state: fields are `private`, and changes go through methods that can check them.',
      '`private` only protects the **variable**. If the variable holds a reference to a mutable object (a List, an array, a Date), anyone who gets that reference can change the object.',
      'So store a copy of what you are given (**defensive copy in**) and return a copy or a read-only view (**defensive copy out**).'
    ],
    stages: [
      {
        title: 'Defensive copies',
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>(List.of("a"));
        Team t = new Team(names);
        names.add("hacker");
        System.out.println(t.size());
        try {
            t.members().add("x");
        } catch (UnsupportedOperationException e) {
            System.out.println("read-only");
        }
    }
}
class Team {
    private final List<String> members;
    Team(List<String> members) {
        this.members = new ArrayList<>(members);
    }
    int size() { return members.size(); }
    List<String> members() { return Collections.unmodifiableList(members); }
}`,
        steps: [
          { line: 5, text: 'The caller owns a list.', stack: [{ frame: 'main', vars: [r('names', 'l1')] }], heap: [L('l1', ['a'])], out: '' },
          { line: 19, text: 'The constructor stores a **copy**, not the caller\'s list.',
            stack: [{ frame: 'main', vars: [r('names', 'l1')] }, { frame: 'Team(List)', vars: [r('this', 't1'), r('members', 'l1')] }], heap: [L('l1', ['a']), team, L('l2', ['a'])] },
          { line: 6, text: 'The constructor is done.', stack: [{ frame: 'main', vars: [r('names', 'l1'), r('t', 't1')] }] },
          { line: 7, text: 'The caller changes **its** list. The team\'s copy is untouched.', heap: [L('l1', ['a', 'hacker']), team, L('l2', ['a'])] },
          { line: 8, text: 'Still one member.', out: '1\n' },
          { line: 22, text: 'The getter returns a read-only **view** that wraps the internal list.',
            stack: [{ frame: 'main', vars: [r('names', 'l1'), r('t', 't1')] }, { frame: 'members', vars: [r('this', 't1')] }],
            heap: [L('l1', ['a', 'hacker']), team, L('l2', ['a']), { id: 'u1', type: 'UnmodifiableList', fields: [r('list', 'l2')] }] },
          { line: 12, text: 'Any change through the view throws. The view itself is now garbage.',
            stack: [{ frame: 'main', vars: [r('names', 'l1'), r('t', 't1')] }],
            heap: [L('l1', ['a', 'hacker']), team, L('l2', ['a']), { id: 'u1', type: 'UnmodifiableList', fields: [r('list', 'l2')], gone: true }], out: '1\nread-only\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The four levels',
        text: [
          [
            '`private`: only inside the same top-level class (nested classes included).',
            'no modifier (package-private): any class in the same package.',
            '`protected`: same package, plus subclasses in other packages.',
            '`public`: everyone.'
          ],
          'Start with the most restrictive level that works, and open it up only when needed.'
        ]
      },
      {
        name: 'Copies vs views',
        text: [
          [
            '`new ArrayList<>(list)`: an independent mutable copy.',
            '`List.copyOf(list)`: an independent **immutable** copy (no nulls allowed).',
            '`Collections.unmodifiableList(list)`: a read-only **view**. The owner can still change the list, and the view shows it.'
          ]
        ],
        code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> src = new ArrayList<>(List.of(1));
        List<Integer> view = Collections.unmodifiableList(src);
        List<Integer> copy = List.copyOf(src);
        src.add(2);
        System.out.println(view + " " + copy);
    }
}`,
        expect: '[1, 2] [1]'
      },
      {
        name: 'Getters and setters are not automatically encapsulation',
        text: [
          'A getter and setter for every field is just a public field with extra steps. Expose behaviour instead (`account.withdraw(50)` that checks the balance), not raw state (`setBalance`).'
        ]
      }
    ],
    table: {
      head: ['Modifier', 'Same class', 'Same package', 'Subclass (other package)', 'Anywhere'],
      rows: [
        ['`private`', 'yes', 'no', 'no', 'no'],
        ['(none)', 'yes', 'yes', 'no', 'no'],
        ['`protected`', 'yes', 'yes', 'yes', 'no'],
        ['`public`', 'yes', 'yes', 'yes', 'yes']
      ]
    },
    pitfalls: [
      ['Returning an internal mutable field', 'The caller can change your state. Return a copy or an unmodifiable view.'],
      ['Storing the caller\'s array or list', 'The caller can change it later. Copy it in the constructor.'],
      ['Thinking `final` makes the object immutable', '`final` fixes the reference only; the list it points to can still change.'],
      ['`private` means per object', 'No: per class. One object can read another object\'s private fields if they are the same class.']
    ],
    interview: [
      ['What is encapsulation?', ['Keeping an object\'s state private and allowing changes only through methods that keep it valid. It hides representation so it can change later without breaking callers.']],
      ['`protected` vs package-private?', ['Both allow access within the package. `protected` also allows subclasses in other packages to access the member through inheritance.']],
      ['Can an object access another object\'s private field?', ['Yes, if both are instances of the same class. Access control is per class, not per object; `equals` implementations rely on this.']]
    ],
    say: [
      'Private fields, behaviour-revealing methods.',
      'Defensive copy in, defensive copy (or view) out.',
      '`final` on a field is not immutability.'
    ],
    checklist: [
      'Fill in the access-modifier table from memory.',
      'Explain copy vs unmodifiable view.',
      'Fix a getter that leaks an internal list.',
      'Fix a constructor that stores the caller\'s array.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    static class Box {
        private int v;
        Box(int v) { this.v = v; }
        boolean bigger(Box o) { return v > o.v; }
    }
    public static void main(String[] args) {
        System.out.println(new Box(3).bigger(new Box(2)));
    }
}`,
          answer: 'true',
          why: 'Private access is per class, so a Box can read another Box\'s `v`.'
        },
        {
          code: `public class Main {
    static class Grades {
        private final int[] g = {90, 80};
        int[] get() { return g; }
        int first() { return g[0]; }
    }
    public static void main(String[] args) {
        Grades x = new Grades();
        x.get()[0] = 0;
        System.out.println(x.first());
    }
}`,
          answer: '0',
          why: 'The getter hands out the internal array itself, so the caller can change it.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        final List<Integer> l = new ArrayList<>();
        l.add(1);
        l.add(2);
        System.out.println(l);
    }
}`,
          answer: '[1, 2]',
          why: '`final` stops `l` from being reassigned. The list it points to is still mutable.'
        },
        {
          code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> src = new ArrayList<>(List.of("a"));
        List<String> view = Collections.unmodifiableList(src);
        src.add("b");
        System.out.println(view.size());
    }
}`,
          answer: '2',
          why: 'An unmodifiable view blocks changes through itself but still shows changes made to the original.'
        }
      ],
      fill: [
        {
          q: 'Hide the balance and expose it read-only.',
          code: `public class Main {
    static class Account {
        [[private]] int balance = 100;
        int getBalance() { return [[balance|this.balance]]; }
    }
    public static void main(String[] args) {
        System.out.println(new Account().getBalance());
    }
}`,
          expect: '100',
          why: 'A private field plus a getter: callers can read but not assign.'
        },
        {
          q: 'Keep tags safe from the caller.',
          code: `import java.util.*;

public class Main {
    static class Post {
        private final List<String> tags;
        Post(List<String> tags) { this.tags = [[List.copyOf(tags)|new ArrayList<>(tags)]]; }
        int count() { return tags.size(); }
    }
    public static void main(String[] args) {
        List<String> t = new ArrayList<>(List.of("java"));
        Post p = new Post(t);
        t.add("spam");
        System.out.println(p.count());
    }
}`,
          expect: '1',
          why: 'Copying in the constructor means later changes by the caller do not reach the object.'
        }
      ],
      bug: [
        {
          q: 'Callers must not be able to empty the cart.',
          code: `import java.util.*;

public class Main {
    static class Cart {
        private final List<String> items = new ArrayList<>(List.of("tea", "jam"));
        List<String> items() {
            return items;
        }
    }
    public static void main(String[] args) {
        Cart c = new Cart();
        try { c.items().clear(); } catch (UnsupportedOperationException e) { }
        System.out.println(c.items().size());
    }
}`,
          line: 7,
          fix: 'return List.copyOf(items);',
          expect: '2',
          why: 'Returning the internal list lets the caller change it. Return a copy (or a read-only view).'
        },
        {
          q: 'The first reading must stay 5.',
          code: `public class Main {
    static class Readings {
        private final int[] data;
        Readings(int[] data) {
            this.data = data;
        }
        int first() { return data[0]; }
    }
    public static void main(String[] args) {
        int[] raw = {5, 6};
        Readings r = new Readings(raw);
        raw[0] = 99;
        System.out.println(r.first());
    }
}`,
          line: 5,
          fix: 'this.data = data.clone();',
          expect: '5',
          why: 'Storing the caller\'s array shares it. Copy it when it comes in.'
        }
      ]
    }
  });
})();
