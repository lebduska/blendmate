"""
Unit tests for the Blendmate event model.

Tests the normalized event model including Event dataclass,
event types, and mapping functions.
"""

import unittest
import time
import sys
import os

# Add the root directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, 'blendmate-addon'))

# Import the event modules
from events.model import Event
from events.types import EventType, EVENT_TYPE_DESCRIPTIONS
from events.mapping import (
    map_handler_to_event,
    create_file_saved_event,
    create_file_loaded_event,
    create_frame_changed_event,
    create_node_active_event,
    create_depsgraph_updated_event,
    HANDLER_TO_EVENT_TYPE,
)


class TestEventModel(unittest.TestCase):
    """Test the Event dataclass."""
    
    def test_event_creation_minimal(self):
        """Test creating an event with just a type."""
        event = Event(type=EventType.FILE_SAVED)
        
        self.assertEqual(event.type, EventType.FILE_SAVED)
        self.assertEqual(event.payload, {})
        self.assertIsNotNone(event.ts)
        self.assertIsNone(event.source)
    
    def test_event_creation_full(self):
        """Test creating an event with all fields."""
        ts = time.time()
        payload = {"filename": "test.blend"}
        
        event = Event(
            type=EventType.FILE_SAVED,
            payload=payload,
            ts=ts,
            source="handler"
        )
        
        self.assertEqual(event.type, EventType.FILE_SAVED)
        self.assertEqual(event.payload, payload)
        self.assertEqual(event.ts, ts)
        self.assertEqual(event.source, "handler")
    
    def test_event_to_dict(self):
        """Test converting event to dictionary."""
        event = Event(
            type=EventType.FRAME_CHANGED,
            payload={"frame": 42},
            source="handler"
        )
        
        event_dict = event.to_dict()
        
        self.assertEqual(event_dict["type"], EventType.FRAME_CHANGED)
        self.assertEqual(event_dict["payload"]["frame"], 42)
        self.assertEqual(event_dict["source"], "handler")
        self.assertIn("ts", event_dict)
    
    def test_event_to_json_compatible(self):
        """Test converting event to JSON-compatible format."""
        event = Event(
            type=EventType.NODE_ACTIVE,
            payload={"node_id": "GeometryNodeMeshCube"},
            source="handler"
        )
        
        json_data = event.to_json_compatible()
        
        self.assertEqual(json_data["type"], EventType.NODE_ACTIVE)
        self.assertEqual(json_data["payload"]["node_id"], "GeometryNodeMeshCube")
        self.assertEqual(json_data["source"], "handler")
        self.assertIsInstance(json_data["ts"], float)
    
    def test_event_from_handler(self):
        """Test creating an event from a handler."""
        event = Event.from_handler(
            EventType.FILE_SAVED,
            {"filename": "test.blend"}
        )
        
        self.assertEqual(event.source, "handler")
        self.assertEqual(event.type, EventType.FILE_SAVED)
    
    def test_event_from_msgbus(self):
        """Test creating an event from msgbus."""
        event = Event.from_msgbus(
            EventType.OBJECT_ADDED,
            {"object_name": "Cube"}
        )
        
        self.assertEqual(event.source, "msgbus")
        self.assertEqual(event.type, EventType.OBJECT_ADDED)
    
    def test_event_from_timer(self):
        """Test creating an event from a timer."""
        event = Event.from_timer(
            EventType.CONTEXT_CHANGED,
            {}
        )
        
        self.assertEqual(event.source, "timer")
        self.assertEqual(event.type, EventType.CONTEXT_CHANGED)
    
    def test_event_repr(self):
        """Test string representation of event."""
        event = Event(
            type=EventType.FILE_SAVED,
            payload={"filename": "test.blend"},
            source="handler"
        )
        
        repr_str = repr(event)
        
        self.assertIn("Event", repr_str)
        self.assertIn("file.saved", repr_str)
        self.assertIn("handler", repr_str)


class TestEventTypes(unittest.TestCase):
    """Test event type constants."""
    
    def test_event_type_constants_exist(self):
        """Test that all main event type constants are defined."""
        self.assertTrue(hasattr(EventType, 'FILE_SAVED'))
        self.assertTrue(hasattr(EventType, 'FILE_LOADED'))
        self.assertTrue(hasattr(EventType, 'FRAME_CHANGED'))
        self.assertTrue(hasattr(EventType, 'NODE_ACTIVE'))
        self.assertTrue(hasattr(EventType, 'DEPSGRAPH_UPDATED'))
    
    def test_event_type_naming_convention(self):
        """Test that event types follow the dot notation convention."""
        event_types = [
            EventType.FILE_SAVED,
            EventType.FILE_LOADED,
            EventType.FRAME_CHANGED,
            EventType.NODE_ACTIVE,
            EventType.DEPSGRAPH_UPDATED,
        ]
        
        for event_type in event_types:
            self.assertIn(".", event_type, f"Event type {event_type} should use dot notation")
    
    def test_event_descriptions_match_types(self):
        """Test that all event types have descriptions."""
        # Get all EventType constants
        event_type_attrs = [
            getattr(EventType, attr) 
            for attr in dir(EventType) 
            if not attr.startswith('_') and isinstance(getattr(EventType, attr), str)
        ]
        
        for event_type in event_type_attrs:
            self.assertIn(
                event_type, 
                EVENT_TYPE_DESCRIPTIONS,
                f"Event type {event_type} is missing a description"
            )


class TestEventMapping(unittest.TestCase):
    """Test event mapping functions."""
    
    def test_handler_to_event_type_mapping(self):
        """Test that common Blender handlers are mapped."""
        self.assertIn("save_post", HANDLER_TO_EVENT_TYPE)
        self.assertIn("load_post", HANDLER_TO_EVENT_TYPE)
        self.assertIn("frame_change_post", HANDLER_TO_EVENT_TYPE)
        self.assertIn("depsgraph_update_post", HANDLER_TO_EVENT_TYPE)
    
    def test_map_handler_to_event_known(self):
        """Test mapping a known handler to an event."""
        event = map_handler_to_event(
            "save_post",
            {"filename": "test.blend"}
        )
        
        self.assertEqual(event.type, EventType.FILE_SAVED)
        self.assertEqual(event.source, "handler")
        self.assertEqual(event.payload["filename"], "test.blend")
    
    def test_map_handler_to_event_unknown(self):
        """Test mapping an unknown handler falls back to CONTEXT_CHANGED."""
        event = map_handler_to_event(
            "unknown_handler",
            {"data": "test"}
        )
        
        self.assertEqual(event.type, EventType.CONTEXT_CHANGED)
        self.assertEqual(event.source, "handler")
    
    def test_create_file_saved_event(self):
        """Test creating a file saved event."""
        event = create_file_saved_event("/path/to/test.blend")
        
        self.assertEqual(event.type, EventType.FILE_SAVED)
        self.assertEqual(event.payload["filename"], "/path/to/test.blend")
        self.assertEqual(event.source, "handler")
    
    def test_create_file_loaded_event(self):
        """Test creating a file loaded event."""
        event = create_file_loaded_event("/path/to/test.blend")
        
        self.assertEqual(event.type, EventType.FILE_LOADED)
        self.assertEqual(event.payload["filename"], "/path/to/test.blend")
        self.assertEqual(event.source, "handler")
    
    def test_create_frame_changed_event(self):
        """Test creating a frame changed event."""
        event = create_frame_changed_event(42, "Scene")
        
        self.assertEqual(event.type, EventType.FRAME_CHANGED)
        self.assertEqual(event.payload["frame"], 42)
        self.assertEqual(event.payload["scene_name"], "Scene")
        self.assertEqual(event.source, "handler")
    
    def test_create_frame_changed_event_no_scene(self):
        """Test creating a frame changed event without scene name."""
        event = create_frame_changed_event(42)
        
        self.assertEqual(event.type, EventType.FRAME_CHANGED)
        self.assertEqual(event.payload["frame"], 42)
        self.assertNotIn("scene_name", event.payload)
    
    def test_create_node_active_event(self):
        """Test creating a node active event."""
        event = create_node_active_event("GeometryNodeMeshCube", "GeometryNodeTree")
        
        self.assertEqual(event.type, EventType.NODE_ACTIVE)
        self.assertEqual(event.payload["node_id"], "GeometryNodeMeshCube")
        self.assertEqual(event.payload["node_tree_type"], "GeometryNodeTree")
        self.assertEqual(event.source, "handler")
    
    def test_create_node_active_event_no_tree_type(self):
        """Test creating a node active event without tree type."""
        event = create_node_active_event("GeometryNodeMeshCube")
        
        self.assertEqual(event.type, EventType.NODE_ACTIVE)
        self.assertEqual(event.payload["node_id"], "GeometryNodeMeshCube")
        self.assertNotIn("node_tree_type", event.payload)
    
    def test_create_depsgraph_updated_event(self):
        """Test creating a depsgraph updated event."""
        updates = ["Object", "Mesh"]
        event = create_depsgraph_updated_event(updates, "Scene")
        
        self.assertEqual(event.type, EventType.DEPSGRAPH_UPDATED)
        self.assertEqual(event.payload["updates"], updates)
        self.assertEqual(event.payload["scene_name"], "Scene")
        self.assertEqual(event.source, "handler")
    
    def test_create_depsgraph_updated_event_minimal(self):
        """Test creating a minimal depsgraph updated event."""
        event = create_depsgraph_updated_event()
        
        self.assertEqual(event.type, EventType.DEPSGRAPH_UPDATED)
        self.assertEqual(event.payload, {})
        self.assertEqual(event.source, "handler")
    
    def test_map_handler_with_extract_payload(self):
        """Test mapping a handler with a payload extraction function."""
        def extract_fn():
            return {"custom": "data"}
        
        event = map_handler_to_event(
            "save_post",
            extract_payload=extract_fn
        )
        
        self.assertEqual(event.payload["custom"], "data")


class TestEventIntegration(unittest.TestCase):
    """Integration tests for the event system."""
    
    def test_event_serialization_roundtrip(self):
        """Test that events can be serialized and match expected format."""
        import json
        
        event = Event.from_handler(
            EventType.FILE_SAVED,
            {"filename": "test.blend"}
        )
        
        # Serialize to JSON
        json_str = json.dumps(event.to_json_compatible())
        
        # Deserialize back
        data = json.loads(json_str)
        
        self.assertEqual(data["type"], EventType.FILE_SAVED)
        self.assertEqual(data["payload"]["filename"], "test.blend")
        self.assertEqual(data["source"], "handler")
        self.assertIsInstance(data["ts"], float)
    
    def test_multiple_events_different_timestamps(self):
        """Test that multiple events have different timestamps."""
        event1 = Event(type=EventType.FRAME_CHANGED, payload={"frame": 1})
        time.sleep(0.001)  # Small delay to ensure different timestamp
        event2 = Event(type=EventType.FRAME_CHANGED, payload={"frame": 2})
        
        self.assertNotEqual(event1.ts, event2.ts)
        self.assertLess(event1.ts, event2.ts)


if __name__ == '__main__':
    unittest.main()
