# Blendmate msgbus Subscriptions

This document describes the msgbus-based subscription system for targeted change detection in Blendmate.

## Overview

The `subscriptions.py` module replaces broad `depsgraph_update_post` handlers with precise `bpy.msgbus.subscribe_rna` subscriptions. This significantly reduces event noise and improves performance.

## Why msgbus?

- **Precision**: Subscribe to specific RNA properties instead of global change signals
- **Performance**: No depsgraph spam - callbacks fire only when subscribed properties change
- **Clean**: Centralized subscription management with proper cleanup

## Subscribed Properties

### Active Object Changes
- **RNA Path**: `bpy.context.view_layer.objects.active`
- **Event**: `active_object_changed`
- **Payload**: `{"type": "event", "event": "active_object_changed", "object": "ObjectName"}`

### Object Name Changes
- **RNA Path**: `Object.name`
- **Event**: `object_name_changed`
- **Payload**: `{"type": "event", "event": "object_name_changed"}`

### Object Transforms
- **RNA Paths**: 
  - `Object.location`
  - `Object.rotation_euler`
  - `Object.scale`
- **Event**: `object_transform_changed`
- **Payload**: 
  ```json
  {
    "type": "event",
    "event": "object_transform_changed",
    "object": "ObjectName",
    "property": "location|rotation_euler|scale",
    "value": [x, y, z]
  }
  ```

### Scene Frame
- **RNA Path**: `Scene.frame_current`
- **Event**: `frame_changed`
- **Payload**: `{"type": "event", "event": "frame_changed", "frame": 42}`

## Architecture

### SubscriptionOwner
A stable owner object required by msgbus. Subscriptions are tied to this owner's lifetime.

### Callbacks
All callbacks:
- Execute fast (no heavy processing)
- Enqueue events via `connection.send_to_blendmate()`
- Handle exceptions gracefully
- Use `bpy.context` to read current state

### Lifecycle
1. **Register**: `subscribe_all()` creates owner and registers all subscriptions
2. **Runtime**: Callbacks fire when properties change
3. **Unregister**: `unsubscribe_all()` calls `bpy.msgbus.clear_by_owner()`

## Comparison: Before vs After

### Before (depsgraph spam)
```python
@bpy.app.handlers.persistent
def on_depsgraph_update(scene, depsgraph):
    # Fires on EVERY scene change
    # Must manually check what changed
    # High overhead, noisy
```

### After (msgbus precision)
```python
bpy.msgbus.subscribe_rna(
    key=(bpy.types.Object, "location"),
    owner=_owner,
    notify=on_object_location_changed,
)
# Fires ONLY when object.location changes
# Callback knows exactly what changed
# Low overhead, precise
```

## Testing

### Unit Tests
```bash
python tests/addon/test_subscriptions.py
```

### Manual Test (in Blender)
1. Install addon
2. Run `tests/manual_test_msgbus.py` in Blender console
3. Verify events in Blendmate app

## References

- [Blender msgbus API docs](https://docs.blender.org/api/current/bpy.msgbus.html)
- [docs/blender-events.md](../docs/blender-events.md) - Event reference
- [VRM Addon subscription example](https://github.com/saturday06/VRM-Addon-for-Blender/blob/main/src/io_scene_vrm/editor/subscription.py)

## Notes

- Frame changes use msgbus instead of `frame_change_post` handler
- `depsgraph_update_post` is kept ONLY for GN node detection (requires context polling)
- Selection changes not yet implemented (may require different approach)
- Works on Blender 4.5+ (msgbus introduced in 2.80, stabilized in 4.x)
