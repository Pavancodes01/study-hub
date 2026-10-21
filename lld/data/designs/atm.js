(function(){
var SRC = String.raw`import java.util.*;

class Account {
    final String number;
    private final String pin;
    private int balance;
    Account(String number, String pin, int balance) { this.number = number; this.pin = pin; this.balance = balance; }
    boolean checkPin(String p) { return pin.equals(p); }
    synchronized int balance() { return balance; }
    synchronized boolean withdraw(int amount) {                  // joint accounts: two ATMs at once
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }
}

class Bank {
    private final Map<String, Account> accounts = new HashMap<>();
    void add(Account a) { accounts.put(a.number, a); }
    Account find(String number) { return accounts.get(number); }
}

class NoteDispenser {                                          // chain of responsibility: biggest notes first
    private final int note;
    private int count;
    private NoteDispenser next;
    NoteDispenser(int note, int count) { this.note = note; this.count = count; }
    NoteDispenser then(NoteDispenser n) { next = n; return n; }

    Map<Integer, Integer> plan(int amount) {                   // how many of each note, or null if impossible
        int use = Math.min(count, amount / note);
        int rest = amount - use * note;
        Map<Integer, Integer> out = new LinkedHashMap<>();
        if (use > 0) out.put(note, use);
        if (rest == 0) return out;
        if (next == null) return null;
        Map<Integer, Integer> sub = next.plan(rest);
        if (sub == null) return null;
        out.putAll(sub);
        return out;
    }
    void dispense(Map<Integer, Integer> plan) {
        count -= plan.getOrDefault(note, 0);
        if (next != null) next.dispense(plan);
    }
}

enum AtmState { IDLE, CARD_INSERTED, AUTHENTICATED }

class Atm {
    private AtmState state = AtmState.IDLE;
    private final Bank bank;
    private final NoteDispenser cash;
    private Account current;
    private int wrongPins;
    Atm(Bank bank, NoteDispenser cash) { this.bank = bank; this.cash = cash; }

    synchronized String insertCard(String number) {
        if (state != AtmState.IDLE) return "card already inside";
        current = bank.find(number);
        if (current == null) return "unknown card";
        state = AtmState.CARD_INSERTED;
        wrongPins = 0;
        return "enter PIN";
    }
    synchronized String enterPin(String pin) {
        if (state != AtmState.CARD_INSERTED) return "insert card first";
        if (current.checkPin(pin)) { state = AtmState.AUTHENTICATED; return "welcome"; }
        if (++wrongPins == 3) { eject(); return "card retained"; }
        return "wrong PIN";
    }
    synchronized String withdraw(int amount) {
        if (state != AtmState.AUTHENTICATED) return "not authenticated";
        if (amount <= 0 || amount % 100 != 0) return "amount must be a multiple of 100";
        if (amount > current.balance()) return "insufficient funds";
        Map<Integer, Integer> plan = cash.plan(amount);
        if (plan == null) return "ATM cannot dispense " + amount;
        if (!current.withdraw(amount)) return "insufficient funds";
        cash.dispense(plan);
        return "dispensed " + plan;
    }
    synchronized String eject() { state = AtmState.IDLE; current = null; return "card ejected"; }
}

class AtmDemo {
    public static void main(String[] args) {
        Bank bank = new Bank();
        bank.add(new Account("4111", "1234", 10_000));
        NoteDispenser cash = new NoteDispenser(2000, 2);
        cash.then(new NoteDispenser(500, 4)).then(new NoteDispenser(100, 10));
        Atm atm = new Atm(bank, cash);
        System.out.println(atm.withdraw(500));
        System.out.println(atm.insertCard("4111"));
        System.out.println(atm.enterPin("0000"));
        System.out.println(atm.enterPin("1234"));
        System.out.println(atm.withdraw(20_000));
        System.out.println(atm.withdraw(5_800));
        System.out.println(atm.withdraw(5_000));
        System.out.println(atm.withdraw(1_200));
        System.out.println(atm.eject());
    }
}`;
var dg = { kind: 'class', w: 860, h: 445, classes: [
  { id: 'atm', name: 'Atm', x: 20, y: 30, w: 260, fields: ['- state: AtmState', '- current: Account', '- cash: NoteDispenser'], methods: ['+ insertCard(number)', '+ enterPin(pin)', '+ withdraw(amount)', '+ eject()'] },
  { id: 'st', name: 'AtmState', stereo: 'enumeration', x: 20, y: 300, w: 200, fields: ['IDLE', 'CARD_INSERTED', 'AUTHENTICATED'], methods: [] },
  { id: 'bank', name: 'Bank', x: 340, y: 30, w: 200, fields: ['- accounts: Map'], methods: ['+ find(number)'] },
  { id: 'acc', name: 'Account', x: 600, y: 30, w: 240, fields: ['- pin: String', '- balance: int'], methods: ['+ checkPin(p)', '+ withdraw(amount)'] },
  { id: 'nd', name: 'NoteDispenser', x: 340, y: 230, w: 260, fields: ['- note: int', '- count: int', '- next: NoteDispenser'], methods: ['+ plan(amount): Map', '+ dispense(plan)'] }
], rels: [
  { from: 'atm', to: 'st', type: 'association' },
  { from: 'atm', to: 'bank', type: 'association' },
  { from: 'bank', to: 'acc', type: 'aggregation', fm: '1', tm: '*' },
  { from: 'atm', to: 'nd', type: 'composition', label: 'first in chain' },
  { from: 'atm', to: 'acc', type: 'association', label: 'current', via: [[150, 6], [720, 6]] }
] };
var seq = { kind: 'seq', w: 820, parts: [{ id: 'u', name: 'Customer' }, { id: 'a', name: 'Atm' }, { id: 'n1', name: '₹2000 slot' }, { id: 'n2', name: '₹500 slot' }, { id: 'n3', name: '₹100 slot' }], msgs: [
  { from: 'u', to: 'a', label: 'withdraw(5800)', text: 'Authenticated, enough balance. Now: can the ATM make 5800 with the notes it has?', code: ['synchronized String withdraw(int amount) {', 'Map<Integer, Integer> plan = cash.plan(amount);'] },
  { from: 'a', to: 'n1', label: 'plan(5800)', text: 'The 2000 slot uses as many as it can: 2 notes (only 2 left). 1800 remains.', code: ['int use = Math.min(count, amount / note);'] },
  { from: 'n1', to: 'n2', label: 'plan(1800)', text: 'Pass the rest down the chain: 3 × 500, 300 remains.', code: ['Map<Integer, Integer> sub = next.plan(rest);'] },
  { from: 'n2', to: 'n3', label: 'plan(300)', text: '3 × 100, nothing remains.', code: ['if (rest == 0) return out;'] },
  { from: 'n1', to: 'a', label: '{2000=2, 500=3, 100=3}', ret: true, text: 'Only after a full plan exists does the ATM debit the account and dispense. No half-dispensing.', code: ['if (!current.withdraw(amount)) return "insufficient funds";', 'cash.dispense(plan);'] }
] };
registerDesign({
  slug: 'atm', order: 9, title: 'ATM',
  one: 'A card → PIN → transaction flow driven by ==explicit states==, with cash dispensed by a ==chain of note slots== that only commits when the whole amount can be paid.',
  questions: ['Which operations: withdraw, balance, deposit, transfer?', 'Which note denominations and limits?', 'What happens after 3 wrong PINs?', 'Does the ATM talk to the bank online?', 'Daily withdrawal limits?'],
  reqs: { func: ['Insert card, enter PIN (3 tries)', 'Withdraw a multiple of 100', 'Dispense using available notes, biggest first', 'Eject card'], nonfunc: ['Never debit without dispensing (or the reverse)', 'Joint accounts used at two ATMs stay correct', 'Clear messages for every invalid action'], out: ['deposits', 'transfers', 'receipts', 'bank network protocol'] },
  entities: [['ATM', '`Atm`', 'Session state machine'], ['state', '`AtmState` enum', 'IDLE, CARD_INSERTED, AUTHENTICATED'], ['bank', '`Bank`', 'Look up accounts'], ['account', '`Account`', 'PIN check, balance, withdraw'], ['cash cassette', '`NoteDispenser` chain', 'Plan and dispense notes']],
  diagramNotes: ['The ATM keeps an explicit state; every method first checks it, so "withdraw before PIN" is impossible.', 'Note slots form a **chain of responsibility**: each slot takes what it can and passes the rest on. `plan` is computed before anything changes, so a failed plan leaves money and notes untouched.'],
  flowNotes: ['Withdraw: state check → balance check → note plan through the chain → debit → dispense.'],
  flows: [
    { name: 'Class diagram', title: 'ATM classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The session', add: ['atm', 'st'], on: ['atm', 'st'], text: 'The ATM knows which step of the session it is in.', code: ['class Atm {', 'enum AtmState { IDLE, CARD_INSERTED, AUTHENTICATED }'] },
      { title: 'Bank and accounts', add: ['bank', 'acc'], on: ['bank', 'acc'], rels: ['atm-bank', 'bank-acc'], text: 'Accounts check their own PIN and guard their balance.', code: ['class Bank {', 'synchronized boolean withdraw(int amount) {'] },
      { title: 'The note chain', add: ['nd'], on: ['nd'], rels: ['atm-nd'], text: '2000 → 500 → 100 slots, each with its own count, linked by `next`.', code: ['class NoteDispenser {', 'cash.then(new NoteDispenser(500, 4)).then(new NoteDispenser(100, 10));'] },
      { title: 'Plan, then commit', on: ['atm', 'nd'], text: 'Compute the full note plan first; only then debit and dispense.', code: ['Map<Integer, Integer> plan = cash.plan(amount);', 'cash.dispense(plan);'] }
    ]},
    { name: 'Withdraw 5800', title: 'Planning notes down the chain', diagram: seq, code: '@main' }
  ],
  patterns: [['State', '`AtmState` + checks in each action', 'Actions only valid in certain states. Promote to classes as states grow.'], ['Chain of Responsibility', '`NoteDispenser`', 'Each denomination handles part of the amount.'], ['Facade', '`Atm` public API', 'One entry point over bank and cash.']],
  code: { file: 'AtmDemo.java', src: SRC, expect: 'not authenticated\nenter PIN\nwrong PIN\nwelcome\ninsufficient funds\ndispensed {2000=2, 500=3, 100=3}\ninsufficient funds\ndispensed {500=1, 100=7}\ncard ejected' },
  concurrency: [['Same joint account at two ATMs', '`Account.withdraw` is synchronized: check and debit are one step.'], ['Two actions on one ATM', 'ATM methods are synchronized; a physical ATM has one user anyway.'], ['Debited but cash jammed', 'Real systems record a pending transaction and reverse it if dispensing fails.']],
  extensions: [['Daily limit', 'Track withdrawn-today per account; check before planning.'], ['More operations', 'Promote to State classes or Command objects per operation.'], ['Optimal note mix', 'Swap the greedy plan for a DP that respects counts in all cases.'], ['Deposits', 'New state flow and a deposit slot device.']],
  probe: [['Why plan before dispensing?', ['So the operation is all or nothing: if the notes cannot make the amount, nothing is debited and no notes leave.']], ['Is greedy always correct for notes?', ['For standard denominations with plenty of notes, yes. With limited counts it can fail when a different mix would work (e.g. 600 with only 500s and 200s). A DP or backtracking plan fixes that.']], ['How would you model states as classes?', ['`AtmState` interface with insertCard/enterPin/withdraw/eject; Idle, CardInserted, Authenticated implement them and return the next state.']]],
  say: ['The ATM is a state machine: every action checks the session state first.', 'Notes are planned through a chain of slots, biggest first, and only committed if the full amount works.', 'Account debits are synchronized for joint accounts.'],
  facts: [['states', 'IDLE → CARD → AUTH'], ['notes', 'Chain of Responsibility'], ['commit', 'plan first, then debit'], ['PIN', '3 tries']],
  checklist: ['Draw the ATM classes and the note chain.', 'Write plan() recursively.', 'Explain why planning happens before debiting.'],
  drills: {
    mcq: [{ id: 'mcq-atm', title: 'Pattern for notes', ask: 'Which pattern fits "use 2000s, then pass the rest to 500s, then 100s"?', options: [['Chain of Responsibility', true, 'Each handler takes part and passes on the rest.'], ['Observer', false, 'Not notifications.'], ['Prototype', false, 'Not copying.'], ['Builder', false, 'Not construction.']] }],
    code: [{ id: 'code-atm', title: 'Greedy notes', ask: 'Count notes biggest first.', run: 'NotesDemo', expect: '{2000=2, 500=1, 100=3}', code: String.raw`import java.util.*;
class NotesDemo {
    public static void main(String[] args) {
        int amount = 4800;
        Map<Integer, Integer> out = new LinkedHashMap<>();
        for (int note : new int[]{2000, 500, 100}) {
            int use = amount [[/]] note;
            if (use > 0) out.put(note, use);
            amount -= [[use * note]];
        }
        System.out.println(out);
    }
}` }],
    order: [{ id: 'ord-atm', title: 'Withdraw', ask: 'Order the checks.', steps: ['Session is authenticated', 'Amount is a positive multiple of 100', 'Account balance covers the amount', 'Note chain can plan the amount', 'Debit the account, then dispense the notes'], extra: ['Dispense notes, then check the balance'] }],
    classes: { id: 'cls-atm', title: 'Design the ATM', reqs: ['Card, PIN, withdraw', 'Limited notes of several denominations', 'Joint accounts'], parts: [['Atm', 'must', 'Session entry point.'], ['AtmState', 'must', 'Valid actions per step.'], ['Account', 'must', 'PIN and balance.'], ['Bank', 'must', 'Find accounts.'], ['NoteDispenser chain', 'must', 'Plan notes.'], ['Transaction log', 'good', 'Audit and reversal.'], ['Boolean flags cardIn/pinOk scattered', 'no', 'Use one explicit state.'], ['Static global balance', 'no', 'Balance belongs to the account.']] }
  }
});
})();
