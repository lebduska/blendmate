# Testing msgbus Subscriptions in Blender

This guide explains how to manually verify the msgbus subscription implementation in Blender 4.5+.

## Prerequisites

1. Blender 4.5 or newer
2. Blendmate desktop app running (WebSocket server on ws://127.0.0.1:32123)
3. Blendmate addon installed in Blender

## Installation

1. Open Blender
2. Go to `Edit` → `Preferences` → `Add-ons`
3. Click `Install...`
4. Select the `blendmate-addon` directory from this repository
5. Enable the "Blendmate Connector" addon by checking its checkbox

## Quick Verification

### 1. Start the Blendmate App
```bash
cd blendmate-app
npm run tauri dev
```

The app should show "Connected" status.

### 2. Test Active Object Change
In Blender:
1. Create a new cube: `Shift+A` → `Mesh` → `Cube`
2. Select another object (or deselect all with `Alt+A`)
3. Select the cube again

**Expected**: Blendmate app receives `active_object_changed` events

### 3. Test Object Transforms
With the cube selected:
1. Move it: Press `G`, move mouse, click to confirm
2. Rotate it: Press `R`, move mouse, click to confirm  
3. Scale it: Press `S`, move mouse, click to confirm

**Expected**: Blendmate app receives `object_transform_changed` events with property and values

### 4. Test Object Rename
1. Select the cube
2. Press `F2` or double-click its name in outliner
3. Type a new name and press Enter

**Expected**: Blendmate app receives `object_name_changed` event

### 5. Test Frame Change
1. In timeline, drag the playhead to a different frame
2. Or press `Left/Right arrow` keys to step through frames

**Expected**: Blendmate app receives `frame_changed` events

## Automated Test Script

Run the manual test script in Blender's Python console:

1. Open Blender's Scripting workspace
2. Load `tests/manual_test_msgbus.py`
3. Click "Run Script"
4. Check console output for ✓ marks
5. Verify events appear in Blendmate app

## Checking Subscriptions are Active

In Blender's Python console:
```python
import sys
# Check if subscriptions module is loaded
print([m for m in sys.modules.keys() if 'subscription' in m.lower()])
```

You should see the subscriptions module listed.

## Verifying Clean Unregister

1. With addon enabled and subscriptions active
2. Go to `Edit` → `Preferences` → `Add-ons`
3. Disable the "Blendmate Connector" addon
4. Check Blender console - should see "All msgbus subscriptions cleared"
5. No errors should appear
6. Re-enable the addon - subscriptions should register again

## What Changed from Before

### Before (with depsgraph spam)
- `frame_change_post` handler fired on every frame change
- `depsgraph_update_post` handler fired on EVERY scene change (very frequent)
- High event noise, unnecessary overhead

### After (with msgbus)
- Frame changes: msgbus subscription to `Scene.frame_current` (precise)
- Object changes: msgbus subscriptions to specific properties (precise)
- `depsgraph_update_post` kept ONLY for GN node detection (unavoidable)
- Low event noise, minimal overhead

## Performance Check

To verify reduced overhead:

1. Open Blender with the addon
2. Create several objects
3. Animate some properties
4. Play animation (`Spacebar`)
5. Watch Blendmate app console

**Expected behavior**:
- Only relevant events appear (frame changes, active object changes)
- No flood of depsgraph events
- Smooth playback without lag

## Troubleshooting

### No events received
- Check WebSocket connection in addon preferences
- Verify Blendmate app is running and showing "Connected"
- Check Blender console for subscription registration messages

### Events not firing
- Ensure addon is enabled
- Check Blender console for errors
- Try disabling and re-enabling the addon

### Too many events
- This should NOT happen with msgbus
- If you see event spam, check that old handlers were removed
- Look for duplicate subscription registration

## Expected Console Output (Blender)

When addon loads:
```
[Blendmate] !!! INITIAL MODULE LOAD !!!
[Blendmate] Registering Connection module
[Blendmate] Timer registered
[Blendmate] WS Thread spawned
[Blendmate:Subscriptions] Registering subscriptions module
[Blendmate:Subscriptions] Setting up msgbus subscriptions...
[Blendmate:Subscriptions] ✓ Subscribed: active object
[Blendmate:Subscriptions] ✓ Subscribed: object name
[Blendmate:Subscriptions] ✓ Subscribed: object location
[Blendmate:Subscriptions] ✓ Subscribed: object rotation
[Blendmate:Subscriptions] ✓ Subscribed: object scale
[Blendmate:Subscriptions] ✓ Subscribed: scene frame_current
[Blendmate:Subscriptions] All msgbus subscriptions registered successfully
[Blendmate] Registering Handlers
[Blendmate] WS Thread start sequence...
[Blendmate] Attempting connection to ws://127.0.0.1:32123...
[Blendmate] WS Connected (on_open)
```

When unloading addon:
```
[Blendmate:Subscriptions] Unregistering subscriptions module
[Blendmate:Subscriptions] All msgbus subscriptions cleared
```

## Success Criteria

✅ All 6 subscriptions register on addon load  
✅ Events appear in Blendmate app for: active object, name, transforms, frame  
✅ No depsgraph spam (check by creating objects - should be quiet)  
✅ Clean unregister with no errors  
✅ Subscriptions work after disable/re-enable cycle

## Further Testing

For production use, also test:
- Complex scenes with many objects
- Animation playback
- Switching between different workspace layouts
- Multiple Blender instances (if needed)
- Long-running Blender sessions (memory leaks?)
