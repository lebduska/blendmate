import unittest
import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add the root directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_dir)

# Import mock_bpy before connection to ensure bpy is mocked
from tests.addon.mock_bpy import mock_bpy
import importlib

# Map 'blendmate' to 'blendmate-addon' for testing purposes if needed
# but here we use the actual folder name
try:
    import blendmate_addon.connection as connection
except ImportError:
    # If the user renamed it or we are in a different environment
    sys.path.append(os.path.join(root_dir, 'blendmate-addon'))
    import connection

class TestConnection(unittest.TestCase):
    def setUp(self):
        connection._ws = MagicMock()
        connection._ws.sock.connected = True
        connection._last_node_id = None

    def test_send_to_blendmate(self):
        with patch.object(connection._ws, 'send') as mock_send:
            data = {"type": "test", "value": 123}
            connection.send_to_blendmate(data)
            mock_send.assert_called_once_with(json.dumps(data))

    def test_get_active_gn_node_empty(self):
        mock_bpy.context.screen.areas = []
        node_id = connection.get_active_gn_node()
        self.assertIsNone(node_id)

    def test_get_active_gn_node_found(self):
        mock_area = MagicMock()
        mock_area.type = 'NODE_EDITOR'
        mock_space = MagicMock()
        mock_space.tree_type = 'GeometryNodeTree'
        mock_space.node_tree.nodes.active.bl_idname = 'TestNode'
        mock_area.spaces.active = mock_space
        
        mock_bpy.context.screen.areas = [mock_area]
        
        node_id = connection.get_active_gn_node()
        self.assertEqual(node_id, 'TestNode')

    def test_on_depsgraph_update_node_signal(self):
        # Setup mock to return a node
        with patch('connection.get_active_gn_node', return_value='NewNode'):
            with patch('connection.send_to_blendmate') as mock_send:
                connection.on_depsgraph_update(None, None)
                
                # Check if context message was sent
                calls = [call[0][0] for call in mock_send.call_args_list]
                context_calls = [c for c in calls if c.get('type') == 'context']
                self.assertEqual(len(context_calls), 1)
                self.assertEqual(context_calls[0]['node_id'], 'NewNode')

    def test_on_frame_change(self):
        with patch('connection.send_to_blendmate') as mock_send:
            mock_scene = MagicMock()
            mock_scene.frame_current = 42
            connection.on_frame_change(mock_scene)
            mock_send.assert_called_with({
                "type": "event", 
                "event": "frame_change", 
                "frame": 42
            })

    def test_on_save_post(self):
        with patch('connection.send_to_blendmate') as mock_send:
            connection.on_save_post(None)
            mock_send.assert_called_with({
                "type": "event", 
                "event": "save_post", 
                "filename": "test.blend"
            })

if __name__ == '__main__':
    unittest.main()
