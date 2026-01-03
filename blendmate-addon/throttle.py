"""
Minimal debounce/throttle layer for high-frequency Blender events.

Coalesces events within a 100ms window and flushes via bpy.app.timers.
Supports protocol v1 envelope format with batch tracking.
"""

import time
import uuid
import bpy
from typing import Dict, Any, Set, Optional, List

# Protocol import
try:
    from . import protocol
    _protocol_available = True
except ImportError:
    _protocol_available = False

# Connection import for session state check
try:
    from . import connection as _connection
    _connection_available = True
except ImportError:
    _connection_available = False


def _use_v1():
    """Check if we should use protocol v1 format."""
    return (_connection_available and _connection.is_protocol_v1() and _protocol_available)

# Global state
_pending_events: Dict[str, Dict[str, Any]] = {}
_dirty_reasons: Dict[str, Set[str]] = {}
_coalesced_data: Dict[str, List[Any]] = {}  # For merging arrays across events
_event_count: Dict[str, int] = {}  # Count of coalesced events per type
_new_type_map: Dict[str, str] = {}  # Maps old event types to new protocol types
_throttle_interval = 0.1  # Fixed 100ms
_send_function = None


def throttle_event(
    event_type: str,
    event_data: Dict[str, Any],
    reason: Optional[str] = None,
    new_type: Optional[str] = None,
):
    """
    Queue an event for throttled delivery (100ms window).

    Args:
        event_type: Event type key for coalescing (e.g., "depsgraph_update")
        event_data: Event payload
        reason: Reason tag for debugging/audit
        new_type: New protocol type string (e.g., "event.depsgraph.updated")
    """
    global _pending_events, _dirty_reasons, _coalesced_data, _event_count, _new_type_map

    # Track new type mapping
    if new_type:
        _new_type_map[event_type] = new_type

    # Coalesce array fields (changed_object_ids, geometry_changed_ids)
    if event_type not in _coalesced_data:
        _coalesced_data[event_type] = {
            "changed_object_ids": set(),
            "geometry_changed_ids": set(),
            "changed_objects": set(),  # Legacy field
            "geometry_changed": set(),  # Legacy field
        }
        _event_count[event_type] = 0

    # Merge arrays from new event into coalesced data
    coalesced = _coalesced_data[event_type]
    for field in ["changed_object_ids", "geometry_changed_ids", "changed_objects", "geometry_changed"]:
        if field in event_data and isinstance(event_data[field], (list, set)):
            coalesced[field].update(event_data[field])

    _event_count[event_type] += 1

    # Store latest event data (will be enhanced with coalesced arrays on flush)
    _pending_events[event_type] = {
        "data": event_data,
        "timestamp": time.time()
    }

    if reason:
        if event_type not in _dirty_reasons:
            _dirty_reasons[event_type] = set()
        _dirty_reasons[event_type].add(reason)

    _register_flush_timer()

def _register_flush_timer():
    """Register the flush timer if not already registered."""
    if not bpy.app.timers.is_registered(_flush_pending_events):
        bpy.app.timers.register(_flush_pending_events, first_interval=_throttle_interval)

def _flush_pending_events() -> Optional[float]:
    """
    Timer callback to flush pending throttled events.

    Returns:
        float: Interval until next call, or None to stop timer
    """
    global _pending_events, _dirty_reasons, _coalesced_data, _event_count, _new_type_map

    if not _pending_events:
        # No pending events, stop timer
        return None

    current_time = time.time()
    events_to_send = []
    next_flush_time = None

    # Check which events are ready to flush
    for event_type, event_info in list(_pending_events.items()):
        time_since_event = current_time - event_info["timestamp"]

        # Flush if enough time has passed
        if time_since_event >= _throttle_interval:
            event_data = event_info["data"].copy()

            # Replace arrays with coalesced data
            if event_type in _coalesced_data:
                coalesced = _coalesced_data[event_type]
                for field in ["changed_object_ids", "geometry_changed_ids", "changed_objects", "geometry_changed"]:
                    if coalesced[field]:
                        event_data[field] = list(coalesced[field])

            # Add batch info if multiple events were coalesced
            batch_size = _event_count.get(event_type, 1)
            if batch_size > 1:
                event_data["batch_id"] = str(uuid.uuid4())[:8]
                event_data["batch_size"] = batch_size

            # Add dirty reasons if available
            if event_type in _dirty_reasons and _dirty_reasons[event_type]:
                event_data["reasons"] = list(_dirty_reasons[event_type])

            # Wrap in protocol envelope if in v1 mode
            new_type = _new_type_map.get(event_type)
            if _use_v1() and new_type:
                # Protocol v1: create clean envelope (no legacy fields)
                envelope = protocol.create_event(new_type, event_data)
                events_to_send.append(envelope)
            else:
                # Legacy mode: send raw event data
                events_to_send.append(event_data)

            # Clean up state for this event type
            del _pending_events[event_type]
            if event_type in _dirty_reasons:
                del _dirty_reasons[event_type]
            if event_type in _coalesced_data:
                del _coalesced_data[event_type]
            if event_type in _event_count:
                del _event_count[event_type]
            if event_type in _new_type_map:
                del _new_type_map[event_type]
        else:
            # Calculate when this event should be flushed
            time_until_flush = _throttle_interval - time_since_event
            if next_flush_time is None or time_until_flush < next_flush_time:
                next_flush_time = time_until_flush

    # Send all ready events
    if events_to_send and _send_function:
        for event_data in events_to_send:
            _send_function(event_data)

    # Return calculated interval or stop timer if no pending events
    if _pending_events and next_flush_time is not None:
        # Return the time until the next event should be flushed
        return max(0.01, next_flush_time)  # Minimum 10ms
    else:
        return None

def flush_immediate():
    """Force immediate flush of all pending events."""
    global _pending_events, _dirty_reasons, _coalesced_data, _event_count, _new_type_map

    if not _pending_events:
        return

    if not _send_function:
        return

    for event_type, event_info in _pending_events.items():
        event_data = event_info["data"].copy()

        # Replace arrays with coalesced data
        if event_type in _coalesced_data:
            coalesced = _coalesced_data[event_type]
            for field in ["changed_object_ids", "geometry_changed_ids", "changed_objects", "geometry_changed"]:
                if coalesced[field]:
                    event_data[field] = list(coalesced[field])

        # Add batch info
        batch_size = _event_count.get(event_type, 1)
        if batch_size > 1:
            event_data["batch_id"] = str(uuid.uuid4())[:8]
            event_data["batch_size"] = batch_size

        # Add dirty reasons if available
        if event_type in _dirty_reasons and _dirty_reasons[event_type]:
            event_data["reasons"] = list(_dirty_reasons[event_type])

        # Wrap in protocol envelope if in v1 mode
        new_type = _new_type_map.get(event_type)
        if _use_v1() and new_type:
            # Protocol v1: create clean envelope (no legacy fields)
            envelope = protocol.create_event(new_type, event_data)
            _send_function(envelope)
        else:
            # Legacy mode: send raw event data
            _send_function(event_data)

    # Clear all state
    _pending_events.clear()
    _dirty_reasons.clear()
    _coalesced_data.clear()
    _event_count.clear()
    _new_type_map.clear()


def register():
    """Register the throttle system."""
    global _pending_events, _dirty_reasons, _coalesced_data, _event_count, _new_type_map, _send_function

    _pending_events.clear()
    _dirty_reasons.clear()
    _coalesced_data.clear()
    _event_count.clear()
    _new_type_map.clear()

    try:
        from . import connection
        _send_function = connection.send_to_blendmate
    except ImportError:
        pass


def unregister():
    """Unregister the throttle system and flush pending events."""
    flush_immediate()

    if bpy.app.timers.is_registered(_flush_pending_events):
        bpy.app.timers.unregister(_flush_pending_events)
