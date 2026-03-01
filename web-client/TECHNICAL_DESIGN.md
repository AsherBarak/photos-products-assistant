# Technical Design: Web Client (Dashboard)

## Responsibility
The Web client is a dashboard for visualizing and interacting with the system during development.
- Interacting with the server's chat interface.
- Visualizing and testing generated products.

## Public API / Communication
- **Endpoints:** REST/SSE/WebSockets for chat interaction and product retrieval from the FastAPI server.
- **Protocol:** REST for basic data, potentially SSE for real-time chat.

## State/Data
- **Client-side:** Local conversation history, product metadata, and cached images.

## Dependencies
- **Frontend Framework:** React (TypeScript).
- **Build Tool:** Vite.
- **Styling:** Vanilla CSS.
- **Networking:** Axios or native Fetch.
