(function(){
var SRC = `interface Shape {
    double area();
}

class Circle implements Shape {
    private final double r;
    Circle(double r) { this.r = r; }
    public double area() { return Math.PI * r * r; }
}

class Rectangle implements Shape {
    private final double w, h;
    Rectangle(double w, double h) { this.w = w; this.h = h; }
    public double area() { return w * h; }
}

class Triangle implements Shape {                  // added later: no other class changed
    private final double base, height;
    Triangle(double base, double height) { this.base = base; this.height = height; }
    public double area() { return 0.5 * base * height; }
}

class AreaCalculator {
    double total(java.util.List<Shape> shapes) {
        double sum = 0;
        for (Shape s : shapes) sum += s.area();    // works for any Shape, now and later
        return sum;
    }
}

class OcpDemo {
    public static void main(String[] args) {
        var shapes = java.util.List.of(new Rectangle(2, 3), new Triangle(4, 5), new Circle(1));
        System.out.printf(java.util.Locale.ROOT, "%.2f%n", new AreaCalculator().total(shapes));
    }
}`;
var dg = { kind: 'class', w: 760, h: 320, classes: [
  { id: 'calc', name: 'AreaCalculator', x: 24, y: 40, w: 272, fields: [], methods: ['+ total(shapes: List<Shape>): double'] },
  { id: 'shape', name: 'Shape', stereo: 'interface', x: 400, y: 40, w: 200, fields: [], methods: ['+ area(): double'] },
  { id: 'circle', name: 'Circle', x: 230, y: 210, w: 160, fields: ['- r: double'], methods: ['+ area(): double'] },
  { id: 'rect', name: 'Rectangle', x: 410, y: 210, w: 160, fields: ['- w, h: double'], methods: ['+ area(): double'] },
  { id: 'tri', name: 'Triangle', x: 590, y: 210, w: 160, fields: ['- base, height'], methods: ['+ area(): double'] }
], rels: [
  { from: 'calc', to: 'shape', type: 'dependency', label: 'uses' },
  { from: 'circle', to: 'shape', type: 'implements' },
  { from: 'rect', to: 'shape', type: 'implements' },
  { from: 'tri', to: 'shape', type: 'implements' }
] };

registerBasic({
  slug: 'ocp', order: 3, group: 'SOLID', title: 'Open/Closed principle',
  one: 'Classes should be ==open for extension but closed for modification==: add new behaviour by adding code, not by editing code that already works.',
  picture: [
    'A power strip has sockets. To use a new appliance you plug it in; you do not rewire the strip. The strip is "closed" (finished, tested) but "open" (anything with the right plug works).',
    'In Java, the socket is an **interface** and the appliances are classes that implement it. Code written against the interface keeps working when new implementations arrive.'
  ],
  mainCode: SRC, mainFile: 'OcpDemo.java', mainExpect: '19.14',
  flows: [
    { name: 'Class diagram', title: 'Open/Closed with an interface', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The stable part', add: ['calc'], on: ['calc'], text: '`AreaCalculator` sums areas. We want to write it once and never touch it again.', code: ['class AreaCalculator {'] },
      { title: 'Depend on an abstraction', add: ['shape'], on: ['shape'], rels: ['calc-shape'], text: 'It only knows the `Shape` interface. That interface is the extension point.', code: ['interface Shape {', 'for (Shape s : shapes) sum += s.area();'] },
      { title: 'Existing shapes plug in', add: ['circle', 'rect'], on: ['circle', 'rect'], text: 'Circle and Rectangle each know their own area formula.', code: ['class Circle implements Shape {', 'class Rectangle implements Shape {'] },
      { title: 'Extend: add Triangle', add: ['tri'], on: ['tri'], rels: ['tri-shape'], text: 'A new requirement arrives. We **add** a class. `AreaCalculator`, `Circle` and `Rectangle` are not edited, so nothing that worked can break.', code: ['class Triangle implements Shape {'] }
    ]}
  ],
  sections: [
    { name: 'Spotting a violation', text: ['Look for if/else or switch on a type (`instanceof`, a `type` field, an enum) that you must edit every time a new kind appears. Each edit risks breaking the old branches and forces retesting them.'],
      badLabel: 'Violates OCP', bad: `class AreaCalculator {
    double area(Object s) {
        if (s instanceof Circle c) return Math.PI * c.r * c.r;
        if (s instanceof Rectangle r) return r.w * r.h;
        throw new IllegalArgumentException("unknown shape");   // edit me for every new shape
    }
}
class Circle { double r; }
class Rectangle { double w, h; }`,
      goodLabel: 'Follows OCP', good: `interface Shape { double area(); }
class Circle implements Shape {
    double r;
    public double area() { return Math.PI * r * r; }
}
class AreaCalculator {
    double area(Shape s) { return s.area(); }                 // never changes
}` },
    { name: 'Ways to stay open', text: ['Polymorphism through interfaces (above). The **Strategy** pattern for swappable algorithms. **Decorator** to add behaviour around an object. Plugins discovered by a registry or `ServiceLoader`. Configuration and data instead of code where possible.'] },
    { name: 'Do not over-apply it', text: ['OCP is about the parts that **actually** change. Wrapping every method in an interface "just in case" adds indirection with no benefit. Wait for the second or third variant, then extract the abstraction.'] }
  ],
  pitfalls: [
    ['Interfaces for everything', 'Abstractions nobody extends make code harder to read. Abstract where change really happens.'],
    ['Type switches hidden elsewhere', 'Moving the switch to a factory is fine; copying it into five places is not.'],
    ['Editing the interface often', 'If every new variant needs a new interface method, the abstraction is wrong.'],
    ['Confusing with "never edit code"', 'Bug fixes and refactors still edit code. OCP is about adding features without changing stable code.']
  ],
  probe: [
    ['How do you know where to apply OCP?', ['Where requirements keep changing in the same direction: new payment methods, new report formats, new shapes. Put an interface at that seam, implement each variant separately.']],
    ['Which patterns help with OCP?', ['Strategy, Decorator, Template Method, Observer, Factory Method. All let you add behaviour by adding classes.']],
    ['Is a switch statement always a violation?', ['No. A single switch inside a factory that maps a config value to a class is a common, acceptable place. The problem is switches on type spread through business logic.']]
  ],
  say: ['New report formats keep coming, so I\'ll put an `Exporter` interface at that seam.', 'Adding a format is a new class; the export service never changes.', 'I only add an abstraction where change actually happens.'],
  facts: [['open', 'for extension (add classes)'], ['closed', 'for modification (no edits)'], ['tool', 'interfaces + polymorphism']],
  checklist: ['State OCP in one sentence.', 'Spot a type switch that violates OCP.', 'Refactor it using an interface.', 'Name three patterns that support OCP.'],
  drills: {
    mcq: [
      { id: 'mcq-spot', title: 'Spot the violation', ask: 'Which code most clearly violates Open/Closed?', options: [
        ['`if (type == PDF) … else if (type == CSV) … else if (type == XLSX) …` in the export service', true, 'Every new format edits this method.'],
        ['An `Exporter` interface with one class per format', false, 'That is the OCP-friendly version.'],
        ['A constant `MAX_ROWS = 1000`', false, 'Constants are not about extension.'],
        ['A private helper method', false, 'Unrelated.']
      ]}
    ],
    code: [
      { id: 'code-ocp', title: 'Add a shape without editing', ask: 'Make `Square` work with the calculator by only adding code.', run: 'SquareDemo', expect: '9.0', code: `interface Shape { double area(); }

class Square [[implements Shape]] {
    private final double side;
    Square(double side) { this.side = side; }
    public double area() { return [[side * side]]; }
}

class AreaCalculator {
    double total(java.util.List<Shape> shapes) {
        double sum = 0;
        for ([[Shape]] s : shapes) sum += s.area();
        return sum;
    }
}

class SquareDemo {
    public static void main(String[] args) {
        System.out.println(new AreaCalculator().total(java.util.List.of(new Square(3))));
    }
}` }
    ],
    order: [
      { id: 'ord-ocp', title: 'Refactor toward OCP', ask: 'Order the steps.', steps: ['Find the switch on type that keeps changing', 'Define an interface for the varying behaviour', 'Move each branch into its own implementing class', 'Make the caller depend only on the interface', 'Add new variants as new classes'], extra: ['Add a new else-if for the next type'] }
    ]
  }
});
})();
