import bpy
from . import connection
from . import throttle

@bpy.app.handlers.persistent
def on_depsgraph_update(scene, depsgraph):
    # Optimization: Only check nodes if we have a connection
    # and only if something in the scene actually changed nodes-related
    current_node_id = connection.get_active_gn_node()
    if current_node_id and current_node_id != connection._last_node_id:
        connection._last_node_id = current_node_id
        connection.info(f"Node Change: {current_node_id}")
        connection.send_to_blendmate({
            "type": "context",
            "area": "gn",
            "node_id": current_node_id
        })

    # Extract changed objects from depsgraph
    changed_objects = []
    geometry_changed = []
    for update in depsgraph.updates:
        if update.id and hasattr(update.id, 'name'):
            obj_name = update.id.name
            # Check if it's an object (not scene, world, etc.)
            if isinstance(update.id, bpy.types.Object):
                changed_objects.append(obj_name)
                # Check if geometry changed (not just transform)
                if update.is_updated_geometry:
                    geometry_changed.append(obj_name)

    # Only send event if something actually changed
    if changed_objects:
        throttle.throttle_event(
            "depsgraph_update",
            {
                "type": "event",
                "event": "depsgraph_update",
                "changed_objects": changed_objects,
                "geometry_changed": geometry_changed,
            },
            reason="depsgraph_changed"
        )

@bpy.app.handlers.persistent
def on_frame_change(scene, *args):
    # Throttle frame change events to avoid high-frequency spam during playback
    throttle.throttle_event(
        "frame_change",
        {"type": "event", "event": "frame_change", "frame": scene.frame_current},
        reason=f"frame_{scene.frame_current}"
    )

@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    connection.info("File Saved")
    connection.send_to_blendmate({"type": "event", "event": "save_post", "filename": bpy.data.filepath})

@bpy.app.handlers.persistent
def on_load_post(scene, *args):
    connection.info("File Loaded")
    connection.send_to_blendmate({"type": "event", "event": "load_post", "filename": bpy.data.filepath})

# Registration is now handled by events.registry module
# This file only contains the handler functions themselves
