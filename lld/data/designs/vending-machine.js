(function(){
var SRC = String.raw`import java.util.*;

record Product(String name, int price) {}

interface VendingState {
    void insert(VendingMachine m, int amount);
    void select(VendingMachine m, String code);
    void cancel(VendingMachine m);
}

class IdleState implements VendingState {
    public void insert(VendingMachine m, int amount) { m.addBalance(amount); m.setState(new HasMoneyState()); }
    public void select(VendingMachine m, String code) { System.out.println("insert money first"); }
    public void cancel(VendingMachine m) { System.out.println("nothing to cancel"); }
}

class HasMoneyState implements VendingState {
    public void insert(VendingMachine m, int amount) { m.addBalance(amount); }
    public void select(VendingMachine m, String code) {
        Product p = m.product(code);
        if (p == null || m.stock(code) == 0) { System.out.println("sold out: " + code); return; }
        if (m.balance() < p.price()) { System.out.println("need " + (p.price() - m.balance()) + " more"); return; }
        m.dispense(code);
        int change = m.takeBalance() - p.price();
        System.out.println("dispensed " + p.name() + ", change " + change);
        m.setState(new IdleState());
    }
    public void cancel(VendingMachine m) {
        System.out.println("refund " + m.takeBalance());
        m.setState(new IdleState());
    }
}

class VendingMachine {
    private final Map<String, Product> products = new HashMap<>();
    private final Map<String, Integer> stock = new HashMap<>();
    private VendingState state = new IdleState();
    private int balance;

    void load(String code, Product p, int qty) { products.put(code, p); stock.merge(code, qty, Integer::sum); }

    // public actions: delegate to the current state
    synchronized void insert(int amount) { state.insert(this, amount); }
    synchronized void select(String code) { state.select(this, code); }
    synchronized void cancel() { state.cancel(this); }

    // used by the states
    void setState(VendingState s) { state = s; }
    void addBalance(int amount) { balance += amount; }
    int balance() { return balance; }
    int takeBalance() { int b = balance; balance = 0; return b; }
    Product product(String code) { return products.get(code); }
    int stock(String code) { return stock.getOrDefault(code, 0); }
    void dispense(String code) { stock.merge(code, -1, Integer::sum); }
}

class VendingDemo {
    public static void main(String[] args) {
        VendingMachine vm = new VendingMachine();
        vm.load("A1", new Product("Chips", 30), 1);
        vm.load("B2", new Product("Soda", 45), 5);
        vm.select("A1");
        vm.insert(20); vm.select("A1");
        vm.insert(20); vm.select("A1");
        vm.insert(50); vm.select("A1");
        vm.cancel();
    }
}`;
var dg = { kind: 'class', w: 840, h: 400, classes: [
  { id: 'vm', name: 'VendingMachine', x: 20, y: 30, w: 270, fields: ['- products: Map<String, Product>', '- stock: Map<String, Integer>', '- state: VendingState', '- balance: int'], methods: ['+ insert(amount)', '+ select(code)', '+ cancel()'] },
  { id: 'st', name: 'VendingState', stereo: 'interface', x: 380, y: 30, w: 260, fields: [], methods: ['+ insert(m, amount)', '+ select(m, code)', '+ cancel(m)'] },
  { id: 'idle', name: 'IdleState', x: 340, y: 250, w: 160, fields: [], methods: [] },
  { id: 'money', name: 'HasMoneyState', x: 540, y: 250, w: 170, fields: [], methods: [] },
  { id: 'p', name: 'Product', stereo: 'record', x: 40, y: 280, w: 190, fields: ['name: String', 'price: int'], methods: [] }
], rels: [
  { from: 'vm', to: 'st', type: 'association', label: 'current' },
  { from: 'idle', to: 'st', type: 'implements' },
  { from: 'money', to: 'st', type: 'implements' },
  { from: 'vm', to: 'p', type: 'aggregation', fm: '1', tm: '*' }
] };
var seq = { kind: 'seq', w: 800, parts: [{ id: 'u', name: 'Customer' }, { id: 'vm', name: 'VendingMachine' }, { id: 'i', name: 'IdleState' }, { id: 'h', name: 'HasMoneyState' }], msgs: [
  { from: 'u', to: 'vm', label: 'insert(20)', text: 'The machine forwards every action to its current state.', code: ['synchronized void insert(int amount) { state.insert(this, amount); }'] },
  { from: 'vm', to: 'i', label: 'insert(vm, 20)', text: 'Idle: accept money and switch to HasMoney.', code: ['public void insert(VendingMachine m, int amount) { m.addBalance(amount); m.setState(new HasMoneyState()); }'] },
  { from: 'u', to: 'vm', label: 'select("A1")', text: 'Chips cost 30, balance is 20.', code: ['vm.insert(20); vm.select("A1");'] },
  { from: 'vm', to: 'h', label: 'select(vm, "A1")', text: 'Now the **HasMoney** state handles select: not enough, so it asks for 10 more and stays.', code: ['if (m.balance() < p.price()) { System.out.println("need " + (p.price() - m.balance()) + " more"); return; }'] },
  { from: 'u', to: 'vm', label: 'insert(20), select("A1")', text: 'Balance 40. Select again.', code: ['vm.insert(20); vm.select("A1");'] },
  { from: 'vm', to: 'h', label: 'select(vm, "A1")', text: 'Dispense, return change 10, go back to Idle.', code: ['m.dispense(code);', 'System.out.println("dispensed " + p.name() + ", change " + change);', 'm.setState(new IdleState());'] }
] };
registerDesign({
  slug: 'vending-machine', order: 3, title: 'Vending machine',
  one: 'The same button means different things depending on whether money is inside, so the machine is a textbook ==State pattern==: each state class handles every action its own way.',
  questions: ['Which coins/notes are accepted? Do we give change?', 'What happens on "sold out" or not enough money?', 'Can the customer cancel and get a refund?', 'Admin operations: restock, collect cash?', 'Single customer at a time?'],
  reqs: { func: ['Insert money', 'Select a product by code', 'Dispense product and change', 'Cancel and refund', 'Track stock per product'], nonfunc: ['Invalid actions give clear messages, never crash', 'New states (maintenance) addable without rewriting others', 'Actions are atomic per machine'], out: ['coin validation hardware', 'card payments', 'telemetry'] },
  entities: [['machine', '`VendingMachine`', 'Context: holds products, stock, balance and current state'], ['state', '`VendingState` + `IdleState`, `HasMoneyState`', 'Behaviour per situation, decides transitions'], ['product', '`Product` (record)', 'Name and price']],
  diagramNotes: ['The machine is the **context**: its public methods just delegate to the current `VendingState`. States call back into the machine to change balance, stock and the current state.', 'With this shape, adding `MaintenanceState` (all actions refused) is one new class.'],
  flowNotes: ['The sequence shows the same `select` call handled by different states depending on the balance.'],
  flows: [
    { name: 'Class diagram', title: 'Vending machine classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The context', add: ['vm', 'p'], on: ['vm'], text: 'Products, stock and balance live in the machine.', code: ['class VendingMachine {', 'record Product(String name, int price) {}'] },
      { title: 'The state interface', add: ['st'], on: ['st'], rels: ['vm-st'], text: 'One method per user action.', code: ['interface VendingState {', 'private VendingState state = new IdleState();'] },
      { title: 'Concrete states', add: ['idle', 'money'], on: ['idle', 'money'], text: 'Each state implements every action and decides the next state.', code: ['class IdleState implements VendingState {', 'class HasMoneyState implements VendingState {'] },
      { title: 'Delegate', on: ['vm'], text: 'No switch on a status field anywhere: the machine just forwards.', code: ['synchronized void select(String code) { state.select(this, code); }'] }
    ]},
    { name: 'Buy chips', title: 'Same action, different state', diagram: seq, code: '@main' }
  ],
  patterns: [['State', '`VendingState` and its classes', 'Behaviour depends on the machine\'s situation.'], ['Singleton (optional)', 'One machine object per device', 'Usually just one instance created at startup.'], ['Strategy (extension)', 'Change-making algorithm', 'Greedy coins vs limited coin inventory.']],
  code: { file: 'VendingDemo.java', src: SRC, expect: 'insert money first\nneed 10 more\ndispensed Chips, change 10\nsold out: A1\nrefund 50' },
  concurrency: [['Two button presses at once', 'Public actions are synchronized, so one action completes before the next.'], ['Remote restock while selling', 'Restock goes through a synchronized method on the same machine.']],
  extensions: [['Maintenance mode', 'Add `MaintenanceState` that refuses customer actions.'], ['Limited coins for change', 'A `ChangeMaker` strategy that checks coin inventory before dispensing.'], ['Card payments', '`PaymentMethod` interface; HasMoney becomes Paid regardless of method.']],
  probe: [['Why the State pattern instead of an enum and switch?', ['Every action would need a switch on status. With State classes each situation is one class, transitions live with their state, and new states do not touch old code.']], ['What if a product is sold out while money is inside?', ['HasMoney keeps the money and reports sold out; the user can choose another product or cancel for a refund.']], ['How do you avoid stuck money?', ['Every state supports cancel/refund, and dispense plus change is done in one synchronized action.']]],
  say: ['The machine delegates every action to its current state object.', 'Idle and HasMoney decide the transitions themselves.', 'Actions are synchronized so money and stock never get out of step.'],
  facts: [['context', 'VendingMachine'], ['states', 'Idle, HasMoney'], ['transitions', 'decided by states'], ['money', 'int, never double']],
  checklist: ['Draw the state classes and the context.', 'Implement select with all edge cases.', 'Add a new state without touching the others.'],
  drills: {
    mcq: [{ id: 'mcq-vm', title: 'Pattern choice', ask: 'Why is State a good fit for a vending machine?', options: [['The same actions behave differently depending on whether money is inside', true, 'Exactly the problem State solves.'], ['There is only one machine', false, 'That is Singleton territory.'], ['Products form a tree', false, 'That would be Composite.'], ['It needs undo', false, 'That would be Command.']] }],
    code: [{ id: 'code-vm', title: 'Refund in HasMoney', ask: 'Complete the cancel action.', run: 'RefundDemo', expect: 'refund 40\nIdle', code: String.raw`class Machine {
    int balance = 40; String state = "HasMoney";
    int takeBalance() { int b = balance; [[balance = 0]]; return b; }
    void cancel() {
        System.out.println("refund " + [[takeBalance()]]);
        state = [["Idle"]];
    }
}
class RefundDemo { public static void main(String[] a) { Machine m = new Machine(); m.cancel(); System.out.println(m.state); } }` }],
    order: [{ id: 'ord-vm', title: 'Buying a product', ask: 'Order what happens in HasMoney.select.', steps: ['Look up the product by code', 'If sold out, report it and stay', 'If balance is too low, report the shortfall and stay', 'Dispense the product and reduce stock', 'Return change and switch to Idle'], extra: ['Return change before checking stock'] }],
    classes: { id: 'cls-vm', title: 'Design the vending machine', reqs: ['Insert money, select, cancel', 'Different behaviour with and without money', 'Track stock'], parts: [['VendingMachine', 'must', 'Context holding state and inventory.'], ['VendingState', 'must', 'Interface for all actions.'], ['IdleState', 'must', 'No money inside.'], ['HasMoneyState', 'must', 'Money inside.'], ['Product', 'must', 'Name and price.'], ['MaintenanceState', 'good', 'Nice extension.'], ['ChipsMachine extends VendingMachine', 'no', 'Products are data, not subclasses.'], ['Global static balance', 'no', 'Belongs to the machine instance.']] }
  }
});
})();
