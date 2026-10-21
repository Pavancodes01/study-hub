(function(){
var D = { w: 880, h: 380, nodes: [
  { id: 'u', label: 'Fans', sub: '1M at 10:00', kind: 'client', x: 70, y: 190 },
  { id: 'wr', label: 'Waiting room', sub: 'virtual queue', kind: 'lb', x: 240, y: 190, w: 140 },
  { id: 'bk', label: 'Booking service', kind: 'service', x: 450, y: 190, w: 140 },
  { id: 'hold', label: 'Seat holds', sub: 'Redis, TTL 10 min', kind: 'cache', x: 450, y: 60, w: 140 },
  { id: 'db', label: 'Bookings DB', sub: 'seats, orders', kind: 'db', x: 670, y: 190, w: 130 },
  { id: 'pay', label: 'Payment provider', kind: 'ext', x: 670, y: 330, w: 140 },
  { id: 'cat', label: 'Seat map cache', sub: 'read-heavy', kind: 'cdn', x: 815, y: 70, w: 110, h: 60 }
], edges: [['u', 'wr'], ['wr', 'bk'], ['bk', 'hold'], ['bk', 'db'], ['bk', 'pay'], ['db', 'cat', { dash: true }], ['u', 'cat', { dash: true, bend: -70 }]] };

registerDesign({
  slug: 'ticket-booking', order: 12, title: 'Ticket booking and payments',
  one: 'Sell each seat ==exactly once== under a flash crowd: hold seats briefly, take payment with idempotency, and confirm with a database transaction that cannot double-sell.',
  questions: ['Assigned seats or general admission?', 'Peak: how many people at sale start?', 'How long can a user hold seats while paying?', 'Which payment provider; refunds?', 'Limits per user (anti-scalping)?'],
  reqs: {
    func: ['Browse events and seat maps', 'Hold seats while paying', 'Pay and confirm the booking', 'Release holds on timeout or failure'],
    nonfunc: ['Never sell a seat twice (strong consistency on booking)', 'Survive 1M users at sale start', 'Payment retries never double-charge', 'Fair access'],
    mvp: ['seat map', 'holds with TTL', 'payment with idempotency key', 'transactional confirm', 'waiting room'],
    later: ['resale marketplace', 'dynamic pricing', 'bot detection models']
  },
  estimate: {
    lead: 'The problem is a short, enormous spike on a small dataset.',
    assume: ['stadium of 50k seats', '1M fans arrive in the first minute', 'seat map read ~10 times per user'],
    rows: [
      ['Arrivals', '1M ÷ 60', '**~17k/s** at the door'],
      ['Seat map reads', '1M × 10 ÷ 300 s', '**~33k/s** (cacheable)'],
      ['Bookings possible', '50k seats ÷ ~2 per order', '**~25k orders total**'],
      ['Contention', '1M users for 50k seats', '**20:1 demand**, hot rows guaranteed']
    ],
    so: 'Data is tiny; contention is huge. Admit users at a rate the booking path can handle, and make the seat check-and-reserve atomic.'
  },
  apiLead: null,
  api: [
    ['POST', '/v1/events/{id}/holds', 'Hold specific seats for 10 minutes. 409 if any seat is taken.', '{ "seats": ["A12", "A13"] }\n→ 201 { "holdId": "h_77", "expiresAt": "…" }'],
    ['POST', '/v1/orders', 'Pay for a hold. Requires `Idempotency-Key`.', 'Idempotency-Key: 6f1c…\n{ "holdId": "h_77", "paymentMethod": "pm_…" }\n→ 201 { "orderId": "o_9", "status": "confirmed" }'],
    ['GET', '/v1/events/{id}/seats', 'Seat map with availability (cached, slightly stale).']
  ],
  dataLead: 'Seats are the contended resource; the database must enforce "one owner per seat".',
  data: [
    { name: 'seats', store: 'SQL (single primary per event shard)', cols: [['event_id, seat_id', 'composite key', 'One row per seat'], ['status', 'enum', 'available / held / sold'], ['hold_id, held_until', 'string, timestamp', 'Who holds it and until when'], ['version', 'int', 'Optimistic concurrency']] },
    { name: 'orders', store: 'SQL', cols: [['order_id', 'string', 'Key'], ['idempotency_key', 'string, unique', 'Dedupe retries'], ['payment_status', 'enum', 'pending / paid / refunded']] }
  ],
  hld: [
    'A **waiting room** in front admits users at a controlled rate (a virtual queue with position updates). The booking service only sees load it can handle.',
    '**Holding seats** is an atomic conditional update: `UPDATE seats SET status=\'held\', hold_id=?, held_until=now()+10min WHERE event_id=? AND seat_id IN (…) AND status=\'available\'`. If fewer rows change than requested, roll back and return 409.',
    '**Paying** uses an idempotency key with the provider. On success, a transaction marks seats `sold` (only if still held by this hold) and the order `confirmed`.',
    '**Expired holds** are released by a background job (or checked lazily with `held_until`). The seat map is served from a cache that may be a few seconds stale; the database is the final judge.'
  ],
  flows: [
    { name: 'Book seats', title: 'Hold, pay, confirm', diagram: D, steps: [
      { title: 'Waiting room', text: '1M people arrive at 10:00. The waiting room gives each a place in line and admits a few thousand per minute.', on: ['u', 'wr'], dots: [{ from: 'u', to: 'wr', label: 'join queue' }], set: { wr: { sub: 'you are #48,211' } } },
      { title: 'Browse the seat map', text: 'Admitted users read a cached seat map. It may be slightly stale; that is fine because the hold step re-checks.', on: ['cat'], dots: [{ from: 'u', to: 'cat', label: 'seat map' }, { from: 'cat', to: 'u', kind: 'res' }] },
      { title: 'Hold seats atomically', text: 'One conditional UPDATE marks A12 and A13 as held only if both are still available. Two people clicking A12 at once: exactly one wins, the other gets 409.', on: ['bk', 'db', 'hold'], dots: [{ from: 'wr', to: 'bk', label: 'hold A12, A13' }, { from: 'bk', to: 'db', label: 'UPDATE … WHERE available' }, { from: 'bk', to: 'hold', label: 'timer 10 min', kind: 'evt' }] },
      { title: 'Pay with an idempotency key', text: 'The provider is called with an idempotency key. If the network times out and the app retries, the card is charged once.', on: ['pay'], dots: [{ from: 'bk', to: 'pay', label: 'charge, key 6f1c' }, { from: 'pay', to: 'bk', label: 'paid', kind: 'res' }] },
      { title: 'Confirm in one transaction', text: 'Mark seats sold **only if** still held by this hold, and the order confirmed, in one DB transaction. If the hold expired meanwhile, refund.', on: ['db'], dots: [{ from: 'bk', to: 'db', label: 'BEGIN; sold; confirmed; COMMIT' }] },
      { title: 'Expired holds return', text: 'Users who walk away free their seats after 10 minutes, and they show up as available again.', on: ['hold', 'db'], dots: [{ from: 'hold', to: 'bk', label: 'expired h_12', kind: 'evt' }, { from: 'bk', to: 'db', label: 'release' }] }
    ]}
  ],
  deep: [
    { name: 'Preventing double booking', text: ['The database decides, not the cache. Options: conditional update (`WHERE status = \'available\'`), optimistic locking with a version column, or `SELECT … FOR UPDATE`. Conditional updates are the simplest: the row can only flip once.'],
      code: 'UPDATE seats\n   SET status = \'held\', hold_id = :hold, held_until = now() + interval \'10 minutes\'\n WHERE event_id = :event AND seat_id IN (:seats) AND status = \'available\';\n-- rows updated < number of seats requested  →  ROLLBACK and return 409' },
    { name: 'Payment correctness', text: ['Payment and booking live in different systems, so there is no shared transaction. Sequence: hold → charge with idempotency key → confirm. If confirm fails after charging, a compensating refund runs (saga). Webhooks from the provider reconcile anything uncertain.'] },
    { name: 'Surviving the flash crowd', text: ['Waiting room with tokens that grant access for a window; serve static and seat-map data from CDN/cache; shard by event so one big sale does not affect others; rate limit per user to slow bots.'] }
  ],
  bottlenecks: [['Flash crowd', 'Waiting room admits at a fixed rate.'], ['Hot seat rows', 'Short transactions; conditional updates; no long locks.'], ['Seat map reads', 'Cache/CDN with second-level staleness.'], ['Payment latency', 'Hold seats first so slow payments do not block others.']],
  tradeoffs: [
    ['Consistency', 'Strong (single DB per event)', 'No double selling', 'Write throughput limited per event'],
    ['Contention', 'Conditional updates', 'Simple and safe', 'Many 409s at peak, handled in UI'],
    ['Load', 'Waiting room', 'Protects the core and is fair', 'Users wait in line'],
    ['Payment', 'Hold → pay → confirm saga', 'No shared transaction needed', 'Refund path required']
  ],
  probe: [
    ['How do you guarantee a seat is never sold twice?', ['A conditional update in the database that only succeeds if the seat is still available (or held by this hold). The DB row is the single source of truth; caches are only for display.']],
    ['What if payment succeeds but the confirm fails?', ['Retry the confirm idempotently; if the hold expired and seats are gone, issue a refund automatically and tell the user. Reconcile with provider webhooks.']],
    ['How do you handle 1M users at once?', ['Waiting room / virtual queue, cached seat maps, admitting users at the rate the booking path can sustain.']],
    ['Why hold seats at all?', ['Payment takes seconds to minutes. Holding gives the user a guaranteed seat while paying without locking rows for that long.']]
  ],
  say: ['A waiting room admits users at a rate the booking service can handle.', 'Holding seats is one conditional UPDATE, so two people can never hold the same seat.', 'Payment uses an idempotency key, and confirmation is a transaction that requires the hold to still be valid.', 'If payment succeeds but confirm fails, a compensating refund runs.'],
  numbers: [['17k/s', 'arrivals at sale start'], ['50k', 'seats'], ['10 min', 'hold TTL'], ['20:1', 'demand to supply']],
  checklist: ['Write the conditional UPDATE that prevents double booking.', 'Explain hold → pay → confirm and the refund path.', 'Explain the waiting room.', 'Explain why the cache is not the source of truth.'],
  drills: {
    mcq: [
      { id: 'mcq-double', title: 'Two clicks, one seat', ask: 'Two users click seat A12 at the same millisecond. What prevents both getting it?', options: [
        ['A conditional UPDATE … WHERE status = \'available\' in the database', true, 'Only one update can flip the row.'],
        ['Checking the seat map cache first', false, 'Both see "available".'],
        ['Faster servers', false, 'The race still exists.'],
        ['Client-side disabling of the button', false, 'Clients cannot coordinate with each other.']
      ]},
      { id: 'mcq-crowd', title: 'Sale start', ask: '1M fans arrive at once for 50k seats. What protects the system and keeps it fair?', options: [
        ['A waiting room that admits users at a controlled rate', true, 'The booking path sees steady, manageable load.'],
        ['Let everyone in and autoscale', false, 'The seat rows are the bottleneck, not servers.'],
        ['First to load the page wins, no queue', false, 'Crushes the system and rewards bots.'],
        ['Shut down the site', false, 'No sales.']
      ]}
    ],
    order: [{ id: 'ord-book', title: 'Booking saga', ask: 'Order the booking steps.', steps: ['User is admitted from the waiting room', 'Seats are held with a conditional update and a TTL', 'Payment is charged with an idempotency key', 'Seats are marked sold and the order confirmed in one transaction', 'If confirm fails after payment, refund'], extra: ['Mark seats sold before the user chooses them'] }],
    fill: [{ id: 'fill-tb', title: 'Pitch', text: 'Seats are held with a [[conditional update|conditional]] that only succeeds if still available, payment uses an [[idempotency key|idempotency-key]], and a [[waiting room|virtual queue|queue]] protects the system at sale start.' }],
    palette: { id: 'pal-tb', title: 'Build the board', ask: 'Pick what ticket booking needs.', reqs: ['50k seats, 1M fans in a minute', 'Never sell a seat twice', 'No double charges'], parts: [
      ['Waiting room / virtual queue', 'must', 'Controls the spike and is fair.'],
      ['Transactional seats DB', 'must', 'The single judge of who owns a seat.'],
      ['Seat holds with TTL', 'must', 'Reserve while paying.'],
      ['Idempotent payment calls', 'must', 'Retries never double-charge.'],
      ['Cached seat map', 'good', 'Absorbs browsing reads.'],
      ['Eventually consistent seat store (AP)', 'no', 'Would allow double booking.'],
      ['Seat state only in the cache', 'no', 'Caches can be stale or lost.'],
      ['Kafka between click and hold', 'no', 'Users need an immediate yes/no on the hold.']
    ]}
  }
});
})();
