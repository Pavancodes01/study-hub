(function(){
var SRC = String.raw`import java.util.*;

class Invoice {                                          // job: invoice math
    private final List<Integer> lines = new ArrayList<>();
    void add(int amount) { lines.add(amount); }
    int total() { return lines.stream().mapToInt(Integer::intValue).sum(); }
}

class InvoicePrinter {                                   // job: formatting
    String print(Invoice invoice) { return "TOTAL: " + invoice.total(); }
}

class InvoiceRepository {                                // job: storage
    private final Map<Integer, Invoice> store = new HashMap<>();
    private int nextId = 1;
    int save(Invoice invoice) { store.put(nextId, invoice); return nextId++; }
}

class SrpDemo {
    public static void main(String[] args) {
        Invoice inv = new Invoice();
        inv.add(100);
        inv.add(250);
        System.out.println(new InvoicePrinter().print(inv));
        System.out.println("saved as #" + new InvoiceRepository().save(inv));
    }
}`;
var dg = { kind: 'class', w: 760, h: 260, classes: [
  { id: 'inv', name: 'Invoice', x: 270, y: 30, w: 220, fields: ['- lines: List<Integer>'], methods: ['+ add(amount)', '+ total(): int'] },
  { id: 'pr', name: 'InvoicePrinter', x: 24, y: 160, w: 210, fields: [], methods: ['+ print(i): String'] },
  { id: 'repo', name: 'InvoiceRepository', x: 520, y: 160, w: 220, fields: ['- store: Map<Integer,Invoice>'], methods: ['+ save(i): int'] }
], rels: [
  { from: 'pr', to: 'inv', type: 'dependency' },
  { from: 'repo', to: 'inv', type: 'aggregation', fm: '1', tm: '*' }
] };
registerBasic({
  slug: 'srp', order: 2, group: 'SOLID', title: 'Single Responsibility principle',
  one: 'A class should have ==one reason to change==: one job, owned by one part of the business.',
  picture: ['A restaurant does not ask the chef to also do the accounting and wash the windows. If the tax rules change, only the accountant\'s work changes, and the kitchen is untouched.', 'In code, "reason to change" means "who asks for changes". Pricing rules, PDF layout and database schema are different reasons, so they belong in different classes.'],
  mainCode: SRC, mainFile: 'SrpDemo.java', mainExpect: 'TOTAL: 350\nsaved as #1',
  flows: [{ name: 'Split by job', title: 'Single responsibility', diagram: dg, progressive: true, code: '@main', steps: [
    { title: 'The core', add: ['inv'], on: ['inv'], text: '`Invoice` only knows invoice rules: lines and totals.', code: ['class Invoice {'] },
    { title: 'Formatting', add: ['pr'], on: ['pr'], text: 'Changing the print layout touches only `InvoicePrinter`.', code: ['class InvoicePrinter {'] },
    { title: 'Storage', add: ['repo'], on: ['repo'], text: 'Moving from a map to a database touches only `InvoiceRepository`.', code: ['class InvoiceRepository {'] }
  ]}],
  sections: [
    { name: 'Spotting a violation', text: ['Names with "And" or "Manager", methods that mix calculation, formatting, I/O and email, and classes that change in every pull request are signs. Ask: "Who would ask me to change this?" More than one answer means more than one responsibility.'],
      badLabel: 'Three jobs in one class', bad: String.raw`class Invoice {
    int total() { return 350; }
    String toPdf() { return "PDF"; }                    // layout team
    void saveToDb() { /* SQL here */ }                 // database team
    void emailCustomer() { /* SMTP here */ }           // messaging team
}`, goodLabel: 'One job each', good: String.raw`class Invoice { int total() { return 350; } }
class InvoicePdf { String render(Invoice i) { return "PDF " + i.total(); } }
class InvoiceRepository { void save(Invoice i) { } }
class InvoiceMailer { void send(Invoice i) { } }` },
    { name: 'How small is too small?', text: ['SRP is not "one method per class". Group what changes together. A class with five methods about one concept is fine; splitting it into five classes adds noise.'] }
  ],
  pitfalls: [['Over-splitting', 'Ten tiny classes for one concept make code harder to follow.'], ['God classes', '`OrderManager` with 3,000 lines doing everything.'], ['Mixing I/O and logic', 'Business rules inside controllers or DAOs are hard to test.']],
  probe: [['How do you decide responsibilities?', ['By reasons to change: different stakeholders or different kinds of change (rules, presentation, persistence, integration) go in different classes.']], ['Does SRP mean one method per class?', ['No. It means one cohesive purpose. Many related methods are fine.']]],
  say: ['Pricing, persistence and notifications change for different reasons, so they live in separate classes.'],
  facts: [['one reason', 'to change'], ['smell', '"Manager", "And", huge classes'], ['not', 'one method per class']],
  checklist: ['State SRP using "reason to change".', 'Split a class with three jobs.', 'Explain when splitting goes too far.'],
  drills: {
    mcq: [{ id: 'mcq-srp', title: 'Spot it', ask: 'Which class violates SRP?', options: [['`UserService` that validates input, hashes passwords, writes SQL and sends welcome emails', true, 'Four reasons to change in one class.'], ['`PasswordHasher` with `hash` and `verify`', false, 'One cohesive job.'], ['`Money` with add, subtract and compare', false, 'One concept.'], ['`UserRepository` with save and findById', false, 'One job: persistence.']] }],
    code: [{ id: 'code-srp', title: 'Move formatting out', ask: 'Put formatting in its own class.', run: 'ReportDemo', expect: 'Sales: 42', code: String.raw`class Report { int sales() { return 42; } }
class [[ReportFormatter]] {
    String format(Report r) { return "Sales: " + [[r.sales()]]; }
}
class ReportDemo { public static void main(String[] a) { System.out.println(new ReportFormatter().format([[new Report()]])); } }` }],
    order: [{ id: 'ord-srp', title: 'Split a god class', ask: 'Order the steps.', steps: ['List what the class does', 'Group the methods by reason to change', 'Move each group into its own class', 'Have the original class delegate or be removed', 'Write focused tests for each new class'], extra: ['Add more methods to the god class'] }]
  }
});
})();
