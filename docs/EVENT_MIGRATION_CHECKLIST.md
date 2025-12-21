# Event Migration Checklist

**For Issue:** lebduska/blendmate#[CURRENT_ISSUE]  
**Related:** #33 (Event system refactor), #37 (Normalized events)

---

## Current Event Inventory

### Handlers (4 total)

- [x] **`handlers.py:4-19`** → `on_depsgraph_update`
  - **Hook:** `bpy.app.handlers.depsgraph_update_post`
  - **Purpose:** Detect active Geometry Node changes
  - **Frequency:** Very High (10-100+/sec)
  - **Rationale:** Monitors node editor for active node ID; sends context to app
  - **Issue:** ⚠️ High CPU usage, no debouncing, polling-based detection
  - **Recommendation:** 🔄 Migrate to `bpy.msgbus.subscribe_rna` on `SpaceNodeEditor.node_tree`

- [x] **`handlers.py:21-24`** → `on_frame_change`
  - **Hook:** `bpy.app.handlers.frame_change_post`
  - **Purpose:** Track timeline position
  - **Frequency:** High (1-60/sec during playback)
  - **Rationale:** Sync frame number with app for timeline awareness
  - **Issue:** ⚠️ Spam during playback, no throttling
  - **Recommendation:** ✅ Keep handler, add 100ms debounce

- [x] **`handlers.py:26-29`** → `on_save_post`
  - **Hook:** `bpy.app.handlers.save_post`
  - **Purpose:** File save notification
  - **Frequency:** Low (user action)
  - **Rationale:** Notify app of file saves for sync/backup features
  - **Issue:** None
  - **Recommendation:** ✅ Keep as-is, normalize payload (add `blender_version`, `timestamp`)

- [x] **`handlers.py:31-34`** → `on_load_post`
  - **Hook:** `bpy.app.handlers.load_post`
  - **Purpose:** File load notification
  - **Frequency:** Low (user action)
  - **Rationale:** Notify app of file loads for context reset
  - **Issue:** None
  - **Recommendation:** ✅ Keep as-is, normalize payload, add to normalized event schema

### Timers (1 total)

- [x] **`connection.py:27-53`** → `process_queue`
  - **Hook:** `bpy.app.timers.register`
  - **Purpose:** Process message queue and send via WebSocket
  - **Interval:** 0.1s (100ms)
  - **Rationale:** Decouple event emission from I/O; prevent blocking
  - **Issue:** None
  - **Recommendation:** ✅ Keep as-is (already optimal)

### Msgbus Subscriptions (0 total)

- ❌ **None currently implemented**
  - **Recommendation:** Add subscriptions for targeted property monitoring (Phase 2)

---

## Migration Plan

### Phase 1: Foundation (Low Risk)
- [ ] Add debounce infrastructure to `connection.py`
- [ ] Apply debounce to `on_frame_change` (100ms)
- [ ] Test during animation playback

### Phase 2: Node Detection (Medium Risk)
- [ ] Create `msgbus_handlers.py` module
- [ ] Subscribe to `SpaceNodeEditor.node_tree` changes via msgbus
- [ ] Migrate active node detection from `on_depsgraph_update`
- [ ] Test node selection changes

### Phase 3: Normalization (Low Risk)
- [ ] Normalize `on_save_post` payload (add version, timestamp)
- [ ] Normalize `on_load_post` payload (add version, timestamp)
- [ ] Add `file_loaded` event to `docs/protocol-events-v0.1.json`
- [ ] Update app to handle normalized schemas

---

## Mapping to Normalized Events (Issue #37)

| Current Handler | Normalized Event | Status |
|----------------|------------------|---------|
| `on_depsgraph_update` (node detection) | `node_selection_changed` | 🔄 Needs msgbus migration |
| `on_frame_change` | `frame_changed` | ✅ Needs debounce only |
| `on_save_post` | `file_saved` | ✅ Needs payload normalization |
| `on_load_post` | `file_loaded` (new) | ✅ Needs schema addition |

---

## Detailed Recommendations

### 🔄 Convert to Msgbus: `on_depsgraph_update` → node detection

**Why:** Reduce CPU usage by 90%+; eliminate polling

**How:**
```python
# NEW FILE: msgbus_handlers.py
bpy.msgbus.subscribe_rna(
    key=(bpy.types.SpaceNodeEditor, "node_tree"),
    owner=owner,
    notify=on_node_tree_changed,
)
```

**Benefit:** Only fires on actual node tree changes, not every scene update

---

### ✅ Add Debounce: `on_frame_change`

**Why:** Prevent message spam during animation playback (24-60/sec → ~10/sec)

**How:**
```python
# Add to connection.py
def debounced_send(key, data, delay=0.1):
    # Cancel existing timer for this key
    # Register new timer to send after delay
```

**Benefit:** Responsive (100ms imperceptible) but drastically reduced traffic

---

### ✅ Keep with Normalization: `on_save_post`, `on_load_post`

**Why:** Appropriate handlers for file lifecycle; low frequency

**How:**
```python
# Add to payloads
{
    "type": "file_saved",  # or "file_loaded"
    "filepath": bpy.data.filepath,
    "blender_version": bpy.app.version_string,
    "timestamp": datetime.utcnow().isoformat() + "Z"
}
```

**Benefit:** Aligns with `docs/protocol-events-v0.1.json` schema

---

## File-by-File Summary

| File | Changes | Priority |
|------|---------|----------|
| `handlers.py` | Migrate node detection, add debounce | High |
| `connection.py` | Add debounce helper | Medium |
| `msgbus_handlers.py` (new) | Msgbus subscriptions for nodes | High |
| `__init__.py` | Register msgbus module | Medium |
| `docs/protocol-events-v0.1.json` | Add `file_loaded` event | Low |

---

## Success Criteria

- ✅ Active node detection still works after msgbus migration
- ✅ CPU usage during scene editing reduced by >50%
- ✅ Frame change messages throttled to ~10/sec during playback
- ✅ File save/load notifications include version and timestamp
- ✅ All events follow normalized schema from issue #37
- ✅ No regressions in existing functionality

---

## Estimated Effort

- **Phase 1 (Debounce):** 2-4 hours
- **Phase 2 (Msgbus):** 4-8 hours
- **Phase 3 (Normalization):** 2-4 hours
- **Total:** 8-16 hours

---

## References

- Full audit: `docs/EVENT_AUDIT.md`
- Handler catalog: `knowledge/blender-4.5/handlers.json`
- Event guide: `docs/blender-events.md`
- Normalized schema: `docs/protocol-events-v0.1.json`
