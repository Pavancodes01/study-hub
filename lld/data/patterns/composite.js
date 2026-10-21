(function(){
var SRC = String.raw`import java.util.*;

interface FsNode {                                    // leaves and folders look the same
    String name();
    long size();
    void print(String indent);
}

class FileNode implements FsNode {
    private final String name; private final long size;
    FileNode(String name, long size) { this.name = name; this.size = size; }
    public String name() { return name; }
    public long size() { return size; }
    public void print(String indent) { System.out.println(indent + name + " (" + size + ")"); }
}

class Folder implements FsNode {
    private final String name;
    private final List<FsNode> children = new ArrayList<>();   // files or folders
    Folder(String name) { this.name = name; }
    void add(FsNode child) { children.add(child); }
    public String name() { return name; }
    public long size() {
        long total = 0;
        for (FsNode c : children) total += c.size();          // recursion through the tree
        return total;
    }
    public void print(String indent) {
        System.out.println(indent + name + "/ (" + size() + ")");
        for (FsNode c : children) c.print(indent + "  ");
    }
}

class CompositeDemo {
    public static void main(String[] args) {
        Folder root = new Folder("root");
        Folder docs = new Folder("docs");
        docs.add(new FileNode("cv.pdf", 120));
        docs.add(new FileNode("notes.txt", 5));
        root.add(docs);
        root.add(new FileNode("photo.jpg", 300));
        root.print("");
        System.out.println("total " + root.size());
    }
}`;
var dg = { kind: 'class', w: 760, h: 320, classes: [
  { id: 'n', name: 'FsNode', stereo: 'interface', x: 270, y: 20, w: 220, fields: [], methods: ['+ name(): String', '+ size(): long', '+ print(indent)'] },
  { id: 'f', name: 'FileNode', x: 60, y: 200, w: 200, fields: ['- name: String', '- size: long'], methods: ['+ size(): long'] },
  { id: 'd', name: 'Folder', x: 440, y: 200, w: 250, fields: ['- children: List<FsNode>'], methods: ['+ add(child: FsNode)', '+ size(): sum of children'] }
], rels: [
  { from: 'f', to: 'n', type: 'implements' },
  { from: 'd', to: 'n', type: 'implements' },
  { from: 'd', to: 'n', type: 'aggregation', tm: '*', label: 'children', via: [[720, 245], [720, 75]] }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'c', name: 'Client' }, { id: 'r', name: 'root' }, { id: 'd', name: 'docs' }, { id: 'f', name: 'cv.pdf' }], msgs: [
  { from: 'c', to: 'r', label: 'size()', text: 'Ask the root folder for its size. The client does not care whether it holds files or folders.', code: ['System.out.println("total " + root.size());'] },
  { from: 'r', to: 'd', label: 'size()', text: 'A folder asks each child. This child is itself a folder.', code: ['for (FsNode c : children) total += c.size();'] },
  { from: 'd', to: 'f', label: 'size()', text: 'The folder asks its file.', code: ['for (FsNode c : children) total += c.size();'] },
  { from: 'f', to: 'd', label: '120', ret: true, text: 'Leaves answer directly. (notes.txt adds 5 the same way.)', code: ['public long size() { return size; }'] },
  { from: 'd', to: 'r', label: '125', ret: true, text: 'docs returns the sum of its children.', code: ['return total;'] },
  { from: 'r', to: 'c', label: '425', ret: true, text: 'root adds photo.jpg (300). Same method, whole tree.', code: ['return total;'] }
] };
registerPattern({
  slug: 'composite', order: 10, kind: 'Structural', title: 'Composite',
  one: 'Treat ==single objects and groups of objects the same way== by giving them one interface, so trees can be processed recursively.',
  analogy: ['A company org chart: asking a manager "what does your team cost?" works the same whether the team is one person or ten sub-teams. Each manager asks their reports and adds up.', 'Leaves (files) and composites (folders) implement the same interface. A composite holds children of that interface and forwards calls to them.'],
  use: ['tree structures: file systems, menus, org charts, UI widget trees, expressions', 'clients should not care if they hold one item or a group', 'operations naturally recurse (size, render, price)'],
  avoid: ['the structure is not a tree', 'leaves and groups need very different operations'],
  problem: { text: ['Client code checks `instanceof Folder` everywhere and writes its own recursion each time.'], code: String.raw`import java.util.*;
class FileNode { long size; }
class Folder { List<Object> children = new ArrayList<>(); }
class Sizer {
    long size(Object o) {
        if (o instanceof FileNode f) return f.size;
        long t = 0;
        for (Object c : ((Folder) o).children) t += size(c);   // type checks spread everywhere
        return t;
    }
}` },
  solution: { text: ['One interface `FsNode`. `FileNode` answers directly; `Folder` keeps a list of `FsNode` children and sums them. Recursion lives inside the composite, once.'], code: SRC, file: 'CompositeDemo.java', expect: 'root/ (425)\n  docs/ (125)\n    cv.pdf (120)\n    notes.txt (5)\n  photo.jpg (300)\ntotal 425' },
  flows: [
    { name: 'Class diagram', title: 'Composite', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Component', add: ['n'], on: ['n'], text: 'One interface for every node in the tree.', code: ['interface FsNode {'] },
      { title: 'Leaf', add: ['f'], on: ['f'], text: 'Files have no children and answer directly.', code: ['class FileNode implements FsNode {'] },
      { title: 'Composite', add: ['d'], on: ['d'], rels: ['d-n'], text: 'A folder **is** an `FsNode` and **has many** `FsNode` children. That loop back to the interface is what makes a tree.', code: ['class Folder implements FsNode {', 'private final List<FsNode> children = new ArrayList<>();'] },
      { title: 'Recursion inside', on: ['d'], text: 'The folder\'s `size()` sums its children; children that are folders do the same.', code: ['for (FsNode c : children) total += c.size();'] }
    ]},
    { name: 'size() down the tree', title: 'Recursive call', diagram: seq, code: '@main' }
  ],
  jdk: [['Swing `Container` / `Component`', 'A container is a component holding components.'], ['`java.nio.file` walking', 'Directories contain paths; `Files.walk` treats them uniformly.'], ['DOM `Node`', 'Elements contain nodes, which may contain nodes.']],
  related: [['Decorator', 'Wraps exactly one child; composite holds many.'], ['Iterator', 'Often used to walk composites.'], ['Visitor', 'Adds new operations over a composite tree without editing node classes.']],
  pitfalls: [['add() on leaves', 'Putting `add` in the shared interface forces leaves to throw. Keep it on the composite (safer) unless uniformity is crucial.'], ['Cycles', 'Adding a folder to its own child creates infinite recursion; guard against it.'], ['Deep trees', 'Very deep recursion can overflow the stack; iterate with an explicit stack if needed.']],
  probe: [['Where do you put add/remove?', ['Either on the component interface (uniform, but leaves must throw) or only on the composite (type-safe, but clients must know they hold a composite). Most Java code chooses the composite only.']], ['How would you compute size efficiently for a huge tree?', ['Cache sizes in folders and update ancestors when a child changes, instead of recomputing the whole subtree.']]],
  say: ['Files and folders share an `FsNode` interface, and folders hold a list of `FsNode`, so size and print are recursive and uniform.'],
  facts: [['component', 'shared interface'], ['leaf', 'no children'], ['composite', 'holds components']],
  checklist: ['Draw the composite structure.', 'Write a recursive operation in the composite.', 'Explain where add/remove should live.'],
  drills: {
    mcq: [{ id: 'mcq-c', kind: 'Which pattern?', title: 'Menu items', ask: 'A restaurant menu has items and sub-menus that contain items and more sub-menus. You need total price and printing. Pattern?', options: [['Composite', true, 'Items and sub-menus share an interface; sub-menus hold children.'], ['Strategy', false, 'Not a tree.'], ['Adapter', false, 'Not converting interfaces.'], ['Command', false, 'Not about requests.']] }],
    code: [{ id: 'code-c', title: 'Sum a tree', ask: 'Complete the composite\'s recursive total.', run: 'MenuDemo', expect: '45', code: String.raw`import java.util.*;
interface MenuPart { int price(); }
class Item implements MenuPart { final int p; Item(int p) { this.p = p; } public int price() { return p; } }
class Menu implements MenuPart {
    final List<[[MenuPart]]> parts = new ArrayList<>();
    Menu add(MenuPart m) { parts.add(m); return this; }
    public int price() {
        int t = 0;
        for (MenuPart m : parts) t += [[m.price()]];
        return t;
    }
}
class MenuDemo {
    public static void main(String[] args) {
        Menu drinks = new Menu().add(new Item(10)).add(new Item(15));
        Menu all = new Menu().add(drinks).add([[new Item(20)]]);
        System.out.println(all.price());
    }
}` }],
    order: [{ id: 'ord-c', title: 'Build a composite', ask: 'Order the steps.', steps: ['Define a component interface with the shared operations', 'Implement leaves that answer directly', 'Implement a composite holding a list of components', 'In the composite, loop over children and combine results', 'Build the tree and call the operation on the root'], extra: ['Check instanceof in every client'] }]
  }
});
})();
