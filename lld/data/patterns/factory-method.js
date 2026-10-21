(function(){
var SRC = String.raw`interface Notifier { String send(String msg); }

class EmailNotifier implements Notifier { public String send(String msg) { return "Email: " + msg; } }
class SmsNotifier implements Notifier { public String send(String msg) { return "SMS: " + msg; } }

abstract class AlertService {
    abstract Notifier createNotifier();                 // the factory method
    String alert(String msg) {
        Notifier n = createNotifier();                  // the subclass decides which notifier
        return n.send(msg.toUpperCase());
    }
}
class EmailAlertService extends AlertService {
    Notifier createNotifier() { return new EmailNotifier(); }
}
class SmsAlertService extends AlertService {
    Notifier createNotifier() { return new SmsNotifier(); }
}

class NotifierFactory {                                 // "simple factory": one static method
    static Notifier of(String channel) {
        return switch (channel) {
            case "email" -> new EmailNotifier();
            case "sms" -> new SmsNotifier();
            default -> throw new IllegalArgumentException("Unknown channel " + channel);
        };
    }
}

class FactoryMethodDemo {
    public static void main(String[] args) {
        AlertService s = new SmsAlertService();
        System.out.println(s.alert("server down"));
        System.out.println(new EmailAlertService().alert("disk full"));
        System.out.println(NotifierFactory.of("email").send("hi"));
    }
}`;
var dg = { kind: 'class', w: 760, h: 330, classes: [
  { id: 'svc', name: 'AlertService', stereo: 'abstract', x: 24, y: 30, w: 230, fields: [], methods: ['+ alert(msg): String', '# createNotifier(): Notifier'] },
  { id: 'n', name: 'Notifier', stereo: 'interface', x: 470, y: 30, w: 220, fields: [], methods: ['+ send(msg): String'] },
  { id: 'es', name: 'EmailAlertService', x: 24, y: 210, w: 210, fields: [], methods: ['# createNotifier(): Notifier'] },
  { id: 'en', name: 'EmailNotifier', x: 380, y: 210, w: 170, fields: [], methods: ['+ send(msg): String'] },
  { id: 'sn', name: 'SmsNotifier', x: 570, y: 210, w: 170, fields: [], methods: ['+ send(msg): String'] }
], rels: [
  { from: 'svc', to: 'n', type: 'dependency', label: 'creates and uses' },
  { from: 'es', to: 'svc', type: 'inherits' },
  { from: 'en', to: 'n', type: 'implements' },
  { from: 'sn', to: 'n', type: 'implements' },
  { from: 'es', to: 'en', type: 'dependency', label: 'new' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'c', name: 'Client' }, { id: 's', name: 'SmsAlertService' }, { id: 'n', name: 'SmsNotifier' }], msgs: [
  { from: 'c', to: 's', label: 'alert("server down")', text: 'The client calls the general algorithm in the base class.', code: ['String alert(String msg) {', 'System.out.println(s.alert("server down"));'] },
  { from: 's', to: 's', label: 'createNotifier()', text: 'The base class calls its own abstract factory method; the subclass implementation runs.', code: ['Notifier n = createNotifier();', 'Notifier createNotifier() { return new SmsNotifier(); }'] },
  { from: 's', to: 'n', label: 'send("SERVER DOWN")', text: 'The rest of the algorithm only uses the `Notifier` interface.', code: ['return n.send(msg.toUpperCase());'] },
  { from: 'n', to: 's', label: '"SMS: SERVER DOWN"', ret: true, text: 'Result flows back.', code: ['class SmsNotifier implements Notifier'] },
  { from: 's', to: 'c', label: 'result', ret: true, text: 'The client never wrote `new SmsNotifier()`.', code: ['String alert(String msg) {'] }
] };
registerPattern({
  slug: 'factory-method', order: 2, kind: 'Creational', title: 'Factory Method',
  one: 'Let a method (often overridden by subclasses) ==decide which class to instantiate==, so the calling code only depends on an interface.',
  analogy: ['A restaurant chain has one recipe for "serve a meal", but each branch decides which local supplier provides the bread. The serving steps never change; only the "get bread" step differs per branch.', 'The base class writes the algorithm and calls an abstract `create…()` method. Each subclass returns its own product. The simpler everyday variant is a **simple factory**: one static method with a switch that returns the right implementation.'],
  use: ['the code should not know concrete classes (`new EmailNotifier()` scattered everywhere)', 'which class to create depends on config, input or subclass', 'a framework lets users plug in their own products'],
  avoid: ['only ever one implementation', 'creation is trivial and will never vary'],
  problem: { text: ['Business code is full of `new` and switches on channel type. Adding a channel means hunting through every switch.'], code: String.raw`class AlertService {
    String alert(String channel, String msg) {
        if (channel.equals("email")) return "Email: " + msg;   // creation + use tangled together
        if (channel.equals("sms")) return "SMS: " + msg;
        throw new IllegalArgumentException(channel);
    }
}` },
  solution: { text: ['Creation goes in one place. In the GoF form, `AlertService.createNotifier()` is abstract and each subclass returns a product. In the everyday form, `NotifierFactory.of(channel)` maps a string to an object. Either way, the rest of the code uses the `Notifier` interface.'], code: SRC, file: 'FactoryMethodDemo.java', expect: 'SMS: SERVER DOWN\nEmail: DISK FULL\nEmail: hi' },
  flows: [
    { name: 'Class diagram', title: 'Factory Method', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The product interface', add: ['n'], on: ['n'], text: 'Callers only know `Notifier`.', code: ['interface Notifier { String send(String msg); }'] },
      { title: 'The creator', add: ['svc'], on: ['svc'], text: '`AlertService` contains the algorithm and an abstract **factory method** `createNotifier()` (`#` = protected).', code: ['abstract Notifier createNotifier();', 'Notifier n = createNotifier();'] },
      { title: 'Concrete products', add: ['en', 'sn'], on: ['en', 'sn'], text: 'Each channel is its own class.', code: ['class EmailNotifier implements Notifier', 'class SmsNotifier implements Notifier'] },
      { title: 'Concrete creators', add: ['es'], on: ['es'], text: 'A subclass overrides the factory method and decides the product. Adding Slack = one notifier + one creator, no edits.', code: ['class EmailAlertService extends AlertService {', 'Notifier createNotifier() { return new EmailNotifier(); }'] }
    ]},
    { name: 'One call', title: 'The subclass picks the product', diagram: seq, code: '@main' }
  ],
  jdk: [['`Calendar.getInstance()`', 'Returns the right calendar for the locale.'], ['`List.of(...)`, `Map.of(...)`', 'Static factory methods choose an internal implementation.'], ['`Iterable.iterator()`', 'Each collection is a creator that returns its own iterator: textbook factory method.'], ['`NumberFormat.getCurrencyInstance()`', 'Picks a formatter subclass for you.']],
  related: [['Abstract Factory', 'Creates whole families of related objects; often implemented with several factory methods.'], ['Template Method', 'Factory Method is a Template Method whose varying step is "create the object".'], ['Strategy', 'Factories often choose which strategy to create.']],
  pitfalls: [['A class per product per creator', 'Parallel hierarchies can explode; a simple factory with a map is often enough.'], ['Switch copied everywhere', 'The point is one place that knows concrete classes.'], ['Returning concrete types', 'The method should return the interface, or callers couple to the class again.']],
  probe: [['Simple factory vs Factory Method?', ['Simple factory: one class with a static method and a switch or map. Factory Method (GoF): an overridable method in a creator class; subclasses decide the product. Interviews accept either if you name it correctly.']], ['How do you avoid the switch in a simple factory?', ['Register suppliers in a map: `Map<String, Supplier<Notifier>> registry`; adding a channel is one `put`.']], ['Why not just call `new`?', ['`new` hard-codes a concrete class. Centralizing creation lets you change or add implementations, cache instances or inject test doubles in one place.']]],
  say: ['Creating notifiers goes through one factory, so the alert service only knows the `Notifier` interface.', 'I\'ll keep a map from channel to supplier so adding a channel is one line.'],
  facts: [['creator', 'declares create…()'], ['product', 'interface returned'], ['simple factory', 'static method + map/switch']],
  checklist: ['Draw creator, concrete creators, product and concrete products.', 'Write a simple factory with a map of suppliers.', 'Explain factory method vs abstract factory.'],
  drills: {
    mcq: [{ id: 'mcq-iter', kind: 'Which pattern?', title: 'iterator()', ask: '`ArrayList.iterator()` and `HashSet.iterator()` each return their own iterator type behind the `Iterator` interface. Which pattern is `iterator()`?', options: [['Factory Method', true, 'Each collection (creator) decides which iterator (product) to create.'], ['Singleton', false, 'Each call returns a new iterator.'], ['Adapter', false, 'It is not converting an interface.'], ['Builder', false, 'No step-by-step construction.']] }],
    code: [{ id: 'code-registry', title: 'Factory with a registry', ask: 'Use a map of suppliers instead of a switch.', run: 'RegistryDemo', expect: 'Push: hello', code: String.raw`import java.util.*;
import java.util.function.Supplier;
interface Notifier { String send(String m); }
class PushNotifier implements Notifier { public String send(String m) { return "Push: " + m; } }
class Notifiers {
    private static final Map<String, [[Supplier<Notifier>]]> REGISTRY = new HashMap<>();
    static { REGISTRY.put("push", [[PushNotifier::new|() -> new PushNotifier()]]); }
    static Notifier of(String key) { return REGISTRY.get(key).[[get()]]; }
}
class RegistryDemo {
    public static void main(String[] args) { System.out.println(Notifiers.of("push").send("hello")); }
}` }],
    order: [{ id: 'ord-fm', title: 'Introduce a factory', ask: 'Order the refactoring.', steps: ['Find scattered `new ConcreteClass()` calls with type switches', 'Define the product interface', 'Move creation into one factory method', 'Make callers depend on the interface only', 'Add new products by registering them in the factory'], extra: ['Copy the switch into each caller'] }]
  }
});
})();
