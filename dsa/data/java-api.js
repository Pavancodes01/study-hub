// Java API reference cards and quiz items. Each item: [task, code, meaning, alternates?]
// The task is phrased with the variable names the answer must use.
window.JAVA_API = [
  { id: 'string', group: 'String', intro: 'Strings are immutable. Every "change" builds a new String; use StringBuilder in loops.', items: [
    ['Length of String s', 's.length()', 'Number of chars. Brackets, unlike arrays.'],
    ['Char at index i of s', 's.charAt(i)', 'Returns a `char`. Index 0 to length - 1.'],
    ['Last char of s', 's.charAt(s.length() - 1)', 'Common in palindrome and suffix checks.'],
    ['Turn s into a char array named chars', 'char[] chars = s.toCharArray();', 'A mutable copy you can sort or swap.', ['char[] chars = s.toCharArray()']],
    ['Part of s from index a up to (not including) b', 's.substring(a, b)', 'End index is exclusive. `s.substring(a)` goes to the end.'],
    ['Index of the first "x" in s (or -1)', 's.indexOf("x")', 'Also works with a char: `s.indexOf(\'x\')`.', ["s.indexOf('x')"]],
    ['Are Strings a and b equal (same text)?', 'a.equals(b)', 'Never use `==` for String content.'],
    ['Compare a and b in dictionary order', 'a.compareTo(b)', 'Negative if a comes first, 0 if equal, positive otherwise.'],
    ['Split s on spaces into words', 's.split(" ")', 'Returns `String[]`. Use `s.trim().split("\\\\s+")` for messy spacing.', ['s.split("\\\\s+")']],
    ['Join String array words with commas', 'String.join(",", words)', 'Works for arrays and Lists.'],
    ['Remove spaces at both ends of s', 's.trim()', 'Returns a new String.'],
    ['s in lowercase', 's.toLowerCase()', 'Returns a new String.'],
    ['int x as a String', 'String.valueOf(x)', 'Or `"" + x`, or `Integer.toString(x)`.', ['Integer.toString(x)', '""+x']],
    ['String s to int', 'Integer.parseInt(s)', 'Throws NumberFormatException on bad input.'],
    ['char[] chars back to a String', 'new String(chars)', 'Or `String.valueOf(chars)`.', ['String.valueOf(chars)']],
    ['s repeated k times', 's.repeat(k)', 'Java 11+.'],
    ['Does s contain "ab"?', 's.contains("ab")', 'Returns boolean.'],
    ['Does s start with "pre"?', 's.startsWith("pre")', '`endsWith` for the other side.'],
    ['Is s empty?', 's.isEmpty()', '`s.length() == 0`.', ['s.length()==0']]
  ]},
  { id: 'sb', group: 'StringBuilder', intro: 'A mutable string. Append in O(1), turn into a String once at the end.', items: [
    ['New empty StringBuilder sb', 'StringBuilder sb = new StringBuilder();', 'Start building.', ['StringBuilder sb = new StringBuilder()']],
    ['Add char c to the end of sb', 'sb.append(c)', 'Also takes Strings, ints, anything.'],
    ['Remove the last char of sb', 'sb.deleteCharAt(sb.length() - 1)', 'Undo for backtracking / stack use.'],
    ['Reverse sb in place', 'sb.reverse()', 'Returns sb itself, so it can be chained.'],
    ['Insert char c at the front of sb', 'sb.insert(0, c)', 'O(n): shifts everything. Prefer append + reverse.'],
    ['Change the char at index i of sb to c', 'sb.setCharAt(i, c)', 'Strings cannot do this; StringBuilder can.'],
    ['Final String from sb', 'sb.toString()', 'Call once at the end.'],
    ['Reverse String s in one line', 'new StringBuilder(s).reverse().toString()', 'Handy palindrome check.']
  ]},
  { id: 'char', group: 'Character and char math', intro: 'A char is a small number. Subtracting chars gives distances you can use as indexes.', items: [
    ['Is char c a letter or a digit?', 'Character.isLetterOrDigit(c)', 'Skip punctuation and spaces.'],
    ['Is char c a digit?', 'Character.isDigit(c)', "'0' to '9'."],
    ['Is char c a letter?', 'Character.isLetter(c)', 'a-z, A-Z (and other alphabets).'],
    ['Char c in lowercase', 'Character.toLowerCase(c)', 'Returns a char.'],
    ["Index 0..25 of lowercase letter c", "c - 'a'", "Use as `count[c - 'a']`."],
    ['Digit char c as an int', "c - '0'", "'7' - '0' = 7."],
    ['Letter at index i (0..25) as a char', "(char) ('a' + i)", 'Cast back from int to char.', ["(char)(i + 'a')"]],
    ['Is c uppercase?', 'Character.isUpperCase(c)', '`isLowerCase` too.']
  ]},
  { id: 'arrays', group: 'Arrays', intro: 'Fixed size. `.length` has no brackets. `java.util.Arrays` has the helpers.', items: [
    ['Length of array nums', 'nums.length', 'No brackets for arrays.'],
    ['New int array of size n (all zeros)', 'new int[n]', 'Booleans start false, objects start null.'],
    ['Array literal with 1, 2, 3', 'new int[]{1, 2, 3}', 'Handy for returning two indexes: `new int[]{i, j}`.'],
    ['Sort nums ascending', 'Arrays.sort(nums)', 'O(n log n). Dual-pivot quicksort for primitives.'],
    ['Sort 2D array a by first column', 'Arrays.sort(a, (x, y) -> x[0] - y[0])', 'Comparator on rows.', ['Arrays.sort(a, (x, y) -> Integer.compare(x[0], y[0]))', 'Arrays.sort(a, Comparator.comparingInt(x -> x[0]))']],
    ['Fill dp with -1', 'Arrays.fill(dp, -1)', 'Set every slot to one value.'],
    ['Copy of nums (whole array)', 'nums.clone()', 'Or `Arrays.copyOf(nums, nums.length)`.', ['Arrays.copyOf(nums, nums.length)']],
    ['Copy of nums from index a to b (exclusive)', 'Arrays.copyOfRange(nums, a, b)', 'Like substring for arrays.'],
    ['Do arrays a and b hold the same values?', 'Arrays.equals(a, b)', '`a == b` only checks identity.'],
    ['Print nums for debugging', 'System.out.println(Arrays.toString(nums))', '`Arrays.deepToString` for 2D.'],
    ['Sum of nums using streams', 'Arrays.stream(nums).sum()', 'Also `.max().getAsInt()`, `.min()`.'],
    ['New 2D int array with m rows, n columns', 'new int[m][n]', '`grid.length` rows, `grid[0].length` columns.'],
    ['Binary search for x in sorted nums', 'Arrays.binarySearch(nums, x)', 'Negative result means not found.']
  ]},
  { id: 'list', group: 'List / ArrayList', intro: 'Resizable array. Generic types must be objects: `List<Integer>`, not `List<int>`.', items: [
    ['New empty list of Integer named list', 'List<Integer> list = new ArrayList<>();', 'The diamond `<>` infers the type.', ['List<Integer> list = new ArrayList<>()']],
    ['Add x to the end of list', 'list.add(x)', 'Amortized O(1).'],
    ['Item at index i of list', 'list.get(i)', 'Not `list[i]`.'],
    ['Number of items in list', 'list.size()', 'Lists use size(), arrays use length.'],
    ['Remove the last item of list', 'list.remove(list.size() - 1)', 'By index. Backtracking un-choose.'],
    ['Change item at index i of list to x', 'list.set(i, x)', 'Returns the old value.'],
    ['Copy of list named copy', 'List<Integer> copy = new ArrayList<>(list);', 'Needed when saving a backtracking path.', ['List<Integer> copy = new ArrayList<>(list)']],
    ['List with 1, 2, 3 (read-only)', 'List.of(1, 2, 3)', 'Immutable. `Arrays.asList(1, 2, 3)` is fixed-size.', ['Arrays.asList(1, 2, 3)']],
    ['Sort list ascending', 'Collections.sort(list)', 'Or `list.sort(null)`.', ['list.sort(null)']],
    ['Reverse list in place', 'Collections.reverse(list)', 'O(n).'],
    ['Does list contain x?', 'list.contains(x)', 'O(n). Use a Set for fast lookups.'],
    ['Insert x at the front of list', 'list.add(0, x)', 'O(n): shifts everything.']
  ]},
  { id: 'map', group: 'HashMap', intro: 'Key → value in O(1) average. `get` returns null for missing keys.', items: [
    ['New map from Integer to Integer named map', 'Map<Integer, Integer> map = new HashMap<>();', 'Wrapper types, not primitives.', ['Map<Integer, Integer> map = new HashMap<>()']],
    ['Store value v for key k in map', 'map.put(k, v)', 'Replaces any old value.'],
    ['Value for key k (or null)', 'map.get(k)', 'Unboxing null into int crashes.'],
    ['Value for key k, or 0 if missing', 'map.getOrDefault(k, 0)', 'Safe counting.'],
    ['Does map have key k?', 'map.containsKey(k)', 'O(1).'],
    ['Add 1 to the count of k (put 1 if new)', 'map.merge(k, 1, Integer::sum)', 'Same as `map.put(k, map.getOrDefault(k, 0) + 1)`.', ['map.put(k, map.getOrDefault(k, 0) + 1)']],
    ['Add s to the list stored under key k (create the list if needed)', 'map.computeIfAbsent(k, x -> new ArrayList<>()).add(s)', 'Grouping in one line.'],
    ['Store v for key k only if k is new', 'map.putIfAbsent(k, v)', 'Keeps the first value.'],
    ['Remove key k from map', 'map.remove(k)', 'Returns the old value.'],
    ['Number of keys in map', 'map.size()', ''],
    ['Loop over every key-value pair of map', 'for (Map.Entry<Integer, Integer> e : map.entrySet())', 'Then `e.getKey()`, `e.getValue()`.', ['for (var e : map.entrySet())']],
    ['All values of map as a new list', 'new ArrayList<>(map.values())', 'Group anagrams return value.']
  ]},
  { id: 'set', group: 'HashSet', intro: 'Unique values with O(1) add / contains / remove.', items: [
    ['New set of Integer named set', 'Set<Integer> set = new HashSet<>();', '', ['Set<Integer> set = new HashSet<>()']],
    ['Add x to set', 'set.add(x)', 'Returns false if x was already there.'],
    ['Is x in set?', 'set.contains(x)', 'O(1).'],
    ['Remove x from set', 'set.remove(x)', 'Returns true if it was there.'],
    ['Set from a list named list', 'new HashSet<>(list)', 'Removes duplicates.'],
    ['Size of set', 'set.size()', '']
  ]},
  { id: 'deque', group: 'Stack and Queue (ArrayDeque)', intro: 'ArrayDeque is the go-to stack and queue. It does not allow null.', items: [
    ['New stack of Integer named st', 'Deque<Integer> st = new ArrayDeque<>();', 'Prefer over the legacy Stack class.', ['Deque<Integer> st = new ArrayDeque<>()']],
    ['Push x onto stack st', 'st.push(x)', 'Adds to the front (top).'],
    ['Remove and return the top of st', 'st.pop()', 'Throws if empty.'],
    ['Look at the top of st without removing', 'st.peek()', 'Returns null if empty.'],
    ['Is st empty?', 'st.isEmpty()', 'Check before pop.'],
    ['New queue of Integer named q', 'Queue<Integer> q = new ArrayDeque<>();', 'Or `new LinkedList<>()` (allows null).', ['Queue<Integer> q = new ArrayDeque<>()', 'Queue<Integer> q = new LinkedList<>();', 'Queue<Integer> q = new LinkedList<>()']],
    ['Add x to the back of queue q', 'q.offer(x)', '`add` also works but throws on failure.', ['q.add(x)']],
    ['Remove and return the front of q', 'q.poll()', 'Returns null if empty.'],
    ['Add x to the back of deque dq', 'dq.offerLast(x)', 'Deque has both ends.', ['dq.addLast(x)']],
    ['Remove from the back of deque dq', 'dq.pollLast()', 'Monotonic deque.'],
    ['Look at the front of deque dq', 'dq.peekFirst()', '']
  ]},
  { id: 'pq', group: 'PriorityQueue (heap)', intro: 'Min-heap by default. offer / poll O(log n), peek O(1).', items: [
    ['New min-heap of Integer named pq', 'PriorityQueue<Integer> pq = new PriorityQueue<>();', 'Smallest on top.', ['PriorityQueue<Integer> pq = new PriorityQueue<>()']],
    ['New max-heap of Integer named pq', 'PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());', 'Largest on top.', ['PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> b - a);', 'PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder())', 'PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> b - a)']],
    ['Heap of int[] ordered by index 0 ascending', 'new PriorityQueue<>((a, b) -> a[0] - b[0])', 'Pairs like {dist, node}.', ['new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]))', 'new PriorityQueue<int[]>((a, b) -> a[0] - b[0])']],
    ['Insert x into pq', 'pq.offer(x)', 'O(log n).', ['pq.add(x)']],
    ['Remove and return the top of pq', 'pq.poll()', 'O(log n).'],
    ['Look at the top of pq', 'pq.peek()', 'O(1).'],
    ['Keep only k items in pq after adding', 'if (pq.size() > k) pq.poll();', 'Top-K pattern.', ['if (pq.size() > k) pq.poll()']]
  ]},
  { id: 'tree', group: 'TreeMap / TreeSet', intro: 'Sorted keys with O(log n) operations and nearest-key lookups.', items: [
    ['New TreeMap from Integer to Integer named tm', 'TreeMap<Integer, Integer> tm = new TreeMap<>();', '', ['TreeMap<Integer, Integer> tm = new TreeMap<>()']],
    ['Largest key ≤ x in tm (or null)', 'tm.floorKey(x)', '`lowerKey` for strictly less.'],
    ['Smallest key ≥ x in tm (or null)', 'tm.ceilingKey(x)', '`higherKey` for strictly greater.'],
    ['Smallest key in tm', 'tm.firstKey()', '`lastKey()` for the largest.'],
    ['Smallest value ≥ x in TreeSet ts', 'ts.ceiling(x)', 'TreeSet version of ceilingKey.']
  ]},
  { id: 'math', group: 'Math and numbers', intro: 'Limits, overflow and integer math tricks.', items: [
    ['Larger of a and b', 'Math.max(a, b)', ''],
    ['Absolute value of x', 'Math.abs(x)', 'Careful: `Math.abs(Integer.MIN_VALUE)` is still negative.'],
    ['Largest int value', 'Integer.MAX_VALUE', '2,147,483,647.'],
    ['Smallest int value', 'Integer.MIN_VALUE', '-2,147,483,648.'],
    ['Middle of lo and hi without overflow', 'lo + (hi - lo) / 2', 'Binary search.', ['(lo + hi) >>> 1']],
    ['Ceiling of a / b for positive ints', '(a + b - 1) / b', 'No floating point needed.'],
    ['Sum a + b + c without int overflow', '(long) a + b + c', 'Cast the first term; the rest follow.'],
    ['Remainder of x mod k, never negative', '((x % k) + k) % k', 'Java % keeps the sign of x.'],
    ['Square root of x as a double', 'Math.sqrt(x)', 'Cast to int if needed.'],
    ['Compare ints a and b safely (for comparators)', 'Integer.compare(a, b)', 'No overflow, unlike a - b.']
  ]},
  { id: 'lambda', group: 'Comparators and lambdas', intro: 'A comparator returns negative when a should come first.', items: [
    ['Sort Integer[] arr descending', 'Arrays.sort(arr, Collections.reverseOrder())', 'Needs an object array, not int[].', ['Arrays.sort(arr, (a, b) -> b - a)']],
    ['Sort String[] words by length', 'Arrays.sort(words, (a, b) -> a.length() - b.length())', '', ['Arrays.sort(words, Comparator.comparingInt(String::length))', 'Arrays.sort(words, (a, b) -> Integer.compare(a.length(), b.length()))']],
    ['Sort list of int[] named list by index 1', 'list.sort((a, b) -> a[1] - b[1])', 'List has its own sort.', ['list.sort((a, b) -> Integer.compare(a[1], b[1]))', 'list.sort(Comparator.comparingInt(a -> a[1]))', 'Collections.sort(list, (a, b) -> a[1] - b[1])']],
    ['Comparator by index 0, then by index 1', 'Comparator.comparingInt((int[] a) -> a[0]).thenComparingInt(a -> a[1])', 'Tie breakers.'],
    ['Method reference that adds two Integers', 'Integer::sum', 'Used with `merge`.']
  ]}
];
