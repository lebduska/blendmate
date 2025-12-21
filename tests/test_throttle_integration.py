"""
Integration test demonstrating throttle behavior.

This test simulates high-frequency events and verifies that they are
properly throttled and coalesced.
"""

import sys
import os
import time
from unittest.mock import MagicMock

# Add the root directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(root_dir)

# Import mock_bpy before any addon modules
from tests.addon.mock_bpy import mock_bpy

# Mock the connection module
sys.modules['blendmate-addon.connection'] = MagicMock()

# Now we can import throttle
sys.path.append(os.path.join(root_dir, 'blendmate-addon'))
import throttle

def test_throttle_integration():
    """
    Demonstrate throttle behavior with high-frequency events.
    """
    print("=" * 60)
    print("Throttle Integration Test")
    print("=" * 60)
    
    # Setup
    sent_events = []
    
    def mock_send(data):
        sent_events.append(data)
        print(f"Event sent: {data}")
    
    throttle._send_function = mock_send
    throttle.set_throttle_interval(0.05)  # 50ms for faster testing
    
    print(f"\nThrottle interval: {throttle.get_throttle_interval() * 1000:.0f}ms")
    print("\nSimulating high-frequency events...")
    
    # Simulate 10 rapid frame changes (like during playback)
    start_time = time.time()
    for frame in range(1, 11):
        throttle.throttle_event(
            "frame_change",
            {"type": "event", "event": "frame_change", "frame": frame},
            reason=f"frame_{frame}"
        )
        time.sleep(0.01)  # 10ms between events (100 fps)
    
    print(f"\nGenerated 10 events in {(time.time() - start_time) * 1000:.0f}ms")
    print(f"Events sent so far: {len(sent_events)}")
    
    # Wait for throttle interval
    print(f"\nWaiting for throttle flush...")
    time.sleep(0.06)
    
    # Manually trigger flush
    result = throttle._flush_pending_events()
    
    print(f"\nEvents sent after flush: {len(sent_events)}")
    print(f"Event coalescing ratio: 10:1 -> {10}:{len(sent_events)}")
    
    if sent_events:
        event = sent_events[0]
        print(f"\nFinal event data:")
        print(f"  Type: {event.get('type')}")
        print(f"  Event: {event.get('event')}")
        print(f"  Frame: {event.get('frame')}")
        print(f"  Reasons: {event.get('reasons', [])}")
    
    # Verify expectations
    assert len(sent_events) == 1, f"Expected 1 event, got {len(sent_events)}"
    assert sent_events[0]['frame'] == 10, "Should send the last frame"
    assert 'reasons' in sent_events[0], "Should include reasons"
    
    print("\n" + "=" * 60)
    print("✓ Test passed: Events successfully throttled")
    print("=" * 60)

def test_multiple_event_types():
    """
    Test throttling with multiple event types simultaneously.
    """
    print("\n" + "=" * 60)
    print("Multiple Event Types Test")
    print("=" * 60)
    
    # Setup
    sent_events = []
    
    def mock_send(data):
        sent_events.append(data)
    
    throttle._pending_events.clear()
    throttle._dirty_reasons.clear()
    throttle._send_function = mock_send
    throttle.set_throttle_interval(0.05)
    
    print("\nGenerating mixed event types...")
    
    # Mix frame_change and depsgraph_update events
    for i in range(5):
        throttle.throttle_event(
            "frame_change",
            {"type": "event", "event": "frame_change", "frame": i},
            reason=f"frame_{i}"
        )
        throttle.throttle_event(
            "depsgraph_update",
            {"type": "event", "event": "depsgraph_update"},
            reason="depsgraph_changed"
        )
        time.sleep(0.01)
    
    print(f"Generated 10 events (5 frame_change + 5 depsgraph_update)")
    
    # Wait and flush
    time.sleep(0.06)
    throttle._flush_pending_events()
    
    print(f"Events sent after flush: {len(sent_events)}")
    
    # Verify we got both event types
    event_types = [e['event'] for e in sent_events]
    print(f"Event types sent: {event_types}")
    
    assert len(sent_events) == 2, f"Expected 2 events (one per type), got {len(sent_events)}"
    assert 'frame_change' in event_types, "Should include frame_change"
    assert 'depsgraph_update' in event_types, "Should include depsgraph_update"
    
    print("\n✓ Test passed: Multiple event types handled correctly")
    print("=" * 60)

if __name__ == '__main__':
    test_throttle_integration()
    test_multiple_event_types()
    print("\n✓ All integration tests passed!")
