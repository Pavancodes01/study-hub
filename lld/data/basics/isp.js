(function(){
var SRC = String.raw`interface Printer { String print(String doc); }
interface DocScanner { String scan(); }
interface Fax { String fax(String doc, String number); }

class BasicPrinter implements Printer {                     // only what it can do
    public String print(String doc) { return "printed " + doc; }
}

class OfficeMachine implements Printer, DocScanner, Fax {   // can do all three
    public String print(String doc) { return "printed " + doc; }
    public String scan() { return "scanned page"; }
    public String fax(String doc, String number) { return "faxed " + doc + " to " + number; }
}

class IspDemo {
    public static void main(String[] args) {
        Printer p = new BasicPrinter();
        System.out.println(p.print("cv.pdf"));
        OfficeMachine m = new OfficeMachine();
        System.out.println(m.scan());
        System.out.println(m.fax("form", "555-1234"));
    }
}`;
var dg = { kind: 'class', w: 760, h: 300, classes: [
  { id: 'p', name: 'Printer', stereo: 'interface', x: 30, y: 30, w: 200, fields: [], methods: ['+ print(doc)'] },
  { id: 's', name: 'DocScanner', stereo: 'interface', x: 280, y: 30, w: 200, fields: [], methods: ['+ scan()'] },
  { id: 'f', name: 'Fax', stereo: 'interface', x: 530, y: 30, w: 200, fields: [], methods: ['+ fax(doc, number)'] },
  { id: 'bp', name: 'BasicPrinter', x: 30, y: 200, w: 200, fields: [], methods: ['+ print(doc)'] },
  { id: 'om', name: 'OfficeMachine', x: 380, y: 200, w: 220, fields: [], methods: ['+ print, scan, fax'] }
], rels: [
  { from: 'bp', to: 'p', type: 'implements' },
  { from: 'om', to: 'p', type: 'implements' },
  { from: 'om', to: 's', type: 'implements' },
  { from: 'om', to: 'f', type: 'implements' }
] };
registerBasic({
  slug: 'isp', order: 5, group: 'SOLID', title: 'Interface Segregation principle',
  one: 'Clients should not be forced to depend on ==methods they do not use==. Prefer several small interfaces over one fat one.',
  picture: ['A TV remote with 60 buttons when you only need power, volume and channel. Worse: if the manufacturer changes the "teletext" button, your simple remote must be rebuilt too.', 'In Java, a fat interface forces every implementer to provide every method, often by throwing or doing nothing. Split it by client need: `Printer`, `DocScanner`, `Fax`.'],
  mainCode: SRC, mainFile: 'IspDemo.java', mainExpect: 'printed cv.pdf\nscanned page\nfaxed form to 555-1234',
  flows: [{ name: 'Small interfaces', title: 'Interfaces split by need', diagram: dg, progressive: true, code: '@main', steps: [
    { title: 'Three focused roles', add: ['p', 's', 'f'], on: ['p', 's', 'f'], text: 'Each interface serves one kind of client.', code: ['interface Printer', 'interface DocScanner', 'interface Fax'] },
    { title: 'Simple devices stay simple', add: ['bp'], on: ['bp'], rels: ['bp-p'], text: 'A basic printer implements only `Printer`. No fake `scan()`.', code: ['class BasicPrinter implements Printer {'] },
    { title: 'Rich devices combine roles', add: ['om'], on: ['om'], text: 'A class can implement several small interfaces.', code: ['class OfficeMachine implements Printer, DocScanner, Fax {'] }
  ]}],
  sections: [
    { name: 'The fat interface problem', text: ['Implementers fill unused methods with exceptions or empty bodies, clients see methods they should not call, and a change to one method recompiles and retests everyone.'],
      badLabel: 'Fat interface', bad: String.raw`interface Machine { String print(String d); String scan(); String fax(String d, String n); }
class BasicPrinter implements Machine {
    public String print(String d) { return "printed " + d; }
    public String scan() { throw new UnsupportedOperationException(); }       // forced to fake it
    public String fax(String d, String n) { throw new UnsupportedOperationException(); }
}`, goodLabel: 'Role interfaces', good: String.raw`interface Printer { String print(String d); }
interface DocScanner { String scan(); }
class BasicPrinter implements Printer {
    public String print(String d) { return "printed " + d; }
}` },
    { name: 'Split by client, not by implementer', text: ['Look at who calls the interface. If the print queue only prints and the archive only scans, they each deserve an interface with just their methods.'] }
  ],
  pitfalls: [['One interface per method everywhere', 'Group by real client needs; tiny interfaces for no reason add noise.'], ['Throwing in implementations', 'A sign the interface is too wide (and an LSP violation).'], ['Header interfaces', 'Copying every public method of a class into an interface rarely helps.']],
  probe: [['How does ISP relate to LSP?', ['Fat interfaces force implementers to fake methods, which breaks substitution. Splitting interfaces is often how you fix LSP violations.']], ['Example in the JDK?', ['`Collection` vs `List` vs `Deque`: callers ask for exactly the capability they need. `Readable`, `Closeable`, `AutoCloseable` are tiny role interfaces.']]],
  say: ['Each client gets a role interface with only what it calls, like `Printer` and `DocScanner`.'],
  facts: [['small', 'role interfaces'], ['smell', 'throwing in implementations'], ['by client', 'not by implementer']],
  checklist: ['Explain ISP with an example.', 'Split a fat interface.', 'Relate ISP to LSP.'],
  drills: {
    mcq: [{ id: 'mcq-isp', title: 'Robot worker', ask: 'An interface `Worker` has `work()` and `eat()`. `RobotWorker` implements `eat()` by throwing. Best fix?', options: [['Split into `Workable` and `Eatable` interfaces', true, 'Robots implement only `Workable`.'], ['Make `eat()` return null', false, 'Still a fake implementation.'], ['Add a `canEat()` flag', false, 'Callers must check flags everywhere.'], ['Delete RobotWorker', false, 'Avoids the design question.']] }],
    code: [{ id: 'code-isp', title: 'Role interfaces', ask: 'Let a reader implement only what it needs.', run: 'IspDrill', expect: 'reading', code: String.raw`interface Reader { String read(); }
interface Writer { void write(String s); }
class LogViewer [[implements Reader]] {
    public String read() { return [["reading"]]; }
}
class IspDrill { public static void main(String[] a) { [[Reader]] r = new LogViewer(); System.out.println(r.read()); } }` }],
    order: [{ id: 'ord-isp', title: 'Split an interface', ask: 'Order the steps.', steps: ['List who calls each method of the fat interface', 'Group methods by the client that uses them', 'Create one interface per group', 'Have classes implement only the interfaces they support', 'Change clients to depend on the smaller interface'], extra: ['Throw UnsupportedOperationException for unused methods'] }]
  }
});
})();
