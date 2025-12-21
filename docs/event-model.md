# Blendmate Event Model

## Overview

The Blendmate event model provides a normalized, stable interface for handling events from Blender. It abstracts away the differences between Blender's various event sources (handlers, msgbus, timers) into a single, consistent format.

## Architecture

The event model is organized into three main modules:

### 1. `events/types.py` - Event Type Constants

Defines stable, semantic event type names using dot notation:

```python
from events.types import EventType

EventType.FILE_SAVED           # "file.saved"
EventType.FILE_LOADED          # "file.loaded"
EventType.FRAME_CHANGED        # "scene.frame.changed"
EventType.NODE_ACTIVE          # "editor.node.active"
EventType.DEPSGRAPH_UPDATED    # "scene.depsgraph.updated"
```

**Naming Convention:**
- Use dot notation for hierarchy (e.g., `file.saved`, `scene.object.transform_changed`)
- Use past tense for completed actions (e.g., `saved`, `loaded`, `changed`)
- Use present tense for ongoing state (e.g., `frame_current`, `node_active`)

### 2. `events/model.py` - Event Dataclass

Defines the `Event` dataclass that represents all events in the system:

```python
@dataclass
class Event:
    type: str                           # Semantic event type
    payload: Dict[str, Any]            # Event-specific data
    ts: float                          # Unix timestamp
    source: Optional[str]              # "handler", "msgbus", or "timer"
```

**Key Methods:**
- `to_dict()` - Convert to dictionary
- `to_json_compatible()` - Convert to JSON-safe format for WebSocket transmission
- `from_handler()` - Create event from handler with source="handler"
- `from_msgbus()` - Create event from msgbus with source="msgbus"
- `from_timer()` - Create event from timer with source="timer"

### 3. `events/mapping.py` - Handler Mapping

Provides functions to convert Blender handlers to normalized events:

```python
from events.mapping import (
    create_file_saved_event,
    create_file_loaded_event,
    create_frame_changed_event,
    create_node_active_event,
)

# Create normalized events
event = create_file_saved_event("/path/to/file.blend")
event = create_frame_changed_event(42, "Scene")
event = create_node_active_event("GeometryNodeMeshCube", "GeometryNodeTree")
```

## Usage in Handlers

Update your handler code to use the normalized event model:

**Before:**
```python
@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    connection.send_to_blendmate({
        "type": "event",
        "event": "save_post",
        "filename": bpy.data.filepath
    })
```

**After:**
```python
from .events.mapping import create_file_saved_event

@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    event = create_file_saved_event(bpy.data.filepath)
    connection.send_to_blendmate(event.to_json_compatible())
```

## Benefits

1. **Stable Contract** - Event type names won't change even if Blender's internal names change
2. **Consistent Structure** - All events have the same format (type, payload, ts, source)
3. **Easy Extension** - Add new event types without touching transport code
4. **Type Safety** - Event types are defined as constants, reducing typos
5. **Documentation** - Each event type has a description in `EVENT_TYPE_DESCRIPTIONS`

## JSON Output Format

Events are serialized to JSON with this structure:

```json
{
  "type": "file.saved",
  "payload": {
    "filename": "/path/to/file.blend"
  },
  "ts": 1703174400.123,
  "source": "handler"
}
```

## Adding New Event Types

1. Add the constant to `EventType` class in `events/types.py`
2. Add a description to `EVENT_TYPE_DESCRIPTIONS`
3. Add mapping in `HANDLER_TO_EVENT_TYPE` if it's a Blender handler
4. Optionally create a helper function in `events/mapping.py`
5. Update handler code to use the new event type

## Testing

Comprehensive unit tests are in `tests/addon/test_events.py`:

```bash
python -m unittest tests.addon.test_events
```

Tests cover:
- Event creation and serialization
- Event type constants and naming
- Handler-to-event mapping
- JSON compatibility
- Factory methods (from_handler, from_msgbus, from_timer)
