(function(){
var D = { w: 880, h: 380, nodes: [
  { id: 'cr', label: 'Creator', kind: 'client', x: 70, y: 80 },
  { id: 'up', label: 'Upload service', sub: 'pre-signed, resumable', kind: 'service', x: 260, y: 80, w: 150 },
  { id: 'raw', label: 'Raw videos', kind: 'blob', x: 460, y: 80, w: 120, h: 56 },
  { id: 'q', label: 'Job queue', kind: 'queue', x: 460, y: 210 },
  { id: 'tc', label: 'Transcoders', sub: 'chunks in parallel', kind: 'worker', x: 660, y: 210, w: 140 },
  { id: 'out', label: 'Encoded segments', sub: '240p…4K', kind: 'blob', x: 660, y: 80, w: 150, h: 56 },
  { id: 'meta', label: 'Video metadata', kind: 'db', x: 260, y: 220, w: 130 },
  { id: 'cdn', label: 'CDN', sub: 'edge caches', kind: 'cdn', x: 830, y: 300, w: 100, h: 60 },
  { id: 'v', label: 'Viewer', sub: 'adaptive player', kind: 'client', x: 600, y: 330 }
], edges: [['cr', 'up'], ['up', 'raw'], ['up', 'meta'], ['raw', 'q', { label: 'event' }], ['q', 'tc'], ['tc', 'out'], ['out', 'cdn', { bend: -20 }], ['v', 'cdn'], ['v', 'meta', { dash: true }]] };

registerDesign({
  slug: 'video-streaming', order: 10, title: 'Video streaming (YouTube)',
  one: 'Upload once, ==transcode into many qualities split into small segments==, and stream them from CDN edges so the player can switch quality as bandwidth changes.',
  questions: ['Upload and watch, or also live streaming?', 'How many uploads and views per day?', 'Max video length and resolution?', 'Global audience? Mobile networks?', 'Recommendations and comments in scope?'],
  reqs: {
    func: ['Upload videos', 'Transcode into multiple resolutions', 'Stream with adaptive quality', 'Video metadata: title, views, thumbnails'],
    nonfunc: ['Playback start < 2 s; minimal rebuffering', 'Huge read volume, global', 'Uploads can take minutes to be ready', 'Durable storage of originals'],
    mvp: ['upload', 'transcode', 'adaptive streaming via CDN', 'view counts'],
    later: ['live streaming', 'recommendations', 'comments', 'DRM']
  },
  estimate: {
    lead: 'Egress bandwidth dwarfs everything.',
    assume: ['500k uploads/day, average 10 min', '1B views/day, average 5 min watched at ~3 Mbit/s', 'stored size ≈ 5× original after all renditions'],
    rows: [
      ['Watch bandwidth', '1B × 300 s × 3 Mbit/s ÷ 86,400', '**~10 Tbit/s average**'],
      ['Upload volume', '500k × 10 min × ~1 GB/hr ÷ 6', '**~80 TB/day** originals'],
      ['Stored renditions', '80 TB × 5', '**~400 TB/day**'],
      ['Transcoding', '500k × 10 min of video', '**~83k hours of video/day** to encode']
    ],
    so: 'Only a CDN (with edge caches inside ISPs) can serve 10 Tbit/s. Transcoding is a big but parallel batch problem.'
  },
  apiLead: null,
  api: [
    ['POST', '/v1/videos', 'Create a video and get a resumable upload URL.', '→ 201 { "videoId": "v_9", "uploadUrl": "https://upload…" }'],
    ['GET', '/v1/videos/{id}', 'Metadata plus the manifest URL for playback.', '→ { "title": "…", "status": "ready", "manifest": "https://cdn…/v_9/master.m3u8" }'],
    ['GET', 'cdn/{id}/{rendition}/{segment}.ts', 'Video segments, served by the CDN.']
  ],
  dataLead: null,
  data: [
    { name: 'videos', store: 'sharded SQL / KV by video_id', cols: [['video_id', 'string', 'Key'], ['owner_id, title, description', 'strings', 'Metadata'], ['status', 'enum', 'uploading / processing / ready']] },
    { name: 'renditions', store: 'object storage', cols: [['path', 'v_9/720p/seg_00042.ts', '2–6 s segment per file'], ['manifest', 'm3u8 / mpd', 'Lists renditions and segments'], ['size', 'bytes', 'For storage accounting']] },
    { name: 'view_counts', store: 'counter service (sharded)', cols: [['video_id', 'string', 'Key'], ['count', 'long', 'Batched increments'], ['day', 'date', 'For analytics']] }
  ],
  hld: [
    '**Upload:** resumable multipart upload straight to object storage; the API only tracks metadata.',
    '**Processing:** an upload event creates a job. The video is split into chunks transcoded **in parallel** into renditions (240p … 4K) and packaged as 2–6 second **segments** with manifests (HLS/DASH).',
    '**Playback:** the player downloads the manifest, then segments from the **CDN**. It measures bandwidth and switches rendition per segment (**adaptive bitrate**).',
    '**Popular videos** are pushed to edge caches; long-tail videos are pulled on demand from origin.'
  ],
  flows: [
    { name: 'Upload to ready', title: 'From upload to playable', diagram: D, steps: [
      { title: 'Resumable upload', text: 'The creator uploads a 2 GB file in parts directly to storage. A failed part is retried alone.', on: ['cr', 'up', 'raw'], dots: [{ from: 'cr', to: 'up', label: 'POST /videos' }, { from: 'up', to: 'raw', label: 'multipart PUT' }] },
      { title: 'Job queued', text: 'Storage emits "uploaded"; a transcode job is queued and status becomes `processing`.', on: ['q', 'meta'], dots: [{ from: 'raw', to: 'q', label: 'uploaded', kind: 'evt' }, { from: 'up', to: 'meta', label: 'processing', kind: 'evt' }] },
      { title: 'Parallel transcoding', text: 'The video is split into chunks; many workers encode chunks into each resolution at the same time. A 10-minute video is ready in a few minutes.', on: ['tc'], dots: [{ from: 'q', to: 'tc', label: 'chunk jobs', kind: 'evt' }, { from: 'tc', to: 'out', label: 'segments', kind: 'evt' }], set: { tc: { sub: '120 chunks × 6 renditions' } } },
      { title: 'Ready', text: 'Manifests are written and the status becomes `ready`. Popular creators\' videos can be pre-warmed on the CDN.', on: ['out', 'meta'] }
    ]},
    { name: 'Watch', title: 'Adaptive playback from the CDN', diagram: D, steps: [
      { title: 'Get metadata', text: 'The player fetches the title and the manifest URL.', on: ['v', 'meta'], dots: [{ from: 'v', to: 'meta', label: 'GET video' }] },
      { title: 'Manifest and first segments', text: 'From the nearest CDN edge: the manifest, then a low-quality first segment so playback starts fast.', on: ['cdn'], dots: [{ from: 'v', to: 'cdn', label: 'master.m3u8' }, { from: 'cdn', to: 'v', label: '360p seg 1', kind: 'res' }] },
      { title: 'Adapt', text: 'Bandwidth looks good, so the player asks for 1080p segments next. On a slow train it drops to 360p instead of buffering.', on: ['v'], dots: [{ from: 'cdn', to: 'v', label: '1080p seg 2', kind: 'res' }] },
      { title: 'Cache miss', text: 'For a rarely watched video the edge misses and fetches from origin storage once; later viewers nearby get the cached copy.', on: ['cdn', 'out'], dots: [{ from: 'out', to: 'cdn', label: 'fill edge', kind: 'evt' }] }
    ]}
  ],
  deep: [
    { name: 'Adaptive bitrate streaming', text: ['Each rendition is cut into short segments with the same boundaries. The manifest lists them. The player picks the rendition for each next segment based on measured throughput and buffer level, so quality changes smoothly without stalling.'] },
    { name: 'CDN strategy', text: ['Video is the textbook CDN case. Push popular content to edges (and to boxes inside ISPs, like Netflix Open Connect); pull long-tail content on demand. Cache keys are per segment, so popular parts of a video stay hot.'] },
    { name: 'View counts', text: ['Do not write to the DB per view. Batch increments in memory or via a stream (Kafka) and flush aggregates every few seconds; counts may lag slightly.'] }
  ],
  bottlenecks: [['Egress bandwidth', 'CDN with ISP-embedded caches.'], ['Transcoding backlog', 'Chunked parallel encoding; autoscale workers; priority for popular creators.'], ['Storage growth', 'Fewer renditions for unpopular videos; cold storage for old originals.'], ['View-count writes', 'Batched counters.']],
  tradeoffs: [
    ['Delivery', 'Segmented HLS/DASH via CDN', 'Adaptive, cacheable, global', 'Few seconds of latency (not for live chat)'],
    ['Transcoding', 'Chunked + parallel', 'Fast time-to-ready', 'Orchestration complexity'],
    ['Renditions', 'Full ladder for popular, fewer for long tail', 'Storage savings', 'Some videos lack 4K'],
    ['Counts', 'Batched, eventually consistent', 'Cheap at billions of views', 'Counts lag']
  ],
  probe: [
    ['How does the player handle bandwidth changes?', ['Adaptive bitrate: segments in several qualities; the player measures throughput and buffer and chooses the next segment\'s quality.']],
    ['Why split into segments?', ['Enables adaptive switching, CDN caching per segment, seeking without downloading the whole file, and parallel encoding.']],
    ['How do you make uploads reliable?', ['Resumable multipart uploads directly to object storage with per-part retries.']],
    ['How would live streaming differ?', ['Ingest via RTMP/SRT, transcode in real time, very short segments (low-latency HLS), and the CDN serves a moving window of segments.']]
  ],
  say: ['Uploads go straight to object storage with resumable multipart uploads.', 'Videos are transcoded in parallel chunks into a bitrate ladder of 2–6 second segments.', 'Players stream segments from the CDN and switch quality per segment.', 'View counts are batched through Kafka, not written per view.'],
  numbers: [['~10 Tbit/s', 'average egress'], ['2–6 s', 'segment length'], ['~400 TB/day', 'new renditions'], ['< 2 s', 'time to first frame']],
  checklist: ['Draw upload → transcode → CDN → player.', 'Explain adaptive bitrate.', 'Explain why a CDN is mandatory here.', 'Explain parallel chunked transcoding.'],
  drills: {
    mcq: [
      { id: 'mcq-abr', title: 'Buffering on mobile', ask: 'Users on trains see constant buffering. Best fix?', options: [
        ['Adaptive bitrate: multiple renditions in short segments, player switches quality', true, 'Lower quality instead of stalling.'],
        ['Serve one 4K file', false, 'Worse on slow links.'],
        ['Make videos shorter', false, 'Product change, not a fix.'],
        ['More origin servers', false, 'The bottleneck is the user\'s link.']
      ]},
      { id: 'mcq-cdn', title: 'Bandwidth', ask: 'How do you serve ~10 Tbit/s of video?', options: [
        ['CDN edges close to users (even inside ISPs)', true, 'Spreads egress geographically and caches popular segments.'],
        ['One very large data center', false, 'Cannot push that much bandwidth to the whole world efficiently.'],
        ['P2P only', false, 'Unreliable as the main path.'],
        ['Compress with ZIP', false, 'Video is already compressed.']
      ]}
    ],
    order: [{ id: 'ord-vid', title: 'Pipeline', ask: 'Order upload to playback.', steps: ['Resumable upload to object storage', 'Upload event queues a transcode job', 'Chunks are transcoded in parallel into renditions', 'Segments and manifests are stored; status set to ready', 'Player streams segments from the CDN'], extra: ['Player downloads the original upload file'] }],
    fill: [{ id: 'fill-vid', title: 'Pitch', text: 'Videos are transcoded into a ladder of [[renditions|qualities|bitrates]] cut into short [[segments|chunks]], and players use [[adaptive bitrate|abr]] streaming from the CDN.' }],
    palette: { id: 'pal-vid', title: 'Build the board', ask: 'Pick what video streaming needs.', reqs: ['500k uploads and 1B views per day', 'Fast start, little buffering', 'Global audience'], parts: [
      ['Object storage for originals and segments', 'must', 'Cheap, durable, huge.'],
      ['Transcoding workers + job queue', 'must', 'Produce renditions in parallel.'],
      ['CDN', 'must', 'Only way to serve the bandwidth.'],
      ['Metadata DB', 'must', 'Titles, status, manifest URLs.'],
      ['Adaptive bitrate player + manifests', 'must', 'Avoid buffering.'],
      ['Batched view counters', 'good', 'Cheap counts at scale.'],
      ['Streaming video through app servers', 'no', 'Wastes app capacity; use the CDN.'],
      ['Storing videos in SQL BLOBs', 'no', 'Wrong store for huge files.']
    ]}
  }
});
})();
