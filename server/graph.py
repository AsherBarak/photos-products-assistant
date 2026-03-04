import json
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END

from models import State, Picker, PickerOption, Scope
from tools import tools, tool_node

load_dotenv()

# Initialize LLM
llm = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    temperature=0.7,
    max_retries=1,
).bind_tools(tools)


def chatbot(state: State):
    summary_context = ""
    if state.get("summary"):
        summary_context = f"\n\nUser's Photo Summary: {state['summary']}"
    else:
        summary_context = "\n\nNOTE: The user's photo metadata is still being analyzed. Focus on general ideas."

    scope_context = ""
    if state.get("scope"):
        scope_context = f"\n\nCurrent Scope (what's been established so far): {state['scope'].model_dump_json()}"

    data_readiness_context = ""
    if state.get("data_readiness"):
        dr = state["data_readiness"]
        data_readiness_context = f"\n\nData Readiness (what data is available on the server):\n- Metadata: {dr.metadata}\n- CLIP embeddings: {dr.clip_embeddings.in_scope_ready}/{dr.clip_embeddings.in_scope} in-scope ready ({dr.clip_embeddings.ready}/{dr.clip_embeddings.total} total)\n- Face embeddings: {dr.face_embeddings.in_scope_ready}/{dr.face_embeddings.in_scope} in-scope ready ({dr.face_embeddings.ready}/{dr.face_embeddings.total} total)"

    system_msg = SystemMessage(content=f"""You are a Photos Products Assistant for Mixtiles.
Goal: Help users create photo products (albums, prints, etc.).
Tone: Professional, charming, and witty.
Context: {summary_context}{scope_context}{data_readiness_context}

Guidelines:
- ALWAYS use a picker tool when presenting options. NEVER list options as bullet points or numbered lists in your text.
- If you need the user to pick a time range, use 'show_timeframe_picker'.
- If you need them to identify a person, use 'show_person_picker'.
- For ANY other choice (product types, ideas, next steps), use 'show_custom_picker' with 2-4 options. Labels must be 1-3 words max.
- Keep your text message brief (1-2 sentences) — let the picker do the work.
- ALWAYS call 'update_scope' whenever the conversation establishes or changes scope — including time range, trip, people, themes, or product type. Call it alongside any picker tool if the user's choice narrows scope.
- If data_readiness shows embeddings are still processing, let the user know gracefully when relevant (e.g. "I'm still identifying people in your photos").
""")

    response = llm.invoke([system_msg] + state["messages"])
    return {"messages": [response]}


def post_tool_routing(state: State):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END


def handle_tool_outputs(state: State):
    # Extract picker and scope info from tool messages in the state
    picker = None
    scope = state.get("scope")
    for msg in reversed(state["messages"]):
        if isinstance(msg, ToolMessage):
            try:
                # The tool output is a stringified dict
                res = json.loads(msg.content.replace("'", "\""))
                if isinstance(res, dict):
                    if "options" in res:
                        # This is a picker tool output
                        picker = Picker(
                            type=res["type"],
                            options=[PickerOption(**opt) for opt in res["options"]]
                        )
                    elif msg.name == "update_scope":
                        # This is a scope update — merge with existing scope
                        existing = scope.model_dump() if scope else {}
                        existing.update(res)
                        scope = Scope(**existing)
            except:
                continue
    return {"picker": picker, "scope": scope}


# Build the Graph
workflow = StateGraph(State)
workflow.add_node("chatbot", chatbot)
workflow.add_node("tools", tool_node)
workflow.add_node("process_picker", handle_tool_outputs)

workflow.set_entry_point("chatbot")
workflow.add_conditional_edges("chatbot", post_tool_routing, {"tools": "tools", END: END})
workflow.add_edge("tools", "process_picker")
workflow.add_edge("process_picker", "chatbot")

chat_graph = workflow.compile()
