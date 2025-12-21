"""
Simple test to verify registry module structure and basic behavior.
This test focuses on verifying the registry module's existence and basic structure
without needing full import resolution due to the blendmate-addon naming issue.
"""

import unittest
import os
import sys

# Add the root directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))

class TestRegistryStructure(unittest.TestCase):
    def test_registry_files_exist(self):
        """Test that registry module files exist."""
        events_dir = os.path.join(root_dir, 'blendmate-addon', 'events')
        self.assertTrue(os.path.exists(events_dir), "events directory should exist")
        
        init_file = os.path.join(events_dir, '__init__.py')
        self.assertTrue(os.path.exists(init_file), "__init__.py should exist")
        
        registry_file = os.path.join(events_dir, 'registry.py')
        self.assertTrue(os.path.exists(registry_file), "registry.py should exist")

    def test_registry_has_required_functions(self):
        """Test that registry.py contains required function definitions."""
        registry_file = os.path.join(root_dir, 'blendmate-addon', 'events', 'registry.py')
        
        with open(registry_file, 'r') as f:
            content = f.read()
        
        # Check for required functions
        self.assertIn('def register_all()', content, "register_all function should be defined")
        self.assertIn('def unregister_all()', content, "unregister_all function should be defined")
        
        # Check for idempotency support
        self.assertIn('_registered_handlers', content, "Should track registered handlers")
        self.assertIn('_registered_timers', content, "Should track registered timers")
        
        # Check for proper cleanup
        self.assertIn('.clear()', content, "Should clear tracking lists")
        
        # Check for handler registration
        self.assertIn('bpy.app.handlers', content, "Should register app handlers")
        
        # Check for timer registration  
        self.assertIn('bpy.app.timers', content, "Should register timers")

    def test_handlers_file_updated(self):
        """Test that handlers.py no longer has register/unregister functions."""
        handlers_file = os.path.join(root_dir, 'blendmate-addon', 'handlers.py')
        
        with open(handlers_file, 'r') as f:
            content = f.read()
        
        # Check that old registration code is removed/commented
        self.assertNotIn('def register():', content, "handlers.py should not have register function")
        self.assertNotIn('def unregister():', content, "handlers.py should not have unregister function")
        
        # Check that handler functions still exist
        self.assertIn('def on_save_post', content, "Handler functions should still exist")
        self.assertIn('def on_load_post', content, "Handler functions should still exist")
        self.assertIn('def on_depsgraph_update', content, "Handler functions should still exist")
        self.assertIn('def on_frame_change', content, "Handler functions should still exist")

    def test_connection_file_updated(self):
        """Test that connection.py delegates timer management to registry."""
        connection_file = os.path.join(root_dir, 'blendmate-addon', 'connection.py')
        
        with open(connection_file, 'r') as f:
            content = f.read()
        
        # Check for comments indicating delegation
        register_section = content[content.find('def register():'):content.find('def unregister():')]
        unregister_section = content[content.find('def unregister():'):]
        
        self.assertIn('events.registry', register_section, 
                     "Should mention registry in register function")
        self.assertIn('events.registry', unregister_section,
                     "Should mention registry in unregister function")

    def test_main_init_includes_events_module(self):
        """Test that main __init__.py includes events module in registration."""
        init_file = os.path.join(root_dir, 'blendmate-addon', '__init__.py')
        
        with open(init_file, 'r') as f:
            content = f.read()
        
        # Check that events module is in the modules list
        self.assertIn('"events"', content, "events module should be in modules list")
        
        # Verify it comes after handlers and connection
        modules_section = content[content.find('modules = ['):content.find(']', content.find('modules = ['))]
        
        handlers_pos = modules_section.find('"handlers"')
        connection_pos = modules_section.find('"connection"')
        events_pos = modules_section.find('"events"')
        
        self.assertGreater(events_pos, handlers_pos, "events should come after handlers")
        self.assertGreater(events_pos, connection_pos, "events should come after connection")

if __name__ == '__main__':
    unittest.main()
