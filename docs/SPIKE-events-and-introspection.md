# SPIKE: Blender Events & Scene Introspection

**Date:** 2026-01-02
**Goal:** Zjistit všechny smysluplné eventy pro Blendmate + jak získat data o scéně/objektech

---

## 1. Přehled zdrojů eventů

Blender má 3 hlavní mechanismy pro sledování změn:

| Mechanismus | Granularita | Frekvence | Použití |
|-------------|-------------|-----------|---------|
| `bpy.app.handlers.*` | Hrubá (file, frame, render) | Nízká-střední | Lifecycle events |
| `bpy.msgbus` | Jemná (konkrétní property) | Dle změn | Property changes |
| `bpy.app.timers` | Polling | Nastavitelná | Fallback, debounce |

---

## 2. Smysluplné eventy pro Blendmate

### 2.1 TIER 1 - Kritické (implementovat hned)

| Event | Handler | Data | Proč je důležitý |
|-------|---------|------|------------------|
| **Active GN node change** | `depsgraph_update_post` + check | `node.bl_idname`, `node.name` | Core use case - help pro GN nodes |
| **File save** | `save_post` | `bpy.data.filepath` | Sync stavu, logging |
| **File load** | `load_post` | `bpy.data.filepath` | Reinicializace, nový context |
| **Connection status** | WebSocket events | connected/disconnected | UX feedback |

### 2.2 TIER 2 - Užitečné (implementovat brzy)

| Event | Handler | Data | Proč je důležitý |
|-------|---------|------|------------------|
| **Selection change** | `msgbus` on `Object.select_get()` | Selected objects list | Outliner sync |
| **Active object change** | `msgbus` on `ViewLayer.objects.active` | Active object | Context awareness |
| **Mode change** | `msgbus` on `Object.mode` | Object mode (EDIT, OBJECT, SCULPT...) | UI adaptation |
| **Undo/Redo** | `undo_post`, `redo_post` | - | State refresh |

### 2.3 TIER 3 - Nice-to-have (later)

| Event | Handler | Data | Proč je důležitý |
|-------|---------|------|------------------|
| **Frame change** | `frame_change_post` | `scene.frame_current` | Animation context |
| **Render start/complete** | `render_pre`, `render_complete` | - | Render monitoring |
| **Object transform** | `msgbus` on `Object.location/rotation/scale` | Transform values | Real-time sync |
| **Material change** | `msgbus` on material props | Material data | Material context |
| **Modifier added/removed** | `depsgraph_update_post` + diff | Modifier list | GN modifier tracking |

---

## 3. Scene & Object Introspection (pro Outliner)

### 3.1 Základní přístup k datům

```python
import bpy

# Všechny objekty v souboru
all_objects = bpy.data.objects

# Objekty v aktivní scéně
scene_objects = bpy.context.scene.objects

# Aktivní objekt
active_obj = bpy.context.active_object

# Vybrané objekty
selected = bpy.context.selected_objects

# Kolekce (hierarchie)
root_collection = bpy.context.scene.collection
```

### 3.2 Hierarchie kolekcí (Outliner structure)

```python
def get_collection_tree(collection, depth=0):
    """Rekurzivně získá strom kolekcí."""
    result = {
        "name": collection.name,
        "objects": [obj.name for obj in collection.objects],
        "children": []
    }
    for child in collection.children:
        result["children"].append(get_collection_tree(child, depth + 1))
    return result

# Použití:
tree = get_collection_tree(bpy.context.scene.collection)
```

### 3.3 Object properties pro Outliner

```python
def get_object_info(obj):
    """Základní info o objektu pro outliner."""
    return {
        "name": obj.name,
        "type": obj.type,  # MESH, CURVE, EMPTY, LIGHT, CAMERA, ARMATURE...
        "visible": obj.visible_get(),
        "selected": obj.select_get(),
        "active": obj == bpy.context.active_object,
        "parent": obj.parent.name if obj.parent else None,
        "children": [c.name for c in obj.children],
        "modifiers": [m.name for m in obj.modifiers],
        "has_gn": any(m.type == 'NODES' for m in obj.modifiers),
    }
```

### 3.4 Geometry Nodes specifické

```python
def get_gn_modifiers(obj):
    """Získá GN modifiery objektu."""
    gn_mods = []
    for mod in obj.modifiers:
        if mod.type == 'NODES' and mod.node_group:
            gn_mods.append({
                "name": mod.name,
                "node_group": mod.node_group.name,
                "nodes_count": len(mod.node_group.nodes),
            })
    return gn_mods

def get_active_gn_node():
    """Získá aktivní node v GN editoru."""
    for area in bpy.context.screen.areas:
        if area.type == 'NODE_EDITOR':
            space = area.spaces.active
            if space.tree_type == 'GeometryNodeTree':
                node_tree = space.node_tree
                if node_tree and node_tree.nodes.active:
                    node = node_tree.nodes.active
                    return {
                        "bl_idname": node.bl_idname,
                        "name": node.name,
                        "label": node.label,
                        "type": node.type,
                        "inputs": [i.name for i in node.inputs],
                        "outputs": [o.name for o in node.outputs],
                    }
    return None
```

---

## 4. Message Bus - Granulární sledování

### 4.1 Setup pattern

```python
import bpy

# Owner musí přežít - uložit jako globální nebo class attr
_msgbus_owner = object()

def on_selection_change():
    print("Selection changed:", [o.name for o in bpy.context.selected_objects])

def register_msgbus():
    # Subscribe na změnu selekce
    bpy.msgbus.subscribe_rna(
        key=(bpy.types.LayerObjects, "active"),
        owner=_msgbus_owner,
        args=(),
        notify=on_selection_change,
    )

def unregister_msgbus():
    bpy.msgbus.clear_by_owner(_msgbus_owner)
```

### 4.2 Užitečné msgbus keys

| Key | Trigger |
|-----|---------|
| `(bpy.types.LayerObjects, "active")` | Active object změna |
| `(bpy.types.Object, "mode")` | Mode změna (OBJECT/EDIT/...) |
| `(bpy.types.Object, "name")` | Přejmenování objektu |
| `(bpy.types.Object, "location")` | Pozice změna* |
| `(bpy.types.Object, "select_get")` | Selekce změna |

*Pozor: `location` přes msgbus nefunguje při transform operátorech (known issue)

### 4.3 Workaround pro transform

```python
# Transform changes nejlépe sledovat přes depsgraph + diff
_last_transforms = {}

def on_depsgraph_update(scene, depsgraph):
    for update in depsgraph.updates:
        if update.is_updated_transform:
            obj = update.id
            if isinstance(obj, bpy.types.Object):
                current = tuple(obj.location)
                if _last_transforms.get(obj.name) != current:
                    _last_transforms[obj.name] = current
                    send_transform_event(obj)
```

---

## 5. Doporučený Event Payload Format

```json
{
  "type": "context|event|scene",
  "timestamp": 1704153600000,
  "data": {
    // type-specific payload
  }
}
```

### 5.1 Context events (GN node focus)

```json
{
  "type": "context",
  "area": "gn",
  "node_id": "GeometryNodeInstanceOnPoints",
  "node_name": "Instance on Points",
  "node_label": ""
}
```

### 5.2 Scene events (selection, hierarchy)

```json
{
  "type": "scene",
  "event": "selection_changed",
  "active": "Cube",
  "selected": ["Cube", "Sphere"],
  "count": 2
}
```

### 5.3 File events

```json
{
  "type": "event",
  "event": "save_post",
  "filename": "/path/to/file.blend"
}
```

---

## 6. Implementační plán

### Phase 1: Základní eventy (current)
- [x] `save_post`, `load_post`
- [x] `depsgraph_update_post` (throttled)
- [x] Active GN node change

### Phase 2: Selection & Outliner
- [ ] Selection change event
- [ ] Active object change event
- [ ] Scene hierarchy snapshot on demand
- [ ] Mode change event

### Phase 3: Advanced
- [ ] Transform tracking (with diff)
- [ ] Modifier list changes
- [ ] Collection hierarchy changes
- [ ] Undo/Redo events

---

## 7. Známá omezení

1. **msgbus + transform**: `Object.location` msgbus nefunguje při použití transform operátorů
2. **depsgraph frequency**: Může být 60+ calls/sec, nutný throttle
3. **context restrictions**: Některé operace nejdou z handler kontextu
4. **no persistent msgbus**: Msgbus subscriptions se zruší při load, nutný re-subscribe v `load_post`

---

## 8. Reference

- [bpy.app.handlers](https://docs.blender.org/api/current/bpy.app.handlers.html)
- [bpy.msgbus](https://docs.blender.org/api/current/bpy.msgbus.html)
- [bpy.data](https://docs.blender.org/api/current/bpy.data.html)
- [bpy.types.Object](https://docs.blender.org/api/current/bpy.types.Object.html)
- [bpy.types.NodeTree](https://docs.blender.org/api/current/bpy.types.NodeTree.html)
- [GeometryNodeTree](https://docs.blender.org/api/current/bpy.types.GeometryNodeTree.html)
- [DevTalk: msgbus subscribe](https://devtalk.blender.org/t/using-bpy-msgbus-subscribe-rna/6443)

---

## 9. Next Steps

1. **Implementovat selection change** - msgbus subscription
2. **Přidat scene snapshot endpoint** - pro Outliner initial load
3. **Rozšířit GN node context** - inputs/outputs, connected nodes
4. **Dashboard v Bench** - přepínání mezi event log a structured view
