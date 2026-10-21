(function(){
var SRC = String.raw`interface Button { String render(); }
interface Checkbox { String render(); }

class LightButton implements Button { public String render() { return "[light button]"; } }
class DarkButton implements Button { public String render() { return "[dark button]"; } }
class LightCheckbox implements Checkbox { public String render() { return "[light checkbox]"; } }
class DarkCheckbox implements Checkbox { public String render() { return "[dark checkbox]"; } }

interface UiFactory {                         // one factory = one matching family
    Button createButton();
    Checkbox createCheckbox();
}
class LightUiFactory implements UiFactory {
    public Button createButton() { return new LightButton(); }
    public Checkbox createCheckbox() { return new LightCheckbox(); }
}
class DarkUiFactory implements UiFactory {
    public Button createButton() { return new DarkButton(); }
    public Checkbox createCheckbox() { return new DarkCheckbox(); }
}

class SettingsScreen {
    private final UiFactory ui;               // the screen never names a concrete widget
    SettingsScreen(UiFactory ui) { this.ui = ui; }
    String draw() { return ui.createButton().render() + " " + ui.createCheckbox().render(); }
}

class AbstractFactoryDemo {
    public static void main(String[] args) {
        System.out.println(new SettingsScreen(new LightUiFactory()).draw());
        System.out.println(new SettingsScreen(new DarkUiFactory()).draw());
    }
}`;
var dg = { kind: 'class', w: 840, h: 400, classes: [
  { id: 'scr', name: 'SettingsScreen', x: 20, y: 30, w: 200, fields: ['- ui: UiFactory'], methods: ['+ draw(): String'] },
  { id: 'f', name: 'UiFactory', stereo: 'interface', x: 300, y: 30, w: 230, fields: [], methods: ['+ createButton(): Button', '+ createCheckbox(): Checkbox'] },
  { id: 'lf', name: 'LightUiFactory', x: 250, y: 200, w: 160, fields: [], methods: [] },
  { id: 'df', name: 'DarkUiFactory', x: 430, y: 200, w: 160, fields: [], methods: [] },
  { id: 'b', name: 'Button', stereo: 'interface', x: 640, y: 30, w: 180, fields: [], methods: ['+ render(): String'] },
  { id: 'c', name: 'Checkbox', stereo: 'interface', x: 640, y: 200, w: 180, fields: [], methods: ['+ render(): String'] },
  { id: 'lb', name: 'LightButton', x: 250, y: 320, w: 160, fields: [], methods: [] },
  { id: 'db', name: 'DarkButton', x: 430, y: 320, w: 160, fields: [], methods: [] },
  { id: 'dc', name: 'DarkCheckbox', x: 640, y: 320, w: 180, fields: [], methods: [] }
], rels: [
  { from: 'scr', to: 'f', type: 'association' },
  { from: 'lf', to: 'f', type: 'implements' },
  { from: 'df', to: 'f', type: 'implements' },
  { from: 'f', to: 'b', type: 'dependency', label: 'creates' },
  { from: 'lf', to: 'lb', type: 'dependency' },
  { from: 'df', to: 'db', type: 'dependency' },
  { from: 'dc', to: 'c', type: 'implements' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 's', name: 'SettingsScreen' }, { id: 'f', name: 'DarkUiFactory' }, { id: 'b', name: 'DarkButton' }, { id: 'c', name: 'DarkCheckbox' }], msgs: [
  { from: 's', to: 'f', label: 'createButton()', text: 'The screen asks its factory for a button, not for a dark button.', code: ['String draw() { return ui.createButton().render()'] },
  { from: 'f', to: 'b', label: 'new', text: 'The dark factory creates the dark one.', code: ['public Button createButton() { return new DarkButton(); }'] },
  { from: 's', to: 'f', label: 'createCheckbox()', text: 'Same factory, so the checkbox automatically matches.', code: ['ui.createCheckbox().render()'] },
  { from: 'f', to: 'c', label: 'new', text: 'You can never mix a light button with a dark checkbox by accident.', code: ['public Checkbox createCheckbox() { return new DarkCheckbox(); }'] }
] };
registerPattern({
  slug: 'abstract-factory', order: 3, kind: 'Creational', title: 'Abstract Factory',
  one: 'One factory object creates a ==whole family of matching products==, so clients get consistent sets without naming concrete classes.',
  analogy: ['Furniture stores sell matching sets: Victorian chair, Victorian sofa, Victorian table. Pick the store once and everything you buy matches.', 'The "store" is a factory interface with one create method per product (`createButton`, `createCheckbox`). Each concrete factory (`LightUiFactory`, `DarkUiFactory`) creates one consistent family.'],
  use: ['products must be used together and must match (theme widgets, DB driver objects, cloud provider clients)', 'you switch the whole family at once by config', 'clients must not depend on concrete classes'],
  avoid: ['only one product type (use Factory Method)', 'families change shape often (adding a product type edits every factory)'],
  problem: { text: ['Screens create widgets with `if (dark) new DarkButton() else new LightButton()` everywhere, and someone eventually mixes a dark button with a light checkbox.'], code: String.raw`class SettingsScreen {
    String draw(boolean dark) {
        String b = dark ? "[dark button]" : "[light button]";
        String c = dark ? "[dark checkbox]" : "[light checkbox]";   // repeated theme checks
        return b + " " + c;
    }
}` },
  solution: { text: ['Define a factory interface with a create method per product. Each implementation produces one family. Pass the chosen factory to the screen once.'], code: SRC, file: 'AbstractFactoryDemo.java', expect: '[light button] [light checkbox]\n[dark button] [dark checkbox]' },
  flows: [
    { name: 'Class diagram', title: 'Abstract Factory', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Client and factory interface', add: ['scr', 'f'], on: ['scr', 'f'], text: 'The screen depends only on `UiFactory`.', code: ['interface UiFactory {', 'private final UiFactory ui;'] },
      { title: 'Product interfaces', add: ['b', 'c'], on: ['b', 'c'], text: 'One interface per kind of product in the family.', code: ['interface Button', 'interface Checkbox'] },
      { title: 'One factory per family', add: ['lf', 'df'], on: ['lf', 'df'], text: 'Light and dark factories each implement every create method.', code: ['class LightUiFactory implements UiFactory {', 'class DarkUiFactory implements UiFactory {'] },
      { title: 'Concrete products', add: ['lb', 'db', 'dc'], on: ['db', 'dc'], text: 'The dark factory only ever returns dark products, so families never mix. (Light checkbox omitted from the drawing to save space.)', code: ['public Button createButton() { return new DarkButton(); }', 'public Checkbox createCheckbox() { return new DarkCheckbox(); }'] }
    ]},
    { name: 'Draw a screen', title: 'One factory, matching products', diagram: seq, code: '@main' }
  ],
  jdk: [['`javax.xml.parsers.DocumentBuilderFactory`', 'Picks an XML parser implementation family.'], ['JDBC `Connection`', 'One driver connection creates matching `Statement`, `PreparedStatement` and so on.'], ['Cloud SDKs', 'A provider client factory creates storage, queue and compute clients for one cloud.']],
  related: [['Factory Method', 'Creates one product; Abstract Factory groups several.'], ['Builder', 'Builds one complex object step by step; Abstract Factory returns finished products immediately.'], ['Singleton', 'Concrete factories are often singletons.']],
  pitfalls: [['Adding a product type', 'Every factory must change. Expect this cost before choosing the pattern.'], ['Factory for one product', 'Overkill: use a factory method.'], ['Leaking concrete classes', 'If clients cast to `DarkButton`, the abstraction is broken.']],
  probe: [['Factory Method vs Abstract Factory?', ['Factory Method: one creation method, varied by subclass or parameter. Abstract Factory: an object with several creation methods that produce a matching family.']], ['What is the cost of this pattern?', ['Adding a new product type (e.g. `Slider`) means changing the interface and every factory. Adding a new family (high-contrast theme) is cheap: one new factory.']]],
  say: ['Widgets must match the theme, so the screen gets a `UiFactory` and never creates widgets directly.', 'Adding a high-contrast theme is one new factory class.'],
  facts: [['factory', 'one create method per product'], ['family', 'products that must match'], ['cheap', 'add a family'], ['costly', 'add a product type']],
  checklist: ['Draw the abstract factory structure.', 'Explain the difference from Factory Method.', 'Say what is cheap and what is costly to add.'],
  drills: {
    mcq: [{ id: 'mcq-cloud', kind: 'Which pattern?', title: 'Multi-cloud', ask: 'Your app must create storage, queue and DNS clients for either AWS or GCP, never mixing them. Pattern?', options: [['Abstract Factory: `CloudFactory` with AWS and GCP implementations', true, 'One factory creates a consistent family of clients.'], ['Singleton', false, 'Not about families.'], ['Observer', false, 'Not about creation.'], ['Decorator', false, 'Adds behaviour, does not create families.']] }],
    code: [{ id: 'code-af', title: 'Complete the factory', ask: 'Fill in the dark family.', run: 'AfDemo', expect: '[dark button]', code: String.raw`interface Button { String render(); }
class DarkButton implements Button { public String render() { return "[dark button]"; } }
interface UiFactory { Button createButton(); }
class DarkUiFactory [[implements UiFactory]] {
    public [[Button]] createButton() { return [[new DarkButton()]]; }
}
class AfDemo {
    public static void main(String[] args) {
        UiFactory f = new DarkUiFactory();
        System.out.println(f.createButton().render());
    }
}` }],
    order: [{ id: 'ord-af', title: 'Build an abstract factory', ask: 'Order the steps.', steps: ['List the products that must match (button, checkbox)', 'Create an interface per product', 'Create a factory interface with one create method per product', 'Implement one factory per family', 'Pass the chosen factory to the client'], extra: ['Let the client call `new DarkButton()` directly'] }]
  }
});
})();
