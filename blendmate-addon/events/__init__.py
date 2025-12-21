"""
Blendmate internal event model.

This package provides a normalized event model for Blender events,
abstracting away the differences between handlers, msgbus, and timers.
"""

from .model import Event
from .types import EventType
from .mapping import map_handler_to_event

__all__ = ["Event", "EventType", "map_handler_to_event"]
