from pydantic import BaseModel
from typing import List, Optional, Annotated, TypedDict
from langchain_core.messages import BaseMessage


# --- Photo Processing Models ---

class PhotoMetadata(BaseModel):
    timestamp: str
    latitude: float
    longitude: float
    exif: dict
    additional_metadata: dict

class ProcessedDay(BaseModel):
    date: str
    count: int

class Trip(BaseModel):
    start_date: str
    end_date: str
    title: str

class PhotoSummary(BaseModel):
    important_days: List[ProcessedDay]
    trips: List[Trip]


# --- Picker Models ---

class PickerOption(BaseModel):
    id: str
    label: str
    image_url: Optional[str] = None

class Picker(BaseModel):
    type: str # "text" or "image"
    options: List[PickerOption]


# --- Scope & Readiness Models ---

class TimeRange(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD

class Scope(BaseModel):
    time_range: Optional[TimeRange] = None
    trip: Optional[str] = None
    people: Optional[List[str]] = None
    themes: Optional[List[str]] = None
    product_type: Optional[str] = None

class EmbeddingReadiness(BaseModel):
    total: int
    ready: int
    in_scope: int
    in_scope_ready: int

class DataReadiness(BaseModel):
    metadata: str  # "pending" | "complete"
    clip_embeddings: EmbeddingReadiness
    face_embeddings: EmbeddingReadiness


# --- LangGraph State ---

class State(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]
    summary: Optional[PhotoSummary]
    picker: Optional[Picker]
    scope: Optional[Scope]
    data_readiness: Optional[DataReadiness]


# --- Chat API Models ---

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    summary: Optional[PhotoSummary] = None
    scope: Optional[Scope] = None
    data_readiness: Optional[DataReadiness] = None

class ChatResponse(BaseModel):
    response: str
    action: Optional[str] = None
    picker: Optional[Picker] = None
    scope: Optional[Scope] = None
