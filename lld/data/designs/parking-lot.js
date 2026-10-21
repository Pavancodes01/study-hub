(function(){
var SRC = `import java.util.*;

enum SpotSize { SMALL, MEDIUM, LARGE }

abstract class Vehicle {
    private final String plate;
    Vehicle(String plate) { this.plate = plate; }
    String plate() { return plate; }
    abstract SpotSize size();
}

class Bike extends Vehicle {
    Bike(String plate) { super(plate); }
    SpotSize size() { return SpotSize.SMALL; }
}

class Car extends Vehicle {
    Car(String plate) { super(plate); }
    SpotSize size() { return SpotSize.MEDIUM; }
}

class Truck extends Vehicle {
    Truck(String plate) { super(plate); }
    SpotSize size() { return SpotSize.LARGE; }
}

class ParkingSpot {
    private final String id;
    private final SpotSize size;
    private Vehicle vehicle;                         // null when free
    ParkingSpot(String id, SpotSize size) { this.id = id; this.size = size; }
    boolean canFit(Vehicle v) { return vehicle == null && v.size().ordinal() <= size.ordinal(); }
    void park(Vehicle v) { vehicle = v; }
    void free() { vehicle = null; }
    String id() { return id; }
}

class ParkingFloor {
    private final int number;
    private final List<ParkingSpot> spots = new ArrayList<>();
    ParkingFloor(int number) { this.number = number; }
    void addSpot(ParkingSpot s) { spots.add(s); }
    Optional<ParkingSpot> findSpot(Vehicle v) {
        return spots.stream().filter(s -> s.canFit(v)).findFirst();
    }
}

class Ticket {
    final String id;
    final Vehicle vehicle;
    final ParkingSpot spot;
    final long entryMinute;
    Ticket(String id, Vehicle vehicle, ParkingSpot spot, long entryMinute) {
        this.id = id; this.vehicle = vehicle; this.spot = spot; this.entryMinute = entryMinute;
    }
}

interface PricingStrategy {
    int fee(Ticket t, long exitMinute);
}

class HourlyPricing implements PricingStrategy {
    private final Map<SpotSize, Integer> ratePerHour =
        Map.of(SpotSize.SMALL, 10, SpotSize.MEDIUM, 20, SpotSize.LARGE, 40);
    public int fee(Ticket t, long exitMinute) {
        long hours = Math.max(1, (exitMinute - t.entryMinute + 59) / 60);   // round up, at least 1
        return (int) hours * ratePerHour.get(t.vehicle.size());
    }
}

class ParkingLot {
    private final List<ParkingFloor> floors = new ArrayList<>();
    private final Map<String, Ticket> active = new HashMap<>();
    private final PricingStrategy pricing;
    private int nextTicket = 1;
    ParkingLot(PricingStrategy pricing) { this.pricing = pricing; }
    void addFloor(ParkingFloor f) { floors.add(f); }

    synchronized Ticket park(Vehicle v, long nowMinute) {
        for (ParkingFloor f : floors) {
            Optional<ParkingSpot> spot = f.findSpot(v);
            if (spot.isPresent()) {
                spot.get().park(v);
                Ticket t = new Ticket("T" + nextTicket++, v, spot.get(), nowMinute);
                active.put(t.id, t);
                return t;
            }
        }
        throw new IllegalStateException("Lot full for " + v.plate());
    }

    synchronized int unpark(String ticketId, long nowMinute) {
        Ticket t = active.remove(ticketId);
        if (t == null) throw new IllegalArgumentException("Unknown ticket " + ticketId);
        t.spot.free();
        return pricing.fee(t, nowMinute);
    }
}

class ParkingLotDemo {
    public static void main(String[] args) {
        ParkingFloor ground = new ParkingFloor(0);
        ground.addSpot(new ParkingSpot("G-S1", SpotSize.SMALL));
        ground.addSpot(new ParkingSpot("G-M1", SpotSize.MEDIUM));
        ground.addSpot(new ParkingSpot("G-L1", SpotSize.LARGE));
        ParkingLot lot = new ParkingLot(new HourlyPricing());
        lot.addFloor(ground);

        Ticket car = lot.park(new Car("KA01AB1234"), 0);
        System.out.println(car.vehicle.plate() + " -> " + car.spot.id());
        Ticket bike = lot.park(new Bike("KA02XY9"), 10);
        System.out.println(bike.vehicle.plate() + " -> " + bike.spot.id());
        System.out.println("Car pays " + lot.unpark(car.id, 150));
        try {
            lot.park(new Truck("TRK1"), 160);
            lot.park(new Truck("TRK2"), 161);
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());
        }
    }
}`;
var classes = { kind: 'class', w: 920, h: 620, classes: [
  { id: 'lot', name: 'ParkingLot', x: 20, y: 20, w: 280, fields: ['- floors: List<ParkingFloor>', '- active: Map<String, Ticket>', '- pricing: PricingStrategy'], methods: ['+ park(v, now): Ticket', '+ unpark(id, now): int'] },
  { id: 'ps', name: 'PricingStrategy', stereo: 'interface', x: 370, y: 20, w: 220, fields: [], methods: ['+ fee(t, exitMinute): int'] },
  { id: 'hp', name: 'HourlyPricing', x: 640, y: 20, w: 272, fields: ['- ratePerHour: Map<SpotSize,Integer>'], methods: ['+ fee(t, exitMinute): int'] },
  { id: 'floor', name: 'ParkingFloor', x: 20, y: 230, w: 280, fields: ['- number: int', '- spots: List<ParkingSpot>'], methods: ['+ findSpot(v): Optional<ParkingSpot>'] },
  { id: 'ticket', name: 'Ticket', x: 370, y: 200, w: 220, fields: ['- id: String', '- vehicle: Vehicle', '- spot: ParkingSpot', '- entryMinute: long'], methods: [] },
  { id: 'enum', name: 'SpotSize', stereo: 'enumeration', x: 690, y: 200, w: 200, fields: ['SMALL', 'MEDIUM', 'LARGE'], methods: [] },
  { id: 'spot', name: 'ParkingSpot', x: 20, y: 410, w: 250, fields: ['- id: String', '- size: SpotSize', '- vehicle: Vehicle'], methods: ['+ canFit(v): boolean', '+ park(v)', '+ free()'] },
  { id: 'veh', name: 'Vehicle', stereo: 'abstract', x: 380, y: 400, w: 210, fields: ['- plate: String'], methods: ['+ size(): SpotSize'] },
  { id: 'bike', name: 'Bike', x: 330, y: 540, w: 100, fields: [], methods: [] },
  { id: 'car', name: 'Car', x: 450, y: 540, w: 100, fields: [], methods: [] },
  { id: 'truck', name: 'Truck', x: 570, y: 540, w: 100, fields: [], methods: [] }
], rels: [
  { from: 'lot', to: 'floor', type: 'composition', fm: '1', tm: '1..*' },
  { from: 'floor', to: 'spot', type: 'composition', fm: '1', tm: '*' },
  { from: 'lot', to: 'ps', type: 'association' },
  { from: 'hp', to: 'ps', type: 'implements' },
  { from: 'lot', to: 'ticket', type: 'aggregation', fm: '1', tm: '*' },
  { from: 'ticket', to: 'spot', type: 'association' },
  { from: 'ticket', to: 'veh', type: 'association' },
  { from: 'bike', to: 'veh', type: 'inherits' },
  { from: 'car', to: 'veh', type: 'inherits' },
  { from: 'truck', to: 'veh', type: 'inherits' },
  { from: 'veh', to: 'enum', type: 'dependency' }
] };
var park = { kind: 'seq', w: 860, parts: [{ id: 'm', name: 'Entry gate' }, { id: 'lot', name: 'ParkingLot' }, { id: 'floor', name: 'ParkingFloor' }, { id: 'spot', name: 'ParkingSpot' }], msgs: [
  { from: 'm', to: 'lot', label: 'park(car, 0)', text: 'A car arrives. The gate asks the lot for a ticket. `park` is `synchronized`, so two gates cannot grab the same spot.', code: ['synchronized Ticket park(Vehicle v, long nowMinute) {', 'Ticket car = lot.park(new Car("KA01AB1234"), 0);'] },
  { from: 'lot', to: 'floor', label: 'findSpot(car)', text: 'The lot walks its floors in order and asks each for a free spot.', code: ['Optional<ParkingSpot> spot = f.findSpot(v);'] },
  { from: 'floor', to: 'spot', label: 'canFit(car)', text: 'A spot fits when it is empty and at least as big as the vehicle (`ordinal` comparison on `SpotSize`).', code: ['boolean canFit(Vehicle v)'] },
  { from: 'spot', to: 'floor', label: 'true (G-M1)', ret: true, text: 'The small spot is too small for a car; the medium one fits.', code: ['return spots.stream().filter(s -> s.canFit(v)).findFirst();'] },
  { from: 'floor', to: 'lot', label: 'Optional[G-M1]', ret: true, text: 'The floor returns the spot wrapped in an `Optional`.', code: ['if (spot.isPresent()) {'] },
  { from: 'lot', to: 'spot', label: 'park(car)', text: 'Mark the spot taken.', code: ['spot.get().park(v);'] },
  { from: 'lot', to: 'm', label: 'Ticket T1', ret: true, text: 'Create a ticket, remember it in `active`, give it to the driver.', code: ['Ticket t = new Ticket("T" + nextTicket++, v, spot.get(), nowMinute);', 'active.put(t.id, t);'] }
] };
var leave = { kind: 'seq', w: 860, parts: [{ id: 'm', name: 'Exit gate' }, { id: 'lot', name: 'ParkingLot' }, { id: 'spot', name: 'ParkingSpot' }, { id: 'price', name: 'HourlyPricing' }], msgs: [
  { from: 'm', to: 'lot', label: 'unpark("T1", 150)', text: 'The driver leaves after 150 minutes and hands in ticket T1.', code: ['synchronized int unpark(String ticketId, long nowMinute) {'] },
  { from: 'lot', to: 'lot', label: 'active.remove("T1")', text: 'Look up and remove the ticket. Unknown ticket? Reject it.', code: ['Ticket t = active.remove(ticketId);'] },
  { from: 'lot', to: 'spot', label: 'free()', text: 'The spot is free again for the next vehicle.', code: ['t.spot.free();'] },
  { from: 'lot', to: 'price', label: 'fee(T1, 150)', text: 'Pricing is a **strategy**: the lot does not know the formula, so weekend or flat pricing is just another class.', code: ['return pricing.fee(t, nowMinute);'] },
  { from: 'price', to: 'lot', label: '60', ret: true, text: '150 minutes rounds up to 3 hours × 20 for a medium spot = 60.', code: ['long hours = Math.max(1, (exitMinute - t.entryMinute + 59) / 60);'] },
  { from: 'lot', to: 'm', label: '60', ret: true, text: 'The gate shows the amount and opens.', code: ['System.out.println("Car pays " + lot.unpark(car.id, 150));'] }
] };

registerDesign({
  slug: 'parking-lot', order: 1, title: 'Parking lot',
  one: 'Model floors, spots of different sizes, vehicles, tickets and pricing so that ==finding a spot, issuing a ticket and charging on exit== are each one clear responsibility.',
  questions: ['Which vehicle types, and which spot sizes? Can a bike use a car spot?', 'Several floors? Several entry and exit gates at once?', 'How is the fee calculated? Will that change (weekend, EV charging)?', 'Do we need reservations, or first come first served?', 'What happens when the lot is full?'],
  reqs: {
    func: ['Park a vehicle in the smallest free spot that fits', 'Issue a ticket on entry', 'Free the spot and compute the fee on exit', 'Support several floors'],
    nonfunc: ['Two gates must never assign the same spot', 'New vehicle types and pricing rules without rewriting existing classes', 'Simple to test'],
    out: ['payment processing', 'reservations', 'display boards', 'license plate cameras']
  },
  entities: [
    ['parking lot', '`ParkingLot`', 'Entry point: park, unpark, active tickets'],
    ['floor', '`ParkingFloor`', 'Owns spots, finds a free one'],
    ['spot', '`ParkingSpot`', 'Size, occupancy, can a vehicle fit'],
    ['vehicle (bike, car, truck)', '`Vehicle` (abstract) + subclasses', 'Knows its required size'],
    ['size', '`SpotSize` (enum)', 'SMALL < MEDIUM < LARGE ordering'],
    ['ticket', '`Ticket`', 'Who parked where and when'],
    ['fee rules', '`PricingStrategy` + `HourlyPricing`', 'Compute the fee; swappable']
  ],
  diagramNotes: [
    '`ParkingLot` **owns** its floors, and each floor owns its spots (filled diamonds: they live and die with the lot). Tickets are tracked by the lot while active (hollow diamond).',
    'Vehicles share an abstract `Vehicle` with one abstract method `size()`. Adding an `ElectricCar` is one new subclass.',
    'Pricing sits behind `PricingStrategy`, so a weekend rate never touches `ParkingLot`.'
  ],
  flowNotes: ['**Park:** gate → lot → floors → spot; the first spot that fits wins and a ticket is issued. **Pay and leave:** lot removes the ticket, frees the spot, asks the pricing strategy for the fee.'],
  flows: [
    { name: 'Class diagram', title: 'Parking lot classes', diagram: classes, progressive: true, code: '@main', steps: [
      { title: 'Start from the entry point', add: ['lot'], on: ['lot'], text: 'One class that the gates talk to. Its public API is the use cases: `park` and `unpark`.', code: ['class ParkingLot {', 'synchronized Ticket park(Vehicle v, long nowMinute) {', 'synchronized int unpark(String ticketId, long nowMinute) {'] },
      { title: 'Floors and spots', add: ['floor', 'spot'], on: ['floor', 'spot'], rels: ['lot-floor', 'floor-spot'], text: 'Composition all the way down: a lot has floors, a floor has spots. Each spot knows whether a vehicle fits.', code: ['class ParkingFloor {', 'class ParkingSpot {', 'boolean canFit(Vehicle v)'] },
      { title: 'Vehicles and sizes', add: ['veh', 'bike', 'car', 'truck', 'enum'], on: ['veh', 'enum'], text: 'An abstract `Vehicle` with `size()`. The `SpotSize` enum is ordered, so "fits" is just `vehicle size ≤ spot size`.', code: ['abstract class Vehicle {', 'enum SpotSize { SMALL, MEDIUM, LARGE }', 'class Car extends Vehicle {'] },
      { title: 'Tickets', add: ['ticket'], on: ['ticket'], rels: ['lot-ticket', 'ticket-spot', 'ticket-veh'], text: 'A ticket records vehicle, spot and entry time. The lot keeps active tickets in a map by ID.', code: ['class Ticket {', 'private final Map<String, Ticket> active = new HashMap<>();'] },
      { title: 'Pricing as a strategy', add: ['ps', 'hp'], on: ['ps', 'hp'], rels: ['lot-ps', 'hp-ps'], text: 'Fee rules change most often, so they go behind an interface. `HourlyPricing` is one implementation.', code: ['interface PricingStrategy {', 'class HourlyPricing implements PricingStrategy {'] },
      { title: 'Thread safety', on: ['lot'], text: 'Many gates call `park` at once. Making `park` and `unpark` `synchronized` means find-and-take is atomic: two cars can never get the same spot.', code: ['synchronized Ticket park(Vehicle v, long nowMinute) {', 'synchronized int unpark(String ticketId, long nowMinute) {'] }
    ]},
    { name: 'Park', title: 'A car enters', diagram: park, code: '@main' },
    { name: 'Pay and leave', title: 'A car leaves', diagram: leave, code: '@main' }
  ],
  patterns: [
    ['Strategy', '`PricingStrategy`', 'Fee rules change independently of parking logic.'],
    ['Template / polymorphism', '`Vehicle.size()`', 'New vehicle types without touching spot logic.'],
    ['Singleton (optional)', '`ParkingLot`', 'One lot per process; prefer passing one instance over a global.'],
    ['Factory (extension)', 'Creating vehicles from a plate scan', 'Keeps `new Car` decisions in one place.']
  ],
  code: { file: 'ParkingLotDemo.java', src: SRC, expect: 'KA01AB1234 -> G-M1\nKA02XY9 -> G-S1\nCar pays 60\nLot full for TRK2' },
  concurrency: [
    ['Two gates pick the same free spot', '`park` is `synchronized`: finding and taking a spot is one atomic step.'],
    ['One big lock limits throughput', 'At large scale, lock per floor or per spot size, or keep free spots in a `ConcurrentLinkedQueue` per size and `poll()` them.'],
    ['Ticket IDs collide', 'Counter is only changed inside the synchronized method (or use `AtomicInteger`).']
  ],
  extensions: [
    ['Electric vehicles need charging spots', 'Add `ElectricCar` and a `ChargingSpot` (subclass or a feature flag); `canFit` checks it.'],
    ['Weekend pricing', 'New `WeekendPricing implements PricingStrategy`; inject it on weekends.'],
    ['Find spot faster', 'Keep a queue of free spots per size instead of scanning; O(1) to find.'],
    ['Display free spots per floor', 'Observer: spots publish "taken/freed" events to display boards.']
  ],
  probe: [
    ['Why is `Vehicle` abstract instead of having a `type` field?', ['Behaviour that varies by type (`size()`, later maybe fees or rules) lives in the subclass. A `type` field leads to switch statements everywhere.']],
    ['How would you find a spot in O(1)?', ['Maintain free spots per `SpotSize` in queues. On park, poll the queue for the smallest size that fits; on unpark, offer the spot back.']],
    ['How do you make this thread-safe without one big lock?', ['Per-size concurrent queues of free spots (`ConcurrentLinkedQueue.poll` is atomic), and a `ConcurrentHashMap` for active tickets.']],
    ['Where does the fee logic belong?', ['Not in `Ticket` or `ParkingLot`, but in a `PricingStrategy` so different rules can be swapped and tested alone.']]
  ],
  say: ['The gates only talk to `ParkingLot`, which owns floors, which own spots.', 'Vehicle size is polymorphic and `SpotSize` is an ordered enum, so fit is one comparison.', 'Pricing is a strategy, because fee rules change more often than anything else.', '`park` is synchronized so two gates can never take the same spot.'],
  facts: [['entry', '`ParkingLot.park/unpark`'], ['fit', 'vehicle size ≤ spot size'], ['pricing', 'Strategy'], ['safety', 'synchronized find + take']],
  checklist: ['List the entities and their responsibilities.', 'Draw the class diagram with correct relationships.', 'Write `park` and `unpark`.', 'Explain the thread-safety choice and an O(1) alternative.'],
  drills: {
    mcq: [
      { id: 'mcq-fee', title: 'New pricing rule', ask: 'Management adds weekend pricing. Where should the change go?', options: [
        ['A new `WeekendPricing` class implementing `PricingStrategy`', true, 'No existing class changes.'],
        ['An if-weekend branch inside `ParkingLot.unpark`', false, 'Mixes pricing into lot logic and grows with each rule.'],
        ['A field on `Ticket`', false, 'Ticket stores data, not pricing rules.'],
        ['A new floor', false, 'Unrelated.']
      ]},
      { id: 'mcq-race', title: 'Same spot twice', ask: 'Two gates occasionally assign the same spot. Why, and the simplest fix?', options: [
        ['Find and take are separate steps; make `park` synchronized so they are atomic', true, 'Both threads saw the spot free before either took it.'],
        ['Use `ArrayList` instead of `List`', false, 'The interface type does not matter.'],
        ['Make `Ticket` immutable', false, 'Good practice, but not the cause.'],
        ['Add more floors', false, 'The race still exists.']
      ]}
    ],
    code: [
      { id: 'code-fit', title: 'Does it fit?', ask: 'Complete `canFit` and the floor search.', run: 'FitDemo', expect: 'true\nfalse', code: `import java.util.*;
enum SpotSize { SMALL, MEDIUM, LARGE }
class Spot {
    final SpotSize size; String plate;
    Spot(SpotSize size) { this.size = size; }
    boolean canFit(SpotSize need) { return plate == null && need.[[ordinal()]] <= size.ordinal(); }
}
class FitDemo {
    public static void main(String[] args) {
        Spot s = new Spot(SpotSize.MEDIUM);
        System.out.println(s.canFit(SpotSize.SMALL));
        System.out.println(s.canFit(SpotSize.[[LARGE]]));
    }
}` }
    ],
    order: [
      { id: 'ord-park', title: 'Park a car', ask: 'Order what `park` does.', steps: ['Gate calls `lot.park(vehicle, now)`', 'Lot asks each floor for a spot that fits', 'Take the first fitting spot', 'Create a ticket and store it in the active map', 'Return the ticket to the gate'], extra: ['Compute the fee'] }
    ],
    classes: { id: 'cls-lot', title: 'Design the parking lot', ask: null, reqs: ['Bikes, cars and trucks; small, medium and large spots', 'Several floors and gates', 'Fees that may change by time and day'], parts: [
      ['ParkingLot', 'must', 'Entry point for park/unpark.'],
      ['ParkingFloor', 'must', 'Groups spots; finds a free one.'],
      ['ParkingSpot', 'must', 'Size and occupancy.'],
      ['Vehicle (abstract)', 'must', 'Common base; subclasses know their size.'],
      ['Ticket', 'must', 'Records entry for fee and exit.'],
      ['PricingStrategy', 'must', 'Fee rules swap without editing the lot.'],
      ['SpotSize enum', 'good', 'Ordered sizes make fit checks trivial.'],
      ['ParkingSpotFactory', 'good', 'Useful when building big lots from config.'],
      ['CarParkingSpot, TruckParkingSpot, BikeParkingSpot', 'no', 'Size is data; a class per size duplicates logic.'],
      ['VehicleManager', 'no', 'A vague "manager" with no clear responsibility.']
    ]}
  }
});
})();
