# Photos Data & Metadata Design

## Source: User's Phone (iPhone)

### What we collect from the gallery
- **Thumbnails** — low-res versions of all photos (stay on device, used for on-device processing and display)
- **Standard metadata** — location (lat/lon), timestamp, EXIF data

### On-device processing (runs on the phone)
- **Face detection & embeddings** — identifies faces in photos, generates vector embeddings for each face
- **CLIP embeddings** — generates semantic embeddings per photo (enables search by concept, quality ranking, similarity)

### Upload to server
Metadata and embeddings only — no images. These arrive in two phases:

**Phase 1 — Metadata (immediate, ~5s)**
- Photo metadata (location, time, EXIF)
- Available on server almost instantly
- Enough to identify important days, home location, and trips

**Phase 2 — Embeddings (delayed)**
- Face embeddings + CLIP embeddings
- On-device processing: 100–350 images/sec
- Embeddings are cached on-device — only new photos need processing on subsequent runs
- Upload is sizeable — network transfer adds further delay
- Available on server later (minutes, depending on library size)

### Full-res upload (later)
Full-resolution photos are uploaded **only** when the product is finalized and ready to print. Not before.

### Server-side processing
With the uploaded data, the server can:
#### Using metadata ####
- **Identify important days** — dates with high photo activity
- **Detect home location** — most frequent location cluster
- **Identify trips** — clusters of photos away from home over consecutive days\
#### Ung embeddings ####
- **Select best photos** — using CLIP embeddings for quality/relevance ranking
- **Group by people** — using face embeddings to cluster and identify individuals
- **Create products** — curate photo selections for albums, prints, etc.
