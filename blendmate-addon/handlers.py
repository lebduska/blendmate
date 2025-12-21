import bpy
from . import connection
from .events.mapping import (
    create_file_saved_event,
    create_file_loaded_event,
    create_frame_changed_event,
    create_node_active_event,
)

@bpy.app.handlers.persistent
def on_depsgraph_update(scene, depsgraph):
    # Optimization: Only check nodes if we have a connection
    # and only if something in the scene actually changed nodes-related
    current_node_id = connection.get_active_gn_node()
    if current_node_id and current_node_id != connection._last_node_id:
        connection._last_node_id = current_node_id
        connection.info(f"Node Change: {current_node_id}")
        # Use normalized event model
        event = create_node_active_event(current_node_id, "GeometryNodeTree")
        connection.send_to_blendmate(event.to_json_compatible())
    
    # We might want to throttle depsgraph_update events as they are very frequent
    # For full depsgraph updates, we could use:
    # event = create_depsgraph_updated_event(scene_name=scene.name if scene else None)
    # connection.send_to_blendmate(event.to_json_compatible())

@bpy.app.handlers.persistent
def on_frame_change(scene, *args):
    connection.info(f"Frame Change: {scene.frame_current}")
    # Use normalized event model
    event = create_frame_changed_event(scene.frame_current, scene.name if scene else None)
    connection.send_to_blendmate(event.to_json_compatible())

@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    connection.info("File Saved")
    # Use normalized event model
    event = create_file_saved_event(bpy.data.filepath)
    connection.send_to_blendmate(event.to_json_compatible())

@bpy.app.handlers.persistent
def on_load_post(scene, *args):
    connection.info("File Loaded")
    # Use normalized event model
    event = create_file_loaded_event(bpy.data.filepath)
    connection.send_to_blendmate(event.to_json_compatible())

def register():
    connection.info("Registering Handlers")
    handlers = bpy.app.handlers
    
    # Append safely to avoid duplicates if possible, though unregister should handle it
    if on_save_post not in handlers.save_post:
        handlers.save_post.append(on_save_post)
    if on_load_post not in handlers.load_post:
        handlers.load_post.append(on_load_post)
    if on_depsgraph_update not in handlers.depsgraph_update_post:
        handlers.depsgraph_update_post.append(on_depsgraph_update)
    if on_frame_change not in handlers.frame_change_post:
        handlers.frame_change_post.append(on_frame_change)

def unregister():
    handlers = bpy.app.handlers
    for h in [on_save_post, on_load_post, on_depsgraph_update, on_frame_change]:
        for handler_list in [handlers.save_post, handlers.load_post, handlers.depsgraph_update_post, handlers.frame_change_post]:
            if h in handler_list:
                try:
                    handler_list.remove(h)
                except ValueError:
                    pass
