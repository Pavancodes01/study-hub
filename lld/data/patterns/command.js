(function(){
var SRC = String.raw`import java.util.*;

interface Command {
    void execute();
    void undo();
}

class TextEditor {                                   // the receiver: does the real work
    private final StringBuilder text = new StringBuilder();
    void insert(int pos, String s) { text.insert(pos, s); }
    void delete(int pos, int len) { text.delete(pos, pos + len); }
    String text() { return text.toString(); }
}

class InsertCommand implements Command {
    private final TextEditor editor; private final int pos; private final String s;
    InsertCommand(TextEditor editor, int pos, String s) { this.editor = editor; this.pos = pos; this.s = s; }
    public void execute() { editor.insert(pos, s); }
    public void undo() { editor.delete(pos, s.length()); }
}

class DeleteCommand implements Command {
    private final TextEditor editor; private final int pos, len;
    private String removed;                          // remembered so undo can restore it
    DeleteCommand(TextEditor editor, int pos, int len) { this.editor = editor; this.pos = pos; this.len = len; }
    public void execute() { removed = editor.text().substring(pos, pos + len); editor.delete(pos, len); }
    public void undo() { editor.insert(pos, removed); }
}

class History {                                      // the invoker
    private final Deque<Command> done = new ArrayDeque<>();
    void run(Command c) { c.execute(); done.push(c); }
    void undo() { if (!done.isEmpty()) done.pop().undo(); }
}

class CommandDemo {
    public static void main(String[] args) {
        TextEditor editor = new TextEditor();
        History history = new History();
        history.run(new InsertCommand(editor, 0, "Hello"));
        history.run(new InsertCommand(editor, 5, " world"));
        System.out.println(editor.text());
        history.run(new DeleteCommand(editor, 0, 6));
        System.out.println(editor.text());
        history.undo();
        System.out.println(editor.text());
        history.undo();
        System.out.println(editor.text());
    }
}`;
var dg = { kind: 'class', w: 780, h: 330, classes: [
  { id: 'h', name: 'History', x: 24, y: 30, w: 220, fields: ['- done: Deque<Command>'], methods: ['+ run(c: Command)', '+ undo()'] },
  { id: 'c', name: 'Command', stereo: 'interface', x: 320, y: 30, w: 180, fields: [], methods: ['+ execute()', '+ undo()'] },
  { id: 'ins', name: 'InsertCommand', x: 240, y: 200, w: 200, fields: ['- pos: int', '- s: String'], methods: ['+ execute()', '+ undo()'] },
  { id: 'del', name: 'DeleteCommand', x: 460, y: 200, w: 180, fields: ['- removed: String'], methods: ['+ execute()', '+ undo()'] },
  { id: 'ed', name: 'TextEditor', x: 570, y: 30, w: 200, fields: ['- text: StringBuilder'], methods: ['+ insert(pos, s)', '+ delete(pos, len)'] }
], rels: [
  { from: 'h', to: 'c', type: 'aggregation', tm: '*' },
  { from: 'ins', to: 'c', type: 'implements' },
  { from: 'del', to: 'c', type: 'implements' },
  { from: 'del', to: 'ed', type: 'association', label: 'receiver' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'u', name: 'User' }, { id: 'h', name: 'History' }, { id: 'd', name: 'DeleteCommand' }, { id: 'e', name: 'TextEditor' }], msgs: [
  { from: 'u', to: 'h', label: 'run(delete 0..6)', text: 'The user action is wrapped in an object and handed to the invoker.', code: ['history.run(new DeleteCommand(editor, 0, 6));'] },
  { from: 'h', to: 'd', label: 'execute()', text: 'The invoker runs it and pushes it on the undo stack.', code: ['void run(Command c) { c.execute(); done.push(c); }'] },
  { from: 'd', to: 'e', label: 'delete(0, 6)', text: 'The command remembers what it removed, then calls the receiver.', code: ['removed = editor.text().substring(pos, pos + len); editor.delete(pos, len);'] },
  { from: 'u', to: 'h', label: 'undo()', text: 'Later the user presses undo.', code: ['history.undo();'] },
  { from: 'h', to: 'd', label: 'undo()', text: 'Pop the last command and ask it to reverse itself.', code: ['void undo() { if (!done.isEmpty()) done.pop().undo(); }'] },
  { from: 'd', to: 'e', label: 'insert(0, "Hello ")', text: 'It restores exactly what it removed.', code: ['public void undo() { editor.insert(pos, removed); }'] }
] };
registerPattern({
  slug: 'command', order: 13, kind: 'Behavioral', title: 'Command',
  one: 'Turn a request into an ==object you can store, queue, log and undo==.',
  analogy: ['A waiter writes your order on a slip and puts it on the kitchen rail. The slip can wait in line, be cancelled, or be re-made; the waiter does not cook.', 'Each action becomes a class with `execute()` (and often `undo()`). An **invoker** (history, button, queue) runs commands without knowing what they do. A **receiver** does the real work.'],
  use: ['undo/redo', 'queuing or scheduling work (jobs, retries)', 'logging actions to replay them', 'buttons or menu items that trigger configurable actions', 'transactions: run a list of steps or roll them back'],
  avoid: ['simple direct calls with no undo, queueing or logging needs'],
  problem: { text: ['Editor operations are plain method calls. To add undo you would have to remember, for every kind of action, how to reverse it, inside one big controller.'], code: String.raw`class Editor {
    StringBuilder text = new StringBuilder();
    void onKeyType(String s) { text.append(s); }               // how do we undo this?
    void onDeleteKey(int n) { text.setLength(text.length() - n); }   // and what was deleted?
}` },
  solution: { text: ['Each action is a `Command` with `execute` and `undo`. Commands remember what they need to reverse themselves. `History` executes commands and keeps them on a stack, so undo is just `pop().undo()`.'], code: SRC, file: 'CommandDemo.java', expect: 'Hello world\nworld\nHello world\nHello' },
  flows: [
    { name: 'Class diagram', title: 'Command with undo', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Command interface', add: ['c'], on: ['c'], text: 'Every action can run and reverse itself.', code: ['interface Command {'] },
      { title: 'Receiver', add: ['ed'], on: ['ed'], text: 'Knows how to do the real operations, nothing about undo.', code: ['class TextEditor {'] },
      { title: 'Concrete commands', add: ['ins', 'del'], on: ['ins', 'del'], rels: ['del-ed'], text: 'Hold the receiver and the parameters, plus what they need for undo (`removed`).', code: ['class InsertCommand implements Command {', 'private String removed;'] },
      { title: 'Invoker', add: ['h'], on: ['h'], rels: ['h-c'], text: 'Runs commands and stacks them. It never knows what a command does.', code: ['class History {', 'void undo() { if (!done.isEmpty()) done.pop().undo(); }'] }
    ]},
    { name: 'Delete then undo', title: 'Running and undoing a command', diagram: seq, code: '@main' }
  ],
  jdk: [['`Runnable` / `Callable`', 'A request as an object, submitted to an `ExecutorService` to run later.'], ['Swing `Action`', 'Commands bound to buttons and menu items.'], ['`javax.swing.undo.UndoableEdit`', 'Undo/redo command objects.']],
  related: [['Memento', 'Stores a snapshot for undo instead of a reverse operation.'], ['Strategy', 'Swaps an algorithm; command represents one request to run.'], ['Chain of Responsibility', 'Commands can be passed along a chain of handlers.']],
  pitfalls: [['Undo without enough state', 'Delete must remember the removed text; otherwise undo cannot restore it.'], ['Commands doing the work themselves', 'Keep real logic in receivers; commands coordinate.'], ['Unbounded history', 'Cap the undo stack to limit memory.']],
  probe: [['How do you implement redo?', ['Keep a second stack. Undo pops from `done`, calls `undo()`, pushes to `redo`. Redo pops from `redo`, calls `execute()`, pushes back to `done`. Any new command clears `redo`.']], ['How does this relate to job queues?', ['A job in a queue is a command object: serialized, stored, executed later by a worker, possibly retried.']]],
  say: ['Each edit is a `Command` with execute and undo, and `History` keeps two stacks for undo and redo.'],
  facts: [['command', 'execute + undo'], ['invoker', 'runs, stores'], ['receiver', 'real work'], ['redo', 'second stack']],
  checklist: ['Draw command, invoker, receiver.', 'Implement undo with a stack.', 'Explain how to add redo.'],
  drills: {
    mcq: [{ id: 'mcq-cmd', kind: 'Which pattern?', title: 'Smart home remote', ask: 'Remote buttons must be assignable to any action (lights on, AC off) and support "undo last action". Pattern?', options: [['Command', true, 'Each action is an object with execute and undo; buttons hold commands.'], ['Observer', false, 'Broadcasting changes, not undoable actions.'], ['Facade', false, 'Simplifies a subsystem; no undo.'], ['Composite', false, 'Trees.']] }],
    code: [{ id: 'code-cmd', title: 'Undoable counter', ask: 'Implement execute and undo.', run: 'CounterDemo', expect: '2\n1', code: String.raw`import java.util.*;
class Counter { int value; }
interface Command { void execute(); void undo(); }
class Increment implements Command {
    private final Counter c;
    Increment(Counter c) { this.c = c; }
    public void execute() { [[c.value++]]; }
    public void undo() { [[c.value--]]; }
}
class CounterDemo {
    public static void main(String[] args) {
        Counter c = new Counter();
        Deque<Command> done = new ArrayDeque<>();
        for (int i = 0; i < 2; i++) { Command k = new Increment(c); k.execute(); done.[[push(k)]]; }
        System.out.println(c.value);
        done.pop().[[undo()]];
        System.out.println(c.value);
    }
}` }],
    order: [{ id: 'ord-cmd', title: 'Undo flow', ask: 'Order the steps.', steps: ['Wrap the user action in a command object', 'Invoker calls execute()', 'Invoker pushes the command on the undo stack', 'On undo, invoker pops the last command', 'Invoker calls undo() on it'], extra: ['Invoker inspects the command\'s class to reverse it'] }]
  }
});
})();
