(function(){
var ch = { w: 840, h: 320, nodes: [
  { id: 'ord', label: 'Orders', sub: 'order PENDING', kind: 'service', x: 100, y: 160, w: 130 },
  { id: 'bus', label: 'Event bus', sub: 'Kafka', kind: 'queue', x: 340, y: 160, w: 130 },
  { id: 'inv', label: 'Inventory', kind: 'service', x: 620, y: 60 },
  { id: 'pay', label: 'Payments', kind: 'service', x: 620, y: 160 },
  { id: 'ship', label: 'Shipping', kind: 'service', x: 620, y: 262 }
], edges: [['ord', 'bus'], ['bus', 'inv'], ['bus', 'pay'], ['bus', 'ship']] };

var or = { w: 840, h: 320, nodes: [
  { id: 'orch', label: 'Checkout orchestrator', sub: 'saga state machine', kind: 'worker', x: 140, y: 150, w: 180 },
  { id: 'state', label: 'Saga log', sub: 'step + status per order', kind: 'db', x: 140, y: 272, w: 170 },
  { id: 'inv', label: 'Inventory', kind: 'service', x: 470, y: 60 },
  { id: 'pay', label: 'Payments', kind: 'service', x: 470, y: 160 },
  { id: 'ship', label: 'Shipping', kind: 'service', x: 470, y: 262 },
  { id: 'bank', label: 'Card network', kind: 'ext', x: 720, y: 160, w: 130 }
], edges: [['orch', 'state'], ['orch', 'inv'], ['orch', 'pay'], ['orch', 'ship'], ['pay', 'bank']] };

registerConcept({
  slug: 'saga', order: 21, title: 'Saga: choreography vs orchestration',
  one: 'A saga runs one business action across services as ==a chain of local transactions, each with an undo step==. If a later step fails, the earlier ones are compensated in reverse order.',
  picture: [
    'Booking a trip: you book the flight, then the hotel, then the car. The car company is sold out. Nobody can roll back the airline\'s database, so you **cancel** the hotel and **cancel** the flight. Each cancellation is a new action that undoes the effect of an earlier one.',
    'That is a **saga**. Every step commits in its own service right away. Every step has a **compensating action**. Steps either trigger each other through events (**choreography**) or one coordinator tells each service what to do next (**orchestration**).'
  ],
  use: ['one business action spans services that each own their database', 'checkout, booking, onboarding, money transfer between systems', 'long-running workflows with waits, timers or human steps', 'steps that call third-party APIs that cannot join a transaction'],
  avoid: ['all the data sits in one database (use a plain transaction)', 'you need strict isolation: nobody may ever see a half-done state', 'a step has no sensible undo and cannot be moved to the end', 'two tightly coupled services that should really be one'],
  flows: [
    { name: 'Choreography', title: 'Services react to each other\'s events', diagram: ch, steps: [
      { title: 'Order starts PENDING', text: 'Orders saves order 91 as **PENDING** in its own DB and publishes `OrderCreated` (via its outbox). Nobody is in charge; each service just listens.', on: ['ord', 'bus'], dots: [{ from: 'ord', to: 'bus', label: 'OrderCreated 91', kind: 'evt' }] },
      { title: 'Inventory reserves', text: 'Inventory hears `OrderCreated`, reserves the stock in a local transaction and publishes `StockReserved`.', on: ['inv'], dots: [{ from: 'bus', to: 'inv', label: 'OrderCreated', kind: 'evt' }, { from: 'inv', to: 'bus', label: 'StockReserved', kind: 'evt' }] },
      { title: 'Payment fails', text: 'Payments hears `StockReserved` and charges the card. The card is declined, so it publishes `PaymentFailed`.', bad: ['pay'], dots: [{ from: 'bus', to: 'pay', label: 'StockReserved', kind: 'evt' }, { from: 'pay', to: 'bus', label: 'PaymentFailed', kind: 'err' }] },
      { title: 'Compensate', text: 'Inventory hears `PaymentFailed` and **releases** the stock. Orders hears it and marks order 91 **CANCELLED**. Shipping never heard anything, because nothing asked it to act.', on: ['inv', 'ord'], set: { ord: { sub: 'order CANCELLED' } }, dots: [{ from: 'bus', to: 'inv', label: 'release stock', kind: 'evt' }, { from: 'bus', to: 'ord', label: 'cancel order', kind: 'evt' }] }
    ]},
    { name: 'Orchestration', title: 'One coordinator runs the steps', diagram: or, steps: [
      { title: 'Step 1: reserve stock', text: 'The orchestrator records "step 1 started" in its saga log, sends a `ReserveStock` command and waits for the reply.', on: ['orch', 'state', 'inv'], dots: [{ from: 'orch', to: 'state', label: 'step 1', kind: 'evt' }, { from: 'orch', to: 'inv', label: 'ReserveStock' }, { from: 'inv', to: 'orch', label: 'reserved', kind: 'res' }] },
      { title: 'Step 2: charge the card', text: 'Next command: `ChargeCard`. Payments calls the card network with an idempotency key. The card is declined.', bad: ['pay'], dots: [{ from: 'orch', to: 'pay', label: 'ChargeCard' }, { from: 'pay', to: 'bank', label: 'charge' }, { from: 'bank', to: 'pay', label: 'declined', kind: 'err' }, { from: 'pay', to: 'orch', label: 'failed', kind: 'err' }] },
      { title: 'Run compensations in reverse', text: 'The orchestrator marks the saga COMPENSATING and undoes the finished steps newest-first: `ReleaseStock`, then cancel the order. Compensations are retried until they succeed.', on: ['orch', 'state', 'inv'], dots: [{ from: 'orch', to: 'state', label: 'COMPENSATING', kind: 'evt' }, { from: 'orch', to: 'inv', label: 'ReleaseStock' }] },
      { title: 'Orchestrator crashes mid-saga', text: 'If the orchestrator dies, a new instance reads the saga log and resumes from the last recorded step. Commands carry idempotency keys, so a resent command is harmless.', bad: ['orch'], on: ['state'], dots: [{ from: 'state', to: 'orch', label: 'resume at step 2', kind: 'res' }] }
    ]}
  ],
  how: [
    { name: 'Why sagas exist', text: ['In microservices each service owns its database, and two-phase commit across them is slow, fragile and often impossible. A saga gives up atomic isolation and keeps **eventual** all-or-nothing: either every step completes, or every completed step is compensated.'] },
    { name: 'Choreography', text: ['Each service subscribes to events and publishes its own. There is no central brain. It is great for 2 to 4 steps and few teams. As it grows, the flow is spread over many codebases, it is hard to see which service waits on which, and adding a step means touching several services.'] },
    { name: 'Orchestration', text: ['An orchestrator sends commands, waits for replies and stores the saga state durably. The whole flow lives in one place: easy to read, test, time out and change. The costs are one more component, and the temptation to put business rules in it. Workflow engines like Temporal do the bookkeeping for you.'],
      code: 'steps = [\n  (reserve_stock, release_stock),\n  (charge_card,   refund_card),    # pivot: after this the saga only moves forward\n  (create_shipment, None),         # retriable: retry until it succeeds\n]\ndone = []\nfor do, undo in steps:\n    try:\n        do(order, idempotency_key=f"{order.id}:{do.__name__}")\n        done.append(undo)\n        save_state(order.id, len(done))\n    except PermanentFailure:\n        for u in reversed(done):\n            if u: retry_until_ok(u, order)   # compensations must succeed\n        mark_cancelled(order)\n        break' },
    { name: 'Compensations are business undo, not rollback', text: ['You cannot un-send an email or un-charge a card; you send an apology and issue a refund. Compensations must be **idempotent** and **retryable**, and they must eventually succeed.'] },
    { name: 'Order the steps: compensatable, pivot, retriable', text: ['Put steps that can be undone and are likely to fail first. The **pivot** is the go/no-go step (often the payment). After the pivot, steps are **retriable**: they never compensate, they retry until done (create shipment, send email). That is why the confirmation email goes last.'] },
    { name: 'No isolation', text: ['Other requests can see a half-done saga: stock reserved but not paid. Countermeasures: a **semantic lock** (status PENDING that others respect), commutative updates (increment and decrement instead of overwrite), and re-checking a version before acting.'] }
  ],
  compare: { title: 'Choreography or orchestration', lead: null, head: ['', 'Choreography', 'Orchestration'], rows: [
    ['Who picks the next step', 'Each service reacts to events', 'One orchestrator sends commands'],
    ['Seeing the whole flow', 'Spread across services', 'One place, one state machine'],
    ['Coupling', 'Services know each other\'s events', 'Services only know their own commands'],
    ['Adding a step', 'Touch several services', 'Change the orchestrator'],
    ['Extra parts', 'Only the broker', 'Orchestrator + state store (or Temporal)'],
    ['Good fit', '2–4 steps, simple branching', 'Many steps, timeouts, branches']
  ]},
  say: [
    'Checkout is an orchestrated saga: reserve stock, charge the card, create the shipment. Each step has a compensation.',
    'Charging the card is the pivot. Steps after it only retry; they never compensate.',
    'The order stays PENDING while the saga runs, so other reads know it is not final.',
    'Every command carries an idempotency key, so the orchestrator can resend after a crash safely.'
  ],
  numbers: [
    ['2–4 steps', 'where choreography stays readable', 'beyond that, orchestrate'],
    ['ms to days', 'saga lifetimes a workflow engine handles with timers and retries'],
    ['0', 'isolation between concurrent sagas by default']
  ],
  pitfalls: [
    ['Compensations that can fail for good', 'The saga gets stuck half-done. Make them idempotent and retry until they succeed; alert on a dead-letter queue.'],
    ['Irreversible step first', 'Send the email or ship the parcel last; you cannot take it back.'],
    ['Assuming isolation', 'Another request will see reserved stock or a pending order. Design statuses for it.'],
    ['No timeouts', 'A service that never replies leaves the saga hanging. The orchestrator needs deadlines per step.'],
    ['Event spaghetti', 'Choreography across eight services with no picture of the flow. Switch to orchestration.']
  ],
  seen: [
    ['Temporal / Uber Cadence', 'Write the saga as ordinary code; the engine persists each step and retries.'],
    ['AWS Step Functions', 'State machines that orchestrate sagas over Lambdas and services.'],
    ['Netflix Conductor', 'Open-source orchestrator for microservice workflows.'],
    ['Axon, Eventuate Tram', 'Java frameworks with saga support over events and the outbox.'],
    ['Travel booking', 'The classic case: flight, hotel and car, cancelling the booked parts if one fails.']
  ],
  probe: [
    ['Choreography or orchestration?', ['Choreography for short flows with few teams. Orchestration once there are many steps, timeouts or branches, because the flow then lives in one readable place.']],
    ['What if a compensation fails?', ['Retry it with backoff; it must be idempotent. If it keeps failing, park it in a dead-letter queue and alert a human. A reconciliation job catches anything left behind.']],
    ['How do you cope with the missing isolation?', ['Semantic locks (a PENDING status that blocks conflicting actions), commutative updates, and checking a version before acting on data another saga might change.']],
    ['What if the orchestrator crashes?', ['Its state is in a durable store. A new instance resumes from the last recorded step and resends the command; services dedupe it by idempotency key.']]
  ],
  checklist: [
    'Define a saga and a compensating action.',
    'Draw a choreographed and an orchestrated checkout.',
    'Explain the pivot step and why the email goes last.',
    'Name two ways to cope with the missing isolation.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-pivot', title: 'After the pivot', ask: 'Saga: reserve stock, charge card, create shipment, send email. The card was charged, then the shipping service is down for five minutes. What should happen?', options: [
        ['Retry creating the shipment until it succeeds', true, 'The charge was the pivot; after it the saga only moves forward.'],
        ['Refund the card and release the stock at once', false, 'A short outage is no reason to undo a paid order.'],
        ['Mark the order complete anyway', false, 'The customer would never get the goods.'],
        ['Send the email now and ship later', false, 'The email would claim something that has not happened.']
      ]},
      { id: 'mcq-style', title: 'Nobody can explain the flow', ask: 'A checkout saga has 7 steps, two timeouts and a gift-card branch. It is choreographed and nobody can say what happens when. Best move?', options: [
        ['Move to orchestration: one coordinator with durable saga state', true, 'The flow, timeouts and branches then live in one place.'],
        ['Add more event types', false, 'More events make the tangle worse.'],
        ['Switch to two-phase commit', false, 'Services and third parties cannot join it, and it blocks.'],
        ['Document it in a wiki', false, 'Helps a little, but the code still has no single owner of the flow.']
      ]},
      { id: 'mcq-iso', title: 'Half-done state', ask: 'While a checkout saga is running, an admin report shows the stock reserved but no payment. How should the design handle this?', options: [
        ['Keep the order PENDING until the saga ends, and treat PENDING as not final', true, 'A semantic lock: the intermediate state is visible but labelled.'],
        ['Hold database locks across all services until the end', false, 'That is two-phase commit again.'],
        ['It cannot happen in a saga', false, 'Sagas have no isolation; it will happen.'],
        ['Hide the inventory table', false, 'The state still exists; hiding it fixes nothing.']
      ]}
    ],
    order: [
      { id: 'ord-comp', title: 'Compensation run', ask: 'Payment failed in step 3 of an orchestrated saga. Order what happens next.', steps: [
        'Payments reports a permanent failure',
        'Orchestrator records the failure in the saga log',
        'Orchestrator sends ReleaseStock to undo step 2',
        'Orchestrator sends CancelOrder to undo step 1',
        'Saga ends as COMPENSATED'
      ], extra: ['Orchestrator rolls back all the databases in one transaction'] }
    ],
    fill: [
      { id: 'fill-saga', title: 'One sentence', text: 'A saga is a chain of [[local transactions|local transaction]]; if a step fails, earlier steps are undone by [[compensating actions|compensations|compensating action]], driven by events or an [[orchestrator|coordinator]].' }
    ]
  }
});
})();
