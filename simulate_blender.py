import sys
import os
import time
import json
import threading

# Mock bpy module
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
            self.filepath = "mock_scene.blend"
            
    class Context:
        class Screen:
            class Area:
                def __init__(self, type):
                    self.type = type
                    self.spaces = self.Spaces()
                class Spaces:
                    def __init__(self):
                        self.active = self.Space()
                    class Space:
                        def __init__(self):
                            self.tree_type = 'GeometryNodeTree'
                            self.node_tree = self.NodeTree()
                        class NodeTree:
                            def __init__(self):
                                self.nodes = self.Nodes()
                            class Nodes:
                                def __init__(self):
                                    self.active = self.Node()
                                class Node:
                                    def __init__(self):
                                        self.bl_idname = 'GeometryNodeInstanceOnPoints'
            def __init__(self):
                self.areas = [self.Area('NODE_EDITOR')]
        def __init__(self):
            self.screen = self.Screen()

    def __init__(self):
        self.app = self.App()
        self.data = self.Data()
        self.context = self.Context()

# Inject mock bpy
sys.modules['bpy'] = MockBpy()
import bpy

# Fix path to find vendor and local modules
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), 'blendmate-addon'))

# Import the module we want to test
import connection

# Overwrite port for testing if needed
if len(sys.argv) > 1:
    test_port = sys.argv[1]
    # We need to hack ws_thread to use different port
    def hacked_ws_thread():
        connection._ws = connection.websocket.WebSocketApp(f"ws://127.0.0.1:{test_port}",
                                    on_open=lambda ws: print("[Blendmate] WS Connected"),
                                    on_message=lambda ws, msg: print(f"[Blendmate] Recv: {msg}"),
                                    on_error=lambda ws, err: print(f"[Blendmate] WS Error: {err}"),
                                    on_close=lambda ws, close_status, close_msg: print(f"[Blendmate] WS Closed: {close_status} {close_msg}"))
        connection._ws.run_forever()
    connection.ws_thread = hacked_ws_thread

def run_simulation():
    print("Starting Blender Addon Simulation...")
    connection.register()
    
    try:
        time.sleep(2) # Give it time to connect
        
        print("\n--- Simulating Save ---")
        for handler in bpy.app.handlers.save_post:
            handler(None)
        
        time.sleep(1)
        
        print("\n--- Simulating Depsgraph Update (Node Context) ---")
        for handler in bpy.app.handlers.depsgraph_update_post:
            handler(None, None)
            
        time.sleep(1)
        
        print("\n--- Simulating Node Change ---")
        # Change active node in mock
        bpy.context.screen.areas[0].spaces.active.node_tree.nodes.active.bl_idname = 'GeometryNodeCombineXYZ'
        for handler in bpy.app.handlers.depsgraph_update_post:
            handler(None, None)

        time.sleep(5)
        
    finally:
        print("\nUnregistering...")
        connection.unregister()

if __name__ == "__main__":
    run_simulation()
