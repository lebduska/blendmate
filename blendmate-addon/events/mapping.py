"""
Mapping from Blender handlers to normalized internal event types.

This module provides functions to convert Blender's raw handler callbacks
into normalized Blendmate events, ensuring consistent event types and
payload structures across the system.
"""

from typing import Any, Dict, Optional, Callable
from .types import EventType
from .model import Event


# Mapping of Blender handler names to normalized event types
HANDLER_TO_EVENT_TYPE = {
    "save_post": EventType.FILE_SAVED,
    "load_post": EventType.FILE_LOADED,
    "load_pre": EventType.FILE_LOADED,  # Could be FILE_LOADING if we add that
    "frame_change_post": EventType.FRAME_CHANGED,
    "frame_change_pre": EventType.FRAME_CHANGED,
    "depsgraph_update_post": EventType.DEPSGRAPH_UPDATED,
    "depsgraph_update_pre": EventType.DEPSGRAPH_UPDATED,
    "render_init": EventType.RENDER_STARTED,
    "render_complete": EventType.RENDER_COMPLETED,
    "render_cancel": EventType.RENDER_CANCELLED,
}


def map_handler_to_event(
    handler_name: str,
    payload: Optional[Dict[str, Any]] = None,
    extract_payload: Optional[Callable] = None,
) -> Event:
    """
    Map a Blender handler callback to a normalized internal event.
    
    This function provides a central place to convert Blender's handler
    callbacks into our normalized event model. It handles:
    - Mapping handler names to semantic event types
    - Ensuring consistent payload structures
    - Adding source attribution
    
    Args:
        handler_name: Name of the Blender handler (e.g., "save_post", "frame_change_post")
        payload: Optional pre-constructed payload dictionary
        extract_payload: Optional function to extract payload from handler args
        
    Returns:
        A normalized Event instance ready for transmission
        
    Example:
        >>> event = map_handler_to_event("save_post", {"filename": "/path/to/file.blend"})
        >>> event.type
        'file.saved'
        >>> event.source
        'handler'
    """
    # Get the normalized event type
    event_type = HANDLER_TO_EVENT_TYPE.get(handler_name, EventType.CONTEXT_CHANGED)
    
    # Use provided payload or extract it
    event_payload = payload or {}
    if extract_payload:
        event_payload = extract_payload()
    
    # Create and return the normalized event
    return Event.from_handler(event_type, event_payload)


def create_file_saved_event(filename: str) -> Event:
    """
    Create a file.saved event.
    
    Args:
        filename: Path to the saved file
        
    Returns:
        Event with type FILE_SAVED
    """
    return Event.from_handler(
        EventType.FILE_SAVED,
        {"filename": filename}
    )


def create_file_loaded_event(filename: str) -> Event:
    """
    Create a file.loaded event.
    
    Args:
        filename: Path to the loaded file
        
    Returns:
        Event with type FILE_LOADED
    """
    return Event.from_handler(
        EventType.FILE_LOADED,
        {"filename": filename}
    )


def create_frame_changed_event(frame: int, scene_name: Optional[str] = None) -> Event:
    """
    Create a scene.frame.changed event.
    
    Args:
        frame: Current frame number
        scene_name: Optional name of the scene
        
    Returns:
        Event with type FRAME_CHANGED
    """
    payload = {"frame": frame}
    if scene_name:
        payload["scene_name"] = scene_name
    
    return Event.from_handler(EventType.FRAME_CHANGED, payload)


def create_node_active_event(node_id: str, node_tree_type: Optional[str] = None) -> Event:
    """
    Create an editor.node.active event.
    
    Args:
        node_id: Identifier of the active node (e.g., bl_idname)
        node_tree_type: Optional type of the node tree (e.g., "GeometryNodeTree")
        
    Returns:
        Event with type NODE_ACTIVE
    """
    payload = {"node_id": node_id}
    if node_tree_type:
        payload["node_tree_type"] = node_tree_type
    
    return Event.from_handler(EventType.NODE_ACTIVE, payload)


def create_depsgraph_updated_event(
    updates: Optional[list] = None,
    scene_name: Optional[str] = None
) -> Event:
    """
    Create a scene.depsgraph.updated event.
    
    Args:
        updates: Optional list of update descriptions
        scene_name: Optional name of the scene
        
    Returns:
        Event with type DEPSGRAPH_UPDATED
    """
    payload = {}
    if updates:
        payload["updates"] = updates
    if scene_name:
        payload["scene_name"] = scene_name
    
    return Event.from_handler(EventType.DEPSGRAPH_UPDATED, payload)


# Export commonly used functions
__all__ = [
    "map_handler_to_event",
    "create_file_saved_event",
    "create_file_loaded_event",
    "create_frame_changed_event",
    "create_node_active_event",
    "create_depsgraph_updated_event",
    "HANDLER_TO_EVENT_TYPE",
]
