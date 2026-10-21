(function(){
var SRC = String.raw`class ConfigRegistry {
    private static volatile ConfigRegistry instance;          // volatile: safe publication across threads
    private final java.util.Map<String, String> values = new java.util.concurrent.ConcurrentHashMap<>();

    private ConfigRegistry() { values.put("env", "prod"); }  // private: nobody else can call new

    static ConfigRegistry getInstance() {
        if (instance == null) {                                // fast path without locking
            synchronized (ConfigRegistry.class) {
                if (instance == null) {                        // check again inside the lock
                    instance = new ConfigRegistry();
                }
            }
        }
        return instance;
    }
    String get(String key) { return values.get(key); }
}

class Holder {                                                 // lazy holder: simpler and thread-safe
    private Holder() {}
    private static class Lazy { static final Holder INSTANCE = new Holder(); }
    static Holder get() { return Lazy.INSTANCE; }
}

enum IdGenerator {                                             // enum singleton: simplest of all
    INSTANCE;
    private final java.util.concurrent.atomic.AtomicLong next = new java.util.concurrent.atomic.AtomicLong(1);
    long nextId() { return next.getAndIncrement(); }
}

class SingletonDemo {
    public static void main(String[] args) {
        System.out.println(ConfigRegistry.getInstance() == ConfigRegistry.getInstance());
        System.out.println(ConfigRegistry.getInstance().get("env"));
        System.out.println(Holder.get() == Holder.get());
        System.out.println(IdGenerator.INSTANCE.nextId() + " " + IdGenerator.INSTANCE.nextId());
    }
}`;
var dg = { kind: 'class', w: 760, h: 300, classes: [
  { id: 'a', name: 'OrderService', x: 24, y: 40, w: 180, fields: [], methods: ['+ place()'] },
  { id: 'b', name: 'PaymentService', x: 24, y: 180, w: 180, fields: [], methods: ['+ charge()'] },
  { id: 's', name: 'ConfigRegistry', x: 380, y: 70, w: 320, fields: ['- static instance: ConfigRegistry', '- values: Map<String, String>'], methods: ['- ConfigRegistry()', '+ static getInstance(): ConfigRegistry', '+ get(key): String'] }
], rels: [
  { from: 'a', to: 's', type: 'dependency', label: 'getInstance()' },
  { from: 'b', to: 's', type: 'dependency', label: 'getInstance()' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'a', name: 'OrderService' }, { id: 's', name: 'ConfigRegistry' }, { id: 'b', name: 'PaymentService' }], msgs: [
  { from: 'a', to: 's', label: 'getInstance()', text: 'First caller. `instance` is null, so we enter the synchronized block.', code: ['static ConfigRegistry getInstance() {', 'if (instance == null) {'] },
  { from: 's', to: 's', label: 'new ConfigRegistry()', text: 'Check again inside the lock (another thread may have created it meanwhile), then create the one instance.', code: ['synchronized (ConfigRegistry.class) {', 'instance = new ConfigRegistry();'] },
  { from: 's', to: 'a', label: 'instance', ret: true, text: 'Return the shared instance.', code: ['return instance;'] },
  { from: 'b', to: 's', label: 'getInstance()', text: 'Later callers take the fast path: no lock, just read the volatile field.', code: ['if (instance == null) {'] },
  { from: 's', to: 'b', label: 'same instance', ret: true, text: 'Both services now hold the very same object.', code: ['System.out.println(ConfigRegistry.getInstance() == ConfigRegistry.getInstance());'] }
] };
registerPattern({
  slug: 'singleton', order: 1, kind: 'Creational', title: 'Singleton',
  one: 'Guarantee a class has ==exactly one instance== and give everyone one way to reach it.',
  analogy: ['A country has one official registry of births. Every office looks things up in that one registry instead of keeping its own copy, otherwise the records would disagree.', 'In Java: make the constructor private, keep the single instance in a static field, and hand it out through a static method (or just use a one-value `enum`).'],
  use: ['exactly one shared resource: config, a connection pool, a cache, an ID generator', 'creating it is expensive and should happen once', 'a logger or metrics registry for the whole process'],
  avoid: ['as a convenient global variable for business state', 'when you need different instances in tests (prefer dependency injection)', 'when "one per user/request" is what you really mean'],
  problem: { text: ['Each service creates its own `ConfigRegistry`, reading the config file again and holding a separate copy. One copy gets updated, the others do not, and memory and startup time are wasted.'], code: String.raw`class ConfigRegistry {
    ConfigRegistry() { System.out.println("loading config again..."); }
}
class OrderService { ConfigRegistry cfg = new ConfigRegistry(); }
class PaymentService { ConfigRegistry cfg = new ConfigRegistry(); }   // a second, separate copy` },
  solution: { text: ['A private constructor stops outside `new`. A static method creates the instance once and returns it to everyone.', 'Three ways to write it: **double-checked locking** with a `volatile` field (shown, common in interviews), the **lazy holder** idiom (JVM class loading makes it thread-safe), and the **enum singleton** (shortest; safe against reflection and serialization).'], code: SRC, file: 'SingletonDemo.java', expect: 'true\nprod\ntrue\n1 2' },
  flows: [
    { name: 'Class diagram', title: 'Singleton', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'One class, one instance', add: ['s'], on: ['s'], text: 'A **static** field holds the only instance. Static members are underlined in UML.', code: ['private static volatile ConfigRegistry instance;'] },
      { title: 'Lock the door', on: ['s'], text: 'The constructor is `private` (the `-` sign). No other class can write `new ConfigRegistry()`.', code: ['private ConfigRegistry() { values.put("env", "prod"); }'] },
      { title: 'One way in', add: ['a', 'b'], on: ['a', 'b'], text: 'Every client calls `ConfigRegistry.getInstance()` and gets the same object.', code: ['static ConfigRegistry getInstance() {'] },
      { title: 'Thread safety', on: ['s'], text: 'Two threads could both see `null` and create two instances. Double-checked locking with `volatile` prevents that; the enum version gets it for free from the JVM.', code: ['synchronized (ConfigRegistry.class) {', 'enum IdGenerator {'] }
    ]},
    { name: 'Two callers', title: 'Two services get the same instance', diagram: seq, code: '@main' }
  ],
  jdk: [['`Runtime.getRuntime()`', 'One runtime per JVM.'], ['`java.awt.Desktop.getDesktop()`', 'One desktop integration object.'], ['Spring beans (default scope)', 'Singleton per application context, created and injected by the container instead of a static method.']],
  related: [['Factory Method', 'Creates new objects; Singleton always returns the same one.'], ['Facade', 'Often a singleton, as the one entry point to a subsystem.'], ['Dependency Injection', 'The modern alternative: create one instance at startup and pass it in, so tests can use fakes.']],
  pitfalls: [['Hidden global state', 'Anything can read and change it, which makes bugs hard to trace.'], ['Hard to test', 'Static access cannot be swapped for a fake. Inject the instance where possible.'], ['Broken lazy init', '`if (instance == null) instance = new …` without locking creates two instances under load.'], ['Missing volatile', 'Without `volatile`, another thread may see a half-constructed object in double-checked locking.']],
  probe: [['Why `volatile` in double-checked locking?', ['Without it the JVM may publish the reference before the constructor finishes, so another thread can use a half-built object. `volatile` gives a happens-before guarantee.']], ['What is the best way to write a singleton in Java?', ['An enum with one value: thread-safe, serialization-safe, reflection-safe and short. Use the lazy holder if you need a class (e.g. it must extend something).']], ['Why do people call Singleton an anti-pattern?', ['It is global state with a fancy name: hidden dependencies, hard to test, hard to change to "one per tenant". Prefer creating one instance and injecting it.']]],
  say: ['There should be only one ID generator, so I\'ll make it an enum singleton.', 'For testability I\'d still pass it into classes instead of calling `getInstance()` everywhere.'],
  facts: [['private', 'constructor'], ['static', 'instance + accessor'], ['volatile', 'for double-checked locking'], ['enum', 'simplest safe singleton']],
  checklist: ['Write a thread-safe singleton three ways.', 'Explain why `volatile` is needed.', 'Explain the downsides of singletons.'],
  drills: {
    mcq: [{ id: 'mcq-use', kind: 'Which pattern?', title: 'Shared pool', ask: 'All DAOs must share one database connection pool for the whole app. Which pattern (or approach) fits?', options: [['One shared instance: a singleton, ideally created once and injected', true, 'Exactly one pool for the process.'], ['Prototype', false, 'Prototype makes copies; you want exactly one.'], ['A new pool per DAO', false, 'Wastes connections and splits limits.'], ['Observer', false, 'Not about notifications.']] },
      { id: 'mcq-race', title: 'Two instances', ask: '`if (instance == null) instance = new Cache();` sometimes creates two caches under load. Fix?', options: [['Synchronize creation (double-checked with volatile), or use the holder/enum idiom', true, 'Creation must be atomic across threads.'], ['Make the constructor public', false, 'Makes it worse.'], ['Call getInstance twice', false, 'Still racy.'], ['Use ArrayList', false, 'Unrelated.']] }],
    code: [{ id: 'code-holder', title: 'Lazy holder singleton', ask: 'Complete the lazy holder idiom.', run: 'HolderDemo', expect: 'true', code: String.raw`class Metrics {
    [[private]] Metrics() {}
    private static class Lazy {
        static final Metrics INSTANCE = [[new Metrics()]];
    }
    static Metrics get() { return [[Lazy.INSTANCE]]; }
}
class HolderDemo {
    public static void main(String[] args) {
        System.out.println(Metrics.get() == Metrics.get());
    }
}` }],
    order: [{ id: 'ord-dcl', title: 'Double-checked locking', ask: 'Order the steps of `getInstance()`.', steps: ['Check if the instance is null (no lock)', 'Enter a synchronized block on the class', 'Check again if the instance is null', 'Create the instance and assign the volatile field', 'Return the instance'], extra: ['Make the constructor public'] }]
  }
});
})();
