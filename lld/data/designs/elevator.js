(function(){
var SRC = String.raw`import java.util.*;

enum Direction { UP, DOWN, IDLE }

class Elevator {
    final int id;
    private int floor;
    private Direction direction = Direction.IDLE;
    private final TreeSet<Integer> stops = new TreeSet<>();     // sorted: next stop up/down is O(log n)
    Elevator(int id, int floor) { this.id = id; this.floor = floor; }
    int floor() { return floor; }
    Direction direction() { return direction; }
    boolean idle() { return stops.isEmpty(); }

    synchronized void addStop(int f) {
        if (f != floor) stops.add(f);
        updateDirection();
    }

    synchronized void step() {                                   // move one floor (LOOK algorithm)
        if (direction == Direction.UP) floor++;
        else if (direction == Direction.DOWN) floor--;
        if (stops.remove(floor)) System.out.println("E" + id + " stops at " + floor);
        updateDirection();
    }

    private void updateDirection() {
        if (stops.isEmpty()) { direction = Direction.IDLE; return; }
        if (direction == Direction.UP && stops.ceiling(floor) != null) return;     // keep going up
        if (direction == Direction.DOWN && stops.floor(floor) != null) return;     // keep going down
        direction = stops.ceiling(floor) != null ? Direction.UP : Direction.DOWN;  // start or turn around
    }
}

interface DispatchStrategy {
    Elevator choose(List<Elevator> elevators, int floor);
}

class NearestElevator implements DispatchStrategy {
    public Elevator choose(List<Elevator> elevators, int floor) {
        Elevator best = null;
        int bestCost = Integer.MAX_VALUE;
        for (Elevator e : elevators) {
            int cost = Math.abs(e.floor() - floor);
            boolean movingAway = (e.direction() == Direction.UP && floor < e.floor())
                              || (e.direction() == Direction.DOWN && floor > e.floor());
            if (movingAway) cost += 20;                          // prefer cars already heading this way
            if (cost < bestCost) { best = e; bestCost = cost; }
        }
        return best;
    }
}

class ElevatorController {
    private final List<Elevator> elevators;
    private final DispatchStrategy strategy;
    ElevatorController(List<Elevator> elevators, DispatchStrategy strategy) {
        this.elevators = elevators; this.strategy = strategy;
    }
    Elevator call(int floor) {                                   // hall button
        Elevator e = strategy.choose(elevators, floor);
        e.addStop(floor);
        System.out.println("call at " + floor + " -> E" + e.id);
        return e;
    }
    void step() { for (Elevator e : elevators) e.step(); }       // one tick of the simulation
    boolean allIdle() { return elevators.stream().allMatch(Elevator::idle); }
}

class ElevatorDemo {
    public static void main(String[] args) {
        Elevator e1 = new Elevator(1, 0), e2 = new Elevator(2, 10);
        ElevatorController c = new ElevatorController(List.of(e1, e2), new NearestElevator());
        c.call(3);
        c.call(8);
        e1.addStop(6);                                           // passenger inside E1 presses 6
        int ticks = 0;
        while (!c.allIdle() && ticks++ < 50) c.step();
        System.out.println("E1 at " + e1.floor() + ", E2 at " + e2.floor());
    }
}`;
var dg = { kind: 'class', w: 860, h: 420, classes: [
  { id: 'ctl', name: 'ElevatorController', x: 20, y: 30, w: 260, fields: ['- elevators: List<Elevator>', '- strategy: DispatchStrategy'], methods: ['+ call(floor): Elevator', '+ step()'] },
  { id: 'ds', name: 'DispatchStrategy', stereo: 'interface', x: 360, y: 30, w: 270, fields: [], methods: ['+ choose(elevators, floor)'] },
  { id: 'ne', name: 'NearestElevator', x: 660, y: 30, w: 180, fields: [], methods: ['+ choose(...)'] },
  { id: 'el', name: 'Elevator', x: 20, y: 220, w: 280, fields: ['- floor: int', '- direction: Direction', '- stops: TreeSet<Integer>'], methods: ['+ addStop(f)', '+ step()', '- updateDirection()'] },
  { id: 'dir', name: 'Direction', stereo: 'enumeration', x: 400, y: 230, w: 170, fields: ['UP', 'DOWN', 'IDLE'], methods: [] }
], rels: [
  { from: 'ctl', to: 'el', type: 'composition', fm: '1', tm: '1..*' },
  { from: 'ctl', to: 'ds', type: 'association' },
  { from: 'ne', to: 'ds', type: 'implements' },
  { from: 'el', to: 'dir', type: 'association' }
] };
var call = { kind: 'seq', w: 820, parts: [{ id: 'h', name: 'Hall button' }, { id: 'c', name: 'Controller' }, { id: 's', name: 'NearestElevator' }, { id: 'e', name: 'Elevator 2' }], msgs: [
  { from: 'h', to: 'c', label: 'call(8)', text: 'Someone on floor 8 presses the hall button.', code: ['Elevator call(int floor) {'] },
  { from: 'c', to: 's', label: 'choose(elevators, 8)', text: 'The controller does not decide itself; it asks the dispatch **strategy**.', code: ['Elevator e = strategy.choose(elevators, floor);'] },
  { from: 's', to: 'c', label: 'E2 (cost 2)', ret: true, text: 'E1 is 8 floors away; E2 is 2 floors away and idle. E2 wins.', code: ['int cost = Math.abs(e.floor() - floor);', 'if (movingAway) cost += 20;'] },
  { from: 'c', to: 'e', label: 'addStop(8)', text: 'The stop goes into E2\'s sorted set and its direction becomes DOWN.', code: ['e.addStop(floor);', 'direction = stops.ceiling(floor) != null ? Direction.UP : Direction.DOWN;'] },
  { from: 'c', to: 'e', label: 'step() ×2', text: 'Each tick moves one floor. At floor 8 the stop is removed and the car opens.', code: ['else if (direction == Direction.DOWN) floor--;', 'if (stops.remove(floor)) System.out.println("E" + id + " stops at " + floor);'] }
] };
registerDesign({
  slug: 'elevator', order: 2, title: 'Elevator system',
  one: 'Several elevators serve calls from halls and cabins. Each car ==serves stops in its current direction before turning==, and a swappable strategy decides which car answers a hall call.',
  questions: ['How many elevators and floors?', 'Hall buttons have up/down? Cabin buttons for floors?', 'What should the dispatch goal be: shortest wait, least energy, fairness?', 'Capacity limits, maintenance mode, emergency stop in scope?', 'Do we simulate time, or react to real sensor events?'],
  reqs: { func: ['Hall calls are assigned to one elevator', 'Cabin buttons add stops to that car', 'Each car moves floor by floor and stops at requested floors', 'Idle when no stops are left'], nonfunc: ['Dispatch algorithm can change without touching cars', 'Thread-safe when buttons are pressed concurrently', 'Easy to simulate and test'], out: ['weight sensors', 'door timing', 'emergency modes', 'VIP floors'] },
  entities: [['elevator / car', '`Elevator`', 'Current floor, direction, pending stops, moving'], ['direction', '`Direction` enum', 'UP, DOWN, IDLE'], ['building controller', '`ElevatorController`', 'Receives hall calls, ticks all cars'], ['dispatch rule', '`DispatchStrategy` + `NearestElevator`', 'Chooses a car for a hall call']],
  diagramNotes: ['The controller owns the elevators and delegates "which car?" to a `DispatchStrategy`. Each `Elevator` keeps its stops in a `TreeSet`, so "next stop above me" is `stops.ceiling(floor)` and "below me" is `stops.floor(floor)`.', 'Movement follows the **LOOK** algorithm: keep going in the current direction while there are stops ahead, then turn around.'],
  flowNotes: ['**Hall call:** controller → strategy picks a car → car adds a stop. **Ticks:** every step, each car moves one floor and stops if that floor is in its set.'],
  flows: [
    { name: 'Class diagram', title: 'Elevator classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The car', add: ['el', 'dir'], on: ['el'], text: 'Each elevator knows its floor, direction and a sorted set of stops.', code: ['class Elevator {', 'private final TreeSet<Integer> stops = new TreeSet<>();'] },
      { title: 'Moving: the LOOK rule', on: ['el'], text: 'Keep going while stops remain ahead; otherwise turn around or go idle.', code: ['private void updateDirection() {', 'direction = stops.ceiling(floor) != null ? Direction.UP : Direction.DOWN;'] },
      { title: 'The controller', add: ['ctl'], on: ['ctl'], text: 'Owns all cars, receives hall calls and advances time.', code: ['class ElevatorController {', 'void step() { for (Elevator e : elevators) e.step(); }'] },
      { title: 'Dispatch as a strategy', add: ['ds', 'ne'], on: ['ds', 'ne'], text: 'Choosing a car is a policy that buildings tune, so it sits behind an interface.', code: ['interface DispatchStrategy {', 'class NearestElevator implements DispatchStrategy {'] },
      { title: 'Concurrency', on: ['el'], text: 'Buttons are pressed from many threads while the car moves, so `addStop` and `step` are synchronized on the car.', code: ['synchronized void addStop(int f) {', 'synchronized void step() {'] }
    ]},
    { name: 'Hall call', title: 'Answering a call on floor 8', diagram: call, code: '@main' }
  ],
  patterns: [['Strategy', '`DispatchStrategy`', 'Different buildings want different dispatch rules.'], ['State (light)', '`Direction` enum drives behaviour', 'For more modes (maintenance, emergency) promote to State classes.'], ['Observer (extension)', 'Floor displays', 'Displays subscribe to car position changes.']],
  code: { file: 'ElevatorDemo.java', src: SRC, expect: 'call at 3 -> E1\ncall at 8 -> E2\nE2 stops at 8\nE1 stops at 3\nE1 stops at 6\nE1 at 6, E2 at 8' },
  concurrency: [['Button pressed while the car updates its stops', '`addStop` and `step` are synchronized on the elevator.'], ['Two hall calls dispatched at once', 'Dispatch reads car state; make `call` synchronized or tolerate a slightly stale choice.'], ['Real hardware', 'One thread per car processing a queue of commands avoids most locking.']],
  extensions: [['Up/down hall buttons', 'Store the requested direction and prefer cars moving that way.'], ['Maintenance mode', 'Promote car modes to State classes: Normal, Maintenance, Emergency.'], ['Capacity', 'Car tracks load; dispatch skips full cars.'], ['Energy-saving dispatch', 'New `DispatchStrategy` implementation; no other change.']],
  probe: [['Which scheduling algorithm and why?', ['LOOK (like SCAN, but turning at the last request instead of the top floor): fair, avoids starving floors, and simple with a sorted set.']], ['How do you choose which elevator answers?', ['A strategy that scores each car: distance, plus a penalty if moving away, maybe load. Swappable without touching cars.']], ['How would you test this?', ['Inject a fixed strategy, drive time with `step()` calls instead of real clocks, and assert positions and stop order.']]],
  say: ['Each car keeps stops in a `TreeSet` and follows LOOK: serve stops ahead, then turn.', 'Dispatch is a strategy, so buildings can change the policy.', 'Time is simulated with `step()`, which makes it deterministic to test.'],
  facts: [['stops', 'TreeSet: ceiling / floor'], ['algorithm', 'LOOK'], ['dispatch', 'Strategy'], ['test', 'simulated ticks']],
  checklist: ['Draw the classes with correct relationships.', 'Explain LOOK and how TreeSet helps.', 'Write the dispatch strategy.', 'Explain the concurrency choice.'],
  drills: {
    mcq: [{ id: 'mcq-ds', title: 'New dispatch rule', ask: 'A hotel wants elevators to prefer serving the lobby first in the morning. Where does this go?', options: [['A new `DispatchStrategy` implementation', true, 'The policy is isolated; cars and controller stay unchanged.'], ['An if-morning branch inside `Elevator.step()`', false, 'Mixes policy into movement.'], ['A new Direction value', false, 'Directions are not policies.'], ['A subclass of ElevatorController', false, 'Heavier than swapping a strategy.']] },
      { id: 'mcq-ts', title: 'Next stop', ask: 'Why store stops in a `TreeSet<Integer>`?', options: [['Sorted, no duplicates, and `ceiling`/`floor` find the next stop up or down in O(log n)', true, 'Exactly what LOOK needs.'], ['It is faster than an array for everything', false, 'Not the reason.'], ['It is thread-safe', false, 'TreeSet is not thread-safe.'], ['It keeps insertion order', false, 'It keeps sorted order.']] }],
    code: [{ id: 'code-next', title: 'Next stop up', ask: 'Find the next stop at or above the current floor.', run: 'NextDemo', expect: '7\nnull', code: String.raw`import java.util.*;
class NextDemo {
    public static void main(String[] args) {
        TreeSet<Integer> stops = new TreeSet<>(List.of(2, 7, 9));
        System.out.println(stops.[[ceiling]](5));
        System.out.println(stops.ceiling([[10]]));
    }
}` }],
    order: [{ id: 'ord-el', title: 'One tick', ask: 'Order what `step()` does.', steps: ['Move one floor in the current direction', 'If this floor is a stop, remove it and open', 'If stops remain ahead, keep the direction', 'Otherwise turn around if stops remain behind', 'If no stops remain, become idle'], extra: ['Jump directly to the last stop'] }],
    classes: { id: 'cls-el', title: 'Design the elevator system', reqs: ['3 elevators, 20 floors', 'Hall and cabin buttons', 'Dispatch policy may change per building'], parts: [['Elevator', 'must', 'State and movement of one car.'], ['ElevatorController', 'must', 'Receives calls, owns cars.'], ['DispatchStrategy', 'must', 'Swappable choice of car.'], ['Direction enum', 'must', 'UP/DOWN/IDLE drives movement.'], ['Request (floor, direction)', 'good', 'Useful once hall buttons carry direction.'], ['Floor class per floor', 'no', 'Floors are just numbers here.'], ['ElevatorManagerHelper', 'no', 'Vague name, no clear responsibility.']] }
  }
});
})();
