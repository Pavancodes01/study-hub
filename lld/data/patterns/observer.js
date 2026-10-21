(function(){
var SRC = String.raw`import java.util.*;

interface PriceListener {
    void onPrice(String symbol, int price);
}

class Stock {                                          // the subject
    private final String symbol;
    private int price;
    private final List<PriceListener> listeners = new ArrayList<>();
    Stock(String symbol, int price) { this.symbol = symbol; this.price = price; }

    void subscribe(PriceListener l) { listeners.add(l); }
    void unsubscribe(PriceListener l) { listeners.remove(l); }

    void setPrice(int newPrice) {
        price = newPrice;
        for (PriceListener l : List.copyOf(listeners)) l.onPrice(symbol, price);   // push to everyone
    }
}

class MobileApp implements PriceListener {
    public void onPrice(String symbol, int price) { System.out.println("app: " + symbol + " is " + price); }
}

class AlertBot implements PriceListener {
    private final int limit;
    AlertBot(int limit) { this.limit = limit; }
    public void onPrice(String symbol, int price) {
        if (price > limit) System.out.println("alert: " + symbol + " above " + limit);
    }
}

class ObserverDemo {
    public static void main(String[] args) {
        Stock tcs = new Stock("TCS", 3500);
        MobileApp app = new MobileApp();
        tcs.subscribe(app);
        tcs.subscribe(new AlertBot(3600));
        tcs.setPrice(3550);
        tcs.setPrice(3650);
        tcs.unsubscribe(app);
        tcs.setPrice(3700);
    }
}`;
var dg = { kind: 'class', w: 760, h: 300, classes: [
  { id: 's', name: 'Stock', x: 24, y: 30, w: 260, fields: ['- price: int', '- listeners: List<PriceListener>'], methods: ['+ subscribe(l)', '+ unsubscribe(l)', '+ setPrice(p)'] },
  { id: 'l', name: 'PriceListener', stereo: 'interface', x: 430, y: 30, w: 250, fields: [], methods: ['+ onPrice(symbol, price)'] },
  { id: 'a', name: 'MobileApp', x: 350, y: 200, w: 180, fields: [], methods: ['+ onPrice(...)'] },
  { id: 'b', name: 'AlertBot', x: 560, y: 200, w: 180, fields: ['- limit: int'], methods: ['+ onPrice(...)'] }
], rels: [
  { from: 's', to: 'l', type: 'aggregation', fm: '1', tm: '*', label: 'notifies' },
  { from: 'a', to: 'l', type: 'implements' },
  { from: 'b', to: 'l', type: 'implements' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'm', name: 'Exchange feed' }, { id: 's', name: 'Stock' }, { id: 'a', name: 'MobileApp' }, { id: 'b', name: 'AlertBot' }], msgs: [
  { from: 'm', to: 's', label: 'setPrice(3650)', text: 'The subject changes.', code: ['tcs.setPrice(3650);', 'void setPrice(int newPrice) {'] },
  { from: 's', to: 'a', label: 'onPrice("TCS", 3650)', text: 'It loops over its listeners and calls each one. It only knows the interface.', code: ['for (PriceListener l : List.copyOf(listeners)) l.onPrice(symbol, price);'] },
  { from: 's', to: 'b', label: 'onPrice("TCS", 3650)', text: 'Every subscriber decides what to do with the event.', code: ['if (price > limit) System.out.println("alert: " + symbol + " above " + limit);'] },
  { from: 'm', to: 's', label: 'unsubscribe(app)', text: 'Subscribers can leave at any time.', code: ['tcs.unsubscribe(app);'] },
  { from: 'm', to: 's', label: 'setPrice(3700)', text: 'Next change…', code: ['tcs.setPrice(3700);'] },
  { from: 's', to: 'b', label: 'onPrice("TCS", 3700)', text: '…only the remaining subscriber is notified. Stock never changed when subscribers came and went.', code: ['public void onPrice(String symbol, int price) {'] }
] };
registerPattern({
  slug: 'observer', order: 12, kind: 'Behavioral', title: 'Observer',
  one: 'When one object changes, ==notify every subscriber automatically==, without the object knowing who they are.',
  analogy: ['A YouTube channel: viewers subscribe, and every new video notifies all subscribers. The channel does not know or care whether you watch on phone or TV, and subscribers come and go freely.', 'The **subject** keeps a list of listeners (an interface). On a change it calls each listener. Listeners register and unregister themselves.'],
  use: ['one change must trigger several independent reactions', 'the set of reactions changes over time', 'decoupling: the source should not depend on who reacts (UI updates, events, notifications)'],
  avoid: ['a single fixed reaction (just call it)', 'order of notifications matters a lot', 'reactions are slow and must not block the subject (use a queue/event bus)'],
  problem: { text: ['`Stock.setPrice` calls the app, the alert bot and the logger directly. Every new consumer means editing `Stock`.'], code: String.raw`class MobileApp { void show(int p) {} }
class AlertBot { void check(int p) {} }
class Stock {
    MobileApp app = new MobileApp(); AlertBot bot = new AlertBot();
    void setPrice(int p) {
        app.show(p);       // Stock knows every consumer by name
        bot.check(p);      // add one more consumer = edit Stock again
    }
}` },
  solution: { text: ['`Stock` keeps a `List<PriceListener>`. Consumers implement `PriceListener` and subscribe. `setPrice` loops and notifies. Iterating over a copy avoids errors if a listener unsubscribes during notification.'], code: SRC, file: 'ObserverDemo.java', expect: 'app: TCS is 3550\napp: TCS is 3650\nalert: TCS above 3600\nalert: TCS above 3600' },
  flows: [
    { name: 'Class diagram', title: 'Observer', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The subject', add: ['s'], on: ['s'], text: 'Holds state and a list of listeners, plus subscribe/unsubscribe.', code: ['class Stock {', 'private final List<PriceListener> listeners = new ArrayList<>();'] },
      { title: 'The observer interface', add: ['l'], on: ['l'], rels: ['s-l'], text: 'The subject only knows this one method.', code: ['interface PriceListener {'] },
      { title: 'Concrete observers', add: ['a', 'b'], on: ['a', 'b'], text: 'Any number of consumers, each with its own reaction. Adding one never edits `Stock`.', code: ['class MobileApp implements PriceListener {', 'class AlertBot implements PriceListener {'] },
      { title: 'Notify', on: ['s'], text: 'On change, loop and call each listener.', code: ['for (PriceListener l : List.copyOf(listeners)) l.onPrice(symbol, price);'] }
    ]},
    { name: 'Price change', title: 'Notifying subscribers', diagram: seq, code: '@main' }
  ],
  jdk: [['`java.beans.PropertyChangeListener`', 'Classic observer for bean property changes.'], ['Swing / JavaFX listeners', '`addActionListener`, `addListener` on properties.'], ['`java.util.concurrent.Flow`', 'Reactive Streams publisher/subscriber (with backpressure).'], ['Spring `ApplicationEventPublisher`', 'Publish events; `@EventListener` methods receive them.']],
  related: [['Mediator', 'Central object coordinating peers; observer is one-to-many broadcast.'], ['Pub/Sub via a broker', 'Observer across processes, with a queue in between (Kafka).'], ['Strategy', 'One pluggable behaviour; observer is many listeners.']],
  pitfalls: [['Memory leaks', 'Forgotten subscriptions keep listeners alive (the lapsed listener problem). Unsubscribe or use weak references.'], ['Modifying the list while notifying', 'Iterate over a copy or use `CopyOnWriteArrayList`.'], ['Slow listeners block the subject', 'Hand events to an executor or queue if reactions are slow.'], ['Cascades', 'A listener that changes the subject again can loop forever.']],
  probe: [['Push or pull model?', ['Push: the subject sends the data with the event (`onPrice(symbol, price)`). Pull: it sends only "changed" and listeners query what they need. Push is simpler; pull avoids sending data nobody uses.']], ['How do you make it thread-safe?', ['Use `CopyOnWriteArrayList` for listeners (cheap reads, rare writes), and decide whether notifications run on the caller thread or an executor.']], ['Observer vs pub/sub?', ['Observer: subject holds direct references to observers in the same process. Pub/sub: a broker or event bus sits between, so publishers and subscribers do not know each other at all.']]],
  say: ['Price changes are published to `PriceListener`s, so new consumers subscribe without touching `Stock`.', 'Listeners are in a `CopyOnWriteArrayList`, and slow ones run on an executor.'],
  facts: [['subject', 'holds listeners'], ['observer', 'one callback interface'], ['leak', 'unsubscribe!'], ['thread-safe', 'CopyOnWriteArrayList']],
  checklist: ['Draw subject and observers.', 'Write subscribe/unsubscribe/notify.', 'Explain push vs pull and the lapsed listener problem.'],
  drills: {
    mcq: [{ id: 'mcq-o', kind: 'Which pattern?', title: 'Order placed', ask: 'When an order is placed, email, inventory and analytics must react, and more reactions will be added. Pattern?', options: [['Observer (or an event bus)', true, 'Order service publishes; consumers subscribe.'], ['Decorator', false, 'Wraps one object to add behaviour.'], ['Singleton', false, 'Unrelated.'], ['Prototype', false, 'Unrelated.']] }],
    code: [{ id: 'code-o', title: 'Notify listeners', ask: 'Complete subscribe and notify.', run: 'NewsDemo', expect: 'A got: hi\nB got: hi', code: String.raw`import java.util.*;
interface Reader { void onNews(String s); }
class Agency {
    private final List<Reader> readers = new ArrayList<>();
    void subscribe(Reader r) { [[readers.add(r)]]; }
    void publish(String s) { for (Reader r : readers) [[r.onNews(s)]]; }
}
class NewsDemo {
    public static void main(String[] args) {
        Agency a = new Agency();
        a.subscribe(s -> System.out.println("A got: " + s));
        a.subscribe([[s -> System.out.println("B got: " + s)]]);
        a.publish("hi");
    }
}` }],
    order: [{ id: 'ord-o', title: 'Notification flow', ask: 'Order what happens.', steps: ['Observers implement the listener interface', 'Observers subscribe to the subject', 'The subject\'s state changes', 'The subject loops over a copy of its listeners', 'Each observer reacts in its own way'], extra: ['The subject calls each observer by its concrete class name'] }]
  }
});
})();
