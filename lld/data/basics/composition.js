(function(){
var SRC = String.raw`import java.util.*;

interface Engine { String start(); }
class PetrolEngine implements Engine { public String start() { return "vroom"; } }
class ElectricEngine implements Engine { public String start() { return "hum"; } }

class Car {                                            // has-a Engine, not is-a Engine
    private Engine engine;
    Car(Engine engine) { this.engine = engine; }
    void swapEngine(Engine engine) { this.engine = engine; }   // change behaviour at runtime
    String drive() { return "car goes " + engine.start(); }
}

class BoundedStack<T> {                                // wraps a Deque instead of extending a list
    private final Deque<T> items = new ArrayDeque<>();
    private final int capacity;
    BoundedStack(int capacity) { this.capacity = capacity; }
    void push(T t) {
        if (items.size() == capacity) throw new IllegalStateException("full");
        items.push(t);
    }
    T pop() { return items.pop(); }                    // only the operations a stack should have
}

class CompositionDemo {
    public static void main(String[] args) {
        Car car = new Car(new PetrolEngine());
        System.out.println(car.drive());
        car.swapEngine(new ElectricEngine());
        System.out.println(car.drive());
        BoundedStack<Integer> s = new BoundedStack<>(2);
        s.push(1);
        s.push(2);
        try { s.push(3); } catch (IllegalStateException e) { System.out.println("stack " + e.getMessage()); }
    }
}`;
var dg = { kind: 'class', w: 760, h: 290, classes: [
  { id: 'car', name: 'Car', x: 24, y: 40, w: 220, fields: ['- engine: Engine'], methods: ['+ swapEngine(e: Engine)', '+ drive(): String'] },
  { id: 'e', name: 'Engine', stereo: 'interface', x: 400, y: 30, w: 200, fields: [], methods: ['+ start(): String'] },
  { id: 'p', name: 'PetrolEngine', x: 300, y: 190, w: 190, fields: [], methods: [] },
  { id: 'el', name: 'ElectricEngine', x: 520, y: 190, w: 200, fields: [], methods: [] }
], rels: [
  { from: 'car', to: 'e', type: 'composition', fm: '1', tm: '1' },
  { from: 'p', to: 'e', type: 'implements' },
  { from: 'el', to: 'e', type: 'implements' }
] };
registerBasic({
  slug: 'composition', order: 7, group: 'Modeling', title: 'Composition vs inheritance',
  one: '==Favor "has-a" over "is-a"==: build behaviour by combining objects, and keep inheritance for true subtypes.',
  picture: ['A car **has an** engine; it is not an engine. Because the engine is a separate part behind a standard mount, you can swap petrol for electric without building a new car.', 'Inheritance welds the child to the parent at compile time: the child gets every method, wanted or not, and breaks when the parent changes. Composition holds a reference to an interface and delegates, so parts can be swapped and tested alone.'],
  mainCode: SRC, mainFile: 'CompositionDemo.java', mainExpect: 'car goes vroom\ncar goes hum\nstack full',
  flows: [{ name: 'Has-a', title: 'Composition', diagram: dg, progressive: true, code: '@main', steps: [
    { title: 'The whole', add: ['car'], on: ['car'], text: '`Car` holds an engine as a field.', code: ['class Car {', 'private Engine engine;'] },
    { title: 'The part, behind an interface', add: ['e'], on: ['e'], rels: ['car-e'], text: 'The filled diamond means the car owns its engine. It depends on the `Engine` interface, not on a specific engine.', code: ['interface Engine { String start(); }'] },
    { title: 'Swap parts', add: ['p', 'el'], on: ['p', 'el'], text: 'Different engines plug in, even at runtime. No `ElectricCar extends Car` needed.', code: ['void swapEngine(Engine engine) { this.engine = engine; }', 'car.swapEngine(new ElectricEngine());'] }
  ]}],
  sections: [
    { name: 'When inheritance goes wrong', text: ['`java.util.Stack extends Vector`, so a stack also has `get(index)` and `add(0, x)`, which break stack rules. Extending a class for reuse exposes all of its methods and couples you to its internals (the fragile base class problem).'],
      badLabel: 'Is-a by accident', bad: String.raw`class Stack<T> extends java.util.ArrayList<T> {
    void push(T t) { add(t); }
    T pop() { return remove(size() - 1); }
}   // callers can still call add(0, x), get(3), clear()... all wrong for a stack`, goodLabel: 'Has-a', good: String.raw`class Stack<T> {
    private final java.util.ArrayList<T> items = new java.util.ArrayList<>();
    void push(T t) { items.add(t); }
    T pop() { return items.remove(items.size() - 1); }
}   // only stack operations are visible` },
    { name: 'Interfaces vs abstract classes', text: ['**Interface**: a role many unrelated classes can play; a class can implement several; can have `default` methods but no instance state. **Abstract class**: a partial implementation with shared state and code; a class can extend only one. Default to interfaces; add an abstract base when several implementations really share code and fields.'] },
    { name: 'When inheritance is right', text: ['A true "is-a" where the subclass keeps all the parent\'s promises (Liskov), the hierarchy is shallow, and you control both classes. Template Method is a good example.'] }
  ],
  table: { title: 'Pick one', lead: null, head: ['', 'Inheritance (is-a)', 'Composition (has-a)'], rows: [
    ['Coupling', 'Tight: child sees parent internals', 'Loose: talk through an interface'],
    ['Change at runtime', 'No', 'Yes: swap the part'],
    ['Reuse', 'All of the parent, wanted or not', 'Exactly what you delegate'],
    ['Combining behaviours', 'Class explosion', 'Mix parts freely'],
    ['Good for', 'True subtypes, template methods', 'Most everything else']
  ]},
  pitfalls: [['Extending for reuse', 'Reusing two methods is not a reason to inherit fifty.'], ['Deep hierarchies', 'Three or more levels are hard to change safely.'], ['Abstract class where an interface fits', 'Blocks the class from extending anything else.']],
  probe: [['Why "favor composition over inheritance"?', ['Composition keeps classes loosely coupled, lets behaviour change at runtime, avoids class explosions from combinations, and does not expose unwanted parent methods.']], ['Interface or abstract class?', ['Interface for a role or capability (several per class possible). Abstract class when implementations share real state and code. In modern Java, interfaces with default methods cover many old abstract-class uses.']]],
  say: ['A car has an `Engine` interface, so engines swap without subclassing `Car`.', 'I only use inheritance for true is-a relationships that keep the parent\'s contract.'],
  facts: [['has-a', 'composition'], ['is-a', 'inheritance'], ['default', 'prefer composition'], ['interface', 'many per class']],
  checklist: ['Explain composition vs inheritance with an example.', 'Spot a misuse of inheritance.', 'Choose interface vs abstract class.'],
  drills: {
    mcq: [{ id: 'mcq-comp', title: 'Logging duck', ask: 'You need ducks that can fly or not, quack or squeak, in any combination. Best design?', options: [['Compose: Duck has a FlyBehavior and a QuackBehavior', true, 'Behaviours combine freely and swap at runtime.'], ['A subclass for every combination', false, 'Class explosion.'], ['One Duck class with boolean flags and if/else', false, 'Grows a switch for each behaviour.'], ['Make Duck abstract with every method abstract', false, 'Still one subclass per combination.']] }],
    code: [{ id: 'code-comp', title: 'Swap a part', ask: 'Use composition for the weapon.', run: 'HeroDemo', expect: 'slash\nshoot', code: String.raw`interface Weapon { String attack(); }
class Sword implements Weapon { public String attack() { return "slash"; } }
class Bow implements Weapon { public String attack() { return "shoot"; } }
class Hero {
    private [[Weapon]] weapon;
    Hero(Weapon w) { weapon = w; }
    void equip(Weapon w) { [[weapon = w]]; }
    String fight() { return [[weapon.attack()]]; }
}
class HeroDemo { public static void main(String[] a) { Hero h = new Hero(new Sword()); System.out.println(h.fight()); h.equip(new Bow()); System.out.println(h.fight()); } }` }],
    order: [{ id: 'ord-comp', title: 'Replace inheritance', ask: 'Order the refactoring.', steps: ['Find a subclass that extends only to reuse code', 'Extract the reused behaviour behind an interface', 'Give the class a field of that interface', 'Delegate calls to the field', 'Remove the extends'], extra: ['Add another level of inheritance'] }]
  }
});
})();
