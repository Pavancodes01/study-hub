(function(){
var SRC = String.raw`import java.util.*;

final class HttpRequest {
    private final String method, url, body;
    private final Map<String, String> headers;
    private final int timeoutMs;

    private HttpRequest(Builder b) {                       // only the builder can construct
        this.method = b.method; this.url = b.url; this.body = b.body;
        this.headers = Map.copyOf(b.headers); this.timeoutMs = b.timeoutMs;
    }
    static Builder builder(String url) { return new Builder(url); }

    public String toString() {
        return method + " " + url + " headers=" + new TreeMap<>(headers) + " timeout=" + timeoutMs
            + (body == null ? "" : " body=" + body);
    }

    static final class Builder {
        private final String url;                          // required
        private String method = "GET";                     // optional, with defaults
        private String body;
        private final Map<String, String> headers = new HashMap<>();
        private int timeoutMs = 5000;

        private Builder(String url) { this.url = url; }
        Builder method(String m) { this.method = m; return this; }       // return this: chaining
        Builder header(String k, String v) { headers.put(k, v); return this; }
        Builder body(String b) { this.body = b; return this; }
        Builder timeoutMs(int t) { this.timeoutMs = t; return this; }

        HttpRequest build() {
            if (body != null && method.equals("GET")) throw new IllegalStateException("GET cannot have a body");
            return new HttpRequest(this);                  // validate once, then create
        }
    }
}

class BuilderDemo {
    public static void main(String[] args) {
        HttpRequest r = HttpRequest.builder("https://api.example.com/orders")
            .method("POST").header("Auth", "token").body("{\"id\":1}").timeoutMs(2000)
            .build();
        System.out.println(r);
        System.out.println(HttpRequest.builder("https://api.example.com/health").build());
    }
}`;
var dg = { kind: 'class', w: 780, h: 330, classes: [
  { id: 'c', name: 'Client', x: 24, y: 120, w: 150, fields: [], methods: ['+ main()'] },
  { id: 'b', name: 'HttpRequest.Builder', x: 250, y: 20, w: 270, fields: ['- url: String', '- method: String = "GET"', '- headers: Map', '- timeoutMs: int = 5000'], methods: ['+ method(m): Builder', '+ header(k, v): Builder', '+ build(): HttpRequest'] },
  { id: 'r', name: 'HttpRequest', x: 580, y: 60, w: 190, fields: ['- method, url, body', '- headers: Map', '- timeoutMs: int'], methods: ['- HttpRequest(b: Builder)'] }
], rels: [
  { from: 'c', to: 'b', type: 'dependency', label: 'configures' },
  { from: 'b', to: 'r', type: 'dependency', label: 'build()' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'c', name: 'Client' }, { id: 'b', name: 'Builder' }, { id: 'r', name: 'HttpRequest' }], msgs: [
  { from: 'c', to: 'b', label: 'builder(url)', text: 'Start with the required field only.', code: ['static Builder builder(String url) { return new Builder(url); }'] },
  { from: 'c', to: 'b', label: 'method("POST")', text: 'Each setter stores a value and returns `this`, so calls chain.', code: ['Builder method(String m) { this.method = m; return this; }'] },
  { from: 'c', to: 'b', label: 'header("Auth", …)', text: 'Optional parts in any order; unset ones keep defaults.', code: ['Builder header(String k, String v) { headers.put(k, v); return this; }'] },
  { from: 'c', to: 'b', label: 'build()', text: '`build()` validates the whole combination once (no GET with a body).', code: ['HttpRequest build() {', 'if (body != null && method.equals("GET"))'] },
  { from: 'b', to: 'r', label: 'new HttpRequest(this)', text: 'Only now is the immutable object created, fully valid from birth.', code: ['return new HttpRequest(this);', 'private HttpRequest(Builder b) {'] },
  { from: 'b', to: 'c', label: 'request', ret: true, text: 'The client gets a finished, immutable request.', code: ['.build();'] }
] };
registerPattern({
  slug: 'builder', order: 4, kind: 'Creational', title: 'Builder',
  one: 'Construct a complex object ==step by step with readable, named calls==, validate once, and get an immutable result.',
  analogy: ['Ordering a custom sandwich: bread first, then fillings, sauce, toasted or not, in any order you like, and only at the end the sandwich is made. You never receive a half-made sandwich.', 'A nested `Builder` collects values with chained methods, applies defaults, validates in `build()`, and then calls a private constructor of the immutable class.'],
  use: ['many optional parameters (more than 3–4)', 'constructors like `new Request(a, null, null, 5000, true)` that nobody can read', 'immutable objects that must be valid at creation', 'the same steps build different representations'],
  avoid: ['two or three required fields (a constructor is clearer)', 'mutable objects that are fine with setters'],
  problem: { text: ['Telescoping constructors: which `null` means what? Swapping two `String` arguments compiles fine and breaks at runtime.'], code: String.raw`class HttpRequest {
    HttpRequest(String url) { this(url, "GET", null, null, 5000); }
    HttpRequest(String url, String method) { this(url, method, null, null, 5000); }
    HttpRequest(String url, String method, String body, java.util.Map<String, String> headers, int timeout) { }
}
class Caller {
    HttpRequest r = new HttpRequest("https://x", "POST", null, null, 2000);   // what are these nulls?
}` },
  solution: { text: ['A static nested `Builder` with one method per field, each returning `this`. `build()` checks the combination and calls the private constructor. The resulting `HttpRequest` has only `final` fields.'], code: SRC, file: 'BuilderDemo.java', expect: 'POST https://api.example.com/orders headers={Auth=token} timeout=2000 body={"id":1}\nGET https://api.example.com/health headers={} timeout=5000' },
  flows: [
    { name: 'Class diagram', title: 'Builder', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The product', add: ['r'], on: ['r'], text: 'Immutable `HttpRequest`: final fields, private constructor that takes a Builder.', code: ['final class HttpRequest {', 'private HttpRequest(Builder b) {'] },
      { title: 'The builder', add: ['b'], on: ['b'], rels: ['b-r'], text: 'Holds the same fields, with defaults, and one chaining method per field.', code: ['static final class Builder {', 'private String method = "GET";'] },
      { title: 'The client', add: ['c'], on: ['c'], rels: ['c-b'], text: 'Readable call site: every value has a name.', code: ['HttpRequest r = HttpRequest.builder("https://api.example.com/orders")', '.method("POST").header("Auth", "token")'] },
      { title: 'Validate once', on: ['b'], text: '`build()` is the single place to check rules that involve several fields.', code: ['HttpRequest build() {', 'throw new IllegalStateException("GET cannot have a body");'] }
    ]},
    { name: 'Building a request', title: 'Step-by-step construction', diagram: seq, code: '@main' }
  ],
  jdk: [['`StringBuilder`', 'Builds a string step by step, `toString()` is the build.'], ['`HttpRequest.newBuilder()` (java.net.http)', 'Real JDK builder for HTTP requests.'], ['`Stream.Builder`, `Locale.Builder`', 'Fluent builders in the standard library.'], ['Lombok `@Builder`', 'Generates exactly this code.']],
  related: [['Abstract Factory', 'Returns finished objects in one call; Builder constructs one object in steps.'], ['Fluent interface', 'The chaining style; Builder adds validation and an immutable result.'], ['Prototype', 'Copy an existing object instead of building from scratch.']],
  pitfalls: [['Forgetting required fields', 'Put required ones in `builder(url)` or validate them in `build()`.'], ['Mutable product', 'Copy collections (`Map.copyOf`) so later builder changes do not leak in.'], ['Builder for tiny classes', 'A record or constructor is clearer for 2–3 fields.']],
  probe: [['How do you enforce required fields?', ['Take them in the builder\'s constructor or static `builder(...)` method, and check invariants in `build()` (throw `IllegalStateException`).']], ['Why make the product immutable?', ['Thread-safe without locks, safe to share and cache, and always valid because it is checked once at construction.']], ['Builder vs telescoping constructors vs setters?', ['Constructors become unreadable with many optional args; setters allow half-built, mutable objects. Builder gives readable calls plus an immutable, validated result.']]],
  say: ['Requests have many optional fields, so I\'ll use a builder and keep `HttpRequest` immutable.', 'Validation that spans fields lives in `build()`.'],
  facts: [['return this', 'enables chaining'], ['build()', 'validate + create'], ['private ctor', 'only the builder creates'], ['final fields', 'immutable result']],
  checklist: ['Write a builder with required and optional fields.', 'Explain why the product is immutable.', 'Explain where validation goes.'],
  drills: {
    mcq: [{ id: 'mcq-when', kind: 'Which pattern?', title: 'Pizza order', ask: 'A `Pizza` has size (required) and 12 optional toppings and options. Constructors are unreadable. Pattern?', options: [['Builder', true, 'Named, chained optional settings with one validated build.'], ['Singleton', false, 'Not about construction parameters.'], ['Adapter', false, 'Converts interfaces.'], ['Observer', false, 'Not about creation.']] }],
    code: [{ id: 'code-b', title: 'Write the builder methods', ask: 'Complete the chaining builder.', run: 'PizzaDemo', expect: 'LARGE [cheese, olives]', code: String.raw`import java.util.*;
final class Pizza {
    private final String size; private final List<String> toppings;
    private Pizza(Builder b) { size = b.size; toppings = List.copyOf(b.toppings); }
    public String toString() { return size + " " + toppings; }
    static final class Builder {
        private final String size; private final List<String> toppings = new ArrayList<>();
        Builder(String size) { this.size = size; }
        Builder topping(String t) { toppings.add(t); return [[this]]; }
        Pizza build() { return [[new Pizza(this)]]; }
    }
}
class PizzaDemo {
    public static void main(String[] args) {
        System.out.println(new Pizza.Builder("LARGE").topping("cheese").[[topping("olives")]].build());
    }
}` }],
    order: [{ id: 'ord-b', title: 'Write a builder', ask: 'Order the steps.', steps: ['Make the product\'s fields final and its constructor private', 'Add a static nested Builder with the same fields and defaults', 'Add one method per field that sets it and returns this', 'In build(), validate and call the private constructor', 'Callers chain methods and call build()'], extra: ['Add public setters to the product'] }]
  }
});
})();
