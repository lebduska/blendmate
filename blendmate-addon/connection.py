import json
import threading
import time
import queue
import bpy

try:
    import websocket
except ModuleNotFoundError:
    from .vendor import websocket

# Protocol import
try:
    from . import protocol
    _protocol_available = True
except ImportError:
    _protocol_available = False

# Global connection state
# Use module-level caching to preserve state across reloads
# IMPORTANT: Get old module reference FIRST before any state access
import sys
_old_module = sys.modules.get(__name__)

_ws = None

# Preserve thread reference across reloads
if _old_module and hasattr(_old_module, '_thread'):
    _thread = _old_module._thread
    print(f"[Blendmate] Reusing existing thread (alive={_thread.is_alive() if _thread else False})")
else:
    _thread = None

# IMPORTANT: Preserve Event across module reloads to avoid thread desync
# When module is reloaded, a new Event would be created but old thread
# would still reference the old Event - causing communication breakdown
if _old_module and hasattr(_old_module, '_should_run'):
    _should_run = _old_module._should_run
    print(f"[Blendmate] Reusing existing _should_run Event (is_set={_should_run.is_set()})")
else:
    _should_run = threading.Event()
    print("[Blendmate] Created new _should_run Event")

_last_node_id = None

# Also preserve queues across reloads to avoid losing messages
if _old_module and hasattr(_old_module, '_message_queue'):
    _message_queue = _old_module._message_queue
    _pending_requests = _old_module._pending_requests
    print(f"[Blendmate] Reusing existing queues (msg={_message_queue.qsize()}, req={_pending_requests.qsize()})")
else:
    _message_queue = queue.Queue()
    _pending_requests = queue.Queue()  # Requests from Blendmate to process in main thread
    print("[Blendmate] Created new queues")

# Protocol session state
# Starts in LEGACY mode, upgrades via protocol.upgrade request
_session_protocol_version = 0  # 0 = legacy, 1 = protocol v1
SUPPORTED_PROTOCOL_VERSIONS = [1]


def get_session_protocol_version():
    """Get current session protocol version. 0 = legacy, 1+ = protocol v1."""
    return _session_protocol_version


def is_protocol_v1():
    """Check if session is using protocol v1."""
    return _session_protocol_version >= 1

def info(msg):
    print(f"[Blendmate] {msg}")

def send_to_blendmate(data):
    """
    Adds a message to the queue to be sent by the timer.

    In legacy mode (v0): sends raw legacy messages
    In protocol v1: sends envelope format only
    """
    global _message_queue

    if is_protocol_v1() and _protocol_available:
        # Protocol v1 mode - ensure envelope format
        if "v" in data and "body" in data:
            # Already an envelope - send as-is
            _message_queue.put(data)
        else:
            # Legacy message in v1 mode - wrap it (shouldn't happen often)
            envelope = protocol.wrap_legacy_message(data)
            _message_queue.put(envelope)
    else:
        # Legacy mode - send raw messages only
        # Strip any envelope wrapper if present
        if "v" in data and "body" in data:
            # Extract legacy from envelope body if available
            body = data.get("body", {})
            legacy = body.get("_legacy")
            if legacy:
                _message_queue.put(legacy)
            else:
                # No legacy available, construct from body
                _message_queue.put(body)
        else:
            _message_queue.put(data)

# ============== Scene Introspection ==============

def get_object_info(obj):
    """Get comprehensive info about an object."""
    # Basic info
    info = {
        "name": obj.name,
        "type": obj.type,
        "visible": obj.visible_get() if hasattr(obj, 'visible_get') else True,
        "selected": obj.select_get() if hasattr(obj, 'select_get') else False,
        "parent": obj.parent.name if obj.parent else None,
        "children": [c.name for c in obj.children],
    }

    # Transform
    info["location"] = list(obj.location)
    info["rotation_euler"] = list(obj.rotation_euler)
    info["scale"] = list(obj.scale)
    info["dimensions"] = list(obj.dimensions)

    # Display
    info["display_type"] = obj.display_type
    info["show_name"] = obj.show_name
    info["show_axis"] = obj.show_axis
    info["show_wire"] = obj.show_wire
    info["show_in_front"] = obj.show_in_front
    info["color"] = list(obj.color)

    # Visibility
    info["hide_viewport"] = obj.hide_viewport
    info["hide_render"] = obj.hide_render
    info["hide_select"] = obj.hide_select

    # Modifiers
    info["modifiers"] = [
        {
            "name": m.name,
            "type": m.type,
            "show_viewport": m.show_viewport,
            "show_render": m.show_render,
        }
        for m in obj.modifiers
    ]
    info["has_gn"] = any(m.type == 'NODES' for m in obj.modifiers)

    # Constraints
    info["constraints"] = [
        {"name": c.name, "type": c.type, "enabled": c.enabled}
        for c in obj.constraints
    ]

    # Materials
    info["materials"] = [
        slot.material.name if slot.material else None
        for slot in obj.material_slots
    ]
    info["active_material"] = obj.active_material.name if obj.active_material else None

    # Data-specific info
    if obj.data:
        info["data_name"] = obj.data.name
        if obj.type == 'MESH':
            mesh = obj.data
            info["mesh"] = {
                "vertices": len(mesh.vertices),
                "edges": len(mesh.edges),
                "polygons": len(mesh.polygons),
                "materials": len(mesh.materials),
            }
            # Geometry is NOT included here - use get_geometry action for heavy data
            # This keeps get_scene fast and lightweight
        elif obj.type == 'CURVE':
            curve = obj.data
            info["curve"] = {
                "splines": len(curve.splines),
                "dimensions": curve.dimensions,
                "resolution_u": curve.resolution_u,
            }
        elif obj.type == 'LIGHT':
            light = obj.data
            info["light"] = {
                "type": light.type,
                "color": list(light.color),
                "energy": light.energy,
            }
        elif obj.type == 'CAMERA':
            cam = obj.data
            info["camera"] = {
                "type": cam.type,
                "lens": cam.lens if cam.type == 'PERSP' else None,
                "ortho_scale": cam.ortho_scale if cam.type == 'ORTHO' else None,
                "clip_start": cam.clip_start,
                "clip_end": cam.clip_end,
            }

    # Custom properties
    custom_props = {}
    for key in obj.keys():
        if key not in ['_RNA_UI', 'cycles']:
            val = obj[key]
            # Convert to JSON-serializable
            if hasattr(val, 'to_list'):
                custom_props[key] = val.to_list()
            elif isinstance(val, (int, float, str, bool)):
                custom_props[key] = val
            else:
                custom_props[key] = str(val)
    if custom_props:
        info["custom_properties"] = custom_props

    # Animation
    info["has_animation"] = obj.animation_data is not None
    if obj.animation_data and obj.animation_data.action:
        info["action_name"] = obj.animation_data.action.name

    return info

def get_collection_tree(collection):
    """Recursively get collection hierarchy with full details."""
    info = {
        "name": collection.name,
        "objects": [obj.name for obj in collection.objects],
        "object_count": len(collection.objects),
        "children": [get_collection_tree(child) for child in collection.children],
        "children_count": len(collection.children),
    }

    # Visibility (only available on non-master collections)
    if hasattr(collection, 'hide_viewport'):
        info["hide_viewport"] = collection.hide_viewport
    if hasattr(collection, 'hide_render'):
        info["hide_render"] = collection.hide_render
    if hasattr(collection, 'hide_select'):
        info["hide_select"] = collection.hide_select

    # Color tag
    if hasattr(collection, 'color_tag'):
        info["color_tag"] = collection.color_tag

    # Lineart
    if hasattr(collection, 'lineart_usage'):
        info["lineart_usage"] = collection.lineart_usage

    # Instance offset
    if hasattr(collection, 'instance_offset'):
        info["instance_offset"] = list(collection.instance_offset)

    # Custom properties
    custom_props = {}
    for key in collection.keys():
        if key not in ['_RNA_UI']:
            val = collection[key]
            if hasattr(val, 'to_list'):
                custom_props[key] = val.to_list()
            elif isinstance(val, (int, float, str, bool)):
                custom_props[key] = val
            else:
                custom_props[key] = str(val)
    if custom_props:
        info["custom_properties"] = custom_props

    return info

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

def get_object_geometry(obj, decimate_ratio=None):
    """
    Get geometry data for a single mesh object.

    Args:
        obj: Blender object
        decimate_ratio: Optional ratio (0.0-1.0) to simplify mesh

    Returns:
        Dict with vertices, edges and triangles, or None for non-mesh objects
    """
    if obj.type != 'MESH':
        return None

    try:
        depsgraph = bpy.context.evaluated_depsgraph_get()
        eval_obj = obj.evaluated_get(depsgraph)
        eval_mesh = eval_obj.to_mesh()

        # Extract vertices and ORIGINAL edges BEFORE triangulation (for wireframe)
        verts = []
        for v in eval_mesh.vertices:
            world_co = obj.matrix_world @ v.co
            verts.extend([round(world_co.x, 4), round(world_co.y, 4), round(world_co.z, 4)])

        # Original edges (before triangulation) - this matches Blender's wireframe
        # Use a set to deduplicate edges (some meshes have overlapping edges)
        edge_set = set()
        for e in eval_mesh.edges:
            v1, v2 = e.vertices[0], e.vertices[1]
            # Normalize edge direction (smaller index first) to catch duplicates
            edge_key = (min(v1, v2), max(v1, v2))
            edge_set.add(edge_key)

        edges = []
        for v1, v2 in edge_set:
            edges.extend([v1, v2])

        original_edge_count = len(edge_set)

        # Now triangulate for solid rendering
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(eval_mesh)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(eval_mesh)
        bm.free()

        # Triangles as flat array [v1,v2,v3, v1,v2,v3, ...]
        triangles = []
        for p in eval_mesh.polygons:
            if len(p.vertices) == 3:
                triangles.extend([p.vertices[0], p.vertices[1], p.vertices[2]])

        result = {
            "name": obj.name,
            "vertices": verts,
            "edges": edges,
            "triangles": triangles,
            "vertex_count": len(verts) // 3,
            "edge_count": original_edge_count,
            "triangle_count": len(triangles) // 3,
        }

        eval_obj.to_mesh_clear()
        return result

    except Exception as e:
        return {"name": obj.name, "error": str(e)}


def get_all_geometry(object_names=None, max_verts=50000):
    """
    Get geometry for multiple objects at once.

    Args:
        object_names: List of object names, or None for all mesh objects
        max_verts: Skip objects with more vertices than this

    Returns:
        Dict mapping object names to geometry data
    """
    result = {}

    if object_names is None:
        # Get all mesh objects
        objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    else:
        objects = [bpy.data.objects.get(name) for name in object_names]
        objects = [obj for obj in objects if obj is not None]

    for obj in objects:
        if obj.type != 'MESH':
            continue

        # Skip very large meshes
        if len(obj.data.vertices) > max_verts:
            result[obj.name] = {
                "name": obj.name,
                "skipped": True,
                "reason": f"Too many vertices ({len(obj.data.vertices)} > {max_verts})",
                "vertex_count": len(obj.data.vertices),
            }
            continue

        geo = get_object_geometry(obj)
        if geo:
            result[obj.name] = geo

    return result


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

# Import command handlers
try:
    from .commands import handle_command as dispatch_command, COMMAND_HANDLERS
    _commands_available = True
    info(f"Commands module loaded: {len(COMMAND_HANDLERS)} handlers available: {list(COMMAND_HANDLERS.keys())}")
except ImportError as e:
    _commands_available = False
    info(f"Commands module not available: {e}")
    import traceback
    traceback.print_exc()


def handle_request(request_data):
    """Handle incoming request from Blendmate and return response."""
    global _session_protocol_version

    action = request_data.get("action")
    request_id = request_data.get("id", "unknown")
    target = request_data.get("target", "")
    params = request_data.get("params", {})

    info(f"Handling request: {action} (id: {request_id}) [protocol v{_session_protocol_version}]")

    # Helper to create responses - always uses CURRENT session protocol
    # Note: protocol.upgrade response is always legacy (before upgrade completes)
    def make_response(data=None, error=None, error_code=None, warnings=None, force_legacy=False):
        use_v1 = is_protocol_v1() and _protocol_available and not force_legacy

        if use_v1:
            # Protocol v1 response (clean envelope, no legacy fields)
            if error:
                return protocol.create_response(
                    request_id=request_id,
                    ok=False,
                    error_code=error_code or protocol.ErrorCode.INTERNAL_ERROR,
                    error_message=error,
                    action=action,
                )
            else:
                return protocol.create_response(
                    request_id=request_id,
                    ok=True,
                    data=data,
                    warnings=warnings,
                    action=action,
                )
        else:
            # Legacy response format
            resp = {"type": "response", "id": request_id, "action": action}
            if error:
                resp["error"] = error
                if error_code:
                    resp["error_code"] = error_code.value if hasattr(error_code, 'value') else error_code
            else:
                resp["ok"] = True
                resp["data"] = data
                if warnings:
                    resp["warnings"] = warnings
            return resp

    try:
        # Protocol upgrade request (always responds in legacy format)
        if action == "protocol.upgrade":
            requested_version = params.get("version")

            # Validate params
            if requested_version is None:
                return make_response(
                    error="Missing 'version' parameter",
                    error_code=protocol.ErrorCode.INVALID_PARAMS if _protocol_available else "INVALID_PARAMS",
                    force_legacy=True,
                )

            # Check if version is supported
            if requested_version not in SUPPORTED_PROTOCOL_VERSIONS:
                return make_response(
                    error=f"Unsupported protocol version: {requested_version}",
                    error_code=protocol.ErrorCode.UNSUPPORTED_VERSION if _protocol_available else "UNSUPPORTED_VERSION",
                    data={"supported_versions": SUPPORTED_PROTOCOL_VERSIONS},
                    force_legacy=True,
                )

            # Upgrade successful (idempotent - ok even if already upgraded)
            old_version = _session_protocol_version
            _session_protocol_version = requested_version
            info(f"Protocol upgraded: v{old_version} → v{_session_protocol_version}")

            # Send legacy response first (before we're in v1 mode for this response)
            response = make_response(
                data={"version": _session_protocol_version},
                force_legacy=True,
            )

            # Queue the response
            _message_queue.put(response)

            # After upgrade, send v1 event.scene.connected as confirmation
            if _protocol_available and _session_protocol_version >= 1:
                blender_version = ".".join(str(v) for v in bpy.app.version[:3])
                addon_version = "1.0.0"
                filepath = bpy.data.filepath or "(unsaved)"

                connected_event = protocol.create_event(
                    "event.scene.connected",
                    protocol.event_scene_connected(
                        blender_version=blender_version,
                        addon_version=addon_version,
                        filepath=filepath,
                    ),
                )
                # Don't include legacy fields in v1 mode
                _message_queue.put(connected_event)
                info("Sent v1 event.scene.connected as upgrade confirmation")

            # Return None to skip normal response sending (we already queued it)
            return None

        # Built-in actions
        if action == "get_scene":
            data = get_scene_data()
            # Log summary
            if data and "objects" in data:
                info(f"  Scene: {data.get('scene', {}).get('name', '?')}, objects: {len(data.get('objects', {}))}")
            else:
                info(f"  Scene data: {data}")
            return make_response(data=data)

        elif action == "get_gn_context":
            return make_response(data=get_active_gn_context())

        elif action == "get_geometry":
            # Get geometry for specified objects or all
            object_names = params.get("objects")  # None = all mesh objects
            max_verts = params.get("max_verts", 50000)
            data = get_all_geometry(object_names, max_verts)
            info(f"  Geometry: {len(data)} objects")
            return make_response(data=data)

        elif action == "ping":
            return make_response(data={"pong": True, "time": time.time()})

        elif action == "get_capabilities":
            # Get capabilities from command handler or return basic info
            info(f"get_capabilities: _commands_available={_commands_available}, 'get_capabilities' in COMMAND_HANDLERS={'get_capabilities' in COMMAND_HANDLERS if _commands_available else 'N/A'}")
            if _commands_available and "get_capabilities" in COMMAND_HANDLERS:
                result = dispatch_command("get_capabilities", target, params)
                if result.get("success"):
                    data = result.get("data", {})
                    info(f"Capabilities loaded: {len(data.get('operators', {}))} operators, {len(data.get('modifiers', {}))} modifiers")
                    return make_response(data=data)
                else:
                    error_msg = result.get("error", "Failed to get capabilities")
                    info(f"Capabilities error: {error_msg}")
                    return make_response(error=error_msg, error_code=protocol.ErrorCode.INTERNAL_ERROR if _protocol_available else None)
            else:
                # Fallback: return minimal capabilities
                data = {
                    "operators": {},
                    "modifiers": {},
                    "object_types": ["MESH", "CURVE", "LIGHT", "CAMERA", "EMPTY"],
                    "primitive_meshes": ["cube", "cylinder", "sphere", "plane", "torus"],
                }
                info(f"Warning: Full capabilities not available, using fallback. _commands_available={_commands_available}")
                return make_response(data=data)

        # Command handlers (property.set, property.get, operator.call, etc.)
        elif _commands_available and action in COMMAND_HANDLERS:
            result = dispatch_command(action, target, params)
            if result.get("success"):
                return make_response(data=result.get("data"), warnings=result.get("warnings"))
            else:
                # Map command errors to protocol error codes
                error_msg = result.get("error", "Unknown error")
                error_code = None
                if _protocol_available:
                    if "not found" in error_msg.lower():
                        error_code = protocol.ErrorCode.NOT_FOUND
                    elif "invalid" in error_msg.lower() or "param" in error_msg.lower():
                        error_code = protocol.ErrorCode.INVALID_PARAMS
                    elif "context" in error_msg.lower() or "mode" in error_msg.lower():
                        error_code = protocol.ErrorCode.INVALID_CONTEXT
                    elif "operator" in error_msg.lower():
                        error_code = protocol.ErrorCode.OPERATOR_FAILED
                    else:
                        error_code = protocol.ErrorCode.INTERNAL_ERROR
                return make_response(error=error_msg, error_code=error_code)

        else:
            return make_response(
                error=f"Unknown action: {action}",
                error_code=protocol.ErrorCode.NOT_FOUND if _protocol_available else None
            )

    except Exception as e:
        info(f"Error handling request: {e}")
        import traceback
        traceback.print_exc()
        return make_response(
            error=str(e),
            error_code=protocol.ErrorCode.INTERNAL_ERROR if _protocol_available else None
        )

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
            # Some handlers (like protocol.upgrade) handle their own response
            if response is not None:
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

            filepath = bpy.data.filepath or "(unsaved)"

            if is_protocol_v1() and _protocol_available:
                # Native protocol format
                heartbeat = protocol.create_heartbeat(active_obj, mode, filepath)
                _message_queue.put(heartbeat)
            else:
                # Legacy format
                send_to_blendmate({
                    "type": "heartbeat",
                    "active_object": active_obj,
                    "mode": mode,
                    "filepath": filepath,
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
                global _session_protocol_version
                info("WS Connected (on_open)")

                # Reset to legacy mode on new connection
                _session_protocol_version = 0
                info("Session protocol reset to legacy (v0)")

                # Send initial connection event in LEGACY format
                # App will upgrade if it supports v1
                blender_version = ".".join(str(v) for v in bpy.app.version[:3])
                addon_version = "1.0.0"
                filepath = bpy.data.filepath or "(unsaved)"

                # Always send legacy format on connect
                _message_queue.put({
                    "type": "event",
                    "event": "connected",
                    "blender_version": blender_version,
                    "addon_version": addon_version,
                    "filepath": filepath,
                    "supported_protocol_versions": SUPPORTED_PROTOCOL_VERSIONS,
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
            info("Connection lost. Waiting 2s before reconnect...")
            _should_run.wait(timeout=2)

    info("WS Thread exiting (should_run is False)")

def register():
    global _thread
    info("Registering Connection module")

    # Timer registration is now handled by events.registry module

    # Check if old thread is still running (can happen during reload)
    if _thread and _thread.is_alive():
        info("Old WS thread still running - reusing it")
        _should_run.set()  # Make sure it's enabled
        return

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
