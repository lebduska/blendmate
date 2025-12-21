import unittest
import sys
import os
from unittest.mock import MagicMock, patch

# Add the root directory to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_dir)

# Mock bpy before importing our modules
class MockMsgbus:
    """Mock for bpy.msgbus"""
    subscriptions = []
    
    @classmethod
    def subscribe_rna(cls, key, owner, args, notify):
        """Mock msgbus subscription"""
        cls.subscriptions.append({
            'key': key,
            'owner': owner,
            'args': args,
            'notify': notify
        })
    
    @classmethod
    def clear_by_owner(cls, owner):
        """Mock clearing subscriptions by owner"""
        cls.subscriptions = [s for s in cls.subscriptions if s['owner'] != owner]
    
    @classmethod
    def reset(cls):
        """Reset for tests"""
        cls.subscriptions = []


class MockBpy:
    """Extended mock for bpy with msgbus support"""
    class Types:
        class LayerObjects: pass
        class Object: pass
        class Scene: pass
    
    class App:
        class Handlers:
            def __init__(self):
                self.save_post = []
                self.load_post = []
                self.depsgraph_update_post = []
                self.frame_change_post = []
            
            def persistent(self, func):
                return func
        
        def __init__(self):
            self.handlers = self.Handlers()
    
    class Context:
        def __init__(self):
            self.scene = MagicMock()
            self.scene.frame_current = 1
            self.view_layer = MagicMock()
            self.view_layer.objects.active = None
    
    class Data:
        def __init__(self):
            self.filepath = "test.blend"
    
    def __init__(self):
        self.types = self.Types()
        self.app = self.App()
        self.context = self.Context()
        self.data = self.Data()
        self.msgbus = MockMsgbus()


# Install mock bpy
mock_bpy = MockBpy()
sys.modules['bpy'] = mock_bpy


class TestSubscriptions(unittest.TestCase):
    def setUp(self):
        """Reset state before each test"""
        MockMsgbus.reset()
    
    def test_msgbus_subscribe_rna_api(self):
        """Test that msgbus API works as expected"""
        owner = object()
        callback = lambda: None
        
        mock_bpy.msgbus.subscribe_rna(
            key=(mock_bpy.types.Object, "location"),
            owner=owner,
            args=(),
            notify=callback
        )
        
        self.assertEqual(len(MockMsgbus.subscriptions), 1)
        sub = MockMsgbus.subscriptions[0]
        self.assertEqual(sub['key'], (mock_bpy.types.Object, "location"))
        self.assertEqual(sub['owner'], owner)
        self.assertEqual(sub['notify'], callback)
    
    def test_msgbus_clear_by_owner(self):
        """Test that clear_by_owner removes subscriptions"""
        owner1 = object()
        owner2 = object()
        
        mock_bpy.msgbus.subscribe_rna(
            key=(mock_bpy.types.Object, "location"),
            owner=owner1,
            args=(),
            notify=lambda: None
        )
        
        mock_bpy.msgbus.subscribe_rna(
            key=(mock_bpy.types.Object, "name"),
            owner=owner2,
            args=(),
            notify=lambda: None
        )
        
        self.assertEqual(len(MockMsgbus.subscriptions), 2)
        
        mock_bpy.msgbus.clear_by_owner(owner1)
        
        self.assertEqual(len(MockMsgbus.subscriptions), 1)
        self.assertEqual(MockMsgbus.subscriptions[0]['owner'], owner2)
    
    def test_subscription_keys_structure(self):
        """Test expected subscription key structure"""
        # Verify that our mock types exist and can be used in keys
        key1 = (mock_bpy.types.LayerObjects, "active")
        key2 = (mock_bpy.types.Object, "name")
        key3 = (mock_bpy.types.Object, "location")
        key4 = (mock_bpy.types.Object, "rotation_euler")
        key5 = (mock_bpy.types.Object, "scale")
        key6 = (mock_bpy.types.Scene, "frame_current")
        
        # All should be valid tuples
        for key in [key1, key2, key3, key4, key5, key6]:
            self.assertIsInstance(key, tuple)
            self.assertEqual(len(key), 2)
            self.assertIsInstance(key[1], str)


if __name__ == '__main__':
    unittest.main()

