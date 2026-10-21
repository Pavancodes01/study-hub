(function(){
var SRC = `interface PaymentStrategy {
    String pay(int amount);
}

class CardPayment implements PaymentStrategy {
    private final String cardNumber;
    CardPayment(String cardNumber) { this.cardNumber = cardNumber; }
    public String pay(int amount) {
        return "Paid " + amount + " by card ending " + cardNumber.substring(cardNumber.length() - 4);
    }
}

class UpiPayment implements PaymentStrategy {
    private final String upiId;
    UpiPayment(String upiId) { this.upiId = upiId; }
    public String pay(int amount) {
        return "Paid " + amount + " via UPI " + upiId;
    }
}

class Checkout {
    private PaymentStrategy strategy;              // the part that varies
    Checkout(PaymentStrategy strategy) { this.strategy = strategy; }
    void setStrategy(PaymentStrategy strategy) { this.strategy = strategy; }
    String checkout(int amount) {
        return strategy.pay(amount);               // delegate: no if/else here
    }
}

class StrategyDemo {
    public static void main(String[] args) {
        Checkout checkout = new Checkout(new CardPayment("4111222233334444"));
        System.out.println(checkout.checkout(500));
        checkout.setStrategy(new UpiPayment("maya@bank"));
        System.out.println(checkout.checkout(250));
    }
}`;

var classes = { kind: 'class', w: 760, h: 330, classes: [
  { id: 'co', name: 'Checkout', x: 24, y: 40, w: 250, fields: ['- strategy: PaymentStrategy'], methods: ['+ setStrategy(s: PaymentStrategy)', '+ checkout(amount): String'] },
  { id: 'ps', name: 'PaymentStrategy', stereo: 'interface', x: 430, y: 40, w: 230, fields: [], methods: ['+ pay(amount: int): String'] },
  { id: 'card', name: 'CardPayment', x: 330, y: 222, w: 210, fields: ['- cardNumber: String'], methods: ['+ pay(amount: int): String'] },
  { id: 'upi', name: 'UpiPayment', x: 556, y: 222, w: 196, fields: ['- upiId: String'], methods: ['+ pay(amount: int): String'] }
], rels: [
  { from: 'co', to: 'ps', type: 'association', label: 'uses' },
  { from: 'card', to: 'ps', type: 'implements' },
  { from: 'upi', to: 'ps', type: 'implements' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'm', name: 'main' }, { id: 'co', name: 'Checkout' }, { id: 'card', name: 'CardPayment' }, { id: 'upi', name: 'UpiPayment' }], msgs: [
  { from: 'm', to: 'co', label: 'checkout(500)', text: 'The caller only knows `Checkout`. It does not know or care how payment happens.', code: ['System.out.println(checkout.checkout(500));'] },
  { from: 'co', to: 'card', label: 'pay(500)', text: '`Checkout` delegates to whatever strategy it holds. Right now that is a `CardPayment`.', code: ['return strategy.pay(amount);'] },
  { from: 'card', to: 'co', label: '"Paid 500 by card…"', ret: true, text: 'The card strategy does its own work and returns a result.', code: ['return "Paid " + amount + " by card ending "'] },
  { from: 'co', to: 'm', label: 'result', ret: true, text: 'Checkout hands the result back unchanged.', code: ['return strategy.pay(amount);'] },
  { from: 'm', to: 'co', label: 'setStrategy(upi)', text: 'Swap the behaviour at runtime by giving Checkout a different strategy object. No code in Checkout changes.', code: ['checkout.setStrategy(new UpiPayment("maya@bank"));', 'void setStrategy'] },
  { from: 'm', to: 'co', label: 'checkout(250)', text: 'Same call as before...', code: ['System.out.println(checkout.checkout(250));'] },
  { from: 'co', to: 'upi', label: 'pay(250)', text: '...but now it runs the UPI logic. This is the whole pattern: the varying part lives behind an interface.', code: ['return "Paid " + amount + " via UPI " + upiId;'] }
] };

registerPattern({
  slug: 'strategy', order: 11, kind: 'Behavioral', title: 'Strategy',
  one: 'Put each version of an algorithm in its own class behind one interface, so the caller can ==swap behaviour without if/else chains==.',
  analogy: [
    'Getting to the airport: you can drive, take a cab or take the train. The trip is the same, only the way of travelling changes, and you pick one on the day. You do not rebuild your trip plan for each option.',
    'In code: the "trip" is a context class (`Checkout`), the options are strategy classes (`CardPayment`, `UpiPayment`), and they all implement one interface (`PaymentStrategy`). Adding a new option means adding a class, not editing a growing if/else.'
  ],
  use: ['several ways to do the same job (pricing, payment, sorting, routing)', 'a long if/else or switch on a "type" that keeps growing', 'behaviour chosen at runtime or by configuration', 'you want to test each variant on its own'],
  avoid: ['only one or two fixed variants that never change', 'the variants differ by one value (use a parameter)', 'the "strategy" needs most of the context\'s internals'],
  problem: { text: [
    'Every new payment method means editing `checkout` again: the method grows, each edit can break existing methods, and you cannot test card logic without the UPI logic sitting next to it. This breaks the **Open/Closed principle**.'
  ], code: `class Checkout {
    String checkout(String method, int amount) {
        if (method.equals("card")) {
            return "Paid " + amount + " by card";
        } else if (method.equals("upi")) {
            return "Paid " + amount + " via UPI";
        } else if (method.equals("wallet")) {
            return "Paid " + amount + " from wallet";
        }
        throw new IllegalArgumentException("Unknown method " + method);
    }
}` },
  solution: { text: [
    'Pull each branch into its own class that implements `PaymentStrategy`. `Checkout` keeps a reference to the interface and just calls `pay`. A wallet payment is now a new class; `Checkout` never changes.',
    'The caller (or a factory, or Spring) decides which strategy to plug in.'
  ], code: SRC, file: 'StrategyDemo.java', expect: 'Paid 500 by card ending 4444\nPaid 250 via UPI maya@bank' },
  flows: [
    { name: 'Class diagram', title: 'Strategy', diagram: classes, progressive: true, code: '@main', steps: [
      { title: 'The context', add: ['co'], on: ['co'], text: '`Checkout` is the **context**: the class whose behaviour should be swappable. It holds a field of the interface type, never a concrete class.', code: ['class Checkout {', 'private PaymentStrategy strategy;'] },
      { title: 'The strategy interface', add: ['ps'], on: ['ps'], rels: ['co-ps'], text: 'One method that every variant must provide. The context depends only on this.', code: ['interface PaymentStrategy {', 'String pay(int amount);'] },
      { title: 'Concrete strategies', add: ['card', 'upi'], on: ['card', 'upi'], rels: ['card-ps', 'upi-ps'], text: 'Each variant is its own small class with its own data (`cardNumber`, `upiId`). Each can be tested alone.', code: ['class CardPayment implements PaymentStrategy {', 'class UpiPayment implements PaymentStrategy {'] },
      { title: 'Delegate', on: ['co'], rels: ['co-ps'], text: 'The context forwards the work: `strategy.pay(amount)`. No if/else on type anywhere.', code: ['return strategy.pay(amount);'] },
      { title: 'Extend without editing', on: ['ps'], text: 'Need wallet payments? Add `WalletPayment implements PaymentStrategy`. `Checkout` and the existing strategies stay untouched: **open for extension, closed for modification**.', code: ['interface PaymentStrategy {'] }
    ]},
    { name: 'One call', title: 'Checkout calls the current strategy', diagram: seq, code: '@main' }
  ],
  jdk: [
    ['`Comparator` passed to `Collections.sort` / `List.sort`', 'The sort algorithm is fixed; the comparison strategy is plugged in.'],
    ['`java.util.concurrent` `RejectedExecutionHandler`', 'Thread pools take a strategy for what to do when full (abort, caller-runs, discard).'],
    ['Spring `@Qualifier` / injected interfaces', 'Pick an implementation of an interface by configuration.'],
    ['Lambdas', 'A small strategy is often just a lambda: `Function<Integer, Integer> discount = p -> p * 90 / 100;`']
  ],
  related: [
    ['State', 'Same shape. In State the object switches strategies itself as its state changes; in Strategy the caller picks.'],
    ['Template Method', 'Varies steps through inheritance (subclass overrides). Strategy varies through composition (pass an object).'],
    ['Factory Method', 'Often used to choose which strategy to create from a config value.'],
    ['Command', 'Also wraps behaviour in an object, but represents a request to run later, undo or queue.']
  ],
  pitfalls: [
    ['Strategy per tiny difference', 'If variants differ by one number, a parameter beats five classes.'],
    ['Leaking the choice back', 'If the context still does `if (strategy instanceof CardPayment)`, nothing was gained.'],
    ['Fat interface', 'Strategies that throw `UnsupportedOperationException` for half the methods mean the interface is wrong (see ISP).'],
    ['Forgetting the selector', 'Someone still has to choose the strategy; show where (factory, map, config).']
  ],
  probe: [
    ['How is Strategy different from State?', ['Same class diagram. Strategy: the client chooses the behaviour, and strategies do not know about each other. State: the object changes its own behaviour as its state changes, and states usually decide the next state.']],
    ['Who picks the strategy?', ['The client, a factory reading config, or a map from key to strategy: `Map<String, PaymentStrategy> byMethod`. That removes the last if/else.']],
    ['Can you do this without classes in Java?', ['Yes: if the interface has one method it is a functional interface, so strategies can be lambdas or method references. Use classes when strategies have state or several methods.']],
    ['Which SOLID principles does it support?', ['Open/Closed (add variants without editing the context), Single Responsibility (each algorithm in its own class), Dependency Inversion (context depends on an abstraction).']]
  ],
  say: ['The payment logic varies, so I\'ll put each method behind a `PaymentStrategy` interface.', '`Checkout` holds the interface and delegates, so adding a method is a new class, not an edit.', 'A small factory maps the request\'s method to a strategy, so there is no if/else left.'],
  facts: [['context', 'class that holds the strategy'], ['strategy', 'interface for the varying algorithm'], ['OCP', 'add variants, don\'t edit'], ['lambda', 'fine for one-method strategies']],
  checklist: ['Draw the Strategy class diagram from memory.', 'Refactor an if/else on type into strategies.', 'Explain Strategy vs State.', 'Show where the strategy gets chosen.'],
  drills: {
    mcq: [
      { id: 'mcq-which', kind: 'Which pattern?', title: 'Shipping costs', ask: 'Shipping cost is computed differently for standard, express and international orders, and marketing keeps adding new options. Which pattern?', options: [
        ['Strategy: one `ShippingCostStrategy` per option', true, 'Each rule is a class; adding an option adds a class.'],
        ['Singleton', false, 'Singleton controls instance count, not varying behaviour.'],
        ['Observer', false, 'Observer notifies listeners about events.'],
        ['A bigger switch statement', false, 'Every new option edits and risks the existing ones.']
      ]},
      { id: 'mcq-vs-state', title: 'Strategy or State?', ask: 'A `Document` behaves differently in Draft, Review and Published, and moves between them by itself after `submit()` and `approve()`. Which fits best?', options: [
        ['State', true, 'The object changes its own behaviour as its state changes.'],
        ['Strategy', false, 'Strategy is chosen by the client and does not switch itself.'],
        ['Builder', false, 'Builder constructs objects.'],
        ['Adapter', false, 'Adapter converts interfaces.']
      ]}
    ],
    code: [
      { id: 'code-discount', title: 'Discount strategies', ask: 'Complete the strategy pattern for discounts.', run: 'DiscountDemo', expect: '90\n70', code: `interface DiscountStrategy {
    int apply(int price);
}

class TenPercent [[implements DiscountStrategy]] {
    public int apply(int price) { return price * 90 / 100; }
}

class FlatThirty implements DiscountStrategy {
    public int apply(int price) { return price - 30; }
}

class Cart {
    private final [[DiscountStrategy]] discount;
    Cart(DiscountStrategy discount) { this.discount = discount; }
    int total(int price) { return [[discount.apply(price)]]; }
}

class DiscountDemo {
    public static void main(String[] args) {
        System.out.println(new Cart(new TenPercent()).total(100));
        System.out.println(new Cart([[new FlatThirty()]]).total(100));
    }
}` },
      { id: 'code-lambda', title: 'Strategy as a lambda', ask: 'Use a lambda as the strategy.', run: 'LambdaDemo', expect: '80', code: `class LambdaDemo {
    public static void main(String[] args) {
        java.util.function.IntUnaryOperator discount = [[p -> p - 20|price -> price - 20]];
        System.out.println(discount.[[applyAsInt]](100));
    }
}` }
    ],
    order: [
      { id: 'ord-refactor', title: 'Refactor if/else into Strategy', ask: 'Order the refactoring steps.', steps: ['Find the method that switches on a type', 'Define an interface with the varying operation', 'Move each branch into a class implementing the interface', 'Give the context a field of the interface type and delegate to it', 'Choose the strategy outside the context (client or factory)'], extra: ['Add more branches to the switch'] }
    ]
  }
});
})();
