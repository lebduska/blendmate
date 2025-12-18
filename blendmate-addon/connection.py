import bpy
import json
import threading
import time
from .vendor import websocket

# Global connection state
_ws = None
_thread = None
_should_run = False

def send_to_blendmate(data):
    global _ws
    if _ws and _ws.sock and _ws.sock.connected:
        try:
            _ws.send(json.dumps(data))
        except Exception as e:
            print(f"[Blendmate] Send error: {e}")

# Handlers for Issue #19
@bpy.app.handlers.persistent
def on_save_post(scene):
    send_to_blendmate({"type": "event", "event": "save_post", "filename": bpy.data.filepath})

@bpy.app.handlers.persistent
def on_load_post(scene):
    send_to_blendmate({"type": "event", "event": "load_post", "filename": bpy.data.filepath})

@bpy.app.handlers.persistent
def on_depsgraph_update(scene, depsgraph):
    # Throttlovaný update by byl lepší, ale pro v0.1 stačí poslat signál
    send_to_blendmate({"type": "event", "event": "depsgraph_update"})

def ws_thread():
    global _ws, _should_run
    while _should_run:
        try:
            # TODO: Přidat konfigurovatelnou adresu z UI
            _ws = websocket.WebSocketApp("ws://127.0.0.1:32123",
                                        on_message=lambda ws, msg: print(f"[Blendmate] Recv: {msg}"),
                                        on_error=lambda ws, err: print(f"[Blendmate] WS Error: {err}"),
                                        on_close=lambda ws, close_status, close_msg: print("[Blendmate] WS Closed"))
            _ws.run_forever()
        except Exception as e:
            print(f"[Blendmate] Connection error: {e}")
        time.sleep(5) # Reconnect interval

def register():
    global _thread, _should_run
    
    # Register handlers
    if on_save_post not in bpy.app.handlers.save_post:
        bpy.app.handlers.save_post.append(on_save_post)
    if on_load_post not in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.append(on_load_post)
    if on_depsgraph_update not in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.append(on_depsgraph_update)

    # Start WS thread
    _should_run = True
    _thread = threading.Thread(target=ws_thread, daemon=True)
    _thread.start()

def unregister():
    global _ws, _should_run
    
    # Unregister handlers
    if on_save_post in bpy.app.handlers.save_post:
        bpy.app.handlers.save_post.remove(on_save_post)
    if on_load_post in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(on_load_post)
    if on_depsgraph_update in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(on_depsgraph_update)

    _should_run = False
    if _ws:
        _ws.close()
