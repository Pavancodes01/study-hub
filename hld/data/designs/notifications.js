(function(){
var D = { w: 880, h: 380, nodes: [
  { id: 'src', label: 'Services', sub: 'orders, social…', kind: 'service', x: 80, y: 190 },
  { id: 'ns', label: 'Notification API', sub: 'validate, dedupe', kind: 'service', x: 260, y: 190, w: 150 },
  { id: 'pref', label: 'Prefs + tokens', sub: 'user settings', kind: 'db', x: 260, y: 330, w: 140 },
  { id: 'q', label: 'Kafka', sub: 'per channel topics', kind: 'queue', x: 460, y: 190 },
  { id: 'push', label: 'Push workers', kind: 'worker', x: 650, y: 70 },
  { id: 'mail', label: 'Email workers', kind: 'worker', x: 650, y: 190 },
  { id: 'sms', label: 'SMS workers', kind: 'worker', x: 650, y: 310 },
  { id: 'apns', label: 'APNs / FCM', kind: 'ext', x: 820, y: 70, w: 100 },
  { id: 'esp', label: 'Email provider', kind: 'ext', x: 820, y: 190, w: 110 },
  { id: 'smsp', label: 'SMS provider', kind: 'ext', x: 820, y: 310, w: 110 },
  { id: 'log', label: 'Delivery log', kind: 'db', x: 460, y: 330, w: 120 }
], edges: [['src', 'ns'], ['ns', 'pref'], ['ns', 'q'], ['q', 'push'], ['q', 'mail'], ['q', 'sms'], ['push', 'apns'], ['mail', 'esp'], ['sms', 'smsp'], ['mail', 'log', { dash: true }], ['ns', 'esp', { unless: 'q', bend: -60 }]] };

registerDesign({
  slug: 'notifications', order: 5, title: 'Notification system',
  one: 'One service that sends push, email and SMS for every other team: ==accept fast, queue per channel, respect user preferences, retry without spamming==.',
  questions: ['Which channels: push, email, SMS, in-app?', 'Volume per day and peak (e.g. a marketing blast)?', 'Transactional (OTP, receipts) vs marketing: different priorities?', 'Do users control preferences and quiet hours?', 'Do we need delivery tracking?'],
  reqs: {
    func: ['Send a notification to a user on one or more channels', 'Templates with variables', 'User preferences, opt-out, quiet hours', 'Track status: queued, sent, delivered, failed'],
    nonfunc: ['Transactional messages in seconds (OTP < 5 s)', 'Marketing blasts of 10M without hurting OTPs', 'No duplicates to the user', 'At-least-once internally; providers may fail'],
    mvp: ['push, email, SMS', 'templates', 'preferences', 'priority queues', 'retries + dedupe'],
    later: ['in-app inbox', 'A/B testing of templates', 'smart send-time']
  },
  estimate: {
    lead: 'Peaks come from blasts, not from steady traffic.',
    assume: ['50M notifications/day normally', 'marketing blast of 20M within 1 hour', 'record per notification ≈ 500 B'],
    rows: [
      ['Average rate', '50M ÷ 86,400', '**~600/s**'],
      ['Blast rate', '20M ÷ 3,600', '**~5,500/s** extra'],
      ['Log storage per day', '70M × 500 B', '**~35 GB/day**'],
      ['Provider limits', 'SMS/email providers cap rates per account', '**must throttle per provider**']
    ],
    so: 'Throughput is moderate; the design problems are isolation (blasts vs OTPs), provider limits, retries and dedupe.'
  },
  apiLead: 'Internal teams call one endpoint; the service decides channels from preferences.',
  api: [
    ['POST', '/v1/notifications', 'Queue a notification. Returns 202 at once.', '{ "userId": "u7", "template": "order_shipped", "vars": { "order": "91" },\n  "channels": ["push", "email"], "priority": "transactional",\n  "idempotencyKey": "order-91-shipped" }\n→ 202 { "id": "n_8812" }'],
    ['GET', '/v1/notifications/{id}', 'Status per channel.'],
    ['PUT', '/v1/users/{id}/preferences', 'Opt in or out per channel and category; quiet hours.']
  ],
  dataLead: null,
  data: [
    { name: 'notification', store: 'Cassandra / DynamoDB (write-heavy log)', cols: [['id', 'string', 'Primary key'], ['user_id', 'string', 'Partition for user history'], ['channel, status', 'enums', 'queued / sent / delivered / failed'], ['idempotency_key', 'string', 'Dedupe repeated requests']] },
    { name: 'preferences + device tokens', store: 'SQL, cached', cols: [['user_id', 'string', 'Key'], ['opt_outs, quiet_hours', 'json', 'Checked before sending'], ['push_tokens', 'list', 'Per device; removed when provider says invalid']] }
  ],
  hld: [
    'The **Notification API** validates, checks the idempotency key, loads preferences, renders templates and publishes one message per channel to Kafka. It returns 202 immediately.',
    'Separate topics per channel **and priority**: OTPs never wait behind a 20M marketing blast.',
    '**Channel workers** call providers (APNs/FCM, email, SMS) with per-provider rate limits, retries with backoff, and a dead-letter queue.',
    'Every status change is written to a **delivery log**; provider callbacks (delivered, bounced) update it.'
  ],
  flows: [
    { name: 'Build it up', title: 'Building the notification system', diagram: D, progressive: true, steps: [
      { title: 'Direct calls', add: ['src', 'ns', 'esp'], text: 'Naive: the API calls the email provider inline. A slow provider makes every caller slow, and a blast blocks everything.', on: ['ns'], dots: [{ from: 'ns', to: 'esp', label: 'send inline', kind: 'err' }] },
      { title: 'Respect preferences', add: ['pref'], text: 'Before sending, load the user\'s opt-outs, quiet hours and device tokens (cached).', on: ['pref'], dots: [{ from: 'ns', to: 'pref', label: 'prefs u7' }] },
      { title: 'Queue per channel', add: ['q', 'mail'], text: 'Publish to Kafka and return 202. Email workers drain the queue at the provider\'s allowed rate.', on: ['q', 'mail'], dots: [{ from: 'ns', to: 'q', label: 'email job', kind: 'evt' }, { from: 'q', to: 'mail', kind: 'evt' }, { from: 'mail', to: 'esp', label: 'send' }] },
      { title: 'All channels', add: ['push', 'sms', 'apns', 'smsp'], text: 'Push and SMS get their own topics and workers. Each scales and fails independently.', on: ['push', 'sms'], dots: [{ from: 'q', to: 'push', kind: 'evt' }, { from: 'push', to: 'apns', label: 'push' }, { from: 'q', to: 'sms', kind: 'evt' }] },
      { title: 'Track delivery', add: ['log'], text: 'Workers write sent/failed; provider webhooks report delivered/bounced. Invalid push tokens are removed.', on: ['log'], dots: [{ from: 'mail', to: 'log', label: 'sent', kind: 'evt' }] },
      { title: 'Priorities', text: 'Transactional and marketing use separate topics and worker pools. A 20M blast fills the marketing topic; OTPs keep flowing in seconds.', on: ['q'], set: { q: { sub: 'otp ⟂ marketing' } } }
    ]},
    { name: 'Send an OTP', title: 'One transactional push', diagram: D, steps: [
      { title: 'Request', text: 'Auth service asks for an OTP push with idempotency key `login-u7-1234`.', on: ['src', 'ns'], dots: [{ from: 'src', to: 'ns', label: 'POST /notifications' }] },
      { title: 'Dedupe + prefs', text: 'Key not seen before; user allows push; device token found.', on: ['pref'], dots: [{ from: 'ns', to: 'pref' }, { from: 'pref', to: 'ns', label: 'token', kind: 'res' }] },
      { title: 'High-priority topic', text: 'Published to `push.transactional`; caller gets 202.', on: ['q'], dots: [{ from: 'ns', to: 'q', kind: 'evt' }, { from: 'ns', to: 'src', label: '202', kind: 'res' }] },
      { title: 'Deliver', text: 'Push worker sends to APNs. On a 5xx it retries with backoff; on "invalid token" it removes the token.', on: ['push', 'apns'], dots: [{ from: 'q', to: 'push', kind: 'evt' }, { from: 'push', to: 'apns', label: 'send' }, { from: 'apns', to: 'push', label: '200', kind: 'res' }] }
    ]}
  ],
  deep: [
    { name: 'No duplicates', text: ['Callers send an idempotency key; the API stores it with a TTL and ignores repeats. Workers record message IDs they have sent, because Kafka redelivers. Providers may still occasionally duplicate; that is accepted.'] },
    { name: 'Provider limits and failover', text: ['Each provider has rate limits; workers use a token bucket per provider account. If an email provider fails, switch to a secondary provider after the circuit breaker opens.'] },
    { name: 'Blasts', text: ['A campaign of 20M is expanded by a batch job into messages, enqueued gradually on the marketing topic, and sent at a steady rate. Quiet hours per time zone can delay delivery.'] }
  ],
  bottlenecks: [['Provider rate limits', 'Per-provider throttling; multiple accounts/providers.'], ['Blasts starving OTPs', 'Separate priority topics and worker pools.'], ['Duplicate sends', 'Idempotency keys + sent-ID dedupe.'], ['Dead device tokens', 'Remove on provider feedback.']],
  tradeoffs: [
    ['Sending', 'Async via Kafka', 'Callers never wait; spikes absorbed', 'Seconds of delay'],
    ['Priority', 'Separate topics', 'OTPs isolated from blasts', 'More topics to run'],
    ['Delivery', 'At-least-once + dedupe', 'No lost messages', 'Rare duplicates via providers'],
    ['Log store', 'Wide-column', 'Huge write volume', 'Limited ad-hoc analytics']
  ],
  probe: [
    ['How do you avoid sending the same notification twice?', ['Idempotency key at the API, dedupe by message ID in workers, and accept rare provider duplicates.']],
    ['How do you keep OTPs fast during a 20M blast?', ['Separate topics and worker pools per priority, with their own provider rate budgets.']],
    ['What if a provider is down?', ['Retries with backoff, circuit breaker, then fail over to a secondary provider; messages wait in Kafka meanwhile.']],
    ['How do you honour quiet hours?', ['Check the user\'s time zone and settings before sending; delay non-urgent messages with a scheduled queue.']]
  ],
  say: ['Callers get 202 immediately; messages go to Kafka topics per channel and priority.', 'Preferences and opt-outs are checked before anything is queued.', 'Workers throttle per provider, retry with backoff and fail over to a backup provider.', 'Idempotency keys and sent-ID checks prevent duplicate notifications.'],
  numbers: [['~600/s', 'average'], ['~5.5k/s', 'during a blast'], ['< 5 s', 'OTP target'], ['35 GB/day', 'delivery log']],
  checklist: ['Draw the pipeline from API to providers.', 'Explain priority isolation.', 'Explain dedupe end to end.', 'Explain provider rate limits and failover.'],
  drills: {
    mcq: [
      { id: 'mcq-otp', title: 'Slow OTPs', ask: 'During a marketing campaign, OTP pushes take 10 minutes. Fix?', options: [
        ['Separate topics and worker pools for transactional vs marketing', true, 'OTPs no longer queue behind the blast.'],
        ['Send marketing faster', false, 'Provider limits still apply; OTPs still wait.'],
        ['Drop the queue and call providers inline', false, 'Callers get slow and spikes hurt everyone.'],
        ['Increase Kafka retention', false, 'Retention is unrelated to latency.']
      ]},
      { id: 'mcq-sync', title: 'Response code', ask: 'What should POST /v1/notifications return when it accepts a message?', options: [
        ['202 Accepted with an ID to check status', true, 'Sending happens asynchronously.'],
        ['200 after the email is delivered', false, 'Would block callers for seconds or minutes.'],
        ['204 with no ID', false, 'Callers cannot track status.'],
        ['500 until sent', false, 'Not an error.']
      ]}
    ],
    order: [
      { id: 'ord-n', title: 'Pipeline', ask: 'Order the path of a notification.', steps: ['Service calls the Notification API with an idempotency key', 'API checks dedupe and user preferences', 'API renders the template and publishes per channel', 'Channel worker sends via the provider with retries', 'Status is written to the delivery log'], extra: ['Worker emails all users to be safe'] }
    ],
    fill: [{ id: 'fill-n', title: 'Pitch', text: 'Messages go through [[kafka|a queue|queue]] with separate topics per [[priority|channel]], so a marketing blast never delays [[otp|otps|transactional]] messages.' }],
    palette: { id: 'pal-n', title: 'Build the board', ask: 'Pick what the notification system needs.', reqs: ['Push, email, SMS for 50M/day plus blasts', 'OTPs within 5 seconds', 'Respect opt-outs; no duplicates'], parts: [
      ['Notification API with idempotency', 'must', 'One entry point that dedupes.'],
      ['Preferences store', 'must', 'Opt-outs and tokens before sending.'],
      ['Queue with priority/channel topics', 'must', 'Absorb blasts; isolate OTPs.'],
      ['Channel workers with provider throttling', 'must', 'Respect provider limits; retries.'],
      ['Delivery log', 'good', 'Status tracking and debugging.'],
      ['Backup providers', 'good', 'Survive provider outages.'],
      ['Synchronous provider calls from the API', 'no', 'Slow callers, no spike absorption.'],
      ['Graph database', 'no', 'No graph queries here.']
    ]}
  }
});
})();
