"""
Manual test script for msgbus subscriptions.
Run this in Blender's Python console to verify subscriptions work correctly.

This simulates the addon registration and verifies subscriptions are set up.
"""

import bpy

def test_msgbus_subscriptions():
    """Test that msgbus subscriptions are properly registered."""
    
    print("\n=== Testing Blendmate msgbus subscriptions ===\n")
    
    # Check if addon is loaded
    addon_name = "blendmate-addon"
    if addon_name not in bpy.context.preferences.addons:
        print(f"❌ ERROR: {addon_name} not loaded")
        return False
    
    print(f"✓ Addon {addon_name} is loaded")
    
    # Test that subscriptions module exists
    try:
        import sys
        addon_modules = [name for name in sys.modules.keys() if 'blendmate' in name.lower()]
        print(f"✓ Found addon modules: {len(addon_modules)}")
        for mod in addon_modules:
            print(f"  - {mod}")
    except Exception as e:
        print(f"❌ Error checking modules: {e}")
    
    # Test active object change
    print("\n--- Testing active object change ---")
    original_obj = bpy.context.view_layer.objects.active
    try:
        # Create test object
        bpy.ops.mesh.primitive_cube_add()
        cube = bpy.context.active_object
        cube.name = "TestCube_msgbus"
        print(f"✓ Created test object: {cube.name}")
        
        # Change active object
        bpy.context.view_layer.objects.active = None
        print("✓ Changed active object to None")
        
        bpy.context.view_layer.objects.active = cube
        print(f"✓ Changed active object to {cube.name}")
        
        # Test object transform
        print("\n--- Testing object transform ---")
        cube.location = (1.0, 2.0, 3.0)
        print(f"✓ Changed location to {cube.location}")
        
        cube.rotation_euler = (0.5, 0.5, 0.5)
        print(f"✓ Changed rotation to {cube.rotation_euler}")
        
        cube.scale = (2.0, 2.0, 2.0)
        print(f"✓ Changed scale to {cube.scale}")
        
        # Test name change
        print("\n--- Testing name change ---")
        cube.name = "TestCube_renamed"
        print(f"✓ Renamed to {cube.name}")
        
        # Test frame change
        print("\n--- Testing frame change ---")
        original_frame = bpy.context.scene.frame_current
        bpy.context.scene.frame_current = 42
        print(f"✓ Changed frame to {bpy.context.scene.frame_current}")
        bpy.context.scene.frame_current = original_frame
        
        # Cleanup
        bpy.data.objects.remove(cube, do_unlink=True)
        print("\n✓ Cleanup complete")
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        bpy.context.view_layer.objects.active = original_obj
    
    print("\n=== All manual tests completed ===")
    print("\nCheck the Blendmate app to verify events were received:")
    print("- active_object_changed")
    print("- object_transform_changed (location, rotation, scale)")
    print("- object_name_changed")
    print("- frame_changed")
    
    return True


if __name__ == "__main__":
    test_msgbus_subscriptions()
