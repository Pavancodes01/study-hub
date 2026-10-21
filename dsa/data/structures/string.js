(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }
function q(t){ return '"' + String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
function buf(a, cap, cls){
  var vals = [], c = {};
  for (var i = 0; i < cap; i++){ vals.push(i < a.length ? a[i] : ''); if (i >= a.length) c[i] = 'empty'; }
  for (var k in cls) c[k] = cls[k];
  return arr(vals, [], { name: 'StringBuilder value[]  (length = ' + a.length + ', capacity = ' + cap + ')', cls: c });
}
function ensure(s, need){
  if (need <= s.cap) return false;
  s.cap = Math.max(need, s.cap * 2 + 2);
  return true;
}

registerStructure({
  slug: 'string', order: 3, group: 'linear', title: 'String & StringBuilder',
  oneLiner: 'A `String` is a read-only array of characters: every "change" builds a brand new string. A `StringBuilder` is a growable char array you can edit in place. Build text with a builder, compare it with `equals`.',
  legend: [['hit', 'written'], ['l', 'shifted'], ['a', 'read']],
  compare: { access: 'O(1)', search: 'O(n·m)', insert: 'O(1) append', remove: 'O(n)', ordered: 'by index', space: 'O(n)', java: 'String / StringBuilder', note: 'String is immutable' },
  idea: [
    'A `String` holds its characters in an internal array that can never change. `toUpperCase`, `replace`, `substring` and `+` all return a **new** string; the original stays the same.',
    'That makes `s += c` inside a loop slow: each step copies everything built so far. n steps copy 1 + 2 + … + n characters, which is **O(n²)**.',
    '`StringBuilder` is the fix. It works like an `ArrayList<Character>`: a char array with spare capacity. `append` writes into the free slots, so building a string of n characters is O(n) in total.'
  ],
  anatomy: {
    title: 'Strings are shared, builders are not',
    panels: [{ type: 'refs', name: 'variables → objects', rows: [
      { name: 'a', val: '"java"', cls: 'on-l', note: 'literal: lives in the string pool' },
      { name: 'b', val: '"java"', cls: 'on-l', note: 'same literal → the same object, a == b' },
      { name: 'c', val: '"java"', cls: 'on-r', note: 'new String("java") → a different object, a != c' },
      { name: 'sb', val: '[j, a, v, a, _, _]', cls: 'on-a', note: 'StringBuilder: its own editable array' }
    ] }],
    notes: [
      'Because strings never change, Java can safely share one object between many variables (the **string pool**).',
      '`==` asks "same object?". `equals` asks "same characters?". For text you almost always want `equals`.',
      '`sb.toString()` copies the builder\'s characters into a new, independent `String`.'
    ]
  },
  demo: {
    title: 'Why += in a loop is slow',
    sub: 'Build `"abcde"` one character at a time, first with `+=`, then with a `StringBuilder`. Count the characters copied.',
    code: [
      'String s = "";',
      'for (char c : chars) s += c;      // new String every time',
      '',
      'StringBuilder sb = new StringBuilder();',
      'for (char c : chars) sb.append(c); // write into a free slot',
      'String t = sb.toString();'
    ],
    steps: function(){
      var cs = ['a', 'b', 'c', 'd', 'e'], out = [], copied = 0, s = [];
      out.push({ panels: [arr([], [], { name: 's = ""' })], line: 0, vars: { copied: 0 }, msg: 'Start with an empty string.' });
      cs.forEach(function(c){
        var old = s.slice(); s = s.concat([c]); copied += s.length;
        var cls = {}; for (var i = 0; i < old.length; i++) cls[i] = 'on-l'; cls[s.length - 1] = 'on-hit';
        out.push({ panels: [arr(old, [], { name: 'old string (thrown away)', cls: (function(){ var g = {}; for (var i = 0; i < old.length; i++) g[i] = 'gone'; return g; })() }), arr(s.slice(), [], { name: 'new string', cls: cls })], line: 1, vars: { copied: copied },
          msg: '`s += \'' + c + '\'` makes a new array of ' + s.length + ' and copies ' + old.length + ' old char' + (old.length === 1 ? '' : 's') + ' plus the new one. Total copied so far: **' + copied + '**.' });
      });
      var b = [], cap = 16;
      out.push({ panels: [buf(b, 8, {})], line: 3, vars: { copied: copied, builder: 0 }, msg: 'Now the builder. (Shown with capacity 8; the default is 16.) The free slots are ready to be written.' });
      cs.forEach(function(c){
        b.push(c);
        var cl = {}; cl[b.length - 1] = 'on-hit';
        out.push({ panels: [buf(b, 8, cl)], line: 4, vars: { copied: copied, builder: b.length }, msg: '`append(\'' + c + '\')` writes one slot. Nothing is copied.' });
      });
      out.push({ panels: [buf(b, 8, {}), arr(b.slice(), [], { name: 't = sb.toString()', cls: { 0: 'on-hit', 1: 'on-hit', 2: 'on-hit', 3: 'on-hit', 4: 'on-hit' } })], line: 5, ok: true, vars: { 'with +=': copied, 'with builder': 5 + 5 },
        msg: '`+=` copied **' + copied + '** chars (grows like n²/2). The builder wrote 5 and copied 5 once in `toString()`. For 100,000 chars that is about 5 billion vs 200,000.' });
      return out;
    }
  },
  play: {
    title: 'StringBuilder playground',
    hint: 'Starts as `new StringBuilder(8)`. **text** feeds `append` / `insert`, **index** picks a position. Press `toString()` to take a snapshot, then keep editing: the snapshot never changes.',
    inputs: [{ ph: 'text', type: 'text' }, { ph: 'index', type: 'number' }],
    setup: 'StringBuilder sb = new StringBuilder(8);',
    start: 'Empty builder with 8 free slots.',
    init: function(){ return { a: [], cap: 8, snap: null }; },
    ops: [
      { id: 'app', label: 'append(text)', args: 1, use: [0], cost: 'O(1)*', run: function(s, t){
        var old = s.cap, grew = ensure(s, s.a.length + t.length), at = s.a.length;
        s.a = s.a.concat(t.split(''));
        var cl = {}; for (var i = at; i < s.a.length; i++) cl[i] = 'on-hit new';
        return { java: 'sb.append(' + q(t) + ');', hl: { cls: cl }, msg: (grew ? 'Not enough room: capacity ' + old + ' → **' + s.cap + '** (old × 2 + 2), chars copied once. ' : '') + 'Wrote ' + t.length + ' char' + (t.length === 1 ? '' : 's') + ' into free slots.' };
      } },
      { id: 'ins', label: 'insert(i, text)', args: 2, use: [1, 0], cost: 'O(n)', run: function(s, i, t){
        if (i < 0 || i > s.a.length) return { err: '`insert(' + i + ', …)` throws `StringIndexOutOfBoundsException`: offset must be 0 to ' + s.a.length + '.' };
        ensure(s, s.a.length + t.length);
        var tail = s.a.length - i;
        Array.prototype.splice.apply(s.a, [i, 0].concat(t.split('')));
        var cl = {}; for (var k = i + t.length; k < s.a.length; k++) cl[k] = 'on-l'; for (var m = i; m < i + t.length; m++) cl[m] = 'on-hit new';
        return { java: 'sb.insert(' + i + ', ' + q(t) + ');', hl: { cls: cl }, msg: 'Shifted ' + tail + ' char' + (tail === 1 ? '' : 's') + ' right by ' + t.length + ', then wrote the text.' };
      } },
      { id: 'del', label: 'deleteCharAt(i)', args: 1, use: [1], cost: 'O(n)', run: function(s, i){
        if (i < 0 || i >= s.a.length) return { err: '`deleteCharAt(' + i + ')` throws `StringIndexOutOfBoundsException`: index ' + i + ', length ' + s.a.length + '.' };
        var c = s.a.splice(i, 1)[0];
        var cl = {}; for (var k = i; k < s.a.length; k++) cl[k] = 'on-l';
        return { java: 'sb.deleteCharAt(' + i + ');', hl: { cls: cl }, msg: 'Removed \'' + c + '\'. ' + (s.a.length - i) + ' char(s) after it shifted left. Deleting the last char is O(1).' };
      } },
      { id: 'at', label: 'charAt(i)', args: 1, use: [1], cost: 'O(1)', run: function(s, i){
        if (i < 0 || i >= s.a.length) return { err: '`charAt(' + i + ')` throws `StringIndexOutOfBoundsException`: index ' + i + ', length ' + s.a.length + '.' };
        var cl = {}; cl[i] = 'on-a';
        return { java: 'sb.charAt(' + i + ');', ret: "'" + s.a[i] + "'", hl: { cls: cl }, msg: 'Direct read of slot ' + i + ': \'' + s.a[i] + '\'.' };
      } },
      { id: 'rev', label: 'reverse()', cost: 'O(n)', run: function(s){
        s.a.reverse();
        var cl = {}; for (var i = 0; i < s.a.length; i++) cl[i] = 'on-l';
        return { java: 'sb.reverse();', hl: { cls: cl }, msg: 'Swapped chars from both ends toward the middle. Done in place, no new array.' };
      } },
      { id: 'str', label: 'toString()', cost: 'O(n)', run: function(s){
        s.snap = s.a.join('');
        return { java: 'String s = sb.toString();', ret: q(s.snap), msg: 'Copied the chars into a new `String`. Now edit the builder: `s` will not change.' };
      } }
    ],
    random: function(s, rnd){ var w = ['data', 'java', 'heap', 'tree', 'map']; return [['app', w[rnd(0, 4)]], ['app', '-'], ['app', w[rnd(0, 4)]]]; },
    view: function(s, hl){
      var p = [buf(s.a, s.cap, hl.cls || {})];
      if (s.snap !== null) p.push({ type: 'refs', name: 'snapshot', rows: [{ name: 's', val: q(s.snap), cls: 'on-l', note: s.snap === s.a.join('') ? 'same text as the builder' : 'unchanged: Strings are immutable' }] });
      return p;
    }
  },
  ops: [
    ['Read a char', 's.charAt(i)', 'O(1)', 'Indexing into the internal array.'],
    ['Length', 's.length()', 'O(1)', 'Stored. Note the `()`: a method, unlike arrays.'],
    ['Compare text', 's.equals(t)', 'O(n)', 'Checks character by character (stops early on a mismatch).'],
    ['Substring', 's.substring(i, j)', 'O(j − i)', 'Copies the chars into a new string.'],
    ['Search', 's.indexOf(t), s.contains(t)', 'O(n·m)', 'Tries each start position. Fine for short patterns.'],
    ['Concatenate once', 's + t', 'O(n + m)', 'One new string of both lengths.'],
    ['+= in a loop', 's += c', 'O(n²)', 'Copies the whole string every time.'],
    ['Append to builder', 'sb.append(x)', 'O(1) amortized', 'Writes free slots; grows ×2 + 2 when full.'],
    ['Insert / delete in builder', 'sb.insert(i, x), sb.deleteCharAt(i)', 'O(n)', 'Shifts the chars after `i`.'],
    ['Reverse builder', 'sb.reverse()', 'O(n)', 'Swaps in place.']
  ],
  when: ['build output text', 'reverse / palindrome', 'count characters (int[26])', 'parse tokens', 'compare words', 'join many pieces', 'edit text in place'],
  whenNot: [
    ['Building text in a loop', 'StringBuilder, not +=', null],
    ['Need to look up words fast', 'HashSet<String> / HashMap', 'hashset'],
    ['Many words sharing prefixes', 'Trie', 'trie'],
    ['Edit chars by index often', '`char[] cs = s.toCharArray()`', 'array']
  ],
  classes: [
    ['String', 'Fixed text: keys, comparisons, results. Immutable and safe to share.'],
    ['StringBuilder', 'Building or editing text. Not thread-safe, fastest.'],
    ['StringBuffer', 'Old synchronized version of StringBuilder. Avoid.'],
    ['char[]', 'When you swap or overwrite characters by index a lot.']
  ],
  api: [
    { name: 'Basics', code: J`String s = "hello";
System.out.println(s.length() + " " + s.charAt(1) + " " + s.indexOf('l') + " " + s.lastIndexOf('l'));
System.out.println(s.substring(1, 3) + " " + s.substring(2));      // end index is exclusive
System.out.println(s.toUpperCase() + " " + s.contains("ell") + " " + s.startsWith("he"));
System.out.println(s.replace('l', 'L') + " " + s);                 // s itself is unchanged`, out: `5 e 2 3
el llo
HELLO true true
heLLo hello` },
    { name: 'equals vs ==', code: J`String a = "java";
String b = "java";                  // the same pooled literal
String c = new String("java");      // a new object
System.out.println((a == b) + " " + (a == c) + " " + a.equals(c));
System.out.println("Java".equalsIgnoreCase(a) + " " + "apple".compareTo("banana"));`, out: `true false true
true -1`, note: '`compareTo` returns negative / 0 / positive, like a comparator. It is what sorting strings uses.' },
    { name: 'StringBuilder', code: J`StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.append(i).append(',');
sb.setLength(sb.length() - 1);      // drop the last comma
System.out.println(sb);
sb.insert(0, '[').append(']');
System.out.println(sb + " " + sb.length());
System.out.println(new StringBuilder("stressed").reverse());
sb.deleteCharAt(1);
System.out.println(sb.charAt(1) + " " + sb);`, out: `0,1,2,3,4
[0,1,2,3,4] 11
desserts
, [,1,2,3,4]`, note: '`append` returns the builder, so calls chain. `setLength(n)` cuts the end off in O(1).' },
    { name: 'char tricks', code: J`int[] count = new int[26];
for (char c : "banana".toCharArray()) count[c - 'a']++;
System.out.println(count[0] + " " + count[1] + " " + count['n' - 'a']);
for (char c : "a1B2".toCharArray())
    System.out.print(Character.isDigit(c) ? "d" : Character.isUpperCase(c) ? "U" : "l");
System.out.println();
char ch = (char) ('a' + 2);
System.out.println(ch + " " + ('7' - '0') + " " + (int) 'A' + " " + ('a' + 'b'));`, out: `3 1 2
ldUd
c 7 65 195`, note: 'A `char` is a small number. `c - \'a\'` maps a..z to 0..25. Adding two chars gives an `int`, not text.' },
    { name: 'Split & join', code: J`String line = "  the quick  brown fox ";
String[] words = line.trim().split("\\s+");
System.out.println(words.length + " " + String.join("-", words));
char[] cs = "dcba".toCharArray();
Arrays.sort(cs);
System.out.println(new String(cs) + " " + String.valueOf(42) + " " + Integer.parseInt("-17"));`, out: `4 the-quick-brown-fox
abcd 42 -17`, note: '`split` takes a **regex**. `"\\\\s+"` means one or more spaces. To split on `.` or `|`, escape it: `"\\\\."`.' }
  ],
  build: {
    intro: 'A tiny `StringBuilder`: a `char[]` buffer, a length, and the same growth rule Java uses (`old × 2 + 2`, or more if needed).',
    code: J`class MiniBuilder {
    private char[] buf = new char[4];
    private int len = 0;

    MiniBuilder append(String s) {
        if (len + s.length() > buf.length)
            buf = Arrays.copyOf(buf, Math.max(buf.length * 2 + 2, len + s.length()));
        s.getChars(0, s.length(), buf, len);   // copy s into buf at position len
        len += s.length();
        return this;                           // lets calls chain
    }

    MiniBuilder reverse() {
        for (int i = 0, j = len - 1; i < j; i++, j--) {
            char t = buf[i]; buf[i] = buf[j]; buf[j] = t;
        }
        return this;
    }

    int length() { return len; }
    int capacity() { return buf.length; }
    public String toString() { return new String(buf, 0, len); }
}`,
    notes: [
      ['return this', 'Returning the builder itself is what makes `b.append("a").append("b")` work.'],
      ['Growth', 'Same idea as ArrayList: grow by a factor so total copying stays O(n).'],
      ['toString copies', '`new String(buf, 0, len)` copies the chars, so later edits to the builder cannot change the string.']
    ],
    demo: J`MiniBuilder b = new MiniBuilder();
b.append("data").append("-").append("structures");
System.out.println(b + " " + b.length() + " " + b.capacity());
System.out.println(b.reverse());`,
    out: `data-structures 15 22
serutcurts-atad`
  },
  gotchas: [
    ['== on strings', 'Works for two literals, fails for strings built at runtime (input, substring, builder).', 'Always `a.equals(b)`.'],
    ['Forgetting strings are immutable', '`s.toUpperCase();` alone does nothing useful; the result is thrown away.', '`s = s.toUpperCase();`'],
    ['+= in a loop', 'O(n²) time. Times out on long inputs.', 'Use a `StringBuilder` and call `toString()` once.'],
    ['char + char is an int', '`\'a\' + \'b\'` is 195, not "ab".', '`"" + a + b` or `String.valueOf(a) + b`.'],
    ['split takes a regex', '`s.split(".")` returns an empty array; `.` means "any char".', '`s.split("\\\\.")`, and `"\\\\s+"` for runs of spaces.'],
    ['substring end is exclusive', '`s.substring(1, 3)` is 2 chars: index 1 and 2.', 'Length of `substring(i, j)` is `j - i`.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-pal', title: 'Valid palindrome', ask: 'Two indexes, skip non-alphanumeric, compare lowercase.', code: J`boolean isPalindrome(String s) {
    int i = 0, j = s.length() - 1;
    while (i < j) {
        if (!Character.[[isLetterOrDigit]](s.charAt(i))) { i++; continue; }
        if (!Character.isLetterOrDigit(s.[[charAt(j)]])) { j--; continue; }
        if (Character.[[toLowerCase]](s.charAt(i)) != Character.toLowerCase(s.charAt(j))) return false;
        i++;
        j--;
    }
    return true;
}`, test: 'System.out.println(new Sol().isPalindrome("A man, a plan, a canal: Panama") + " " + new Sol().isPalindrome("race a car"));', out: 'true false' },
      { id: 'fb-anagram', title: 'Valid anagram with int[26]', ask: 'Count up for `s`, down for `t`. Every count must end at 0.', code: J`boolean isAnagram(String s, String t) {
    if (s.length() != t.[[length()]]) return false;
    int[] cnt = [[new int[26]]];
    for (int i = 0; i < s.length(); i++) {
        int a = s.charAt(i) [[- 'a']];
        int b = t.charAt(i) - 'a';
        cnt[a]++;
        cnt[b]--;
    }
    for (int c : cnt) if (c [[!= 0]]) return false;
    return true;
}`, test: 'System.out.println(new Sol().isAnagram("anagram", "nagaram") + " " + new Sol().isAnagram("rat", "car"));', out: 'true false' }
    ],
    order: [
      { id: 'od-revwords', title: 'Reverse the words in a string',
        ideaSteps: ['Trim the ends and split on runs of spaces.', 'Make a StringBuilder.', 'Walk the words from last to first.', 'Append each word, and a space between words.', 'Return the built string.'],
        lines: [
          'String reverseWords(String s) {',
          J`    String[] words = s.trim().split("\\s+");`,
          '    StringBuilder sb = new StringBuilder();',
          '    for (int i = words.length - 1; i >= 0; i--) {',
          '        sb.append(words[i]);',
          "        if (i > 0) sb.append(' ');",
          '    }',
          '    return sb.toString();',
          '}'
        ],
        extra: ['    for (int i = 0; i < words.length; i++) {', '    String res = ""; '],
        check: { wrap: 'sol', test: 'System.out.println("[" + new Sol().reverseWords("  the sky  is blue ") + "]");', out: '[blue is sky the]' } }
    ]
  },
  patterns: ['two-pointers', 'sliding-window', 'hashing', 'dp'],
  patternWhy: {
    'two-pointers': 'Palindrome and reverse problems walk `i` and `j` over a string.',
    'sliding-window': 'Longest substring problems slide a window over `s.charAt(r)`.',
    hashing: 'Anagram and frequency problems count chars in `int[26]` or a map.',
    dp: 'Edit distance and LCS fill a table indexed by string positions.'
  },
  problems: [['344', 'Reverse String'], ['125', 'Valid Palindrome'], ['242', 'Valid Anagram'], ['151', 'Reverse Words in a String'], ['14', 'Longest Common Prefix'], ['443', 'String Compression']]
});
})();
