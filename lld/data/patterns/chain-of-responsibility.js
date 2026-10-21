(function(){
var SRC = String.raw`abstract class Approver {
    private Approver next;
    Approver setNext(Approver next) { this.next = next; return next; }   // returns next for chaining

    final String approve(int amount) {
        if (canApprove(amount)) return getClass().getSimpleName() + " approved " + amount;
        if (next == null) return "rejected " + amount;                  // end of the chain
        return next.approve(amount);                                     // pass it on
    }
    abstract boolean canApprove(int amount);
}

class Manager extends Approver { boolean canApprove(int amount) { return amount <= 1_000; } }
class Director extends Approver { boolean canApprove(int amount) { return amount <= 10_000; } }
class Cfo extends Approver { boolean canApprove(int amount) { return amount <= 100_000; } }

class ChainDemo {
    public static void main(String[] args) {
        Approver chain = new Manager();
        chain.setNext(new Director()).setNext(new Cfo());
        System.out.println(chain.approve(500));
        System.out.println(chain.approve(7_000));
        System.out.println(chain.approve(50_000));
        System.out.println(chain.approve(500_000));
    }
}`;
var dg = { kind: 'class', w: 760, h: 320, classes: [
  { id: 'c', name: 'Client', x: 24, y: 40, w: 140, fields: [], methods: [] },
  { id: 'a', name: 'Approver', stereo: 'abstract', x: 250, y: 20, w: 260, fields: ['- next: Approver'], methods: ['+ setNext(next): Approver', '+ final approve(amount): String', '# canApprove(amount): boolean'] },
  { id: 'm', name: 'Manager', x: 80, y: 220, w: 160, fields: [], methods: ['≤ 1,000'] },
  { id: 'd', name: 'Director', x: 300, y: 220, w: 160, fields: [], methods: ['≤ 10,000'] },
  { id: 'f', name: 'Cfo', x: 520, y: 220, w: 160, fields: [], methods: ['≤ 100,000'] }
], rels: [
  { from: 'c', to: 'a', type: 'association' },
  { from: 'm', to: 'a', type: 'inherits' },
  { from: 'd', to: 'a', type: 'inherits' },
  { from: 'f', to: 'a', type: 'inherits' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'c', name: 'Client' }, { id: 'm', name: 'Manager' }, { id: 'd', name: 'Director' }, { id: 'f', name: 'Cfo' }], msgs: [
  { from: 'c', to: 'm', label: 'approve(7000)', text: 'The client only knows the first handler.', code: ['System.out.println(chain.approve(7_000));'] },
  { from: 'm', to: 'd', label: 'approve(7000)', text: 'The manager cannot approve more than 1,000, so it passes the request to its `next`.', code: ['return next.approve(amount);', 'class Manager extends Approver'] },
  { from: 'd', to: 'm', label: '"Director approved 7000"', ret: true, text: 'The director can handle it and stops the chain. The CFO never sees it.', code: ['if (canApprove(amount)) return getClass().getSimpleName() + " approved " + amount;'] },
  { from: 'm', to: 'c', label: 'result', ret: true, text: 'The answer travels back to the client.', code: ['final String approve(int amount) {'] }
] };
registerPattern({
  slug: 'chain-of-responsibility', order: 16, kind: 'Behavioral', title: 'Chain of Responsibility',
  one: 'Pass a request along a ==chain of handlers until one handles it==, so the sender does not need to know who will.',
  analogy: ['Customer support escalation: the chatbot tries first, then a support agent, then a specialist. You talk to the first level only; it escalates if it cannot help.', 'Each handler has a reference to the next one. It either handles the request or passes it on. Chains can be reordered or extended without touching the sender.'],
  use: ['several possible handlers, picked at runtime by rules (approval limits, support tiers)', 'processing pipelines: filters, middleware, validation steps', 'you want to add or reorder handlers without changing callers'],
  avoid: ['exactly one handler is always known', 'every request must be handled and silent drops are dangerous (always add a final fallback)'],
  problem: { text: ['One method knows every approval level and its limit. A new level or a changed limit edits this method and its tests.'], code: String.raw`class Approvals {
    String approve(int amount) {
        if (amount <= 1_000) return "Manager approved";
        else if (amount <= 10_000) return "Director approved";
        else if (amount <= 100_000) return "Cfo approved";
        return "rejected";
    }
}` },
  solution: { text: ['Each level is a handler class with `canApprove`. The base class holds `next` and the shared pass-along logic in a final `approve` method. The chain is wired once (`manager → director → cfo`); callers just call the head.'], code: SRC, file: 'ChainDemo.java', expect: 'Manager approved 500\nDirector approved 7000\nCfo approved 50000\nrejected 500000' },
  flows: [
    { name: 'Class diagram', title: 'Chain of Responsibility', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Handler base', add: ['a'], on: ['a'], text: 'Holds a reference to the next handler and the pass-it-on logic.', code: ['abstract class Approver {', 'private Approver next;'] },
      { title: 'Concrete handlers', add: ['m', 'd', 'f'], on: ['m', 'd', 'f'], text: 'Each one only decides whether it can handle the request.', code: ['class Manager extends Approver', 'class Director extends Approver', 'class Cfo extends Approver'] },
      { title: 'Client and wiring', add: ['c'], on: ['c'], rels: ['c-a'], text: 'The chain is built once; the client calls the first handler only.', code: ['chain.setNext(new Director()).setNext(new Cfo());'] },
      { title: 'Handle or pass', on: ['a'], text: 'Handle it, pass it to `next`, or reject at the end of the chain.', code: ['if (canApprove(amount))', 'if (next == null) return "rejected " + amount;', 'return next.approve(amount);'] }
    ]},
    { name: 'Approve 7,000', title: 'Passing a request along', diagram: seq, code: '@main' }
  ],
  jdk: [['Servlet `Filter` / `FilterChain`', 'Each filter does its part and calls `chain.doFilter` to continue.'], ['Spring Security filter chain', 'Authentication, CSRF, authorization filters in order.'], ['`java.util.logging.Logger` parents', 'Log records propagate up to parent handlers.']],
  related: [['Decorator', 'Every layer always calls the next; in a chain a handler may stop.'], ['Command', 'Requests passed along a chain are often command objects.'], ['Composite', 'Requests can bubble up a composite tree like a chain.']],
  pitfalls: [['No final handler', 'Requests can fall off the end silently; add a fallback that rejects or logs.'], ['Cycles', 'Wiring a handler as its own successor loops forever.'], ['Order bugs', 'Handlers in the wrong order give wrong results; build the chain in one place.']],
  probe: [['How is this different from a list of if/else?', ['Each rule is a separate class, the order is configurable, and you can add a handler without editing others. The sender does not know which handler will respond.']], ['Where have you seen it?', ['Servlet filters, Spring Security, web framework middleware, logging handlers.']]],
  say: ['Approval limits are a chain: manager, director, CFO, each passing to the next if over its limit.', 'The chain is built in one config class, so changing the order is one line.'],
  facts: [['handler', 'handles or passes'], ['next', 'link to successor'], ['fallback', 'end of chain']],
  checklist: ['Draw the handler chain.', 'Implement handle-or-pass.', 'Name two real chains in Java frameworks.'],
  drills: {
    mcq: [{ id: 'mcq-chain', kind: 'Which pattern?', title: 'Request filters', ask: 'Each HTTP request must pass auth check, rate limit and input validation; any may reject it, and teams add new checks often. Pattern?', options: [['Chain of Responsibility', true, 'Each check is a handler that rejects or passes on.'], ['Singleton', false, 'Unrelated.'], ['Prototype', false, 'Unrelated.'], ['Facade', false, 'Simplifies a subsystem; does not model sequential optional handling.']] }],
    code: [{ id: 'code-chain', title: 'Support levels', ask: 'Pass the ticket on when the level cannot solve it.', run: 'SupportDemo', expect: 'Agent solved level 2', code: String.raw`abstract class Support {
    Support next; final int max;
    Support(int max) { this.max = max; }
    String handle(int level) {
        if (level <= max) return getClass().getSimpleName() + " solved level " + level;
        return next == null ? "unsolved" : [[next.handle(level)]];
    }
}
class Bot extends Support { Bot() { super(1); } }
class Agent extends Support { Agent() { [[super(2)]]; } }
class SupportDemo {
    public static void main(String[] args) {
        Support chain = new Bot();
        chain.next = [[new Agent()]];
        System.out.println(chain.handle(2));
    }
}` }],
    order: [{ id: 'ord-chain', title: 'Handle a request', ask: 'Order what each handler does.', steps: ['Receive the request', 'Check if it can handle it', 'If yes, handle it and stop', 'If not and there is a next handler, pass it on', 'If there is no next handler, reject or fall back'], extra: ['Send the request to every handler at once'] }]
  }
});
})();
