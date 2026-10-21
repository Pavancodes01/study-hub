(function(){
var tr = { w: 840, h: 320, nodes: [
  { id: 'gw', label: 'Gateway', sub: 'trace 9f2 starts', kind: 'lb', x: 100, y: 160, w: 130 },
  { id: 'ord', label: 'Orders', sub: '40 ms', kind: 'service', x: 330, y: 70 },
  { id: 'pay', label: 'Payments', sub: '850 ms', kind: 'service', x: 330, y: 250 },
  { id: 'bank', label: 'Bank API', sub: '800 ms', kind: 'ext', x: 570, y: 250 },
  { id: 'db', label: 'Orders DB', sub: '12 ms', kind: 'db', x: 570, y: 70 },
  { id: 'col', label: 'Telemetry', sub: 'metrics, logs, traces', kind: 'worker', x: 760, y: 160, w: 150 }
], edges: [['gw', 'ord'], ['gw', 'pay'], ['ord', 'db'], ['pay', 'bank'], ['ord', 'col', { dash: true }], ['pay', 'col', { dash: true }], ['gw', 'col', { dash: true, bend: 60 }]] };

registerConcept({
  slug: 'observability', order: 17, title: 'Observability',
  one: 'Metrics tell you ==something is wrong==, traces tell you ==where==, logs tell you ==why==. Alert on what users feel, not on every CPU blip.',
  picture: [
    'A car dashboard shows speed and warning lights (metrics). A trip recorder shows the route and where you were stuck in traffic (traces). The mechanic\'s notes explain what broke (logs). You need all three to fix a car you cannot see.',
    'In interviews, mention monitoring when you discuss reliability: what you would measure (latency, errors, traffic, saturation), what you alert on (SLOs), and how one request is followed across services (trace IDs).'
  ],
  use: ['every production system', 'microservices where one request crosses many services', 'defining and tracking SLAs/SLOs'],
  avoid: ['logging every request body at high traffic (cost, privacy)', 'alerting on causes instead of symptoms (alert fatigue)'],
  flows: [
    { name: 'Following one request', title: 'A slow checkout, found with a trace', diagram: tr, steps: [
      { title: 'Metrics fire', text: 'The p99 latency of checkout jumps from 300 ms to 1.2 s. An alert on the latency SLO pages the on-call engineer. Metrics say **something** is wrong.', on: ['gw'], anno: [{ node: 'gw', text: 'p99 1.2 s!', dy: -50 }] },
      { title: 'A trace ID follows the request', text: 'The gateway gives the request trace ID `9f2` and passes it in headers to every service. Each service records a **span**: name, start, duration.', on: ['ord', 'pay'], dots: [{ from: 'gw', to: 'ord', label: 'trace 9f2' }, { from: 'gw', to: 'pay', label: 'trace 9f2' }] },
      { title: 'The trace shows where', text: 'In the trace view, Orders took 40 ms but Payments took 850 ms, almost all waiting on the bank API.', on: ['pay', 'bank'], bad: ['bank'], dots: [{ from: 'pay', to: 'bank', label: '800 ms', kind: 'err' }] },
      { title: 'Logs explain why', text: 'Payments logs for trace `9f2` show "bank API retry 1, retry 2" after timeouts. The bank is degraded. Fix: shorter timeout, circuit breaker, show "payment pending".', on: ['col'], dots: [{ from: 'pay', to: 'col', label: 'log: retry 2', kind: 'evt' }] }
    ]}
  ],
  how: [
    { name: 'The three signals', text: ['**Metrics:** numbers over time (requests/s, error rate, p99 latency, CPU). Cheap, great for dashboards and alerts. **Logs:** timestamped events with context; structured JSON with trace IDs makes them searchable. **Traces:** the path of one request across services as a tree of spans.'] },
    { name: 'What to measure', text: ['**Golden signals:** latency, traffic, errors, saturation. **RED** for services: rate, errors, duration. **USE** for resources: utilization, saturation, errors. Always look at percentiles (p50, p95, p99), not averages: averages hide the slow tail users feel.'] },
    { name: 'SLIs, SLOs, SLAs', text: ['**SLI:** a measurement ("share of requests under 300 ms"). **SLO:** your target ("99.9% under 300 ms over 30 days"). **SLA:** a contract with penalties. The gap to 100% is the **error budget**: spend it on releases; when it is gone, slow down and fix reliability.'] },
    { name: 'Alerting', text: ['Alert on symptoms users feel (SLO burn rate, error rate), not on every cause (one server at 90% CPU). Every alert should be actionable and have a runbook. Too many alerts and people ignore them.'] },
    { name: 'Tooling', text: ['OpenTelemetry to emit all three signals in a standard way; Prometheus + Grafana for metrics; Loki/ELK for logs; Jaeger/Tempo for traces; or managed tools (Datadog, New Relic).'] }
  ],
  compare: { title: 'Metrics, logs, traces', lead: null, head: ['Signal', 'Answers', 'Cost', 'Example'], rows: [
    ['Metrics', 'Is something wrong? How much?', 'Low (aggregated numbers)', 'p99 latency 1.2 s, error rate 2%'],
    ['Traces', 'Where in the call chain?', 'Medium (sample them)', 'Payments span 850 ms of 900 ms'],
    ['Logs', 'Why exactly?', 'High at volume', '"bank timeout after 500 ms, retry 2"']
  ]},
  say: [
    'Each service exports RED metrics, and we alert on the SLO: 99.9% of checkouts under 500 ms.',
    'A trace ID is created at the gateway and passed through every call, so one slow request can be followed end to end.',
    'Logs are structured JSON with the trace ID, so we can jump from a slow span to its logs.',
    'We sample traces, say 1%, plus every error trace, to keep the cost down.'
  ],
  numbers: [
    ['99.9%', '≈ 43 minutes of downtime per month'],
    ['99.99%', '≈ 4.3 minutes per month'],
    ['1–10%', 'typical trace sampling rate'],
    ['p99', 'the latency 1 in 100 users exceeds']
  ],
  pitfalls: [
    ['Averages', 'Mean latency of 100 ms can hide 5% of requests taking 3 s.'],
    ['Alert on everything', 'Pager fatigue means real alerts get ignored.'],
    ['No correlation IDs', 'Logs from 10 services cannot be tied to one request.'],
    ['High-cardinality metric labels', 'A label per user ID explodes metric storage.'],
    ['Logging secrets', 'Tokens and personal data in logs are a security incident.']
  ],
  seen: [
    ['Google SRE', 'Popularized SLOs, error budgets and the four golden signals.'],
    ['Uber Jaeger / Twitter Zipkin', 'Open-source distributed tracing systems.'],
    ['Prometheus', 'Pull-based metrics with PromQL, standard in Kubernetes.'],
    ['OpenTelemetry', 'The vendor-neutral standard for emitting metrics, logs and traces.']
  ],
  probe: [
    ['How would you know the system is healthy?', ['Dashboards and alerts on golden signals per service, with SLOs on user-facing paths (e.g. 99.9% of requests under 300 ms, error rate below 0.1%).']],
    ['How do you debug a slow request across 10 services?', ['Distributed tracing: find the trace, see which span is slow, then read that service\'s logs filtered by trace ID.']],
    ['What is an error budget?', ['100% minus the SLO. With 99.9%, about 43 minutes a month of failure is "allowed". If you burn it fast, freeze risky releases and fix reliability first.']],
    ['Why p99 and not the average?', ['Users experience the tail. At scale, a page that makes 20 backend calls hits a p99 call often; averages hide that.']]
  ],
  checklist: [
    'Explain metrics, logs and traces and what each answers.',
    'Name the four golden signals.',
    'Define SLI, SLO, SLA and error budget.',
    'Explain how a trace ID moves through services.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-where', title: 'Which service is slow?', ask: 'Checkout p99 doubled. It calls 8 services. Fastest way to find the culprit?', options: [
        ['Look at distributed traces for slow checkout requests', true, 'Traces show which span takes the time.'],
        ['Read all logs from all 8 services', false, 'Slow and noisy without a trace ID to filter by.'],
        ['Check average CPU of all servers', false, 'Averages and CPU may not show the slow dependency.'],
        ['Restart everything', false, 'Guessing, not diagnosing.']
      ]},
      { id: 'mcq-alert', title: 'Good alert', ask: 'Which alert is best for waking someone at 3 a.m.?', options: [
        ['Checkout error rate above SLO for 5 minutes', true, 'A user-facing symptom, actionable and urgent.'],
        ['One server CPU above 80%', false, 'Often harmless; a cause, not a symptom.'],
        ['Disk 50% full', false, 'Not urgent.'],
        ['Any single 500 error', false, 'Too noisy.']
      ]},
      { id: 'mcq-avg', title: 'Averages', ask: 'Average latency is 120 ms but users complain about slowness. What to check?', options: [
        ['p95/p99 latency', true, 'The slow tail is invisible in averages.'],
        ['Median only', false, 'Median hides the tail too.'],
        ['Total request count', false, 'Volume does not show slowness.'],
        ['Nothing, 120 ms is fine', false, 'Users are telling you otherwise.']
      ]}
    ],
    order: [
      { id: 'ord-debug', title: 'Debugging an incident', ask: 'Order the usual investigation.', steps: ['An SLO alert fires on a metric', 'Check dashboards to see scope and timing', 'Open traces of failing or slow requests', 'Read logs of the slow service by trace ID', 'Mitigate, then fix the root cause'], extra: ['Delete the logs to free space'] }
    ],
    fill: [
      { id: 'fill-obs', title: 'Three signals', text: '[[Metrics|metric]] tell you something is wrong, [[traces|tracing]] tell you where, and [[logs|logging]] tell you why.' }
    ]
  }
});
})();
