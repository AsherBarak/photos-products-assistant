import pytest
import json
from httpx import AsyncClient, ASGITransport
from main import app, embedding_store
from models import Scope
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage, HumanMessage

@pytest.mark.asyncio
async def test_process_photos():
    mock_json = {
        "important_days": [{"date": "2024-03-01", "count": 2}],
        "trips": [{"start_date": "2024-02-15", "end_date": "2024-02-15", "title": "London Trip"}]
    }

    with patch("main.DEBUG_MODE", False):
        with patch("langchain_anthropic.chat_models.ChatAnthropic.ainvoke", return_value=AIMessage(content=f"```json\n{json.dumps(mock_json)}\n```")):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                payload = [
                    {
                        "timestamp": "2024-03-01T12:00:00",
                        "latitude": 32.0853,
                        "longitude": 34.7818,
                        "exif": {},
                        "additional_metadata": {}
                    }
                ]
                response = await ac.post("/process-photos", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert "important_days" in data
                assert len(data["trips"]) == 1
                assert data["trips"][0]["title"] == "London Trip"

@pytest.mark.asyncio
async def test_chat_debug_bypass():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "messages": [{"role": "user", "content": "12345"}],
            "summary": None
        }
        response = await ac.post("/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "[DEBUG]" in data["response"]
        assert data["picker"] is not None
        assert data["picker"]["options"][0]["label"] == "Last 6 Months"

@pytest.mark.asyncio
async def test_chat_langgraph_response():
    # Mock the graph invocation to return a result with a picker and scope
    # The mock must include the input message + new messages (simulating LangGraph behavior)
    mock_result = {
        "messages": [
            HumanMessage(content="I want an album"),
            AIMessage(content="I see your photos! Which timeframe should we use?"),
        ],
        "picker": {
            "type": "text",
            "options": [{"id": "t1", "label": "Last Year"}]
        },
        "scope": Scope(product_type="photo_album")
    }

    with patch("main.chat_graph.ainvoke", return_value=mock_result):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "messages": [{"role": "user", "content": "I want an album"}],
                "summary": {
                    "important_days": [],
                    "trips": []
                }
            }
            response = await ac.post("/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "timeframe" in data["response"]
            assert data["picker"]["type"] == "text"
            assert data["picker"]["options"][0]["label"] == "Last Year"
            assert data["scope"]["product_type"] == "photo_album"

@pytest.mark.asyncio
async def test_chat_returns_scope():
    """Verify scope is returned in the response when the LLM updates it."""
    mock_scope = Scope(
        trip="Greece Trip",
        product_type="photo_album",
        time_range={"start_date": "2024-01-01", "end_date": "2024-01-07"}
    )
    mock_result = {
        "messages": [
            HumanMessage(content="I want photos from my Greece trip"),
            AIMessage(content="Let's focus on your Greece trip album!"),
        ],
        "picker": None,
        "scope": mock_scope
    }

    with patch("main.chat_graph.ainvoke", return_value=mock_result):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "messages": [{"role": "user", "content": "I want photos from my Greece trip"}],
                "summary": {
                    "important_days": [],
                    "trips": [{"start_date": "2024-01-01", "end_date": "2024-01-07", "title": "Greece Trip"}]
                },
                "scope": {"product_type": "photo_album"},
                "data_readiness": {
                    "metadata": "complete",
                    "clip_embeddings": {"total": 12000, "ready": 4500, "in_scope": 850, "in_scope_ready": 720},
                    "face_embeddings": {"total": 12000, "ready": 3200, "in_scope": 850, "in_scope_ready": 310}
                }
            }
            response = await ac.post("/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["scope"] is not None
            assert data["scope"]["trip"] == "Greece Trip"
            assert data["scope"]["product_type"] == "photo_album"
            assert data["scope"]["time_range"]["start_date"] == "2024-01-01"
            assert data["scope"]["time_range"]["end_date"] == "2024-01-07"

@pytest.mark.asyncio
async def test_upload_embeddings_stores_and_returns_count():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "embeddings": [
                {"photo_id": "p1", "clip_embedding": [0.1, 0.2], "face_embedding": [0.3], "faces_detected": 1},
                {"photo_id": "p2", "clip_embedding": [0.4, 0.5], "face_embedding": [0.6], "faces_detected": 0},
            ]
        }
        response = await ac.post(
            "/upload-embeddings",
            json=payload,
            headers={"X-Client-Id": "test-client-1"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["received"] == 2
        assert data["total_stored"] == 2

@pytest.mark.asyncio
async def test_upload_embeddings_accumulates_batches():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        batch1 = {
            "embeddings": [
                {"photo_id": "p1", "clip_embedding": [0.1], "face_embedding": [0.2], "faces_detected": 1},
            ]
        }
        batch2 = {
            "embeddings": [
                {"photo_id": "p2", "clip_embedding": [0.3], "face_embedding": [0.4], "faces_detected": 0},
                {"photo_id": "p3", "clip_embedding": [0.5], "face_embedding": [0.6], "faces_detected": 2},
            ]
        }
        headers = {"X-Client-Id": "test-client-2"}
        await ac.post("/upload-embeddings", json=batch1, headers=headers)
        response = await ac.post("/upload-embeddings", json=batch2, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["received"] == 2
        assert data["total_stored"] == 3

@pytest.mark.asyncio
async def test_upload_embeddings_missing_client_id_returns_422():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "embeddings": [
                {"photo_id": "p1", "clip_embedding": [0.1], "face_embedding": [0.2], "faces_detected": 0},
            ]
        }
        response = await ac.post("/upload-embeddings", json=payload)
        assert response.status_code == 422

@pytest.mark.asyncio
async def test_chat_without_scope_backward_compatible():
    """Verify the API works when scope and data_readiness are not provided (backward compatible)."""
    mock_result = {
        "messages": [
            HumanMessage(content="Hello"),
            AIMessage(content="Welcome! What kind of photo product would you like?"),
        ],
        "picker": None,
        "scope": None
    }

    with patch("main.chat_graph.ainvoke", return_value=mock_result):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "messages": [{"role": "user", "content": "Hello"}],
            }
            response = await ac.post("/chat", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["response"] == "Welcome! What kind of photo product would you like?"
            assert data["scope"] is None
            assert data["picker"] is None
