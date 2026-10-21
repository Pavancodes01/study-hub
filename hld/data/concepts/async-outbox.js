(function(){
var ob = { w: 840, h: 320, nodes: [
  { id: 'api', label: 'Order service', kind: 'service', x: 100, y: 160, w: 130 },
  { id: 'db', label: 'Orders DB', sub: 'orders + outbox', kind: 'db', x: 350, y: 160, w: 140, h: 64 },
  { id: 'relay', label: 'Outbox relay', sub: 'or CDC (Debezium)', kind: 'worker', x: 560, y: 260, w: 150 },
  { id: 'k', label: 'Kafka', sub: 'order-events', kind: 'queue', x: 600, y: 80 },
  { id: 'ship', label: 'Shipping', kind: 'service', x: 770, y: 180 }
], edges: [['api', 'db'], ['db', 'relay'], ['relay', 'k'], ['k', 'ship'], ['api', 'k', { dash: true }]] };

registerConcept({
  slug: 'async-outbox', order: 11, title: 'Async work and the outbox pattern',
  one: 'Do slow work after you answer the user, and when a database change must also produce an event, ==write both in one transaction== using an outbox table.',
  picture: [
    'At a dry cleaner you get a ticket immediately; the cleaning happens later. That is async work. But imagine the shop writes your order in the book and then forgets to put the ticket on the rail. Your clothes never get cleaned.',
    'That is the **dual-write problem**: saving to the DB and publishing to a queue are two separate actions, and a crash between them leaves them disagreeing. The **outbox pattern** writes the event into a table in the same transaction, and a relay publishes it afterwards.'
  ],
  use: ['a DB change must reliably trigger other services', 'event-driven microservices', 'sending emails, webhooks or search updates after a write', 'long workflows across services (sagas)'],
  avoid: ['the user needs the result of the work in the response', 'a single service where a DB trigger or job is simpler'],
  flows: [
    { name: 'Dual write bug', title: 'Why "save, then publish" breaks', diagram: ob, steps: [
      { title: 'Save the order', text: 'The service commits the order to its database. So far so good.', on: ['api', 'db'], dots: [{ from: 'api', to: 'db', label: 'INSERT order 91' }] },
      { title: 'Crash before publishing', text: 'The process dies (deploy, OOM) right before sending "order created" to Kafka. The order exists, but shipping never hears about it.', bad: ['api'], badEdges: ['api-k'], anno: [{ node: 'api', text: 'crash', dy: -50 }] },
      { title: 'The reverse is no better', text: 'Publish first, then save? If the DB write fails, shipping ships an order that does not exist. Two systems, no shared transaction.', bad: ['db'], dots: [{ from: 'api', to: 'k', label: 'event (no order!)', kind: 'err' }] }
    ]},
    { name: 'Outbox fix', title: 'The transactional outbox', diagram: ob, steps: [
      { title: 'One transaction, two rows', text: 'Insert the order **and** an `outbox` row ("OrderCreated 91") in the same DB transaction. Either both exist or neither does.', on: ['api', 'db'], dots: [{ from: 'api', to: 'db', label: 'BEGIN; order + outbox; COMMIT' }] },
      { title: 'Relay reads the outbox', text: 'A separate relay polls the outbox table (or tails the DB change log with CDC) and finds unpublished events.', on: ['relay'], dots: [{ from: 'db', to: 'relay', label: 'new outbox rows', kind: 'evt' }] },
      { title: 'Publish, then mark sent', text: 'The relay publishes to Kafka and marks the row sent. If it crashes in between, it publishes again later: **at-least-once**.', on: ['k'], dots: [{ from: 'relay', to: 'k', label: 'OrderCreated 91', kind: 'evt' }] },
      { title: 'Consumer is idempotent', text: 'Shipping may see the event twice, so it ignores event IDs it has already handled. Now every committed order reliably reaches shipping.', on: ['ship'], dots: [{ from: 'k', to: 'ship', label: 'event 91', kind: 'evt' }] }
    ]}
  ],
  how: [
    { name: 'Sync vs async', text: ['Do synchronously only what the user needs to see in the response (save the order, reserve stock). Push the rest (emails, invoices, recommendations, search indexing) to a queue. The response gets faster and failures of the slow parts do not fail the request.'] },
    { name: 'The dual-write problem', text: ['Any time you write to two systems (DB + queue, DB + cache, DB + search index) without a shared transaction, a crash between them leaves them inconsistent. Retrying does not fix it if you do not know which half happened.'] },
    { name: 'Transactional outbox', text: ['Write business data and an event row in one local transaction. A relay publishes outbox rows to the broker and marks them done. Alternative: **change data capture (CDC)**, reading the DB\'s replication log (Debezium) and turning changes into events.'],
      code: 'BEGIN;\nINSERT INTO orders (id, user_id, total) VALUES (91, 7, 4200);\nINSERT INTO outbox (id, type, payload) VALUES (uuid(), \'OrderCreated\', \'{"orderId":91}\');\nCOMMIT;' },
    { name: 'Sagas for multi-service workflows', text: ['A checkout touches orders, payments and inventory, each with its own DB. No distributed transaction: instead a **saga**, a sequence of local transactions where each step publishes an event for the next, and failures run **compensating** actions (refund, release stock). Can be choreographed (services react to events) or orchestrated (one coordinator).'] },
    { name: 'Idempotency keys', text: ['Clients retry requests after timeouts. An idempotency key (a unique ID per operation) lets the server return the first result instead of doing the work twice. Essential for payments.'] }
  ],
  compare: { title: 'Ways to publish events after a write', lead: null, head: ['Approach', 'Reliable?', 'Trade-off'], rows: [
    ['Save, then publish in code', 'No: crash in between loses the event', 'Simple, wrong under failure'],
    ['Distributed transaction (2PC)', 'Yes', 'Slow, blocks on coordinator, poorly supported by brokers'],
    ['Transactional outbox + relay', 'Yes, at-least-once', 'Extra table and relay process'],
    ['Change data capture (CDC)', 'Yes, at-least-once', 'Infra to run (Debezium), events mirror DB rows'],
    ['Event sourcing', 'Yes: the event log is the data', 'Big change in how you model and query data']
  ]},
  say: [
    'Checkout only saves the order and reserves stock synchronously; email, invoice and analytics are async via events.',
    'To avoid the dual-write problem I write the event to an outbox table in the same transaction, and a relay publishes it.',
    'Events are at-least-once, so every consumer is idempotent on the event ID.',
    'The checkout across services is a saga: if payment fails, we release the reserved stock as a compensating step.'
  ],
  numbers: [
    ['< 1 s', 'typical outbox relay delay'],
    ['ms', 'CDC lag from commit to event in a healthy setup'],
    ['24 h', 'common retention for idempotency keys']
  ],
  pitfalls: [
    ['Dual writes', 'Writing DB and queue separately and hoping both succeed.'],
    ['2PC across services', 'Slow and fragile; most brokers and NoSQL stores do not support it well.'],
    ['Non-idempotent consumers', 'At-least-once events applied twice double-count or double-ship.'],
    ['Async for things the user waits on', 'If the UI needs the result, async adds polling complexity for nothing.'],
    ['No compensations', 'A saga without undo steps leaves half-finished workflows.']
  ],
  seen: [
    ['Debezium', 'Open-source CDC that streams MySQL/PostgreSQL changes into Kafka; often used to relay outbox tables.'],
    ['Uber Cadence / Temporal', 'Workflow engines that orchestrate long-running sagas with retries and compensation.'],
    ['Stripe', 'Idempotency keys on API requests so retries never double-charge.'],
    ['Many microservice platforms', 'Outbox tables per service as the standard way to emit domain events.']
  ],
  probe: [
    ['Why not just publish the event after the DB commit?', ['A crash between commit and publish loses the event forever. The outbox makes the event part of the same transaction, so it is never lost; the relay retries until it is published.']],
    ['Outbox or CDC?', ['Outbox gives you clean, intentional event payloads. CDC needs no code change but exposes table-level changes. Many teams combine them: CDC tails only the outbox table.']],
    ['How does a saga handle failure?', ['Each step has a compensating action. If step 3 (payment) fails, run compensations for steps 2 and 1 (release stock, cancel order) in reverse order.']],
    ['What does an idempotency key do?', ['The client sends a unique key per operation. The server stores the key with the result; a retry with the same key returns the stored result instead of repeating the work.']]
  ],
  checklist: [
    'Explain the dual-write problem with an example.',
    'Draw the outbox pattern and the relay.',
    'Explain what a saga and a compensating action are.',
    'Explain idempotency keys for client retries.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-lost', title: 'Missing shipments', ask: 'About 1 in 10,000 orders never gets shipped. Code: commit order, then publish event. Fix?', options: [
        ['Transactional outbox: write the event in the same DB transaction, relay publishes it', true, 'The event can no longer be lost between commit and publish.'],
        ['Publish the event before the commit', false, 'Now events may exist for orders that failed to save.'],
        ['Retry the publish 3 times', false, 'A crash before the first try still loses it.'],
        ['Use a bigger Kafka cluster', false, 'Kafka is not losing the events; the app never sends them.']
      ]},
      { id: 'mcq-saga', title: 'Payment failed', ask: 'Checkout reserved stock in the inventory service, then payment failed. In a saga, what happens?', options: [
        ['Run the compensating action: release the reserved stock', true, 'Each completed step is undone by its compensation.'],
        ['Roll back with a distributed transaction', false, 'Sagas exist because there is no shared transaction.'],
        ['Leave the stock reserved forever', false, 'Stock would leak.'],
        ['Retry payment forever', false, 'Some failures are permanent (card declined).']
      ]},
      { id: 'mcq-sync', title: 'What to do inline', ask: 'Placing an order triggers: save order, charge card, send email, update recommendations. Which should the request wait for?', options: [
        ['Save order and charge card; email and recommendations async', true, 'The user needs to know the order and payment succeeded; the rest can follow.'],
        ['All four', false, 'A slow recommendation service would slow checkout.'],
        ['None, all async', false, 'The user would not know if payment worked.'],
        ['Only the email', false, 'The email is the least critical part.']
      ]}
    ],
    order: [
      { id: 'ord-outbox', title: 'Outbox flow', ask: 'Order the outbox steps.', steps: [
        'Begin a database transaction',
        'Insert the order row and the outbox event row',
        'Commit the transaction',
        'Relay reads unpublished outbox rows',
        'Relay publishes to the broker and marks rows as sent'
      ], extra: ['Publish to the broker inside the database transaction'] }
    ],
    fill: [
      { id: 'fill-outbox', title: 'One sentence', text: 'I avoid the [[dual-write|dual write]] problem with a transactional [[outbox]]: the event row commits with the data, and a [[relay|cdc|poller]] publishes it.' }
    ]
  }
});
})();
