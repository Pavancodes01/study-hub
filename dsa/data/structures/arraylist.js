(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
function grow(c){ return c + (c >> 1); }
// The backing array: used slots, then spare capacity.
function backing(a, cap, cls, name){
  var vals = [], c = {};
  for (var i = 0; i < cap; i++){ vals.push(i < a.length ? a[i] : ''); if (i >= a.length) c[i] = 'empty'; }
  for (var k in cls) if (cls[k]) c[k] = cls[k];
  return arr(vals, [], { name: name || 'elementData  (size = ' + a.length + ', capacity = ' + cap + ')', cls: c });
}
function oob(i, n){ return '`IndexOutOfBoundsException: Index ' + i + ' out of bounds for length ' + n + '`.'; }

registerStructure({
  slug: 'arraylist', order: 2, group: 'linear', title: 'ArrayList (dynamic array)',
  oneLiner: 'An array that grows by itself. It keeps spare slots at the end; when they run out it makes an array **1.5× bigger** and copies everything over. `get(i)` is O(1), `add(x)` at the end is O(1) on average.',
  legend: [['hit', 'written'], ['l', 'shifted'], ['a', 'read']],
  compare: { access: 'O(1)', search: 'O(n)', insert: 'O(1) end', remove: 'O(n)', ordered: 'by index', space: 'O(n) + spare slots', java: 'ArrayList', note: 'grows 1.5×' },
  idea: [
    'An `ArrayList` is an ordinary array (`elementData`) plus a `size` counter. The array is usually bigger than `size`; the extra slots are **capacity** waiting to be used.',
    'Adding at the end just writes the next free slot. When there is no free slot, Java allocates a new array of `old + old / 2` and copies all items. That copy is O(n), but it happens so rarely that each `add` costs O(1) **on average** (amortized).',
    'It is still an array underneath, so inserting or removing in the middle shifts everything after that spot: O(n).'
  ],
  anatomy: {
    title: 'size vs capacity',
    panels: [arr([3, 8, 1, '', '', ''], [{ i: 2, label: 'size - 1', c: 'a' }, { i: 3, label: 'next add', c: 'hit' }], { name: 'elementData: size = 3, capacity = 6', cls: { 3: 'empty', 4: 'empty', 5: 'empty' } })],
    notes: [
      '`size()` is how many items you put in. Capacity is the length of the hidden array.',
      '`list.get(4)` here throws, even though the slot exists: indexes past `size - 1` are not yours.',
      '`new ArrayList<>(100)` sets capacity 100 but size 0. It saves copies when you know the final size.'
    ]
  },
  demo: {
    title: 'Watch the array grow',
    sub: '`new ArrayList<>(4)`, then add 1 to 7. Count how many items get copied in total.',
    code: [
      'public boolean add(E e) {',
      '    if (size == elementData.length)',
      '        elementData = Arrays.copyOf(elementData, size + (size >> 1));',
      '    elementData[size++] = e;',
      '    return true;',
      '}'
    ],
    steps: function(){
      var a = [], cap = 4, copies = 0, out = [];
      out.push({ panels: [backing(a, cap, {})], line: null, vars: { size: 0, capacity: cap, copied: 0 }, msg: 'Capacity 4, size 0. Four cheap adds fit.' });
      for (var x = 1; x <= 7; x++){
        if (a.length === cap){
          var old = cap; cap = grow(cap); copies += a.length;
          var cl = {}; for (var i = 0; i < a.length; i++) cl[i] = 'on-l';
          out.push({ panels: [backing(a, old, {}, 'old array (capacity ' + old + ', full)'), backing(a, cap, cl, 'new array (capacity ' + cap + ')')], line: 2, vars: { size: a.length, capacity: cap, copied: copies },
            msg: 'Full. New capacity = ' + old + ' + ' + old + ' / 2 = **' + cap + '**. All ' + a.length + ' items are copied across.' });
        }
        a.push(x);
        var c2 = {}; c2[a.length - 1] = 'on-hit';
        out.push({ panels: [backing(a, cap, c2)], line: 3, vars: { size: a.length, capacity: cap, copied: copies }, msg: '`add(' + x + ')` writes slot ' + (a.length - 1) + '.' });
      }
      out.push({ panels: [backing(a, cap, {})], line: null, ok: true, vars: { adds: 7, copied: copies },
        msg: '7 adds cost 7 writes + ' + copies + ' copies. Because capacity grows by a factor, total copies stay below about 2n. So `add` is **O(1) amortized**.' });
      return out;
    }
  },
  play: {
    title: 'ArrayList playground',
    hint: 'Starts as `new ArrayList<>(4)`. Use **value** for `add` and `remove(Object)`, **index** for positions. Fill it past 4 to see it grow.',
    inputs: [{ ph: 'value', type: 'number' }, { ph: 'index', type: 'number' }],
    setup: 'List<Integer> list = new ArrayList<>(4);',
    start: 'Empty list, capacity 4.',
    init: function(){ return { a: [], cap: 4 }; },
    ops: [
      { id: 'add', label: 'add(v)', args: 1, use: [0], cost: 'O(1)*', run: function(s, v){
        var grew = s.a.length === s.cap, old = s.cap;
        if (grew) s.cap = grow(s.cap);
        s.a.push(v);
        var w = {}; w[s.a.length - 1] = 'on-hit new';
        return { java: 'list.add(' + v + ');', hl: { cls: w }, msg: grew ? 'No free slot: capacity ' + old + ' → **' + s.cap + '**, ' + (s.a.length - 1) + ' items copied. Then ' + v + ' was written.' : 'Wrote ' + v + ' into the next free slot. No shifting, no copying.' };
      } },
      { id: 'addAt', label: 'add(i, v)', args: 2, use: [1, 0], cost: 'O(n)', run: function(s, i, v){
        if (i < 0 || i > s.a.length) return { err: '`add(' + i + ', ' + v + ')` throws ' + oob(i, s.a.length) + ' You may insert at 0 to size.' };
        var grew = s.a.length === s.cap;
        if (grew) s.cap = grow(s.cap);
        s.a.splice(i, 0, v);
        var w = {}; for (var k = i + 1; k < s.a.length; k++) w[k] = 'on-l'; w[i] = 'on-hit new';
        return { java: 'list.add(' + i + ', ' + v + ');', hl: { cls: w }, msg: 'Shifted **' + (s.a.length - 1 - i) + '** items right to make room at index ' + i + (grew ? ', after growing to ' + s.cap : '') + '.' };
      } },
      { id: 'get', label: 'get(i)', args: 1, use: [1], cost: 'O(1)', run: function(s, i){
        if (i < 0 || i >= s.a.length) return { err: '`get(' + i + ')` throws ' + oob(i, s.a.length) };
        var w = {}; w[i] = 'on-a';
        return { java: 'list.get(' + i + ');', ret: s.a[i], hl: { cls: w }, msg: 'Direct jump to slot ' + i + ': **' + s.a[i] + '**.' };
      } },
      { id: 'set', label: 'set(i, v)', args: 2, use: [1, 0], cost: 'O(1)', run: function(s, i, v){
        if (i < 0 || i >= s.a.length) return { err: '`set(' + i + ', ' + v + ')` throws ' + oob(i, s.a.length) };
        var old = s.a[i]; s.a[i] = v;
        var w = {}; w[i] = 'on-hit';
        return { java: 'list.set(' + i + ', ' + v + ');', ret: old, hl: { cls: w }, msg: 'Replaced ' + old + ' with **' + v + '**. `set` returns the old value.' };
      } },
      { id: 'rmAt', label: 'remove(int i)', args: 1, use: [1], cost: 'O(n)', run: function(s, i){
        if (i < 0 || i >= s.a.length) return { err: '`remove(' + i + ')` throws ' + oob(i, s.a.length) };
        var v = s.a.splice(i, 1)[0];
        var w = {}; for (var k = i; k < s.a.length; k++) w[k] = 'on-l';
        return { java: 'list.remove(' + i + ');', ret: v, hl: { cls: w }, msg: 'Removed index ' + i + ' (value ' + v + '). **' + (s.a.length - i) + '** items shifted left. Capacity does not shrink.' };
      } },
      { id: 'rmVal', label: 'remove(Integer v)', args: 1, use: [0], cost: 'O(n)', run: function(s, v){
        var i = s.a.indexOf(v);
        if (i < 0) return { java: 'list.remove(Integer.valueOf(' + v + '));', ret: false, msg: v + ' is not in the list. It scanned every item, then returned `false`.' };
        s.a.splice(i, 1);
        var w = {}; for (var k = i; k < s.a.length; k++) w[k] = 'on-l';
        return { java: 'list.remove(Integer.valueOf(' + v + '));', ret: true, hl: { cls: w }, msg: 'Scanned to find ' + v + ' at index ' + i + ', then shifted the rest left.' };
      } },
      { id: 'has', label: 'contains(v)', args: 1, use: [0], cost: 'O(n)', run: function(s, v){
        var i = s.a.indexOf(v), w = {};
        for (var k = 0; k <= (i < 0 ? s.a.length - 1 : i); k++) w[k] = 'on-a';
        return { java: 'list.contains(' + v + ');', ret: i >= 0, hl: { cls: w }, ok: i >= 0, msg: 'Checked ' + (i < 0 ? s.a.length : i + 1) + ' item(s) one by one. For fast `contains`, use a HashSet.' };
      } }
    ],
    view: function(s, hl){ return [backing(s.a, s.cap, hl.cls || {})]; }
  },
  ops: [
    ['Add at the end', 'list.add(x)', 'O(1) amortized', 'Usually one write. Occasionally a 1.5× copy, spread over many adds.'],
    ['Read / replace by index', 'list.get(i), list.set(i, x)', 'O(1)', 'Plain array indexing underneath.'],
    ['Insert in the middle', 'list.add(i, x)', 'O(n)', 'Items after `i` shift right.'],
    ['Remove by index', 'list.remove(i)', 'O(n)', 'Items after `i` shift left. Removing the last item is O(1).'],
    ['Find / contains', 'list.indexOf(x), list.contains(x)', 'O(n)', 'Linear scan with `equals`.'],
    ['Sort', 'Collections.sort(list), list.sort(cmp)', 'O(n log n)', 'TimSort, stable.'],
    ['Size', 'list.size()', 'O(1)', 'A counter.']
  ],
  when: ['unknown final size', 'collect results', 'build an answer list', 'random access by index', 'adjacency list rows', 'sort a collection', 'stack-like append / remove last'],
  whenNot: [
    ['Fixed size, primitives, max speed', '`int[]`', 'array'],
    ['Add or remove at the front', 'ArrayDeque', 'queue-deque'],
    ['Many `contains` checks', 'HashSet', 'hashset'],
    ['Always sorted while you insert', 'TreeSet / TreeMap', 'bst-treemap']
  ],
  classes: [
    ['ArrayList<E>', 'Default list. Fast indexing and appending.'],
    ['LinkedList<E>', 'Rarely better. Only wins for frequent inserts at an iterator position.'],
    ['List.of(...)', 'Read-only list. Any `add`, `remove` or `set` throws.'],
    ['Arrays.asList(...)', 'Fixed size view over an array: `set` works, `add` / `remove` throw.']
  ],
  api: [
    { name: 'Basics', code: J`List<Integer> list = new ArrayList<>();
list.add(5);
list.add(8);
list.add(0, 1);          // insert at index 0: shifts the rest
System.out.println(list + " size " + list.size());
System.out.println(list.get(1));
list.set(1, 50);
System.out.println(list);
System.out.println(list.contains(8) + " " + list.indexOf(8));`, out: `[1, 5, 8] size 3
5
[1, 50, 8]
true 2` },
    { name: 'remove(int) trap', code: J`List<Integer> list = new ArrayList<>(List.of(10, 20, 30, 1));
list.remove(1);                     // an int: removes INDEX 1 (the 20)
System.out.println(list);
list.remove(Integer.valueOf(1));    // an Integer: removes the VALUE 1
System.out.println(list);`, out: `[10, 30, 1]
[10, 30]`, note: 'With `List<Integer>`, `remove(1)` picks the index version. Wrap the value to remove by value.' },
    { name: 'Remove while looping', code: J`List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));
list.removeIf(x -> x % 2 == 0);     // safe
System.out.println(list);
try {
    for (Integer x : list) if (x == 1) list.remove(x);
} catch (ConcurrentModificationException e) {
    System.out.println("for-each + remove: " + e.getClass().getSimpleName());
}`, out: `[1, 3, 5]
for-each + remove: ConcurrentModificationException`, note: 'Use `removeIf`, an `Iterator` with `it.remove()`, or loop backwards by index.' },
    { name: 'Sort & convert', code: J`List<String> names = new ArrayList<>(List.of("bo", "al", "cy"));
Collections.sort(names);
System.out.println(names);
names.sort(Comparator.reverseOrder());
System.out.println(names);
int[] arr = List.of(3, 1, 2).stream().mapToInt(Integer::intValue).toArray();
List<Integer> back = Arrays.stream(arr).boxed().collect(Collectors.toList());
System.out.println(Arrays.toString(arr) + " " + back);`, out: `[al, bo, cy]
[cy, bo, al]
[3, 1, 2] [3, 1, 2]` },
    { name: 'List of lists', code: J`List<List<Integer>> res = new ArrayList<>();
List<Integer> path = new ArrayList<>();
path.add(1);
path.add(2);
res.add(new ArrayList<>(path));    // snapshot: a copy
path.remove(path.size() - 1);
res.add(path);                     // the same object: it keeps changing!
path.add(9);
System.out.println(res);`, out: `[[1, 2], [1, 9]]`, note: 'In backtracking, always add `new ArrayList<>(path)`, never `path` itself.' },
    { name: 'Read-only lists', code: J`List<Integer> fixed = List.of(1, 2, 3);
try { fixed.add(4); } catch (UnsupportedOperationException e) { System.out.println("List.of is read-only"); }
List<Integer> view = Arrays.asList(1, 2, 3);
view.set(0, 9);                    // allowed
System.out.println(view);
try { view.add(4); } catch (UnsupportedOperationException e) { System.out.println("asList cannot grow"); }`, out: `List.of is read-only
[9, 2, 3]
asList cannot grow`, note: 'Need to change it? Copy it first: `new ArrayList<>(List.of(1, 2, 3))`.' }
  ],
  build: {
    intro: 'A growable int list. The only new idea over a plain array is `grow()`: make a bigger array and copy. Java\'s `ArrayList` uses exactly this 1.5× rule.',
    code: J`class IntList {
    private int[] data = new int[4];
    private int size = 0;

    void add(int x) {
        if (size == data.length) grow();
        data[size++] = x;
    }

    void add(int i, int x) {
        if (i < 0 || i > size) throw new IndexOutOfBoundsException(i);
        if (size == data.length) grow();
        System.arraycopy(data, i, data, i + 1, size - i);
        data[i] = x;
        size++;
    }

    int get(int i) {
        if (i < 0 || i >= size) throw new IndexOutOfBoundsException(i);
        return data[i];
    }

    int removeAt(int i) {
        int x = get(i);
        System.arraycopy(data, i + 1, data, i, size - i - 1);
        size--;
        return x;
    }

    int size() { return size; }
    int capacity() { return data.length; }

    private void grow() {
        int newCap = data.length + (data.length >> 1);   // 1.5x, like ArrayList
        data = Arrays.copyOf(data, newCap);
    }
}`,
    notes: [
      ['grow()', '`Arrays.copyOf` allocates the bigger array and copies. Old array becomes garbage.'],
      ['Why multiply, not add?', 'Growing by +1 each time would copy 1 + 2 + … + n = O(n²) items. Growing by a factor keeps the total O(n).'],
      ['Bounds check', 'Uses `size`, not `data.length`. Spare slots are not valid indexes.'],
      ['Never shrinks', 'Real `ArrayList` keeps its capacity after removes too; call `trimToSize()` to shrink.']
    ],
    demo: J`IntList list = new IntList();
StringBuilder caps = new StringBuilder();
for (int i = 0; i < 10; i++) {
    list.add(i);
    caps.append(list.capacity()).append(' ');
}
System.out.println(caps.toString().trim());
list.add(0, 99);
System.out.println(list.get(0) + " " + list.get(1) + " size " + list.size());`,
    out: `4 4 4 4 6 6 9 9 9 13
99 0 size 11`
  },
  gotchas: [
    ['remove(int) vs remove(Object)', '`list.remove(3)` on a `List<Integer>` removes **index** 3.', '`list.remove(Integer.valueOf(3))` to remove the value.'],
    ['Modifying inside for-each', 'Adding or removing while a for-each loop runs throws `ConcurrentModificationException`.', '`removeIf`, `Iterator.remove()`, or build a new list.'],
    ['Saving the same list object', '`res.add(path)` stores a reference; later changes to `path` show up in `res`.', '`res.add(new ArrayList<>(path))`.'],
    ['new ArrayList<>(n) is still empty', 'The `n` is capacity. `list.get(0)` throws, `list.set(0, x)` throws.', 'Add items, or use `new ArrayList<>(Collections.nCopies(n, 0))`.'],
    ['contains in a loop', '`list.contains` is O(n). Inside another loop that is O(n²).', 'Put the items in a `HashSet` first.'],
    ['Comparing Integers with ==', '`list.get(i) == list.get(j)` compares objects; wrong above 127.', '`.equals(...)` or unbox to `int`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-subsets', title: 'Subsets with a snapshot', ask: 'Skip or take each number. Save a **copy** of the path at the end.', code: J`List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    dfs(nums, 0, new ArrayList<>(), res);
    return res;
}
void dfs(int[] nums, int i, List<Integer> path, List<List<Integer>> res) {
    if (i == nums.length) { res.add([[new ArrayList<>(path)]]); return; }
    dfs(nums, i + 1, path, res);            // skip nums[i]
    path.[[add]](nums[i]);
    dfs(nums, i + 1, path, res);            // take nums[i]
    path.[[remove(path.size() - 1)]];
}`, test: 'System.out.println(new Sol().subsets(new int[]{1, 2}));', out: '[[], [2], [1], [1, 2]]' },
      { id: 'fb-pascal', title: "Pascal's triangle", ask: 'Each inner value is the sum of the two values above it.', code: J`List<List<Integer>> generate(int n) {
    List<List<Integer>> rows = new ArrayList<>();
    for (int r = 0; r < n; r++) {
        List<Integer> row = new ArrayList<>();
        for (int c = 0; c <= r; c++) {
            if (c == 0 || c == r) row.add(1);
            else row.add(rows.[[get(r - 1)]].get(c - 1) + rows.get(r - 1).[[get(c)]]);
        }
        rows.[[add(row)]];
    }
    return rows;
}`, test: 'System.out.println(new Sol().generate(4));', out: '[[1], [1, 1], [1, 2, 1], [1, 3, 3, 1]]' }
    ],
    order: [
      { id: 'od-merge', title: 'Merge two sorted lists into a new ArrayList',
        ideaSteps: ['Make the output list with the right capacity.', 'Two indexes, one per list.', 'While both have items, add the smaller head and move that index.', 'Copy whatever is left in `a`.', 'Copy whatever is left in `b`.'],
        lines: [
          'List<Integer> merge(List<Integer> a, List<Integer> b) {',
          '    List<Integer> out = new ArrayList<>(a.size() + b.size());',
          '    int i = 0, j = 0;',
          '    while (i < a.size() && j < b.size()) {',
          '        if (a.get(i) <= b.get(j)) out.add(a.get(i++));',
          '        else out.add(b.get(j++));',
          '    }',
          '    while (i < a.size()) out.add(a.get(i++));',
          '    while (j < b.size()) out.add(b.get(j++));',
          '    return out;',
          '}'
        ],
        extra: ['    while (i < a.size() || j < b.size()) {'],
        check: { wrap: 'sol', test: 'System.out.println(new Sol().merge(List.of(1, 4, 7), List.of(2, 3, 9)));', out: '[1, 2, 3, 4, 7, 9]' } }
    ]
  },
  patterns: ['backtracking', 'intervals', 'graphs', 'two-pointers'],
  patternWhy: {
    backtracking: 'The path is an ArrayList: add, recurse, remove the last item.',
    intervals: 'Merged intervals are collected in a `List<int[]>`.',
    graphs: 'An adjacency list is `List<List<Integer>>`.',
    'two-pointers': 'Merging sorted lists walks two indexes.'
  },
  problems: [['118', "Pascal's Triangle"], ['1929', 'Concatenation of Array'], ['78', 'Subsets'], ['380', 'Insert Delete GetRandom O(1)'], ['56', 'Merge Intervals']]
});
})();
