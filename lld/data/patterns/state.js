(function(){
var SRC = String.raw`interface DocState {
    DocState submit(Document d);
    DocState approve(Document d);
    DocState reject(Document d);
}

class Draft implements DocState {
    public DocState submit(Document d) { d.log("sent for review"); return new Review(); }
    public DocState approve(Document d) { d.log("cannot approve a draft"); return this; }
    public DocState reject(Document d) { d.log("already a draft"); return this; }
}

class Review implements DocState {
    public DocState submit(Document d) { d.log("already in review"); return this; }
    public DocState approve(Document d) { d.log("published"); return new Published(); }
    public DocState reject(Document d) { d.log("back to draft"); return new Draft(); }
}

class Published implements DocState {
    public DocState submit(Document d) { d.log("published documents are final"); return this; }
    public DocState approve(Document d) { return submit(d); }
    public DocState reject(Document d) { return submit(d); }
}

class Document {                                      // the context
    private DocState state = new Draft();
    void submit() { state = state.submit(this); }     // delegate, then switch to the returned state
    void approve() { state = state.approve(this); }
    void reject() { state = state.reject(this); }
    void log(String msg) { System.out.println(msg); }
    String stateName() { return state.getClass().getSimpleName(); }
}

class StateDemo {
    public static void main(String[] args) {
        Document d = new Document();
        d.approve();
        d.submit();
        d.reject();
        d.submit();
        d.approve();
        d.submit();
        System.out.println("final: " + d.stateName());
    }
}`;
var dg = { kind: 'class', w: 780, h: 330, classes: [
  { id: 'doc', name: 'Document', x: 24, y: 30, w: 210, fields: ['- state: DocState'], methods: ['+ submit()', '+ approve()', '+ reject()'] },
  { id: 'st', name: 'DocState', stereo: 'interface', x: 330, y: 30, w: 240, fields: [], methods: ['+ submit(d): DocState', '+ approve(d): DocState', '+ reject(d): DocState'] },
  { id: 'dr', name: 'Draft', x: 160, y: 230, w: 150, fields: [], methods: [] },
  { id: 'rv', name: 'Review', x: 380, y: 230, w: 150, fields: [], methods: [] },
  { id: 'pb', name: 'Published', x: 600, y: 230, w: 150, fields: [], methods: [] }
], rels: [
  { from: 'doc', to: 'st', type: 'association', label: 'current state' },
  { from: 'dr', to: 'st', type: 'implements' },
  { from: 'rv', to: 'st', type: 'implements' },
  { from: 'pb', to: 'st', type: 'implements' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'u', name: 'Editor' }, { id: 'd', name: 'Document' }, { id: 'r', name: 'Review' }, { id: 'p', name: 'Published' }], msgs: [
  { from: 'u', to: 'd', label: 'approve()', text: 'The document is in Review. The editor approves.', code: ['d.approve();', 'void approve() { state = state.approve(this); }'] },
  { from: 'd', to: 'r', label: 'approve(doc)', text: 'Document delegates to its current state object. No switch on a status field.', code: ['public DocState approve(Document d) { d.log("published"); return new Published(); }'] },
  { from: 'r', to: 'd', label: 'new Published()', ret: true, text: 'The state decides the next state and returns it.', code: ['return new Published();'] },
  { from: 'u', to: 'd', label: 'submit()', text: 'Same method later…', code: ['d.submit();'] },
  { from: 'd', to: 'p', label: 'submit(doc)', text: '…but now the Published state handles it, with completely different behaviour.', code: ['public DocState submit(Document d) { d.log("published documents are final"); return this; }'] }
] };
registerPattern({
  slug: 'state', order: 14, kind: 'Behavioral', title: 'State',
  one: 'Let an object ==change its behaviour when its internal state changes==, by moving each state\'s behaviour into its own class.',
  analogy: ['A traffic light: the same "timer ticks" event means different things when it is red, green or yellow, and each colour knows which colour comes next.', 'The context (`Document`) holds a current state object. Every action is delegated to that object, which does the right thing for that state and returns the next state.'],
  use: ['behaviour depends on a status and the same switch on status appears in many methods', 'clear lifecycles: orders, documents, vending machines, connections, games', 'transitions have rules ("cannot ship before paying")'],
  avoid: ['two states and one method (a boolean is fine)', 'transitions are simple data that a table or enum handles well'],
  problem: { text: ['Every method switches on `status`, and every new state or rule edits all of them.'], code: String.raw`class Document {
    String status = "DRAFT";
    void approve() {
        switch (status) {
            case "DRAFT" -> System.out.println("cannot approve a draft");
            case "REVIEW" -> status = "PUBLISHED";
            case "PUBLISHED" -> System.out.println("final");
        }
    }
    void submit() { /* the same switch again */ }
    void reject() { /* and again */ }
}` },
  solution: { text: ['One class per state implementing `DocState`. Each method handles one action for that state and returns the next state. `Document` just delegates and stores the returned state. Adding an "Archived" state means one new class.'], code: SRC, file: 'StateDemo.java', expect: 'cannot approve a draft\nsent for review\nback to draft\nsent for review\npublished\npublished documents are final\nfinal: Published' },
  flows: [
    { name: 'Class diagram', title: 'State', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Context', add: ['doc'], on: ['doc'], text: '`Document` has the public actions and a reference to its current state.', code: ['class Document {', 'private DocState state = new Draft();'] },
      { title: 'State interface', add: ['st'], on: ['st'], rels: ['doc-st'], text: 'Every action, each returning the next state.', code: ['interface DocState {'] },
      { title: 'One class per state', add: ['dr', 'rv', 'pb'], on: ['dr', 'rv', 'pb'], text: 'Each state handles every action its own way and decides the transition.', code: ['class Draft implements DocState {', 'class Review implements DocState {', 'class Published implements DocState {'] },
      { title: 'Delegate and switch', on: ['doc'], text: 'No switch statements: `state = state.approve(this)`.', code: ['void approve() { state = state.approve(this); }'] }
    ]},
    { name: 'Approve then submit', title: 'Same call, different state', diagram: seq, code: '@main' }
  ],
  jdk: [['`Thread.State` + thread lifecycle', 'Enum of states (NEW, RUNNABLE, …); the JVM enforces transitions.'], ['TCP connection implementations', 'The classic GoF example: Listen, Established, Closed states.'], ['Spring State Machine', 'A library for state machines with transitions and guards.']],
  related: [['Strategy', 'Same diagram. Strategy is chosen by the client; State switches itself as the object moves through its lifecycle.'], ['Enum with behaviour', 'For small machines, an `enum` where each constant overrides methods is a compact State pattern.'], ['Command', 'Actions can be commands that trigger state transitions.']],
  pitfalls: [['Transitions scattered', 'Keep transition rules inside the states (or one table), not in callers.'], ['Too many tiny classes', 'For 2–3 states with simple rules, an enum switch can be clearer.'], ['Shared mutable state in state objects', 'Keep data in the context; states should be stateless so they can be shared.']],
  probe: [['State vs Strategy?', ['Same structure. In State, the object moves between states by itself according to rules (draft → review → published). In Strategy, the client picks an algorithm and it does not change by itself.']], ['Where do transitions live?', ['Either inside each state (returns the next state, as here) or in a central transition table. Inside states is more OO; a table is easier to read for big machines.']], ['How would you do this with an enum?', ['`enum DocState { DRAFT { DocState submit() { return REVIEW; } }, REVIEW { … }, … }`: each constant overrides abstract methods.']]],
  say: ['Order behaviour depends on its status, so each status is a class implementing `OrderState`, and the order delegates to its current state.'],
  facts: [['context', 'holds current state'], ['state', 'handles actions, returns next'], ['enum', 'compact alternative']],
  checklist: ['Draw context and states.', 'Implement a 3-state machine without switch statements.', 'Explain State vs Strategy.'],
  drills: {
    mcq: [{ id: 'mcq-s', kind: 'Which pattern?', title: 'Order lifecycle', ask: 'An order goes Created → Paid → Shipped → Delivered, and `cancel()` behaves differently in each. Pattern?', options: [['State', true, 'Behaviour depends on the lifecycle stage and transitions follow rules.'], ['Strategy', false, 'The client does not choose; the order moves by itself.'], ['Singleton', false, 'Unrelated.'], ['Adapter', false, 'Unrelated.']] }],
    code: [{ id: 'code-s', title: 'Traffic light', ask: 'Each state returns the next one.', run: 'LightDemo', expect: 'GREEN\nYELLOW\nRED', code: String.raw`interface Light { Light next(); String name(); }
class Red implements Light { public Light next() { return new Green(); } public String name() { return "RED"; } }
class Green implements Light { public Light next() { return [[new Yellow()]]; } public String name() { return "GREEN"; } }
class Yellow implements Light { public Light next() { return [[new Red()]]; } public String name() { return "YELLOW"; } }
class LightDemo {
    public static void main(String[] args) {
        Light l = new Red();
        for (int i = 0; i < 3; i++) { l = [[l.next()]]; System.out.println(l.name()); }
    }
}` }],
    order: [{ id: 'ord-s', title: 'Refactor to State', ask: 'Order the steps.', steps: ['Find the status field that methods switch on', 'Define a state interface with one method per action', 'Create one class per state', 'Move each switch branch into the matching state class', 'Make the context delegate and store the returned state'], extra: ['Add another case to each switch'] }]
  }
});
})();
