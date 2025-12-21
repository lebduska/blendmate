print("[Blendmate] !!! INITIAL MODULE LOAD !!!")

bl_info = {
    "name": "Blendmate Connector",
    "author": "Jiri Lebduska",
    "version": (1, 0, 0),
    "blender": (4, 0, 0),
    "location": "System > Blendmate",
    "description": "Connects Blender to the Blendmate desktop app via WebSockets.",
    "warning": "",
    "doc_url": "",
    "category": "System",
}

import bpy
import importlib
import sys

# List of submodules to register in order
modules = [
    "preferences",
    "throttle",
    "connection",
    "handlers",
    "operators",
    "ui",
]

def register():
    # Force reload of submodules for development
    for mod_name in modules:
        full_name = f"{__package__}.{mod_name}"
        if full_name in sys.modules:
            importlib.reload(sys.modules[full_name])
    
    # Register all submodules
    for mod_name in modules:
        mod = importlib.import_module(f".{mod_name}", __package__)
        if hasattr(mod, "register"):
            mod.register()

def unregister():
    # Unregister in reverse order
    for mod_name in reversed(modules):
        full_name = f"{__package__}.{mod_name}"
        if full_name in sys.modules:
            mod = sys.modules[full_name]
            if hasattr(mod, "unregister"):
                mod.unregister()

if __name__ == "__main__":
    register()
