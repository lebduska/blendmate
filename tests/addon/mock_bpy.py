import sys
from unittest.mock import MagicMock

class MockBpy:
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

    class Data:
        def __init__(self):
            self.filepath = "test.blend"

    class Context:
        def __init__(self):
            self.screen = MagicMock()
            self.screen.areas = []
        
    class Types:
        class Panel: pass
        class Operator: pass
        class PropertyGroup: pass

    def __init__(self):
        self.app = self.App()
        self.data = self.Data()
        self.context = self.Context()
        self.types = self.Types()
        self.utils = MagicMock()

mock_bpy = MockBpy()
sys.modules['bpy'] = mock_bpy
