import bpy

class BlendmatePreferences(bpy.types.AddonPreferences):
    bl_idname = __package__.split('.')[0] if '.' in __package__ else __package__

    ws_url: bpy.props.StringProperty(
        name="WebSocket URL",
        description="Address of the Blendmate app WebSocket server",
        default="ws://127.0.0.1:32123",
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "ws_url")

def get_preferences(context=None):
    if not context:
        context = bpy.context
    return context.preferences.addons[BlendmatePreferences.bl_idname].preferences

classes = (
    BlendmatePreferences,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
