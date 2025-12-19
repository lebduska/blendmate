import json
import threading
import time
import queue
import bpy

try:
    import websocket
except ModuleNotFoundError:
    from .vendor import websocket

# Global connection state
_ws = None
_thread = None
_should_run = threading.Event()
_last_node_id = None
_message_queue = queue.Queue()

def info(msg):
    print(f"[Blendmate] {msg}")

def send_to_blendmate(data):
    """Adds a message to the queue to be sent by the timer."""
    global _message_queue
    _message_queue.put(data)

def process_queue():
    """Timer callback to process the message queue and send via WebSocket."""
    global _ws, _message_queue

    if not _should_run.is_set():
        return None

    is_connected = False
    try:
        if _ws:
            if hasattr(_ws, "sock") and _ws.sock:
                is_connected = getattr(_ws.sock, "connected", False)
    except:
        is_connected = False

    if is_connected:
        while not _message_queue.empty():
            try:
                data = _message_queue.get_nowait()
                _ws.send(json.dumps(data))
                _message_queue.task_done()
            except queue.Empty:
                break
            except Exception as e:
                info(f"Send error: {e}")
                break
    return 0.1

def get_active_gn_node():
    """Returns the ID of the active node in the Geometry Nodes editor."""
    try:
        if not hasattr(bpy.context, "screen") or bpy.context.screen is None:
            return None

        for area in bpy.context.screen.areas:
            if area.type == 'NODE_EDITOR':
                space = area.spaces.active
                if space and hasattr(space, "tree_type") and space.tree_type == 'GeometryNodeTree':
                    node_tree = space.node_tree
                    if node_tree and node_tree.nodes.active:
                        active_node = node_tree.nodes.active
                        return active_node.bl_idname
    except Exception as e:
        print(f"[Blendmate] Context error in get_active_gn_node: {e}")
    return None

from . import preferences

def ws_thread():
    global _ws
    info(f"WS Thread trying to start...")
    try:
        # Get URL from preferences
        prefs = preferences.get_preferences()
        url = prefs.ws_url if prefs else "ws://127.0.0.1:32123"
        
        info(f"Target: {url}")
        while _should_run.is_set():
            try:
                info("Attempting connection...")
                _ws = websocket.WebSocketApp(url,
                                            on_open=lambda ws: info("WS Connected (on_open)"),
                                            on_message=lambda ws, msg: info(f"Recv: {msg}"),
                                            on_error=lambda ws, err: info(f"WS Error: {err}"),
                                            on_close=lambda ws, close_status, close_msg: info(f"WS Closed: {close_status} {close_msg}"))
                _ws.run_forever(ping_interval=10, ping_timeout=5)
            except Exception as e:
                if _should_run.is_set():
                    info(f"Loop error: {e}")

            if _should_run.is_set():
                info("Waiting 5s before reconnect...")
                _should_run.wait(timeout=5)
    except Exception as top_e:
        info(f"CRITICAL WS Thread error: {top_e}")
    info("WS Thread exiting")

def register():
    global _thread
    info("Registering Connection module")
    
    # Register timer for queue processing
    if not bpy.app.timers.is_registered(process_queue):
        bpy.app.timers.register(process_queue, first_interval=0.1)
        info("Timer registered")

    # Start WS thread
    _should_run.set()
    _thread = threading.Thread(target=ws_thread, daemon=True)
    _thread.start()
    info("WS Thread spawned")

def unregister():
    global _ws, _thread
    
    # 1. Stop timer
    if bpy.app.timers.is_registered(process_queue):
        bpy.app.timers.unregister(process_queue)

    # 2. Signal thread to stop
    _should_run.clear()
    
    # 3. Close websocket immediately
    if _ws:
        try:
            _ws.close()
        except:
            pass
            
    # 4. Wait for thread to exit (briefly)
    if _thread and _thread.is_alive():
        _thread.join(timeout=0.5)
    
    _thread = None
    _ws = None
