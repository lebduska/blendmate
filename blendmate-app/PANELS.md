# Panel System Implementation

This document describes the panel-based UI system implemented for BlendMate.

## Overview

The application has been converted from a simple tab-based system to a more flexible **panels model**. Panels are independent, reusable UI components that can be shown/hidden and focused independently.

## Architecture

### Core Types (`src/types/panels.ts`)

- **PanelId**: Union type of all available panel identifiers
  - `'nodes-help'` - Geometry Nodes help panel
  - `'events-log'` - Event log showing recent WebSocket messages
  - `'chat'` - Chat conversation panel
  - `'stats'` - Statistics panel (placeholder)

- **PanelDefinition**: Defines a panel's metadata
  - `id`: Unique identifier
  - `title`: Display name
  - `icon`: Emoji or icon identifier
  - `defaultPlacement`: Where the panel should appear (main/sidebar/bottom)
  - `component`: React component to render
  - `defaultVisible`: Whether the panel is visible on startup

- **PanelState**: Runtime state of a panel
  - `id`: Panel identifier
  - `isVisible`: Whether the panel is currently shown
  - `isFocused`: Whether the panel has focus
  - `placement`: Current placement (for future docking support)

- **PanelProps**: Base props all panel components receive
  - `isVisible`: Visibility state
  - `isFocused`: Focus state
  - Plus any panel-specific props

### Panel Registry (`src/services/panelRegistry.tsx`)

Central registry that defines all available panels in the application. Contains:
- Panel definitions for all panels
- `getInitialPanelStates()` function to create initial state

### Panel Manager Hook (`src/usePanelManager.ts`)

Custom React hook that manages panel state. Provides:
- `panelStates`: Array of all panel states
- `showPanel(panelId)`: Show a specific panel
- `hidePanel(panelId)`: Hide a specific panel
- `togglePanel(panelId)`: Smart toggle with focus management
  - Hidden → Show and focus
  - Visible but not focused → Focus it
  - Visible and focused → Hide it
- `focusPanel(panelId)`: Focus a panel without changing visibility
- `getPanelState(panelId)`: Get state of a specific panel
- `visiblePanels`: Array of currently visible panels
- `focusedPanel`: Currently focused panel (if any)

## Panel Components

### NodesHelpPanel (`src/components/panels/NodesHelpPanel.tsx`)
- Wraps the existing NodeHelpView component
- Shows Geometry Nodes documentation
- Includes node switcher pills
- Props: `currentNodeId`, `onNodeIdChange`

### EventsLogPanel (`src/components/panels/EventsLogPanel.tsx`)
- Displays recent WebSocket events
- Shows last 10 events in reverse chronological order
- Each event shows type, timestamp, and data
- Props: `events` array

### ChatPanel (`src/components/panels/ChatPanel.tsx`)
- Chat interface (ready for future chat functionality)
- Shows conversation history with role-based styling
- Props: `messages` array (optional)

## UI Components

### HUD (`src/components/layout/HUD.tsx`)
Panel launcher/switcher in the top navigation bar. Features:
- Shows all available panels with icons
- Visual indicators:
  - **Blue background**: Focused and visible
  - **White/semi-transparent**: Visible but not focused
  - **Transparent**: Hidden
- Click to toggle panel visibility/focus

### App (`src/App.tsx`)
Main application component. Changes:
- Uses `usePanelManager()` instead of `activeTab` state
- Renders visible panels dynamically from registry
- Passes panel-specific props via spread
- Maintains event log for EventsLogPanel
- Focused panel highlighted with blue ring

## Usage Examples

### Adding a New Panel

1. Create the panel component:
```tsx
// src/components/panels/MyPanel.tsx
import { PanelProps } from '../../types/panels';

export default function MyPanel({ isVisible, isFocused }: PanelProps) {
  return <div>My Panel Content</div>;
}
```

2. Add to panel registry:
```tsx
// src/services/panelRegistry.tsx
'my-panel': {
  id: 'my-panel',
  title: 'My Panel',
  icon: '🎯',
  defaultPlacement: 'main',
  component: MyPanel as ComponentType<PanelProps>,
  defaultVisible: false,
}
```

3. Update PanelId type:
```tsx
// src/types/panels.ts
export type PanelId = 'nodes-help' | 'events-log' | 'chat' | 'stats' | 'my-panel';
```

### Programmatically Controlling Panels

```tsx
const { showPanel, hidePanel, togglePanel, focusPanel } = usePanelManager();

// Show the events log
showPanel('events-log');

// Toggle chat panel (smart behavior)
togglePanel('chat');

// Focus nodes help without changing visibility
focusPanel('nodes-help');
```

## Future Enhancements

The current implementation provides the foundation for:
- **Drag & drop docking**: Panel placement can be changed at runtime
- **Persistent layouts**: Save/restore panel configurations
- **Panel splitting**: Multiple panels in the same area
- **Floating panels**: Detachable panels as separate windows
- **Panel size control**: Resizable panels with splitters

The `placement` property in `PanelState` is ready for implementing these features.

## Testing

To verify the implementation:
1. Run `npm run dev` in `blendmate-app/`
2. Click panel buttons in the header to toggle visibility
3. Verify focus indicators (blue ring around focused panel)
4. Check that events appear in the Events Log panel
5. Confirm node switching still works in Nodes Help panel

## Migration from Tabs

Old system:
- `activeTab` state with 3 fixed tabs
- All content embedded in App.tsx
- Switch between tabs (only one visible)

New system:
- Panel registry with extensible panel definitions
- Panel components in separate files
- Multiple panels can be visible simultaneously
- Smart toggle behavior with focus management
- Clean separation of concerns
