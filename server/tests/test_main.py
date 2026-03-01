import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage

@pytest.mark.asyncio
async def test_read_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Photos Products Assistant API"}

@pytest.mark.asyncio
async def test_chat_langgraph_response():
    # Mock the graph invocation
    mock_result = {"messages": [AIMessage(content="Hello! I'm your assistant. What photo products are you looking for today? Also, your greeting was very human.")]}
    
    with patch("main.chat_graph.ainvoke", return_value=mock_result):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post("/chat", json=[{"role": "user", "content": "Hello"}])
            assert response.status_code == 200
            assert "response" in response.json()
            assert "What photo products" in response.json()["response"]
