(function(){
var SRC = String.raw`class Inventory { boolean reserve(String sku, int qty) { return qty <= 5; } }
class Payments { String charge(String user, int cents) { return "PAY-" + user + "-" + cents; } }
class Shipping { String schedule(String sku, String address) { return "SHIP-" + sku; } }
class Emails { void send(String user, String text) { System.out.println("email to " + user + ": " + text); } }

class CheckoutFacade {                                  // one simple entry point
    private final Inventory inventory = new Inventory();
    private final Payments payments = new Payments();
    private final Shipping shipping = new Shipping();
    private final Emails emails = new Emails();

    String placeOrder(String user, String sku, int qty, int cents, String address) {
        if (!inventory.reserve(sku, qty)) return "out of stock";
        String pay = payments.charge(user, cents);
        String ship = shipping.schedule(sku, address);
        emails.send(user, "order confirmed " + ship);
        return pay + " " + ship;
    }
}

class FacadeDemo {
    public static void main(String[] args) {
        CheckoutFacade checkout = new CheckoutFacade();
        System.out.println(checkout.placeOrder("maya", "BOOK-1", 1, 1500, "Pune"));
        System.out.println(checkout.placeOrder("ravi", "BOOK-1", 9, 1500, "Delhi"));
    }
}`;
var dg = { kind: 'class', w: 780, h: 330, classes: [
  { id: 'ctl', name: 'OrderController', x: 24, y: 40, w: 190, fields: [], methods: ['+ post(request)'] },
  { id: 'f', name: 'CheckoutFacade', x: 270, y: 30, w: 260, fields: [], methods: ['+ placeOrder(user, sku, qty,', '    cents, address): String'] },
  { id: 'i', name: 'Inventory', x: 20, y: 220, w: 170, fields: [], methods: ['+ reserve(sku, qty)'] },
  { id: 'p', name: 'Payments', x: 210, y: 220, w: 170, fields: [], methods: ['+ charge(user, cents)'] },
  { id: 's', name: 'Shipping', x: 400, y: 220, w: 170, fields: [], methods: ['+ schedule(sku, addr)'] },
  { id: 'e', name: 'Emails', x: 590, y: 220, w: 170, fields: [], methods: ['+ send(user, text)'] }
], rels: [
  { from: 'ctl', to: 'f', type: 'association' },
  { from: 'f', to: 'i', type: 'association' }, { from: 'f', to: 'p', type: 'association' },
  { from: 'f', to: 's', type: 'association' }, { from: 'f', to: 'e', type: 'association' }
] };
var seq = { kind: 'seq', w: 820, parts: [{ id: 'c', name: 'Client' }, { id: 'f', name: 'CheckoutFacade' }, { id: 'i', name: 'Inventory' }, { id: 'p', name: 'Payments' }, { id: 's', name: 'Shipping' }], msgs: [
  { from: 'c', to: 'f', label: 'placeOrder(...)', text: 'One call from the client.', code: ['String placeOrder(String user, String sku, int qty, int cents, String address) {'] },
  { from: 'f', to: 'i', label: 'reserve(sku, 1)', text: 'The facade knows the right order of steps.', code: ['if (!inventory.reserve(sku, qty)) return "out of stock";'] },
  { from: 'f', to: 'p', label: 'charge(user, 1500)', text: 'Then payment.', code: ['String pay = payments.charge(user, cents);'] },
  { from: 'f', to: 's', label: 'schedule(sku, addr)', text: 'Then shipping (and an email after it).', code: ['String ship = shipping.schedule(sku, address);', 'emails.send(user, "order confirmed " + ship);'] },
  { from: 'f', to: 'c', label: '"PAY-… SHIP-…"', ret: true, text: 'The client got a whole checkout without knowing four subsystems.', code: ['return pay + " " + ship;'] }
] };
registerPattern({
  slug: 'facade', order: 8, kind: 'Structural', title: 'Facade',
  one: 'Give a complex subsystem ==one simple front door== so clients call one method instead of coordinating many classes.',
  analogy: ['A hotel concierge: you ask for "dinner and a taxi at 8" and they call the restaurant, the taxi company and the front desk. You do not need their phone numbers.', 'A facade class holds the subsystem objects and exposes a few high-level methods. The subsystem classes still exist and can be used directly when needed.'],
  use: ['clients repeat the same multi-step sequence of calls', 'you want to hide a messy or legacy subsystem', 'layering: a service API in front of many internals'],
  avoid: ['the facade turns into a god class doing all the business logic', 'clients really need fine-grained control'],
  problem: { text: ['Every controller repeats inventory → payment → shipping → email in the right order, and each copy drifts.'], code: String.raw`class Inventory { boolean reserve(String s, int q) { return true; } }
class Payments { String charge(String u, int c) { return "PAY"; } }
class OrderController {
    String post(String user, String sku) {
        new Inventory().reserve(sku, 1);           // copied into every controller...
        return new Payments().charge(user, 1500);  // ...and the steps drift apart over time
    }
}` },
  solution: { text: ['`CheckoutFacade.placeOrder(...)` performs the sequence once. Controllers, CLI tools and tests call that one method.'], code: SRC, file: 'FacadeDemo.java', expect: 'email to maya: order confirmed SHIP-BOOK-1\nPAY-maya-1500 SHIP-BOOK-1\nout of stock' },
  flows: [
    { name: 'Class diagram', title: 'Facade', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The subsystem', add: ['i', 'p', 's', 'e'], on: ['i', 'p', 's', 'e'], text: 'Four classes, each with its own API.', code: ['class Inventory', 'class Payments', 'class Shipping', 'class Emails'] },
      { title: 'The facade', add: ['f'], on: ['f'], text: 'Holds the subsystem objects and offers one method for the common task.', code: ['class CheckoutFacade {', 'String placeOrder('] },
      { title: 'Clients use the front door', add: ['ctl'], on: ['ctl'], rels: ['ctl-f'], text: 'The controller depends on one class instead of four.', code: ['CheckoutFacade checkout = new CheckoutFacade();'] }
    ]},
    { name: 'Place an order', title: 'One call, four subsystems', diagram: seq, code: '@main' }
  ],
  jdk: [['`javax.faces.context.FacesContext`', 'One entry point to request, response and session state.'], ['SLF4J `LoggerFactory`', 'A simple front over many logging backends.'], ['Spring `JdbcTemplate`', 'Hides connections, statements, result sets and exception translation.']],
  related: [['Adapter', 'Makes one class fit an existing interface; facade defines a new, simpler interface over many.'], ['Mediator', 'Coordinates peers that talk to each other; facade is one-way, clients to subsystem.'], ['Singleton', 'Facades are often single instances.']],
  pitfalls: [['God facade', 'If it contains all business rules, split it by use case.'], ['Hiding too much', 'Keep the subsystem accessible for advanced use.'], ['Facade per call', 'A facade method for every subsystem method adds nothing.']],
  probe: [['Facade vs Adapter?', ['Adapter converts one interface into another that already exists. Facade invents a new, simpler interface over several classes.']], ['Is a service layer a facade?', ['Often yes: an `OrderService.placeOrder` that coordinates repositories and gateways is a facade over them.']]],
  say: ['Controllers call one `CheckoutFacade.placeOrder`, which runs inventory, payment, shipping and email in order.'],
  facts: [['one door', 'simple high-level API'], ['still open', 'subsystem usable directly'], ['watch', 'god-class growth']],
  checklist: ['Draw a facade over a subsystem.', 'Explain facade vs adapter.'],
  drills: {
    mcq: [{ id: 'mcq-f', kind: 'Which pattern?', title: 'Video conversion', ask: 'Converting a video needs a codec factory, bitrate reader, audio mixer and file writer called in the right order. Most callers just want `convert(file, "mp4")`. Pattern?', options: [['Facade', true, 'One simple method over the subsystem.'], ['Decorator', false, 'Adds layers to one object.'], ['Observer', false, 'Notifications.'], ['Prototype', false, 'Copying objects.']] }],
    code: [{ id: 'code-f', title: 'Write the facade method', ask: 'Coordinate the subsystem in one method.', run: 'HomeDemo', expect: 'lights dim, projector on, play movie', code: String.raw`class Lights { String dim() { return "lights dim"; } }
class Projector { String on() { return "projector on"; } }
class Player { String play(String m) { return "play " + m; } }
class HomeTheater {
    private final Lights lights = new Lights();
    private final Projector projector = new Projector();
    private final Player player = new Player();
    String watch(String movie) {
        return [[lights.dim()]] + ", " + projector.on() + ", " + [[player.play(movie)]];
    }
}
class HomeDemo { public static void main(String[] a) { System.out.println(new [[HomeTheater()]].watch("movie")); } }` }],
    order: [{ id: 'ord-f', title: 'Introduce a facade', ask: 'Order the steps.', steps: ['Find a call sequence repeated across clients', 'Create a facade class holding the subsystem objects', 'Add a method that performs the sequence', 'Switch clients to the facade method'], extra: ['Delete the subsystem classes'] }]
  }
});
})();
