"""
Minimal debounce/throttle layer for high-frequency Blender events.

Coalesces events within a 100ms window and flushes via bpy.app.timers.
"""

import time
import bpy
from typing import Dict, Any, Set, Optional

# Global state
_pending_events: Dict[str, Dict[str, Any]] = {}
_dirty_reasons: Dict[str, Set[str]] = {}
_throttle_interval = 0.1  # Fixed 100ms
_send_function = None

def throttle_event(event_type: str, event_data: Dict[str, Any], reason: Optional[str] = None):
    """Queue an event for throttled delivery (100ms window)."""
    global _pending_events, _dirty_reasons
    
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
    global _pending_events, _dirty_reasons
    
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
            
            # Add dirty reasons if available
            if event_type in _dirty_reasons and _dirty_reasons[event_type]:
                event_data["reasons"] = list(_dirty_reasons[event_type])
            
            events_to_send.append(event_data)
            
            # Remove from pending
            del _pending_events[event_type]
            if event_type in _dirty_reasons:
                del _dirty_reasons[event_type]
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
    global _pending_events, _dirty_reasons
    
    if not _pending_events:
        return
    
    if not _send_function:
        return
    
    for event_type, event_info in _pending_events.items():
        event_data = event_info["data"].copy()
        
        # Add dirty reasons if available
        if event_type in _dirty_reasons and _dirty_reasons[event_type]:
            event_data["reasons"] = list(_dirty_reasons[event_type])
        
        _send_function(event_data)
    
    # Clear all pending
    _pending_events.clear()
    _dirty_reasons.clear()

def register():
    """Register the throttle system."""
    global _pending_events, _dirty_reasons, _send_function
    
    _pending_events.clear()
    _dirty_reasons.clear()
    
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
