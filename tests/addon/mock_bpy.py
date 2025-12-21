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
        
        class Timers:
            def __init__(self):
                self._registered_timers = []
            
            def register(self, func, first_interval=0.0, persistent=False):
                """Mock timer registration."""
                if func not in self._registered_timers:
                    self._registered_timers.append(func)
            
            def unregister(self, func):
                """Mock timer unregistration."""
                if func in self._registered_timers:
                    self._registered_timers.remove(func)
            
            def is_registered(self, func):
                """Check if timer is registered."""
                return func in self._registered_timers
        
        def __init__(self):
            self.handlers = self.Handlers()
            self.timers = self.Timers()

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
