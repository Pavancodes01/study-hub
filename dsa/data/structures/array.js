(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
var START = [5, 2, 9, 1, 7, 0, 0, 0];
function bad(i, n){ return '`a[' + i + ']` throws `ArrayIndexOutOfBoundsException: Index ' + i + ' out of bounds for length ' + n + '`. Valid indexes are 0 to ' + (n - 1) + '.'; }

registerStructure({
  slug: 'array', order: 1, group: 'linear', title: 'Array',
  oneLiner: 'A fixed number of slots sitting side by side in memory. Jumping to any index is O(1) because the address is just arithmetic. The price: the size never changes, and inserting in the middle means shifting.',
  legend: [['a', 'read'], ['hit', 'written'], ['l', 'shifted']],
  compare: { access: 'O(1)', search: 'O(n)', insert: 'O(n)', remove: 'O(n)', ordered: 'by index', space: 'O(n), no overhead', java: 'int[]', note: 'fixed size' },
  idea: [
    'An array is one solid block of memory cut into equal slots. An `int` takes 4 bytes, so `int[8]` is a 32-byte block.',
    'To find `a[i]`, Java computes **start address + i × 4**. One multiply and one add, no matter if `i` is 2 or 2 million. That is why indexing is O(1).',
    'The block cannot grow: the bytes after it may belong to something else. To insert in the middle, every item after that spot must slide right by one. That is O(n).'
  ],
  anatomy: {
    title: 'One block, equal slots',
    panels: [{ type: 'mem', name: 'int[] a = {5, 2, 9, 1, 7}   (each int = 4 bytes)', vals: [5, 2, 9, 1, 7], base: 1000, size: 4, cls: { 3: 'on-a' } }],
    notes: [
      'Address of `a[i]` = 1000 + i × 4. For `a[3]` that is 1012, found in one step.',
      'Neighbours are next to each other in memory, so looping over an array is very cache friendly. It is the fastest structure to scan.',
      '`a.length` is stored with the array. It is a field, not a method: no brackets.'
    ]
  },
  demo: {
    title: 'Insert in the middle: shift right',
    sub: 'Insert **4** at index 1 into `[5, 2, 9, 1, 7, _]` holding n = 5 items. Every item from index 1 on has to move.',
    code: [
      'for (int j = n; j > idx; j--) {',
      '    a[j] = a[j - 1];        // move one step right',
      '}',
      'a[idx] = x;',
      'n++;'
    ],
    steps: function(){
      var a = [5, 2, 9, 1, 7, ''], n = 5, idx = 1, x = 4, out = [];
      function P(cls, marks){ return [arr(a.slice(), marks || [], { name: 'a  (n = ' + n + ')', cls: cls || {} })]; }
      out.push({ panels: P({ 5: 'empty' }, [{ i: idx, label: 'idx', c: 'a' }]), line: null, vars: { n: n, idx: idx, x: x }, msg: 'Slot 1 is taken by 2. To make room, start from the **end** so nothing is overwritten before it is copied.' });
      for (var j = n; j > idx; j--){
        a[j] = a[j - 1];
        var cls = {}; cls[j] = 'on-l'; cls[j - 1] = 'win';
        out.push({ panels: P(cls, [{ i: j, label: 'j', c: 'l' }]), line: 1, vars: { j: j }, msg: '`a[' + j + '] = a[' + (j - 1) + ']`: copy ' + a[j] + ' one step right.' });
      }
      a[idx] = x;
      out.push({ panels: P({ 1: 'on-hit' }, [{ i: idx, label: 'idx', c: 'hit' }]), line: 3, vars: { j: idx }, msg: 'Now slot 1 is free to overwrite. `a[1] = 4`.' });
      n++;
      out.push({ panels: P({ 1: 'on-hit' }), line: 4, ok: true, vars: { n: n }, msg: 'Done. We moved **4 items** to insert 1. Inserting at the front of n items moves all n: O(n). Inserting at the end moves none: O(1).' });
      return out;
    }
  },
  play: {
    title: 'Array playground',
    hint: 'An `int[8]`. Use the **index** box and the **value** box. Insert and delete shift the other items, and the array never grows.',
    inputs: [{ ph: 'index', type: 'number' }, { ph: 'value', type: 'number' }],
    setup: 'int[] a = {5, 2, 9, 1, 7, 0, 0, 0};',
    start: 'Eight slots, fixed. Try `get` with index 3, then `insert` at index 0.',
    init: function(){ return { a: START.slice() }; },
    ops: [
      { id: 'get', label: 'a[i]', args: 1, use: [0], cost: 'O(1)', run: function(s, i){
        if (i < 0 || i >= s.a.length) return { err: bad(i, s.a.length) };
        return { java: 'a[' + i + '];', ret: s.a[i], hl: { read: [i] }, msg: 'Address 1000 + ' + i + ' × 4 = ' + (1000 + i * 4) + '. One jump, value **' + s.a[i] + '**.' };
      } },
      { id: 'set', label: 'a[i] = v', args: 2, cost: 'O(1)', run: function(s, i, v){
        if (i < 0 || i >= s.a.length) return { err: bad(i, s.a.length) };
        s.a[i] = v;
        return { java: 'a[' + i + '] = ' + v + ';', hl: { write: [i] }, msg: 'Overwrote slot ' + i + ' with **' + v + '**. Nothing else moved.' };
      } },
      { id: 'ins', label: 'insert(i, v)', args: 2, cost: 'O(n)', run: function(s, i, v){
        if (i < 0 || i >= s.a.length) return { err: bad(i, s.a.length) };
        var lost = s.a[s.a.length - 1], moved = s.a.length - 1 - i;
        s.a.splice(i, 0, v); s.a.pop();
        var sh = []; for (var k = i + 1; k < s.a.length; k++) sh.push(k);
        return { java: 'System.arraycopy(a, ' + i + ', a, ' + (i + 1) + ', ' + moved + '); a[' + i + '] = ' + v + ';', hl: { write: [i], shift: sh },
          msg: 'Shifted **' + moved + '** items right, then wrote ' + v + '. The last value (' + lost + ') fell off the end: an array cannot grow.' };
      } },
      { id: 'del', label: 'delete(i)', args: 1, use: [0], cost: 'O(n)', run: function(s, i){
        if (i < 0 || i >= s.a.length) return { err: bad(i, s.a.length) };
        var v = s.a[i], moved = s.a.length - 1 - i;
        s.a.splice(i, 1); s.a.push(0);
        var sh = []; for (var k = i; k < s.a.length - 1; k++) sh.push(k);
        return { java: 'System.arraycopy(a, ' + (i + 1) + ', a, ' + i + ', ' + moved + '); a[' + (s.a.length - 1) + '] = 0;', ret: undefined, hl: { shift: sh, write: [s.a.length - 1] },
          msg: 'Removed **' + v + '** by shifting ' + moved + ' items left. The last slot is set to 0.' };
      } },
      { id: 'find', label: 'search(v)', args: 1, use: [1], cost: 'O(n)', run: function(s, v){
        var at = s.a.indexOf(v), seen = [];
        for (var k = 0; k <= (at < 0 ? s.a.length - 1 : at); k++) seen.push(k);
        return { java: 'for (int i = 0; i < a.length; i++) if (a[i] == ' + v + ') ...', ret: at, hl: { read: seen, found: at },
          ok: at >= 0, msg: at >= 0 ? 'Found **' + v + '** at index ' + at + ' after checking ' + seen.length + ' slots.' : '**' + v + '** is not here. We had to check all ' + s.a.length + ' slots to be sure.' };
      } },
      { id: 'sort', label: 'Arrays.sort(a)', cost: 'O(n log n)', run: function(s){
        s.a.sort(function(x, y){ return x - y; });
        return { java: 'Arrays.sort(a);', msg: 'Sorted ascending. Now `Arrays.binarySearch` can find a value in O(log n).' };
      } }
    ],
    random: function(s, rnd){ var out = []; for (var i = 0; i < 4; i++) out.push(['set', rnd(0, 7), rnd(1, 99)]); return out; },
    view: function(s, hl){
      var cls = {};
      (hl.shift || []).forEach(function(i){ cls[i] = 'on-l'; });
      (hl.read || []).forEach(function(i){ cls[i] = 'on-a'; });
      (hl.write || []).forEach(function(i){ cls[i] = 'on-hit'; });
      if (hl.found !== undefined && hl.found >= 0) cls[hl.found] = 'on-hit';
      return [{ type: 'mem', name: 'int[] a   (length ' + s.a.length + ', 4 bytes per slot)', vals: s.a.slice(), base: 1000, size: 4, cls: cls }];
    }
  },
  ops: [
    ['Read or write by index', 'a[i], a[i] = x', 'O(1)', 'Address is start + i × size. One calculation.'],
    ['Length', 'a.length', 'O(1)', 'Stored with the array. A field, no `()`.'],
    ['Search, unsorted', 'loop and compare', 'O(n)', 'No shortcut: every slot might be the one.'],
    ['Search, sorted', 'Arrays.binarySearch(a, x)', 'O(log n)', 'Halve the range each step.'],
    ['Insert / delete in the middle', 'System.arraycopy(...)', 'O(n)', 'Everything after the spot slides by one.'],
    ['Sort', 'Arrays.sort(a)', 'O(n log n)', 'Dual-pivot quicksort for primitives, merge sort (TimSort) for objects.'],
    ['Copy / resize', 'Arrays.copyOf(a, n)', 'O(n)', 'Makes a new block and copies every item.']
  ],
  when: ['size known up front', 'index lookups', 'fixed grid / matrix', 'counting by small key (int[26])', 'fastest possible scanning', 'dp tables', 'prefix sums'],
  whenNot: [
    ['Size grows as you go', 'ArrayList', 'arraylist'],
    ['Many inserts or deletes at the front', 'ArrayDeque / LinkedList', 'queue-deque'],
    ['Find by value fast', 'HashSet / HashMap', 'hashset'],
    ['Keys are huge or sparse numbers', 'HashMap', 'hashmap']
  ],
  classes: [
    ['int[], long[], char[]…', 'Primitive arrays. No boxing, smallest and fastest.'],
    ['Integer[], String[]', 'Object arrays. Needed for `Arrays.sort` with a comparator.'],
    ['int[][]', 'Grid. Really an array of row arrays, so rows can have different lengths.']
  ],
  api: [
    { name: 'Create', code: J`int[] a = new int[5];                 // all zeros
int[] b = {4, 1, 3};
String[] s = new String[2];           // objects start as null
System.out.println(Arrays.toString(a));
System.out.println(Arrays.toString(b) + " length " + b.length);
System.out.println(Arrays.toString(s));`, out: `[0, 0, 0, 0, 0]
[4, 1, 3] length 3
[null, null]`, note: 'Primitives start at 0 / false / `\'\\u0000\'`. Object slots start as `null`.' },
    { name: 'Sort & search', code: J`int[] a = {5, 2, 9, 1, 7};
Arrays.sort(a);
System.out.println(Arrays.toString(a));
System.out.println(Arrays.binarySearch(a, 7));   // index of 7
System.out.println(Arrays.binarySearch(a, 6));   // missing: -(insert point) - 1`, out: `[1, 2, 5, 7, 9]
3
-4`, note: '`binarySearch` only works on a sorted array. A negative result means "not found"; 6 would go at index 3, so it returns -3 - 1 = -4.' },
    { name: 'Fill & copy', code: J`int[] a = new int[4];
Arrays.fill(a, -1);
int[] b = Arrays.copyOf(a, 6);                                  // longer: pads with 0
int[] c = Arrays.copyOfRange(new int[]{1, 2, 3, 4, 5}, 1, 4);   // indexes [1, 4)
System.out.println(Arrays.toString(a) + " " + Arrays.toString(b) + " " + Arrays.toString(c));
int[] d = a;          // NOT a copy: same array
d[0] = 99;
System.out.println(a[0]);`, out: `[-1, -1, -1, -1] [-1, -1, -1, -1, 0, 0] [2, 3, 4]
99`, note: '`=` copies the reference, not the slots. Use `a.clone()` or `Arrays.copyOf` for a real copy.' },
    { name: '2D grid', code: J`int[][] grid = new int[3][4];
grid[1][2] = 7;
System.out.println(grid.length + " rows, " + grid[0].length + " cols");
for (int[] row : grid) System.out.println(Arrays.toString(row));
int[][] dirs = {{0, 1}, {1, 0}, {0, -1}, {-1, 0}};
System.out.println(Arrays.deepToString(dirs));`, out: `3 rows, 4 cols
[0, 0, 0, 0]
[0, 0, 7, 0]
[0, 0, 0, 0]
[[0, 1], [1, 0], [0, -1], [-1, 0]]`, note: '`grid.length` is rows, `grid[0].length` is columns. `deepToString` prints nested arrays.' },
    { name: 'Custom order', code: J`Integer[] boxed = {5, 2, 9, 1};
Arrays.sort(boxed, Collections.reverseOrder());
System.out.println(Arrays.toString(boxed));
int[][] iv = {{3, 5}, {1, 4}, {2, 8}};
Arrays.sort(iv, (x, y) -> Integer.compare(x[0], y[0]));    // by start
System.out.println(Arrays.deepToString(iv));
int[] a = {1, 2, 3};
System.out.println(Arrays.stream(a).sum() + " " + Arrays.stream(a).max().getAsInt());`, out: `[9, 5, 2, 1]
[[1, 4], [2, 8], [3, 5]]
6 3`, note: 'A comparator needs objects. `int[]` cannot be sorted descending directly; sort ascending and read it backwards, or use `Integer[]`.' }
  ],
  build: {
    intro: 'A fixed-capacity list on top of an array: insert and remove by shifting. `System.arraycopy` is the fast built-in way to slide a block.',
    code: J`class FixedList {
    private final int[] data;
    private int size = 0;

    FixedList(int capacity) { data = new int[capacity]; }

    int get(int i) {
        if (i < 0 || i >= size) throw new IndexOutOfBoundsException(i);
        return data[i];
    }

    void insertAt(int i, int x) {
        if (size == data.length) throw new IllegalStateException("full");
        System.arraycopy(data, i, data, i + 1, size - i);       // shift right
        data[i] = x;
        size++;
    }

    int removeAt(int i) {
        int x = data[i];
        System.arraycopy(data, i + 1, data, i, size - i - 1);   // shift left
        size--;
        return x;
    }

    public String toString() { return Arrays.toString(Arrays.copyOf(data, size)); }
}`,
    notes: [
      ['arraycopy(src, from, dst, to, count)', 'Copies `count` items. It handles overlapping ranges correctly, so shifting inside one array is safe.'],
      ['Insert shifts right', 'Items `i..size-1` move to `i+1..size`. That is `size - i` items.'],
      ['Remove shifts left', 'Items `i+1..size-1` move to `i..size-2`. That is `size - i - 1` items.'],
      ['Full means full', 'This list refuses to grow. ArrayList solves that by making a bigger array.']
    ],
    demo: J`FixedList f = new FixedList(5);
f.insertAt(0, 7);
f.insertAt(0, 3);      // 7 shifts right
f.insertAt(1, 5);      // 7 shifts right again
System.out.println(f);
System.out.println(f.removeAt(0) + " " + f);`,
    out: `[3, 5, 7]
3 [5, 7]`
  },
  gotchas: [
    ['Off by one on the last index', '`a[a.length]` throws. The last valid index is `a.length - 1`.', 'Loop with `i < a.length`, not `<=`.'],
    ['b = a is not a copy', 'Both names point at the same block. Changing `b[0]` changes `a[0]`.', '`int[] b = a.clone();` or `Arrays.copyOf(a, a.length)`.'],
    ['Printing an array', '`System.out.println(a)` prints something like `[I@1b6d3586`, the type and a hash.', '`Arrays.toString(a)`, or `Arrays.deepToString` for 2D.'],
    ['== compares references', '`a == b` is false for two arrays with the same items.', '`Arrays.equals(a, b)`.'],
    ['Arrays.asList(int[])', 'Gives a `List<int[]>` with one item, not a list of numbers.', 'Use `Integer[]`, or `Arrays.stream(a).boxed().toList()`.'],
    ['Sum overflows', 'Adding many big `int`s silently wraps past 2,147,483,647.', 'Use a `long` total.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-rev', title: 'Reverse in place', ask: 'Two indexes walk toward each other and swap.', code: J`void reverse(int[] a) {
    int i = 0, j = [[a.length - 1]];
    while (i [[<]] j) {
        int t = a[i];
        a[i] = [[a[j]]];
        a[j] = [[t]];
        i++;
        j--;
    }
}`, test: 'int[] x = {1, 2, 3, 4, 5}; new Sol().reverse(x); System.out.println(Arrays.toString(x));', out: '[5, 4, 3, 2, 1]' },
      { id: 'fb-remove', title: 'Remove a value in place', ask: 'A write index `w` keeps every item that is not `val`.', code: J`int removeElement(int[] a, int val) {
    int w = 0;                       // next slot to write
    for (int r = 0; r < [[a.length]]; r++) {
        if (a[r] [[!=]] val) [[a[w++]]] = a[r];
    }
    return [[w]];
}`, test: 'int[] x = {3, 2, 2, 3, 4}; int k = new Sol().removeElement(x, 3); System.out.println(k + " " + Arrays.toString(Arrays.copyOf(x, k)));', out: '3 [2, 2, 4]' }
    ],
    order: [
      { id: 'od-rotate', title: 'Rotate right by k (three reversals)',
        ideaSteps: ['Reduce k with `k %= n`, since rotating n times changes nothing.', 'Reverse the whole array.', 'Reverse the first k items.', 'Reverse the rest.', 'A helper reverses `a[i..j]` with a swap loop.'],
        lines: [
          'void rotate(int[] a, int k) {',
          '    int n = a.length;',
          '    k %= n;',
          '    rev(a, 0, n - 1);',
          '    rev(a, 0, k - 1);',
          '    rev(a, k, n - 1);',
          '}',
          'void rev(int[] a, int i, int j) {',
          '    while (i < j) { int t = a[i]; a[i++] = a[j]; a[j--] = t; }',
          '}'
        ],
        extra: ['    rev(a, 0, k);'],
        check: { wrap: 'sol', test: 'int[] x = {1, 2, 3, 4, 5, 6, 7}; new Sol().rotate(x, 3); System.out.println(Arrays.toString(x));', out: '[5, 6, 7, 1, 2, 3, 4]' } }
    ]
  },
  patterns: ['two-pointers', 'sliding-window', 'prefix-sum', 'binary-search', 'dp'],
  patternWhy: {
    'two-pointers': 'Two indexes moving over one array.',
    'sliding-window': 'A window is a range `[l, r]` of array indexes.',
    'prefix-sum': '`pre[i]` is an array of running totals.',
    'binary-search': 'O(1) indexing is what makes jumping to the middle cheap.',
    dp: 'DP tables are 1D and 2D arrays.'
  },
  problems: [['27', 'Remove Element'], ['189', 'Rotate Array'], ['88', 'Merge Sorted Array'], ['238', 'Product of Array Except Self'], ['48', 'Rotate Image'], ['54', 'Spiral Matrix']]
});
})();
