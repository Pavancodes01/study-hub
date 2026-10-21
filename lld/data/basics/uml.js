(function(){
var SRC = String.raw`import java.util.*;

interface Enrollable { boolean canEnroll(); }

abstract class Person {
    protected final String name;
    Person(String name) { this.name = name; }
}

class Student extends Person implements Enrollable {        // inheritance + realization
    Student(String name) { super(name); }
    public boolean canEnroll() { return true; }
}

class Professor extends Person {
    Professor(String name) { super(name); }
}

class Course {                                               // association: knows its teacher
    final String title;
    final Professor teacher;
    Course(String title, Professor teacher) { this.title = title; this.teacher = teacher; }
}

class Department {                                           // aggregation: professors exist on their own
    final List<Professor> professors = new ArrayList<>();
}

class University {                                           // composition: creates and owns departments
    private final List<Department> departments = new ArrayList<>();
    Department addDepartment() { Department d = new Department(); departments.add(d); return d; }
    int size() { return departments.size(); }
}

class Registrar {                                            // dependency: only uses them as parameters
    String enroll(Student s, Course c) { return s.name + " -> " + c.title; }
}

class UmlDemo {
    public static void main(String[] args) {
        University uni = new University();
        Department cs = uni.addDepartment();
        Professor rao = new Professor("Rao");
        cs.professors.add(rao);
        Course lld = new Course("LLD", rao);
        System.out.println(new Registrar().enroll(new Student("Maya"), lld));
        System.out.println("departments: " + uni.size());
    }
}`;
var dg = { kind: 'class', w: 860, h: 470, classes: [
  { id: 'uni', name: 'University', x: 20, y: 20, w: 200, fields: ['- departments: List'], methods: ['+ addDepartment()'] },
  { id: 'dep', name: 'Department', x: 20, y: 190, w: 200, fields: ['- professors: List'], methods: [] },
  { id: 'prof', name: 'Professor', x: 300, y: 200, w: 170, fields: [], methods: [] },
  { id: 'course', name: 'Course', x: 300, y: 340, w: 170, fields: ['- teacher: Professor'], methods: [] },
  { id: 'person', name: 'Person', stereo: 'abstract', x: 400, y: 30, w: 170, fields: ['# name: String'], methods: [] },
  { id: 'stu', name: 'Student', x: 600, y: 200, w: 170, fields: [], methods: ['+ canEnroll()'] },
  { id: 'en', name: 'Enrollable', stereo: 'interface', x: 640, y: 30, w: 190, fields: [], methods: ['+ canEnroll(): boolean'] },
  { id: 'reg', name: 'Registrar', x: 600, y: 350, w: 230, fields: [], methods: ['+ enroll(s, c): String'] }
], rels: [
  { from: 'uni', to: 'dep', type: 'composition', fm: '1', tm: '1..*' },
  { from: 'dep', to: 'prof', type: 'aggregation', fm: '1', tm: '*' },
  { from: 'course', to: 'prof', type: 'association', label: 'teacher' },
  { from: 'prof', to: 'person', type: 'inherits' },
  { from: 'stu', to: 'person', type: 'inherits' },
  { from: 'stu', to: 'en', type: 'implements' },
  { from: 'reg', to: 'stu', type: 'dependency' },
  { from: 'reg', to: 'course', type: 'dependency' }
] };
registerBasic({
  slug: 'uml', order: 8, group: 'Modeling', title: 'Reading UML class diagrams',
  one: 'Six kinds of lines, each with its own arrowhead, say ==how strongly two classes are connected==. Learn them once and every design diagram becomes readable.',
  picture: ['A class box has three parts: name, fields, methods. Signs mean visibility: `+` public, `-` private, `#` protected, `~` package. Italic names are abstract; underlined members are static.', 'Lines, from strongest to weakest bond: **inheritance** (is-a), **realization** (implements), **composition** (owns, same lifetime), **aggregation** (has, separate lifetime), **association** (knows about), **dependency** (uses briefly). Step through the diagram: each step adds one kind.'],
  mainCode: SRC, mainFile: 'UmlDemo.java', mainExpect: 'Maya -> LLD\ndepartments: 1',
  flows: [{ name: 'All six relationships', title: 'A university in UML', diagram: dg, progressive: true, code: '@main', steps: [
    { title: 'Composition: filled diamond', add: ['uni', 'dep'], on: ['uni', 'dep'], text: 'A university **creates and owns** its departments. Delete the university and they go too. Multiplicity `1..*` = one or more.', code: ['class University {', 'Department d = new Department(); departments.add(d);'] },
    { title: 'Aggregation: hollow diamond', add: ['prof'], on: ['dep', 'prof'], rels: ['dep-prof'], text: 'A department **has** professors, but professors exist on their own and can move departments.', code: ['class Department {', 'final List<Professor> professors'] },
    { title: 'Association: plain arrow', add: ['course'], on: ['course'], rels: ['course-prof'], text: 'A course **knows** its teacher (a field), with no ownership.', code: ['final Professor teacher;'] },
    { title: 'Inheritance: hollow triangle', add: ['person', 'stu'], on: ['person', 'stu', 'prof'], rels: ['prof-person', 'stu-person'], text: 'Students and professors **are** persons. Italic name = abstract class.', code: ['abstract class Person {', 'class Student extends Person', 'class Professor extends Person {'] },
    { title: 'Realization: dashed triangle', add: ['en'], on: ['en', 'stu'], rels: ['stu-en'], text: 'Student **implements** the Enrollable interface.', code: ['interface Enrollable', 'implements Enrollable'] },
    { title: 'Dependency: dashed arrow', add: ['reg'], on: ['reg'], rels: ['reg-stu', 'reg-course'], text: 'The registrar only **uses** students and courses as method parameters; it keeps no reference.', code: ['String enroll(Student s, Course c)'] }
  ]}],
  sections: [
    { name: 'Composition vs aggregation in code', text: ['Composition: the whole creates the part and nobody else holds it (`new Department()` inside `University`). Aggregation: the part is passed in from outside and may be shared. In interviews, the difference is lifetime: does the part die with the whole?'] },
    { name: 'Multiplicity', text: ['`1` exactly one, `0..1` optional, `*` or `0..*` many, `1..*` at least one. Written at the end of the line next to the class it counts.'] },
    { name: 'How much UML in an interview?', text: ['Boxes with key fields and methods, correct arrows for inheritance, implements and ownership, and multiplicities on the important links. Skip getters, setters and every private helper.'] }
  ],
  table: { title: 'Cheat sheet', lead: null, head: ['Relationship', 'Line', 'Meaning', 'Java'], rows: [
    ['Inheritance', 'solid, hollow triangle', 'is-a', '`extends`'],
    ['Realization', 'dashed, hollow triangle', 'implements', '`implements`'],
    ['Composition', 'solid, filled diamond at the owner', 'owns, same lifetime', 'field created inside'],
    ['Aggregation', 'solid, hollow diamond at the owner', 'has, independent lifetime', 'field passed in'],
    ['Association', 'solid, open arrow', 'knows about', 'field reference'],
    ['Dependency', 'dashed, open arrow', 'uses briefly', 'parameter / local variable']
  ]},
  pitfalls: [['Diamond on the wrong end', 'The diamond sits at the whole (owner), not the part.'], ['Every line an association', 'Use composition when lifetime is shared; it shows design intent.'], ['Too much detail', 'A diagram with every getter is unreadable; show the important members.']],
  probe: [['Composition vs aggregation?', ['Both are has-a. Composition: the part cannot exist without the whole and is created by it (order lines in an order). Aggregation: the part lives independently and may be shared (players in a team).']], ['Association vs dependency?', ['Association: a lasting link, usually a field. Dependency: temporary use, like a method parameter or a local variable.']]],
  say: ['The order owns its line items (composition), but customers exist independently (association).'],
  facts: [['+ - # ~', 'public private protected package'], ['◆', 'composition (owner end)'], ['◇', 'aggregation'], ['△', 'inheritance / implements']],
  checklist: ['Draw all six relationships correctly.', 'Explain composition vs aggregation by lifetime.', 'Read multiplicities.'],
  drills: {
    mcq: [{ id: 'mcq-uml1', title: 'Order lines', ask: 'An `Order` creates its `OrderLine`s and they are deleted with it. Which relationship?', options: [['Composition (filled diamond at Order)', true, 'Same lifetime, created and owned by the order.'], ['Aggregation', false, 'Lines do not live independently.'], ['Dependency', false, 'It is a lasting relationship.'], ['Inheritance', false, 'An order line is not an order.']] },
      { id: 'mcq-uml2', title: 'Method parameter', ask: '`ReportService.print(Invoice i)` uses `Invoice` only as a parameter. Which line?', options: [['Dependency (dashed arrow)', true, 'Temporary use, no field.'], ['Composition', false, 'No ownership.'], ['Association', false, 'No lasting reference.'], ['Realization', false, 'Not implementing an interface.']] }],
    code: [{ id: 'code-uml', title: 'Composition in code', ask: 'Make the order own its lines.', run: 'OrderDemo', expect: '2', code: String.raw`import java.util.*;
class OrderLine { final String sku; OrderLine(String sku) { this.sku = sku; } }
class Order {
    private final List<OrderLine> lines = new [[ArrayList<>()]];
    void add(String sku) { lines.add([[new OrderLine(sku)]]); }   // created inside: composition
    int size() { return [[lines.size()]]; }
}
class OrderDemo { public static void main(String[] a) { Order o = new Order(); o.add("A"); o.add("B"); System.out.println(o.size()); } }` }],
    order: [{ id: 'ord-uml', title: 'Strongest to weakest', ask: 'Order the relationships from strongest bond to weakest.', steps: ['Inheritance', 'Composition', 'Aggregation', 'Association', 'Dependency'] }]
  }
});
})();
