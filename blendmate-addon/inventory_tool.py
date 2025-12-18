import bpy

def extract_handlers():
    """Extracts all persistent handlers and their attributes for documentation."""
    handlers = {}
    for attr in dir(bpy.app.handlers):
        if not attr.startswith("_") and isinstance(getattr(bpy.app.handlers, attr), list):
            handlers[attr] = {
                "count": len(getattr(bpy.app.handlers, attr)),
                "description": getattr(bpy.app.handlers, attr).__doc__ if hasattr(getattr(bpy.app.handlers, attr), "__doc__") else ""
            }
    return handlers

if __name__ == "__main__":
    print("--- BLENDER HANDLERS INVENTORY ---")
    import json
    print(json.dumps(extract_handlers(), indent=2))
