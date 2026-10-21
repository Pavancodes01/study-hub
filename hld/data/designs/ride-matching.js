(function(){
var D = { w: 880, h: 380, nodes: [
  { id: 'dr', label: 'Drivers', sub: 'GPS every 4 s', kind: 'client', x: 70, y: 90 },
  { id: 'rd', label: 'Rider', kind: 'client', x: 70, y: 300 },
  { id: 'gw', label: 'Gateway', sub: 'WebSockets', kind: 'lb', x: 240, y: 190, w: 120 },
  { id: 'loc', label: 'Location service', kind: 'service', x: 430, y: 90, w: 140 },
  { id: 'geo', label: 'Geo index', sub: 'Redis by cell', kind: 'cache', x: 640, y: 90, w: 130 },
  { id: 'match', label: 'Matching', sub: 'pick + offer', kind: 'service', x: 430, y: 300, w: 130 },
  { id: 'trip', label: 'Trips DB', sub: 'state machine', kind: 'db', x: 640, y: 300, w: 120 },
  { id: 'k', label: 'Kafka', sub: 'location stream', kind: 'queue', x: 820, y: 190, w: 100 }
], edges: [['dr', 'gw'], ['rd', 'gw'], ['gw', 'loc'], ['loc', 'geo'], ['gw', 'match'], ['match', 'geo'], ['match', 'trip'], ['loc', 'k', { bend: -30 }]] };

registerDesign({
  slug: 'ride-matching', order: 11, title: 'Ride matching (Uber)',
  one: 'Track millions of moving drivers, find the ==nearest available ones in milliseconds== with a geo index, and offer a trip to exactly one driver at a time.',
  questions: ['Which cities and how many concurrent drivers/riders?', 'How often do drivers send location?', 'Matching by nearest distance, or ETA and other factors?', 'Pricing and surge in scope?', 'Payments in scope?'],
  reqs: {
    func: ['Drivers send location updates', 'Rider requests a ride and gets matched to a nearby driver', 'Driver accepts or declines', 'Both see live location during the trip'],
    nonfunc: ['Match within a few seconds', 'Location writes at high rate', 'A driver is never assigned two trips', 'Highly available per city'],
    mvp: ['location updates', 'nearby search', 'offer / accept flow', 'trip state machine'],
    later: ['surge pricing', 'pooling', 'ETA prediction models', 'payments']
  },
  estimate: {
    lead: 'Location updates dominate writes; most need only to live in memory.',
    assume: ['5M active drivers at peak', 'update every 4 s', '1M ride requests per hour at peak', 'location record ≈ 50 B'],
    rows: [
      ['Location updates', '5M ÷ 4', '**~1.25M writes/s**'],
      ['Live location data', '5M × 50 B', '**~250 MB** (all in RAM)'],
      ['Ride requests', '1M ÷ 3,600', '**~280/s**'],
      ['Nearby searches', '280 × a few retries', '**~1k/s**']
    ],
    so: 'Massive write rate but tiny data: keep current locations in an in-memory geo index sharded by region; stream history to Kafka for analytics.'
  },
  apiLead: 'Drivers and riders keep a WebSocket for pushes; REST for requests.',
  api: [
    ['WS', 'location { lat, lng, heading, ts }', 'Driver app every ~4 s.'],
    ['POST', '/v1/rides', 'Rider requests a ride.', '{ "pickup": { "lat": 12.97, "lng": 77.59 }, "dropoff": { … }, "type": "standard" }\n→ 202 { "rideId": "r_55", "status": "matching" }'],
    ['POST', '/v1/rides/{id}/accept', 'Driver accepts an offer (must hold the offer lock).']
  ],
  dataLead: null,
  data: [
    { name: 'driver_location (live)', store: 'Redis per city shard, keyed by geo cell', cols: [['cell_id', 'H3 / geohash', 'Index key'], ['driver_id', 'string', 'Members of the cell'], ['lat, lng, ts, status', 'floats, enum', 'Available / on trip']] },
    { name: 'trips', store: 'SQL (strong consistency)', cols: [['ride_id', 'string', 'Key'], ['rider_id, driver_id', 'strings', 'Parties'], ['state', 'enum', 'requested → matched → arrived → in_progress → done']] }
  ],
  hld: [
    'Drivers stream locations over WebSockets to the **location service**, which updates an **in-memory geo index**: the map is split into cells (geohash / H3), each listing the drivers inside it.',
    'On a ride request, **matching** looks up the rider\'s cell plus neighbouring cells, filters available drivers, ranks by ETA, and offers the trip to the best one.',
    'An **offer lock** (e.g. Redis `SET driver:7 ride55 NX EX 15`) makes sure a driver is offered one ride at a time; if they decline or time out, the next driver gets it.',
    'Trip state lives in a **transactional DB**; location history goes to Kafka for analytics, ETAs and fraud detection.'
  ],
  flows: [
    { name: 'Match a ride', title: 'From request to accepted', diagram: D, steps: [
      { title: 'Drivers report location', text: 'Every 4 s each driver sends a location. The location service moves the driver into the right geo cell in Redis.', on: ['dr', 'loc', 'geo'], dots: [{ from: 'dr', to: 'gw', label: 'loc' }, { from: 'gw', to: 'loc' }, { from: 'loc', to: 'geo', label: 'cell 8a2…', kind: 'evt' }] },
      { title: 'Rider requests', text: 'Rider asks for a ride; a trip row is created in state `requested`.', on: ['rd', 'match', 'trip'], dots: [{ from: 'rd', to: 'gw', label: 'POST /rides' }, { from: 'gw', to: 'match' }, { from: 'match', to: 'trip', label: 'requested' }] },
      { title: 'Search nearby cells', text: 'Matching reads the pickup cell and its ring of neighbours, filters available drivers, ranks by ETA.', on: ['geo', 'match'], dots: [{ from: 'match', to: 'geo', label: 'cells near pickup' }, { from: 'geo', to: 'match', label: '14 drivers', kind: 'res' }] },
      { title: 'Offer with a lock', text: 'Lock the best driver for 15 s (SET NX) and push the offer over their socket. No other ride can offer them meanwhile.', on: ['dr'], dots: [{ from: 'match', to: 'gw', label: 'offer r_55' }, { from: 'gw', to: 'dr', kind: 'evt' }] },
      { title: 'Accept', text: 'Driver accepts; the trip moves to `matched` in a transaction that also checks the driver is still free. Rider is notified.', on: ['trip', 'rd'], dots: [{ from: 'dr', to: 'gw', label: 'accept' }, { from: 'gw', to: 'match' }, { from: 'match', to: 'trip', label: 'matched' }, { from: 'gw', to: 'rd', label: 'driver on the way', kind: 'res' }] }
    ]}
  ],
  deep: [
    { name: 'Geo indexing', text: ['Turn 2D positions into keys. **Geohash**: base32 string, shared prefix = nearby. **H3** (Uber): hexagonal cells, all neighbours equidistant. **Quadtree**: split dense areas into smaller squares. A "nearby" query checks the pickup cell plus its neighbours, then computes exact distance for the few candidates.'] },
    { name: 'One trip per driver', text: ['Offers use a short-lived lock per driver (SET NX EX). Acceptance runs in a DB transaction: `UPDATE trips SET driver = ? WHERE id = ? AND state = \'requested\'` and the driver is marked busy atomically. If the update touches 0 rows, someone else got there first.'] },
    { name: 'Sharding by city', text: ['Rides are local, so shard the geo index, matching and trip data by city/region. A city outage does not affect others, and each shard stays small.'] }
  ],
  bottlenecks: [['1.25M location writes/s', 'In-memory geo index sharded by city; only latest location kept.'], ['Dense downtown cells', 'Smaller cells (higher H3 resolution) where dense.'], ['Double assignment', 'Offer locks + conditional updates.'], ['Socket connections', 'Gateway fleet with session map, like chat.']],
  tradeoffs: [
    ['Live locations', 'In memory, latest only', 'Fast, cheap', 'History must be streamed elsewhere'],
    ['Geo index', 'H3 cells', 'Uniform neighbours, simple lookups', 'Cell size tuning'],
    ['Assignment', 'Lock + transactional accept', 'No double booking', 'Extra coordination step'],
    ['Partitioning', 'By city', 'Isolation, locality', 'Cross-city trips need care']
  ],
  probe: [
    ['How do you find nearby drivers fast?', ['Geo cells (geohash/H3): look up the pickup cell and neighbours in an in-memory index, then compute exact distances for candidates and rank by ETA.']],
    ['How do you stop two riders getting the same driver?', ['Short-lived per-driver offer lock and a conditional update on accept that only succeeds if the driver is still available.']],
    ['Do you store every location update?', ['Only the latest in the live index. The full stream goes to Kafka for analytics and trip replay; persisting 1.25M writes/s to a DB is unnecessary.']],
    ['What if a driver loses connection?', ['Their location ages out after a timeout and they are marked unavailable; an in-progress trip stays assigned and resumes when they reconnect.']]
  ],
  say: ['Live driver locations live in an in-memory geo index keyed by H3 cell, sharded by city.', 'Matching searches the pickup cell and its neighbours and ranks drivers by ETA.', 'Each offer takes a 15-second lock on the driver, so a driver gets one offer at a time.', 'Trip state is a state machine in a transactional DB; location history streams to Kafka.'],
  numbers: [['~1.25M/s', 'location updates'], ['~250 MB', 'all live locations'], ['4 s', 'update interval'], ['15 s', 'offer timeout']],
  checklist: ['Explain geohash/H3 nearby search.', 'Explain the offer-lock and accept transaction.', 'Explain why live locations stay in memory.', 'Draw the trip state machine.'],
  drills: {
    mcq: [
      { id: 'mcq-geo', title: 'Nearby drivers', ask: 'Best way to find drivers within 2 km among 5M?', options: [
        ['Geo cells (H3/geohash): read the pickup cell and neighbours', true, 'Only a few small cells are scanned.'],
        ['Compute distance to all 5M drivers', false, 'Far too slow per request.'],
        ['SQL WHERE lat BETWEEN … AND lng BETWEEN … without a spatial index', false, 'Still scans a lot.'],
        ['Ask every driver app over WebSocket', false, 'Millions of messages per request.']
      ]},
      { id: 'mcq-double', title: 'Double booking', ask: 'Two riders were matched to the same driver. Fix?', options: [
        ['Per-driver offer lock and conditional update on accept', true, 'Only one offer and one successful accept per driver.'],
        ['Faster matching servers', false, 'Speed does not remove the race.'],
        ['Let the driver choose randomly', false, 'Still two assignments.'],
        ['Cache drivers longer', false, 'Makes stale availability worse.']
      ]}
    ],
    order: [{ id: 'ord-ride', title: 'Matching flow', ask: 'Order the matching steps.', steps: ['Rider requests a ride; trip is created as requested', 'Matching reads drivers in the pickup cell and neighbours', 'Rank available drivers by ETA', 'Lock the best driver and send the offer', 'On accept, conditionally update the trip to matched'], extra: ['Assign every nearby driver to the trip'] }],
    fill: [{ id: 'fill-ride', title: 'Pitch', text: 'Driver locations are kept in an in-memory [[geo index|geospatial index|geo-index]] of [[h3|geohash]] cells, and each offer takes a short [[lock|lease]] on the driver.' }],
    palette: { id: 'pal-ride', title: 'Build the board', ask: 'Pick what ride matching needs.', reqs: ['5M drivers sending location every 4 s', 'Match in seconds', 'Never two trips for one driver'], parts: [
      ['WebSocket gateway', 'must', 'Live updates and offers.'],
      ['In-memory geo index by cell', 'must', 'Fast nearby lookups.'],
      ['Matching service with offer locks', 'must', 'Exactly one offer per driver at a time.'],
      ['Transactional trips DB', 'must', 'Correct trip state.'],
      ['Location stream to Kafka', 'good', 'Analytics and ETA models.'],
      ['Storing every location row in SQL', 'no', '1.25M writes/s for data you only need briefly.'],
      ['Full-text search', 'no', 'Not needed.'],
      ['Global single matching server', 'no', 'Bottleneck; shard by city.']
    ]}
  }
});
})();
