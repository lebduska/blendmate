from . import registry

def register():
    registry.register_all()

def unregister():
    registry.unregister_all()
