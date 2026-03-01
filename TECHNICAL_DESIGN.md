# Technical Design: Photos Products Assistant (Root)

## Responsibility
This project is an assistant that enables users to create products (photo albums, photo walls, and videos) from their iPhone photo gallery through a conversational interface.

## Project Structure
- **/server:** Backend for conversation processing (LLM-based), product generation logic, and asset management.
- **/swift-client:** iOS application for user interaction, gallery access, and product visualization.
- **/web-client:** Web interface for interacting with the system during development.

## Public API / Communication
- **Client (Swift/Web):** Communication via [TBD: REST/WebSocket] to the server.
- **Server (Python):** Exposes an API for conversation management and product generation.

## State/Data
- **Client-side:** User's local photo metadata, current conversation state, and cached generated assets.
- **Server-side:** Conversation history, user preferences, and temporary storage for generated product metadata/assets.

## Dependencies
- **Swift (Client):** iOS SDK.
- **Python (Server):** LLM integration (e.g., OpenAI), [TBD: FastAPI/Flask, Image/Video processing libraries].
- **Web (Client):** [TBD: React/TypeScript/Angular].
