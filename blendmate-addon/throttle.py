"""
Debounce/throttle layer for high-frequency Blender events.

This module provides a shared mechanism to coalesce high-frequency events
(like depsgraph_update_post and frame_change_post) within configurable time
windows, and flush them via bpy.app.timers to avoid UI stutter.
"""

import time
import bpy
from typing import Dict, Any, Set, Optional

# Global state for throttling
_pending_events: Dict[str, Dict[str, Any]] = {}
_dirty_reasons: Dict[str, Set[str]] = {}
_flush_timer_registered = False
_throttle_interval = 0.1  # Default 100ms

def info(msg):
    print(f"[Blendmate:Throttle] {msg}")

def set_throttle_interval(interval: float):
    """Set the throttle interval in seconds (e.g., 0.05 for 50ms, 0.2 for 200ms)."""
    global _throttle_interval
    _throttle_interval = max(0.01, min(1.0, interval))  # Clamp between 10ms and 1s
    info(f"Throttle interval set to {_throttle_interval * 1000:.0f}ms")

def get_throttle_interval() -> float:
    """Get the current throttle interval in seconds."""
    return _throttle_interval

def throttle_event(event_type: str, event_data: Dict[str, Any], reason: Optional[str] = None):
    """
    Queue an event for throttled delivery.
    
    Args:
        event_type: Unique identifier for the event type (e.g., "frame_change", "depsgraph_update")
        event_data: The event payload to send
        reason: Optional reason/tag for the event (used for dirty tracking)
    """
    global _pending_events, _dirty_reasons, _flush_timer_registered
    
    # Store the latest event data (overwriting previous)
    _pending_events[event_type] = {
        "data": event_data,
        "timestamp": time.time()
    }
    
    # Track the reason for this event
    if reason:
        if event_type not in _dirty_reasons:
            _dirty_reasons[event_type] = set()
        _dirty_reasons[event_type].add(reason)
    
    # Ensure flush timer is registered
    if not _flush_timer_registered:
        _register_flush_timer()

def _register_flush_timer():
    """Register the flush timer if not already registered."""
    global _flush_timer_registered
    
    if not bpy.app.timers.is_registered(_flush_pending_events):
        bpy.app.timers.register(_flush_pending_events, first_interval=_throttle_interval)
        _flush_timer_registered = True
        info("Flush timer registered")

def _flush_pending_events() -> Optional[float]:
    """
    Timer callback to flush pending throttled events.
    
    Returns:
        float: Interval until next call, or None to stop timer
    """
    global _pending_events, _dirty_reasons, _flush_timer_registered
    
    if not _pending_events:
        # No pending events, unregister timer
        _flush_timer_registered = False
        return None
    
    current_time = time.time()
    events_to_send = []
    
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
    
    # Send all ready events
    if events_to_send:
        from . import connection
        for event_data in events_to_send:
            connection.send_to_blendmate(event_data)
    
    # Continue timer if there are still pending events
    if _pending_events:
        return _throttle_interval
    else:
        _flush_timer_registered = False
        return None

def flush_immediate():
    """Force immediate flush of all pending events."""
    global _pending_events, _dirty_reasons
    
    if not _pending_events:
        return
    
    from . import connection
    
    for event_type, event_info in _pending_events.items():
        event_data = event_info["data"].copy()
        
        # Add dirty reasons if available
        if event_type in _dirty_reasons and _dirty_reasons[event_type]:
            event_data["reasons"] = list(_dirty_reasons[event_type])
        
        connection.send_to_blendmate(event_data)
    
    # Clear all pending
    _pending_events.clear()
    _dirty_reasons.clear()

def register():
    """Register the throttle system."""
    global _pending_events, _dirty_reasons, _flush_timer_registered
    
    info("Registering throttle system")
    _pending_events.clear()
    _dirty_reasons.clear()
    _flush_timer_registered = False

def unregister():
    """Unregister the throttle system and flush any pending events."""
    global _flush_timer_registered
    
    info("Unregistering throttle system")
    
    # Flush any pending events before shutdown
    flush_immediate()
    
    # Unregister timer if registered
    if bpy.app.timers.is_registered(_flush_pending_events):
        bpy.app.timers.unregister(_flush_pending_events)
        _flush_timer_registered = False
