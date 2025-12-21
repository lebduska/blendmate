import unittest
import sys
import os
import time
from unittest.mock import MagicMock, patch, call

# Add the root directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_dir)

# Import mock_bpy before throttle to ensure bpy is mocked
from tests.addon.mock_bpy import mock_bpy

# Mock the connection module before importing throttle
sys.modules['blendmate-addon.connection'] = MagicMock()

# Now we can safely import throttle
sys.path.append(os.path.join(root_dir, 'blendmate-addon'))
import throttle

class TestThrottle(unittest.TestCase):
    def setUp(self):
        """Reset throttle state before each test."""
        throttle._pending_events.clear()
        throttle._dirty_reasons.clear()
        throttle._throttle_interval = 0.1
        
        # Mock the send function
        self.mock_send = MagicMock()
        throttle._send_function = self.mock_send

    def tearDown(self):
        """Clean up after each test."""
        if mock_bpy.app.timers.is_registered(throttle._flush_pending_events):
            mock_bpy.app.timers.unregister(throttle._flush_pending_events)
        throttle._pending_events.clear()
        throttle._dirty_reasons.clear()
        throttle._send_function = None

    def test_set_throttle_interval(self):
        """Test setting the throttle interval."""
        throttle.set_throttle_interval(0.05)
        self.assertEqual(throttle.get_throttle_interval(), 0.05)
        
        # Test clamping
        throttle.set_throttle_interval(0.001)  # Too small
        self.assertEqual(throttle.get_throttle_interval(), 0.01)
        
        throttle.set_throttle_interval(2.0)  # Too large
        self.assertEqual(throttle.get_throttle_interval(), 1.0)

    def test_throttle_event_queues_event(self):
        """Test that throttle_event queues an event."""
        event_data = {"type": "event", "event": "test_event"}
        throttle.throttle_event("test", event_data, reason="test_reason")
        
        self.assertIn("test", throttle._pending_events)
        self.assertEqual(throttle._pending_events["test"]["data"], event_data)
        self.assertIn("test_reason", throttle._dirty_reasons["test"])

    def test_throttle_event_overwrites_previous(self):
        """Test that new events overwrite previous ones of the same type."""
        event_data_1 = {"type": "event", "value": 1}
        event_data_2 = {"type": "event", "value": 2}
        
        throttle.throttle_event("test", event_data_1)
        throttle.throttle_event("test", event_data_2)
        
        self.assertEqual(throttle._pending_events["test"]["data"], event_data_2)

    def test_throttle_event_accumulates_reasons(self):
        """Test that multiple events accumulate reasons."""
        event_data = {"type": "event", "event": "test"}
        
        throttle.throttle_event("test", event_data, reason="reason1")
        throttle.throttle_event("test", event_data, reason="reason2")
        throttle.throttle_event("test", event_data, reason="reason1")  # Duplicate
        
        self.assertEqual(len(throttle._dirty_reasons["test"]), 2)
        self.assertIn("reason1", throttle._dirty_reasons["test"])
        self.assertIn("reason2", throttle._dirty_reasons["test"])

    def test_flush_immediate_sends_all_events(self):
        """Test that flush_immediate sends all pending events immediately."""
        event_data_1 = {"type": "event", "event": "test1"}
        event_data_2 = {"type": "event", "event": "test2"}
        
        throttle.throttle_event("test1", event_data_1, reason="r1")
        throttle.throttle_event("test2", event_data_2, reason="r2")
        
        throttle.flush_immediate()
        
        self.assertEqual(self.mock_send.call_count, 2)
        self.assertEqual(len(throttle._pending_events), 0)
        self.assertEqual(len(throttle._dirty_reasons), 0)

    def test_flush_includes_reasons(self):
        """Test that flushed events include the reasons."""
        event_data = {"type": "event", "event": "test"}
        
        throttle.throttle_event("test", event_data, reason="reason1")
        throttle.throttle_event("test", event_data, reason="reason2")
        
        throttle.flush_immediate()
        
        # Check that reasons were included in the sent data
        sent_data = self.mock_send.call_args[0][0]
        self.assertIn("reasons", sent_data)
        self.assertIn("reason1", sent_data["reasons"])
        self.assertIn("reason2", sent_data["reasons"])

    def test_flush_pending_events_waits_for_interval(self):
        """Test that flush waits for the throttle interval."""
        throttle.set_throttle_interval(0.05)
        event_data = {"type": "event", "event": "test"}
        
        throttle.throttle_event("test", event_data)
        
        # Immediately calling flush should not send (not enough time passed)
        result = throttle._flush_pending_events()
        self.mock_send.assert_not_called()
        self.assertIsNotNone(result)  # Timer should continue
        
        # Wait for the interval and try again
        time.sleep(0.06)
        result = throttle._flush_pending_events()
        self.mock_send.assert_called_once()
        self.assertIsNone(result)  # Timer should stop (no more events)

    def test_register_unregister(self):
        """Test register and unregister clear state."""
        event_data = {"type": "event", "event": "test"}
        throttle.throttle_event("test", event_data)
        
        throttle.register()
        self.assertEqual(len(throttle._pending_events), 0)
        self.assertEqual(len(throttle._dirty_reasons), 0)
        
        # Add event and unregister (should flush)
        throttle.throttle_event("test", event_data)
        throttle.unregister()
        self.mock_send.assert_called()

    def test_multiple_event_types(self):
        """Test handling multiple event types simultaneously."""
        event_data_1 = {"type": "event", "event": "frame_change", "frame": 10}
        event_data_2 = {"type": "event", "event": "depsgraph_update"}
        
        throttle.throttle_event("frame_change", event_data_1)
        throttle.throttle_event("depsgraph_update", event_data_2)
        
        self.assertEqual(len(throttle._pending_events), 2)
        
        throttle.flush_immediate()
        self.assertEqual(self.mock_send.call_count, 2)

if __name__ == '__main__':
    unittest.main()
