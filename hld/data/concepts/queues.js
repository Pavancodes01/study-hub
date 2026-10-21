(function(){
var mq = { w: 820, h: 300, nodes: [
  { id: 'p', label: 'Order service', sub: 'producer', kind: 'service', x: 100, y: 150, w: 130 },
  { id: 'q', label: 'Queue', sub: '3 waiting', kind: 'queue', x: 360, y: 150, w: 130 },
  { id: 'c1', label: 'Email worker 1', kind: 'worker', x: 640, y: 60, w: 140 },
  { id: 'c2', label: 'Email worker 2', kind: 'worker', x: 640, y: 150, w: 140 },
  { id: 'c3', label: 'Email worker 3', kind: 'worker', x: 640, y: 240, w: 140 }
], edges: [['p', 'q'], ['q', 'c1'], ['q', 'c2'], ['q', 'c3']] };
var log = { w: 840, h: 330, nodes: [
  { id: 'p', label: 'Producers', kind: 'service', x: 90, y: 165 },
  { id: 't0', label: 'Partition 0', sub: 'offsets 0…812', kind: 'queue', x: 340, y: 60, w: 150 },
  { id: 't1', label: 'Partition 1', sub: 'offsets 0…790', kind: 'queue', x: 340, y: 165, w: 150 },
  { id: 't2', label: 'Partition 2', sub: 'offsets 0…805', kind: 'queue', x: 340, y: 270, w: 150 },
  { id: 'g1', label: 'Billing group', sub: 'at offset 812', kind: 'worker', x: 650, y: 80, w: 140 },
  { id: 'g2', label: 'Analytics group', sub: 'at offset 400', kind: 'worker', x: 650, y: 250, w: 150 }
], edges: [['p', 't0'], ['p', 't1'], ['p', 't2'], ['t0', 'g1'], ['t1', 'g1'], ['t2', 'g1'], ['t0', 'g2'], ['t1', 'g2'], ['t2', 'g2']] };

registerConcept({
  slug: 'queues', order: 10, title: 'Message queues and streams',
  one: 'A buffer between services: the sender ==drops a message and moves on==, the receiver processes it when it can. Queues hand each job to one worker; logs like Kafka keep events for many readers.',
  picture: [
    'A restaurant\'s order rail: waiters clip tickets on, cooks take the next ticket when free. A rush does not crash the kitchen; tickets just wait longer. If a cook leaves, another picks up the ticket.',
    'Two flavours: a **work queue** (each ticket goes to one cook, then it is gone) and a **log / stream** (every event is kept in order, and each team reads it at its own pace, like a newspaper archive).'
  ],
  use: ['slow work the user should not wait for (emails, video encoding)', 'absorbing traffic spikes', 'one event, many independent consumers', 'decoupling services so one can be down', 'retrying failed work'],
  avoid: ['the caller needs the result right now (use a direct call)', 'strict global ordering of everything (hard to scale)', 'tiny systems where a function call is enough'],
  flows: [
    { name: 'Work queue', title: 'Each job goes to one worker', diagram: mq, steps: [
      { title: 'Producer drops a message', text: 'The order service puts "send receipt for order 91" on the queue and answers the user at once. It does not know or care who sends the email.', on: ['p', 'q'], dots: [{ from: 'p', to: 'q', label: 'order 91' }], set: { q: { sub: '4 waiting' } } },
      { title: 'Workers pull jobs', text: 'Each free worker takes the next message. Three workers share the load; add more when the queue grows.', on: ['c1', 'c2', 'c3'], dots: [{ from: 'q', to: 'c1', label: '88' }, { from: 'q', to: 'c2', label: '89' }, { from: 'q', to: 'c3', label: '90' }], set: { q: { sub: '1 waiting' } } },
      { title: 'Acknowledge when done', text: 'A worker only **acks** after the email is sent. The queue then deletes the message. No ack within a timeout means the message becomes visible again.', on: ['c2'], dots: [{ from: 'c2', to: 'q', label: 'ack 89', kind: 'res' }] },
      { title: 'A worker crashes', text: 'Worker 1 dies mid-job without acking. After the visibility timeout, message 88 is redelivered to another worker. That is **at-least-once** delivery: the email might be sent twice, so the worker must be idempotent.', bad: ['c1'], on: ['c3'], dots: [{ from: 'q', to: 'c3', label: '88 again', kind: 'err' }] },
      { title: 'Poison message', text: 'A message that fails every time (bad data) would block or loop forever. After N tries it goes to a **dead-letter queue** for a human to inspect.', on: ['q'], anno: [{ node: 'q', text: 'after 5 tries → DLQ', dy: 50 }] }
    ]},
    { name: 'Log (Kafka)', title: 'A partitioned log: many readers, each at its own offset', diagram: log, steps: [
      { title: 'Append to a partition', text: 'Events are appended to a topic split into partitions. The **key** (for example user ID) picks the partition, so one user\'s events stay in order.', on: ['p', 't1'], dots: [{ from: 'p', to: 't1', label: 'key=user7' }] },
      { title: 'Events are kept, not deleted', text: 'Unlike a work queue, reading does not remove anything. Events stay for the retention period (days, or forever).', on: ['t0', 't1', 't2'] },
      { title: 'Consumer groups read independently', text: 'Billing and analytics both read every event. Each group remembers its own **offset** (position). Analytics can fall behind or replay from the start without affecting billing.', on: ['g1', 'g2'], dots: [{ from: 't0', to: 'g1', kind: 'evt' }, { from: 't1', to: 'g2', kind: 'evt' }] },
      { title: 'Scale with partitions', text: 'Inside a group, each partition is read by one consumer. 3 partitions = up to 3 parallel consumers per group. Plan partition count for future throughput.', on: ['t0', 't1', 't2', 'g1'], dots: [{ from: 't0', to: 'g1' }, { from: 't1', to: 'g1' }, { from: 't2', to: 'g1' }] }
    ]}
  ],
  how: [
    { name: 'Why put a queue in between', text: ['**Decoupling:** producer and consumer evolve and fail independently. **Buffering:** spikes wait in the queue instead of overloading consumers. **Asynchrony:** users do not wait for slow work. **Fan-out:** one event can trigger many reactions.'] },
    { name: 'Delivery guarantees', text: [
      '**At-most-once:** may lose messages, never duplicates (ack before processing). **At-least-once:** never lose, may duplicate (ack after processing): the usual choice. **Exactly-once:** expensive and only within limits (Kafka transactions); in practice, at-least-once + idempotent consumers gives the same effect.'
    ]},
    { name: 'Ordering', text: ['Global order does not scale. Order is usually guaranteed **per partition / per key**: all events of order 91 go to the same partition, so they are processed in order. Different keys may interleave.'] },
    { name: 'Backpressure and lag', text: ['Watch queue depth or consumer lag. Growing lag means consumers are too slow: add consumers (up to the partition count), make them faster, or shed load. Set retention long enough to survive a consumer outage.'] },
    { name: 'Idempotent consumers', text: ['Because a message can arrive twice, processing it twice must have the same effect as once. Store processed message IDs, or use natural idempotency like `UPDATE … SET status = \'paid\'` instead of `balance = balance - 10`.'],
      code: 'void handle(Message m) {\n    if (processed.contains(m.id())) return;      // seen before: skip\n    sendReceipt(m.orderId());\n    processed.add(m.id());                       // ideally in the same transaction as the work\n}' }
  ],
  compare: { title: 'Queue or log', lead: null, head: ['', 'Work queue (SQS, RabbitMQ)', 'Log / stream (Kafka, Kinesis)'], rows: [
    ['After reading', 'Message is deleted', 'Event stays until retention ends'],
    ['Consumers', 'Competing: each message to one worker', 'Many groups, each reads everything'],
    ['Ordering', 'Loose (FIFO variants exist)', 'Strict per partition'],
    ['Replay', 'No', 'Yes, rewind the offset'],
    ['Scaling consumers', 'Add workers freely', 'Up to number of partitions per group'],
    ['Good for', 'Background jobs, tasks', 'Event streams, fan-out, analytics, CDC']
  ]},
  say: [
    'Sending the email goes through a queue so the checkout request returns immediately.',
    'Delivery is at-least-once, so consumers are idempotent: they skip message IDs they have already processed.',
    'Order events are keyed by order ID, so all events for one order stay in order in one partition.',
    'Failed messages retry with backoff and land in a dead-letter queue after five attempts.',
    'Billing and analytics are separate consumer groups on the same Kafka topic, so analytics can lag without affecting billing.'
  ],
  numbers: [
    ['~1M msg/s', 'Kafka cluster throughput, order of magnitude'],
    ['7 days', 'default Kafka retention'],
    ['256 KB', 'SQS max message size', 'put big payloads in S3, send the link'],
    ['1 consumer', 'per partition within a consumer group']
  ],
  pitfalls: [
    ['Assuming exactly-once', 'Redelivery happens. Without idempotent consumers you charge twice or send two emails.'],
    ['No dead-letter queue', 'One bad message retries forever and blocks a partition or burns CPU.'],
    ['Too few partitions', 'Consumers per group cannot exceed partitions; increasing later reshuffles key ordering.'],
    ['Queue as a database', 'Querying "all pending orders for user X" from a queue does not work. Keep state in a DB.'],
    ['Ignoring lag', 'Lag grows silently until data is hours old. Alert on it.']
  ],
  seen: [
    ['LinkedIn → Kafka', 'Built Kafka as the central log for activity events, metrics and data pipelines.'],
    ['Uber', 'Kafka carries trip events to pricing, fraud, ETA and analytics consumers.'],
    ['Amazon SQS', 'Simple managed work queues with visibility timeouts and DLQs.'],
    ['Shopify', 'Background job queues for webhooks, emails and order processing.']
  ],
  probe: [
    ['How do you avoid processing a message twice?', ['You cannot fully avoid redelivery, so make the consumer idempotent: record processed IDs (with a unique constraint) in the same transaction as the work, or use naturally idempotent operations.']],
    ['How do you keep ordering?', ['Use a partition key: all events of the same entity go to one partition, which is read by one consumer in order. Do not expect order across keys.']],
    ['What if consumers are slower than producers?', ['Lag grows. Scale consumers up to the partition count, batch work, optimize the handler, or apply backpressure upstream (rate limit, shed low-priority work).']],
    ['Kafka or SQS?', ['SQS (or RabbitMQ) for simple background jobs with one consumer type. Kafka when many consumers need the same events, you need replay, or very high throughput with per-key ordering.']]
  ],
  checklist: [
    'Explain three reasons to put a queue between services.',
    'Explain at-least-once delivery and idempotent consumers.',
    'Compare a work queue with a Kafka-style log.',
    'Explain partitions, consumer groups and offsets.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-dup', title: 'Double charge', ask: 'A payment consumer occasionally charges customers twice. The queue is at-least-once. Fix?', options: [
        ['Make the consumer idempotent with a unique payment/message ID', true, 'Redelivery is expected; processing the same ID twice must be harmless.'],
        ['Switch to at-most-once', false, 'Now some payments are silently lost.'],
        ['Add more consumers', false, 'More consumers do not stop duplicates.'],
        ['Increase the visibility timeout to 1 day', false, 'Crashed jobs would wait a day to retry, and duplicates are still possible.']
      ]},
      { id: 'mcq-fan', title: 'Many readers', ask: 'An "order placed" event must reach billing, shipping, email and analytics, each at its own pace, with replay for analytics. Best fit?', options: [
        ['A Kafka topic with one consumer group per service', true, 'Each group reads all events independently and can rewind.'],
        ['One SQS queue shared by all four services', false, 'Each message would go to only one of them.'],
        ['Direct HTTP calls from the order service to all four', false, 'Couples them; one slow service slows orders.'],
        ['A cron job that scans the orders table', false, 'Slow and does not scale; no replay semantics.']
      ]},
      { id: 'mcq-order', title: 'Out of order', ask: 'Events "created", "paid", "shipped" for the same order are sometimes processed out of order. Fix?', options: [
        ['Use the order ID as the partition key', true, 'All events for one order go to one partition and are read in order.'],
        ['Use a random partition key', false, 'That is what scatters them now.'],
        ['Add more partitions', false, 'More partitions without a key make it worse.'],
        ['Sleep 1 second before processing', false, 'Hides the bug; does not guarantee order.']
      ]}
    ],
    order: [
      { id: 'ord-life', title: 'Life of a job', ask: 'Order a job through an at-least-once work queue.', steps: [
        'Producer sends the message and returns to the user',
        'A worker receives it; it becomes invisible to others',
        'The worker does the work idempotently',
        'The worker acknowledges, and the queue deletes the message'
      ], extra: ['The queue deletes the message as soon as it is received'] }
    ],
    fill: [
      { id: 'fill-alo', title: 'Guarantee in one line', text: 'Delivery is [[at-least-once|at least once]], so consumers must be [[idempotent]]; failures retry and end in a [[dead-letter queue|dlq|dead letter queue]].' }
    ]
  }
});
})();
