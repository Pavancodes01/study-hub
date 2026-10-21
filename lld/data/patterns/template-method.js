(function(){
var SRC = String.raw`import java.util.*;

abstract class ReportGenerator {
    final String generate(List<String> rows) {          // the template: fixed steps, cannot be overridden
        StringBuilder sb = new StringBuilder(header());
        for (String r : rows) sb.append(formatRow(r));
        sb.append(footer());
        return sb.toString();
    }
    abstract String header();                           // steps every subclass must supply
    abstract String formatRow(String row);
    String footer() { return ""; }                      // hook: optional step with a default
}

class CsvReport extends ReportGenerator {
    String header() { return "name"; }
    String formatRow(String row) { return "," + row; }
}

class HtmlReport extends ReportGenerator {
    String header() { return "<ul>"; }
    String formatRow(String row) { return "<li>" + row + "</li>"; }
    String footer() { return "</ul>"; }               // overrides the hook
}

class TemplateMethodDemo {
    public static void main(String[] args) {
        List<String> rows = List.of("Maya", "Ravi");
        System.out.println(new CsvReport().generate(rows));
        System.out.println(new HtmlReport().generate(rows));
    }
}`;
var dg = { kind: 'class', w: 760, h: 350, classes: [
  { id: 'base', name: 'ReportGenerator', stereo: 'abstract', x: 230, y: 20, w: 280, fields: [], methods: ['+ final generate(rows): String', '# abstract header(): String', '# abstract formatRow(row): String', '# footer(): String  (hook)'] },
  { id: 'csv', name: 'CsvReport', x: 90, y: 220, w: 220, fields: [], methods: ['# header()', '# formatRow(row)'] },
  { id: 'html', name: 'HtmlReport', x: 430, y: 220, w: 220, fields: [], methods: ['# header()', '# formatRow(row)', '# footer()'] }
], rels: [
  { from: 'csv', to: 'base', type: 'inherits' },
  { from: 'html', to: 'base', type: 'inherits' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'c', name: 'Client' }, { id: 'h', name: 'HtmlReport' }], msgs: [
  { from: 'c', to: 'h', label: 'generate(rows)', text: 'The client calls the template method, which is defined in the base class and `final`.', code: ['final String generate(List<String> rows) {'] },
  { from: 'h', to: 'h', label: 'header()', text: 'Step 1 runs the subclass version.', code: ['StringBuilder sb = new StringBuilder(header());', 'String header() { return "<ul>"; }'] },
  { from: 'h', to: 'h', label: 'formatRow("Maya")', text: 'Step 2 for each row.', code: ['for (String r : rows) sb.append(formatRow(r));', 'String formatRow(String row) { return "<li>" + row + "</li>"; }'] },
  { from: 'h', to: 'h', label: 'footer()', text: 'Step 3 is a hook: HtmlReport overrides it, CsvReport keeps the default.', code: ['sb.append(footer());', 'String footer() { return "</ul>"; }'] },
  { from: 'h', to: 'c', label: '"<ul>…</ul>"', ret: true, text: 'The order of steps was decided once, in the base class.', code: ['return sb.toString();'] }
] };
registerPattern({
  slug: 'template-method', order: 15, kind: 'Behavioral', title: 'Template Method',
  one: 'A base class fixes the ==order of the steps== of an algorithm; subclasses fill in individual steps.',
  analogy: ['Every franchise of a burger chain follows the same steps: bun, sauce, patty, toppings, wrap. Each branch may use a local sauce, but nobody may skip or reorder steps.', 'The base class has a `final` template method that calls abstract steps (must override) and hooks (may override). Subclasses never control the overall flow.'],
  use: ['several classes share the same algorithm with small differences', 'you want to enforce an order (validate → process → save)', 'frameworks that call user code at fixed points'],
  avoid: ['variants change at runtime (use Strategy with composition)', 'deep inheritance trees; prefer composition when steps vary independently'],
  problem: { text: ['Two report classes duplicate the loop and the header/footer structure. A fix to one is forgotten in the other.'], code: String.raw`import java.util.*;
class CsvReport {
    String generate(List<String> rows) { StringBuilder sb = new StringBuilder("name"); for (String r : rows) sb.append(",").append(r); return sb.toString(); }
}
class HtmlReport {
    String generate(List<String> rows) { StringBuilder sb = new StringBuilder("<ul>"); for (String r : rows) sb.append("<li>").append(r).append("</li>"); return sb.append("</ul>").toString(); }
}` },
  solution: { text: ['Move the shared skeleton into `ReportGenerator.generate` (final). Subclasses implement only `header` and `formatRow`, and optionally override the `footer` hook.'], code: SRC, file: 'TemplateMethodDemo.java', expect: 'name,Maya,Ravi\n<ul><li>Maya</li><li>Ravi</li></ul>' },
  flows: [
    { name: 'Class diagram', title: 'Template Method', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The skeleton', add: ['base'], on: ['base'], text: '`generate` is `final`: subclasses cannot change the order. Abstract steps must be filled in; `footer` is an optional hook.', code: ['final String generate(List<String> rows) {', 'abstract String header();', 'String footer() { return ""; }'] },
      { title: 'Fill in the steps', add: ['csv', 'html'], on: ['csv', 'html'], text: 'Each subclass supplies only what differs.', code: ['class CsvReport extends ReportGenerator {', 'class HtmlReport extends ReportGenerator {'] },
      { title: 'Hooks', on: ['html'], text: 'HtmlReport overrides the optional footer; CsvReport keeps the empty default.', code: ['String footer() { return "</ul>"; }'] }
    ]},
    { name: 'generate()', title: 'The base class drives the steps', diagram: seq, code: '@main' }
  ],
  jdk: [['`java.io.InputStream.read(byte[], int, int)`', 'Implemented on top of the abstract `read()` that subclasses provide.'], ['`AbstractList`', 'You implement `get` and `size`; it provides iterator, contains, equals and more.'], ['`HttpServlet.service()`', 'Calls `doGet`/`doPost` that you override.'], ['JUnit lifecycle', '`@BeforeEach` / test / `@AfterEach` order fixed by the framework.']],
  related: [['Strategy', 'Varies the whole algorithm by composition; Template Method varies steps by inheritance.'], ['Factory Method', 'A template method whose varying step creates an object.'], ['Hollywood principle', '"Don\'t call us, we\'ll call you": the base class calls your code.']],
  pitfalls: [['Template not final', 'Subclasses override the template and break the order.'], ['Too many abstract steps', 'Subclasses must implement steps they do not care about; use hooks with defaults.'], ['Inheritance lock-in', 'A class can extend only one base; if variants combine, prefer strategies.']],
  probe: [['Template Method vs Strategy?', ['Template Method: inheritance, the base class owns the flow, varied steps are overridden. Strategy: composition, the context delegates a whole algorithm to a swappable object. Prefer Strategy when you need to change behaviour at runtime or mix variations.']], ['What is a hook?', ['A step with a default (often empty) implementation that subclasses may override to plug in extra behaviour.']]],
  say: ['All importers follow read → validate → save, so the base class has a final `importFile` and subclasses implement `parse`.'],
  facts: [['final', 'template method'], ['abstract', 'required steps'], ['hook', 'optional step']],
  checklist: ['Write a template method with abstract steps and a hook.', 'Explain why the template is final.', 'Explain Template Method vs Strategy.'],
  drills: {
    mcq: [{ id: 'mcq-tm', kind: 'Which pattern?', title: 'Data importers', ask: 'CSV, JSON and XML importers all do: open file → parse → validate → save, and only parse differs. Pattern?', options: [['Template Method', true, 'Fixed order of steps, one step varies by subclass.'], ['Observer', false, 'Unrelated.'], ['Composite', false, 'Not a tree.'], ['Adapter', false, 'Not converting interfaces.']] }],
    code: [{ id: 'code-tm', title: 'Make a beverage', ask: 'Complete the template.', run: 'TeaDemo', expect: 'boil water, steep tea, pour', code: String.raw`abstract class Beverage {
    [[final]] String make() { return "boil water, " + [[brew()]] + ", pour"; }
    abstract String brew();
}
class Tea [[extends Beverage]] {
    String brew() { return "steep tea"; }
}
class TeaDemo { public static void main(String[] a) { System.out.println(new Tea().make()); } }` }],
    order: [{ id: 'ord-tm', title: 'Extract a template', ask: 'Order the refactoring.', steps: ['Find classes with the same algorithm structure', 'Create an abstract base class', 'Move the shared algorithm into a final method in the base', 'Turn the differing parts into abstract methods or hooks', 'Make each class extend the base and implement only its steps'], extra: ['Let subclasses override the final method'] }]
  }
});
})();
