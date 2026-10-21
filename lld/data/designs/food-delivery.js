(function(){
var SRC = String.raw`import java.util.*;

record Location(int x, int y) {
    int distanceTo(Location o) { return Math.abs(x - o.x) + Math.abs(y - o.y); }
}
record MenuItem(String name, int price) {}

class Restaurant {
    final String name;
    final Location location;
    final Map<String, MenuItem> menu = new HashMap<>();
    Restaurant(String name, Location location) { this.name = name; this.location = location; }
    void add(MenuItem item) { menu.put(item.name(), item); }
}

class DeliveryAgent {
    final String name;
    final Location location;
    boolean available = true;
    DeliveryAgent(String name, Location location) { this.name = name; this.location = location; }
}

enum OrderStatus {
    PLACED, ACCEPTED, PICKED_UP, DELIVERED, CANCELLED;
    boolean canMoveTo(OrderStatus next) {                       // allowed transitions live with the states
        return switch (this) {
            case PLACED -> next == ACCEPTED || next == CANCELLED;
            case ACCEPTED -> next == PICKED_UP || next == CANCELLED;
            case PICKED_UP -> next == DELIVERED;
            default -> false;
        };
    }
}

class Order {
    final int id;
    final String customer;
    final Restaurant restaurant;
    final List<MenuItem> items;
    final int total;
    OrderStatus status = OrderStatus.PLACED;
    DeliveryAgent agent;
    Order(int id, String customer, Restaurant restaurant, List<MenuItem> items, int total) {
        this.id = id; this.customer = customer; this.restaurant = restaurant; this.items = items; this.total = total;
    }
}

interface OrderListener { void onStatus(Order o); }

interface AssignmentStrategy { Optional<DeliveryAgent> pick(List<DeliveryAgent> agents, Restaurant r); }

class NearestAgent implements AssignmentStrategy {
    public Optional<DeliveryAgent> pick(List<DeliveryAgent> agents, Restaurant r) {
        return agents.stream().filter(a -> a.available)
            .min(Comparator.comparingInt(a -> a.location.distanceTo(r.location)));
    }
}

class OrderService {
    private final List<DeliveryAgent> agents;
    private final AssignmentStrategy assignment;
    private final List<OrderListener> listeners = new ArrayList<>();
    private int nextId = 1;
    OrderService(List<DeliveryAgent> agents, AssignmentStrategy assignment) { this.agents = agents; this.assignment = assignment; }

    void subscribe(OrderListener l) { listeners.add(l); }

    synchronized Order place(String customer, Restaurant r, List<String> itemNames) {
        List<MenuItem> items = itemNames.stream().map(r.menu::get).toList();
        int total = items.stream().mapToInt(MenuItem::price).sum();
        Order o = new Order(nextId++, customer, r, items, total);
        publish(o);
        return o;
    }

    synchronized void accept(Order o) {
        DeliveryAgent a = assignment.pick(agents, o.restaurant).orElseThrow(() -> new IllegalStateException("no agent free"));
        a.available = false;
        o.agent = a;
        move(o, OrderStatus.ACCEPTED);
    }
    synchronized void pickUp(Order o) { move(o, OrderStatus.PICKED_UP); }
    synchronized void deliver(Order o) { move(o, OrderStatus.DELIVERED); o.agent.available = true; }
    synchronized void cancel(Order o) {
        move(o, OrderStatus.CANCELLED);
        if (o.agent != null) o.agent.available = true;
    }

    private void move(Order o, OrderStatus next) {
        if (!o.status.canMoveTo(next)) throw new IllegalStateException(o.status + " -> " + next + " not allowed");
        o.status = next;
        publish(o);
    }
    private void publish(Order o) { for (OrderListener l : listeners) l.onStatus(o); }
}

class FoodDeliveryDemo {
    public static void main(String[] args) {
        Restaurant r = new Restaurant("Spice Hub", new Location(0, 0));
        r.add(new MenuItem("Biryani", 250));
        r.add(new MenuItem("Lassi", 60));
        DeliveryAgent arun = new DeliveryAgent("Arun", new Location(5, 5));
        DeliveryAgent bela = new DeliveryAgent("Bela", new Location(1, 2));
        OrderService service = new OrderService(List.of(arun, bela), new NearestAgent());
        service.subscribe(o -> System.out.println("order " + o.id + " " + o.status + (o.agent != null ? " by " + o.agent.name : "")));

        Order o = service.place("maya", r, List.of("Biryani", "Lassi"));
        System.out.println("total " + o.total);
        service.accept(o);
        service.pickUp(o);
        try { service.cancel(o); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        service.deliver(o);
        System.out.println("Bela free: " + bela.available);
    }
}`;
var dg = { kind: 'class', w: 880, h: 495, classes: [
  { id: 'svc', name: 'OrderService', x: 20, y: 20, w: 270, fields: ['- agents: List<DeliveryAgent>', '- assignment: AssignmentStrategy', '- listeners: List<OrderListener>'], methods: ['+ place(customer, r, items)', '+ accept(o), pickUp(o)', '+ deliver(o), cancel(o)'] },
  { id: 'order', name: 'Order', x: 360, y: 20, w: 230, fields: ['- items: List<MenuItem>', '- total: int', '- status: OrderStatus', '- agent: DeliveryAgent'], methods: [] },
  { id: 'st', name: 'OrderStatus', stereo: 'enumeration', x: 650, y: 20, w: 210, fields: ['PLACED, ACCEPTED', 'PICKED_UP, DELIVERED', 'CANCELLED'], methods: ['+ canMoveTo(next)'] },
  { id: 'rest', name: 'Restaurant', x: 360, y: 240, w: 230, fields: ['- location: Location', '- menu: Map<String, MenuItem>'], methods: [] },
  { id: 'agent', name: 'DeliveryAgent', x: 650, y: 240, w: 210, fields: ['- location: Location', '- available: boolean'], methods: [] },
  { id: 'as', name: 'AssignmentStrategy', stereo: 'interface', x: 20, y: 250, w: 270, fields: [], methods: ['+ pick(agents, restaurant)'] },
  { id: 'near', name: 'NearestAgent', x: 20, y: 390, w: 200, fields: [], methods: [] },
  { id: 'ol', name: 'OrderListener', stereo: 'interface', x: 360, y: 390, w: 230, fields: [], methods: ['+ onStatus(order)'] }
], rels: [
  { from: 'svc', to: 'order', type: 'dependency', label: 'creates' },
  { from: 'order', to: 'st', type: 'association' },
  { from: 'order', to: 'rest', type: 'association' },
  { from: 'order', to: 'agent', type: 'association' },
  { from: 'svc', to: 'as', type: 'association' },
  { from: 'near', to: 'as', type: 'implements' },
  { from: 'svc', to: 'ol', type: 'aggregation', tm: '*' }
] };
var seq = { kind: 'seq', w: 820, parts: [{ id: 'r', name: 'Restaurant app' }, { id: 's', name: 'OrderService' }, { id: 'n', name: 'NearestAgent' }, { id: 'l', name: 'Listeners' }], msgs: [
  { from: 'r', to: 's', label: 'accept(order 1)', text: 'The restaurant accepts the order.', code: ['service.accept(o);', 'synchronized void accept(Order o) {'] },
  { from: 's', to: 'n', label: 'pick(agents, Spice Hub)', text: 'Assignment is a strategy: here, the closest free agent.', code: ['DeliveryAgent a = assignment.pick(agents, o.restaurant)'] },
  { from: 'n', to: 's', label: 'Bela (distance 3)', ret: true, text: 'Bela is 3 blocks away, Arun 10.', code: ['.min(Comparator.comparingInt(a -> a.location.distanceTo(r.location)));'] },
  { from: 's', to: 's', label: 'move(ACCEPTED)', text: 'The status enum checks the transition is allowed (PLACED → ACCEPTED).', code: ['if (!o.status.canMoveTo(next)) throw new IllegalStateException', 'case PLACED -> next == ACCEPTED || next == CANCELLED;'] },
  { from: 's', to: 'l', label: 'onStatus(order)', text: 'Every listener (customer app, restaurant, analytics) hears about it.', code: ['private void publish(Order o) { for (OrderListener l : listeners) l.onStatus(o); }'] }
] };
registerDesign({
  slug: 'food-delivery', order: 12, title: 'Food delivery (Swiggy / Zomato)',
  one: 'Orders move through ==allowed status transitions==, the nearest free agent is chosen by a ==swappable strategy==, and every status change is ==published to listeners==.',
  questions: ['Which actors: customer, restaurant, delivery agent, admin?', 'Order lifecycle and who can cancel when?', 'How is an agent chosen: nearest, least busy, rating?', 'Pricing: delivery fee, surge, coupons?', 'Real-time tracking in scope?'],
  reqs: { func: ['Browse a restaurant menu and place an order', 'Restaurant accepts; an agent is assigned', 'Status updates: picked up, delivered, cancelled', 'Notify customer and restaurant on every change'], nonfunc: ['Illegal transitions rejected (no cancel after pickup)', 'Assignment policy swappable', 'Two orders never get the same agent'], out: ['payments', 'ratings', 'live GPS tracking', 'search'] },
  entities: [['order', '`Order`', 'Items, total, status, agent'], ['status', '`OrderStatus` enum', 'Lifecycle and allowed transitions'], ['restaurant', '`Restaurant`', 'Location and menu'], ['menu item', '`MenuItem`', 'Name and price'], ['delivery agent', '`DeliveryAgent`', 'Location, availability'], ['assignment rule', '`AssignmentStrategy`', 'Pick an agent'], ['notification', '`OrderListener`', 'React to status changes']],
  diagramNotes: ['`OrderStatus` is an enum that knows its own allowed transitions (`canMoveTo`): a compact State pattern. `OrderService` is the only place status changes, and it always publishes the change.', 'Assignment is a strategy because ops teams constantly tune it (nearest, least busy, batching).'],
  flowNotes: ['Accept: pick an agent with the strategy, mark them busy, move status, publish.'],
  flows: [
    { name: 'Class diagram', title: 'Food delivery classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Order and lifecycle', add: ['order', 'st'], on: ['order', 'st'], text: 'The enum encodes which transitions are legal.', code: ['class Order {', 'boolean canMoveTo(OrderStatus next) {'] },
      { title: 'Restaurant and agents', add: ['rest', 'agent'], on: ['rest', 'agent'], text: 'Both have locations; agents have availability.', code: ['class Restaurant {', 'class DeliveryAgent {'] },
      { title: 'The service', add: ['svc'], on: ['svc'], rels: ['svc-order'], text: 'All status changes go through one service.', code: ['class OrderService {', 'private void move(Order o, OrderStatus next) {'] },
      { title: 'Assignment strategy', add: ['as', 'near'], on: ['as', 'near'], rels: ['svc-as'], text: 'Nearest free agent today; another rule tomorrow.', code: ['interface AssignmentStrategy', 'class NearestAgent implements AssignmentStrategy {'] },
      { title: 'Listeners', add: ['ol'], on: ['ol'], rels: ['svc-ol'], text: 'Customer app, restaurant app and analytics subscribe to changes.', code: ['interface OrderListener', 'private void publish(Order o)'] }
    ]},
    { name: 'Accept an order', title: 'Assign an agent and notify', diagram: seq, code: '@main' }
  ],
  patterns: [['State (enum form)', '`OrderStatus.canMoveTo`', 'Illegal transitions rejected in one place.'], ['Strategy', '`AssignmentStrategy`', 'Tunable agent selection.'], ['Observer', '`OrderListener`', 'Notifications without coupling.'], ['Facade', '`OrderService`', 'One API for the whole lifecycle.']],
  code: { file: 'FoodDeliveryDemo.java', src: SRC, expect: 'order 1 PLACED\ntotal 310\norder 1 ACCEPTED by Bela\norder 1 PICKED_UP by Bela\nPICKED_UP -> CANCELLED not allowed\norder 1 DELIVERED by Bela\nBela free: true' },
  concurrency: [['Two orders pick the same agent', '`accept` is synchronized: pick and mark busy happen together. At scale, use an atomic compare-and-set on the agent.'], ['Status changed by two actors at once', 'All transitions go through synchronized methods on the service (or a per-order lock).'], ['Slow listeners', 'Publish to a queue/executor so the order flow is not blocked.']],
  extensions: [['Batching two orders to one agent', 'New assignment strategy that considers route overlap.'], ['Payments', '`PaymentStrategy`; order moves to ACCEPTED only after payment.'], ['Live tracking', 'Agents stream locations; listeners push them to the customer.'], ['Ratings', 'After DELIVERED, create a Rating for restaurant and agent.']],
  probe: [['How do you stop invalid transitions like cancel after pickup?', ['Keep allowed transitions in one place (the status enum or State classes) and route every change through a method that checks them.']], ['How is an agent chosen?', ['A strategy: nearest available by distance today, swappable for least-busy or batching without touching the service.']], ['How do you make sure an agent is not assigned twice?', ['Pick-and-mark-busy must be atomic: synchronized here; in a distributed system, a conditional update on the agent row or a Redis lock.']]],
  say: ['Order status is an enum that knows its allowed transitions, and every change goes through the service.', 'Agent selection is a strategy; today the nearest free agent.', 'Status changes are published to listeners for customers, restaurants and analytics.'],
  facts: [['status', 'enum with canMoveTo'], ['assign', 'Strategy'], ['notify', 'Observer'], ['atomic', 'pick + mark busy']],
  checklist: ['Draw the classes and the status lifecycle.', 'Write canMoveTo and the move method.', 'Explain agent assignment and its concurrency.'],
  drills: {
    mcq: [{ id: 'mcq-fd', title: 'Late cancel', ask: 'A customer cancels after the food is picked up. What should happen?', options: [['The transition is rejected by the status rules', true, 'PICKED_UP can only move to DELIVERED.'], ['The order is cancelled and the agent keeps the food', false, 'Breaks the business rule.'], ['Delete the order', false, 'Loses history.'], ['Silently ignore', false, 'Callers need to know it failed.']] }],
    code: [{ id: 'code-fd', title: 'Allowed transitions', ask: 'Complete the transition rules.', run: 'StatusDemo', expect: 'true\nfalse', code: String.raw`enum Status {
    PLACED, ACCEPTED, DELIVERED;
    boolean canMoveTo(Status next) {
        return switch (this) {
            case PLACED -> next == [[ACCEPTED]];
            case ACCEPTED -> next == DELIVERED;
            default -> [[false]];
        };
    }
}
class StatusDemo { public static void main(String[] a) { System.out.println(Status.PLACED.canMoveTo(Status.ACCEPTED)); System.out.println(Status.DELIVERED.canMoveTo([[Status.PLACED]])); } }` }],
    order: [{ id: 'ord-fd', title: 'Order lifecycle', ask: 'Order the statuses of a successful order.', steps: ['PLACED', 'ACCEPTED (agent assigned)', 'PICKED_UP', 'DELIVERED'], extra: ['CANCELLED after PICKED_UP'] }],
    classes: { id: 'cls-fd', title: 'Design food delivery', reqs: ['Customers order from restaurants', 'Agents assigned by a tunable rule', 'Everyone notified on status changes'], parts: [['Order', 'must', 'Items, total, status.'], ['OrderStatus with transitions', 'must', 'Lifecycle rules.'], ['Restaurant + MenuItem', 'must', 'What can be ordered.'], ['DeliveryAgent', 'must', 'Who delivers.'], ['AssignmentStrategy', 'must', 'Pick an agent.'], ['OrderListener', 'good', 'Notifications.'], ['Status as free-form String', 'no', 'No transition safety.'], ['Separate Order subclass per status', 'no', 'Status changes over time; it is state, not type.']] }
  }
});
})();
