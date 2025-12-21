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

# Registration is now handled by events.registry module
# This file only contains the handler functions themselves
