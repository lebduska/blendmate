"""
Blendmate Command Handlers

Provides generic commands for property manipulation and operator calls.
"""

import bpy
from typing import Dict, Any, Callable
from .resolver import resolve_path, get_property, set_property, to_json_value

# Registry of command handlers
COMMAND_HANDLERS: Dict[str, Callable[[str, Dict], Dict]] = {}


def register_command(action: str):
    """Decorator to register a command handler."""
    def decorator(fn: Callable[[str, Dict], Dict]):
        COMMAND_HANDLERS[action] = fn
        return fn
    return decorator


@register_command("property.get")
def cmd_property_get(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get a property value from a Blender object.

    Args:
        target: Path to object, e.g. "objects['Cube']"
        params:
            path: Property path, e.g. "location" or "modifiers[0].show_viewport"

    Returns:
        {"success": True, "data": <value>} or {"success": False, "error": "..."}
    """
    try:
        path = params.get("path", "")
        value = get_property(target, path)
        return {"success": True, "data": value}
    except Exception as e:
        return {"success": False, "error": str(e)}


@register_command("property.set")
def cmd_property_set(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Set a property value on a Blender object.

    Args:
        target: Full path to property, e.g. "objects['Cube'].location" or "objects['Cube'].modifiers['Solidify'].thickness"
                OR path to object if 'path' param is provided
        params:
            path: (optional) Property path, e.g. "location" or "location[0]"
            value: The value to set

    Returns:
        {"success": True} or {"success": False, "error": "..."}
    """
    try:
        path = params.get("path")
        value = params.get("value")

        if value is None:
            return {"success": False, "error": "Missing 'value' parameter"}

        # If no path provided, the full path is in target - split it
        if path is None:
            # Split target into object path and property path
            # e.g. "objects['Cube'].modifiers['Solidify'].thickness" ->
            #      object: "objects['Cube']", path: "modifiers['Solidify'].thickness"
            import re
            match = re.match(r"^(\w+\['[^']+'\])(\.(.+))?$", target)
            if match:
                obj_target = match.group(1)  # e.g. "objects['Cube']"
                path = match.group(3) or ""   # e.g. "modifiers['Solidify'].thickness"
                target = obj_target
            else:
                return {"success": False, "error": f"Cannot parse target path: {target}. Expected format: collection['name'].property"}

        if not path:
            return {"success": False, "error": "Property path is required"}

        # Resolve the target object first to check it exists
        try:
            obj = resolve_path(target)
        except Exception as e:
            return {"success": False, "error": f"Cannot resolve target '{target}': {e}"}

        # Handle special cases for modifier properties
        # If value is a string that looks like an object reference (e.g., "Cube" for Boolean.object)
        if isinstance(value, str) and path.endswith('.object'):
            # Try to resolve as object reference
            if value in bpy.data.objects:
                value = bpy.data.objects[value]
            else:
                return {"success": False, "error": f"Object '{value}' not found for reference"}

        # Push undo state before making changes
        try:
            bpy.ops.ed.undo_push(message=f"Blendmate: Set {target}.{path}")
        except Exception:
            pass  # Undo push might fail in some contexts, continue anyway

        set_property(target, path, value)

        # Return the new value to confirm
        new_value = get_property(target, path)
        return {"success": True, "data": new_value}

    except Exception as e:
        import traceback
        return {"success": False, "error": f"{str(e)}\n{traceback.format_exc()}"}


@register_command("property.set_batch")
def cmd_property_set_batch(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Set multiple properties at once (single undo step).

    Args:
        target: Path to object, e.g. "objects['Cube']"
        params:
            properties: List of {"path": "...", "value": ...}

    Returns:
        {"success": True, "count": N} or {"success": False, "error": "..."}
    """
    try:
        properties = params.get("properties", [])
        if not properties:
            return {"success": False, "error": "No properties to set"}

        # Single undo push for all changes
        bpy.ops.ed.undo_push(message=f"Blendmate: Batch update {target}")

        count = 0
        errors = []

        for prop in properties:
            path = prop.get("path")
            value = prop.get("value")
            if path is not None and value is not None:
                try:
                    set_property(target, path, value)
                    count += 1
                except Exception as e:
                    errors.append(f"{path}: {e}")

        if errors:
            return {
                "success": True,
                "count": count,
                "warnings": errors
            }
        return {"success": True, "count": count}

    except Exception as e:
        return {"success": False, "error": str(e)}


@register_command("object.select")
def cmd_object_select(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Select/deselect an object.

    Args:
        target: Object name (not full path), e.g. "Cube"
        params:
            mode: "set" (replace selection), "add", "remove", "toggle"
            active: If True, also make this the active object

    Returns:
        {"success": True} or {"success": False, "error": "..."}
    """
    try:
        obj = bpy.data.objects.get(target)
        if not obj:
            return {"success": False, "error": f"Object '{target}' not found"}

        mode = params.get("mode", "set")
        make_active = params.get("active", True)

        if mode == "set":
            # Deselect all, then select this one
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
        elif mode == "add":
            obj.select_set(True)
        elif mode == "remove":
            obj.select_set(False)
        elif mode == "toggle":
            obj.select_set(not obj.select_get())
        else:
            return {"success": False, "error": f"Unknown mode: {mode}"}

        if make_active and obj.select_get():
            bpy.context.view_layer.objects.active = obj

        return {"success": True}

    except Exception as e:
        return {"success": False, "error": str(e)}


@register_command("object.rename")
def cmd_object_rename(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rename an object.

    Args:
        target: Current object name
        params:
            name: New name

    Returns:
        {"success": True, "data": {"name": "final_name"}}
    """
    try:
        obj = bpy.data.objects.get(target)
        if not obj:
            return {"success": False, "error": f"Object '{target}' not found"}

        new_name = params.get("name")
        if not new_name:
            return {"success": False, "error": "Missing 'name' parameter"}

        bpy.ops.ed.undo_push(message=f"Blendmate: Rename {target} to {new_name}")
        obj.name = new_name

        # Return the final name (Blender may add suffix if name exists)
        return {"success": True, "data": {"name": obj.name}}

    except Exception as e:
        return {"success": False, "error": str(e)}


@register_command("operator.call")
def cmd_operator_call(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call a Blender operator.

    Args:
        target: Operator path, e.g. "object.duplicate" or "mesh.primitive_cube_add"
        params: Operator arguments

    Returns:
        {"success": True, "data": {"result": "FINISHED"}}

    Security: Only allows operators from a whitelist of safe categories.
    """
    try:
        # Parse operator path
        parts = target.split(".")
        if len(parts) != 2:
            return {"success": False, "error": f"Invalid operator path: {target}"}

        category, name = parts

        # Whitelist of safe operator categories
        SAFE_CATEGORIES = {
            'object', 'mesh', 'curve', 'surface', 'armature', 'lattice',
            'transform', 'view3d', 'node', 'material', 'texture',
            'uv', 'paint', 'sculpt', 'gpencil', 'anim', 'action',
            'marker', 'pose', 'constraint', 'screen', 'wm',
        }

        # Blacklist of dangerous operators
        BLOCKED_OPERATORS = {
            'wm.quit_blender', 'wm.save_mainfile', 'wm.open_mainfile',
            'wm.read_factory_settings', 'wm.recover_auto_save',
            'wm.recover_last_session', 'preferences.addon_install',
            'preferences.addon_remove', 'script.python_file_run',
            'script.execute_preset', 'text.run_script',
        }

        full_name = f"{category}.{name}"

        if full_name in BLOCKED_OPERATORS:
            return {"success": False, "error": f"Operator '{full_name}' is blocked for security"}

        if category not in SAFE_CATEGORIES:
            return {"success": False, "error": f"Operator category '{category}' is not allowed"}

        # Get the operator
        if not hasattr(bpy.ops, category):
            return {"success": False, "error": f"Unknown operator category: {category}"}

        op_category = getattr(bpy.ops, category)
        if not hasattr(op_category, name):
            return {"success": False, "error": f"Unknown operator: {full_name}"}

        op = getattr(op_category, name)

        # Push undo before operator
        bpy.ops.ed.undo_push(message=f"Blendmate: {full_name}")

        # Call the operator
        result = op(**params)

        return {"success": True, "data": {"result": str(result)}}

    except Exception as e:
        return {"success": False, "error": str(e)}


@register_command("get_capabilities")
def cmd_get_capabilities(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get comprehensive information about available Blender capabilities.
    Called once at session start to inform the AI about what it can do.

    Returns extensive data about operators, modifiers, and object types.
    """
    try:
        capabilities = {
            "operators": _get_operators_info(),
            "modifiers": _get_modifiers_info(),
            "object_types": _get_object_types(),
            "primitive_meshes": _get_primitive_meshes(),
        }
        return {"success": True, "data": capabilities}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _get_operators_info() -> Dict[str, Any]:
    """Extract info about commonly used operators."""
    # Focus on the most useful operators for modeling
    operators = {}

    # Mesh primitives
    mesh_primitives = {
        "mesh.primitive_cube_add": {
            "desc": "Add cube",
            "params": {"size": "float=2", "location": "[x,y,z]", "rotation": "[x,y,z] radians"}
        },
        "mesh.primitive_cylinder_add": {
            "desc": "Add cylinder",
            "params": {"radius": "float=1", "depth": "float=2", "vertices": "int=32", "location": "[x,y,z]"}
        },
        "mesh.primitive_uv_sphere_add": {
            "desc": "Add UV sphere",
            "params": {"radius": "float=1", "segments": "int=32", "ring_count": "int=16", "location": "[x,y,z]"}
        },
        "mesh.primitive_ico_sphere_add": {
            "desc": "Add ico sphere",
            "params": {"radius": "float=1", "subdivisions": "int=2", "location": "[x,y,z]"}
        },
        "mesh.primitive_cone_add": {
            "desc": "Add cone",
            "params": {"radius1": "float=1", "radius2": "float=0", "depth": "float=2", "vertices": "int=32", "location": "[x,y,z]"}
        },
        "mesh.primitive_torus_add": {
            "desc": "Add torus (donut)",
            "params": {"major_radius": "float=1", "minor_radius": "float=0.25", "major_segments": "int=48", "minor_segments": "int=12", "location": "[x,y,z]"}
        },
        "mesh.primitive_plane_add": {
            "desc": "Add plane",
            "params": {"size": "float=2", "location": "[x,y,z]"}
        },
        "mesh.primitive_circle_add": {
            "desc": "Add circle (edge loop)",
            "params": {"radius": "float=1", "vertices": "int=32", "fill_type": "'NOTHING'|'NGON'|'TRIFAN'", "location": "[x,y,z]"}
        },
        "mesh.primitive_grid_add": {
            "desc": "Add subdivided plane grid",
            "params": {"x_subdivisions": "int=10", "y_subdivisions": "int=10", "size": "float=2", "location": "[x,y,z]"}
        },
        "mesh.primitive_monkey_add": {
            "desc": "Add Suzanne monkey head",
            "params": {"size": "float=2", "location": "[x,y,z]"}
        },
    }
    operators.update(mesh_primitives)

    # Object operations
    object_ops = {
        "object.delete": {
            "desc": "Delete selected objects",
            "params": {"use_global": "bool=False"},
            "requires": "SELECT object first!"
        },
        "object.duplicate": {
            "desc": "Duplicate selected objects",
            "params": {"linked": "bool=False"},
            "requires": "SELECT object first!"
        },
        "object.duplicate_move": {
            "desc": "Duplicate and move",
            "params": {},
            "requires": "SELECT object first!"
        },
        "object.join": {
            "desc": "Join selected objects into active",
            "params": {},
            "requires": "SELECT multiple objects, last selected is active"
        },
        "object.origin_set": {
            "desc": "Set object origin",
            "params": {"type": "'GEOMETRY_ORIGIN'|'ORIGIN_GEOMETRY'|'ORIGIN_CURSOR'|'ORIGIN_CENTER_OF_MASS'|'ORIGIN_CENTER_OF_VOLUME'"}
        },
        "object.shade_smooth": {
            "desc": "Set smooth shading",
            "params": {},
            "requires": "SELECT object first!"
        },
        "object.shade_flat": {
            "desc": "Set flat shading",
            "params": {},
            "requires": "SELECT object first!"
        },
        "object.convert": {
            "desc": "Convert object type",
            "params": {"target": "'MESH'|'CURVE'|'GPENCIL'"}
        },
        "object.modifier_add": {
            "desc": "Add modifier to active object",
            "params": {"type": "modifier_type (see modifiers list)"}
        },
        "object.modifier_remove": {
            "desc": "Remove modifier",
            "params": {"modifier": "modifier_name"}
        },
        "object.modifier_apply": {
            "desc": "Apply modifier permanently",
            "params": {"modifier": "modifier_name"}
        },
        "object.select_all": {
            "desc": "Select/deselect all",
            "params": {"action": "'SELECT'|'DESELECT'|'TOGGLE'|'INVERT'"}
        },
    }
    operators.update(object_ops)

    # Transform operations
    transform_ops = {
        "transform.translate": {
            "desc": "Move selected objects",
            "params": {"value": "[x,y,z]"},
            "requires": "SELECT object first!"
        },
        "transform.rotate": {
            "desc": "Rotate selected objects",
            "params": {"value": "float radians", "orient_axis": "'X'|'Y'|'Z'"},
            "requires": "SELECT object first!"
        },
        "transform.resize": {
            "desc": "Scale selected objects",
            "params": {"value": "[x,y,z]"},
            "requires": "SELECT object first!"
        },
        "transform.mirror": {
            "desc": "Mirror selected objects",
            "params": {"orient_type": "'GLOBAL'|'LOCAL'"},
            "requires": "SELECT object first!"
        },
    }
    operators.update(transform_ops)

    # Mesh edit operations (require Edit Mode, but good to know)
    mesh_ops = {
        "mesh.extrude_region_move": {
            "desc": "Extrude faces",
            "params": {},
            "note": "Requires Edit Mode"
        },
        "mesh.inset": {
            "desc": "Inset faces",
            "params": {"thickness": "float", "depth": "float"},
            "note": "Requires Edit Mode"
        },
        "mesh.bevel": {
            "desc": "Bevel edges/vertices",
            "params": {"offset": "float", "segments": "int"},
            "note": "Requires Edit Mode"
        },
        "mesh.subdivide": {
            "desc": "Subdivide selected",
            "params": {"number_cuts": "int=1"},
            "note": "Requires Edit Mode"
        },
        "mesh.loop_cut_slide": {
            "desc": "Add loop cut",
            "params": {"number_cuts": "int=1"},
            "note": "Requires Edit Mode, interactive"
        },
        "mesh.fill": {
            "desc": "Fill selected edge loop",
            "params": {},
            "note": "Requires Edit Mode"
        },
        "mesh.bridge_edge_loops": {
            "desc": "Bridge two edge loops",
            "params": {},
            "note": "Requires Edit Mode"
        },
        "mesh.separate": {
            "desc": "Separate mesh parts",
            "params": {"type": "'SELECTED'|'MATERIAL'|'LOOSE'"},
            "note": "Requires Edit Mode"
        },
        "mesh.flip_normals": {
            "desc": "Flip face normals",
            "params": {},
            "note": "Requires Edit Mode"
        },
        "mesh.normals_make_consistent": {
            "desc": "Recalculate normals",
            "params": {"inside": "bool=False"},
            "note": "Requires Edit Mode"
        },
    }
    operators.update(mesh_ops)

    # Curve primitives
    curve_ops = {
        "curve.primitive_bezier_circle_add": {
            "desc": "Add bezier circle",
            "params": {"radius": "float=1", "location": "[x,y,z]"}
        },
        "curve.primitive_bezier_curve_add": {
            "desc": "Add bezier curve",
            "params": {"location": "[x,y,z]"}
        },
        "curve.primitive_nurbs_circle_add": {
            "desc": "Add NURBS circle",
            "params": {"radius": "float=1", "location": "[x,y,z]"}
        },
        "curve.primitive_nurbs_path_add": {
            "desc": "Add NURBS path",
            "params": {"location": "[x,y,z]"}
        },
    }
    operators.update(curve_ops)

    return operators


def _get_modifiers_info() -> Dict[str, Any]:
    """Get info about available modifiers and their key properties."""
    modifiers = {
        # Generate modifiers
        "ARRAY": {
            "desc": "Duplicate object in array",
            "props": {
                "count": "int - number of copies",
                "relative_offset_displace": "[x,y,z] - offset multiplier",
                "constant_offset_displace": "[x,y,z] - absolute offset",
                "use_relative_offset": "bool",
                "use_constant_offset": "bool",
                "use_merge_vertices": "bool",
            }
        },
        "BEVEL": {
            "desc": "Bevel edges",
            "props": {
                "width": "float - bevel width",
                "segments": "int - number of segments",
                "limit_method": "'NONE'|'ANGLE'|'WEIGHT'|'VGROUP'",
                "angle_limit": "float radians - for ANGLE method",
                "affect": "'VERTICES'|'EDGES'",
            }
        },
        "BOOLEAN": {
            "desc": "Boolean operation with another object",
            "props": {
                "operation": "'INTERSECT'|'UNION'|'DIFFERENCE'",
                "object": "target object",
                "solver": "'FAST'|'EXACT'",
            }
        },
        "BUILD": {
            "desc": "Animate mesh construction",
            "props": {
                "frame_start": "float",
                "frame_duration": "float",
            }
        },
        "DECIMATE": {
            "desc": "Reduce polygon count",
            "props": {
                "decimate_type": "'COLLAPSE'|'UNSUBDIV'|'DISSOLVE'",
                "ratio": "float 0-1 - target ratio",
            }
        },
        "MIRROR": {
            "desc": "Mirror mesh across axis",
            "props": {
                "use_axis": "[bool, bool, bool] - X, Y, Z",
                "use_bisect_axis": "[bool, bool, bool]",
                "merge_threshold": "float",
                "mirror_object": "object for mirror center",
            }
        },
        "REMESH": {
            "desc": "Recreate mesh topology",
            "props": {
                "mode": "'BLOCKS'|'SMOOTH'|'SHARP'|'VOXEL'",
                "octree_depth": "int",
                "voxel_size": "float",
            }
        },
        "SCREW": {
            "desc": "Lathe/screw extrusion",
            "props": {
                "angle": "float radians - rotation angle",
                "screw_offset": "float - height per revolution",
                "iterations": "int - number of revolutions",
                "steps": "int - subdivisions per revolution",
                "axis": "'X'|'Y'|'Z'",
            }
        },
        "SKIN": {
            "desc": "Generate skin mesh from vertices/edges",
            "props": {}
        },
        "SOLIDIFY": {
            "desc": "Add thickness to surface",
            "props": {
                "thickness": "float - wall thickness",
                "offset": "float -1 to 1 - direction",
                "use_even_offset": "bool",
                "use_rim": "bool - fill edges",
            }
        },
        "SUBDIVISION": {
            "desc": "Subdivide mesh smoothly (Catmull-Clark)",
            "props": {
                "levels": "int - viewport subdivisions",
                "render_levels": "int - render subdivisions",
                "subdivision_type": "'CATMULL_CLARK'|'SIMPLE'",
                "use_limit_surface": "bool",
            }
        },
        "TRIANGULATE": {
            "desc": "Convert all faces to triangles",
            "props": {
                "quad_method": "'BEAUTY'|'FIXED'|'FIXED_ALTERNATE'|'SHORTEST_DIAGONAL'",
            }
        },
        "WELD": {
            "desc": "Merge vertices by distance",
            "props": {
                "merge_threshold": "float",
            }
        },
        "WIREFRAME": {
            "desc": "Convert to wireframe mesh",
            "props": {
                "thickness": "float",
                "use_boundary": "bool",
            }
        },
        # Deform modifiers
        "ARMATURE": {
            "desc": "Skeletal deformation",
            "props": {
                "object": "armature object",
            }
        },
        "CAST": {
            "desc": "Cast to sphere/cylinder/cuboid",
            "props": {
                "cast_type": "'SPHERE'|'CYLINDER'|'CUBOID'",
                "factor": "float",
            }
        },
        "CURVE": {
            "desc": "Deform along curve",
            "props": {
                "object": "curve object",
                "deform_axis": "'POS_X'|'POS_Y'|'POS_Z'|'NEG_X'|'NEG_Y'|'NEG_Z'",
            }
        },
        "DISPLACE": {
            "desc": "Displace vertices by texture",
            "props": {
                "strength": "float",
                "mid_level": "float 0-1",
                "direction": "'X'|'Y'|'Z'|'NORMAL'|'RGB_TO_XYZ'",
            }
        },
        "LATTICE": {
            "desc": "Deform by lattice",
            "props": {
                "object": "lattice object",
            }
        },
        "SHRINKWRAP": {
            "desc": "Shrink to target surface",
            "props": {
                "target": "target object",
                "wrap_method": "'NEAREST_SURFACEPOINT'|'PROJECT'|'NEAREST_VERTEX'|'TARGET_PROJECT'",
                "offset": "float",
            }
        },
        "SIMPLE_DEFORM": {
            "desc": "Twist/bend/taper/stretch",
            "props": {
                "deform_method": "'TWIST'|'BEND'|'TAPER'|'STRETCH'",
                "angle": "float radians",
                "factor": "float",
                "deform_axis": "'X'|'Y'|'Z'",
            }
        },
        "SMOOTH": {
            "desc": "Smooth vertices",
            "props": {
                "factor": "float",
                "iterations": "int",
            }
        },
        "WAVE": {
            "desc": "Animated wave deformation",
            "props": {
                "height": "float",
                "width": "float",
                "speed": "float",
            }
        },
    }
    return modifiers


def _get_object_types() -> list:
    """List of object types that can be created."""
    return [
        "MESH", "CURVE", "SURFACE", "META", "FONT", "CURVES", "POINTCLOUD",
        "VOLUME", "GPENCIL", "GREASEPENCIL", "ARMATURE", "LATTICE",
        "EMPTY", "LIGHT", "LIGHT_PROBE", "CAMERA", "SPEAKER"
    ]


def _get_primitive_meshes() -> list:
    """Quick list of primitive mesh types."""
    return [
        "plane", "cube", "circle", "uv_sphere", "ico_sphere",
        "cylinder", "cone", "torus", "grid", "monkey"
    ]


@register_command("addon.reload")
def cmd_addon_reload(target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reload the Blendmate addon.

    This safely disables and re-enables the addon, reloading all Python modules.
    Useful for development when addon code has changed.

    Returns:
        {"success": True} or {"success": False, "error": "..."}
    """
    import sys

    try:
        # Get the addon module name
        package_name = __package__.split('.')[0] if __package__ and '.' in __package__ else __package__
        if not package_name:
            package_name = "blendmate-addon"

        print(f"[Blendmate] Reloading addon: {package_name}")

        # Try to unregister first
        try:
            if package_name in sys.modules:
                root = sys.modules[package_name]
                if hasattr(root, "unregister"):
                    root.unregister()
        except Exception as e:
            print(f"[Blendmate] Unregister warning: {e}")

        # Disable and re-enable the addon
        try:
            bpy.ops.preferences.addon_disable(module=package_name)
        except Exception as e:
            print(f"[Blendmate] Disable warning: {e}")

        bpy.ops.preferences.addon_enable(module=package_name)

        print("[Blendmate] Addon reloaded successfully")
        return {"success": True, "data": {"reloaded": True}}

    except Exception as e:
        return {"success": False, "error": str(e)}


def handle_command(action: str, target: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle a command by dispatching to the appropriate handler.

    Args:
        action: Command action, e.g. "property.set"
        target: Target path or name
        params: Command parameters

    Returns:
        Command result dict
    """
    handler = COMMAND_HANDLERS.get(action)
    if not handler:
        return {"success": False, "error": f"Unknown command: {action}"}

    return handler(target, params)
