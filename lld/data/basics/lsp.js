(function(){
var SRC = String.raw`import java.util.*;

abstract class Bird {
    abstract String name();
    String eat() { return name() + " eats"; }          // every bird can do this
}

interface Flyer {                                      // only some birds fly
    String fly();
}

class Sparrow extends Bird implements Flyer {
    String name() { return "Sparrow"; }
    public String fly() { return "Sparrow flies"; }
}

class Penguin extends Bird {                           // no fly() to break
    String name() { return "Penguin"; }
    String swim() { return "Penguin swims"; }
}

class LspDemo {
    public static void main(String[] args) {
        List<Bird> birds = List.of(new Sparrow(), new Penguin());
        for (Bird b : birds) System.out.println(b.eat());           // safe for every Bird
        List<Flyer> flyers = List.of(new Sparrow());
        for (Flyer f : flyers) System.out.println(f.fly());         // only things that really fly
    }
}`;
var dg = { kind: 'class', w: 760, h: 300, classes: [
  { id: 'b', name: 'Bird', stereo: 'abstract', x: 60, y: 30, w: 200, fields: [], methods: ['+ name(): String', '+ eat(): String'] },
  { id: 'f', name: 'Flyer', stereo: 'interface', x: 480, y: 30, w: 200, fields: [], methods: ['+ fly(): String'] },
  { id: 's', name: 'Sparrow', x: 300, y: 190, w: 180, fields: [], methods: ['+ fly(): String'] },
  { id: 'p', name: 'Penguin', x: 40, y: 190, w: 180, fields: [], methods: ['+ swim(): String'] }
], rels: [
  { from: 's', to: 'b', type: 'inherits' },
  { from: 'p', to: 'b', type: 'inherits' },
  { from: 's', to: 'f', type: 'implements' }
] };
registerBasic({
  slug: 'lsp', order: 4, group: 'SOLID', title: 'Liskov Substitution principle',
  one: 'A subclass must be ==usable anywhere its parent is expected== without surprising the caller.',
  picture: ['If a toy duck needs batteries but looks like a duck, then code that "feeds the ducks" will break when it meets the toy. It looks like a duck, but you cannot substitute it.', 'In Java: if `Bird` promises `fly()`, a `Penguin extends Bird` that throws `UnsupportedOperationException` breaks every caller that trusted the promise. Fix the hierarchy so each type only promises what it can do.'],
  mainCode: SRC, mainFile: 'LspDemo.java', mainExpect: 'Sparrow eats\nPenguin eats\nSparrow flies',
  flows: [{ name: 'Fixed hierarchy', title: 'Promise only what every subtype can do', diagram: dg, progressive: true, code: '@main', steps: [
    { title: 'The base promises less', add: ['b'], on: ['b'], text: '`Bird` only promises what every bird does.', code: ['abstract class Bird {', 'String eat()'] },
    { title: 'A separate role for flying', add: ['f'], on: ['f'], text: 'Flying is a capability, so it becomes its own interface.', code: ['interface Flyer {'] },
    { title: 'Subtypes keep their promises', add: ['s', 'p'], on: ['s', 'p'], rels: ['s-f'], text: 'Sparrow is a Bird and a Flyer. Penguin is only a Bird, so no caller can ask it to fly.', code: ['class Sparrow extends Bird implements Flyer {', 'class Penguin extends Bird {'] }
  ]}],
  sections: [
    { name: 'The classic violations', text: ['A subclass that throws for an inherited method, ignores it, or changes its meaning breaks substitution. The famous case: `Square extends Rectangle`, where setting the width also changes the height, so code that sets width 5 and height 4 and expects area 20 gets 16.'],
      badLabel: 'Breaks callers', bad: String.raw`class Bird { String fly() { return "flies"; } }
class Penguin extends Bird {
    String fly() { throw new UnsupportedOperationException("penguins can't fly"); }   // surprise!
}`, goodLabel: 'Honest types', good: String.raw`abstract class Bird { abstract String name(); }
interface Flyer { String fly(); }
class Penguin extends Bird { String name() { return "Penguin"; } }   // never promised fly()` },
    { name: 'The rules in plain words', text: ['A subclass may **not** demand more (stricter preconditions), may **not** deliver less (weaker results), and must keep the parent\'s rules true (invariants). It may accept more and promise more.'] }
  ],
  pitfalls: [['Throwing UnsupportedOperationException', 'A strong sign the inheritance is wrong.'], ['Overrides that do nothing', 'Silent no-ops break callers just as badly.'], ['Modelling by real-world category only', '"A square is a rectangle" in math, but not in mutable code.'], ['instanceof checks before calling', 'Callers checking the subtype means substitution failed.']],
  probe: [['Why is Square extends Rectangle a problem?', ['Rectangle lets width and height change independently. A square cannot keep that promise, so code written for rectangles breaks with squares. Make them separate shapes, or make them immutable.']], ['How do you fix an LSP violation?', ['Split the abstraction: move the capability that not all subtypes share into its own interface, or use composition instead of inheritance.']]],
  say: ['Not all birds fly, so flying is a `Flyer` interface; `Penguin` never has to fake it.'],
  facts: [['substitute', 'child works where parent did'], ['smell', 'UnsupportedOperationException'], ['fix', 'split interface / compose']],
  checklist: ['Explain LSP with Bird/Penguin or Rectangle/Square.', 'Fix a violating hierarchy.', 'List the precondition/postcondition rules.'],
  drills: {
    mcq: [{ id: 'mcq-lsp', title: 'Read-only list', ask: '`ReadOnlyList extends ArrayList` throws on `add()`. Code that takes a `List` and adds items crashes. What principle is broken?', options: [['Liskov Substitution', true, 'The subtype cannot be used where its parent is expected.'], ['Single Responsibility', false, 'Not about multiple jobs.'], ['Open/Closed', false, 'Not about extension points.'], ['Encapsulation', false, 'Not the core issue.']] }],
    code: [{ id: 'code-lsp', title: 'Honest hierarchy', ask: 'Only flyers can fly.', run: 'BirdDemo', expect: 'Eagle flies', code: String.raw`abstract class Bird { abstract String name(); }
interface [[Flyer]] { String fly(); }
class Eagle extends Bird [[implements Flyer]] {
    String name() { return "Eagle"; }
    public String fly() { return name() + " flies"; }
}
class Ostrich extends Bird { String name() { return "Ostrich"; } }
class BirdDemo { public static void main(String[] a) { Flyer f = [[new Eagle()]]; System.out.println(f.fly()); } }` }],
    order: [{ id: 'ord-lsp', title: 'Fix a violation', ask: 'Order the steps.', steps: ['Find the subclass that throws or ignores an inherited method', 'Identify the capability not all subtypes share', 'Move that capability into its own interface', 'Remove it from the base class', 'Implement the interface only where it is true'], extra: ['Catch UnsupportedOperationException in every caller'] }]
  }
});
})();
