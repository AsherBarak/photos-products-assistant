# Technical Design: Swift Client (iOS)

## Responsibility
The Swift client is the main iOS application for user interaction, gallery access, and product visualization.
- Engaging in a chat with the assistant.
- Accessing the user's photo gallery for metadata.
- Displaying and interacting with the generated products.

## Public API / Communication
- **Endpoints:** [TBD: FastAPI/Flask routes] for chat interaction, product retrieval, and photo metadata processing.
- **Protocol:** [TBD: REST/WebSocket] to the server.

## State/Data
- **Client-side:** User's local photo metadata, current conversation state, and cached generated assets.

## Dependencies
- **Swift:** iOS SDK.
- **Networking:** [TBD: URLSession/Alamofire].
