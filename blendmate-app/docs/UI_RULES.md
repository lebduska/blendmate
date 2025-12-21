# UI Behavior Rules: "Quiet Companion"

Blendmate is designed as a **quiet co-pilot**, not a needy chatbot. These rules ensure non-intrusive behavior that respects user focus and workflow.

---

## Core Principle

**The app should be seen but not heard.** Information is always available when needed, but never forces itself into the user's attention.

---

## Implemented Rules

### 1. No Auto-Opening Panels on Events

**Rule:** When Blender sends events (like `context` messages for active nodes), the app MUST NOT automatically switch tabs or open new panels.

**Rationale:** Users should maintain control over their workspace. Unsolicited UI changes are disruptive and break flow state.

**Implementation:**
- The `activeTab` state in `App.tsx` is user-controlled only
- Incoming `context` messages update the `currentNodeId` state silently
- When user manually switches to the 'nodes' tab, they see the updated node help
- No modals, popups, or forced navigation based on WebSocket events

**Code Toggles:**
- `App.tsx`: Comment lines 17-19 to disable node switching behavior
- Future: Add `settings.autoSwitchToNode` boolean config

---

### 2. Notifications Are Opt-In and Low-Priority

**Rule:** The app MUST NOT generate system notifications, alert sounds, or attention-grabbing indicators unless explicitly enabled by the user.

**Rationale:** Notifications break concentration. Blendmate provides ambient awareness, not urgent alerts.

**Implementation:**
- No browser/system notifications are used
- Connection status is shown passively via a small indicator dot in the HUD
- Message updates appear in footer's debug log only (non-intrusive monospace text)
- No audio feedback or badge counts

**Code Toggles:**
- Currently: No notification code exists (by design)
- Future: If notifications are added, gate them behind `settings.enableNotifications: false` (default off)

---

### 3. Default to Passive Status Indicators

**Rule:** All status information (connection state, frame counters, stats) MUST be displayed passively without animation or bright colors that demand attention.

**Rationale:** Status indicators should provide context at-a-glance but not distract. Users should be able to ignore them when focused.

**Implementation:**
- Connection indicator: Small dot (3x3px) in HUD, green when connected
  - Subtle pulse animation (opacity only), no scaling or bright flashes
  - Red when disconnected, but no alert or modal
- Footer status bar: Low-contrast monospace text (white/20 opacity)
  - Shows last message in truncated format
  - Frame rate indicator with minimal animation (single dot pulse)
- Stats cards: Present but styled with muted colors, only accent color on hover

**Code Toggles:**
- `HUD.tsx` lines 15-16: Connection status indicator
- `Footer.tsx` lines 25-33: Passive status display
- To disable animations: Remove `animate-ping` and `animate-pulse` classes

---

## Anti-Patterns to Avoid

These behaviors violate the "quiet companion" principle and MUST NOT be implemented:

- ❌ Auto-scrolling to new content
- ❌ Flashing or pulsing UI elements (except connection pulse)
- ❌ Modal dialogs that require dismissal
- ❌ Browser notifications or system tray alerts
- ❌ Sound effects or haptic feedback
- ❌ Forced tab switching based on events
- ❌ "What's new" overlays or tutorial popups
- ❌ Badge counts or unread indicators

---

## Future Considerations

As the app evolves, new features should be evaluated against these rules:

- **Chat Interface:** Should be manually opened, never auto-focus input
- **Error States:** Show inline, never block workflow with error modals
- **Updates Available:** Passive indicator only, no "Update Now" dialogs
- **Knowledge Base Loading:** Show subtle progress, no full-screen spinners

---

## Testing Compliance

To verify "quiet companion" behavior:

1. Connect Blender and trigger various events (frame change, node selection)
2. Verify that tab state doesn't change unexpectedly
3. Confirm no system notifications appear
4. Check that all animations are subtle and non-distracting
5. Ensure status indicators can be easily ignored when working

---

**Last Updated:** 2025-12-21  
**Maintained By:** Project team & agents working on UI components
