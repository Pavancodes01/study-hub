(function(){
var SRC = String.raw`interface PaymentProcessor {                      // what our code expects
    String pay(int amountCents);
}

class LegacyGateway {                                // third-party class we cannot change
    String makePayment(String account, double dollars) {
        return "legacy charged " + account + " $" + String.format(java.util.Locale.ROOT, "%.2f", dollars);
    }
}

class LegacyGatewayAdapter implements PaymentProcessor {
    private final LegacyGateway legacy;              // wraps the incompatible object
    private final String account;
    LegacyGatewayAdapter(LegacyGateway legacy, String account) { this.legacy = legacy; this.account = account; }
    public String pay(int amountCents) {
        return legacy.makePayment(account, amountCents / 100.0);   // translate names and units
    }
}

class ModernProcessor implements PaymentProcessor {
    public String pay(int amountCents) { return "new API charged " + amountCents + " cents"; }
}

class OrderService {
    private final PaymentProcessor processor;        // only knows our interface
    OrderService(PaymentProcessor processor) { this.processor = processor; }
    String placeOrder(int cents) { return processor.pay(cents); }
}

class AdapterDemo {
    public static void main(String[] args) {
        System.out.println(new OrderService(new LegacyGatewayAdapter(new LegacyGateway(), "ACC-9")).placeOrder(1999));
        System.out.println(new OrderService(new ModernProcessor()).placeOrder(500));
    }
}`;
var dg = { kind: 'class', w: 780, h: 320, classes: [
  { id: 'os', name: 'OrderService', x: 24, y: 30, w: 210, fields: ['- processor: PaymentProcessor'], methods: ['+ placeOrder(cents)'] },
  { id: 'pp', name: 'PaymentProcessor', stereo: 'interface', x: 330, y: 30, w: 210, fields: [], methods: ['+ pay(amountCents): String'] },
  { id: 'ad', name: 'LegacyGatewayAdapter', x: 300, y: 190, w: 240, fields: ['- legacy: LegacyGateway'], methods: ['+ pay(amountCents): String'] },
  { id: 'lg', name: 'LegacyGateway', x: 590, y: 190, w: 180, fields: [], methods: ['+ makePayment(acct, $)'] },
  { id: 'mp', name: 'ModernProcessor', x: 590, y: 30, w: 180, fields: [], methods: ['+ pay(amountCents)'] }
], rels: [
  { from: 'os', to: 'pp', type: 'association' },
  { from: 'ad', to: 'pp', type: 'implements' },
  { from: 'mp', to: 'pp', type: 'implements' },
  { from: 'ad', to: 'lg', type: 'association', label: 'delegates' }
] };
dg.classes[0].w = 230;
var seq = { kind: 'seq', w: 760, parts: [{ id: 'o', name: 'OrderService' }, { id: 'a', name: 'Adapter' }, { id: 'l', name: 'LegacyGateway' }], msgs: [
  { from: 'o', to: 'a', label: 'pay(1999)', text: 'OrderService calls the interface it knows, in cents.', code: ['String placeOrder(int cents) { return processor.pay(cents); }'] },
  { from: 'a', to: 'l', label: 'makePayment("ACC-9", 19.99)', text: 'The adapter translates: different method name, extra account argument, cents to dollars.', code: ['return legacy.makePayment(account, amountCents / 100.0);'] },
  { from: 'l', to: 'a', label: '"legacy charged…"', ret: true, text: 'The legacy class does its thing, unaware of our interface.', code: ['String makePayment(String account, double dollars) {'] },
  { from: 'a', to: 'o', label: 'result', ret: true, text: 'OrderService never learned the legacy API exists.', code: ['public String pay(int amountCents) {'] }
] };
registerPattern({
  slug: 'adapter', order: 6, kind: 'Structural', title: 'Adapter',
  one: 'Wrap an object with an incompatible interface so it ==looks like the interface your code expects==.',
  analogy: ['A travel plug adapter: your laptop charger has a UK plug, the wall is European. The adapter does not change the charger or the wall; it just sits between them.', 'In code, the adapter implements **your** interface and holds a reference to the **foreign** object, translating each call: method names, argument order, units, exceptions.'],
  use: ['integrating a third-party or legacy class you cannot change', 'two libraries that should work together but have different interfaces', 'keeping vendor APIs out of your business code'],
  avoid: ['you own both sides (just change the interface)', 'the "adapter" grows business logic (then it is a service)'],
  problem: { text: ['Business code calls the legacy gateway directly: vendor method names, dollars instead of cents and account handling leak everywhere. Switching vendors means editing every caller.'], code: String.raw`class LegacyGateway {
    String makePayment(String account, double dollars) { return "charged"; }
}
class OrderService {
    String placeOrder(int cents) {
        return new LegacyGateway().makePayment("ACC-9", cents / 100.0);   // vendor details in business code
    }
}` },
  solution: { text: ['Define the interface you want (`PaymentProcessor`). Write `LegacyGatewayAdapter implements PaymentProcessor` that wraps the legacy object and translates. Business code only knows `PaymentProcessor`, so a new vendor is just another implementation.'], code: SRC, file: 'AdapterDemo.java', expect: 'legacy charged ACC-9 $19.99\nnew API charged 500 cents' },
  flows: [
    { name: 'Class diagram', title: 'Object adapter', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Target interface', add: ['os', 'pp'], on: ['pp'], text: 'What our code wants to call. OrderService depends only on this.', code: ['interface PaymentProcessor {', 'private final PaymentProcessor processor;'] },
      { title: 'Adaptee', add: ['lg'], on: ['lg'], text: 'The class we cannot change. Different name, different units.', code: ['class LegacyGateway {'] },
      { title: 'Adapter', add: ['ad'], on: ['ad'], rels: ['ad-pp', 'ad-lg'], text: 'Implements the target, holds the adaptee, translates each call. This is the **object adapter** (composition), preferred over inheriting the adaptee.', code: ['class LegacyGatewayAdapter implements PaymentProcessor {', 'return legacy.makePayment(account, amountCents / 100.0);'] },
      { title: 'Swap vendors freely', add: ['mp'], on: ['mp'], text: 'A modern processor implements the same interface directly. OrderService does not change.', code: ['class ModernProcessor implements PaymentProcessor {'] }
    ]},
    { name: 'One payment', title: 'Translating a call', diagram: seq, code: '@main' }
  ],
  jdk: [['`Arrays.asList(array)`', 'Adapts an array to the `List` interface.'], ['`InputStreamReader`', 'Adapts a byte `InputStream` into a character `Reader`.'], ['`Collections.enumeration(collection)`', 'Adapts a collection to the old `Enumeration` interface.']],
  related: [['Decorator', 'Same interface in and out, adds behaviour. Adapter changes the interface.'], ['Facade', 'Simplifies a whole subsystem with a new interface; Adapter makes one object fit an existing interface.'], ['Proxy', 'Same interface, controls access.']],
  pitfalls: [['Business logic in the adapter', 'Keep it to translation; logic belongs in services.'], ['Leaky exceptions', 'Translate vendor exceptions into your own, or callers depend on the vendor anyway.'], ['Class adapter by inheritance', 'Extending the adaptee couples you to its internals; prefer composition.']],
  probe: [['Adapter vs Facade?', ['Adapter: make one existing class fit an interface you already have. Facade: create a new simple interface over many classes.']], ['Object adapter vs class adapter?', ['Object adapter holds the adaptee (composition) and works with any subclass of it. Class adapter extends the adaptee; Java only allows one superclass, so object adapters are the norm.']]],
  say: ['The vendor SDK sits behind an adapter that implements our `PaymentProcessor`.', 'Switching vendors is a new adapter; business code does not change.'],
  facts: [['target', 'interface you want'], ['adaptee', 'class you have'], ['adapter', 'implements target, wraps adaptee']],
  checklist: ['Draw target, adapter, adaptee.', 'Write an adapter that converts units and names.', 'Explain adapter vs facade vs decorator.'],
  drills: {
    mcq: [{ id: 'mcq-a', kind: 'Which pattern?', title: 'New SMS vendor', ask: 'A new SMS vendor\'s SDK has `dispatch(Message m)` but your code calls `SmsSender.send(phone, text)`. Pattern?', options: [['Adapter', true, 'Wrap the SDK in a class that implements `SmsSender`.'], ['Facade', false, 'Facade simplifies many classes; here one class must fit an interface.'], ['Composite', false, 'Not a tree.'], ['Singleton', false, 'Not about instances.']] }],
    code: [{ id: 'code-adapter', title: 'Write the adapter', ask: 'Adapt Fahrenheit sensor readings to a Celsius interface.', run: 'TempDemo', expect: '100.0', code: String.raw`interface CelsiusSensor { double celsius(); }
class FahrenheitSensor { double readF() { return 212.0; } }
class SensorAdapter [[implements CelsiusSensor]] {
    private final FahrenheitSensor f;
    SensorAdapter(FahrenheitSensor f) { this.f = f; }
    public double celsius() { return [[(f.readF() - 32) * 5 / 9]]; }
}
class TempDemo {
    public static void main(String[] args) {
        CelsiusSensor s = new SensorAdapter([[new FahrenheitSensor()]]);
        System.out.println(s.celsius());
    }
}` }],
    order: [{ id: 'ord-a', title: 'Add an adapter', ask: 'Order the steps.', steps: ['Define the interface your code needs', 'Create an adapter class that implements it', 'Give the adapter a reference to the foreign object', 'Translate each call: names, arguments, units, errors', 'Inject the adapter where the interface is needed'], extra: ['Edit the third-party library'] }]
  }
});
})();
