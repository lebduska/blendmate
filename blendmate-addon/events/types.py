"""
Stable event type names for Blendmate.

These event types form a stable contract between the Blender addon
and the Blendmate desktop app. They abstract away Blender's internal
handler names to provide a consistent, semantic naming convention.

Event naming convention:
- Use dot notation for hierarchy (e.g., "file.saved", "scene.object.transform_changed")
- Use past tense for completed actions (e.g., "saved", "loaded", "changed")
- Use present tense for state queries (e.g., "active", "playing")
- The actual event value uses a semantic, readable format (e.g., "editor.node.active" means a node is currently active)
"""


class EventType:
    """
    Stable event type constants for Blendmate internal events.
    
    These are the normalized event names that should be used throughout
    the Blendmate system. They provide a stable interface that won't
    change even if Blender's internal handler names change.
    """
    
    # File operations
    FILE_SAVED = "file.saved"
    FILE_LOADED = "file.loaded"
    FILE_NEW = "file.new"
    
    # Scene and frame events
    FRAME_CHANGED = "scene.frame.changed"
    DEPSGRAPH_UPDATED = "scene.depsgraph.updated"
    
    # Object and data events
    OBJECT_ADDED = "scene.object.added"
    OBJECT_REMOVED = "scene.object.removed"
    OBJECT_TRANSFORM_CHANGED = "scene.object.transform.changed"
    
    # Node editor events
    NODE_ACTIVE = "editor.node.active"
    NODE_CHANGED = "editor.node.changed"
    
    # Render events
    RENDER_STARTED = "render.started"
    RENDER_COMPLETED = "render.completed"
    RENDER_CANCELLED = "render.cancelled"
    
    # Animation events
    ANIMATION_PLAYING = "animation.playing"
    ANIMATION_STOPPED = "animation.stopped"
    
    # Context change (generic for when context changes but we don't have specific details)
    CONTEXT_CHANGED = "context.changed"


# Reverse mapping for documentation and debugging
EVENT_TYPE_DESCRIPTIONS = {
    EventType.FILE_SAVED: "Triggered after a .blend file is saved",
    EventType.FILE_LOADED: "Triggered after a .blend file is loaded",
    EventType.FILE_NEW: "Triggered when a new file is created",
    EventType.FRAME_CHANGED: "Triggered when the current frame changes",
    EventType.DEPSGRAPH_UPDATED: "Triggered when the dependency graph updates",
    EventType.OBJECT_ADDED: "Triggered when an object is added to the scene",
    EventType.OBJECT_REMOVED: "Triggered when an object is removed from the scene",
    EventType.OBJECT_TRANSFORM_CHANGED: "Triggered when an object's transform changes",
    EventType.NODE_ACTIVE: "Triggered when a node becomes active in the node editor",
    EventType.NODE_CHANGED: "Triggered when a node's properties change",
    EventType.RENDER_STARTED: "Triggered when rendering starts",
    EventType.RENDER_COMPLETED: "Triggered when rendering completes successfully",
    EventType.RENDER_CANCELLED: "Triggered when rendering is cancelled",
    EventType.ANIMATION_PLAYING: "Triggered when animation playback starts",
    EventType.ANIMATION_STOPPED: "Triggered when animation playback stops",
    EventType.CONTEXT_CHANGED: "Triggered when the general context changes",
}
