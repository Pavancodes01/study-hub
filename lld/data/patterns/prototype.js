(function(){
var SRC = String.raw`import java.util.*;

interface Prototype<T> { T copy(); }

class Document implements Prototype<Document> {
    private final String title;
    private final List<String> sections;
    Document(String title, List<String> sections) {
        this.title = title;
        this.sections = new ArrayList<>(sections);             // own list: no sharing
    }
    public Document copy() { return new Document(title, sections); }   // copy constructor = deep enough
    Document withTitle(String t) { return new Document(t, sections); }
    void addSection(String s) { sections.add(s); }
    public String toString() { return title + " " + sections; }
}

class TemplateRegistry {
    private final Map<String, Document> templates = new HashMap<>();
    void register(String key, Document d) { templates.put(key, d); }
    Document create(String key) { return templates.get(key).copy(); }   // never hand out the original
}

class PrototypeDemo {
    public static void main(String[] args) {
        TemplateRegistry reg = new TemplateRegistry();
        reg.register("invoice", new Document("Invoice", List.of("Header", "Items", "Total")));
        Document a = reg.create("invoice").withTitle("Invoice #1");
        a.addSection("Notes");
        Document b = reg.create("invoice");
        System.out.println(a);
        System.out.println(b);
    }
}`;
var dg = { kind: 'class', w: 760, h: 300, classes: [
  { id: 'reg', name: 'TemplateRegistry', x: 24, y: 30, w: 262, fields: ['- templates: Map<String, Document>'], methods: ['+ register(key, d)', '+ create(key): Document'] },
  { id: 'p', name: 'Prototype<T>', stereo: 'interface', x: 420, y: 30, w: 200, fields: [], methods: ['+ copy(): T'] },
  { id: 'd', name: 'Document', x: 420, y: 170, w: 240, fields: ['- title: String', '- sections: List<String>'], methods: ['+ copy(): Document', '+ withTitle(t): Document'] }
], rels: [
  { from: 'reg', to: 'd', type: 'aggregation', fm: '1', tm: '*' },
  { from: 'd', to: 'p', type: 'implements' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'c', name: 'Client' }, { id: 'r', name: 'TemplateRegistry' }, { id: 't', name: 'invoice template' }], msgs: [
  { from: 'c', to: 'r', label: 'create("invoice")', text: 'The client asks for a new document from a named template.', code: ['Document create(String key)'] },
  { from: 'r', to: 't', label: 'copy()', text: 'The registry clones the stored prototype instead of building from scratch.', code: ['return templates.get(key).copy();'] },
  { from: 't', to: 'r', label: 'new Document', ret: true, text: 'A copy with its **own** section list, so edits to it never touch the template.', code: ['public Document copy() { return new Document(title, sections); }', 'this.sections = new ArrayList<>(sections);'] },
  { from: 'r', to: 'c', label: 'document', ret: true, text: 'The client customizes its copy freely.', code: ['a.addSection("Notes");'] }
] };
registerPattern({
  slug: 'prototype', order: 5, kind: 'Creational', title: 'Prototype',
  one: 'Create new objects by ==copying a ready-made example== instead of building them from scratch.',
  analogy: ['Instead of drafting every contract from a blank page, a lawyer copies a template and changes the names. The template itself is never edited.', 'Each prototype knows how to copy itself (`copy()`). A registry keeps named prototypes and hands out copies. The key detail is **deep vs shallow copy**: nested mutable objects (lists) must be copied too.'],
  use: ['objects are expensive to create (parsing, DB lookups) but cheap to copy', 'many objects differ only slightly from a few templates', 'you need copies of objects whose concrete class you do not know'],
  avoid: ['objects are cheap to build', 'deep object graphs with cycles (copying gets tricky)'],
  problem: { text: ['A shallow copy shares the same list: editing the copy silently edits the template too.'], code: String.raw`import java.util.*;
class Document {
    String title; List<String> sections;
    Document(String title, List<String> sections) { this.title = title; this.sections = sections; }
    Document shallowCopy() { return new Document(title, sections); }   // same list object!
}` },
  solution: { text: ['Give the class a `copy()` method (or copy constructor) that copies mutable fields, and keep templates in a registry that only ever returns copies.', 'Java\'s `Cloneable`/`clone()` exists but is awkward (shallow by default, checked exceptions); copy constructors or explicit `copy()` methods are preferred.'], code: SRC, file: 'PrototypeDemo.java', expect: 'Invoice #1 [Header, Items, Total, Notes]\nInvoice [Header, Items, Total]' },
  flows: [
    { name: 'Class diagram', title: 'Prototype', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Something that can copy itself', add: ['p'], on: ['p'], text: 'A tiny interface with `copy()`.', code: ['interface Prototype<T> { T copy(); }'] },
      { title: 'The prototype', add: ['d'], on: ['d'], rels: ['d-p'], text: '`Document` copies itself, including a new list for `sections` (a deep-enough copy).', code: ['public Document copy() { return new Document(title, sections); }', 'this.sections = new ArrayList<>(sections);'] },
      { title: 'Registry of templates', add: ['reg'], on: ['reg'], rels: ['reg-d'], text: 'Templates are registered once; `create` returns copies, so templates stay untouched.', code: ['class TemplateRegistry {', 'Document create(String key) { return templates.get(key).copy(); }'] }
    ]},
    { name: 'Create from template', title: 'Cloning a template', diagram: seq, code: '@main' }
  ],
  jdk: [['`Object.clone()` / `Cloneable`', 'The built-in (and awkward) prototype mechanism; arrays\' `clone()` is commonly used.'], ['`new ArrayList<>(other)`', 'Copy constructors across the collections API.'], ['Spring `prototype` scope', 'Container creates a new bean each time it is requested.']],
  related: [['Builder', 'Builds from scratch step by step; Prototype starts from a finished example.'], ['Factory Method', 'Can return copies of prototypes instead of new instances.'], ['Memento', 'Also copies state, but to restore it later.']],
  pitfalls: [['Shallow copies', 'Copying references to mutable lists shares them between copies.'], ['Using clone() blindly', '`super.clone()` is shallow and needs `Cloneable`; easy to get wrong.'], ['Handing out the template', 'Return copies only, or someone will edit the template.']],
  probe: [['Shallow vs deep copy?', ['Shallow copies the fields as they are, so nested mutable objects are shared. Deep copies nested mutable objects too. Immutable fields (String) can be shared safely.']], ['Why prefer copy constructors over clone()?', ['Clearer, no `Cloneable` marker or checked exception, works with final fields, and you control exactly what is deep-copied.']]],
  say: ['Documents start from templates, so the registry returns copies of stored prototypes.', 'The copy creates a new section list so edits never touch the template.'],
  facts: [['copy()', 'object copies itself'], ['deep', 'copy mutable fields'], ['registry', 'named templates']],
  checklist: ['Explain shallow vs deep copy with an example.', 'Write a copy constructor.', 'Explain the template registry.'],
  drills: {
    mcq: [{ id: 'mcq-shallow', title: 'Edited template', ask: 'After copying a template and adding a section to the copy, the template also shows the new section. Why?', options: [['The copy shares the same list object (shallow copy)', true, 'Copy the list when copying the object.'], ['Strings are immutable', false, 'Strings are not the problem.'], ['The registry is a singleton', false, 'Unrelated.'], ['The JVM caches objects', false, 'It does not.']] }],
    code: [{ id: 'code-copy', title: 'Deep-enough copy', ask: 'Make the copy independent.', run: 'CopyDemo', expect: '[a]\n[a, b]', code: String.raw`import java.util.*;
class Doc {
    final List<String> parts;
    Doc(List<String> parts) { this.parts = [[new ArrayList<>(parts)]]; }
    Doc copy() { return new Doc([[parts]]); }
}
class CopyDemo {
    public static void main(String[] args) {
        Doc t = new Doc(List.of("a"));
        Doc c = t.copy();
        c.parts.[[add("b")]];
        System.out.println(t.parts);
        System.out.println(c.parts);
    }
}` }],
    order: [{ id: 'ord-proto', title: 'Template registry', ask: 'Order the steps.', steps: ['Create an expensive template object once', 'Register it under a name', 'On request, look up the template', 'Return a deep-enough copy', 'Caller customizes the copy'], extra: ['Return the template itself'] }]
  }
});
})();
