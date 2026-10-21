(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
var N = 8, START = [5, 8, 6, 3, 2, 7, 2, 6];
function low(i){ return i & -i; }
function lvl(i){ var k = 0; while ((1 << k) < low(i)) k++; return k; }
function bin(i){ var s = i.toString(2); while (s.length < 4) s = '0' + s; return s; }
function bit(a){ var t = [0]; for (var i = 1; i <= N; i++){ var s = 0; for (var j = i - low(i) + 1; j <= i; j++) s += a[j - 1]; t.push(s); } return t; }
function prefixPath(i){ var p = []; for (; i > 0; i -= low(i)) p.push(i); return p; }
function addPath(i){ var p = []; for (; i <= N; i += low(i)) p.push(i); return p; }
function panel(a, cls, acls, name){
  var t = bit(a), vals = [undefined].concat(a), items = [];
  for (var i = 1; i <= N; i++) items.push({ l: i - low(i) + 1, r: i, row: lvl(i), label: low(i) === 1 ? String(t[i]) : 't[' + i + '] = ' + t[i], cls: (cls && cls[i]) || '' });   // 1-wide bars: value only
  return { type: 'ranges', name: name || 'a[1..8] and the block each bit[i] covers (one-cell bars show just the value)', n: N, vals: vals, items: items, cls: acls || {} };
}
function pc(path, k){ var c = {}; path.forEach(function(i){ c[i] = k || 'on-a'; }); return c; }
function rc(l, r){ var c = {}; for (var i = l; i <= r; i++) c[i] = 'on-l'; return c; }

registerStructure({
  slug: 'fenwick', order: 17, group: 'adv', title: 'Fenwick Tree (Binary Indexed Tree)',
  oneLiner: 'Prefix sums that survive updates: both `prefix(i)` and `add(i, delta)` are O(log n), in about ten lines of code and one `int[]`. The trick is `i & -i`, the lowest set bit of `i`.',
  legend: [['a', 'cell read / written'], ['hit', 'changed'], ['l', 'query range']],
  compare: { access: 'O(log n)', search: 'O(log n) prefix', insert: 'O(log n) add', remove: '—', ordered: 'by index', space: 'O(n), n+1 ints', java: 'int[] bit (your own)', note: 'prefix sums + updates' },
  idea: [
    'A Fenwick tree is an array `bit[1..n]` (1-indexed) where `bit[i]` holds the sum of a block of the original array **ending at i**. The block length is `i & -i`, the value of i\'s lowest set bit: 1 for odd i, 2 for i = 2, 6, 4 for i = 4, 8 for i = 8.',
    '**prefix(i)**: add `bit[i]`, then jump left past that block with `i -= i & -i`, until i is 0. Each jump clears one bit of i, so it takes at most log₂ n steps.',
    '**add(i, delta)**: every block that contains index i must change. Those are `i`, then `i += i & -i`, repeatedly, up to n. Again at most log₂ n steps.',
    'It does less than a segment tree (no range min, only sums of prefixes, so ranges are `prefix(r) - prefix(l - 1)`), but it is much shorter and faster in practice.'
  ],
  anatomy: {
    title: 'Each bit[i] covers a block ending at i',
    panels: [panel(START, { 4: 'on-a', 8: 'on-l' }, {}, 'block length = i & -i')],
    notes: [
      '`bit[4]` covers a[1..4] because 4 = `100`₂ has lowest bit 4. `bit[6]` covers a[5..6] because 6 = `110`₂ has lowest bit 2.',
      'Odd indexes always cover just themselves.',
      '`bit[8]` covers everything: it is the total.'
    ]
  },
  demo: {
    title: 'prefix(7), then add(3, 4)',
    sub: 'Watch the index in binary: prefix clears the lowest bit each step, add adds it.',
    code: [
      'int prefix(int i) {',
      '    int s = 0;',
      '    for (; i > 0; i -= i & -i) s += bit[i];',
      '    return s;',
      '}',
      'void add(int i, int delta) {',
      '    for (; i <= n; i += i & -i) bit[i] += delta;',
      '}'
    ],
    steps: function(){
      var a = START.slice(), t = bit(a), out = [], s = 0, seen = [];
      out.push({ panels: [panel(a, {}, rc(1, 7))], line: 0, vars: { i: 7 }, msg: 'Want a[1] + … + a[7]. Start with i = 7 = `' + bin(7) + '`.' });
      prefixPath(7).forEach(function(i){
        s += t[i]; seen.push(i);
        var nx = i - low(i);
        out.push({ panels: [panel(a, pc(seen), rc(1, 7))], line: 2, vars: { i: i + ' = ' + bin(i), 'i & -i': low(i), s: s }, msg: 'Add `bit[' + i + ']` = ' + t[i] + ' (covers a[' + (i - low(i) + 1) + '..' + i + ']). Clear the lowest bit: i = ' + nx + ' = `' + bin(nx) + '`.' });
      });
      out.push({ panels: [panel(a, pc(seen, 'on-hit'), rc(1, 7))], line: 3, vars: { s: s }, msg: 'i is 0, stop. prefix(7) = **' + s + '** from 3 blocks: 7 = `111`₂ has three 1 bits.' });
      var path = addPath(3); a[2] += 4;
      out.push({ panels: [panel(a, pc(path, 'on-hit'), { 3: 'on-hit' })], line: 6, vars: { i: '3 → 4 → 8', delta: 4 }, msg: '`add(3, 4)`: blocks containing index 3 are bit[3], bit[4] (a[1..4]) and bit[8] (a[1..8]). Go 3 = `0011` → +1 → 4 = `0100` → +4 → 8 = `1000`.' });
      out.push({ panels: [panel(a, {}, {})], line: null, ok: true, vars: { touched: 3 }, msg: 'Only 3 cells changed. With n = 1,000,000 both operations take at most 20 steps.' });
      return out;
    }
  },
  play: {
    title: 'Fenwick playground',
    hint: '1-indexed `a[1..8]`. `add(i, d)` adds d to a[i]; `prefix(i)` sums a[1..i]; `range(l, r)` = prefix(r) − prefix(l − 1). First box = i or l, second = d or r.',
    inputs: [{ ph: 'i or l', type: 'number' }, { ph: 'd or r', type: 'number' }],
    setup: 'Fenwick f = new Fenwick(8);   // filled with 5, 8, 6, 3, 2, 7, 2, 6',
    start: 'Bars are the blocks. Try `prefix(6)`, then `add(5, 10)`.',
    init: function(){ return { a: START.slice() }; },
    ops: [
      { id: 'pre', label: 'prefix(i)', args: 1, cost: 'O(log n)', run: function(s, i){
        if (i < 1 || i > N) return { err: 'Index must be 1 to 8 (Fenwick trees are 1-indexed; `i = 0` would loop forever in `add`).' };
        var t = bit(s.a), p = prefixPath(i), sum = 0; p.forEach(function(k){ sum += t[k]; });
        return { java: 'f.prefix(' + i + ');', ret: sum, ok: true, hl: { cls: pc(p), acls: rc(1, i) }, msg: 'Read ' + p.map(function(k){ return 'bit[' + k + ']'; }).join(' + ') + ' = **' + sum + '**. Path: ' + p.map(function(k){ return '`' + bin(k) + '`'; }).join(' → ') + ' → 0.' };
      } },
      { id: 'add', label: 'add(i, d)', args: 2, cost: 'O(log n)', run: function(s, i, d){
        if (i < 1 || i > N) return { err: 'Index must be 1 to 8.' };
        var p = addPath(i); s.a[i - 1] += d;
        var ac = {}; ac[i] = 'on-hit';
        return { java: 'f.add(' + i + ', ' + d + ');', hl: { cls: pc(p, 'on-hit'), acls: ac }, msg: 'a[' + i + '] += ' + d + '. Updated ' + p.map(function(k){ return 'bit[' + k + ']'; }).join(', ') + ': every block that contains index ' + i + '.' };
      } },
      { id: 'range', label: 'range(l, r)', args: 2, cost: 'O(log n)', run: function(s, l, r){
        if (l < 1 || r > N || l > r) return { err: 'Need 1 ≤ l ≤ r ≤ 8.' };
        var t = bit(s.a), pr = prefixPath(r), pl = prefixPath(l - 1), A = 0, B = 0;
        pr.forEach(function(k){ A += t[k]; }); pl.forEach(function(k){ B += t[k]; });
        var c = pc(pr); pl.forEach(function(k){ c[k] = 'on-r'; });
        return { java: 'f.prefix(' + r + ') - f.prefix(' + (l - 1) + ');', ret: A - B, ok: true, hl: { cls: c, acls: rc(l, r) }, msg: 'prefix(' + r + ') = ' + A + ' minus prefix(' + (l - 1) + ') = ' + B + ' gives **' + (A - B) + '**. Red bars were subtracted.' };
      } }
    ],
    random: function(s, rnd){ var o = []; for (var i = 0; i < 3; i++) o.push(['add', rnd(1, 8), rnd(-3, 5)]); return o; },
    view: function(s, hl){ return [panel(s.a, hl.cls, hl.acls)]; }
  },
  ops: [
    ['Prefix sum a[1..i]', 'f.prefix(i)', 'O(log n)', 'One block per 1-bit of i.'],
    ['Add to one element', 'f.add(i, delta)', 'O(log n)', 'Every block containing i; jump with `i += i & -i`.'],
    ['Range sum a[l..r]', 'prefix(r) - prefix(l - 1)', 'O(log n)', 'Two prefix queries.'],
    ['Set a[i] = v', 'add(i, v - a[i])', 'O(log n)', 'Keep the plain array too, to know the old value.'],
    ['Build', 'n adds, or the O(n) trick', 'O(n)', 'Push each bit[i] into its parent i + (i & -i).'],
    ['Range minimum', 'not supported', '—', 'Use a segment tree.']
  ],
  when: ['prefix / range sums with point updates', 'count inversions', 'count smaller elements before / after', 'frequency table with running totals', 'order statistics over values'],
  whenNot: [
    ['Array never changes', 'Prefix sums', 'array'],
    ['Range min / max, or range updates with range queries', 'Segment tree', 'segment-tree'],
    ['Need sorted keys with gaps', 'TreeMap', 'bst-treemap']
  ],
  apiIntro: 'Java has no Fenwick class; it is short enough to type each time. These snippets run as shown.',
  api: [
    { name: 'Lowest set bit', code: J`for (int i = 1; i <= 8; i++)
    System.out.println(i + " = " + String.format("%4s", Integer.toBinaryString(i)).replace(' ', '0') + "  lowbit " + (i & -i));`, out: `1 = 0001  lowbit 1
2 = 0010  lowbit 2
3 = 0011  lowbit 1
4 = 0100  lowbit 4
5 = 0101  lowbit 1
6 = 0110  lowbit 2
7 = 0111  lowbit 1
8 = 1000  lowbit 8`, note: '`-i` is `~i + 1` in two\'s complement, so `i & -i` keeps only the lowest 1 bit.' },
    { name: 'Add & prefix', wrap: 'class', code: J`static int n = 8;
static int[] bit = new int[n + 1];             // 1-indexed

static void add(int i, int delta) {
    for (; i <= n; i += i & -i) bit[i] += delta;
}
static int prefix(int i) {                      // a[1] + ... + a[i]
    int s = 0;
    for (; i > 0; i -= i & -i) s += bit[i];
    return s;
}

public static void main(String[] args) {
    int[] a = {0, 5, 8, 6, 3, 2, 7, 2, 6};      // a[0] unused
    for (int i = 1; i <= n; i++) add(i, a[i]);
    System.out.println(prefix(8) + " " + (prefix(7) - prefix(2)));   // total, a[3..7]
    add(4, 7);                                   // a[4] += 7
    System.out.println(prefix(7) - prefix(2));
    System.out.println(Arrays.toString(bit));
}`, out: `39 20
27
[0, 5, 13, 6, 29, 2, 9, 2, 46]` },
    { name: 'Count inversions', wrap: 'class', code: J`static int[] bit = new int[11];                // values 1..10
static void add(int i) { for (; i < bit.length; i += i & -i) bit[i]++; }
static int count(int i) { int s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }

public static void main(String[] args) {
    int[] a = {3, 1, 4, 1, 5, 2};
    long inv = 0;
    for (int i = a.length - 1; i >= 0; i--) {
        inv += count(a[i] - 1);                // smaller values already seen to the right
        add(a[i]);
    }
    System.out.println(inv + " inversions");
}`, out: `6 inversions`, note: 'Index the tree by **value**, not position. Walking right to left, `count(v - 1)` is how many smaller values sit to the right.' },
    { name: 'O(n) build', code: J`int[] a = {0, 5, 8, 6, 3, 2, 7, 2, 6};         // 1-indexed, a[0] unused
int n = 8;
int[] bit = a.clone();
for (int i = 1; i <= n; i++) {
    int parent = i + (i & -i);
    if (parent <= n) bit[parent] += bit[i];    // pass my block sum up once
}
System.out.println(Arrays.toString(bit));`, out: `[0, 5, 13, 6, 22, 2, 9, 2, 39]` }
  ],
  build: {
    intro: 'The whole data structure. Keep the indexes 1-based inside; convert once at the boundary.',
    code: J`class Fenwick {
    private final int[] bit;                  // bit[i] = sum of a(i - lowbit(i), i]

    Fenwick(int n) { bit = new int[n + 1]; }  // index 0 unused

    void add(int i, int delta) {              // a[i] += delta, i is 1-based
        for (; i < bit.length; i += i & -i) bit[i] += delta;
    }

    int prefix(int i) {                       // a[1] + ... + a[i]
        int s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }

    int range(int l, int r) { return prefix(r) - prefix(l - 1); }
}`,
    notes: [
      ['i & -i', 'The lowest set bit. It is both the block length of `bit[i]` and the jump size.'],
      ['add goes up, prefix goes down', '`add` visits bigger blocks that contain i; `prefix` visits disjoint blocks to the left.'],
      ['1-based', 'With i = 0, `i & -i` is 0 and `add` would loop forever.'],
      ['Values, not just positions', 'Index by value to count "how many seen so far are ≤ x".']
    ],
    demo: J`Fenwick f = new Fenwick(8);
int[] a = {5, 8, 6, 3, 2, 7, 2, 6};
for (int i = 0; i < a.length; i++) f.add(i + 1, a[i]);   // shift to 1-based
System.out.println(f.prefix(8) + " " + f.range(3, 7));
f.add(4, 7);
System.out.println(f.range(3, 7) + " " + f.range(4, 4));`,
    out: `39 20
27 10`
  },
  gotchas: [
    ['Using index 0', '`add(0, x)` never ends: `0 & -0` is 0.', 'Shift to 1-based: `add(i + 1, x)`.'],
    ['add vs set', '`add(i, v)` adds; it does not replace the value.', 'Keep `a[]` and call `add(i, v - a[i])`.'],
    ['Range off by one', '`prefix(r) - prefix(l)` drops a[l].', '`prefix(r) - prefix(l - 1)`.'],
    ['int overflow', 'Sums of many large values overflow `int`.', 'Use `long[] bit`.'],
    ['Size n instead of n + 1', 'The last index n is out of bounds.', '`new int[n + 1]`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-ops', title: 'add and prefix', ask: '`add` climbs by the lowest bit; `prefix` drops it.', code: J`void add(int i, int delta) {
    for (; i <= n; i [[+=]] i & -i) bit[i] += [[delta]];
}
int prefix(int i) {
    int s = 0;
    for (; i [[>]] 0; i -= [[i & -i]]) s += bit[i];
    return s;
}`, ctx: 'int n = 8;\nint[] bit = new int[9];', test: 'Sol s = new Sol(); int[] a = {5, 8, 6, 3, 2, 7, 2, 6}; for (int i = 0; i < 8; i++) s.add(i + 1, a[i]); System.out.println(s.prefix(8) + " " + (s.prefix(7) - s.prefix(2)));', out: '39 20' },
      { id: 'fb-numarray', title: 'Range sum, mutable', ask: 'Turn "set" into "add the difference". Shift to 1-based inside.', wrap: 'top', code: J`class NumArray {
    int[] a, bit;
    NumArray(int[] nums) {
        a = new int[nums.length];
        bit = new int[nums.length + 1];
        for (int i = 0; i < nums.length; i++) update(i, nums[i]);
    }
    void update(int index, int val) {
        int delta = val - [[a[index]]];
        a[index] = val;
        for (int i = index + [[1]]; i < bit.length; i += i & -i) bit[i] += delta;
    }
    int sumRange(int l, int r) { return prefix(r + 1) - prefix([[l]]); }
    int prefix(int i) {
        int s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }
}`, test: 'NumArray na = new NumArray(new int[]{1, 3, 5}); System.out.print(na.sumRange(0, 2) + " "); na.update(1, 2); System.out.println(na.sumRange(0, 2) + " " + na.sumRange(1, 1));', out: '9 8 2' }
    ],
    order: [
      { id: 'od-inv', title: 'Count inversions',
        ideaSteps: ['A Fenwick tree indexed by value, size maxVal + 1.', 'Walk the array from the right.', 'Count values already seen that are strictly smaller: prefix(a[i] - 1).', 'Then record a[i] by adding 1 at index a[i].'],
        lines: [
          'long countInversions(int[] a, int maxVal) {',
          '    int[] bit = new int[maxVal + 1];',
          '    long inv = 0;',
          '    for (int i = a.length - 1; i >= 0; i--) {',
          '        for (int j = a[i] - 1; j > 0; j -= j & -j) inv += bit[j];',
          '        for (int j = a[i]; j <= maxVal; j += j & -j) bit[j]++;',
          '    }',
          '    return inv;',
          '}'
        ],
        extra: ['        for (int j = a[i]; j > 0; j -= j & -j) inv += bit[j];'],
        check: { wrap: 'sol', test: 'System.out.println(new Sol().countInversions(new int[]{3, 1, 4, 1, 5, 2}, 10) + " " + new Sol().countInversions(new int[]{1, 2, 3}, 3));', out: '6 0' } }
    ]
  },
  patterns: ['prefix-sum', 'binary-search'],
  patternWhy: {
    'prefix-sum': 'A Fenwick tree is prefix sums that allow updates.',
    'binary-search': 'Both rely on halving: each step removes one binary digit.'
  },
  problems: [['307', 'Range Sum Query - Mutable'], ['315', 'Count of Smaller Numbers After Self'], ['493', 'Reverse Pairs'], ['1649', 'Create Sorted Array through Instructions']]
});
})();
