"""
msgbus-based subscriptions for targeted change detection.
Replaces broad depsgraph_update spam with specific RNA property subscriptions.
"""

import bpy
from . import connection


# Stable owner object for msgbus subscriptions
# This must persist across subscription lifetime
class SubscriptionOwner:
    """Dummy owner object to keep msgbus subscriptions alive."""
    pass


_owner = None
_subscriptions_active = False


def info(msg):
    """Log helper."""
    print(f"[Blendmate:Subscriptions] {msg}")


# === Subscription callbacks ===
# All callbacks must be fast and only enqueue events, not perform heavy work

def on_active_object_changed():
    """Called when the active object changes."""
    try:
        active_obj = bpy.context.view_layer.objects.active
        obj_name = active_obj.name if active_obj else None
        connection.send_to_blendmate({
            "type": "event",
            "event": "active_object_changed",
            "object": obj_name
        })
        info(f"Active object changed: {obj_name}")
    except Exception as e:
        info(f"Error in on_active_object_changed: {e}")


def on_object_name_changed():
    """Called when any object's name changes."""
    try:
        # In msgbus callbacks, we don't get the specific object
        # So we send a generic notification
        connection.send_to_blendmate({
            "type": "event",
            "event": "object_name_changed"
        })
        info("Object name changed")
    except Exception as e:
        info(f"Error in on_object_name_changed: {e}")


def on_object_location_changed():
    """Called when any object's location changes.
    
    Note: This subscription fires for ANY object location change, but we only
    report the active object's transform since Blendmate focuses on user context.
    If you need to track all objects, you'd need per-object subscriptions.
    """
    try:
        active_obj = bpy.context.view_layer.objects.active
        if active_obj:
            connection.send_to_blendmate({
                "type": "event",
                "event": "object_transform_changed",
                "object": active_obj.name,
                "property": "location",
                "value": list(active_obj.location)
            })
        # Note: If no active object, we silently ignore (expected behavior for context-aware mode)
    except Exception as e:
        info(f"Error in on_object_location_changed: {e}")


def on_object_rotation_changed():
    """Called when any object's rotation changes.
    
    Note: This subscription fires for ANY object rotation change, but we only
    report the active object's transform since Blendmate focuses on user context.
    If you need to track all objects, you'd need per-object subscriptions.
    """
    try:
        active_obj = bpy.context.view_layer.objects.active
        if active_obj:
            connection.send_to_blendmate({
                "type": "event",
                "event": "object_transform_changed",
                "object": active_obj.name,
                "property": "rotation_euler",
                "value": list(active_obj.rotation_euler)
            })
        # Note: If no active object, we silently ignore (expected behavior for context-aware mode)
    except Exception as e:
        info(f"Error in on_object_rotation_changed: {e}")


def on_object_scale_changed():
    """Called when any object's scale changes.
    
    Note: This subscription fires for ANY object scale change, but we only
    report the active object's transform since Blendmate focuses on user context.
    If you need to track all objects, you'd need per-object subscriptions.
    """
    try:
        active_obj = bpy.context.view_layer.objects.active
        if active_obj:
            connection.send_to_blendmate({
                "type": "event",
                "event": "object_transform_changed",
                "object": active_obj.name,
                "property": "scale",
                "value": list(active_obj.scale)
            })
        # Note: If no active object, we silently ignore (expected behavior for context-aware mode)
    except Exception as e:
        info(f"Error in on_object_scale_changed: {e}")


def on_scene_frame_changed():
    """Called when scene frame_current changes."""
    try:
        frame = bpy.context.scene.frame_current
        connection.send_to_blendmate({
            "type": "event",
            "event": "frame_changed",
            "frame": frame
        })
        info(f"Frame changed: {frame}")
    except Exception as e:
        info(f"Error in on_scene_frame_changed: {e}")


# === Subscription management ===

def subscribe_all():
    """Subscribe to all RNA properties we want to track."""
    global _owner, _subscriptions_active
    
    if _subscriptions_active:
        info("Subscriptions already active")
        return
    
    # Create stable owner if needed
    if _owner is None:
        _owner = SubscriptionOwner()
    
    info("Setting up msgbus subscriptions...")
    
    try:
        # Subscribe to active object changes
        # Note: view_layer.objects.active is the RNA path
        bpy.msgbus.subscribe_rna(
            key=(bpy.types.LayerObjects, "active"),
            owner=_owner,
            args=(),
            notify=on_active_object_changed,
        )
        info("✓ Subscribed: active object")
        
        # Subscribe to object name changes (any object)
        bpy.msgbus.subscribe_rna(
            key=(bpy.types.Object, "name"),
            owner=_owner,
            args=(),
            notify=on_object_name_changed,
        )
        info("✓ Subscribed: object name")
        
        # Subscribe to object location changes (any object)
        bpy.msgbus.subscribe_rna(
            key=(bpy.types.Object, "location"),
            owner=_owner,
            args=(),
            notify=on_object_location_changed,
        )
        info("✓ Subscribed: object location")
        
        # Subscribe to object rotation changes (any object)
        bpy.msgbus.subscribe_rna(
            key=(bpy.types.Object, "rotation_euler"),
            owner=_owner,
            args=(),
            notify=on_object_rotation_changed,
        )
        info("✓ Subscribed: object rotation")
        
        # Subscribe to object scale changes (any object)
        bpy.msgbus.subscribe_rna(
            key=(bpy.types.Object, "scale"),
            owner=_owner,
            args=(),
            notify=on_object_scale_changed,
        )
        info("✓ Subscribed: object scale")
        
        # Subscribe to scene frame changes
        bpy.msgbus.subscribe_rna(
            key=(bpy.types.Scene, "frame_current"),
            owner=_owner,
            args=(),
            notify=on_scene_frame_changed,
        )
        info("✓ Subscribed: scene frame_current")
        
        _subscriptions_active = True
        info("All msgbus subscriptions registered successfully")
        
    except Exception as e:
        info(f"Error setting up subscriptions: {e}")
        _subscriptions_active = False


def unsubscribe_all():
    """Remove all msgbus subscriptions."""
    global _owner, _subscriptions_active
    
    if not _subscriptions_active:
        info("No active subscriptions to remove")
        return
    
    if _owner is None:
        info("No owner object, nothing to unsubscribe")
        return
    
    try:
        # Clear all subscriptions for our owner
        bpy.msgbus.clear_by_owner(_owner)
        info("All msgbus subscriptions cleared")
        _subscriptions_active = False
    except Exception as e:
        info(f"Error clearing subscriptions: {e}")


def register():
    """Register subscriptions module."""
    info("Registering subscriptions module")
    subscribe_all()


def unregister():
    """Unregister subscriptions module."""
    info("Unregistering subscriptions module")
    unsubscribe_all()
