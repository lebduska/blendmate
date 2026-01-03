"""
Blendmate Protocol v1

Defines message envelope structure, error codes, and type mappings
for WebSocket communication between Blender addon and Blendmate app.

Message Categories:
- STATE: Read-only queries (state.query, state.snapshot, state.diff)
- COMMAND: Blendmate → Blender actions (command.property, command.object, etc.)
- EVENT: Blender → Blendmate notifications (event.scene.*, event.selection.*, etc.)
"""

import time
import uuid
from typing import Any, Dict, List, Optional, Literal
from enum import Enum


# ============== Protocol Version ==============

PROTOCOL_VERSION = 1


# ============== Error Codes ==============

class ErrorCode(str, Enum):
    """Stable error codes for command responses."""
    OK = "OK"
    INVALID_PARAMS = "INVALID_PARAMS"
    NOT_FOUND = "NOT_FOUND"
    INVALID_CONTEXT = "INVALID_CONTEXT"  # Wrong mode, missing selection, etc.
    OPERATOR_FAILED = "OPERATOR_FAILED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    UNSUPPORTED_VERSION = "UNSUPPORTED_VERSION"
    TIMEOUT = "TIMEOUT"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# ============== Message Sources ==============

class Source(str, Enum):
    """Message origin identifier for audit trail."""
    BLENDER_ADDON = "blender_addon"
    BLENDMATE = "blendmate"
    AI = "ai"


# ============== Event Type Mappings ==============

# Maps old event names to new hierarchical type strings
EVENT_TYPE_MAP = {
    # Scene events
    "connected": "event.scene.connected",
    "load_post": "event.scene.file_loaded",
    "save_post": "event.scene.file_saved",

    # Depsgraph events
    "depsgraph_update": "event.depsgraph.updated",

    # Timeline events
    "frame_change": "event.timeline.frame_changed",

    # Context events (GN node)
    "context": "event.node.active_changed",
}

# Reverse map for legacy support
LEGACY_EVENT_MAP = {v: k for k, v in EVENT_TYPE_MAP.items()}


# ============== Envelope Creation ==============

def create_envelope(
    msg_type: str,
    body: Dict[str, Any],
    reply_to: Optional[str] = None,
    source: Source = Source.BLENDER_ADDON,
) -> Dict[str, Any]:
    """
    Create a protocol envelope wrapping a message body.

    Args:
        msg_type: Hierarchical type string (e.g., "event.selection.changed")
        body: The message payload
        reply_to: ID of the message this is responding to (for responses)
        source: Origin of the message

    Returns:
        Complete envelope dict ready for JSON serialization
    """
    envelope = {
        "v": PROTOCOL_VERSION,
        "type": msg_type,
        "ts": int(time.time() * 1000),  # Milliseconds since epoch
        "id": str(uuid.uuid4())[:8],  # Short UUID for readability
        "source": source.value,
        "body": body,
    }

    if reply_to:
        envelope["reply_to"] = reply_to

    return envelope


def create_response(
    request_id: str,
    ok: bool,
    data: Optional[Dict[str, Any]] = None,
    error_code: Optional[ErrorCode] = None,
    error_message: Optional[str] = None,
    error_data: Optional[Any] = None,
    warnings: Optional[List[str]] = None,
    action: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a command response envelope.

    Args:
        request_id: ID of the request being responded to
        ok: Whether the command succeeded
        data: Response payload (on success)
        error_code: Error code (on failure)
        error_message: Human-readable error message
        error_data: Additional error context
        warnings: Non-fatal warnings
        action: The action that was requested (for frontend routing)

    Returns:
        Response envelope
    """
    body = {"ok": ok}

    # Include action for frontend routing
    if action:
        body["action"] = action

    if ok:
        if data is not None:
            body["data"] = data
    else:
        body["error"] = {
            "code": (error_code or ErrorCode.INTERNAL_ERROR).value,
            "message": error_message or "Unknown error",
        }
        if error_data is not None:
            body["error"]["data"] = error_data

    if warnings:
        body["warnings"] = warnings

    return create_envelope(
        msg_type="response",
        body=body,
        reply_to=request_id,
    )


def create_event(
    event_type: str,
    body: Dict[str, Any],
    legacy_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create an event envelope with optional legacy payload.

    Args:
        event_type: New hierarchical type (e.g., "event.selection.changed")
        body: Event payload
        legacy_type: Old event type for backwards compatibility

    Returns:
        Event envelope
    """
    # Include legacy format in body during transition period
    if legacy_type:
        body["_legacy"] = {
            "type": "event",
            "event": legacy_type,
        }

    return create_envelope(
        msg_type=event_type,
        body=body,
    )


# ============== Event Body Contracts ==============

def event_selection_changed(
    active_object_id: Optional[str],
    selected_ids: List[str],
    mode: str,
) -> Dict[str, Any]:
    """
    Create body for event.selection.changed

    Emitted: When selection changes in viewport
    Cache impact: Invalidate selection-dependent UI
    """
    return {
        "active_object_id": active_object_id,
        "selected_ids": selected_ids,
        "mode": mode,
    }


def event_scene_file_loaded(
    filepath: str,
    blender_version: str,
    addon_version: str,
) -> Dict[str, Any]:
    """
    Create body for event.scene.file_loaded

    Emitted: After .blend file is loaded
    Cache impact: Invalidate ALL caches (full reload)
    """
    return {
        "filepath": filepath,
        "blender_version": blender_version,
        "addon_version": addon_version,
    }


def event_scene_file_saved(
    filepath: str,
) -> Dict[str, Any]:
    """
    Create body for event.scene.file_saved

    Emitted: After .blend file is saved
    Cache impact: Update filepath, mark as saved
    """
    return {
        "filepath": filepath,
    }


def event_depsgraph_updated(
    changed_object_ids: List[str],
    geometry_changed_ids: List[str],
    reason: Literal["user", "command", "undo", "redo", "unknown"] = "unknown",
    batch_id: Optional[str] = None,
    batch_size: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Create body for event.depsgraph.updated

    Emitted: When dependency graph updates (throttled)
    Cache impact: Invalidate geometry cache for changed objects
    """
    body = {
        "changed_object_ids": changed_object_ids,
        "geometry_changed_ids": geometry_changed_ids,
        "reason": reason,
    }

    if batch_id:
        body["batch_id"] = batch_id
        body["batch_size"] = batch_size or 1

    return body


def event_timeline_frame_changed(
    frame: int,
) -> Dict[str, Any]:
    """
    Create body for event.timeline.frame_changed

    Emitted: When timeline frame changes (throttled)
    Cache impact: May need geometry refresh for animated objects
    """
    return {
        "frame": frame,
    }


def event_node_active_changed(
    node_id: str,
    node_tree: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create body for event.node.active_changed

    Emitted: When active GN node changes
    Cache impact: Update node help panel
    """
    return {
        "node_id": node_id,
        "node_tree": node_tree,
    }


def event_scene_connected(
    blender_version: str,
    addon_version: str,
    filepath: str,
) -> Dict[str, Any]:
    """
    Create body for event.scene.connected

    Emitted: When addon connects to Blendmate
    Cache impact: Initialize all state
    """
    return {
        "blender_version": blender_version,
        "addon_version": addon_version,
        "filepath": filepath,
    }


# ============== Heartbeat ==============

def create_heartbeat(
    active_object: Optional[str],
    mode: Optional[str],
    filepath: str,
) -> Dict[str, Any]:
    """
    Create heartbeat envelope.

    Heartbeats are lightweight keep-alive messages with basic context.
    """
    return create_envelope(
        msg_type="heartbeat",
        body={
            "active_object": active_object,
            "mode": mode,
            "filepath": filepath,
        },
    )


# ============== Legacy Compatibility ==============

def wrap_legacy_message(legacy_msg: Dict[str, Any]) -> Dict[str, Any]:
    """
    Wrap a legacy format message in the new envelope.

    Used during transition period to support both formats.
    """
    msg_type = legacy_msg.get("type", "unknown")

    # Map old event types to new
    if msg_type == "event":
        old_event = legacy_msg.get("event", "unknown")
        new_type = EVENT_TYPE_MAP.get(old_event, f"event.legacy.{old_event}")
        body = {k: v for k, v in legacy_msg.items() if k not in ("type", "event")}
        body["_legacy"] = legacy_msg
        return create_envelope(new_type, body)

    elif msg_type == "response":
        # Wrap response with ok/error structure
        request_id = legacy_msg.get("id", "unknown")
        has_error = "error" in legacy_msg
        body = {
            "ok": not has_error,
            "data": legacy_msg.get("data"),
            "_legacy": legacy_msg,
        }
        if has_error:
            body["error"] = {
                "code": ErrorCode.INTERNAL_ERROR.value,
                "message": legacy_msg["error"],
            }
        return create_envelope("response", body, reply_to=request_id)

    elif msg_type == "heartbeat":
        return create_heartbeat(
            legacy_msg.get("active_object"),
            legacy_msg.get("mode"),
            legacy_msg.get("filepath", "(unsaved)"),
        )

    elif msg_type == "context":
        return create_event(
            "event.node.active_changed",
            event_node_active_changed(
                legacy_msg.get("node_id", "unknown"),
                legacy_msg.get("area"),
            ),
            legacy_type="context",
        )

    # Unknown type - wrap as-is
    return create_envelope(f"legacy.{msg_type}", legacy_msg)
