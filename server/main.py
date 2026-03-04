from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Annotated, TypedDict
import os
from dotenv import load_dotenv

# LangChain / LangGraph imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode

load_dotenv()

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

# LangGraph State Definition
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

class PickerOption(BaseModel):
    id: str
    label: str
    image_url: Optional[str] = None

class Picker(BaseModel):
    type: str # "text" or "image"
    options: List[PickerOption]

class State(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]
    summary: Optional[PhotoSummary]
    picker: Optional[Picker]

# --- Tools Definition ---

@tool
def show_timeframe_picker():
    """Show a UI picker to help the user select a timeframe (Last Year, Last 3 Years, etc.) for their photo product."""
    return {
        "type": "text",
        "options": [
            {"id": "last_year", "label": "Last Year"},
            {"id": "last_3_years", "label": "Last 3 Years"},
            {"id": "way_back", "label": "Way Back"}
        ]
    }

@tool
def show_person_picker():
    """Show a UI picker with faces of people frequently appearing in the user's photos so they can identify someone."""
    return {
        "type": "image",
        "options": [
            {"id": "p1", "label": "Betty", "image_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop"},
            {"id": "p2", "label": "John", "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop"},
            {"id": "p3", "label": "Unknown", "image_url": "https://via.placeholder.com/150?text=?"}
        ]
    }

@tool
def show_custom_picker(options: List[str]):
    """Show a UI picker with custom text options provided by the assistant. Use this when you want the user to choose between specific ideas you've discussed."""
    return {
        "type": "text",
        "options": [{"id": f"opt_{i}", "label": opt} for i, opt in enumerate(options)]
    }

tools = [show_timeframe_picker, show_person_picker, show_custom_picker]
tool_node = ToolNode(tools)

# Initialize LLM
# If GOOGLE_API_KEY is not found, we'll use a placeholder for local development/tests
api_key = os.getenv("GOOGLE_API_KEY") or "mock-key-for-tests"
llm = ChatGoogleGenerativeAI(
    model="gemini-flash-latest", 
    temperature=0.7, 
    google_api_key=api_key,
    max_retries=1 # Fail fast if quota is hit
).bind_tools(tools)

def chatbot(state: State):
    summary_context = ""
    if state.get("summary"):
        summary_context = f"\n\nUser's Photo Summary: {state['summary']}"
    else:
        summary_context = "\n\nNOTE: The user's photo metadata is still being analyzed. Focus on general ideas."
    
    system_msg = SystemMessage(content=f"""You are a Photos Products Assistant for Mixtiles. 
Goal: Help users create photo products (albums, prints, etc.).
Tone: Professional, charming, and witty.
Context: {summary_context}

Guidelines:
- If you need the user to pick a time range, use 'show_timeframe_picker'.
- If you need them to identify a person, use 'show_person_picker'.
- If you want them to choose between specific ideas you just proposed, use 'show_custom_picker'.
""")
    
    response = llm.invoke([system_msg] + state["messages"])
    return {"messages": [response]}

def post_tool_routing(state: State):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

def handle_tool_outputs(state: State):
    # Extract picker info from tool messages in the state
    picker = None
    for msg in reversed(state["messages"]):
        if isinstance(msg, ToolMessage):
            import json
            try:
                # The tool output is a stringified dict
                res = json.loads(msg.content.replace("'", "\"")) 
                if isinstance(res, dict) and "options" in res:
                    picker = Picker(
                        type=res["type"],
                        options=[PickerOption(**opt) for opt in res["options"]]
                    )
                    break
            except:
                continue
    return {"picker": picker}

# Build the Graph
workflow = StateGraph(State)
workflow.add_node("chatbot", chatbot)
workflow.add_node("tools", tool_node)
workflow.add_node("process_picker", handle_tool_outputs)

workflow.set_entry_point("chatbot")
workflow.add_conditional_edges("chatbot", post_tool_routing, {"tools": "tools", END: END})
workflow.add_edge("tools", "process_picker")
workflow.add_edge("process_picker", END)

chat_graph = workflow.compile()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    summary: Optional[PhotoSummary] = None

class ChatResponse(BaseModel):
    response: str
    action: Optional[str] = None
    picker: Optional[Picker] = None

@app.get("/")
def read_root():
    return {"message": "Photos Products Assistant API"}

@app.post("/process-photos", response_model=PhotoSummary)
async def process_photos(photos: List[PhotoMetadata]):
    # Programmatic pre-processing
    from collections import Counter
    day_counts = Counter()
    for p in photos:
        date_str = p.timestamp.split("T")[0]
        day_counts[date_str] += 1
    
    important_days = [ProcessedDay(date=d, count=c) for d, c in day_counts.items()]
    important_days.sort(key=lambda x: x.date, reverse=True)

    if DEBUG_MODE:
        return PhotoSummary(
            important_days=important_days[:30],
            trips=[
                Trip(start_date="2024-01-01", end_date="2024-01-07", title="[DEBUG] Greece Trip"),
                Trip(start_date="2023-05-10", end_date="2023-05-15", title="[DEBUG] Tehran Trip")
            ]
        )
    
    prompt = f"""
    Analyze the following photo aggregation data.
    Identify significant clusters of photos that likely represent 'trips'.
    Return a JSON summary.

    Data (Date and Photo Count): {[{'date': d.date, 'count': d.count} for d in important_days[:50]]} 

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
            # We'll treat other roles as AI messages for the graph's history
            from langchain_core.messages import AIMessage
            langchain_messages.append(AIMessage(content=m.content))

    # Invoke the graph
    try:
        result = await chat_graph.ainvoke({"messages": langchain_messages, "summary": request.summary})
        
        # Get the last message and picker from the result
        last_message = result["messages"][-1]
        picker = result.get("picker")
        
        return ChatResponse(response=last_message.content, picker=picker)
    except Exception as e:
        print(f"Error in chat graph: {e}")
        return ChatResponse(
            response="I'm having a bit of trouble reaching my brain right now (LLM error). Try typing '12345' to see my debug mode!",
            action="ERROR"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
