# Event Audit Complete - Summary for Issue Comment

**Issue:** lebduska/blendmate#[ISSUE_NUMBER]  
**Deliverables:** ✅ Complete

---

## 📋 Audit Summary

I've completed a comprehensive audit of the blendmate-addon event wiring. Here's what I found:

### Current State
- **4 handlers** registered (`depsgraph_update_post`, `frame_change_post`, `save_post`, `load_post`)
- **1 timer** for queue processing
- **0 msgbus subscriptions** (opportunity for optimization!)

### Key Findings

✅ **What's Working Well:**
- Timer-based queue processing is already optimal
- File lifecycle handlers (save/load) are appropriate and low-frequency
- Proper cleanup in unregister functions

⚠️ **What Needs Improvement:**
- `depsgraph_update_post` runs at very high frequency (10-100+/sec) without debouncing
- Active node detection uses polling instead of targeted subscriptions
- No throttling on `frame_change` during animation playback

---

## 📊 Complete Inventory

### Handlers

| File | Line | Handler | Hook | Frequency | Recommendation |
|------|------|---------|------|-----------|----------------|
| `handlers.py` | 4-19 | `on_depsgraph_update` | `depsgraph_update_post` | Very High | 🔄 Migrate to msgbus |
| `handlers.py` | 21-24 | `on_frame_change` | `frame_change_post` | High | ✅ Add 100ms debounce |
| `handlers.py` | 26-29 | `on_save_post` | `save_post` | Low | ✅ Keep, normalize payload |
| `handlers.py` | 31-34 | `on_load_post` | `load_post` | Low | ✅ Keep, normalize payload |

### Timers

| File | Line | Function | Purpose | Recommendation |
|------|------|----------|---------|----------------|
| `connection.py` | 27-53 | `process_queue` | Queue processing & WS send | ✅ Keep as-is (optimal) |

### Msgbus Subscriptions

❌ None currently implemented → **High-priority opportunity for optimization**

---

## 🎯 Migration Recommendations

### Priority 1: Convert to Msgbus (High Impact)
**Target:** `on_depsgraph_update` → active node detection

**Current Problem:**
```python
# Runs 10-100+ times per second on EVERY scene change
def on_depsgraph_update(scene, depsgraph):
    current_node_id = connection.get_active_gn_node()  # Polling!
```

**Recommended Solution:**
```python
# NEW: msgbus_handlers.py
bpy.msgbus.subscribe_rna(
    key=(bpy.types.SpaceNodeEditor, "node_tree"),
    owner=owner,
    notify=on_node_tree_changed,
)
```

**Expected Impact:** 90%+ CPU usage reduction for node monitoring

---

### Priority 2: Add Debouncing (Medium Impact)
**Target:** `on_frame_change`

**Problem:** Sends WebSocket message at full FPS (24-60/sec) during playback

**Solution:** Add 100ms debounce timer (imperceptible delay, 90% less traffic)

---

### Priority 3: Keep with Normalization (Low Impact)
**Target:** `on_save_post`, `on_load_post`

**Action:** Add `blender_version` and `timestamp` to payloads to match normalized schema (issue #37)

---

## 📝 Mapping to Normalized Events (Issue #37)

| Current Handler | Normalized Event | Status |
|----------------|------------------|---------|
| `on_depsgraph_update` (node detection) | `node_selection_changed` | 🔄 Needs msgbus migration |
| `on_frame_change` | `frame_changed` | ✅ Needs debounce only |
| `on_save_post` | `file_saved` | ✅ Needs payload normalization |
| `on_load_post` | `file_loaded` (new schema entry) | ✅ Needs schema addition + payload normalization |

---

## 📖 Documentation Deliverables

I've created two documents in the `docs/` directory:

1. **`EVENT_AUDIT.md`** (13KB) - Comprehensive technical audit
   - Complete inventory with line numbers and rationale
   - Performance analysis and risk assessment
   - Detailed migration plan with code examples
   - Testing strategy and success criteria

2. **`EVENT_MIGRATION_CHECKLIST.md`** (5.7KB) - Quick reference
   - Condensed checklist format
   - File-by-file recommendations
   - Phase-based migration plan
   - Effort estimates (8-16 hours total)

---

## 🗺️ Migration Plan

### Phase 1: Foundation (2-4 hours, Low Risk)
- [ ] Add debounce infrastructure to `connection.py`
- [ ] Apply debounce to `on_frame_change`

### Phase 2: Node Detection (4-8 hours, Medium Risk)
- [ ] Create `msgbus_handlers.py` module
- [ ] Subscribe to `SpaceNodeEditor.node_tree` changes
- [ ] Migrate active node detection from `on_depsgraph_update`

### Phase 3: Normalization (2-4 hours, Low Risk)
- [ ] Normalize `on_save_post` and `on_load_post` payloads
- [ ] Add `file_loaded` event to `docs/protocol-events-v0.1.json`
- [ ] Update app to handle normalized schemas

---

## ✅ Acceptance Criteria Met

- ✅ Clear inventory of all handlers, timers, and msgbus subscriptions
- ✅ Rationale for each hook (file path → hook → reasoning)
- ✅ Recommendations for what can be msgbus vs handlers
- ✅ Identified where debounce is needed
- ✅ Mapping to normalized events (issue #37)
- ✅ Prioritized migration plan with effort estimates

---

## 📚 References

- Full audit: `/docs/EVENT_AUDIT.md`
- Quick checklist: `/docs/EVENT_MIGRATION_CHECKLIST.md`
- Handler catalog: `/knowledge/blender-4.5/handlers.json`
- Event guide: `/docs/blender-events.md`
- Normalized schema: `/docs/protocol-events-v0.1.json`

---

**Next Steps:**
1. Review audit findings
2. Prioritize migration phases based on project needs
3. Create implementation issues for each phase (or tackle as single effort)
4. Begin with Phase 1 (debounce) as it's low-risk and high-value

Let me know if you'd like me to proceed with implementing any of these phases! 🚀
