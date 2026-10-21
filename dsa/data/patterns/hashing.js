(function(){
var J = String.raw;
function arr(vals, marks, extra){ var p = { type: 'array', vals: vals, marks: marks || [] }; for (var k in extra) p[k] = extra[k]; return p; }

registerPattern({
  slug: 'hashing', order: 4, title: 'Hashing (HashMap and HashSet)',
  oneLiner: 'Trade memory for speed. A `HashMap` or `HashSet` answers "have I seen this?" and "how many?" in O(1), turning nested-loop searches into one pass.',
  legend: [['r', 'current item'], ['a', 'item found in the map']],
  clues: ['have I seen this before?', 'count frequency', 'duplicates', 'pair that sums to target (unsorted)', 'group by', 'anagram', 'first unique', 'O(n) required, input not sorted'],
  idea: [
    'Brute force asks "is the partner somewhere in the array?" with an inner loop. A hash map **remembers everything you walked past**, so the question becomes one lookup.',
    'Pick the key carefully: the thing you will search for later. Pick the value: what you need back (an index, a count, a list).',
    'Typical one-pass shape: for each item, **ask the map first**, then **add the item**.'
  ],
  pick: [
    ['Only need yes / no "seen it?"', 'HashSet', '`Set<Integer> seen = new HashSet<>();`'],
    ['Need a count per value', 'HashMap value → count, or `int[26]`', '`map.merge(x, 1, Integer::sum)`'],
    ['Need where you saw it', 'HashMap value → index', '`map.put(nums[i], i)`'],
    ['Group items that share a key', 'HashMap key → List', '`map.computeIfAbsent(key, k -> new ArrayList<>()).add(x)`'],
    ['Only lowercase letters', 'Array instead of map', '`int[] count = new int[26];`']
  ],
  fourQuestions: [
    ['What will I look up later?', 'That is the key. Value, complement, sorted word, remainder…'],
    ['What do I need back?', 'That is the value type: `Integer` index, `Integer` count, `List<String>` group, or nothing (Set).'],
    ['Ask first or add first?', 'Usually ask first, then add. So an item never matches itself.'],
    ['What do I return?', 'Indexes, a boolean, a count, or `new ArrayList<>(map.values())`.']
  ],

  demo: {
    title: 'Two Sum with a HashMap (unsorted input)',
    sub: 'Array `[4, 1, 6, 3, 7]`, target 10. For each number, ask the map for its partner `target - x`. If missing, store `x → index`.',
    code: [
      'Map<Integer, Integer> seen = new HashMap<>();   // value -> index',
      'for (int i = 0; i < nums.length; i++) {',
      '    int need = target - nums[i];',
      '    if (seen.containsKey(need)) return new int[]{seen.get(need), i};',
      '    seen.put(nums[i], i);',
      '}'
    ],
    steps: function(){
      var a = [4, 1, 6, 3, 7], t = 10, seen = {}, out = [];
      function mp(hot){ return { type: 'map', name: 'seen (value → index)', entries: Object.keys(seen).map(function(k){ return [k, seen[k], +k === hot ? 'on-hit' : '']; }) }; }
      for (var i = 0; i < a.length; i++){
        var need = t - a[i];
        if (seen[need] !== undefined){
          var c = {}; c[seen[need]] = 'on-hit'; c[i] = 'on-hit';
          out.push({ panels: [arr(a, [{i: i, label: 'i', c: 'hit'}, {i: seen[need], label: 'partner', c: 'hit'}], {cls: c}), mp(need)], line: 3, ok: true, vars: {i: i, need: need},
            msg: '`need = 10 - ' + a[i] + ' = ' + need + '`. The map has ' + need + ' at index ' + seen[need] + '. Return **[' + seen[need] + ', ' + i + ']**. Each number was looked at once.' });
          break;
        }
        out.push({ panels: [arr(a, [{i: i, label: 'i', c: 'r'}]), mp(null)], line: 3, vars: {i: i, need: need}, msg: '`need = 10 - ' + a[i] + ' = ' + need + '`. Not in the map yet.' });
        seen[a[i]] = i;
        out.push({ panels: [arr(a, [{i: i, label: 'i', c: 'r'}]), mp(a[i])], line: 4, vars: {i: i}, msg: 'Store `' + a[i] + ' → ' + i + '` so a later number can find it.' });
      }
      return out;
    }
  },

  variants: [
    {
      id: 'seen', name: 'Seen set / complement map', short: 'Seen it?',
      intro: 'Walk once. For each item, check whether the thing you need is already stored. Then store the current item.',
      start: 'Set<Integer> seen = new HashSet<>();   or   Map<Integer, Integer> idx = new HashMap<>();',
      panels: [arr([4, 1, 6, 3, 7], [{i: 2, label: 'i', c: 'r'}, {i: 0, label: 'partner', c: 'a'}])],
      rules: [
        ['Use it when', 'Contains duplicate, two sum on unsorted input, first repeated item, happy number (cycle check).'],
        ['Order', 'Check, then add. `set.add(x)` returns `false` if x was already there, which can do both at once.'],
        ['Cost', 'O(n) time, O(n) space.']
      ],
      probs: '1 Two Sum, 217 Contains Duplicate, 219 Contains Duplicate II, 202 Happy Number',
      tabs: [
        { name: 'Two sum', code: J`int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();     // value -> index
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        if (seen.containsKey(need)) {
            return new int[]{seen.get(need), i};
        }
        seen.put(nums[i], i);
    }
    return new int[]{-1, -1};
}` },
        { name: 'Contains duplicate', code: J`boolean containsDuplicate(int[] nums) {
    Set<Integer> seen = new HashSet<>();
    for (int x : nums) {
        if (!seen.add(x)) return true;   // add returns false if already there
    }
    return false;
}` },
        { name: 'Duplicate within k', code: J`boolean containsNearbyDuplicate(int[] nums, int k) {
    Map<Integer, Integer> last = new HashMap<>();     // value -> last index
    for (int i = 0; i < nums.length; i++) {
        Integer j = last.get(nums[i]);                 // null if never seen
        if (j != null && i - j <= k) return true;
        last.put(nums[i], i);
    }
    return false;
}`, note: 'Store `get` in an `Integer` (not `int`) so a missing key gives `null` instead of a crash.' }
      ]
    },
    {
      id: 'count', name: 'Frequency count', short: 'Count',
      intro: 'Count how often each value appears, then answer from the counts. For lowercase letters an `int[26]` is simpler and faster than a map.',
      start: 'Map<Character, Integer> count = new HashMap<>();   or   int[] count = new int[26];',
      panels: [{ type: 'map', name: 'count for "banana"', entries: [['b', 1], ['a', 3, 'on-a'], ['n', 2]] }],
      rules: [
        ['Use it when', 'Valid anagram, first unique character, majority element, ransom note, top-k frequent (with a heap).'],
        ['Increment', '`count.merge(c, 1, Integer::sum);` or `count[c - \'a\']++;`'],
        ['Iterate a map', '`for (Map.Entry<Character, Integer> e : count.entrySet())` then `e.getKey()`, `e.getValue()`.']
      ],
      probs: '242 Valid Anagram, 387 First Unique Character, 383 Ransom Note, 169 Majority Element, 451 Sort Characters By Frequency',
      tabs: [
        { name: 'Valid anagram', code: J`boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] count = new int[26];
    for (int i = 0; i < s.length(); i++) {
        count[s.charAt(i) - 'a']++;
        count[t.charAt(i) - 'a']--;
    }
    for (int c : count) {
        if (c != 0) return false;
    }
    return true;
}` },
        { name: 'First unique char', code: J`int firstUniqChar(String s) {
    Map<Character, Integer> count = new HashMap<>();
    for (char c : s.toCharArray()) {
        count.merge(c, 1, Integer::sum);
    }
    for (int i = 0; i < s.length(); i++) {
        if (count.get(s.charAt(i)) == 1) return i;
    }
    return -1;
}` },
        { name: 'Most frequent', code: J`int mostFrequent(int[] nums) {
    Map<Integer, Integer> count = new HashMap<>();
    for (int x : nums) count.put(x, count.getOrDefault(x, 0) + 1);
    int best = nums[0];
    for (Map.Entry<Integer, Integer> e : count.entrySet()) {
        if (e.getValue() > count.get(best)) best = e.getKey();
    }
    return best;
}` }
      ]
    },
    {
      id: 'group', name: 'Group by key', short: 'Group by key',
      intro: 'Build a key that is the same for items that belong together. Map each key to a list of its items.',
      start: 'Map<String, List<String>> groups = new HashMap<>();',
      panels: [{ type: 'map', name: 'key = sorted letters', entries: [['aet', '[eat, tea, ate]', 'on-a'], ['ant', '[tan, nat]'], ['abt', '[bat]']] }],
      rules: [
        ['Use it when', 'Group anagrams, group shifted strings, bucket by some property.'],
        ['Add to a group', '`groups.computeIfAbsent(key, k -> new ArrayList<>()).add(item);`'],
        ['Return', '`new ArrayList<>(groups.values())`'],
        ['Key ideas', 'Sorted chars: `char[] a = s.toCharArray(); Arrays.sort(a); new String(a)`. Or counts: `Arrays.toString(count)`.']
      ],
      probs: '49 Group Anagrams, 249 Group Shifted Strings, 2273 Find Resultant Array After Removing Anagrams',
      tabs: [
        { name: 'Group anagrams', code: J`List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String s : strs) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);              // "eat" -> "aet"
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.values());
}` },
        { name: 'Count key (faster)', code: J`List<List<String>> groupAnagramsByCount(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String s : strs) {
        int[] count = new int[26];
        for (char c : s.toCharArray()) count[c - 'a']++;
        String key = Arrays.toString(count);         // "[1, 0, 0, ...]"
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.values());
}` }
      ]
    },
    {
      id: 'setlookup', name: 'Set for O(1) membership', short: 'Set lookups',
      intro: 'Put everything in a set first. Then any "is x there?" question costs O(1). Longest consecutive sequence uses this to only start counting at the beginning of a run.',
      start: 'Set<Integer> set = new HashSet<>();  for (int x : nums) set.add(x);',
      panels: [arr([100, 4, 200, 1, 3, 2], [{i: 3, label: 'start (no 0)', c: 'l'}], {cls: {1: 'win', 3: 'win', 4: 'win', 5: 'win'}})],
      rules: [
        ['Use it when', 'Longest consecutive sequence, intersection of two arrays, find missing numbers.'],
        ['Trick', 'Only start a run at `x` if `x - 1` is **not** in the set. Each number is then visited at most twice: O(n).']
      ],
      probs: '128 Longest Consecutive Sequence, 349 Intersection of Two Arrays, 448 Find All Numbers Disappeared',
      tabs: [
        { name: 'Longest consecutive', code: J`int longestConsecutive(int[] nums) {
    Set<Integer> set = new HashSet<>();
    for (int x : nums) set.add(x);
    int best = 0;
    for (int x : set) {
        if (set.contains(x - 1)) continue;   // not the start of a run
        int len = 1;
        while (set.contains(x + len)) len++;
        best = Math.max(best, len);
    }
    return best;
}` },
        { name: 'Intersection', code: J`int[] intersection(int[] a, int[] b) {
    Set<Integer> inA = new HashSet<>();
    for (int x : a) inA.add(x);
    Set<Integer> both = new HashSet<>();
    for (int x : b) {
        if (inA.contains(x)) both.add(x);
    }
    int[] res = new int[both.size()];
    int i = 0;
    for (int x : both) res[i++] = x;
    return res;
}`, note: 'Set to int[]: make the array with `size()` and fill it. Or `both.stream().mapToInt(Integer::intValue).toArray()`.' }
      ]
    }
  ],

  javaUsed: [
    ['Map<K, V> map = new HashMap<>()', 'Key → value store. O(1) average get/put.', 'Generic types must be objects: `Integer`, not `int`.'],
    ['map.put(k, v) / map.get(k)', 'Store / read. `get` returns `null` when missing.', 'Unboxing that null into `int` crashes.'],
    ['map.getOrDefault(k, 0)', 'Safe read with a fallback.', 'Counting without null checks.'],
    ['map.containsKey(k)', 'Is the key present?', 'Before `get` when null matters.'],
    ['map.merge(k, 1, Integer::sum)', 'Add 1, or put 1 if new.', 'Shortest way to count.'],
    ['map.computeIfAbsent(k, x -> new ArrayList<>())', 'Get the list for k, creating it the first time.', 'Then chain `.add(item)`.'],
    ['map.entrySet() / keySet() / values()', 'Iterate pairs, keys, or values.', '`e.getKey()`, `e.getValue()` on an entry.'],
    ['Set<Integer> set = new HashSet<>()', 'Unique values, O(1) contains.', '`set.add(x)` returns false if x was already in.'],
    ['Arrays.sort(chars); new String(chars)', 'Canonical key for anagrams.', 'Sorting a String needs a char[] first.'],
    ['Arrays.toString(count)', 'Readable String of an array.', 'Usable as a map key (arrays themselves are not).']
  ],
  concepts: [
    { name: 'Why int[] cannot be a map key', text: 'Arrays use identity for `equals` and `hashCode`, so two arrays with the same contents are different keys. Convert to a String (`Arrays.toString`) or a `List<Integer>` first.' },
    { name: 'Integer vs int and the == trap', text: 'Map values are `Integer` objects. `==` compares references, which happens to work only for -128..127 (cached). Use `.equals()` or unbox to `int` first.', code: J`int a = map.get(x);              // unbox (crashes if null)
if (map.get(x).equals(map.get(y))) { }   // safe compare` },
    { name: 'HashMap vs TreeMap vs LinkedHashMap', text: '`HashMap`: no order, O(1). `TreeMap`: keys sorted, O(log n), has `firstKey`, `floorKey`, `ceilingKey`. `LinkedHashMap`: keeps insertion order (useful for LRU cache).' },
    { name: 'Array as a cheap map', text: 'When keys are small integers (letters, digits, values in 0..n), an array is a map with no boxing: `int[] count = new int[26]`. Faster and less code.' }
  ],
  loops: [
    ['`for (int i = 0; i < n; i++)`', 'Need the index (to store or return it).', 'Two sum'],
    ['`for (int x : nums)`', 'Only need the value.', 'Counting, building a set'],
    ['`for (char c : s.toCharArray())`', 'Every char of a String.', 'Letter counts'],
    ['`for (Map.Entry<K, V> e : map.entrySet())`', 'Every key with its value.', 'Find best count']
  ],
  movesTitle: 'Key lines',
  moves: [
    ['`if (seen.containsKey(need)) return ...; seen.put(x, i);`', 'Ask first, then store', 'Two sum'],
    ['`if (!set.add(x)) return true;`', 'Add and detect duplicate in one call', 'Contains duplicate'],
    ['`count.merge(x, 1, Integer::sum);`', 'Count x', 'Frequency'],
    ["`count[c - 'a']++;`", 'Count a letter', 'Anagrams'],
    ['`groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);`', 'Append to a group', 'Group anagrams'],
    ['`new ArrayList<>(groups.values())`', 'All groups as a List', 'Return value']
  ],
  bugs: [
    ['NullPointerException on get', '`int c = map.get(x);` when x is missing.', '`map.getOrDefault(x, 0)` or check `containsKey`.'],
    ['Matching an item with itself', 'Storing before checking lets `x + x = target` match one element.', 'check first, then put.'],
    ['Comparing Integer with ==', 'Works for small numbers, fails for large ones.', '`.equals()` or unbox to int.'],
    ['Using an array as a key', 'Same contents, different keys.', 'use `Arrays.toString(arr)` or `new String(chars)`.'],
    ['Expecting order from HashMap', 'Iteration order is not insertion order.', '`LinkedHashMap` or `TreeMap` when order matters.'],
    ['int instead of Integer in generics', '`Map<int, int>` does not compile.', '`Map<Integer, Integer>`.']
  ],

  drills: {
    fillBlank: [
      { id: 'fb-twosum', title: 'Two sum (unsorted)', ask: 'Return the indexes of two numbers that add to target.', code: J`int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new [[HashMap<>()]];
    for (int i = 0; i < nums.length; i++) {
        int need = [[target - nums[i]]];
        if (seen.[[containsKey]](need)) return new int[]{seen.get(need), i};
        seen.put([[nums[i]]], [[i]]);
    }
    return new int[]{-1, -1};
}` },
      { id: 'fb-anagram', title: 'Valid anagram with int[26]', ask: 'Count up for s, down for t. All zeros means anagram.', code: J`boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] count = new int[ [[26]] ];
    for (int i = 0; i < s.length(); i++) {
        count[s.charAt(i) - [['a']] ]++;
        count[t.charAt(i) - 'a'][[--]];
    }
    for (int c : count) if (c [[!=]] 0) return false;
    return true;
}` },
      { id: 'fb-group', title: 'Group anagrams', ask: 'Sorted letters are the key; each key maps to a list.', code: J`List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String s : strs) {
        char[] chars = s.[[toCharArray()]];
        Arrays.[[sort]](chars);
        String key = [[new String(chars)|String.valueOf(chars)]];
        groups.[[computeIfAbsent]](key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.[[values()]]);
}` }
    ],
    order: [
      { id: 'od-consec', title: 'Longest consecutive sequence',
        ideaSteps: ['Put all numbers in a set.', 'For each number in the set: skip it if `x - 1` exists (it is not a run start).', 'From a run start, count up while `x + len` exists.', 'Keep the longest run.'],
        lines: [
          'Set<Integer> set = new HashSet<>();',
          'for (int x : nums) set.add(x);',
          'int best = 0;',
          'for (int x : set) {',
          '    if (set.contains(x - 1)) continue;',
          '    int len = 1;',
          '    while (set.contains(x + len)) len++;',
          '    best = Math.max(best, len);',
          '}',
          'return best;'
        ],
        extra: ['    if (set.contains(x + 1)) continue;'],
        wrap: 'int longestConsecutive(int[] nums) {\n@@\n}' },
      { id: 'od-unique', title: 'First unique character',
        ideaSteps: ['Count every char.', 'Walk the string again in order.', 'Return the first index whose char count is 1.', 'None found: -1.'],
        lines: [
          'int[] count = new int[26];',
          "for (char c : s.toCharArray()) count[c - 'a']++;",
          'for (int i = 0; i < s.length(); i++) {',
          "    if (count[s.charAt(i) - 'a'] == 1) return i;",
          '}',
          'return -1;'
        ],
        wrap: 'int firstUniqChar(String s) {\n@@\n}' }
    ]
  },
  practice: {
    easy: [['1', 'Two Sum'], ['217', 'Contains Duplicate'], ['242', 'Valid Anagram'], ['387', 'First Unique Character in a String'], ['383', 'Ransom Note'], ['219', 'Contains Duplicate II']],
    next: [['49', 'Group Anagrams'], ['128', 'Longest Consecutive Sequence'], ['347', 'Top K Frequent Elements'], ['451', 'Sort Characters By Frequency'], ['205', 'Isomorphic Strings'], ['290', 'Word Pattern']]
  }
});
})();
