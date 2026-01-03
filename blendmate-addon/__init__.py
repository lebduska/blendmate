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
    "protocol",  # Protocol definitions (must be first - no dependencies)
    "preferences",
    "throttle",
    "commands",  # Command handlers (must be before connection)
    "connection",
    "handlers",
    "events",  # Registry must be registered after handlers and connection are loaded
    "operators",
    "ui",
]

def register():
    # Force reload of submodules for development
    # First, reload subpackages (like commands.resolver, commands.handlers)
    commands_submodules = ["commands.resolver", "commands.handlers"]
    for sub_name in commands_submodules:
        full_name = f"{__package__}.{sub_name}"
        if full_name in sys.modules:
            print(f"[Blendmate] Reloading {full_name}")
            importlib.reload(sys.modules[full_name])

    # Then reload main modules
    for mod_name in modules:
        full_name = f"{__package__}.{mod_name}"
        if full_name in sys.modules:
            print(f"[Blendmate] Reloading {full_name}")
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
