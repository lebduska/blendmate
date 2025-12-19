import bpy

class BLENDMATE_OT_reload(bpy.types.Operator):
    bl_idname = "blendmate.reload"
    bl_label = "Reload Blendmate"
    bl_description = "Reloads the addon code without restarting Blender"

    def execute(self, context):
        import importlib
        import sys
        
        # Get the root package name dynamically
        package_name = __package__.split('.')[0] if __package__ and '.' in __package__ else __package__
            
        try:
            # Import the root module to call its unregister
            if package_name in sys.modules:
                root = sys.modules[package_name]
                if hasattr(root, "unregister"):
                    root.unregister()
        except Exception as e:
            print(f"[Blendmate] Reload unregister error: {e}")
        
        # Addon module name for Blender
        addon_module_name = __package__.rpartition('.')[0] if __package__ and '.' in __package__ else __package__
        if not addon_module_name:
            addon_module_name = "blendmate-addon"

        # Safe disable/enable
        try:
            bpy.ops.preferences.addon_disable(module=addon_module_name)
        except:
            pass
            
        bpy.ops.preferences.addon_enable(module=addon_module_name)
        
        self.report({'INFO'}, f"Blendmate Reloaded safely")
        return {'FINISHED'}

classes = (
    # BLENDMATE_OT_reload removed for stability
)

def register():
    # No classes to register currently
    pass

def unregister():
    # No classes to unregister currently
    pass
