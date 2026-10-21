(function(){
var SRC = String.raw`import java.util.*;

interface SplitStrategy {                                      // how an expense is divided
    Map<String, Integer> split(int amount, List<String> users, List<Integer> values);
}

class EqualSplit implements SplitStrategy {
    public Map<String, Integer> split(int amount, List<String> users, List<Integer> values) {
        Map<String, Integer> out = new LinkedHashMap<>();
        int share = amount / users.size(), rest = amount % users.size();
        for (int i = 0; i < users.size(); i++) out.put(users.get(i), share + (i < rest ? 1 : 0));   // spread leftover
        return out;
    }
}

class ExactSplit implements SplitStrategy {
    public Map<String, Integer> split(int amount, List<String> users, List<Integer> values) {
        if (values.stream().mapToInt(Integer::intValue).sum() != amount) throw new IllegalArgumentException("exact shares must add up");
        Map<String, Integer> out = new LinkedHashMap<>();
        for (int i = 0; i < users.size(); i++) out.put(users.get(i), values.get(i));
        return out;
    }
}

class PercentSplit implements SplitStrategy {
    public Map<String, Integer> split(int amount, List<String> users, List<Integer> values) {
        if (values.stream().mapToInt(Integer::intValue).sum() != 100) throw new IllegalArgumentException("percents must add to 100");
        Map<String, Integer> out = new LinkedHashMap<>();
        int given = 0;
        for (int i = 0; i < users.size(); i++) { int s = amount * values.get(i) / 100; out.put(users.get(i), s); given += s; }
        out.merge(users.get(0), amount - given, Integer::sum);   // rounding leftover to the first user
        return out;
    }
}

class BalanceSheet {
    // balances.get(a).get(b) > 0 means b owes a that much
    private final Map<String, Map<String, Integer>> balances = new TreeMap<>();
    void add(String paidBy, String owes, int amount) {
        if (paidBy.equals(owes)) return;
        balances.computeIfAbsent(paidBy, k -> new TreeMap<>()).merge(owes, amount, Integer::sum);
        balances.computeIfAbsent(owes, k -> new TreeMap<>()).merge(paidBy, -amount, Integer::sum);
    }
    List<String> summary() {
        List<String> out = new ArrayList<>();
        balances.forEach((a, row) -> row.forEach((b, v) -> { if (v > 0) out.add(b + " owes " + a + " " + v); }));
        return out;
    }
}

class ExpenseService {
    private final BalanceSheet sheet = new BalanceSheet();
    synchronized void addExpense(String paidBy, int amount, List<String> users, SplitStrategy strategy, List<Integer> values) {
        strategy.split(amount, users, values).forEach((user, share) -> sheet.add(paidBy, user, share));
    }
    synchronized List<String> balances() { return sheet.summary(); }
}

class SplitwiseDemo {
    public static void main(String[] args) {
        ExpenseService s = new ExpenseService();
        List<String> all = List.of("maya", "ravi", "sam");
        s.addExpense("maya", 900, all, new EqualSplit(), List.of());
        s.addExpense("ravi", 500, List.of("maya", "sam"), new ExactSplit(), List.of(200, 300));
        s.addExpense("sam", 1000, all, new PercentSplit(), List.of(50, 30, 20));
        s.balances().forEach(System.out::println);
    }
}`;
var dg = { kind: 'class', w: 860, h: 400, classes: [
  { id: 'svc', name: 'ExpenseService', x: 20, y: 30, w: 270, fields: ['- sheet: BalanceSheet'], methods: ['+ addExpense(paidBy, amount,', '    users, strategy, values)', '+ balances(): List<String>'] },
  { id: 'sheet', name: 'BalanceSheet', x: 20, y: 240, w: 290, fields: ['- balances: Map<String, Map<…>>'], methods: ['+ add(paidBy, owes, amount)', '+ summary(): List<String>'] },
  { id: 'ss', name: 'SplitStrategy', stereo: 'interface', x: 400, y: 30, w: 300, fields: [], methods: ['+ split(amount, users, values)'] },
  { id: 'eq', name: 'EqualSplit', x: 380, y: 250, w: 140, fields: [], methods: [] },
  { id: 'ex', name: 'ExactSplit', x: 540, y: 250, w: 140, fields: [], methods: [] },
  { id: 'pc', name: 'PercentSplit', x: 700, y: 250, w: 150, fields: [], methods: [] }
], rels: [
  { from: 'svc', to: 'sheet', type: 'composition' },
  { from: 'svc', to: 'ss', type: 'dependency', label: 'uses' },
  { from: 'eq', to: 'ss', type: 'implements' },
  { from: 'ex', to: 'ss', type: 'implements' },
  { from: 'pc', to: 'ss', type: 'implements' }
] };
var seq = { kind: 'seq', w: 800, parts: [{ id: 'u', name: 'App' }, { id: 's', name: 'ExpenseService' }, { id: 'p', name: 'ExactSplit' }, { id: 'b', name: 'BalanceSheet' }], msgs: [
  { from: 'u', to: 's', label: 'addExpense("ravi", 500, …)', text: 'Ravi paid 500 for Maya and Sam, exact shares 200 and 300.', code: ['s.addExpense("ravi", 500, List.of("maya", "sam"), new ExactSplit(), List.of(200, 300));'] },
  { from: 's', to: 'p', label: 'split(500, users, [200, 300])', text: 'The split strategy validates and returns each person\'s share.', code: ['if (values.stream().mapToInt(Integer::intValue).sum() != amount)'] },
  { from: 'p', to: 's', label: '{maya=200, sam=300}', ret: true, text: 'A map from user to share.', code: ['for (int i = 0; i < users.size(); i++) out.put(users.get(i), values.get(i));'] },
  { from: 's', to: 'b', label: 'add("ravi", "maya", 200)', text: 'Record that Maya owes Ravi 200 (and the mirror entry, Ravi owes Maya -200).', code: ['balances.computeIfAbsent(paidBy, k -> new TreeMap<>()).merge(owes, amount, Integer::sum);'] },
  { from: 's', to: 'b', label: 'add("ravi", "sam", 300)', text: 'Same for Sam. Balances net out automatically: earlier Ravi owed Maya 300, now the net is 100.', code: ['balances.computeIfAbsent(owes, k -> new TreeMap<>()).merge(paidBy, -amount, Integer::sum);'] }
] };
registerDesign({
  slug: 'splitwise', order: 5, title: 'Expense sharing (Splitwise)',
  one: 'Record who paid for whom, split expenses equally, exactly or by percent, and keep ==running net balances== between every pair of people.',
  questions: ['Which split types: equal, exact amounts, percentages, shares?', 'Groups or only individual expenses?', 'Do we need "simplify debts" (fewest transfers)?', 'Currency and rounding rules?', 'Settle-up payments?'],
  reqs: { func: ['Add an expense paid by one person for several', 'Split equally, exactly or by percent', 'Show who owes whom, netted per pair'], nonfunc: ['No rounding loss: shares always add up to the total', 'New split types without editing existing code', 'Concurrent expense adds stay consistent'], out: ['groups', 'multi-currency', 'debt simplification', 'notifications'] },
  entities: [['expense', 'call to `ExpenseService.addExpense`', 'Payer, amount, participants, split'], ['split type', '`SplitStrategy` + Equal/Exact/Percent', 'Turn an amount into shares'], ['balances', '`BalanceSheet`', 'Pairwise net amounts']],
  diagramNotes: ['Split types vary, so they are a **strategy**. The balance sheet stores a matrix of net amounts: `balances[a][b] > 0` means b owes a. Every add updates both directions, so netting is automatic.', 'Money is stored as an `int` of the smallest unit (paise/cents); leftovers from division are given to someone so totals always match.'],
  flowNotes: ['An expense is split by its strategy, then each share is posted to the sheet.'],
  flows: [
    { name: 'Class diagram', title: 'Splitwise classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Entry point', add: ['svc'], on: ['svc'], text: 'One method to add an expense; one to read balances.', code: ['class ExpenseService {'] },
      { title: 'Split strategies', add: ['ss', 'eq', 'ex', 'pc'], on: ['ss'], rels: ['svc-ss'], text: 'Each split rule is a class. Adding "shares" (2:1:1) is a new class.', code: ['interface SplitStrategy {', 'class EqualSplit implements SplitStrategy {', 'class PercentSplit implements SplitStrategy {'] },
      { title: 'Balances', add: ['sheet'], on: ['sheet'], rels: ['svc-sheet'], text: 'A nested map of net amounts, updated in both directions.', code: ['class BalanceSheet {', 'balances.computeIfAbsent(owes, k -> new TreeMap<>()).merge(paidBy, -amount, Integer::sum);'] },
      { title: 'No lost paise', on: ['eq'], text: '1000 split 3 ways is 334 + 333 + 333, not 333.33 three times.', code: ['out.put(users.get(i), share + (i < rest ? 1 : 0));'] }
    ]},
    { name: 'Add an expense', title: 'Exact split posted to balances', diagram: seq, code: '@main' }
  ],
  patterns: [['Strategy', '`SplitStrategy`', 'Different ways to divide an expense.'], ['Facade', '`ExpenseService`', 'Simple API over splitting and balances.'], ['Observer (extension)', 'Notify people when they are added to an expense', 'Decoupled notifications.']],
  code: { file: 'SplitwiseDemo.java', src: SRC, expect: 'ravi owes maya 100\nmaya owes sam 200' },
  concurrency: [['Two expenses added at the same time', '`addExpense` is synchronized, so both sides of each balance update together.'], ['Large groups at scale', 'Store expenses as an append-only log and compute balances per group; lock per group instead of globally.']],
  extensions: [['Simplify debts', 'Compute each person\'s net total, then greedily match the biggest debtor with the biggest creditor.'], ['Groups', '`Group` holding members and its own balance sheet.'], ['Share-based split', '`ShareSplit implements SplitStrategy` (2:1:1).'], ['Settle up', 'A payment is just an expense of the payer for the receiver.']],
  probe: [['Why store money as integers?', ['Floating point cannot represent 0.1 exactly; sums drift. Store the smallest unit as `long`/`int` and decide explicitly where rounding leftovers go.']], ['How would you minimize the number of transfers?', ['Net each person\'s balance, then repeatedly match the largest creditor with the largest debtor (priority queues). Greedy gives a small number of transfers; the true minimum is NP-hard in general.']], ['How is the balance sheet kept consistent?', ['Every posting updates both `[a][b]` and `[b][a]` inside one synchronized operation.']]],
  say: ['Split types are strategies, and the balance sheet keeps pairwise net amounts.', 'Money is stored in the smallest unit, and leftovers from division are assigned so totals match exactly.'],
  facts: [['money', 'int/long minor units'], ['split', 'Strategy'], ['balances', 'pairwise net map'], ['simplify', 'greedy on net totals']],
  checklist: ['Write the three split strategies.', 'Explain the balance sheet and netting.', 'Explain rounding and simplify-debts.'],
  drills: {
    mcq: [{ id: 'mcq-sw', title: 'Rounding', ask: '1000 split equally among 3 with `double` gives 333.333 each. What is the better approach?', options: [['Use integer minor units and give the leftover paise to some participants (334, 333, 333)', true, 'Shares always add up exactly.'], ['Round each share to 333', false, 'Loses 1 paisa.'], ['Use float instead of double', false, 'Less precise.'], ['Ignore it', false, 'Balances drift over time.']] }],
    code: [{ id: 'code-sw', title: 'Equal split', ask: 'Spread the leftover so shares add up.', run: 'EqDemo', expect: '[334, 333, 333]', code: String.raw`import java.util.*;
class EqDemo {
    public static void main(String[] args) {
        int amount = 1000, n = 3;
        int share = amount / n, rest = amount [[%]] n;
        List<Integer> shares = new ArrayList<>();
        for (int i = 0; i < n; i++) shares.add(share + (i < [[rest]] ? 1 : 0));
        System.out.println(shares);
    }
}` }],
    order: [{ id: 'ord-sw', title: 'Add an expense', ask: 'Order the steps.', steps: ['Receive payer, amount, participants and split type', 'Split strategy validates and computes each share', 'For each share, add "participant owes payer"', 'Update the reverse entry with the negative amount', 'Summaries show only positive net amounts'], extra: ['Store shares as doubles'] }],
    classes: { id: 'cls-sw', title: 'Design Splitwise', reqs: ['Equal, exact and percent splits', 'Net balances between people', 'More split types later'], parts: [['ExpenseService', 'must', 'Entry point.'], ['SplitStrategy', 'must', 'Interface for split rules.'], ['EqualSplit / ExactSplit / PercentSplit', 'must', 'One class per rule.'], ['BalanceSheet', 'must', 'Pairwise balances.'], ['Group', 'good', 'Needed for group features.'], ['double amounts', 'no', 'Rounding errors.'], ['One class with a switch on split type', 'no', 'Every new type edits it.']] }
  }
});
})();
