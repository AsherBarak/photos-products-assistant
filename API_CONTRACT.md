# API Contract — Scope & Data Readiness

## Shared Types

### Scope
All fields optional. Starts empty, fills in as conversation narrows.

```typescript
// Client type
interface Scope {
  time_range?: { start_date: string; end_date: string }  // YYYY-MM-DD
  trip?: string                                  // trip name
  people?: string[]                              // person names
  themes?: string[]                              // e.g. "sunset", "beach"
  product_type?: string                          // e.g. "photo_album", "wall_prints"
}
```

```python
# Server Pydantic models
class TimeRange(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD

class Scope(BaseModel):
    time_range: Optional[TimeRange] = None
    trip: Optional[str] = None
    people: Optional[List[str]] = None
    themes: Optional[List[str]] = None
    product_type: Optional[str] = None
```

### DataReadiness
Sent from client to server so the LLM knows what queries are feasible.

```typescript
// Client type
interface EmbeddingReadiness {
  total: number
  ready: number
  in_scope: number
  in_scope_ready: number
}

interface DataReadiness {
  metadata: 'pending' | 'complete'
  clip_embeddings: EmbeddingReadiness
  face_embeddings: EmbeddingReadiness
}
```

```python
# Server Pydantic model
class EmbeddingReadiness(BaseModel):
    total: int
    ready: int
    in_scope: int
    in_scope_ready: int

class DataReadiness(BaseModel):
    metadata: str  # "pending" | "complete"
    clip_embeddings: EmbeddingReadiness
    face_embeddings: EmbeddingReadiness
```

## Updated Endpoints

### POST /chat

**Request (ChatRequest):**
```json
{
  "messages": [{"role": "user", "content": "..."}],
  "summary": { "important_days": [...], "trips": [...] },
  "scope": { "trip": "Greece Trip", "product_type": "photo_album" },
  "data_readiness": {
    "metadata": "complete",
    "clip_embeddings": { "total": 12000, "ready": 4500, "in_scope": 850, "in_scope_ready": 720 },
    "face_embeddings": { "total": 12000, "ready": 3200, "in_scope": 850, "in_scope_ready": 310 }
  }
}
```

**Response (ChatResponse):**
```json
{
  "response": "Great choice! Let's focus on your Greece trip...",
  "picker": { "type": "text", "options": [...] },
  "scope": { "trip": "Greece Trip", "product_type": "photo_album", "time_range": {"start_date": "2024-01-01", "end_date": "2024-01-07"} }
}
```

## LLM Scope Mechanism

The LLM updates scope via an `update_scope` tool:

```python
@tool
def update_scope(
    time_range: Optional[dict] = None,  # {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    trip: Optional[str] = None,
    people: Optional[List[str]] = None,
    themes: Optional[List[str]] = None,
    product_type: Optional[str] = None
):
    """Update the product scope based on what the user wants. Call this whenever the conversation
    narrows or changes what photos should be included in the product. Only include fields that
    have been established in the conversation."""
    return {k: v for k, v in locals().items() if v is not None}
```

- Extracted from tool output in `handle_tool_outputs` (same pattern as picker extraction)
- Stored in LangGraph state and returned in ChatResponse
- LLM receives current scope + data_readiness in system prompt context
