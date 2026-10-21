(function(){
var SRC = String.raw`interface Coffee {
    int cost();
    String description();
}

class Espresso implements Coffee {
    public int cost() { return 100; }
    public String description() { return "Espresso"; }
}

abstract class CoffeeDecorator implements Coffee {   // is a Coffee AND has a Coffee
    protected final Coffee inner;
    CoffeeDecorator(Coffee inner) { this.inner = inner; }
}

class Milk extends CoffeeDecorator {
    Milk(Coffee inner) { super(inner); }
    public int cost() { return inner.cost() + 30; }                   // add to what is inside
    public String description() { return inner.description() + " + milk"; }
}

class Caramel extends CoffeeDecorator {
    Caramel(Coffee inner) { super(inner); }
    public int cost() { return inner.cost() + 50; }
    public String description() { return inner.description() + " + caramel"; }
}

class DecoratorDemo {
    public static void main(String[] args) {
        Coffee c = new Caramel(new Milk(new Espresso()));             // wrap layer by layer
        System.out.println(c.description() + " = " + c.cost());
        Coffee d = new Milk(new Milk(new Espresso()));                // same decorator twice
        System.out.println(d.description() + " = " + d.cost());
    }
}`;
var dg = { kind: 'class', w: 760, h: 340, classes: [
  { id: 'c', name: 'Coffee', stereo: 'interface', x: 270, y: 20, w: 200, fields: [], methods: ['+ cost(): int', '+ description(): String'] },
  { id: 'e', name: 'Espresso', x: 24, y: 190, w: 190, fields: [], methods: ['+ cost(): int'] },
  { id: 'd', name: 'CoffeeDecorator', stereo: 'abstract', x: 290, y: 175, w: 200, fields: ['# inner: Coffee'], methods: [] },
  { id: 'm', name: 'Milk', x: 540, y: 140, w: 190, fields: [], methods: ['+ cost(): inner + 30'] },
  { id: 'k', name: 'Caramel', x: 540, y: 250, w: 190, fields: [], methods: ['+ cost(): inner + 50'] }
], rels: [
  { from: 'e', to: 'c', type: 'implements' },
  { from: 'd', to: 'c', type: 'implements' },
  { from: 'd', to: 'c', type: 'aggregation', label: 'wraps', via: [[515, 221], [515, 75]] },
  { from: 'm', to: 'd', type: 'inherits' },
  { from: 'k', to: 'd', type: 'inherits' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'cl', name: 'Client' }, { id: 'k', name: 'Caramel' }, { id: 'm', name: 'Milk' }, { id: 'e', name: 'Espresso' }], msgs: [
  { from: 'cl', to: 'k', label: 'cost()', text: 'The client sees one `Coffee`. It does not know there are layers.', code: ['System.out.println(c.description() + " = " + c.cost());'] },
  { from: 'k', to: 'm', label: 'cost()', text: 'Caramel first asks the coffee inside it.', code: ['public int cost() { return inner.cost() + 50; }'] },
  { from: 'm', to: 'e', label: 'cost()', text: 'Milk asks its inner coffee too.', code: ['public int cost() { return inner.cost() + 30; }'] },
  { from: 'e', to: 'm', label: '100', ret: true, text: 'The innermost object answers.', code: ['public int cost() { return 100; }'] },
  { from: 'm', to: 'k', label: '130', ret: true, text: 'Milk adds its part on the way out.', code: ['return inner.cost() + 30;'] },
  { from: 'k', to: 'cl', label: '180', ret: true, text: 'Caramel adds its part. Each layer adds behaviour around the one inside.', code: ['return inner.cost() + 50;'] }
] };
registerPattern({
  slug: 'decorator', order: 7, kind: 'Structural', title: 'Decorator',
  one: 'Add behaviour to an object by ==wrapping it in another object with the same interface==, instead of creating a subclass for every combination.',
  analogy: ['Ordering coffee: espresso, then add milk, then caramel. Each add-on wraps what you had and adds its price. You never need a menu item for every combination.', 'A decorator **is a** `Coffee` (implements the interface) and **has a** `Coffee` (the inner one). Each method calls the inner object and adds something before or after.'],
  use: ['optional features that combine freely (logging, caching, compression, encryption)', 'subclass explosion: `MilkCaramelEspresso`, `MilkMilkEspresso`…', 'adding behaviour at runtime without touching the original class'],
  avoid: ['the order of layers matters but is easy to get wrong and nobody documents it', 'one fixed combination (just write one class)'],
  problem: { text: ['A subclass per combination: 4 add-ons already give 16 classes, and every new add-on doubles the count.'], code: String.raw`class Espresso { int cost() { return 100; } }
class EspressoWithMilk extends Espresso { int cost() { return 130; } }
class EspressoWithCaramel extends Espresso { int cost() { return 150; } }
class EspressoWithMilkAndCaramel extends Espresso { int cost() { return 180; } }   // and so on...` },
  solution: { text: ['One decorator class per add-on. Each implements `Coffee`, holds an inner `Coffee`, and adds its own part. Combine at runtime by nesting constructors: `new Caramel(new Milk(new Espresso()))`.'], code: SRC, file: 'DecoratorDemo.java', expect: 'Espresso + milk + caramel = 180\nEspresso + milk + milk = 160' },
  flows: [
    { name: 'Class diagram', title: 'Decorator', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Component interface', add: ['c'], on: ['c'], text: 'Everyone works with `Coffee`.', code: ['interface Coffee {'] },
      { title: 'Concrete component', add: ['e'], on: ['e'], text: 'The plain thing being decorated.', code: ['class Espresso implements Coffee {'] },
      { title: 'Base decorator', add: ['d'], on: ['d'], rels: ['d-c'], text: 'Implements `Coffee` **and** holds an inner `Coffee`. That double role is the trick.', code: ['abstract class CoffeeDecorator implements Coffee {', 'protected final Coffee inner;'] },
      { title: 'Concrete decorators', add: ['m', 'k'], on: ['m', 'k'], text: 'Each one adds its part around `inner`. Any number, any order, chosen at runtime.', code: ['class Milk extends CoffeeDecorator {', 'public int cost() { return inner.cost() + 30; }'] }
    ]},
    { name: 'Unwrapping a call', title: 'Calls travel through the layers', diagram: seq, code: '@main' }
  ],
  jdk: [['`java.io` streams', '`new BufferedReader(new InputStreamReader(new FileInputStream(f)))`: each layer adds buffering or decoding.'], ['`Collections.unmodifiableList(list)`', 'Wraps a list and blocks writes.'], ['`Collections.synchronizedMap(map)`', 'Wraps a map and adds locking.']],
  related: [['Proxy', 'Same structure; proxy controls access (lazy, cache, security), decorator adds features the client asked for.'], ['Adapter', 'Changes the interface; decorator keeps it.'], ['Composite', 'Also recursive wrapping, but for trees of many children.'], ['Chain of Responsibility', 'Handlers may stop the call; decorators always pass it on.']],
  pitfalls: [['Order bugs', '`encrypt(compress(x))` differs from `compress(encrypt(x))`; document or build the order in a factory.'], ['Identity checks', 'A decorated object is not `==` to the original, and `instanceof Espresso` fails.'], ['Too many tiny layers', 'Debug stack traces get long; keep decorators focused.']],
  probe: [['Decorator vs inheritance?', ['Inheritance fixes behaviour at compile time and multiplies classes for combinations. Decorators combine behaviours at runtime with one class per behaviour.']], ['Decorator vs Proxy?', ['Structurally identical. Intent differs: decorator adds responsibilities (milk, logging); proxy controls access to the real object (lazy loading, caching, permissions).']], ['Where is this in the JDK?', ['`java.io`: `BufferedInputStream` wraps any `InputStream` and adds buffering; `GZIPInputStream` adds decompression.']]],
  say: ['Logging, retries and caching are optional layers, so each is a decorator around the `HttpClient` interface.', 'We combine them at startup in the order we want.'],
  facts: [['is-a', 'implements the interface'], ['has-a', 'wraps an inner object'], ['runtime', 'combine layers freely']],
  checklist: ['Draw the decorator structure.', 'Write two decorators and stack them.', 'Explain decorator vs proxy vs adapter.'],
  drills: {
    mcq: [{ id: 'mcq-d', kind: 'Which pattern?', title: 'HTTP client extras', ask: 'You want optional logging, retry and caching around an `HttpClient`, in any combination. Pattern?', options: [['Decorator', true, 'Each feature wraps the client and keeps the same interface.'], ['Subclass for each combination', false, '8 classes for 3 features, 16 for 4.'], ['Singleton', false, 'Unrelated.'], ['Builder', false, 'Builds objects, does not add behaviour around calls.']] }],
    code: [{ id: 'code-d', title: 'Write a decorator', ask: 'Add an uppercase decorator around a `Text`.', run: 'TextDemo', expect: 'HELLO!', code: String.raw`interface Text { String render(); }
class Plain implements Text { public String render() { return "hello"; } }
class Upper implements Text {
    private final Text inner;
    Upper(Text inner) { this.inner = inner; }
    public String render() { return [[inner.render().toUpperCase()]]; }
}
class Exclaim [[implements Text]] {
    private final Text inner;
    Exclaim(Text inner) { this.inner = inner; }
    public String render() { return inner.render() + "!"; }
}
class TextDemo {
    public static void main(String[] args) {
        System.out.println(new Exclaim([[new Upper(new Plain())]]).render());
    }
}` }],
    order: [{ id: 'ord-d', title: 'Build a decorator', ask: 'Order the steps.', steps: ['Identify the shared interface', 'Create a base decorator that implements it and holds an inner instance', 'Create one decorator per added behaviour', 'In each method, call inner and add behaviour', 'Stack decorators when creating the object'], extra: ['Create a subclass for every combination'] }]
  }
});
})();
