(function(){
var SRC = String.raw`import java.util.*;

interface WeatherService {
    String forecast(String city);
}

class RemoteWeatherService implements WeatherService {
    int calls = 0;
    public String forecast(String city) {
        calls++;                                           // pretend this is a slow network call
        return city + ": 31C";
    }
}

class CachingWeatherProxy implements WeatherService {     // same interface as the real service
    private final WeatherService real;
    private final Map<String, String> cache = new HashMap<>();
    CachingWeatherProxy(WeatherService real) { this.real = real; }
    public String forecast(String city) {
        return cache.computeIfAbsent(city, real::forecast);   // call the real one only on a miss
    }
}

class ProxyDemo {
    public static void main(String[] args) {
        RemoteWeatherService remote = new RemoteWeatherService();
        WeatherService weather = new CachingWeatherProxy(remote);
        System.out.println(weather.forecast("Pune"));
        System.out.println(weather.forecast("Pune"));
        System.out.println(weather.forecast("Goa"));
        System.out.println("remote calls: " + remote.calls);
    }
}`;
var dg = { kind: 'class', w: 760, h: 300, classes: [
  { id: 'c', name: 'Client', x: 24, y: 40, w: 150, fields: [], methods: [] },
  { id: 'i', name: 'WeatherService', stereo: 'interface', x: 260, y: 30, w: 220, fields: [], methods: ['+ forecast(city): String'] },
  { id: 'p', name: 'CachingWeatherProxy', x: 150, y: 180, w: 250, fields: ['- real: WeatherService', '- cache: Map<String, String>'], methods: ['+ forecast(city): String'] },
  { id: 'r', name: 'RemoteWeatherService', x: 480, y: 180, w: 240, fields: [], methods: ['+ forecast(city): String'] }
], rels: [
  { from: 'c', to: 'i', type: 'association' },
  { from: 'p', to: 'i', type: 'implements' },
  { from: 'r', to: 'i', type: 'implements' },
  { from: 'p', to: 'r', type: 'association', label: 'delegates' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'c', name: 'Client' }, { id: 'p', name: 'CachingProxy' }, { id: 'r', name: 'RemoteService' }], msgs: [
  { from: 'c', to: 'p', label: 'forecast("Pune")', text: 'The client calls what it thinks is the weather service.', code: ['System.out.println(weather.forecast("Pune"));'] },
  { from: 'p', to: 'r', label: 'forecast("Pune")', text: 'Cache miss: the proxy forwards to the real (slow) service.', code: ['return cache.computeIfAbsent(city, real::forecast);'] },
  { from: 'r', to: 'p', label: '"Pune: 31C"', ret: true, text: 'The proxy stores the answer.', code: ['calls++;'] },
  { from: 'p', to: 'c', label: '"Pune: 31C"', ret: true, text: 'Answer returned.', code: ['public String forecast(String city) {'] },
  { from: 'c', to: 'p', label: 'forecast("Pune")', text: 'Second call for the same city.', code: ['System.out.println(weather.forecast("Pune"));'] },
  { from: 'p', to: 'c', label: '"Pune: 31C" (cached)', ret: true, text: 'Answered from the cache: the remote service is never called.', code: ['return cache.computeIfAbsent(city, real::forecast);'] }
] };
registerPattern({
  slug: 'proxy', order: 9, kind: 'Structural', title: 'Proxy',
  one: 'A stand-in object with the ==same interface as the real one== that controls access to it: caching, lazy loading, permissions, remote calls.',
  analogy: ['A personal assistant answers your phone. Simple questions they answer from their notes; others they pass to you; strangers they block. Callers think they are calling you.', 'The proxy implements the same interface as the real subject and holds a reference to it. Types: **caching** (remember results), **virtual** (create the expensive object only when first used), **protection** (check permissions), **remote** (hide a network call).'],
  use: ['an expensive object you want to create lazily', 'repeated identical calls to something slow', 'access checks in front of an object', 'logging or metrics around calls without changing the class'],
  avoid: ['the extra layer adds latency for no benefit', 'cache invalidation is complex and correctness matters more'],
  problem: { text: ['Every caller hits the slow remote service, even for the same city a second later. Adding caching inside the remote client mixes two jobs in one class.'], code: String.raw`class RemoteWeatherService {
    String forecast(String city) {
        // slow HTTP call every single time
        return city + ": 31C";
    }
}` },
  solution: { text: ['`CachingWeatherProxy` implements `WeatherService`, keeps a map, and only calls the real service on a miss. Clients get the proxy through the interface and cannot tell the difference.'], code: SRC, file: 'ProxyDemo.java', expect: 'Pune: 31C\nPune: 31C\nGoa: 31C\nremote calls: 2' },
  flows: [
    { name: 'Class diagram', title: 'Caching proxy', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Subject interface', add: ['c', 'i'], on: ['i'], text: 'Clients depend on `WeatherService` only.', code: ['interface WeatherService {'] },
      { title: 'Real subject', add: ['r'], on: ['r'], text: 'Does the actual (slow) work.', code: ['class RemoteWeatherService implements WeatherService {'] },
      { title: 'The proxy', add: ['p'], on: ['p'], rels: ['p-i', 'p-r'], text: 'Same interface, wraps the real subject, adds control: here a cache.', code: ['class CachingWeatherProxy implements WeatherService {', 'return cache.computeIfAbsent(city, real::forecast);'] }
    ]},
    { name: 'Two calls', title: 'Miss, then hit', diagram: seq, code: '@main' }
  ],
  jdk: [['`java.lang.reflect.Proxy`', 'Creates proxy objects at runtime for any interface.'], ['Spring AOP / `@Transactional`', 'Spring wraps beans in proxies that start transactions or check security.'], ['Hibernate lazy loading', 'Entities are proxies that load data on first access.'], ['RMI / gRPC stubs', 'Remote proxies hiding network calls.']],
  related: [['Decorator', 'Same structure; decorators add features the client chooses, proxies control access to the real object.'], ['Adapter', 'Different interface; proxy keeps the same one.'], ['Facade', 'New simplified interface over many classes.']],
  pitfalls: [['Stale cache', 'Decide TTL or invalidation; unbounded maps also leak memory.'], ['Thread safety', 'A plain `HashMap` in a shared proxy needs `ConcurrentHashMap`.'], ['Hidden latency', 'Remote proxies make network calls look local; handle timeouts and failures.']],
  probe: [['Proxy vs Decorator?', ['Same shape (same interface, wraps an instance). Proxy is about controlling access to the subject (lazy, cache, security, remote), usually created by infrastructure. Decorators add optional features and are stacked by the client.']], ['How does Spring use proxies?', ['Beans annotated with `@Transactional` are wrapped in a proxy; calling a method goes through the proxy, which opens and commits a transaction around the real call.']], ['How would you make the cache thread-safe?', ['Use `ConcurrentHashMap.computeIfAbsent`, which runs the loader at most once per key.']]],
  say: ['A caching proxy sits in front of the weather API with the same interface, so callers do not change.', 'The map is a `ConcurrentHashMap` with a TTL so results do not go stale.'],
  facts: [['same interface', 'client cannot tell'], ['kinds', 'cache, virtual, protection, remote'], ['JDK', 'reflect.Proxy']],
  checklist: ['Draw subject, real subject, proxy.', 'Write a caching proxy.', 'Name four kinds of proxy.', 'Explain proxy vs decorator.'],
  drills: {
    mcq: [{ id: 'mcq-p', kind: 'Which pattern?', title: 'Huge images', ask: 'A gallery creates 500 `HighResImage` objects but only shows 10 at a time. Loading each takes 2 s. Pattern?', options: [['Virtual proxy that loads the real image on first `draw()`', true, 'Expensive objects are created only when needed.'], ['Singleton', false, 'You need many images.'], ['Builder', false, 'Not about construction parameters.'], ['Observer', false, 'Not about events.']] }],
    code: [{ id: 'code-p', title: 'Protection proxy', ask: 'Block deletes for non-admins.', run: 'GuardDemo', expect: 'denied\ndeleted 7', code: String.raw`interface Docs { String delete(int id); }
class RealDocs implements Docs { public String delete(int id) { return "deleted " + id; } }
class GuardedDocs [[implements Docs]] {
    private final Docs real; private final boolean admin;
    GuardedDocs(Docs real, boolean admin) { this.real = real; this.admin = admin; }
    public String delete(int id) {
        if (![[admin]]) return "denied";
        return [[real.delete(id)]];
    }
}
class GuardDemo {
    public static void main(String[] args) {
        System.out.println(new GuardedDocs(new RealDocs(), false).delete(7));
        System.out.println(new GuardedDocs(new RealDocs(), true).delete(7));
    }
}` }],
    order: [{ id: 'ord-p', title: 'Lazy (virtual) proxy', ask: 'Order what a virtual proxy does on a call.', steps: ['Client calls a method on the proxy', 'Proxy checks whether the real object exists', 'If not, proxy creates the real object now', 'Proxy forwards the call to the real object', 'Proxy returns the result'], extra: ['Proxy creates all real objects at startup'] }]
  }
});
})();
