from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Annotated, TypedDict
import os
from dotenv import load_dotenv

# LangChain / LangGraph imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, END

load_dotenv()

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
class State(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]

# Initialize LLM
# If GOOGLE_API_KEY is not found, we'll use a placeholder for local development/tests
api_key = os.getenv("GOOGLE_API_KEY") or "mock-key-for-tests"
llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7, google_api_key=api_key)

def chatbot(state: State):
    system_msg = SystemMessage(content="""You are a Photos Products Assistant. 
Your goal is to help users decide what they want to create (e.g., photo albums, canvas prints, custom mugs).
Keep the conversation focused on their creative vision.
Also, always include a small, witty or funny remark about something the user said, but keep it professional yet charming.
Be concise but helpful.""")
    
    response = llm.invoke([system_msg] + state["messages"])
    return {"messages": [response]}

# Build the Graph
workflow = StateGraph(State)
workflow.add_node("chatbot", chatbot)
workflow.set_entry_point("chatbot")
workflow.add_edge("chatbot", END)
chat_graph = workflow.compile()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatResponse(BaseModel):
    response: str
    action: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Photos Products Assistant API"}

@app.post("/chat", response_model=ChatResponse)
async def chat(message_list: List[ChatMessage]):
    # Convert incoming messages to LangChain format
    langchain_messages = []
    for m in message_list:
        if m.role == "user":
            langchain_messages.append(HumanMessage(content=m.content))
        else:
            # We'll treat other roles as AI messages for the graph's history
            from langchain_core.messages import AIMessage
            langchain_messages.append(AIMessage(content=m.content))

    # Invoke the graph
    result = await chat_graph.ainvoke({"messages": langchain_messages})
    
    # Get the last message from the result
    last_message = result["messages"][-1]
    
    return ChatResponse(response=last_message.content)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
