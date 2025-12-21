import unittest
import sys
import os
from unittest.mock import MagicMock, patch, call

# Add the root directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_dir)

# Import mock_bpy before registry to ensure bpy is mocked
from tests.addon.mock_bpy import mock_bpy

# Mock the handlers and connection modules before importing registry
sys.path.append(os.path.join(root_dir, 'blendmate-addon'))

# Create mock modules for handlers and connection
mock_handlers = MagicMock()
mock_handlers.on_save_post = MagicMock()
mock_handlers.on_load_post = MagicMock()
mock_handlers.on_depsgraph_update = MagicMock()
mock_handlers.on_frame_change = MagicMock()

mock_connection = MagicMock()
mock_connection.info = MagicMock()
mock_connection.process_queue = MagicMock()

# Mock imports
sys.modules['blendmate-addon.handlers'] = mock_handlers
sys.modules['blendmate-addon.connection'] = mock_connection

# Now import the registry
from events import registry

class TestRegistry(unittest.TestCase):
    def setUp(self):
        """Reset the registry state before each test."""
        registry._registered_handlers.clear()
        registry._registered_timers.clear()
        
        # Reset mock bpy handlers
        mock_bpy.app.handlers.save_post.clear()
        mock_bpy.app.handlers.load_post.clear()
        mock_bpy.app.handlers.depsgraph_update_post.clear()
        mock_bpy.app.handlers.frame_change_post.clear()
        
        # Mock timers
        self.registered_timers = []
        
        def mock_timer_register(func, **kwargs):
            self.registered_timers.append(func)
        
        def mock_timer_is_registered(func):
            return func in self.registered_timers
        
        def mock_timer_unregister(func):
            if func in self.registered_timers:
                self.registered_timers.remove(func)
        
        mock_bpy.app.timers.register = mock_timer_register
        mock_bpy.app.timers.is_registered = mock_timer_is_registered
        mock_bpy.app.timers.unregister = mock_timer_unregister

    def test_register_all_registers_handlers(self):
        """Test that register_all registers all handlers."""
        registry.register_all()
        
        # Check that handlers were appended
        self.assertIn(mock_handlers.on_save_post, mock_bpy.app.handlers.save_post)
        self.assertIn(mock_handlers.on_load_post, mock_bpy.app.handlers.load_post)
        self.assertIn(mock_handlers.on_depsgraph_update, mock_bpy.app.handlers.depsgraph_update_post)
        self.assertIn(mock_handlers.on_frame_change, mock_bpy.app.handlers.frame_change_post)

    def test_register_all_registers_timers(self):
        """Test that register_all registers timers."""
        registry.register_all()
        
        # Check that the timer was registered
        self.assertIn(mock_connection.process_queue, self.registered_timers)

    def test_register_all_is_idempotent(self):
        """Test that register_all can be called multiple times without duplicates."""
        # Register twice
        registry.register_all()
        registry.register_all()
        
        # Each handler should appear only once
        self.assertEqual(mock_bpy.app.handlers.save_post.count(mock_handlers.on_save_post), 1)
        self.assertEqual(mock_bpy.app.handlers.load_post.count(mock_handlers.on_load_post), 1)
        self.assertEqual(self.registered_timers.count(mock_connection.process_queue), 1)

    def test_unregister_all_removes_handlers(self):
        """Test that unregister_all removes all handlers."""
        # First register
        registry.register_all()
        
        # Then unregister
        registry.unregister_all()
        
        # Check that handlers were removed
        self.assertNotIn(mock_handlers.on_save_post, mock_bpy.app.handlers.save_post)
        self.assertNotIn(mock_handlers.on_load_post, mock_bpy.app.handlers.load_post)
        self.assertNotIn(mock_handlers.on_depsgraph_update, mock_bpy.app.handlers.depsgraph_update_post)
        self.assertNotIn(mock_handlers.on_frame_change, mock_bpy.app.handlers.frame_change_post)

    def test_unregister_all_removes_timers(self):
        """Test that unregister_all removes all timers."""
        # First register
        registry.register_all()
        
        # Then unregister
        registry.unregister_all()
        
        # Check that the timer was unregistered
        self.assertNotIn(mock_connection.process_queue, self.registered_timers)

    def test_unregister_all_is_idempotent(self):
        """Test that unregister_all can be called multiple times without exceptions."""
        # Register once
        registry.register_all()
        
        # Unregister twice - should not raise
        registry.unregister_all()
        registry.unregister_all()
        
        # Lists should be empty
        self.assertEqual(len(registry._registered_handlers), 0)
        self.assertEqual(len(registry._registered_timers), 0)

    def test_register_unregister_cycle(self):
        """Test that multiple register/unregister cycles work correctly."""
        for _ in range(3):
            registry.register_all()
            
            # Verify registration
            self.assertIn(mock_handlers.on_save_post, mock_bpy.app.handlers.save_post)
            self.assertIn(mock_connection.process_queue, self.registered_timers)
            
            registry.unregister_all()
            
            # Verify unregistration
            self.assertNotIn(mock_handlers.on_save_post, mock_bpy.app.handlers.save_post)
            self.assertNotIn(mock_connection.process_queue, self.registered_timers)

    def test_tracking_lists_cleared_on_unregister(self):
        """Test that tracking lists are cleared on unregister."""
        registry.register_all()
        
        # Verify tracking lists have items
        self.assertGreater(len(registry._registered_handlers), 0)
        self.assertGreater(len(registry._registered_timers), 0)
        
        registry.unregister_all()
        
        # Verify tracking lists are cleared
        self.assertEqual(len(registry._registered_handlers), 0)
        self.assertEqual(len(registry._registered_timers), 0)

if __name__ == '__main__':
    unittest.main()
