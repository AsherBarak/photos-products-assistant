# Mixtiles Photos Products Assistant

## Project
Conversational AI assistant helping users turn photo memories into physical products (albums, canvas, mugs) via chat + picker UI.

## Stack
- **Frontend:** React 19 + TypeScript + Vite → `web-client/` (port 5173)
- **Backend:** FastAPI + LangGraph + Anthropic Claude Sonnet → `server/` (port 8000)
- **Brand:** Mixtiles Pink `#FF3B6B`, Manrope font, lowercase branding

## Commands
- **Server:** `cd server && python main.py` (or `uvicorn main:app --reload`)
- **Server tests:** `cd server && pytest tests/`
- **Client:** `cd web-client && npm run dev`
- **Client tests:** `cd web-client && npm test`
- **Client build:** `cd web-client && npm run build`
- **Client lint:** `cd web-client && npm run lint`

## Architecture
- `POST /process-photos` — Analyzes photo metadata → important days + trips
- `POST /chat` — LangGraph conversation with picker tools (timeframe/person/custom)
- Server is stateless; chat history passed from client each request
- `DEBUG_MODE` env var; "12345" input triggers debug picker

## Conventions
- Pydantic models for all API types
- TDD: write/update tests alongside features
- CSS variables for theming (no CSS framework)
- Keep App.tsx as single component unless complexity warrants splitting
- Design docs: `PRODUCT_DESIGN.md`, `TECHNICAL_DESIGN.md`
