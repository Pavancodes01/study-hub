(function(){
var up = { w: 840, h: 320, nodes: [
  { id: 'c', label: 'Mobile app', kind: 'client', x: 80, y: 160 },
  { id: 'api', label: 'API server', kind: 'service', x: 300, y: 60 },
  { id: 's3', label: 'Object storage', sub: 'S3 bucket', kind: 'blob', x: 520, y: 210, w: 150, h: 60 },
  { id: 'db', label: 'Metadata DB', sub: 'photo_id → key', kind: 'db', x: 540, y: 60, w: 140 },
  { id: 'w', label: 'Thumbnail worker', kind: 'worker', x: 760, y: 120, w: 140 },
  { id: 'cdn', label: 'CDN', kind: 'cdn', x: 300, y: 270, w: 110, h: 60 }
], edges: [['c', 'api'], ['api', 'db'], ['c', 's3', { label: 'direct upload' }], ['s3', 'w', { label: 'event' }], ['w', 's3', { bend: 30 }], ['s3', 'cdn'], ['c', 'cdn']] };

registerConcept({
  slug: 'blob-storage', order: 16, title: 'Blob (object) storage',
  one: 'Store large files (images, video, backups) in object storage like S3, keep ==only their metadata in your database==, and serve them through a CDN.',
  picture: [
    'A cloakroom: you hand over your coat and get a numbered ticket. The cloakroom is huge, cheap and never loses coats; it does not care what is inside. Your table only keeps the ticket.',
    'Object storage is that cloakroom: put a file under a key, get it back by key. Your database stores the key and details (owner, size, type). Clients should upload and download **directly** to the storage, not through your app servers.'
  ],
  use: ['user uploads: photos, video, documents', 'backups and logs', 'static website assets', 'data lake files for analytics'],
  avoid: ['small records you query by fields (use a database)', 'files that change a few bytes at a time (objects are replaced whole)'],
  flows: [
    { name: 'Upload and serve', title: 'Direct upload with a pre-signed URL', diagram: up, steps: [
      { title: 'Ask for permission to upload', text: 'The app asks the API "I want to upload a photo". The API creates a metadata row and a short-lived **pre-signed URL** that allows one PUT to one key.', on: ['c', 'api', 'db'], dots: [{ from: 'c', to: 'api', label: 'POST /photos' }, { from: 'api', to: 'db', label: 'photo 7, pending' }, { from: 'api', to: 'c', label: 'presigned URL', kind: 'res' }] },
      { title: 'Upload straight to storage', text: 'The app sends the 5 MB file directly to the bucket. Your API servers never touch the bytes, so they stay small and fast.', on: ['s3'], dots: [{ from: 'c', to: 's3', label: 'PUT 5 MB' }] },
      { title: 'Process in the background', text: 'The bucket emits an "object created" event; a worker makes thumbnails and marks the photo ready in the DB.', on: ['w'], dots: [{ from: 's3', to: 'w', label: 'created', kind: 'evt' }, { from: 'w', to: 's3', label: 'thumb_200.jpg', kind: 'evt' }] },
      { title: 'Serve via CDN', text: 'Viewers download from a CDN that caches the file near them. The bucket only serves cache misses.', on: ['cdn'], dots: [{ from: 'c', to: 'cdn', label: 'GET photo' }, { from: 's3', to: 'cdn', label: 'miss → fetch', kind: 'evt' }] }
    ]}
  ],
  how: [
    { name: 'Object storage model', text: ['Flat namespace of buckets and keys (`photos/2026/10/7.jpg`), each object immutable (replace, do not edit), with metadata headers. Extremely durable (copies across zones, erasure coding), practically unlimited, cheap per GB, but higher latency than a disk (tens of ms).'] },
    { name: 'Pre-signed URLs', text: ['The server signs a URL that allows one specific operation (PUT or GET) on one key until an expiry time. Clients use it directly; no storage credentials ever reach the client.'] },
    { name: 'Large files', text: ['**Multipart upload**: split a big file into parts (e.g. 8 MB), upload in parallel, retry only failed parts, then complete. Resumable uploads are essential on mobile networks.'] },
    { name: 'Metadata in the database', text: ['Keep `photo_id, owner_id, storage_key, size, content_type, status, created_at` in your DB. Queries like "my photos, newest first" go to the DB; only the bytes come from storage.'] },
    { name: 'Storage classes and lifecycle', text: ['Hot (standard), infrequent access, and archive (Glacier) tiers. Lifecycle rules move old objects to cheaper tiers or delete them automatically.'] }
  ],
  compare: { title: 'Where to keep files', lead: null, head: ['Option', 'Good for', 'Weak at'], rows: [
    ['Object storage (S3, GCS)', 'Uploads, media, backups at any scale', 'Small random edits; low-latency tiny reads'],
    ['Block storage (EBS)', 'Disks for databases and VMs', 'Sharing between many servers'],
    ['File storage (NFS, EFS)', 'Shared POSIX folders for legacy apps', 'Cost and scale limits'],
    ['Database BLOB column', 'Tiny files, transactional with rows', 'Bloats DB, backups, replication']
  ]},
  say: [
    'Uploads go straight to S3 with pre-signed URLs, so app servers never handle file bytes.',
    'The database only keeps metadata and the object key.',
    'An object-created event triggers a worker that makes thumbnails and transcodes.',
    'Files are served through a CDN; the bucket only sees cache misses.'
  ],
  numbers: [
    ['11 nines', 'S3 designed durability (99.999999999%)'],
    ['5 TB', 'max size of one S3 object'],
    ['~$0.02', 'per GB-month, standard tier, order of magnitude'],
    ['~20–100 ms', 'first-byte latency from object storage']
  ],
  pitfalls: [
    ['Uploading through app servers', 'Every byte passes through your API, tying up threads and bandwidth.'],
    ['Files in the database', 'Bloats backups and replication; slows the whole DB.'],
    ['Public buckets', 'Accidentally exposing private files. Keep buckets private and use signed URLs.'],
    ['No multipart for big files', 'One failure at 95% restarts a 2 GB upload.'],
    ['Local disk storage', 'Other servers cannot see it and it dies with the server.']
  ],
  seen: [
    ['Instagram, Pinterest', 'Photos in object storage, served via CDN, metadata in sharded databases.'],
    ['Dropbox', 'Splits files into blocks stored in its own object store, with metadata in databases.'],
    ['Netflix', 'Master video files in S3; encoded versions pushed to CDN boxes.'],
    ['Data lakes', 'Parquet files in S3 queried by Spark, Athena or BigQuery.']
  ],
  probe: [
    ['Why not upload through the API server?', ['Large uploads would hold connections and bandwidth on app servers for minutes. Pre-signed URLs let clients upload straight to storage, which is built for it.']],
    ['How do you secure private files?', ['Private bucket, short-lived signed GET URLs (or signed CDN cookies) generated after an authorization check.']],
    ['How do you handle 2 GB video uploads on mobile?', ['Multipart, resumable uploads: parts of ~8 MB uploaded in parallel, retried individually, completed at the end.']],
    ['How do you avoid duplicate storage of the same file?', ['Content hashing (dedup): store by hash of content; if the hash already exists, just add a metadata reference.']]
  ],
  checklist: [
    'Explain object storage vs a database for files.',
    'Draw the pre-signed URL upload flow.',
    'Explain multipart upload.',
    'Explain why to serve files through a CDN.'
  ],
  drills: {
    mcq: [
      { id: 'mcq-upload', title: 'App servers overloaded', ask: 'App servers struggle because users upload 50 MB videos through the API. Fix?', options: [
        ['Pre-signed URLs so clients upload directly to object storage', true, 'Bytes bypass the app servers entirely.'],
        ['Add more app servers', false, 'Treats the symptom at high cost.'],
        ['Store videos in the database', false, 'Moves the problem to the DB and makes it worse.'],
        ['Compress videos on the server', false, 'The server still receives the full upload.']
      ]},
      { id: 'mcq-meta', title: 'Listing photos', ask: '"Show my 20 newest photos" should come from?', options: [
        ['The metadata database, then fetch thumbnails by key from the CDN', true, 'Queries by owner and date belong in a DB.'],
        ['Listing the S3 bucket prefix on every request', false, 'Slow and not designed for app queries.'],
        ['The CDN logs', false, 'Not a data store.'],
        ['The thumbnail worker\'s memory', false, 'Not durable or queryable.']
      ]},
      { id: 'mcq-private', title: 'Private documents', ask: 'How should users download their private documents?', options: [
        ['Check access, then give a short-lived signed URL', true, 'Authorization stays on your side; bytes come from storage.'],
        ['Make the bucket public with long random names', false, 'Anyone with the link can read it forever.'],
        ['Email them the file', false, 'Not a storage design.'],
        ['Stream every byte through the API', false, 'Works but wastes app servers.']
      ]}
    ],
    order: [
      { id: 'ord-up', title: 'Upload flow', ask: 'Order the steps of a direct upload.', steps: ['Client asks the API for an upload URL', 'API stores metadata (pending) and returns a pre-signed URL', 'Client uploads the file directly to object storage', 'Storage event triggers a processing worker', 'Worker marks the file ready in the database'], extra: ['Client sends the file to the API server'] }
    ],
    fill: [
      { id: 'fill-blob', title: 'One line', text: 'Files go to [[object storage|s3|blob storage]] via [[pre-signed|presigned|signed]] URLs, the database keeps only [[metadata]], and a CDN serves reads.' }
    ]
  }
});
})();
