# Mixtiles Assistant - Technical Design

## Architecture Overview
The system follows a Client-Server architecture:
- **Server:** FastAPI (Python) using LangGraph for conversation management and Claude (Anthropic) for LLM reasoning.
- **Client:** React (TypeScript) for the web prototype, simulating background photo metadata collection.

## API Contracts

### 1. Photo Processing
`POST /process-photos`
- **Request:** List of raw `PhotoMetadata` (Timestamp, Geolocation, EXIF).
- **Response:** `PhotoSummary` containing identified `trips` and `important_days`.
- **Note:** Server pre-aggregates data to minimize token costs and avoid LLM quota limits.

### 2. Chat
`POST /chat`
- **Request:**
    - `messages`: List of previous chat messages.
    - `summary`: Optional `PhotoSummary` (provided once background processing is complete).
- **Response:**
    - `response`: Text message for the user.
    - `picker`: Optional UI instruction to show a selection interface.
        - `type`: "text" or "image".
        - `options`: List of `{id, label, image_url}`.

## State Management
- **Server:** Stateless endpoints. LangGraph maintains state within the request chain. History is currently passed from the client in each request.
- **Client:** React `useState` for chat history, `summary` object, and picker visibility.

## UI/UX Components (Web)
- **Background Worker:** A simulated `useEffect` that waits 5s, generates 2500 mock photos, and calls `/process-photos`.
- **Chat Interface:** Mixtiles-branded (Pink #FF3B6B, Manrope font).
- **Picker Component:** Animated container that slides up above the input field when `picker` is present in the server response.

## Development Standards
- **TDD:** 
    - Server: `pytest` with `httpx` and `unittest.mock`.
    - Client: `vitest` with `React Testing Library`.
- **Environment:** Secrets managed via `.env` (ignored by git).
