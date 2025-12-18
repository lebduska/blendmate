bl_info = {
    "name": "Blendmate Connector",
    "author": "Jiri Lebduska",
    "version": (0, 1, 0),
    "blender": (4, 0, 0),
    "location": "System > Blendmate",
    "description": "Connects Blender to the Blendmate desktop app via WebSockets.",
    "warning": "",
    "doc_url": "",
    "category": "System",
}

import bpy

from . import connection

def register():
    if connection:
        connection.register()
    else:
        print("Blendmate Error: Connection module not available, registration failed.")

def unregister():
    if connection:
        connection.unregister()

if __name__ == "__main__":
    register()
