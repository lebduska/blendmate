"""
Safe Blender Data Path Resolver

Resolves paths like:
- "objects['Cube']" -> bpy.data.objects['Cube']
- "objects['Cube'].modifiers['GeometryNodes']" -> ...
- "materials['Material'].node_tree.nodes['Principled BSDF']" -> ...

NO eval() is used - paths are parsed and resolved safely.
"""

import bpy
import re
from typing import Any, Tuple, List, Union

# Allowed root collections in bpy.data
ALLOWED_ROOTS = {
    'objects', 'meshes', 'materials', 'node_groups', 'collections',
    'lights', 'cameras', 'curves', 'textures', 'images', 'armatures',
    'actions', 'particles', 'worlds', 'scenes', 'texts', 'fonts',
    'grease_pencils', 'libraries', 'brushes', 'palettes', 'lattices',
}

# Pattern to match path segments
# Matches: identifier, ['key'], ["key"], [0]
SEGMENT_PATTERN = re.compile(
    r'''
    (?P<attr>[a-zA-Z_][a-zA-Z0-9_]*)          # attribute name
    |
    \[(?P<strkey>'[^']*'|"[^"]*")\]           # string key ['...'] or ["..."]
    |
    \[(?P<intkey>-?\d+)\]                      # integer index [0], [-1]
    ''',
    re.VERBOSE
)


def tokenize_path(path: str) -> List[Tuple[str, Union[str, int]]]:
    """
    Tokenize a path string into segments.

    Returns list of tuples: ('attr', name) or ('key', key) or ('index', int)

    Example:
        "objects['Cube'].modifiers[0].name"
        -> [('attr', 'objects'), ('key', 'Cube'), ('attr', 'modifiers'),
            ('index', 0), ('attr', 'name')]
    """
    segments = []
    pos = 0

    while pos < len(path):
        # Skip dots
        if path[pos] == '.':
            pos += 1
            continue

        match = SEGMENT_PATTERN.match(path, pos)
        if not match:
            raise ValueError(f"Invalid path syntax at position {pos}: {path[pos:]}")

        if match.group('attr'):
            segments.append(('attr', match.group('attr')))
        elif match.group('strkey'):
            # Remove quotes from key
            key = match.group('strkey')[1:-1]
            segments.append(('key', key))
        elif match.group('intkey') is not None:
            segments.append(('index', int(match.group('intkey'))))

        pos = match.end()

    return segments


def resolve_path(path: str) -> Any:
    """
    Safely resolve a Blender data path to an object.

    Path format:
        "objects['Cube']"
        "objects['Cube'].modifiers['GeometryNodes']"
        "materials['Mat'].node_tree.nodes['Principled BSDF'].inputs[0]"

    Returns the resolved Blender object or raises ValueError.
    """
    if not path:
        raise ValueError("Empty path")

    segments = tokenize_path(path)
    if not segments:
        raise ValueError("No valid segments in path")

    # First segment must be an attribute (collection name)
    seg_type, seg_value = segments[0]
    if seg_type != 'attr':
        raise ValueError(f"Path must start with a collection name, got: {path}")

    if seg_value not in ALLOWED_ROOTS:
        raise ValueError(f"Unknown root collection: {seg_value}. Allowed: {ALLOWED_ROOTS}")

    # Start from bpy.data
    obj = getattr(bpy.data, seg_value)

    # Resolve remaining segments
    for seg_type, seg_value in segments[1:]:
        if seg_type == 'attr':
            if not hasattr(obj, seg_value):
                raise ValueError(f"Object has no attribute '{seg_value}'")
            obj = getattr(obj, seg_value)
        elif seg_type == 'key':
            # Dictionary-like access
            if hasattr(obj, 'get'):
                result = obj.get(seg_value)
                if result is None:
                    raise ValueError(f"Key '{seg_value}' not found")
                obj = result
            else:
                raise ValueError(f"Cannot use key access on {type(obj)}")
        elif seg_type == 'index':
            # Array-like access
            try:
                obj = obj[seg_value]
            except (IndexError, KeyError, TypeError) as e:
                raise ValueError(f"Cannot access index {seg_value}: {e}")

    return obj


def get_property(target: str, path: str) -> Any:
    """
    Get a property value from a Blender object.

    Args:
        target: Path to the object, e.g. "objects['Cube']"
        path: Property path on the object, e.g. "location" or "location[0]"

    Returns the property value, converted to JSON-serializable format.
    """
    obj = resolve_path(target)

    if path:
        # Resolve the property path
        segments = tokenize_path(path)
        for seg_type, seg_value in segments:
            if seg_type == 'attr':
                obj = getattr(obj, seg_value)
            elif seg_type in ('key', 'index'):
                obj = obj[seg_value]

    # Convert to JSON-serializable
    return to_json_value(obj)


def set_property(target: str, path: str, value: Any) -> None:
    """
    Set a property value on a Blender object.

    Args:
        target: Path to the object, e.g. "objects['Cube']"
        path: Property path on the object, e.g. "location" or "location[0]"
        value: The value to set
    """
    obj = resolve_path(target)

    if not path:
        raise ValueError("Property path is required for set operation")

    segments = tokenize_path(path)

    # Navigate to the parent of the final property
    for seg_type, seg_value in segments[:-1]:
        if seg_type == 'attr':
            obj = getattr(obj, seg_value)
        elif seg_type in ('key', 'index'):
            obj = obj[seg_value]

    # Set the final property
    final_type, final_value = segments[-1]

    if final_type == 'attr':
        # Convert value if needed (e.g., list to Vector)
        current = getattr(obj, final_value, None)
        converted = convert_value(value, current)
        setattr(obj, final_value, converted)
    elif final_type in ('key', 'index'):
        current = obj[final_value] if hasattr(obj, '__getitem__') else None
        converted = convert_value(value, current)
        obj[final_value] = converted


def to_json_value(value: Any) -> Any:
    """Convert a Blender value to JSON-serializable format."""
    # Handle None
    if value is None:
        return None

    # Handle basic types
    if isinstance(value, (bool, int, float, str)):
        return value

    # Handle lists/tuples
    if isinstance(value, (list, tuple)):
        return [to_json_value(v) for v in value]

    # Handle Blender Vector, Color, Euler, Quaternion, Matrix
    if hasattr(value, 'to_list'):
        return value.to_list()
    if hasattr(value, '__iter__') and hasattr(value, '__len__'):
        try:
            return [to_json_value(v) for v in value]
        except TypeError:
            pass

    # Handle objects with name attribute (like bpy.types.Object)
    if hasattr(value, 'name'):
        return value.name

    # Fallback to string
    return str(value)


def convert_value(value: Any, current: Any = None) -> Any:
    """
    Convert a JSON value to appropriate Blender type.

    Uses the current value's type as a hint for conversion.
    """
    if current is None:
        return value

    # If it's a list and current is a Vector/Color/Euler, keep as list
    # Blender will convert automatically
    if isinstance(value, list):
        # Check if current value has same length
        if hasattr(current, '__len__') and len(current) == len(value):
            return value

    return value
