(function(){
var J = String.raw;
// Trie as JSON: { n: { id: {c, kids:{ch:id}, end} }, next }. Root id is 'r'.
function mk(){ return { n: { r: { c: '', kids: {}, end: false } }, next: 1 }; }
function insert(s, w){
  var cur = 'r', path = ['r'], made = 0;
  for (var i = 0; i < w.length; i++){
    var ch = w[i], nd = s.n[cur];
    if (!nd.kids[ch]){ var id = 'n' + s.next++; s.n[id] = { c: ch, kids: {}, end: false }; nd.kids[ch] = id; made++; }
    cur = nd.kids[ch]; path.push(cur);
  }
  var was = s.n[cur].end; s.n[cur].end = true;
  return { path: path, made: made, was: was };
}
function walk(s, w){ var cur = 'r', path = ['r']; for (var i = 0; i < w.length; i++){ var nx = s.n[cur].kids[w[i]]; if (!nx) return { path: path, id: null, at: i }; cur = nx; path.push(cur); } return { path: path, id: cur }; }
function words(s, id, pre, out){ var nd = s.n[id]; if (nd.end) out.push(pre); Object.keys(nd.kids).sort().forEach(function(ch){ words(s, nd.kids[ch], pre + ch, out); }); return out; }
function remove(s, w){
  var r = walk(s, w); if (!r.id || !s.n[r.id].end) return false;
  s.n[r.id].end = false;
  for (var i = r.path.length - 1; i > 0; i--){
    var id = r.path[i], nd = s.n[id];
    if (nd.end || Object.keys(nd.kids).length) break;
    delete s.n[r.path[i - 1]].kids[nd.c]; delete s.n[id];
  }
  return true;
}
function treeP(s, cls, name){
  var nodes = [];
  (function add(id, parent){
    var nd = s.n[id];
    nodes.push({ id: id, label: id === 'r' ? '•' : nd.c, parent: parent, end: nd.end, cls: (cls && cls[id]) || '' });
    Object.keys(nd.kids).sort().forEach(function(ch){ add(nd.kids[ch], id); });
  })('r', null);
  return { type: 'ntree', name: name || 'trie  (' + words(s, 'r', '', []).length + ' words, ' + (nodes.length - 1) + ' letter nodes · ringed = end of a word)', nodes: nodes, sx: 40, sy: 54 };
}
function pc(path, end){ var c = {}; path.forEach(function(id){ c[id] = 'on-a'; }); if (path.length > 1) c[path[path.length - 1]] = end || 'on-hit'; return c; }
function build(ws){ var s = mk(); ws.forEach(function(w){ insert(s, w); }); return s; }
function check(w){ return /^[a-z]+$/.test(w) ? null : 'Use lowercase letters a–z only (this trie has 26 children per node).'; }

registerStructure({
  slug: 'trie', order: 13, group: 'tree', title: 'Trie (prefix tree)',
  oneLiner: 'A tree of letters: each path from the root spells a prefix, and words that share a prefix share those nodes. Insert, search and "does any word start with…?" all cost O(L), the length of the word, no matter how many words are stored.',
  legend: [['a', 'path walked'], ['hit', 'last letter'], ['r', 'path broke off']],
  compare: { access: 'O(L)', search: 'O(L)', insert: 'O(L)', remove: 'O(L)', ordered: 'alphabetical (DFS)', space: 'O(total letters × 26)', java: 'your own TrieNode', note: 'prefix queries' },
  idea: [
    'Store words letter by letter. The root is empty. Its children are the possible first letters, their children the second letters, and so on. "cat" and "car" share the nodes `c → a`, then split.',
    'Each node has up to 26 children (an array `next[26]`, indexed by `c - \'a\'`) and a flag `end` that says "a word ends here". The flag is what tells the word "car" apart from the prefix "ca".',
    'To look up a word, follow one child per letter. If a child is missing, the word is not there. The work depends only on the word length L, not on how many words are stored: O(L).',
    'This makes tries the tool for prefix questions: autocomplete, "is this a prefix of any word?", word search on a grid, longest common prefix.'
  ],
  anatomy: {
    title: 'car, cart, cat, do, dog',
    panels: [treeP(build(['car', 'cart', 'cat', 'do', 'dog']), {}, 'shared prefixes are stored once')],
    notes: [
      'Ringed nodes have `end = true`. "car" ends at r, and "cart" continues past it.',
      '"ca" is a path but not a word: its last node has no ring.',
      'Five words, 15 letters, but only 8 letter nodes: prefixes are shared.'
    ]
  },
  demo: {
    title: 'Insert words, then search',
    sub: 'Insert "cat", "car", "cart". Then compare `search("ca")` with `startsWith("ca")`.',
    code: [
      'Node n = root;',
      'for (char c : word.toCharArray()) {',
      '    int i = c - \'a\';',
      '    if (n.next[i] == null) n.next[i] = new Node();',
      '    n = n.next[i];',
      '}',
      'n.end = true;'
    ],
    steps: function(){
      var s = mk(), out = [];
      out.push({ panels: [treeP(s, { r: 'on-l' })], line: 0, vars: {}, msg: 'Only the empty root.' });
      ['cat', 'car', 'cart'].forEach(function(w){
        var r = insert(s, w);
        out.push({ panels: [treeP(s, pc(r.path))], line: [3, 4, 6], vars: { word: w, newNodes: r.made, reused: w.length - r.made },
          msg: 'insert("' + w + '"): reused **' + (w.length - r.made) + '** existing node(s), created ' + r.made + '. The last node is marked `end`.' });
      });
      var a = walk(s, 'ca');
      out.push({ panels: [treeP(s, pc(a.path))], line: null, vars: { word: 'ca' }, msg: 'Walk "ca": both letters exist. `startsWith("ca")` is **true**…' });
      out.push({ panels: [treeP(s, pc(a.path, 'on-r'))], line: null, vars: { end: false }, msg: '…but the `a` node is not ringed, so `search("ca")` is **false**. "ca" is only a prefix.' });
      var b = walk(s, 'cab');
      out.push({ panels: [treeP(s, pc(b.path, 'on-r'))], line: null, ok: true, vars: { word: 'cab' }, msg: 'Walk "cab": after `c → a` there is no `b` child, so stop. Not found after 3 steps, whatever the number of words.' });
      return out;
    }
  },
  play: {
    title: 'Trie playground',
    hint: 'Type a lowercase word. Insert a few that share prefixes (try `tree`, `trie`, `try`, `tea`), then search and test prefixes.',
    inputs: [{ ph: 'word', type: 'text' }],
    setup: 'Trie trie = new Trie();',
    start: 'Only the root.',
    init: function(){ return mk(); },
    ops: [
      { id: 'ins', label: 'insert(w)', args: 1, cost: 'O(L)', run: function(s, w){
        var e = check(w); if (e) return { err: e };
        if (Object.keys(s.n).length + w.length > 40) return { err: 'This playground stops at about 40 nodes so it fits on screen. Reset or remove a word.' };
        var r = insert(s, w);
        return { java: 'trie.insert("' + w + '");', hl: { cls: pc(r.path) }, msg: r.was ? '"' + w + '" was already a word. Nothing changed.' : 'Reused ' + (w.length - r.made) + ' node(s), created ' + r.made + ', and marked the last one as a word end.' };
      } },
      { id: 'search', label: 'search(w)', args: 1, cost: 'O(L)', run: function(s, w){
        var e = check(w); if (e) return { err: e };
        var r = walk(s, w), ok = !!r.id && s.n[r.id].end;
        return { java: 'trie.search("' + w + '");', ret: ok, ok: ok, hl: { cls: pc(r.path, ok ? 'on-hit' : 'on-r') }, msg: !r.id ? 'No `' + w[r.at] + '` child after "' + w.slice(0, r.at) + '": not found.' : ok ? 'Path exists and the last node is a word end: found.' : 'The path exists, but the last node is not a word end: "' + w + '" is only a prefix.' };
      } },
      { id: 'pre', label: 'startsWith(p)', args: 1, cost: 'O(L)', run: function(s, w){
        var e = check(w); if (e) return { err: e };
        var r = walk(s, w);
        if (!r.id) return { java: 'trie.startsWith("' + w + '");', ret: false, hl: { cls: pc(r.path, 'on-r') }, msg: 'Path breaks after "' + w.slice(0, r.at) + '": no word starts with "' + w + '".' };
        var list = words(s, r.id, w, []);
        return { java: 'trie.startsWith("' + w + '");', ret: true, ok: true, hl: { cls: pc(r.path) }, msg: 'The whole path exists. Words below it (autocomplete): **' + list.join(', ') + '**.' };
      } },
      { id: 'rm', label: 'remove(w)', args: 1, cost: 'O(L)', run: function(s, w){
        var e = check(w); if (e) return { err: e };
        var ok = remove(s, w);
        return { java: 'trie.remove("' + w + '");', ret: ok, msg: ok ? 'Cleared the end flag, then deleted nodes that no other word needs (walking back up).' : '"' + w + '" is not a word in the trie.' };
      } },
      { id: 'all', label: 'all words', cost: 'O(n)', run: function(s){
        return { java: 'trie.words();', ret: '[' + words(s, 'r', '', []).join(', ') + ']', msg: 'A DFS that visits children a → z lists the words in **alphabetical order**.' };
      } }
    ],
    random: function(s, rnd){ var pool = ['tree', 'trie', 'try', 'tea', 'ten', 'to', 'car', 'cat', 'cart', 'dog', 'do']; var o = []; for (var i = 0; i < 4; i++) o.push(['ins', pool[rnd(0, pool.length - 1)]]); return o; },
    view: function(s, hl){ return [treeP(s, hl.cls)]; }
  },
  ops: [
    ['Insert a word', 'trie.insert(w)', 'O(L)', 'One node per letter, created only if missing.'],
    ['Search a word', 'trie.search(w)', 'O(L)', 'Follow L links, then check `end`.'],
    ['Prefix exists?', 'trie.startsWith(p)', 'O(L)', 'Same walk, no `end` check.'],
    ['Autocomplete', 'DFS below the prefix node', 'O(L + output)', 'Only the matching part of the tree is visited.'],
    ['Memory', 'Node[26] per node', 'O(N × 26)', 'N = total letters stored. Use a `HashMap` per node for big alphabets.']
  ],
  when: ['prefix search / autocomplete', 'is it a prefix of any word?', 'word search on a grid', 'replace words with their root', 'longest common prefix', 'maximum XOR (binary trie)'],
  whenNot: [
    ['Only exact-word lookups', 'HashSet<String> (simpler)', 'hashset'],
    ['Sorted words + prefix range, few queries', 'TreeSet.subSet(p, p + Character.MAX_VALUE)', 'bst-treemap'],
    ['Substring (not prefix) search', 'Sliding window or string algorithms', 'string']
  ],
  apiIntro: 'Java has no trie class, so these snippets show the usual hand-written shapes, plus a TreeSet trick. Each one runs as shown.',
  api: [
    { name: 'TreeSet prefix trick', code: J`TreeSet<String> words = new TreeSet<>(List.of("car", "cart", "cat", "dog", "do"));
String p = "ca";
System.out.println(words.subSet(p, p + Character.MAX_VALUE));    // every word starting with "ca"
System.out.println(words.ceiling(p).startsWith(p));               // does any word start with p?`, out: `[car, cart, cat]
true`, note: 'Sorted order puts all words with a prefix next to each other. Fine for a few queries; a trie wins when there are many.' },
    { name: 'Autocomplete', wrap: 'class', code: J`static class Node { Node[] next = new Node[26]; boolean end; }
static Node root = new Node();

static void insert(String w) {
    Node n = root;
    for (char c : w.toCharArray()) {
        int i = c - 'a';
        if (n.next[i] == null) n.next[i] = new Node();
        n = n.next[i];
    }
    n.end = true;
}
static void collect(Node n, StringBuilder path, List<String> out) {
    if (n.end) out.add(path.toString());
    for (int i = 0; i < 26; i++) {
        if (n.next[i] == null) continue;
        path.append((char) ('a' + i));
        collect(n.next[i], path, out);
        path.deleteCharAt(path.length() - 1);      // backtrack
    }
}

public static void main(String[] args) {
    for (String w : List.of("tree", "trie", "try", "tea", "to")) insert(w);
    Node n = root;
    for (char c : "tr".toCharArray()) n = n.next[c - 'a'];
    List<String> out = new ArrayList<>();
    collect(n, new StringBuilder("tr"), out);
    System.out.println(out);
}`, out: `[tree, trie, try]` },
    { name: 'Prefix counts', wrap: 'class', code: J`static class Node { Node[] next = new Node[26]; int pass; }   // words passing through
static Node root = new Node();

static void add(String w) {
    Node n = root;
    for (char c : w.toCharArray()) {
        int i = c - 'a';
        if (n.next[i] == null) n.next[i] = new Node();
        n = n.next[i];
        n.pass++;
    }
}
static int countPrefix(String p) {
    Node n = root;
    for (char c : p.toCharArray()) {
        n = n.next[c - 'a'];
        if (n == null) return 0;
    }
    return n.pass;
}

public static void main(String[] args) {
    for (String w : List.of("apple", "app", "apply", "ape", "bat")) add(w);
    System.out.println(countPrefix("app") + " " + countPrefix("ap") + " " + countPrefix("b") + " " + countPrefix("cat"));
}`, out: `3 4 1 0`, note: 'Storing a counter in each node answers "how many words start with p?" in O(L).' },
    { name: 'Any characters', wrap: 'class', code: J`static class Node {
    Map<Character, Node> kids = new HashMap<>();
    boolean end;
}
static Node root = new Node();

static void insert(String w) {
    Node n = root;
    for (char c : w.toCharArray()) n = n.kids.computeIfAbsent(c, k -> new Node());
    n.end = true;
}
static boolean search(String w) {
    Node n = root;
    for (char c : w.toCharArray()) {
        n = n.kids.get(c);
        if (n == null) return false;
    }
    return n.end;
}

public static void main(String[] args) {
    for (String w : List.of("Cab", "cab", "c-3po")) insert(w);
    System.out.println(search("Cab") + " " + search("ca") + " " + search("c-3po"));
}`, out: `true false true`, note: 'A map per node handles uppercase, digits and symbols, and uses memory only for children that exist.' }
  ],
  build: {
    intro: 'LeetCode 208. Each node is an array of 26 children plus an `end` flag. One private `walk` helper serves both `search` and `startsWith`.',
    code: J`class Trie {
    private static class Node {
        Node[] next = new Node[26];
        boolean end;                        // a word ends here
    }
    private final Node root = new Node();

    void insert(String word) {
        Node n = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (n.next[i] == null) n.next[i] = new Node();   // new branch
            n = n.next[i];
        }
        n.end = true;
    }

    boolean search(String word) {
        Node n = walk(word);
        return n != null && n.end;
    }

    boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }

    private Node walk(String s) {
        Node n = root;
        for (char c : s.toCharArray()) {
            n = n.next[c - 'a'];
            if (n == null) return null;       // path breaks off
        }
        return n;
    }
}`,
    notes: [
      ['c - \'a\'', 'Maps `a..z` to `0..25`, the child slot.'],
      ['end flag', 'Without it, every prefix of a stored word would look like a word.'],
      ['walk', 'Returns the node at the end of the path, or `null` if the path breaks. `search` adds the `end` check; `startsWith` does not.']
    ],
    demo: J`Trie t = new Trie();
t.insert("apple");
System.out.println(t.search("apple") + " " + t.search("app") + " " + t.startsWith("app"));
t.insert("app");
System.out.println(t.search("app"));`,
    out: `true false true
true`
  },
  gotchas: [
    ['Forgetting the end flag', '`search("app")` returns true after inserting only "apple".', 'Check `node.end`, not just that the path exists.'],
    ['Uppercase or other chars', '`\'A\' - \'a\'` is -32: `ArrayIndexOutOfBoundsException`.', 'Lowercase first, or use a `HashMap` per node.'],
    ['Memory blow-up', 'Every node allocates 26 slots even if it uses one.', 'Map children, or share the trie between queries instead of rebuilding.'],
    ['Removing a word naively', 'Deleting nodes on the path can break other words that share them.', 'Clear `end`, then delete only nodes with no children and no `end`, from the bottom up.']
  ],
  drills: {
    fillBlank: [
      { id: 'fb-ins', title: 'Insert and search', ask: 'Create missing children while inserting; stop at a missing child while searching.', code: J`void insert(String w) {
    Node n = root;
    for (char c : w.toCharArray()) {
        int i = c - [['a']];
        if (n.next[i] == [[null]]) n.next[i] = new Node();
        n = [[n.next[i]]];
    }
    n.[[end = true]];
}
boolean search(String w) {
    Node n = root;
    for (char c : w.toCharArray()) {
        n = n.next[c - 'a'];
        if (n == null) return [[false]];
    }
    return [[n.end]];
}`, ctx: 'static class Node { Node[] next = new Node[26]; boolean end; }\nNode root = new Node();', test: 'Sol s = new Sol(); s.insert("cat"); s.insert("car"); System.out.println(s.search("car") + " " + s.search("ca") + " " + s.search("cab"));', out: 'true false false' },
      { id: 'fb-root', title: 'Replace a word with its shortest root', ask: 'Walk the word; the first `end` node you reach is the shortest root.', code: J`String shortestRoot(String word) {
    Node n = root;
    StringBuilder sb = new StringBuilder();
    for (char c : word.toCharArray()) {
        n = n.next[c - 'a'];
        if (n == null) return [[word]];           // no root is a prefix
        sb.append(c);
        if (n.[[end]]) return [[sb.toString()]];   // shortest root found
    }
    return word;
}`, ctx: J`static class Node { Node[] next = new Node[26]; boolean end; }
Node root = new Node();
void insert(String w) { Node n = root; for (char c : w.toCharArray()) { int i = c - 'a'; if (n.next[i] == null) n.next[i] = new Node(); n = n.next[i]; } n.end = true; }`, test: 'Sol s = new Sol(); for (String r : new String[]{"cat", "bat", "rat", "ca"}) s.insert(r); System.out.println(s.shortestRoot("cattle") + " " + s.shortestRoot("battery") + " " + s.shortestRoot("dog"));', out: 'ca bat dog' }
    ],
    order: [
      { id: 'od-prefix', title: 'startsWith',
        ideaSteps: ['Start at the root.', 'For each letter, compute its child slot.', 'If that child is missing, no word has this prefix.', 'Otherwise move down to it.', 'If every letter was found, the prefix exists.'],
        lines: [
          'boolean startsWith(String prefix) {',
          '    Node n = root;',
          '    for (char c : prefix.toCharArray()) {',
          "        int i = c - 'a';",
          '        if (n.next[i] == null) return false;',
          '        n = n.next[i];',
          '    }',
          '    return true;',
          '}'
        ],
        extra: ['    return n.end;'],
        check: { wrap: 'sol', ctx: J`static class Node { Node[] next = new Node[26]; boolean end; }
Node root = new Node();
void insert(String w) { Node n = root; for (char c : w.toCharArray()) { int i = c - 'a'; if (n.next[i] == null) n.next[i] = new Node(); n = n.next[i]; } n.end = true; }`, test: 'Sol s = new Sol(); s.insert("apple"); System.out.println(s.startsWith("app") + " " + s.startsWith("apx"));', out: 'true false' } }
    ]
  },
  patterns: ['backtracking', 'trees', 'graphs'],
  patternWhy: {
    backtracking: 'Word Search II prunes the grid DFS as soon as the path is not a trie prefix.',
    trees: 'A trie is an n-ary tree; autocomplete is a DFS below a node.',
    graphs: 'Grid DFS plus a trie finds many words in one pass.'
  },
  problems: [['208', 'Implement Trie (Prefix Tree)'], ['648', 'Replace Words'], ['14', 'Longest Common Prefix'], ['211', 'Design Add and Search Words Data Structure'], ['1268', 'Search Suggestions System'], ['212', 'Word Search II']]
});
})();
