# Blendmate Command Handlers
# Provides generic property.set/get and operator.call functionality

from .resolver import resolve_path, set_property, get_property
from .handlers import handle_command, COMMAND_HANDLERS

__all__ = [
    'resolve_path',
    'set_property',
    'get_property',
    'handle_command',
    'COMMAND_HANDLERS',
]
