import bpy
from . import connection

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
    
    # We might want to throttle depsgraph_update events as they are very frequent
    # connection.send_to_blendmate({"type": "event", "event": "depsgraph_update"})

@bpy.app.handlers.persistent
def on_frame_change(scene, *args):
    connection.info(f"Frame Change: {scene.frame_current}")
    connection.send_to_blendmate({"type": "event", "event": "frame_change", "frame": scene.frame_current})

@bpy.app.handlers.persistent
def on_save_post(scene, *args):
    connection.info("File Saved")
    connection.send_to_blendmate({"type": "event", "event": "save_post", "filename": bpy.data.filepath})

@bpy.app.handlers.persistent
def on_load_post(scene, *args):
    connection.info("File Loaded")
    connection.send_to_blendmate({"type": "event", "event": "load_post", "filename": bpy.data.filepath})

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
