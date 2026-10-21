(function(){
var SRC = String.raw`import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

enum SeatType { REGULAR, PREMIUM }
record Seat(String id, SeatType type) {}
record Movie(String title, int minutes) {}

class Show {
    final String id;
    final Movie movie;
    final List<Seat> seats;
    final Map<SeatType, Integer> price;
    Show(String id, Movie movie, List<Seat> seats, Map<SeatType, Integer> price) {
        this.id = id; this.movie = movie; this.seats = seats; this.price = price;
    }
}

class SeatLockProvider {                                   // temporary holds while the user pays
    private final ConcurrentHashMap<String, String> holds = new ConcurrentHashMap<>();   // "show:seat" -> user
    boolean lock(Show show, Seat seat, String user) { return holds.putIfAbsent(key(show, seat), user) == null; }
    void unlock(Show show, Seat seat) { holds.remove(key(show, seat)); }
    boolean heldBy(Show show, Seat seat, String user) { return user.equals(holds.get(key(show, seat))); }
    private String key(Show show, Seat seat) { return show.id + ":" + seat.id(); }
}

record Booking(String id, String user, Show show, List<Seat> seats, int amount) {}

interface PaymentGateway { boolean pay(String user, int amount); }

class BookingService {
    private final SeatLockProvider locks;
    private final PaymentGateway payments;
    private final Set<String> sold = ConcurrentHashMap.newKeySet();
    private final AtomicInteger nextId = new AtomicInteger(1);
    BookingService(SeatLockProvider locks, PaymentGateway payments) { this.locks = locks; this.payments = payments; }

    List<Seat> hold(Show show, List<Seat> seats, String user) {
        List<Seat> got = new ArrayList<>();
        for (Seat s : seats) {
            if (sold.contains(show.id + ":" + s.id()) || !locks.lock(show, s, user)) {
                got.forEach(g -> locks.unlock(show, g));          // all or nothing
                return List.of();
            }
            got.add(s);
        }
        return got;
    }

    Optional<Booking> confirm(Show show, List<Seat> seats, String user) {
        for (Seat s : seats) if (!locks.heldBy(show, s, user)) return Optional.empty();   // hold expired or stolen
        int amount = seats.stream().mapToInt(s -> show.price.get(s.type())).sum();
        if (!payments.pay(user, amount)) { seats.forEach(s -> locks.unlock(show, s)); return Optional.empty(); }
        for (Seat s : seats) { sold.add(show.id + ":" + s.id()); locks.unlock(show, s); }
        return Optional.of(new Booking("B" + nextId.getAndIncrement(), user, show, seats, amount));
    }
}

class MovieBookingDemo {
    public static void main(String[] args) {
        Seat a1 = new Seat("A1", SeatType.REGULAR), a2 = new Seat("A2", SeatType.REGULAR), p1 = new Seat("P1", SeatType.PREMIUM);
        Show show = new Show("S1", new Movie("Inception", 148), List.of(a1, a2, p1), Map.of(SeatType.REGULAR, 200, SeatType.PREMIUM, 350));
        BookingService service = new BookingService(new SeatLockProvider(), (user, amount) -> amount <= 1000);

        List<Seat> held = service.hold(show, List.of(a1, p1), "maya");
        System.out.println("maya holds " + held.size());
        System.out.println("ravi holds " + service.hold(show, List.of(p1), "ravi").size());
        Booking b = service.confirm(show, held, "maya").orElseThrow();
        System.out.println(b.id() + " " + b.user() + " " + b.amount());
        System.out.println("ravi holds " + service.hold(show, List.of(p1), "ravi").size());
    }
}`;
var dg = { kind: 'class', w: 880, h: 480, classes: [
  { id: 'svc', name: 'BookingService', x: 20, y: 20, w: 280, fields: ['- locks: SeatLockProvider', '- payments: PaymentGateway', '- sold: Set<String>'], methods: ['+ hold(show, seats, user)', '+ confirm(show, seats, user)'] },
  { id: 'lock', name: 'SeatLockProvider', x: 360, y: 20, w: 260, fields: ['- holds: ConcurrentHashMap'], methods: ['+ lock(show, seat, user)', '+ unlock(show, seat)'] },
  { id: 'pay', name: 'PaymentGateway', stereo: 'interface', x: 660, y: 20, w: 200, fields: [], methods: ['+ pay(user, amount)'] },
  { id: 'show', name: 'Show', x: 20, y: 240, w: 260, fields: ['- movie: Movie', '- seats: List<Seat>', '- price: Map<SeatType, Integer>'], methods: [] },
  { id: 'movie', name: 'Movie', stereo: 'record', x: 330, y: 250, w: 150, fields: ['title', 'minutes'], methods: [] },
  { id: 'seat', name: 'Seat', stereo: 'record', x: 330, y: 360, w: 150, fields: ['id', 'type: SeatType'], methods: [] },
  { id: 'booking', name: 'Booking', stereo: 'record', x: 560, y: 250, w: 230, fields: ['id, user, amount', 'show: Show', 'seats: List<Seat>'], methods: [] }
], rels: [
  { from: 'svc', to: 'lock', type: 'association' },
  { from: 'svc', to: 'pay', type: 'association', via: [[160, 6], [760, 6]] },
  { from: 'show', to: 'movie', type: 'association' },
  { from: 'show', to: 'seat', type: 'composition', fm: '1', tm: '*' },
  { from: 'svc', to: 'booking', type: 'dependency', label: 'creates' }
] };
var seq = { kind: 'seq', w: 840, parts: [{ id: 'u', name: 'Maya' }, { id: 's', name: 'BookingService' }, { id: 'l', name: 'SeatLockProvider' }, { id: 'p', name: 'PaymentGateway' }], msgs: [
  { from: 'u', to: 's', label: 'hold(S1, [A1, P1])', text: 'Maya picks two seats.', code: ['List<Seat> held = service.hold(show, List.of(a1, p1), "maya");'] },
  { from: 's', to: 'l', label: 'lock(A1), lock(P1)', text: '`putIfAbsent` is atomic, so only one user can win each seat. If any seat fails, the ones already taken are released: all or nothing.', code: ['return holds.putIfAbsent(key(show, seat), user) == null;', 'got.forEach(g -> locks.unlock(show, g));'] },
  { from: 'u', to: 's', label: 'confirm(...)', text: 'Maya pays within the hold window.', code: ['Booking b = service.confirm(show, held, "maya").orElseThrow();'] },
  { from: 's', to: 'l', label: 'heldBy(…, "maya")?', text: 'Check the holds are still hers (they could have expired).', code: ['for (Seat s : seats) if (!locks.heldBy(show, s, user)) return Optional.empty();'] },
  { from: 's', to: 'p', label: 'pay("maya", 550)', text: '200 regular + 350 premium.', code: ['int amount = seats.stream().mapToInt(s -> show.price.get(s.type())).sum();', 'if (!payments.pay(user, amount))'] },
  { from: 's', to: 'u', label: 'Booking B1', ret: true, text: 'Seats move from "held" to "sold" and the hold is released.', code: ['for (Seat s : seats) { sold.add(show.id + ":" + s.id()); locks.unlock(show, s); }'] }
] };
registerDesign({
  slug: 'movie-booking', order: 4, title: 'Movie ticket booking (BookMyShow)',
  one: 'Let many users book seats for the same show at once ==without ever selling a seat twice==, using short holds while they pay.',
  questions: ['Cities → theatres → screens → shows: how deep do we model?', 'Seat categories and pricing rules?', 'How long can a user hold seats while paying?', 'What if payment fails or times out?', 'Do we need cancellations and refunds?'],
  reqs: { func: ['Browse shows and seat availability', 'Hold selected seats for a few minutes', 'Pay and confirm a booking', 'Release seats if payment fails or the hold expires'], nonfunc: ['Never double-book a seat', 'High concurrency on popular shows', 'Payment provider is swappable'], out: ['search by city and movie', 'offers and coupons', 'refunds'] },
  entities: [['movie', '`Movie`', 'Title, duration'], ['show', '`Show`', 'A movie at a time on a screen, with prices'], ['seat', '`Seat`', 'ID and category'], ['seat hold', '`SeatLockProvider`', 'Temporary per-user holds'], ['booking', '`Booking`', 'Confirmed seats and amount'], ['payment', '`PaymentGateway`', 'External charge, swappable']],
  diagramNotes: ['The heart is `SeatLockProvider`: a `ConcurrentHashMap` keyed by `show:seat`, where `putIfAbsent` makes "check if free and take it" a single atomic step.', '`BookingService` coordinates hold → pay → confirm. Theatre/screen/city classes are left out to keep the core visible; they are plain containers.'],
  flowNotes: ['**Hold:** atomic lock per seat, all or nothing. **Confirm:** check holds still belong to the user, charge, mark sold, release holds.'],
  flows: [
    { name: 'Class diagram', title: 'Booking classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'What is being sold', add: ['show', 'movie', 'seat'], on: ['show'], text: 'A show has a movie, seats and prices per seat type.', code: ['class Show {', 'record Seat(String id, SeatType type) {}'] },
      { title: 'Holds', add: ['lock'], on: ['lock'], text: 'Holding a seat is an atomic `putIfAbsent`. Two users clicking the same seat: exactly one gets `true`.', code: ['class SeatLockProvider {', 'return holds.putIfAbsent(key(show, seat), user) == null;'] },
      { title: 'The service', add: ['svc', 'pay'], on: ['svc'], rels: ['svc-lock', 'svc-pay'], text: '`BookingService` runs the flow; payment is an interface so tests and providers can vary.', code: ['class BookingService {', 'interface PaymentGateway'] },
      { title: 'Bookings', add: ['booking'], on: ['booking'], text: 'Only created after successful payment.', code: ['record Booking(', 'return Optional.of(new Booking('] }
    ]},
    { name: 'Hold and confirm', title: 'Booking two seats', diagram: seq, code: '@main' }
  ],
  patterns: [['Strategy', '`PaymentGateway`, pricing per seat type', 'Swap providers and pricing rules.'], ['Facade', '`BookingService`', 'One entry point for hold and confirm.'], ['Observer (extension)', 'Seat map updates to other viewers', 'Push "seat taken" to open screens.']],
  code: { file: 'MovieBookingDemo.java', src: SRC, expect: 'maya holds 2\nravi holds 0\nB1 maya 550\nravi holds 0' },
  concurrency: [['Two users take the same seat', '`ConcurrentHashMap.putIfAbsent` per seat: atomic check-and-take.'], ['Partial holds', 'If any seat fails, release the ones already held (all or nothing).'], ['Hold never released', 'Store a timestamp with each hold and expire it (scheduled cleanup or check on access).'], ['Several app servers', 'Move holds to Redis (`SET key user NX EX 300`) or a DB row with a unique constraint.']],
  extensions: [['Hold expiry', 'Value becomes `(user, expiresAt)`; `lock` replaces expired holds with `compute`.'], ['Dynamic pricing', '`PricingStrategy` instead of a fixed map.'], ['Cancellation', 'Booking state machine: Confirmed → Cancelled, seats return to available.'], ['Seat map live updates', 'Observer: publish seat changes to connected clients.']],
  probe: [['How do you prevent double booking?', ['Atomic check-and-take per seat: `putIfAbsent` in a concurrent map in one process; across servers, Redis `SET NX` with TTL or a DB unique constraint on (show, seat).']], ['Why hold before paying?', ['Payment takes time. Holding reserves the seat briefly so the user is not charged for a seat someone else got meanwhile, without locking it forever.']], ['What if payment succeeds but the server crashes before marking sold?', ['Make confirmation idempotent with a booking ID, record payment first, and reconcile with the provider\'s webhook.']]],
  say: ['Seats are held with an atomic `putIfAbsent` keyed by show and seat, so two users can never hold the same seat.', 'Holds are all or nothing and expire after a few minutes.', 'Payment is an interface; the booking is created only after payment succeeds.'],
  facts: [['hold', 'putIfAbsent(show:seat)'], ['all-or-nothing', 'release partial holds'], ['expiry', 'TTL on holds'], ['multi-server', 'Redis SET NX / DB unique']],
  checklist: ['Explain hold → pay → confirm.', 'Write the atomic seat hold.', 'Explain hold expiry and multi-server locking.'],
  drills: {
    mcq: [{ id: 'mcq-mb', title: 'Double booking', ask: 'Code does `if (!held.containsKey(k)) held.put(k, user);` and seats are sometimes double-held. Fix?', options: [['Use `putIfAbsent` (atomic) or synchronize the check and put', true, 'Check and take must be one step.'], ['Use a TreeMap', false, 'Order is not the problem.'], ['Retry the payment', false, 'Unrelated.'], ['Add more seats', false, 'Avoids the bug.']] }],
    code: [{ id: 'code-mb', title: 'Atomic hold', ask: 'Hold a seat only if free.', run: 'HoldDemo', expect: 'true\nfalse', code: String.raw`import java.util.concurrent.*;
class Holds {
    private final ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();
    boolean hold(String seat, String user) { return map.[[putIfAbsent(seat, user)]] == [[null]]; }
}
class HoldDemo { public static void main(String[] a) { Holds h = new Holds(); System.out.println(h.hold("A1", "maya")); System.out.println(h.hold([["A1"]], "ravi")); } }` }],
    order: [{ id: 'ord-mb', title: 'Booking flow', ask: 'Order the steps.', steps: ['User selects seats', 'Atomically hold every selected seat (or none)', 'User pays within the hold time', 'Verify holds still belong to the user', 'Mark seats sold, create the booking, release holds'], extra: ['Charge the user before holding any seat'] }],
    classes: { id: 'cls-mb', title: 'Design movie booking', reqs: ['Many users booking the same show', 'Seats held while paying', 'Swappable payment provider'], parts: [['Show', 'must', 'Movie at a time with seats and prices.'], ['Seat', 'must', 'What is booked.'], ['SeatLockProvider', 'must', 'Atomic temporary holds.'], ['BookingService', 'must', 'Hold → pay → confirm.'], ['PaymentGateway', 'must', 'Interface for providers.'], ['Theatre, Screen, City', 'good', 'Needed for browsing; not for the booking core.'], ['synchronized on the whole BookingService', 'no', 'Serializes all shows; lock per seat instead.'], ['Seat subclasses per row', 'no', 'Rows are data.']] }
  }
});
})();
