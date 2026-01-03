import bpy
from . import connection
from . import throttle

# Protocol import
try:
    from . import protocol
    _protocol_available = True
except ImportError:
    _protocol_available = False


def _use_v1():
    """Check if we should use protocol v1 format."""
    return connection.is_protocol_v1() and _protocol_available


@bpy.app.handlers.persistent
def on_depsgraph_update(scene, depsgraph):
    # Optimization: Only check nodes if we have a connection
    # and only if something in the scene actually changed nodes-related
    current_node_id = connection.get_active_gn_node()
    if current_node_id and current_node_id != connection._last_node_id:
        connection._last_node_id = current_node_id
        connection.info(f"Node Change: {current_node_id}")

        if _use_v1():
            event = protocol.create_event(
                "event.node.active_changed",
                protocol.event_node_active_changed(current_node_id, "gn"),
            )
            connection._message_queue.put(event)
        else:
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
        if _use_v1():
            # Protocol v1 format (clean, no legacy fields)
            body = protocol.event_depsgraph_updated(
                changed_object_ids=changed_objects,
                geometry_changed_ids=geometry_changed,
                reason="user",
            )
            throttle.throttle_event(
                "depsgraph_update",
                body,
                reason="depsgraph_changed",
                new_type="event.depsgraph.updated",
            )
        else:
            # Legacy format
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
    if _use_v1():
        body = protocol.event_timeline_frame_changed(scene.frame_current)
        throttle.throttle_event(
            "frame_change",
            body,
            reason=f"frame_{scene.frame_current}",
            new_type="event.timeline.frame_changed",
        )
    else:
        throttle.throttle_event(
            "frame_change",
            {"type": "event", "event": "frame_change", "frame": scene.frame_current},
            reason=f"frame_{scene.frame_current}"
        )


@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    connection.info("File Saved")
    filepath = bpy.data.filepath or "(unsaved)"

    if _use_v1():
        event = protocol.create_event(
            "event.scene.file_saved",
            protocol.event_scene_file_saved(filepath),
        )
        connection._message_queue.put(event)
    else:
        connection.send_to_blendmate({"type": "event", "event": "save_post", "filename": filepath})


@bpy.app.handlers.persistent
def on_load_post(scene, *args):
    connection.info("File Loaded")
    filepath = bpy.data.filepath or "(unsaved)"
    blender_version = ".".join(str(v) for v in bpy.app.version[:3])
    addon_version = "1.0.0"

    if _use_v1():
        event = protocol.create_event(
            "event.scene.file_loaded",
            protocol.event_scene_file_loaded(
                filepath=filepath,
                blender_version=blender_version,
                addon_version=addon_version,
            ),
        )
        connection._message_queue.put(event)
    else:
        connection.send_to_blendmate({"type": "event", "event": "load_post", "filename": filepath})


# Registration is now handled by events.registry module
# This file only contains the handler functions themselves
