import bpy

class BlendmatePreferences(bpy.types.AddonPreferences):
    bl_idname = __package__.split('.')[0] if '.' in __package__ else __package__

    ws_url: bpy.props.StringProperty(
        name="WebSocket URL",
        description="Address of the Blendmate app WebSocket server",
        default="ws://127.0.0.1:32123",
    )
    
    throttle_interval: bpy.props.FloatProperty(
        name="Event Throttle Interval (ms)",
        description="Time window for coalescing high-frequency events (depsgraph, frame_change)",
        default=100.0,
        min=50.0,
        max=200.0,
        step=10,
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "ws_url")
        layout.prop(self, "throttle_interval")

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
