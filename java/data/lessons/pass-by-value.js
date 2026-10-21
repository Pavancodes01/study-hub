(function () {
  const v = (name, value) => ({ name, value });
  const r = (name, ref) => ({ name, ref });
  const dog = (id, name) => ({ id, type: 'Dog', fields: [v('name', '"' + name + '"')] });

  registerLesson({
    slug: 'pass-by-value',
    track: 'basics',
    title: 'Methods and pass-by-value',
    one: 'Java always passes a *copy*. For an object, the copy is a copy of the reference, not of the object.',
    idea: [
      'When you call a method, Java copies each argument into a new variable in the new stack frame. That is all "pass-by-value" means.',
      'A primitive variable holds the value itself, so the method gets its own copy of the number. An object variable holds a reference (an arrow to the heap), so the method gets a copy of the arrow. Both arrows point at the **same object**.',
      'So a method can change the object the arrow points to, but it can never make the caller\'s variable point somewhere else.'
    ],
    stages: [
      {
        title: 'Primitive vs object',
        code: `public class Main {
    static void bump(int n) {
        n = n + 1;
    }
    static void rename(Dog d) {
        d.name = "Max";
    }
    static void replace(Dog d) {
        d = new Dog("Rex");
    }
    public static void main(String[] args) {
        int count = 5;
        bump(count);
        System.out.println(count);
        Dog dog = new Dog("Bo");
        rename(dog);
        System.out.println(dog.name);
        replace(dog);
        System.out.println(dog.name);
    }
}
class Dog {
    String name;
    Dog(String name) { this.name = name; }
}`,
        steps: [
          { line: 12, text: '`main` gets a stack frame. `count` holds the number 5 directly. Nothing is on the heap yet.',
            stack: [{ frame: 'main', vars: [v('count', 5)] }], heap: [], out: '' },
          { line: 2, text: 'Calling `bump(count)` pushes a new frame. The value 5 is **copied** into the parameter `n`.',
            stack: [{ frame: 'main', vars: [v('count', 5)] }, { frame: 'bump', vars: [v('n', 5)] }] },
          { line: 3, text: '`n` becomes 6. Only the copy in the `bump` frame changes; `count` is a different variable.',
            stack: [{ frame: 'main', vars: [v('count', 5)] }, { frame: 'bump', vars: [v('n', 6)] }] },
          { line: 14, text: '`bump` returns and its frame is thrown away, along with `n`. `count` is still 5.',
            stack: [{ frame: 'main', vars: [v('count', 5)] }], out: '5\n' },
          { line: 15, text: '`new Dog("Bo")` creates an object on the heap. `dog` does not hold the object; it holds a **reference** to it.',
            stack: [{ frame: 'main', vars: [v('count', 5), r('dog', 'd1')] }], heap: [dog('d1', 'Bo')] },
          { line: 5, text: '`rename(dog)` copies the reference into `d`. Now two arrows point at **one** Dog.',
            stack: [{ frame: 'main', vars: [v('count', 5), r('dog', 'd1')] }, { frame: 'rename', vars: [r('d', 'd1')] }] },
          { line: 6, text: '`d.name = "Max"` follows the arrow and changes the shared object. The caller will see this.',
            heap: [dog('d1', 'Max')] },
          { line: 17, text: 'Back in `main`. `dog` points at the same object, which now says Max.',
            stack: [{ frame: 'main', vars: [v('count', 5), r('dog', 'd1')] }], out: '5\nMax\n' },
          { line: 8, text: '`replace(dog)` again copies the reference into its own `d`.',
            stack: [{ frame: 'main', vars: [v('count', 5), r('dog', 'd1')] }, { frame: 'replace', vars: [r('d', 'd1')] }] },
          { line: 9, text: '`d = new Dog("Rex")` re-points the **copy**. `main`\'s `dog` still points at the old object.',
            stack: [{ frame: 'main', vars: [v('count', 5), r('dog', 'd1')] }, { frame: 'replace', vars: [r('d', 'd2')] }],
            heap: [dog('d1', 'Max'), dog('d2', 'Rex')] },
          { line: 19, text: '`replace` returns. Nothing points at Rex any more, so it is garbage. `dog.name` is still Max.',
            stack: [{ frame: 'main', vars: [v('count', 5), r('dog', 'd1')] }],
            heap: [dog('d1', 'Max'), Object.assign(dog('d2', 'Rex'), { gone: true })], out: '5\nMax\nMax\n' }
        ]
      },
      {
        title: 'Arrays: swap works, reset does not',
        code: `public class Main {
    static void swap(int[] arr, int i, int j) {
        int t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
    }
    static void reset(int[] arr) {
        arr = new int[]{0, 0};
    }
    public static void main(String[] args) {
        int[] nums = {1, 2};
        swap(nums, 0, 1);
        System.out.println(nums[0] + " " + nums[1]);
        reset(nums);
        System.out.println(nums[0] + " " + nums[1]);
    }
}`,
        steps: [
          { line: 11, text: 'An array is an object. `nums` holds a reference to it.',
            stack: [{ frame: 'main', vars: [r('nums', 'a1')] }], heap: [{ id: 'a1', type: 'int[2]', cells: [1, 2] }], out: '' },
          { line: 3, text: '`swap` gets a copy of the reference plus copies of 0 and 1. `t` saves `arr[0]`, which is 1.',
            stack: [{ frame: 'main', vars: [r('nums', 'a1')] }, { frame: 'swap', vars: [r('arr', 'a1'), v('i', 0), v('j', 1), v('t', 1)] }] },
          { line: 4, text: '`arr[0] = arr[1]` writes into the shared array.',
            heap: [{ id: 'a1', type: 'int[2]', cells: [2, 2] }] },
          { line: 5, text: '`arr[1] = t` finishes the swap. Both arrows still point at this one array.',
            heap: [{ id: 'a1', type: 'int[2]', cells: [2, 1] }] },
          { line: 13, text: 'Back in `main`, the swap is visible because the array itself changed.',
            stack: [{ frame: 'main', vars: [r('nums', 'a1')] }], out: '2 1\n' },
          { line: 7, text: '`reset(nums)` copies the reference into `arr`.',
            stack: [{ frame: 'main', vars: [r('nums', 'a1')] }, { frame: 'reset', vars: [r('arr', 'a1')] }] },
          { line: 8, text: 'A new array is made and only the local copy `arr` points at it. `nums` is untouched.',
            stack: [{ frame: 'main', vars: [r('nums', 'a1')] }, { frame: 'reset', vars: [r('arr', 'a2')] }],
            heap: [{ id: 'a1', type: 'int[2]', cells: [2, 1] }, { id: 'a2', type: 'int[2]', cells: [0, 0] }] },
          { line: 15, text: 'The frame is gone, the new array is garbage, and `main` still prints 2 1.',
            stack: [{ frame: 'main', vars: [r('nums', 'a1')] }],
            heap: [{ id: 'a1', type: 'int[2]', cells: [2, 1] }, { id: 'a2', type: 'int[2]', cells: [0, 0], gone: true }], out: '2 1\n2 1\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'The one rule',
        text: [
          'Every argument is copied into the parameter. There is no exception and no keyword (like C++ `&`) to change it.',
          [
            '**Primitive** (`int`, `double`, `boolean`, …): the number itself is copied. The method cannot affect the caller\'s variable.',
            '**Reference** (any object, array, String, List…): the arrow is copied. The method can use the arrow to **change the object**, but reassigning the parameter only moves its own arrow.'
          ],
          'People say "objects are passed by reference". That is wrong in Java, and interviewers check for it. The correct phrase is: **references are passed by value**.'
        ]
      },
      {
        name: 'Two tests that tell them apart',
        text: [
          'Mutation through the parameter is seen by the caller. Reassignment of the parameter is not.'
        ],
        code: `import java.util.*;

public class Main {
    static void mutate(List<String> list) {
        list.add("seen");             // changes the shared object
    }
    static void reassign(List<String> list) {
        list = new ArrayList<>();     // moves only the local arrow
        list.add("lost");
    }
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        mutate(names);
        reassign(names);
        System.out.println(names);    // [seen]
    }
}`,
        expect: '[seen]'
      },
      {
        name: 'How to give a result back',
        text: [
          'Because a method cannot re-point the caller\'s variable, you return the new value and let the caller assign it.',
          [
            'Primitives: `count = increment(count);`',
            'Strings are immutable, so the same applies: `name = name.trim();`',
            'For several results, return a small `record` or mutate an object the caller owns.'
          ]
        ],
        code: `public class Main {
    record MinMax(int min, int max) {}

    static MinMax range(int[] a) {
        int lo = a[0], hi = a[0];
        for (int x : a) {
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
        }
        return new MinMax(lo, hi);
    }
    public static void main(String[] args) {
        System.out.println(range(new int[]{4, 9, 1, 7}));
    }
}`,
        expect: 'MinMax[min=1, max=9]'
      },
      {
        name: 'Why `String` feels like a primitive',
        text: [
          'A `String` is an object and is passed like any other reference. It only *looks* like a copy because no `String` method changes the object; methods such as `toUpperCase()` return a new String.',
          'So a method that does `s = s.toUpperCase();` re-points its own copy and the caller sees nothing.'
        ]
      }
    ],
    table: {
      head: ['Inside the method you…', 'Primitive parameter', 'Reference parameter'],
      rows: [
        ['assign the parameter `p = …`', 'caller unchanged', 'caller unchanged'],
        ['change a field / element `p.x = …`', 'not possible', 'caller **sees it**'],
        ['call a mutating method `p.add(…)`', 'not possible', 'caller **sees it**'],
        ['call a method on an immutable type `s.trim()`', 'not possible', 'caller unchanged (new object returned)']
      ]
    },
    pitfalls: [
      ['Writing a `swap(int a, int b)` method', 'It swaps two copies and has no effect. Swap elements inside an array, or return the values.'],
      ['Reassigning a parameter and expecting the caller to see it', '`list = new ArrayList<>()` inside a method never changes the caller. Clear it with `list.clear()` or return the new list.'],
      ['Forgetting that the caller\'s object can be changed', 'If you sort or edit a list you were given, the caller sees it. Copy first (`new ArrayList<>(list)`) when the caller should not be affected.'],
      ['Calling `s.trim()` without using the result', 'Strings never change. Write `s = s.trim();`.']
    ],
    interview: [
      ['Is Java pass-by-value or pass-by-reference?', ['Always pass-by-value. For objects, the value that gets copied is the reference. The method and the caller then share the object, but they have separate variables.']],
      ['Can you write a method that swaps two `Integer` variables of the caller?', ['No. The method only receives copies of the references, and `Integer` is immutable. You can swap two elements of an array or fields of an object, because those live in a shared object.']],
      ['A method sets its parameter to `null`. What happens to the caller\'s variable?', ['Nothing. Only the method\'s copy becomes `null`. The object is still reachable through the caller\'s variable.']],
      ['Why does `final` on a parameter not stop the object from changing?', ['`final` stops the parameter from being reassigned. It does not make the object immutable, so `p.name = "x"` still compiles and works.']]
    ],
    say: [
      'Java is always pass-by-value; for objects, the reference is the value.',
      'A method can change an object it was given, but not which object the caller\'s variable points to.',
      'To hand back a new value, return it and let the caller assign it.'
    ],
    checklist: [
      'Explain the difference between changing a parameter and changing the object it points to.',
      'Predict what a `swap(a, b)` method on two ints does.',
      'Say why a `String` argument never changes in the caller.',
      'Return several results from one method with a `record`.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    static int twice(int x) {
        x = x * 2;
        return x;
    }
    public static void main(String[] args) {
        int x = 4;
        int y = twice(x);
        System.out.println(x + " " + y);
    }
}`,
          answer: '4 8',
          why: 'The `x` inside `twice` is a separate copy. Only the returned value reaches `y`.'
        },
        {
          code: `public class Main {
    static void add(StringBuilder sb, String s) {
        sb.append(s);
        sb = new StringBuilder("lost");
        sb.append("!");
    }
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("hi");
        add(sb, " there");
        System.out.println(sb);
    }
}`,
          answer: 'hi there',
          why: 'The first `append` goes through the shared reference. After the parameter is re-pointed, `"!"` is added to a new builder the caller never sees.'
        },
        {
          code: `public class Main {
    static void shout(String s) {
        s = s.toUpperCase();
    }
    public static void main(String[] args) {
        String word = "java";
        shout(word);
        System.out.println(word);
    }
}`,
          answer: 'java',
          why: '`toUpperCase()` returns a new String and only the local `s` points at it.'
        },
        {
          code: `import java.util.*;

public class Main {
    static void fill(List<Integer> list) {
        list.add(1);
        list = new ArrayList<>();
        list.add(2);
    }
    public static void main(String[] args) {
        List<Integer> nums = new ArrayList<>();
        fill(nums);
        System.out.println(nums);
    }
}`,
          answer: '[1]',
          why: '`add(1)` changes the caller\'s list. After reassignment, `add(2)` goes into a new list that is thrown away.'
        }
      ],
      fill: [
        {
          q: 'Make `inc` give the caller a new value.',
          code: `public class Main {
    static [[int]] inc(int n) {
        return [[n + 1|n+1|++n|1 + n|1+n]];
    }
    public static void main(String[] args) {
        int c = 0;
        c = inc(c);
        c = inc(c);
        System.out.println(c);
    }
}`,
          expect: '2',
          why: 'A method cannot change the caller\'s `int`, so it returns the new value and the caller assigns it.'
        },
        {
          q: 'Change the caller\'s object from inside the method.',
          code: `public class Main {
    static void rename(Person p) {
        [[p.name]] = "Ana";
    }
    public static void main(String[] args) {
        Person who = new Person();
        rename(who);
        System.out.println(who.name);
    }
}
class Person {
    String name = "?";
}`,
          expect: 'Ana',
          why: '`p` and `who` point at the same Person, so writing a field through `p` is visible to the caller.'
        }
      ],
      bug: [
        {
          q: '`clear` should set every element of the caller\'s array to 0.',
          code: `public class Main {
    static void clear(int[] arr) {
        arr = new int[arr.length];
    }
    public static void main(String[] args) {
        int[] data = {4, 5, 6};
        clear(data);
        System.out.println(java.util.Arrays.toString(data));
    }
}`,
          line: 3,
          fix: 'java.util.Arrays.fill(arr, 0);',
          expect: '[0, 0, 0]',
          why: 'Making a new array only re-points the local copy. Write into the array the caller passed.'
        },
        {
          q: '`load` should put two names into the caller\'s list.',
          code: `import java.util.*;

public class Main {
    static void load(List<String> out) {
        out = List.of("a", "b");
    }
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        load(names);
        System.out.println(names.size());
    }
}`,
          line: 5,
          fix: 'out.addAll(List.of("a", "b"));',
          expect: '2',
          why: 'Assigning `out` changes only the parameter. Use a method that changes the list the caller gave you.'
        }
      ]
    }
  });
})();
