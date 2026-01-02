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
_pending_requests = queue.Queue()  # Requests from Blendmate to process in main thread

def info(msg):
    print(f"[Blendmate] {msg}")

def send_to_blendmate(data):
    """Adds a message to the queue to be sent by the timer."""
    global _message_queue
    _message_queue.put(data)

# ============== Scene Introspection ==============

def get_object_info(obj):
    """Get basic info about an object."""
    return {
        "name": obj.name,
        "type": obj.type,
        "visible": obj.visible_get() if hasattr(obj, 'visible_get') else True,
        "selected": obj.select_get() if hasattr(obj, 'select_get') else False,
        "parent": obj.parent.name if obj.parent else None,
        "modifiers": [{"name": m.name, "type": m.type} for m in obj.modifiers],
        "has_gn": any(m.type == 'NODES' for m in obj.modifiers),
    }

def get_collection_tree(collection):
    """Recursively get collection hierarchy."""
    return {
        "name": collection.name,
        "objects": [obj.name for obj in collection.objects],
        "children": [get_collection_tree(child) for child in collection.children],
    }

def get_scene_data():
    """Get full scene data for Blendmate."""
    # Use bpy.data for reliable access (context can be restricted in timers)
    try:
        # Try context first (more accurate for active/selected)
        scene = bpy.context.scene
        active = bpy.context.active_object
        selected = [obj.name for obj in bpy.context.selected_objects]
    except (AttributeError, RuntimeError):
        # Fallback to bpy.data
        scene = bpy.data.scenes[0] if bpy.data.scenes else None
        active = None
        selected = []

    if not scene:
        return {"error": "No scene available"}

    return {
        "scene": {
            "name": scene.name,
            "frame_current": scene.frame_current,
            "frame_start": scene.frame_start,
            "frame_end": scene.frame_end,
        },
        "active_object": active.name if active else None,
        "selected_objects": selected,
        "objects": {obj.name: get_object_info(obj) for obj in bpy.data.objects},
        "collections": get_collection_tree(scene.collection),
        "filepath": bpy.data.filepath or "(unsaved)",
    }

def get_active_gn_context():
    """Get detailed info about active GN node."""
    node_info = get_active_gn_node()
    if not node_info:
        return {"active_node": None}

    # Get more details about the node
    for area in bpy.context.screen.areas:
        if area.type == 'NODE_EDITOR':
            space = area.spaces.active
            if space.tree_type == 'GeometryNodeTree' and space.node_tree:
                node = space.node_tree.nodes.active
                if node:
                    return {
                        "active_node": {
                            "bl_idname": node.bl_idname,
                            "name": node.name,
                            "label": node.label or node.name,
                            "type": node.type,
                            "inputs": [{"name": i.name, "type": i.type} for i in node.inputs],
                            "outputs": [{"name": o.name, "type": o.type} for o in node.outputs],
                        },
                        "node_tree": space.node_tree.name,
                        "nodes_count": len(space.node_tree.nodes),
                    }
    return {"active_node": None}

# ============== Request Handler ==============

def handle_request(request_data):
    """Handle incoming request from Blendmate and return response."""
    action = request_data.get("action")
    request_id = request_data.get("id", "unknown")

    info(f"Handling request: {action} (id: {request_id})")

    response = {
        "type": "response",
        "id": request_id,
        "action": action,
    }

    try:
        if action == "get_scene":
            data = get_scene_data()
            response["data"] = data
            # Log summary
            if data and "objects" in data:
                info(f"  Scene: {data.get('scene', {}).get('name', '?')}, objects: {len(data.get('objects', {}))}")
            else:
                info(f"  Scene data: {data}")
        elif action == "get_gn_context":
            response["data"] = get_active_gn_context()
        elif action == "ping":
            response["data"] = {"pong": True, "time": time.time()}
        else:
            response["error"] = f"Unknown action: {action}"
    except Exception as e:
        response["error"] = str(e)
        info(f"Error handling request: {e}")
        import traceback
        traceback.print_exc()

    info(f"Sending response: {len(json.dumps(response))} bytes")
    return response

_request_timer_running = False

def process_pending_requests():
    """Timer callback to process incoming requests in main thread."""
    global _pending_requests, _ws, _request_timer_running

    if not _request_timer_running:
        _request_timer_running = True
        info("Request timer started")

    if not _should_run.is_set():
        info("Request timer stopping (_should_run is False)")
        return None

    qsize = _pending_requests.qsize()
    if qsize > 0:
        info(f"Processing {qsize} pending request(s)...")

    while not _pending_requests.empty():
        try:
            request_data = _pending_requests.get_nowait()
            info(f"Dequeued: {request_data.get('action')}")
            response = handle_request(request_data)
            send_to_blendmate(response)
            _pending_requests.task_done()
        except queue.Empty:
            break
        except Exception as e:
            info(f"Error processing request: {e}")
            import traceback
            traceback.print_exc()

    return 0.1  # Check every 100ms

def on_ws_message(ws, message):
    """Handle incoming WebSocket message."""
    info(f"Received: {message[:200]}")
    try:
        data = json.loads(message)
        if data.get("type") == "request":
            # Queue for main thread processing (Blender API requires main thread)
            _pending_requests.put(data)
            info(f"Queued request: {data.get('action')} (queue size: {_pending_requests.qsize()})")
    except json.JSONDecodeError as e:
        info(f"Invalid JSON: {e}")

# ============== Connection Check ==============

def is_ws_connected():
    """Check if WebSocket is connected."""
    global _ws
    try:
        if _ws and _ws.sock:
            return True
    except:
        pass
    return False

# ============== Heartbeat ==============

_heartbeat_interval = 5.0  # seconds

def send_heartbeat():
    """Send periodic heartbeat with basic status."""
    if not _should_run.is_set():
        return None

    if is_ws_connected():
        try:
            # Get basic context info safely
            active_obj = None
            mode = None
            try:
                if bpy.context.active_object:
                    active_obj = bpy.context.active_object.name
                    mode = bpy.context.active_object.mode
            except:
                pass

            send_to_blendmate({
                "type": "heartbeat",
                "active_object": active_obj,
                "mode": mode,
                "filepath": bpy.data.filepath or "(unsaved)",
            })
        except Exception as e:
            info(f"Heartbeat error: {e}")

    return _heartbeat_interval

def process_queue():
    """Timer callback to process the message queue and send via WebSocket."""
    global _ws, _message_queue

    if not _should_run.is_set():
        return None

    if is_ws_connected() and not _message_queue.empty():
        while not _message_queue.empty():
            try:
                data = _message_queue.get_nowait()
                msg = json.dumps(data)
                _ws.send(msg)
                info(f"Sent: {msg[:100]}...")
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
    info(f"WS Thread start sequence...")

    while _should_run.is_set():
        try:
            # Get URL from preferences
            prefs = preferences.get_preferences()
            url = prefs.ws_url if prefs else "ws://127.0.0.1:32123"

            info(f"Attempting connection to {url}...")

            def on_open(ws):
                info("WS Connected (on_open)")
                # Send initial connection event with basic info
                send_to_blendmate({
                    "type": "event",
                    "event": "connected",
                    "blender_version": ".".join(str(v) for v in bpy.app.version[:3]),
                    "filepath": bpy.data.filepath or "(unsaved)",
                })

            _ws = websocket.WebSocketApp(url,
                                        on_open=on_open,
                                        on_message=on_ws_message,  # Use our handler
                                        on_error=lambda ws, err: info(f"WS Error: {err}"),
                                        on_close=lambda ws, status, msg: info(f"WS Closed: {status} {msg}"))

            # run_forever blokuje vlákno, dokud je spojení otevřené
            _ws.run_forever(ping_interval=10, ping_timeout=5)

        except Exception as e:
            if _should_run.is_set():
                info(f"Connection loop error: {e}")

        # Pokud máme stále běžet, počkáme před dalším pokusem
        if _should_run.is_set():
            info("Connection lost. Waiting 5s before reconnect...")
            _should_run.wait(timeout=5)

    info("WS Thread exiting (should_run is False)")

def register():
    global _thread
    info("Registering Connection module")
    
    # Timer registration is now handled by events.registry module

    # Start WS thread
    _should_run.set()
    _thread = threading.Thread(target=ws_thread, daemon=True)
    _thread.start()
    info("WS Thread spawned")

def unregister():
    global _ws, _thread
    
    # Timer unregistration is now handled by events.registry module

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
