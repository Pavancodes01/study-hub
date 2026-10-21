(function () {
  const v = (name, value) => ({ name, value });
  const f = (vars) => [{ frame: 'main', vars }];

  registerLesson({
    slug: 'control-flow',
    track: 'basics',
    title: 'Control flow: loops and switch',
    one: '`continue` skips to the next round, `break` leaves the loop, and the arrow `switch` *never falls through*.',
    idea: [
      'A `for` loop has three parts: start, condition, update. The loop variable exists only inside the loop; it appears in the frame when the loop starts and disappears when it ends.',
      '`continue` jumps to the update step. `break` leaves the innermost loop or switch. With a **label** you can break out of an outer loop.',
      'The old `switch` with `case X:` falls through to the next case unless you `break`. The modern `case X ->` form (Java 14+) never falls through and can return a value.'
    ],
    stages: [
      {
        title: 'continue and break',
        code: `public class Main {
    public static void main(String[] args) {
        int sum = 0;
        for (int i = 1; i <= 5; i++) {
            if (i == 2) continue;
            if (i == 4) break;
            sum += i;
        }
        System.out.println(sum);
    }
}`,
        steps: [
          { line: 3, text: '`sum` starts at 0.', stack: f([v('sum', 0)]), heap: [], out: '' },
          { line: 4, text: 'The loop starts: `i` is created, set to 1, and `1 <= 5` holds.', stack: f([v('sum', 0), v('i', 1)]) },
          { line: 7, text: 'Neither `if` fires, so `sum` becomes 1.', stack: f([v('sum', 1), v('i', 1)]) },
          { line: 4, text: 'Update `i++`, check `2 <= 5`.', stack: f([v('sum', 1), v('i', 2)]) },
          { line: 5, text: '`i == 2`, so `continue` skips the rest of the body and goes straight to the update.' },
          { line: 4, text: '`i` becomes 3.', stack: f([v('sum', 1), v('i', 3)]) },
          { line: 7, text: '`sum` becomes 4.', stack: f([v('sum', 4), v('i', 3)]) },
          { line: 4, text: '`i` becomes 4.', stack: f([v('sum', 4), v('i', 4)]) },
          { line: 6, text: '`break` leaves the loop immediately. 5 is never reached.' },
          { line: 9, text: 'Outside the loop `i` no longer exists. Only 1 and 3 were added.', stack: f([v('sum', 4)]), out: '4\n' }
        ]
      },
      {
        title: 'Old switch vs arrow switch',
        code: `public class Main {
    public static void main(String[] args) {
        int day = 2;
        String old = "";
        switch (day) {
            case 1: old += "Mon ";
            case 2: old += "Tue ";
            case 3: old += "Wed ";
                break;
            default: old += "Other";
        }
        String now = switch (day) {
            case 1 -> "Mon";
            case 2 -> "Tue";
            default -> "Other";
        };
        System.out.println(old.trim());
        System.out.println(now);
    }
}`,
        steps: [
          { line: 3, text: 'Strings are shown inline here to keep the picture small.', stack: f([v('day', 2)]), heap: [], out: '' },
          { line: 4, text: 'Start with an empty string.', stack: f([v('day', 2), v('old', '""')]) },
          { line: 7, text: 'The old switch jumps to `case 2`.', stack: f([v('day', 2), v('old', '"Tue "')]) },
          { line: 8, text: 'There is no `break`, so it **falls through** into `case 3` as well.', stack: f([v('day', 2), v('old', '"Tue Wed "')]) },
          { line: 9, text: 'This `break` finally leaves the switch.' },
          { line: 14, text: 'The arrow form runs only the matching case and gives back its value. No fall-through, no `break`.', stack: f([v('day', 2), v('old', '"Tue Wed "'), v('now', '"Tue"')]) },
          { line: 17, text: 'The fall-through added Wed.', out: 'Tue Wed\n' },
          { line: 18, text: 'The arrow switch did not.', out: 'Tue Wed\nTue\n' }
        ]
      }
    ],
    sections: [
      {
        name: 'Four loops',
        text: [
          [
            '`for (init; cond; update)`: when you need the index.',
            '`for (T x : collection)`: the enhanced for, when you need each element. You cannot see the index, and you must not add to or remove from the collection inside it.',
            '`while (cond)`: when you do not know how many rounds.',
            '`do { } while (cond);`: the body runs at least once.'
          ]
        ]
      },
      {
        name: 'Labeled break and continue',
        text: [
          'Put a label before an outer loop to control it from an inner loop. This is cleaner than a boolean flag.'
        ],
        code: `public class Main {
    public static void main(String[] args) {
        int[][] grid = {{1, 2}, {3, -1}, {5, 6}};
        search:
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] < 0) {
                    System.out.println("negative at " + r + "," + c);
                    break search;
                }
            }
        }
    }
}`,
        expect: 'negative at 1,1'
      },
      {
        name: 'Switch expressions (Java 14+)',
        text: [
          [
            'Several labels in one case: `case SAT, SUN -> "weekend";`',
            'Used as an expression, the switch must cover every value (`default`, or every enum constant).',
            'A block case returns its value with `yield`.',
            'Works on `int`, `char`, `String`, enums and (Java 21) any type with patterns.'
          ]
        ],
        code: `public class Main {
    public static void main(String[] args) {
        String word = "hello";
        int score = switch (word.length()) {
            case 0 -> 0;
            case 1, 2, 3 -> 1;
            default -> {
                int extra = word.length() - 3;
                yield 1 + extra;
            }
        };
        System.out.println(score);
    }
}`,
        expect: '3'
      }
    ],
    pitfalls: [
      ['Forgetting `break` in an old-style switch', 'Execution falls into the next case. Prefer the arrow form.'],
      ['`i <= arr.length`', 'One step too far: `ArrayIndexOutOfBoundsException`. Use `<`.'],
      ['Changing a list inside an enhanced for', '`ConcurrentModificationException`. Use an iterator or `removeIf`.'],
      ['A `while` loop that never updates its variable', 'Loops forever. Make sure the condition can become false.']
    ],
    interview: [
      ['`break` vs `continue`?', ['`break` exits the innermost loop or switch. `continue` skips the rest of the current iteration and moves to the next one. Both can take a label to target an outer loop.']],
      ['What types can you switch on?', ['`int` and smaller integer types, their wrappers, `char`, `String`, enums, and since Java 21 any reference type using pattern matching.']],
      ['What is fall-through and how do you avoid it?', ['In a colon-style switch, execution continues into the next case unless there is a `break`. The arrow form (`case X ->`) never falls through.']]
    ],
    say: [
      'The arrow switch has no fall-through and can be used as an expression.',
      'Labeled break exits an outer loop without flags.',
      'The loop variable lives only inside the loop.'
    ],
    checklist: [
      'Trace a loop with `continue` and `break` by hand.',
      'Rewrite a fall-through switch as an arrow switch.',
      'Use `yield` in a block case.',
      'Break out of two nested loops with a label.'
    ],
    drills: {
      predict: [
        {
          code: `public class Main {
    public static void main(String[] args) {
        int n = 10;
        do {
            n++;
        } while (n < 5);
        System.out.println(n);
    }
}`,
          answer: '11',
          why: 'A do-while runs the body once before checking the condition.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        int count = 0;
        outer:
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (j == 2) continue outer;
                if (i == 2) break outer;
                count++;
            }
        }
        System.out.println(count);
    }
}`,
          answer: '4',
          why: 'For i = 0 and i = 1, j = 0 and 1 count (4 total) before `continue outer`. At i = 2 the first check of `i == 2` breaks out.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        int x = 5;
        switch (x) {
            default: System.out.print("D");
            case 1: System.out.print("1");
                break;
            case 2: System.out.print("2");
        }
        System.out.println();
    }
}`,
          answer: 'D1',
          why: 'No case matches, so `default` runs, then falls through into `case 1` until the `break`.'
        },
        {
          code: `public class Main {
    public static void main(String[] args) {
        for (int i = 0; i < 10; i += 3) {
            System.out.print(i + " ");
        }
        System.out.println();
    }
}`,
          answer: '0 3 6 9',
          why: 'i takes 0, 3, 6, 9; 12 fails the condition.'
        }
      ],
      fill: [
        {
          q: 'Sum the array with an enhanced for.',
          code: `public class Main {
    public static void main(String[] args) {
        int[] nums = {4, 5, 6};
        int total = 0;
        for ([[int]] x [[:]] nums) {
            total += x;
        }
        System.out.println(total);
    }
}`,
          expect: '15',
          why: 'The enhanced for reads `for (Type name : array)`.'
        },
        {
          q: 'Return a value from a block case.',
          code: `public class Main {
    public static void main(String[] args) {
        String word = "abc";
        int len = switch (word) {
            case "hi" -> 2;
            default -> {
                int n = word.length();
                [[yield]] n * 10;
            }
        };
        System.out.println(len);
    }
}`,
          expect: '30',
          why: 'Inside a block, `yield` gives the switch expression its value (`return` would leave the method).'
        }
      ],
      bug: [
        {
          q: 'Sum all the elements.',
          code: `public class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3};
        int sum = 0;
        for (int i = 0; i <= arr.length; i++) {
            sum += arr[i];
        }
        System.out.println(sum);
    }
}`,
          line: 5,
          fix: 'for (int i = 0; i < arr.length; i++) {',
          expect: '6',
          why: 'Valid indexes are 0 to `length - 1`. `<=` reads index 3 and throws.'
        },
        {
          q: 'Level 1 should give "low".',
          code: `public class Main {
    public static void main(String[] args) {
        int level = 1;
        String label = "";
        switch (level) {
            case 1:
                label = "low";
            case 2:
                label = "mid";
                break;
            default:
                label = "high";
        }
        System.out.println(label);
    }
}`,
          line: 7,
          fix: 'label = "low"; break;',
          expect: 'low',
          why: 'Without `break`, case 1 falls through and case 2 overwrites the label.'
        }
      ]
    }
  });
})();
