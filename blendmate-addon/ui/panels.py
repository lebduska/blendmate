import bpy
from .. import connection

class BLENDMATE_PT_panel(bpy.types.Panel):
    bl_label = "Blendmate Dev"
    bl_idname = "BLENDMATE_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Blendmate'

    def draw(self, context):
        layout = self.layout
        layout.label(text=f"Version: 0.5.0")

        status = "Disconnected"
        try:
            if connection._ws and hasattr(connection._ws, "sock") and connection._ws.sock and getattr(connection._ws.sock, "connected", False):
                status = "Connected"
        except Exception:
            status = "Disconnected"

        layout.label(text=f"Status: {status}")
        # Removed Reload operator to prevent crashes
        layout.label(text="Use F3 > Reload Scripts for dev", icon='INFO')

classes = (
    BLENDMATE_PT_panel,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
