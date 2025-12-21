"""
Internal event data model for Blendmate.

This module defines the normalized Event dataclass that represents
all events flowing through the Blendmate system, regardless of their
source (handler, msgbus, timer, etc.).
"""

import time
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, Optional


@dataclass
class Event:
    """
    Normalized internal event model for Blendmate.
    
    All events in the Blendmate system use this unified structure,
    making it easy to process, log, and transport events consistently.
    
    Attributes:
        type: Semantic event type (e.g., "file.saved", "scene.frame.changed")
        payload: Event-specific data as a JSON-serializable dictionary
        ts: Timestamp when the event was created (Unix timestamp as float)
        source: Optional source of the event (e.g., "handler", "msgbus", "timer")
    """
    
    type: str
    payload: Dict[str, Any] = field(default_factory=dict)
    ts: float = field(default_factory=time.time)
    source: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the event to a JSON-serializable dictionary.
        
        Returns:
            Dictionary representation of the event suitable for JSON serialization.
        """
        return asdict(self)
    
    def to_json_compatible(self) -> Dict[str, Any]:
        """
        Convert to a JSON-compatible dictionary suitable for WebSocket transmission.
        
        This method explicitly returns a dictionary structure that matches the
        WebSocket protocol expected by the Blendmate desktop app. While currently
        identical to to_dict(), keeping this separate allows for future protocol
        changes (e.g., adding API version, filtering fields) without affecting
        other dictionary conversions.
        
        Returns:
            Dictionary with all values safe for JSON serialization.
        """
        return {
            "type": self.type,
            "payload": self.payload,
            "ts": self.ts,
            "source": self.source,
        }
    
    @classmethod
    def from_handler(cls, event_type: str, payload: Dict[str, Any]) -> "Event":
        """
        Create an Event from a Blender handler callback.
        
        Args:
            event_type: The normalized event type string
            payload: Event-specific data
            
        Returns:
            A new Event instance with source set to "handler"
        """
        return cls(type=event_type, payload=payload, source="handler")
    
    @classmethod
    def from_msgbus(cls, event_type: str, payload: Dict[str, Any]) -> "Event":
        """
        Create an Event from a Blender msgbus subscription.
        
        Args:
            event_type: The normalized event type string
            payload: Event-specific data
            
        Returns:
            A new Event instance with source set to "msgbus"
        """
        return cls(type=event_type, payload=payload, source="msgbus")
    
    @classmethod
    def from_timer(cls, event_type: str, payload: Dict[str, Any]) -> "Event":
        """
        Create an Event from a Blender timer callback.
        
        Args:
            event_type: The normalized event type string
            payload: Event-specific data
            
        Returns:
            A new Event instance with source set to "timer"
        """
        return cls(type=event_type, payload=payload, source="timer")
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        source_str = f" [{self.source}]" if self.source else ""
        payload_preview = str(self.payload)[:50]
        if len(str(self.payload)) > 50:
            payload_preview += "..."
        return f"Event(type={self.type!r}, payload={payload_preview}{source_str})"
