# Event Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BLENDER ADDON                                 │
└─────────────────────────────────────────────────────────────────────┘

  Blender Handler                Event Model                 Transport
  ───────────────               ────────────               ───────────

  ┌──────────┐                 ┌─────────────┐           ┌──────────┐
  │ save_post│─────────────────>│   Mapping   │           │          │
  └──────────┘                 │  Functions  │           │          │
                               └─────────────┘           │          │
                                      │                  │          │
  ┌──────────┐                       │                  │          │
  │ load_post│───────────────────────┤                  │          │
  └──────────┘                       │                  │          │
                                     ▼                  │ WebSocket│
  ┌──────────┐                 ┌─────────────┐          │          │
  │frame_chng│────────────────>│    Event    │─────────>│   Send   │
  └──────────┘                 │  Dataclass  │          │          │
                               └─────────────┘          │          │
  ┌──────────┐                       ▲                  │          │
  │depsgraph │───────────────────────┤                  │          │
  └──────────┘                       │                  │          │
                                     │                  │          │
  ┌──────────┐                 ┌─────────────┐          │          │
  │   ...    │────────────────>│Event Types  │          │          │
  └──────────┘                 │  Constants  │          │          │
                               └─────────────┘          └──────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       EVENT STRUCTURE                                │
└─────────────────────────────────────────────────────────────────────┘

{
  "type": "file.saved",              ← Stable semantic name
  "payload": {                       ← Event-specific data
    "filename": "/path/to/file.blend"
  },
  "ts": 1766341986.370,              ← Unix timestamp
  "source": "handler"                ← Event source (handler/msgbus/timer)
}

┌─────────────────────────────────────────────────────────────────────┐
│                      HANDLER → EVENT MAPPING                         │
└─────────────────────────────────────────────────────────────────────┘

Blender Handler          →    Normalized Event Type
─────────────────────────     ──────────────────────────
save_post                →    file.saved
load_post                →    file.loaded
frame_change_post        →    scene.frame.changed
depsgraph_update_post    →    scene.depsgraph.updated
render_init              →    render.started
render_complete          →    render.completed
render_cancel            →    render.cancelled

┌─────────────────────────────────────────────────────────────────────┐
│                           BENEFITS                                   │
└─────────────────────────────────────────────────────────────────────┘

1. STABLE CONTRACT
   - Event names won't change if Blender internals change
   - Desktop app can depend on stable API

2. CONSISTENT STRUCTURE
   - All events have same format
   - Easy to process uniformly

3. EXTENSIBILITY
   - Add new events without touching transport
   - Just update events/ module

4. TYPE SAFETY
   - Constants prevent typos
   - Better IDE support

┌─────────────────────────────────────────────────────────────────────┐
│                        USAGE EXAMPLE                                 │
└─────────────────────────────────────────────────────────────────────┘

OLD WAY (before):
─────────────────
@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    connection.send_to_blendmate({
        "type": "event",
        "event": "save_post",
        "filename": bpy.data.filepath
    })

NEW WAY (normalized):
─────────────────────
from .events.mapping import create_file_saved_event

@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    event = create_file_saved_event(bpy.data.filepath)
    connection.send_to_blendmate(event.to_json_compatible())

┌─────────────────────────────────────────────────────────────────────┐
│                      ADDING NEW EVENTS                               │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Add to events/types.py
───────────────────────────────
class EventType:
    MATERIAL_CHANGED = "scene.material.changed"

Step 2: Add description
───────────────────────
EVENT_TYPE_DESCRIPTIONS = {
    EventType.MATERIAL_CHANGED: "Triggered when a material changes",
}

Step 3: Add mapping (if from handler)
──────────────────────────────────────
HANDLER_TO_EVENT_TYPE = {
    "material_update": EventType.MATERIAL_CHANGED,
}

Step 4: (Optional) Add helper function
───────────────────────────────────────
def create_material_changed_event(material_name):
    return Event.from_handler(
        EventType.MATERIAL_CHANGED,
        {"material_name": material_name}
    )

Step 5: Use in handler
──────────────────────
@bpy.app.handlers.persistent
def on_material_changed(scene):
    event = create_material_changed_event(...)
    connection.send_to_blendmate(event.to_json_compatible())

Done! No changes needed in transport/connection code.
```
