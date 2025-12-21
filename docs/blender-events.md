# Blender Event Reference (4.5+)

This document lists Blender events that are meaningful to capture in addons (Blender **4.5 and newer**), with practical usage notes and real-world references.

> Blender does not provide a single "event object" like browsers do. For handlers/msgbus, you generally get **global context** (`bpy.context`) plus **callback parameters** (when the API provides them). This doc therefore describes **what data is available** rather than “what the event returns”.

## 1. File lifecycle events (handlers)

| Event | API | Trigger | Available data in callback | Notes | Example |
|---|---|---|---|---|---|
| Save (pre) | `bpy.app.handlers.save_pre.append(fn)` | Before saving `.blend` | `bpy.context` (scene, active object, etc.) | Good for validation, pre-export, flushing state | https://github.com/ucupumar/ucupaint/blob/master/preferences.py |
| Save (post) | `bpy.app.handlers.save_post.append(fn)` | After saving | `bpy.context` | File exists on disk; good for notifying external tools | ↑ |
| Load (pre) | `bpy.app.handlers.load_pre.append(fn)` | Before loading a file | **Limited / transitional context** | Avoid heavy access; use `load_post` for most tasks | |
| Load (post) | `bpy.app.handlers.load_post.append(fn)` | After loading | `bpy.context` | Safe place for initialization per-file | https://github.com/ndee85/coa_tools/blob/master/Blender/coa_tools/__init__.py |

## 2. Scene & data change events

### 2.1 Dependency graph updates (global change signal)

| Event | API | Trigger | Available data in callback | Notes | Example |
|---|---|---|---|---|---|
| Depsgraph update (post) | `bpy.app.handlers.depsgraph_update_post.append(fn)` | After evaluated changes in scene | `depsgraph` parameter (callback arg) + `bpy.context` | **High frequency**. Always debounce / throttle. Filter updates if possible. | https://github.com/maximeraafat/BlenderNeRF/blob/main/__init__.py |

**Why it matters:** good “something changed” signal when you can’t subscribe to a specific property.

### 2.2 RNA Message Bus (targeted changes – recommended)

Message Bus is the “scalpel”: subscribe to **specific RNA properties** and get notified when they change.

Typical pattern:

```python
bpy.msgbus.subscribe_rna(
    key=(bpy.types.Object, "location"),
    owner=owner,
    notify=callback,
)
```

| Target | API | Trigger | Available data in callback | Notes | Example |
|---|---|---|---|---|---|
| `Object.name` | `bpy.msgbus.subscribe_rna(...)` | Object name changed | callback args typically none; use `bpy.context` + read RNA property | Low overhead. Great for sync tools. | https://github.com/saturday06/VRM-Addon-for-Blender/blob/main/src/io_scene_vrm/editor/subscription.py |
| `Object.mode` | `bpy.msgbus.subscribe_rna(...)` | Mode changed | same as above | Useful for tooling that depends on edit/pose/object mode | ↑ |
| `Object.location` | `bpy.msgbus.subscribe_rna(...)` | Transform changed | same as above | Use for real-time transform sync (prefer over depsgraph spam) | ↑ |

**Notes:**
- You must keep a stable `owner` for subscriptions and properly clear on unregister.
- Message bus is ideal for Blendmate-style “reactive sync” while avoiding global depsgraph noise.

## 3. Timeline events

| Event | API | Trigger | Available data in callback | Notes | Example |
|---|---|---|---|---|---|
| Frame change (post) | `bpy.app.handlers.frame_change_post.append(fn)` | After changing frame | `bpy.context.scene.frame_current` | High frequency during playback. Use only if necessary. | https://github.com/alessandro-zomparelli/tissue/blob/master/__init__.py |

## 4. Render lifecycle events

| Event | API | Trigger | Available data in callback | Notes | Example |
|---|---|---|---|---|---|
| Render (pre) | `bpy.app.handlers.render_pre.append(fn)` | Render starts | `bpy.context` | Use to notify external app, lock UI, etc. | https://github.com/maximeraafat/BlenderNeRF/blob/main/__init__.py |
| Render (complete) | `bpy.app.handlers.render_complete.append(fn)` | Render finished successfully | `bpy.context` | Good for post-processing triggers | ↑ |
| Render (cancel) | `bpy.app.handlers.render_cancel.append(fn)` | Render cancelled | `bpy.context` | Always handle to release resources | ↑ |

## 5. Timers (supporting mechanism)

Timers are not “events”, but they are essential for **debouncing** and delayed work.

| API | Purpose | Callback return | Example |
|---|---|---|---|
| `bpy.app.timers.register(fn)` | debounce / delayed execution / periodic work | `float` (seconds until next call) or `None` to stop | https://github.com/saturday06/VRM-Addon-for-Blender/blob/main/src/io_scene_vrm/editor/migration.py |

## 6. Recommendations for Blendmate

- Prefer **Message Bus** (`bpy.msgbus.subscribe_rna`) for object/material/selection/property changes.
- Use `depsgraph_update_post` **only as a fallback** and always with debounce/throttle.
- Use `save_post` / `load_post` for file lifecycle sync.
- Centralize all registrations in one module (`register_all()` / `unregister_all()`), and ensure cleanup on addon reload.
