# Throttle Layer Testing Guide

This document describes how to manually test the debounce/throttle layer in a real Blender environment.

## What was implemented

A shared debounce/throttle mechanism for high-frequency Blender events:
- `depsgraph_update_post` (fallback monitoring)
- `frame_change_post` (during animation playback)

## How it works

1. **Event Coalescing**: High-frequency events are queued and the latest value is kept
2. **Timer-based Flush**: Events are flushed via `bpy.app.timers.register` after a configurable delay
3. **Reason Tracking**: Each event includes a "reasons" array showing what triggered it
4. **Configurable Interval**: Default 100ms, adjustable in preferences (50-200ms)

## Testing Steps

### 1. Install the addon

1. Open Blender 4.0+
2. Go to `Edit` → `Preferences` → `Add-ons`
3. Click `Install...` and select the `blendmate-addon` directory
4. Enable "Blendmate Connector" addon

### 2. Configure throttle interval

1. In Add-ons preferences, expand "Blendmate Connector"
2. Adjust "Event Throttle Interval (ms)" (default: 100ms)
   - Lower values (50ms): More frequent updates, higher CPU
   - Higher values (200ms): Less frequent updates, lower CPU

### 3. Start the Blendmate app

```bash
cd blendmate-app
npm run tauri dev
```

The app should connect automatically via WebSocket.

### 4. Test frame_change throttling

**Before throttling (old behavior):**
- Every frame change sent immediately
- During 30 fps playback: ~30 events/second
- During 60 fps playback: ~60 events/second

**After throttling (new behavior):**
- Frame changes coalesced within time window
- With 100ms throttle: max ~10 events/second regardless of playback speed
- Latest frame number is preserved

**Test procedure:**
1. Create or open a scene with animation
2. Set frame range (e.g., 1-100)
3. Start playback (spacebar)
4. Observe in Blendmate app console:
   - Events should arrive at ~10/second (with 100ms throttle)
   - Each event should have a "reasons" array listing frame numbers
   - Latest frame number should be in the event data

### 5. Test depsgraph_update throttling

**Before throttling (old behavior):**
- Every depsgraph update sent immediately
- Can fire 100+ times/second during complex operations

**After throttling (new behavior):**
- Updates coalesced within time window
- With 100ms throttle: max ~10 events/second
- "reasons" array shows why updates occurred

**Test procedure:**
1. Open Blender console (Window → Toggle System Console on Windows, or run from terminal on Linux/Mac)
2. Watch for `[Blendmate]` log messages
3. Perform operations that trigger many depsgraph updates:
   - Move objects in the viewport
   - Adjust modifiers
   - Edit geometry nodes
4. Observe:
   - Fewer depsgraph events sent
   - Events include "reasons" array
   - UI remains responsive (no stutter)

### 6. Test configuration changes

1. Change throttle interval in preferences
2. Reload the addon (disable and re-enable)
3. Verify new interval is applied (check console logs)

## Expected Results

✓ **Bounded event rate**: No more than ~10 events/second with 100ms throttle
✓ **No UI stutter**: Event handlers exit quickly, flush happens on timer
✓ **Reason tracking**: Events include "reasons" array showing what triggered them
✓ **Latest data preserved**: Most recent frame/state is always sent
✓ **Independent event types**: frame_change and depsgraph_update throttled separately

## Troubleshooting

### Events not being throttled
- Check that throttle module is registered (see console logs on addon enable)
- Verify throttle interval is set correctly in preferences

### Timer not firing
- Check Blender console for timer registration messages
- Verify no errors during addon registration

### Events not arriving at app
- Check WebSocket connection status
- Verify connection module is working (other events like save_post should work)

## Performance Comparison

### Before (no throttling)
- Frame playback at 60fps: 60 events/second
- Complex node editing: 100+ depsgraph events/second
- Potential UI lag during high-frequency operations

### After (with 100ms throttle)
- Frame playback at any fps: ~10 events/second (bounded)
- Complex node editing: ~10 depsgraph events/second (bounded)
- Smooth UI, events processed asynchronously

## Implementation Details

- **Module**: `blendmate-addon/throttle.py`
- **Integration**: Used in `handlers.py` for `on_frame_change` and `on_depsgraph_update`
- **Configuration**: `preferences.py` includes `throttle_interval` property
- **Tests**: 9 unit tests + 2 integration tests (all passing)
