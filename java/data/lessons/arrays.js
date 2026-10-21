(function () {
  const r = (name, ref) => ({ name, ref });
  const at = (id) => ({ ref: id });
  const nil = { ref: null };

  registerLesson({
    slug: 'arrays',
    track: 'basics',
    title: 'Arrays',
    one: 'An array is an *object* with a fixed length. A 2D array is an array of references to other arrays.',
    idea: [
      '`new int[3]` makes one object on the heap with three slots, all set to 0. The variable holds a reference to it, so `int[] b = a` shares the array; it does not copy it.',
      'Java has no real 2D arrays. `int[][]` is an array whose slots hold references to `int[]` rows. Rows can have different lengths and can even be shared.',
      'The length is fixed when the array is made. If you need to grow, use `Arrays.copyOf` or an `ArrayList`.'
    ],
    stages: [
      {
        title: 'Sharing and 2D',
        code: `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] a = new int[3];
        a[1] = 7;
        int[] b = a;
        b[2] = 9;
        int[][] grid = new int[2][];
        grid[0] = new int[]{1, 2};
        grid[1] = a;
        System.out.println(Arrays.toString(a));
        System.out.println(grid[1][2] + " " + grid.length);
    }
}`,
        steps: [
          { line: 5, text: 'A new array of 3 ints, every slot set to the default 0.', stack: [{ frame: 'main', vars: [r('a', 'a1')] }], heap: [{ id: 'a1', type: 'int[3]', cells: [0, 0, 0] }], out: '' },
          { line: 6, text: 'Write into slot 1.', heap: [{ id: 'a1', type: 'int[3]', cells: [0, 7, 0] }] },
          { line: 7, text: '`b = a` copies the reference. There is still only one array.', stack: [{ frame: 'main', vars: [r('a', 'a1'), r('b', 'a1')] }] },
          { line: 8, text: 'Writing through `b` changes the array that `a` sees too.', heap: [{ id: 'a1', type: 'int[3]', cells: [0, 7, 9] }] },
          { line: 9, text: '`new int[2][]` makes the outer array only. Its two slots are references, still `null`.', stack: [{ frame: 'main', vars: [r('a', 'a1'), r('b', 'a1'), r('grid', 'g')] }],
            heap: [{ id: 'g', type: 'int[2][]', cells: [nil, nil] }, { id: 'a1', type: 'int[3]', cells: [0, 7, 9] }] },
          { line: 10, text: 'Row 0 gets its own new array of length 2.',
            heap: [{ id: 'g', type: 'int[2][]', cells: [at('r0'), nil] }, { id: 'r0', type: 'int[2]', cells: [1, 2] }, { id: 'a1', type: 'int[3]', cells: [0, 7, 9] }] },
          { line: 11, text: 'Row 1 points at the **same** array as `a`. Rows do not need equal lengths.',
            heap: [{ id: 'g', type: 'int[2][]', cells: [at('r0'), at('a1')] }, { id: 'r0', type: 'int[2]', cells: [1, 2] }, { id: 'a1', type: 'int[3]', cells: [0, 7, 9] }] },
          { line: 12, text: '`Arrays.toString` prints the contents.', out: '[0, 7, 9]\n' },
          { line: 13, text: '`grid[1][2]` follows the shared row to 9. `grid.length` counts rows: 2.', out: '[0, 7, 9]\n9 2\n' }
        ]
      },
      {
        title: 'clone() is shallow',
        code: `public class Main {
    public static void main(String[] args) {
        int[][] m = {{1, 2}, {3, 4}};
        int[][] copy = m.clone();
        copy[0][0] = 99;
        copy[1] = new int[]{7, 7};
        System.out.println(m[0][0] + " " + m[1][0]);
    }
}`,
        steps: [
          { line: 3, text: 'An outer array holding two row references.', stack: [{ frame: 'main', vars: [r('m', 'm')] }],
            heap: [{ id: 'm', type: 'int[2][]', cells: [at('r0'), at('r1')] }, { id: 'r0', type: 'int[2]', cells: [1, 2], row: 'rows' }, { id: 'r1', type: 'int[2]', cells: [3, 4], row: 'rows' }], out: '' },
          { line: 4, text: '`clone()` copies the outer array only. The copy\'s slots point at the **same rows**.', stack: [{ frame: 'main', vars: [r('m', 'm'), r('copy', 'c')] }],
            heap: [{ id: 'm', type: 'int[2][]', cells: [at('r0'), at('r1')] }, { id: 'c', type: 'int[2][] (copy)', cells: [at('r0'), at('r1')] }, { id: 'r0', type: 'int[2]', cells: [1, 2], row: 'rows' }, { id: 'r1', type: 'int[2]', cells: [3, 4], row: 'rows' }] },
          { line: 5, text: 'Changing an element of a shared row is visible through `m`.',
            heap: [{ id: 'm', type: 'int[2][]', cells: [at('r0'), at('r1')] }, { id: 'c', type: 'int[2][] (copy)', cells: [at('r0'), at('r1')] }, { id: 'r0', type: 'int[2]', cells: [99, 2], row: 'rows' }, { id: 'r1', type: 'int[2]', cells: [3, 4], row: 'rows' }] },
          { line: 6, text: 'Replacing a whole row changes only the copy\'s outer array.',
            heap: [{ id: 'm', type: 'int[2][]', cells: [at('r0'), at('r1')] }, { id: 'c', type: 'int[2][] (copy)', cells: [at('r0'), at('n1')] }, { id: 'r0', type: 'int[2]', cells: [99, 2], row: 'rows' }, { id: 'r1', type: 'int[2]', cells: [3, 4], row: 'rows' }, { id: 'n1', type: 'int[2]', cells: [7, 7], row: 'rows' }] },
          { line: 7, text: '`m` sees 99 but still has its old row 1.', out: '99 3\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Making arrays',
        text: [
          [
            '`int[] a = new int[n];` slots get default values (0, false, null).',
            '`int[] a = {3, 1, 2};` an initializer, only allowed in a declaration.',
            '`new int[]{3, 1, 2}` an anonymous array you can pass to a method.',
            '`a.length` is a field, not a method (Strings use `length()`).'
          ]
        ]
      },
      {
        name: 'The `java.util.Arrays` toolkit',
        text: [
          'Arrays do not override `toString` or `equals`, so use the helpers.'
        ],
        code: `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] a = {5, 3, 8, 1};
        int[] b = Arrays.copyOf(a, 6);           // grows, pads with 0
        Arrays.sort(a);
        System.out.println(Arrays.toString(a));
        System.out.println(Arrays.toString(b));
        System.out.println(Arrays.binarySearch(a, 5));
        int[] filled = new int[3];
        Arrays.fill(filled, -1);
        System.out.println(Arrays.equals(filled, new int[]{-1, -1, -1}));
        System.out.println(Arrays.deepToString(new int[][]{{1}, {2, 3}}));
    }
}`,
        expect: '[1, 3, 5, 8]\n[5, 3, 8, 1, 0, 0]\n2\ntrue\n[[1], [2, 3]]'
      },
      {
        name: 'Copying',
        text: [
          [
            '`b = a` shares the array (no copy).',
            '`a.clone()`, `Arrays.copyOf`, `System.arraycopy` copy one level. For an array of objects or a 2D array, the inner objects are still shared.',
            'Deep copy of a 2D int array: copy each row, for example `int[][] d = new int[m.length][]; for (int i...) d[i] = m[i].clone();`'
          ]
        ]
      }
    ],
    table: {
      head: ['You want', 'Use'],
      rows: [
        ['print contents', '`Arrays.toString(a)` / `Arrays.deepToString(m)`'],
        ['compare contents', '`Arrays.equals(a, b)` / `Arrays.deepEquals`'],
        ['sort', '`Arrays.sort(a)` (dual-pivot quicksort for primitives, TimSort for objects)'],
        ['grow or shrink', '`Arrays.copyOf(a, newLen)`'],
        ['fill', '`Arrays.fill(a, v)`'],
        ['to a List', '`Arrays.asList(objs)` (fixed size) or `List.of(...)`']
      ]
    },
    pitfalls: [
      ['Printing an array directly', 'You get something like `[I@1b6d3586`. Use `Arrays.toString`.'],
      ['`a.equals(b)` or `a == b`', 'Both compare references. Use `Arrays.equals`.'],
      ['Filling rows with the same array', '`for (...) grid[i] = row;` makes every row the same object.'],
      ['`Arrays.asList(int[])`', 'Gives a `List<int[]>` with one element, not a list of ints.']
    ],
    interview: [
      ['Are arrays objects in Java?', ['Yes. They live on the heap, have a `length` field, extend `Object`, and are passed by reference value like any object.']],
      ['How is a 2D array stored?', ['As an array of references to 1D arrays. Rows are separate objects, may have different lengths (jagged arrays) and are not necessarily next to each other in memory.']],
      ['Array vs ArrayList?', ['Arrays have fixed length, can hold primitives, and are slightly faster. ArrayList grows automatically, holds only objects (boxing for primitives), and offers a rich API.']]
    ],
    say: [
      'An array variable holds a reference; assigning it shares the array.',
      'A 2D array is an array of row references.',
      '`clone()` and `copyOf` are shallow copies.'
    ],
    checklist: [
      'Draw the heap for `int[][] g = new int[2][3]`.',
      'Explain why `clone()` of a 2D array is shallow.',
      'Use `Arrays.toString`, `sort`, `copyOf` and `equals`.',
      'Reverse an array in place.'
    ],
    drills: {
      predict: [
        {
          code: `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] x = {1, 2, 3};
        int[] y = {1, 2, 3};
        System.out.println(x == y);
        System.out.println(x.equals(y));
        System.out.println(Arrays.equals(x, y));
    }
}`,
          answer: 'false\nfalse\ntrue',
          why: 'Two separate array objects. Arrays inherit `equals` from Object, which compares references. `Arrays.equals` compares contents.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        String[] s = new String[2];
        boolean[] f = new boolean[1];
        System.out.println(s[0] + " " + f[0]);
    }
}`,
          answer: 'null false',
          why: 'Array slots get default values: `null` for references, `false` for booleans.'
        },
        {
          code: `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] a = {3, 1, 2};
        Arrays.sort(a);
        System.out.println(Arrays.toString(a) + " " + Arrays.binarySearch(a, 3));
    }
}`,
          answer: '[1, 2, 3] 2',
          why: 'After sorting, 3 is at index 2.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        char[] c = {'h', 'i'};
        System.out.println(c);
        System.out.println(c.length);
    }
}`,
          answer: 'hi\n2',
          why: '`println` has a special overload for `char[]` that prints the characters. (`"" + c` would print the reference instead.)'
        }
      ],
      fill: [
        {
          q: 'Reverse the array in place.',
          code: `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4};
        for (int i = 0, j = a.length - 1; i < j; i++, j--) {
            int t = a[i];
            a[i] = [[a[j]]];
            a[j] = [[t]];
        }
        System.out.println(Arrays.toString(a));
    }
}`,
          expect: '[4, 3, 2, 1]',
          why: 'Save one side in a temp, copy the other side over it, then write the temp back.'
        },
        {
          q: 'Get the number of columns.',
          code: `public class Main {
    public static void main(String[] args) {
        int[][] g = new int[3][4];
        int rows = g.length;
        int cols = g[0].[[length]];
        System.out.println(rows + "x" + cols);
    }
}`,
          expect: '3x4',
          why: '`g.length` counts rows; each row is an array with its own `length`.'
        }
      ],
      bug: [
        {
          q: 'Print the grid as `[[1, 2], [3, 4]]`.',
          code: `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[][] grid = {{1, 2}, {3, 4}};
        System.out.println(Arrays.toString(grid));
    }
}`,
          line: 6,
          fix: 'System.out.println(Arrays.deepToString(grid));',
          expect: '[[1, 2], [3, 4]]',
          why: '`toString` prints the row references. `deepToString` goes into each row.'
        },
        {
          q: 'Rows should be independent.',
          code: `public class Main {
    public static void main(String[] args) {
        int[] row = new int[2];
        int[][] g = new int[2][];
        for (int i = 0; i < 2; i++) g[i] = row;
        g[0][0] = 1;
        System.out.println(g[1][0]);
    }
}`,
          line: 5,
          fix: 'for (int i = 0; i < 2; i++) g[i] = new int[2];',
          expect: '0',
          why: 'Every row points at the same array, so writing row 0 also changes row 1. Make a new array per row.'
        }
      ]
    }
  });
})();
