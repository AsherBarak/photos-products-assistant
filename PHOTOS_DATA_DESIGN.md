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
#### Using embeddings ####
- **Select best photos** — using CLIP embeddings for quality/relevance ranking
- **Group by people** — using face embeddings to cluster and identify individuals
- **Create products** — curate photo selections for albums, prints, etc.

---

## Conversation Stages & Data Availability

The conversation flows continuously across three stages. Transitions are driven by data availability, not user actions. The experience should feel seamless — the user should not be aware of the staging.

### Stage 1 — Cold Start (no data)
- Conversation begins immediately
- LLM has no user data yet
- Client collects metadata and calls `POST /process-photos`
- Server returns trips (with names) and important days
- **Duration:** ~5 seconds

### Stage 2 — Metadata Available, Embeddings Streaming
- Trips and important days are available to the LLM (currently sent with each `ChatRequest`, could be cached server-side later)
- Conversation can explore: timeframes, trips, product types, general scoping
- Meanwhile on the phone: embeddings are being computed and streamed to the server
- **Data is partial and gradually building up**

#### Priority-based embedding
- As conversation narrows scope (e.g., user picks "Last Year"), the client should **prioritize embedding and uploading embeddings for photos matching the current scope**
- Scope can change as the dialog progresses — priorities should adapt dynamically

#### Partial capability
Some queries can only be partially answered during this stage:
- "Show me sunset photos" — requires CLIP embeddings (may not be ready for all photos)
- "Photos of Betty" — requires face embeddings for all photos to reliably cluster
- The system should handle partial results gracefully, e.g., "I'm still processing some of your photos, but here's what I have so far..."

### Stage 3 — Full Embeddings Available
- All face + CLIP embeddings are on the server
- Full filtering, ranking, and selection is possible
- Server can produce the final curated list of photos for the product
- Full-res photos are uploaded only at this point, when the product is finalized

---

## Scope — The Shared State Object

Scope captures what the user wants for their product. It serves two purposes simultaneously:
1. **Server/LLM** — filter criteria for selecting photos
2. **Client** — embedding & upload priority (embed what's in scope first)

Scope is updated by the LLM as the conversation progresses and travels back and forth with each request/response.

### Structure

```json
{
  "scope": {
    "time_range": { "start": "2024-01-01", "end": "2024-01-07" },
    "trip": "Greece Trip",
    "people": ["Betty"],
    "themes": ["sunset", "beach"],
    "product_type": "photo_album"
  }
}
```

All fields are optional — scope starts empty and fills in as the conversation narrows.

### Flow

```
Client                          Server (LLM)
  |                                |
  |-- ChatRequest { messages,      |
  |     summary, scope,            |
  |     data_readiness }           |
  |------------------------------->|
  |                                |  LLM sees current scope +
  |                                |  what data is available
  |                                |
  |   ChatResponse { response,     |
  |     picker, scope }  ----------|
  |<-------------------------------|
  |                                |
  |  Client reads updated scope:   |
  |  - Prioritizes embedding       |
  |    photos matching scope       |
  |  - Continues uploading         |
  |    embeddings to server        |
  |                                |
```

- **LLM updates scope** as part of the chat response (same channel, no extra infra)
- **Client sends scope back** on the next request so LLM has continuity
- **Client also sends `data_readiness`** so the LLM knows what queries are possible

### data_readiness (client → server)

```json
{
  "data_readiness": {
    "metadata": "complete",
    "clip_embeddings": { "total": 12000, "ready": 4500, "in_scope": 850, "in_scope_ready": 720 },
    "face_embeddings": { "total": 12000, "ready": 3200, "in_scope": 850, "in_scope_ready": 310 }
  }
}
```

This lets the LLM make informed decisions:
- "I have 85% of in-scope CLIP embeddings, I can suggest sunset photos"
- "Face embeddings are only 36% in-scope, I should tell the user I'm still identifying people"

### Remaining design questions
1. **Server-side embedding storage** — as embeddings stream in, where do they accumulate? (in-memory, Redis, vector DB)
2. **Session continuity** — if the user leaves and returns, device cache means fast restart. What about server-side state?
3. **Scope conflicts** — user changes direction mid-conversation (e.g., switches from Greece to Tehran). Client needs to re-prioritize. Is the latest scope always the full truth, or do we need a history?
