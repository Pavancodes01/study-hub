(function(){
var SRC = String.raw`import java.util.*;

interface OrderRepository {                              // the abstraction (owned by the business side)
    void save(String orderId);
    List<String> all();
}

class InMemoryOrderRepository implements OrderRepository {   // a detail: could be SQL, Mongo, a fake
    private final List<String> orders = new ArrayList<>();
    public void save(String orderId) { orders.add(orderId); }
    public List<String> all() { return List.copyOf(orders); }
}

class OrderService {                                     // high-level policy
    private final OrderRepository repo;                  // depends on the abstraction
    OrderService(OrderRepository repo) { this.repo = repo; }   // injected from outside
    void place(String id) { repo.save(id); }
    int count() { return repo.all().size(); }
}

class DipDemo {
    public static void main(String[] args) {
        OrderService service = new OrderService(new InMemoryOrderRepository());
        service.place("A1");
        service.place("A2");
        System.out.println("orders: " + service.count());
    }
}`;
var dg = { kind: 'class', w: 760, h: 280, classes: [
  { id: 's', name: 'OrderService', x: 24, y: 40, w: 230, fields: ['- repo: OrderRepository'], methods: ['+ place(id)', '+ count(): int'] },
  { id: 'r', name: 'OrderRepository', stereo: 'interface', x: 380, y: 30, w: 220, fields: [], methods: ['+ save(orderId)', '+ all(): List<String>'] },
  { id: 'm', name: 'InMemoryOrderRepository', x: 230, y: 190, w: 250, fields: [], methods: [] },
  { id: 'q', name: 'SqlOrderRepository', x: 500, y: 190, w: 230, fields: [], methods: [] }
], rels: [
  { from: 's', to: 'r', type: 'association' },
  { from: 'm', to: 'r', type: 'implements' },
  { from: 'q', to: 'r', type: 'implements' }
] };
registerBasic({
  slug: 'dip', order: 6, group: 'SOLID', title: 'Dependency Inversion principle',
  one: 'High-level business code should depend on ==abstractions, not on concrete details==; details plug into those abstractions.',
  picture: ['A lamp does not have wires soldered into one specific power station. It has a plug, and any socket that follows the standard can power it. You can change your electricity provider without rewiring the lamp.', 'In code, `OrderService` (policy) depends on an `OrderRepository` interface. The database class (detail) implements it and is **passed in** (dependency injection). Swapping MySQL for an in-memory fake in tests needs no change to `OrderService`.'],
  mainCode: SRC, mainFile: 'DipDemo.java', mainExpect: 'orders: 2',
  flows: [{ name: 'Inverted dependency', title: 'Policy depends on an abstraction', diagram: dg, progressive: true, code: '@main', steps: [
    { title: 'High-level policy', add: ['s'], on: ['s'], text: '`OrderService` contains business rules.', code: ['class OrderService {'] },
    { title: 'The abstraction it owns', add: ['r'], on: ['r'], rels: ['s-r'], text: 'It depends only on `OrderRepository`, an interface shaped by what the business needs.', code: ['interface OrderRepository {', 'private final OrderRepository repo;'] },
    { title: 'Details plug in', add: ['m', 'q'], on: ['m', 'q'], text: 'Storage classes depend on the interface (arrows point up to it). That is the "inversion".', code: ['class InMemoryOrderRepository implements OrderRepository {'] },
    { title: 'Injected from outside', on: ['s'], text: 'The concrete repository is passed into the constructor, so tests can pass a fake.', code: ['OrderService(OrderRepository repo) { this.repo = repo; }', 'new OrderService(new InMemoryOrderRepository())'] }
  ]}],
  sections: [
    { name: 'Before and after', text: ['When a service creates its own database class with `new`, you cannot test it without a database or switch storage without editing it.'],
      badLabel: 'Hard-wired detail', bad: String.raw`class MySqlOrderRepository { void save(String id) { /* JDBC */ } }
class OrderService {
    private final MySqlOrderRepository repo = new MySqlOrderRepository();   // stuck with MySQL
    void place(String id) { repo.save(id); }
}`, goodLabel: 'Depends on an interface', good: String.raw`interface OrderRepository { void save(String id); }
class OrderService {
    private final OrderRepository repo;
    OrderService(OrderRepository repo) { this.repo = repo; }               // injected
    void place(String id) { repo.save(id); }
}` },
    { name: 'DIP vs dependency injection', text: ['**DIP** is the principle (depend on abstractions). **Dependency injection** is a technique (pass dependencies in, usually through the constructor). **IoC containers** like Spring automate the wiring.'] }
  ],
  pitfalls: [['`new` inside business classes', 'Creating concrete collaborators internally defeats DIP.'], ['Interfaces shaped by the database', 'The abstraction should speak business language (`save(order)`), not SQL.'], ['Service locators everywhere', 'Fetching dependencies from a global registry hides them; prefer constructor injection.']],
  probe: [['What is "inverted" in DIP?', ['Normally high-level code depends on low-level code. With DIP both depend on an abstraction owned by the high-level side, so the low-level detail points towards the policy.']], ['Why constructor injection?', ['Dependencies are explicit, required, and final; the object is fully usable after construction and easy to build in tests.']]],
  say: ['`OrderService` depends on an `OrderRepository` interface injected through the constructor, so tests use an in-memory fake.'],
  facts: [['policy', 'depends on interface'], ['detail', 'implements interface'], ['DI', 'pass deps in'], ['test', 'inject fakes']],
  checklist: ['Explain DIP and the "inversion".', 'Refactor a class that news up its database.', 'Explain DIP vs DI vs IoC container.'],
  drills: {
    mcq: [{ id: 'mcq-dip', title: 'Untestable service', ask: '`NotificationService` creates `new SmtpClient()` internally and tests send real emails. Fix?', options: [['Depend on an `EmailSender` interface passed into the constructor', true, 'Tests inject a fake sender.'], ['Make SmtpClient a singleton', false, 'Still concrete and global.'], ['Mock the network', false, 'Treats the symptom.'], ['Delete the tests', false, 'No.']] }],
    code: [{ id: 'code-dip', title: 'Inject the dependency', ask: 'Pass the clock in.', run: 'ClockDemo', expect: 'morning', code: String.raw`interface Clock { int hour(); }
class Greeter {
    private final [[Clock]] clock;
    Greeter(Clock clock) { [[this.clock = clock]]; }
    String greet() { return clock.hour() < 12 ? "morning" : "evening"; }
}
class ClockDemo { public static void main(String[] a) { System.out.println(new Greeter([[() -> 9]]).greet()); } }` }],
    order: [{ id: 'ord-dip', title: 'Apply DIP', ask: 'Order the steps.', steps: ['Find where a service creates a concrete collaborator', 'Define an interface for what the service needs', 'Make the collaborator implement it', 'Take the interface as a constructor parameter', 'Create and pass the concrete class at startup (or in tests a fake)'], extra: ['Call new MySqlRepository() inside the service'] }]
  }
});
})();
