# Technical Design: Server (Python)

## Responsibility
The server manages the conversation lifecycle using a state machine (LangGraph) to guide the user from initial intent to a finalized photo product.

## Interaction Stages (LangGraph Nodes)
1.  **Clarification Node**: The entry point. The LLM asks questions to identify:
    - **Product Type**: Album, Photo Wall, or Video.
    - **Scope**: Event (e.g., Wedding), Person, or Time Period (e.g., Summer 2025).
2.  **Scope Validation Node**: Checks if the identified scope is specific enough to proceed. If not, it loops back to Clarification.
3.  **Product Generation Node**: Once scope is locked, the LLM generates a structured "Product Specification" (JSON).
4.  **Interactive Editing Node**: The user reviews the product and requests changes (e.g., "Remove the blurry photos," "Make the video faster").

## Public API / Communication
- `POST /chat`: Receives user messages and returns the assistant's response. 
  - **Input**: `{ message: string, thread_id: string }`
  - **Output**: `{ response: string, state: "clarifying" | "generating" | "editing", product_spec?: JSON }`
- `GET /product/{product_id}`: Retrieves the full metadata for a generated product.
- `POST /photos/metadata`: Endpoint for the client to sync local photo metadata (dates, locations, faces) so the LLM can "see" what's available.

## State/Data
- **Persistence**: LangGraph `Checkpointer` (e.g., SQLite or Postgres) to maintain conversation state across sessions using `thread_id`.
- **Photo Index**: A temporary, per-session index of the user's photo metadata to allow the LLM to perform "searches" (e.g., "Find all photos from Italy").

## Dependencies
- **Logic**: LangChain, LangGraph.
- **AI**: OpenAI (GPT-4o) or Gemini.
- **Server**: FastAPI, Uvicorn.
