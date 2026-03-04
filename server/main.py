from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import logging
from collections import Counter

from models import (
    PhotoMetadata, ProcessedDay, PhotoSummary,
    Picker, PickerOption,
    Scope,
    ChatRequest, ChatResponse,
)
from graph import chat_graph, llm

from langchain_core.messages import HumanMessage, AIMessage

LOG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server.log")
logging.basicConfig(filename=LOG_PATH, level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("chat")

DEBUG_MODE = os.getenv("DEBUG_MODE", "true").lower() == "true"

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Photos Products Assistant API"}

@app.post("/process-photos", response_model=PhotoSummary)
async def process_photos(photos: List[PhotoMetadata]):
    # Programmatic pre-processing
    day_data: dict[str, dict] = {}
    for p in photos:
        date_str = p.timestamp.split("T")[0]
        if date_str not in day_data:
            day_data[date_str] = {"count": 0, "lat": None, "lng": None}
        day_data[date_str]["count"] += 1
        if day_data[date_str]["lat"] is None and p.latitude and p.longitude:
            day_data[date_str]["lat"] = p.latitude
            day_data[date_str]["lng"] = p.longitude

    important_days = [ProcessedDay(date=d, count=v["count"]) for d, v in day_data.items()]
    important_days.sort(key=lambda x: x.date, reverse=True)

    day_summaries = [
        {"date": d, "count": v["count"], "lat": v["lat"], "lng": v["lng"]}
        for d, v in sorted(day_data.items(), reverse=True)
    ][:50]

    prompt = f"""
    Analyze the following photo aggregation data.
    Identify significant clusters of photos that likely represent 'trips'.
    Use the GPS coordinates to determine location names for trip titles.
    Return a JSON summary.

    Data (Date, Photo Count, Sample GPS): {day_summaries}

    Output Format (JSON):
    {{
        "trips": [ {{"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "title": "Trip Title"}}, ... ]
    }}
    """

    try:
        response = await llm.ainvoke(prompt)
        content = response.content

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        import json
        data = json.loads(content.strip())

        return PhotoSummary(
            important_days=important_days[:30],
            trips=data.get("trips", [])
        )
    except Exception as e:
        print(f"Error calling LLM for trips: {e}")
        return PhotoSummary(important_days=important_days[:30], trips=[])

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Debug bypass for LLM availability issues
    if DEBUG_MODE and request.messages and request.messages[-1].content == "12345":
        print("[DEBUG] Bypass triggered by '12345'")
        return ChatResponse(
            response="[DEBUG] You've activated the debug picker! Select a timeframe:",
            picker=Picker(
                type="text",
                options=[
                    PickerOption(id="debug_1", label="Last 6 Months"),
                    PickerOption(id="debug_2", label="Last Year"),
                    PickerOption(id="debug_3", label="The Beginning of Time")
                ]
            )
        )

    # Convert incoming messages to LangChain format
    langchain_messages = []
    for m in request.messages:
        if m.role == "user":
            langchain_messages.append(HumanMessage(content=m.content))
        else:
            langchain_messages.append(AIMessage(content=m.content))

    # Invoke the graph
    log.info(f"User: {request.messages[-1].content}")
    try:
        result = await chat_graph.ainvoke({
            "messages": langchain_messages,
            "summary": request.summary,
            "scope": request.scope,
            "data_readiness": request.data_readiness,
        })

        # Get the last message, picker, and scope from the result
        picker = result.get("picker")
        scope = result.get("scope")

        # Find the last AI message with text content (only from new messages)
        new_messages = result["messages"][len(langchain_messages):]
        response_text = ""
        for msg in reversed(new_messages):
            if not isinstance(msg, AIMessage):
                continue
            # content can be a string or a list of blocks
            if isinstance(msg.content, str) and msg.content:
                response_text = msg.content
                break
            if isinstance(msg.content, list):
                for block in msg.content:
                    if isinstance(block, dict) and block.get("type") == "text" and block.get("text"):
                        response_text = block["text"]
                        break
                if response_text:
                    break

        response = ChatResponse(response=response_text, picker=picker, scope=scope)
        log.info(f"Assistant: {response.response}")
        if response.picker:
            log.info(f"Picker: {[o.label for o in response.picker.options]}")
        return response
    except Exception as e:
        log.error(f"Error: {e}")
        return ChatResponse(
            response="I'm having a bit of trouble reaching my brain right now (LLM error). Try typing '12345' to see my debug mode!",
            action="ERROR"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
