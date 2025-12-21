"""
Centralized event registry for Blendmate addon.

This module manages ALL Blender event wiring in a single place:
- Handler registration/unregistration (app handlers)
- Timer registration/unregistration
- Message bus subscriptions (if/when added)

All operations are idempotent and guarantee clean removal on unregister.
"""

import bpy
from .. import handlers
from .. import connection

# Storage for registered handlers to ensure clean removal
_registered_handlers = []
_registered_timers = []

def register_all():
    """
    Register all Blender event handlers, timers, and subscriptions.
    Idempotent: safe to call multiple times without duplicates.
    """
    # Clear any existing registrations first to ensure idempotency
    unregister_all()
    
    connection.info("Registering all event handlers via registry")
    
    # Register app handlers
    _register_app_handlers()
    
    # Register timers
    _register_timers()
    
    # Future: register msgbus subscriptions here

def unregister_all():
    """
    Unregister all Blender event handlers, timers, and subscriptions.
    Idempotent: safe to call multiple times without exceptions.
    """
    connection.info("Unregistering all event handlers via registry")
    
    # Unregister timers first
    _unregister_timers()
    
    # Unregister app handlers
    _unregister_app_handlers()
    
    # Future: clear msgbus subscriptions here
    
    # Clear tracking lists
    _registered_handlers.clear()
    _registered_timers.clear()

def _register_app_handlers():
    """Register all app.handlers callbacks."""
    handlers_to_register = [
        (bpy.app.handlers.save_post, handlers.on_save_post),
        (bpy.app.handlers.load_post, handlers.on_load_post),
        (bpy.app.handlers.depsgraph_update_post, handlers.on_depsgraph_update),
        (bpy.app.handlers.frame_change_post, handlers.on_frame_change),
    ]
    
    for handler_list, handler_func in handlers_to_register:
        if handler_func not in handler_list:
            handler_list.append(handler_func)
            _registered_handlers.append((handler_list, handler_func))
            connection.info(f"  Registered handler: {handler_func.__name__}")

def _unregister_app_handlers():
    """Unregister all tracked app.handlers callbacks."""
    for handler_list, handler_func in _registered_handlers[:]:
        if handler_func in handler_list:
            try:
                handler_list.remove(handler_func)
                connection.info(f"  Unregistered handler: {handler_func.__name__}")
            except ValueError:
                # Already removed, not an error
                pass

def _register_timers():
    """Register all timers."""
    # Register the message queue processing timer
    if not bpy.app.timers.is_registered(connection.process_queue):
        bpy.app.timers.register(connection.process_queue, first_interval=0.1)
        _registered_timers.append(connection.process_queue)
        connection.info("  Registered timer: process_queue")

def _unregister_timers():
    """Unregister all tracked timers."""
    for timer_func in _registered_timers[:]:
        if bpy.app.timers.is_registered(timer_func):
            try:
                bpy.app.timers.unregister(timer_func)
                connection.info(f"  Unregistered timer: {timer_func.__name__}")
            except Exception as e:
                # Log but don't fail
                connection.info(f"  Warning: Failed to unregister timer {timer_func.__name__}: {e}")
