from typing import List, Optional
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode


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

@tool
def update_scope(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    trip: Optional[str] = None,
    people: Optional[List[str]] = None,
    themes: Optional[List[str]] = None,
    product_type: Optional[str] = None
):
    """Update the product scope based on what the user wants. Call this whenever the conversation
    narrows or changes what photos should be included in the product. Only include fields that
    have been established in the conversation. start_date and end_date must be YYYY-MM-DD format."""
    result = {}
    if start_date or end_date:
        result["time_range"] = {}
        if start_date:
            result["time_range"]["start_date"] = start_date
        if end_date:
            result["time_range"]["end_date"] = end_date
    if trip is not None:
        result["trip"] = trip
    if people is not None:
        result["people"] = people
    if themes is not None:
        result["themes"] = themes
    if product_type is not None:
        result["product_type"] = product_type
    return result


tools = [show_timeframe_picker, show_person_picker, show_custom_picker, update_scope]
tool_node = ToolNode(tools)
