(function(){
var D = { w: 880, h: 380, nodes: [
  { id: 'u1', label: 'Alice', kind: 'client', x: 70, y: 90 },
  { id: 'u2', label: 'Bob', kind: 'client', x: 70, y: 290 },
  { id: 'g1', label: 'Chat server 1', sub: 'WebSockets', kind: 'service', x: 280, y: 90, w: 140 },
  { id: 'g2', label: 'Chat server 2', sub: 'WebSockets', kind: 'service', x: 280, y: 290, w: 140 },
  { id: 'pres', label: 'Session map', sub: 'user → server', kind: 'cache', x: 500, y: 190, w: 140 },
  { id: 'q', label: 'Kafka', sub: 'by conversation', kind: 'queue', x: 690, y: 90 },
  { id: 'db', label: 'Messages DB', sub: 'Cassandra', kind: 'db', x: 690, y: 290, w: 130 },
  { id: 'push', label: 'Push service', kind: 'worker', x: 815, y: 190, w: 110 }
], edges: [['u1', 'g1'], ['u2', 'g2'], ['g1', 'pres'], ['g2', 'pres'], ['g1', 'q'], ['q', 'g2'], ['q', 'db'], ['q', 'push']] };

registerDesign({
  slug: 'chat', order: 7, title: 'Chat (WhatsApp / Messenger)',
  one: 'Deliver messages between users in real time over ==persistent WebSocket connections==, store them durably in order, and reach offline users with push notifications.',
  questions: ['1:1 only, or groups? Max group size?', 'Online presence and read receipts?', 'Message history kept forever? Multi-device sync?', 'Media (images, voice)?', 'End-to-end encryption required?'],
  reqs: {
    func: ['Send and receive 1:1 and small group messages', 'Message history per conversation', 'Delivered / read receipts', 'Push notification when offline', 'Online presence'],
    nonfunc: ['Delivery latency < 200 ms when both online', 'Messages never lost, in order within a conversation', '500M daily users, tens of millions online at once', 'Highly available'],
    mvp: ['1:1 + groups ≤ 500', 'history', 'receipts', 'offline push'],
    later: ['voice/video calls', 'end-to-end encryption details', 'message search']
  },
  estimate: {
    lead: 'Connections and message writes are the two numbers that matter.',
    assume: ['500M daily users, 50M online at peak', '40 messages sent per user per day', '100 bytes per message', 'one server holds ~100k connections'],
    rows: [
      ['Messages', '500M × 40 ÷ 86,400', '**~230k/s** (peak ~700k/s)'],
      ['Storage per day', '20B × 100 B', '**~2 TB/day**'],
      ['Chat servers', '50M ÷ 100k', '**~500 servers**'],
      ['5-year storage', '2 TB × 365 × 5', '**~3.6 PB** (before replication)']
    ],
    so: 'Holding 50M open connections and writing ~700k messages/s at peak drive the design: stateful connection servers plus a write-optimized store.'
  },
  apiLead: 'Messages travel over a WebSocket; REST handles history and setup.',
  api: [
    ['WS', 'send { convId, clientMsgId, text }', 'Client sends over its open socket; server acks with the stored message ID.', '→ { "type": "send", "convId": "c_42", "clientMsgId": "a1b2", "text": "hi" }\n← { "type": "ack", "clientMsgId": "a1b2", "msgId": "1736…", "ts": "…" }'],
    ['WS', 'receive { convId, msgId, from, text }', 'Server pushes new messages to connected recipients.'],
    ['GET', '/v1/conversations/{id}/messages?before=…', 'Load older history, paginated by message ID.']
  ],
  dataLead: 'Messages are partitioned by conversation and sorted by time: a perfect fit for a wide-column store.',
  data: [
    { name: 'messages', store: 'Cassandra, partition = (conv_id, time bucket)', cols: [['conv_id', 'string', 'Partition key: one conversation together'], ['msg_id', 'Snowflake', 'Clustering key: time order'], ['sender_id, body', 'string', 'Content'], ['client_msg_id', 'string', 'Dedupe client retries']] },
    { name: 'conversation_members', store: 'SQL / KV', cols: [['conv_id', 'string', 'Group or 1:1'], ['user_id', 'string', 'Member'], ['last_read_msg_id', 'long', 'Read receipts and unread counts']] },
    { name: 'sessions', store: 'Redis', cols: [['user_id', 'string', 'Key'], ['server_id', 'string', 'Which chat server holds the socket'], ['ttl', 'seconds', 'Refreshed by heartbeats']] }
  ],
  hld: [
    'Each client keeps a **WebSocket** to one chat server (picked by the load balancer). The server records `user → server` in a session map in Redis.',
    'When Alice sends a message, her chat server assigns a time-ordered ID, writes to **Kafka partitioned by conversation** (order preserved), and acks Alice.',
    'Consumers persist messages to **Cassandra** and route them: look up Bob\'s server in the session map and deliver over his socket. If Bob is offline, the **push service** sends a notification.',
    'On reconnect, a client asks for messages after its last received ID, so nothing is missed.'
  ],
  flows: [
    { name: 'Build it up', title: 'Building real-time chat', diagram: D, progressive: true, steps: [
      { title: 'Persistent connections', add: ['u1', 'g1'], text: 'Polling every second would waste huge resources. Clients open a WebSocket and keep it open; the server can push messages any time.', on: ['g1'], dots: [{ from: 'u1', to: 'g1', label: 'WebSocket' }] },
      { title: 'Many chat servers', add: ['u2', 'g2', 'pres'], text: 'Alice and Bob are connected to different servers. A session map in Redis records which server holds each user\'s socket.', on: ['pres'], dots: [{ from: 'g1', to: 'pres', label: 'alice → s1', kind: 'evt' }, { from: 'g2', to: 'pres', label: 'bob → s2', kind: 'evt' }] },
      { title: 'Ordered, durable log', add: ['q', 'db'], text: 'Messages go to Kafka keyed by conversation, so each conversation stays in order, then are stored in Cassandra.', on: ['q', 'db'], dots: [{ from: 'g1', to: 'q', label: 'msg', kind: 'evt' }, { from: 'q', to: 'db', label: 'persist', kind: 'evt' }] },
      { title: 'Route to the recipient', text: 'The router finds Bob on server 2 and pushes the message over his socket.', on: ['g2', 'u2'], dots: [{ from: 'q', to: 'g2', label: 'deliver', kind: 'evt' }] },
      { title: 'Offline users', add: ['push'], text: 'If Bob has no session, send a push notification. When he opens the app, he syncs everything after his last message ID.', on: ['push'], dots: [{ from: 'q', to: 'push', label: 'notify bob', kind: 'evt' }] }
    ]},
    { name: 'Send a message', title: 'Alice sends "hi" to Bob', diagram: D, steps: [
      { title: 'Send over the socket', text: 'Alice\'s app sends the text with a client message ID (for safe retries).', on: ['u1', 'g1'], dots: [{ from: 'u1', to: 'g1', label: 'send hi' }] },
      { title: 'Assign ID, append to log', text: 'Server 1 assigns a Snowflake ID and appends to the conversation\'s Kafka partition.', on: ['g1', 'q'], dots: [{ from: 'g1', to: 'q', label: 'conv c_42', kind: 'evt' }] },
      { title: 'Ack the sender', text: 'Once Kafka has it durably, Alice gets an ack: one grey tick ("sent").', on: ['u1'], dots: [{ from: 'g1', to: 'u1', label: 'ack ✓', kind: 'res' }] },
      { title: 'Deliver to Bob', text: 'Router looks up Bob → server 2 and pushes. Bob\'s app replies "delivered", which flows back to Alice as a second tick.', on: ['pres', 'g2', 'u2'], dots: [{ from: 'g2', to: 'pres', label: 'where is bob?' }, { from: 'q', to: 'g2', kind: 'evt' }, { from: 'g2', to: 'u2', label: 'hi', kind: 'res' }] },
      { title: 'Persist', text: 'In parallel the message is stored in Cassandra under (c_42, bucket), sorted by ID, ready for history and other devices.', on: ['db'], dots: [{ from: 'q', to: 'db', kind: 'evt' }] }
    ]}
  ],
  deep: [
    { name: 'Ordering and duplicates', text: ['Order is guaranteed per conversation by keying Kafka on conversation ID and using time-ordered message IDs. Clients send a `clientMsgId`; the server dedupes retries so a flaky network does not create duplicate messages.'] },
    { name: 'Groups', text: ['For small groups (≤ 500), fan out to each member\'s server. For very large channels, store once and let members pull, or fan out lazily to only online members.'] },
    { name: 'Presence', text: ['Clients send heartbeats every ~30 s; the session entry has a TTL. Online/offline changes are published only to contacts who are online and looking, and debounced to avoid flapping.'] },
    { name: 'Connection servers at scale', text: ['Each server holds ~100k sockets mostly idle, so memory per connection matters (event-loop servers: Netty, Erlang). Deploys drain connections gradually; clients reconnect with backoff and resync from their last message ID.'] }
  ],
  bottlenecks: [['Millions of open sockets', 'Event-driven servers, ~100k per host, scale out.'], ['Hot group chats', 'Lazy fan-out, pull for huge channels.'], ['Write volume', 'Cassandra partitioned by conversation + time bucket.'], ['Reconnect storms after deploy', 'Gradual draining, jittered reconnects.']],
  tradeoffs: [
    ['Transport', 'WebSocket', 'Real-time push, low overhead', 'Stateful servers to manage'],
    ['Ordering', 'Per conversation via Kafka key', 'Correct where it matters, scalable', 'No global order'],
    ['Storage', 'Cassandra', 'Huge write throughput, time-ordered reads', 'No joins, design per query'],
    ['Offline', 'Push + sync from last ID', 'Nothing lost', 'Clients track their position']
  ],
  probe: [
    ['How does a message find the recipient\'s server?', ['A session map (user → chat server) in Redis, written on connect and refreshed by heartbeats; the router looks it up and forwards.']],
    ['How do you keep messages in order?', ['Single Kafka partition per conversation key and time-ordered IDs; clients sort by ID.']],
    ['What happens if the recipient is offline?', ['Message is stored; push notification sent; on reconnect the client fetches all messages after its last seen ID.']],
    ['How do read receipts work?', ['Client sends "read up to msgId"; store last_read per member; notify the sender\'s devices.']]
  ],
  say: ['Clients hold WebSockets to chat servers, and a Redis session map says which server each user is on.', 'Messages are keyed by conversation in Kafka, so each chat stays in order.', 'Cassandra stores messages partitioned by conversation and time bucket.', 'Offline users get a push, then sync from their last message ID.'],
  numbers: [['~700k/s', 'messages at peak'], ['~500', 'chat servers for 50M sockets'], ['2 TB/day', 'message storage'], ['< 200 ms', 'delivery target']],
  checklist: ['Explain why WebSockets instead of polling.', 'Explain the session map and routing.', 'Explain ordering and dedupe.', 'Explain offline delivery and sync.'],
  drills: {
    mcq: [
      { id: 'mcq-ws', title: 'Transport', ask: 'Best way for the server to deliver messages instantly to online users?', options: [
        ['Persistent WebSocket connections', true, 'The server can push at any time with low overhead.'],
        ['Client polls every 100 ms', false, 'Enormous wasted load.'],
        ['Email', false, 'Not real time.'],
        ['DNS updates', false, 'Unrelated.']
      ]},
      { id: 'mcq-store', title: 'Message store', ask: 'Which store fits "write 700k msgs/s, read latest 50 per conversation"?', options: [
        ['Wide-column store partitioned by conversation and time', true, 'Cheap appends and one-partition reads.'],
        ['Single SQL table with an index on conversation', false, 'One node cannot take the write volume.'],
        ['Redis only', false, 'Not durable or cheap enough for petabytes.'],
        ['Elasticsearch', false, 'Search engine, not the primary store.']
      ]}
    ],
    order: [{ id: 'ord-chat', title: 'Message path', ask: 'Order a message from Alice to Bob.', steps: ['Alice sends over her WebSocket with a client message ID', 'Server assigns an ID and appends to Kafka by conversation', 'Server acks Alice', 'Router finds Bob\'s server in the session map', 'Bob\'s server pushes the message to Bob'], extra: ['Alice\'s phone connects directly to Bob\'s phone'] }],
    fill: [{ id: 'fill-chat', title: 'Pitch', text: 'Clients keep [[websocket|websockets|web socket]] connections; messages are keyed by [[conversation|chat|conversation id]] in Kafka for ordering and stored in [[cassandra|a wide-column store]].' }],
    palette: { id: 'pal-chat', title: 'Build the board', ask: 'Pick what the chat system needs.', reqs: ['50M users online at peak', 'Messages in order, never lost', 'Offline users notified'], parts: [
      ['WebSocket chat servers', 'must', 'Real-time push to online users.'],
      ['Session map (user → server)', 'must', 'Route messages to the right server.'],
      ['Log keyed by conversation', 'must', 'Ordering and durability.'],
      ['Wide-column message store', 'must', 'History at huge write volume.'],
      ['Push notification service', 'must', 'Reach offline users.'],
      ['Presence service', 'good', 'Nice to have for online indicators.'],
      ['HTTP polling every second', 'no', 'Wasteful compared to sockets.'],
      ['Graph database for messages', 'no', 'Messages are a time series per conversation.']
    ]}
  }
});
})();
