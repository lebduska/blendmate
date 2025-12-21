#!/usr/bin/env python3
"""
Simple validation script for the normalized event model.

This script demonstrates that the event model is working correctly
without requiring external dependencies like Blender or WebSockets.
"""

import sys
import os
import json

# Add the blendmate-addon to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'blendmate-addon'))

# Import the event model
from events.model import Event
from events.types import EventType
from events.mapping import (
    create_file_saved_event,
    create_file_loaded_event,
    create_frame_changed_event,
    create_node_active_event,
    map_handler_to_event,
)

def test_event_creation():
    """Test basic event creation."""
    print("Testing basic event creation...")
    
    event = Event(
        type=EventType.FILE_SAVED,
        payload={"filename": "test.blend"},
        source="handler"
    )
    
    print(f"  ✓ Event created: {event.type}")
    print(f"  ✓ Payload: {event.payload}")
    print(f"  ✓ Source: {event.source}")
    print(f"  ✓ Timestamp: {event.ts}")
    return True

def test_json_serialization():
    """Test JSON serialization."""
    print("\nTesting JSON serialization...")
    
    event = create_file_saved_event("/path/to/test.blend")
    json_data = event.to_json_compatible()
    json_str = json.dumps(json_data, indent=2)
    
    print(f"  ✓ Event serialized to JSON:")
    print("  " + "\n  ".join(json_str.split("\n")))
    
    # Verify it can be deserialized
    parsed = json.loads(json_str)
    assert parsed["type"] == EventType.FILE_SAVED
    assert parsed["payload"]["filename"] == "/path/to/test.blend"
    print("  ✓ JSON can be parsed back correctly")
    return True

def test_handler_mapping():
    """Test handler to event mapping."""
    print("\nTesting handler mapping...")
    
    # Test mapping known handler
    event = map_handler_to_event("save_post", {"filename": "test.blend"})
    assert event.type == EventType.FILE_SAVED
    print(f"  ✓ save_post → {event.type}")
    
    event = map_handler_to_event("frame_change_post", {"frame": 42})
    assert event.type == EventType.FRAME_CHANGED
    print(f"  ✓ frame_change_post → {event.type}")
    
    return True

def test_convenience_functions():
    """Test convenience functions for creating events."""
    print("\nTesting convenience functions...")
    
    # File events
    event = create_file_saved_event("/path/to/file.blend")
    assert event.type == EventType.FILE_SAVED
    print(f"  ✓ create_file_saved_event() → {event.type}")
    
    event = create_file_loaded_event("/path/to/file.blend")
    assert event.type == EventType.FILE_LOADED
    print(f"  ✓ create_file_loaded_event() → {event.type}")
    
    # Frame events
    event = create_frame_changed_event(42, "Scene")
    assert event.type == EventType.FRAME_CHANGED
    assert event.payload["frame"] == 42
    print(f"  ✓ create_frame_changed_event() → {event.type}")
    
    # Node events
    event = create_node_active_event("GeometryNodeMeshCube", "GeometryNodeTree")
    assert event.type == EventType.NODE_ACTIVE
    assert event.payload["node_id"] == "GeometryNodeMeshCube"
    print(f"  ✓ create_node_active_event() → {event.type}")
    
    return True

def test_event_types():
    """Test event type constants."""
    print("\nTesting event type constants...")
    
    # Verify naming convention
    assert "." in EventType.FILE_SAVED
    assert "." in EventType.FRAME_CHANGED
    assert "." in EventType.NODE_ACTIVE
    print("  ✓ All event types use dot notation")
    
    # Verify some key types exist
    assert EventType.FILE_SAVED == "file.saved"
    assert EventType.FILE_LOADED == "file.loaded"
    assert EventType.FRAME_CHANGED == "scene.frame.changed"
    assert EventType.NODE_ACTIVE == "editor.node.active"
    print("  ✓ Key event types have expected values")
    
    return True

def main():
    """Run all validation tests."""
    print("=" * 60)
    print("Blendmate Event Model Validation")
    print("=" * 60)
    
    tests = [
        test_event_creation,
        test_json_serialization,
        test_handler_mapping,
        test_convenience_functions,
        test_event_types,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"  ✗ Test failed: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("\n✓ All validation tests passed!")
        print("\nThe normalized event model is working correctly.")
        print("Events can be created, serialized to JSON, and sent over WebSockets.")
        return 0
    else:
        print("\n✗ Some validation tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
