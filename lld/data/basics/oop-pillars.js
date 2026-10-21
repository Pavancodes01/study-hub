(function(){
var SRC = String.raw`import java.util.*;

interface Payable {                                    // abstraction: what, not how
    int monthlyCost();
}

abstract class Employee implements Payable {
    private final String name;                         // encapsulation: state is private
    protected Employee(String name) { this.name = name; }
    String name() { return name; }
}

class SalariedEmployee extends Employee {              // inheritance: reuse Employee
    private final int salary;
    SalariedEmployee(String name, int salary) { super(name); this.salary = salary; }
    public int monthlyCost() { return salary; }
}

class Contractor extends Employee {
    private final int hours, rate;
    Contractor(String name, int hours, int rate) { super(name); this.hours = hours; this.rate = rate; }
    public int monthlyCost() { return hours * rate; }
}

class Payroll {
    int total(List<Payable> items) {
        int sum = 0;
        for (Payable p : items) sum += p.monthlyCost();   // polymorphism: one call, many forms
        return sum;
    }
}

class OopDemo {
    public static void main(String[] args) {
        List<Payable> staff = List.of(new SalariedEmployee("Maya", 5000), new Contractor("Ravi", 80, 40));
        System.out.println(new Payroll().total(staff));
    }
}`;
var dg = { kind: 'class', w: 760, h: 400, classes: [
  { id: 'pay', name: 'Payroll', x: 24, y: 30, w: 230, fields: [], methods: ['+ total(items): int'] },
  { id: 'i', name: 'Payable', stereo: 'interface', x: 380, y: 30, w: 200, fields: [], methods: ['+ monthlyCost(): int'] },
  { id: 'e', name: 'Employee', stereo: 'abstract', x: 380, y: 170, w: 200, fields: ['- name: String'], methods: ['+ name(): String'] },
  { id: 's', name: 'SalariedEmployee', x: 200, y: 305, w: 200, fields: ['- salary: int'], methods: [] },
  { id: 'c', name: 'Contractor', x: 540, y: 305, w: 200, fields: ['- hours, rate: int'], methods: [] }
], rels: [
  { from: 'pay', to: 'i', type: 'dependency', label: 'uses' },
  { from: 'e', to: 'i', type: 'implements' },
  { from: 's', to: 'e', type: 'inherits' },
  { from: 'c', to: 'e', type: 'inherits' }
] };
registerBasic({
  slug: 'oop-pillars', order: 1, group: 'OOP', title: 'The four pillars of OOP',
  one: '==Encapsulation, abstraction, inheritance, polymorphism==: the four ideas every class design builds on.',
  picture: [
    'A car: you use the steering wheel and pedals (**abstraction**) without touching the engine internals, which are sealed under the hood (**encapsulation**). A sports car is still a car (**inheritance**), and "press the accelerator" works on any car, each in its own way (**polymorphism**).',
    'In interviews, show these through the design itself: private fields with methods that protect rules, interfaces for roles, inheritance only for true "is-a", and code that calls interfaces instead of checking types.'
  ],
  mainCode: SRC, mainFile: 'OopDemo.java', mainExpect: '8200',
  flows: [{ name: 'All four in one diagram', title: 'OOP pillars', diagram: dg, progressive: true, code: '@main', steps: [
    { title: 'Abstraction', add: ['i'], on: ['i'], text: '`Payable` says **what** can be done (`monthlyCost`) and hides **how**.', code: ['interface Payable {'] },
    { title: 'Encapsulation', add: ['e'], on: ['e'], rels: ['e-i'], text: '`name` is private and final. Outside code can read it through a method but never change it.', code: ['private final String name;', 'String name() { return name; }'] },
    { title: 'Inheritance', add: ['s', 'c'], on: ['s', 'c'], text: 'Both are employees and reuse `Employee`. Use inheritance only for a true "is-a" relationship.', code: ['class SalariedEmployee extends Employee {', 'class Contractor extends Employee {'] },
    { title: 'Polymorphism', add: ['pay'], on: ['pay'], rels: ['pay-i'], text: '`Payroll` calls `monthlyCost()` on each item; each class answers its own way. No `instanceof`.', code: ['for (Payable p : items) sum += p.monthlyCost();'] }
  ]}],
  sections: [
    { name: 'Encapsulation', text: ['Keep fields private and expose behaviour, not data. The class protects its own rules: a bank account rejects negative deposits itself, so no caller can break it.'], code: String.raw`class BankAccount {
    private int balance;                          // nobody can set this directly
    void deposit(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("amount must be positive");
        balance += amount;
    }
    int balance() { return balance; }
}` },
    { name: 'Abstraction', text: ['Show only what callers need. Interfaces and abstract classes describe a role (`Payable`, `PaymentProcessor`) and hide implementation details, so callers depend on the role.'] },
    { name: 'Inheritance', text: ['A subclass reuses and extends a superclass. Use it for real "is-a" with shared behaviour; otherwise prefer composition (see Composition vs inheritance). Subclasses must keep the parent\'s promises (see Liskov).'] },
    { name: 'Polymorphism', text: ['**Runtime** polymorphism: a variable of interface type calls the method of the actual object (method overriding). **Compile-time** polymorphism: method overloading (same name, different parameters). Runtime polymorphism is what removes type switches.'], code: String.raw`class Printer {
    String print(int x) { return "int " + x; }          // overloading: chosen at compile time
    String print(String s) { return "text " + s; }
}` }
  ],
  table: { title: 'The four pillars at a glance', lead: null, head: ['Pillar', 'In one line', 'Java tool'], rows: [
    ['Encapsulation', 'Hide state, guard rules', '`private` fields, methods that validate'],
    ['Abstraction', 'Expose what, hide how', '`interface`, `abstract class`'],
    ['Inheritance', 'Reuse through is-a', '`extends`, `super`'],
    ['Polymorphism', 'One call, many behaviours', 'overriding, interfaces, overloading']
  ]},
  pitfalls: [['Getters and setters for everything', 'A class with public setters for all fields is not encapsulated; rules leak to callers.'], ['Inheritance for code reuse only', 'Extending a class to reuse two methods couples you to all of it.'], ['Type checks instead of polymorphism', '`if (x instanceof A) … else if (x instanceof B)` means a method belongs on the type.'], ['Confusing abstraction with abstract classes', 'Abstraction is the idea; interfaces are usually the better tool.']],
  probe: [['Encapsulation vs abstraction?', ['Encapsulation hides the data and protects invariants inside a class. Abstraction hides complexity behind a simpler interface. A class can be encapsulated without an abstraction, and an interface is an abstraction without any data.']], ['Overloading vs overriding?', ['Overloading: same method name, different parameters, picked at compile time. Overriding: a subclass replaces a superclass method with the same signature, picked at runtime from the actual object.']], ['Why prefer interfaces over abstract classes?', ['A class can implement many interfaces but extend one class. Interfaces describe roles without forcing an inheritance tree; use an abstract class when you need shared state or code.']]],
  say: ['Each class keeps its fields private and enforces its own rules.', 'Callers depend on interfaces like `Payable`, so polymorphism replaces type checks.'],
  facts: [['private', 'encapsulation'], ['interface', 'abstraction'], ['extends', 'inheritance (is-a)'], ['override', 'runtime polymorphism']],
  checklist: ['Explain all four pillars with one example.', 'Explain overloading vs overriding.', 'Show an encapsulated class that enforces a rule.'],
  drills: {
    mcq: [{ id: 'mcq-enc', title: 'Broken rule', ask: 'Code elsewhere sets `account.balance = -500` directly. Which pillar is missing?', options: [['Encapsulation', true, 'The field should be private and changed only through validated methods.'], ['Polymorphism', false, 'Not about method dispatch.'], ['Inheritance', false, 'Not about subclassing.'], ['Abstraction', false, 'Close, but the specific problem is exposed state.']] },
      { id: 'mcq-poly', title: 'Runtime choice', ask: '`Payable p = new Contractor(...); p.monthlyCost();` Which method runs?', options: [['`Contractor.monthlyCost()`, chosen at runtime', true, 'Dynamic dispatch uses the actual object.'], ['`Payable.monthlyCost()` (it has no body)', false, 'Interfaces declare; the object implements.'], ['A compile error', false, 'This is valid Java.'], ['`Employee.monthlyCost()`', false, 'Employee does not implement it.']] }],
    code: [{ id: 'code-enc', title: 'Encapsulate a counter', ask: 'Protect the value and expose behaviour.', run: 'EncDemo', expect: '2', code: String.raw`class Counter {
    [[private]] int value;
    void increment() { [[value++]]; }
    int value() { return [[value]]; }
}
class EncDemo { public static void main(String[] a) { Counter c = new Counter(); c.increment(); c.increment(); System.out.println(c.value()); } }` }],
    order: [{ id: 'ord-oop', title: 'Design a small hierarchy', ask: 'Order the steps.', steps: ['Name the role callers need as an interface', 'Write classes that implement the role', 'Make their fields private', 'Share common code in an abstract base only if there is real is-a', 'Call the interface from client code'], extra: ['Make every field public for convenience'] }]
  }
});
})();
