# UI Components

## IslandPanel

A modern, elevated panel component with automatic light/dark mode support.

### Features

- **Rounded corners** (16px) for a soft, modern aesthetic
- **Subtle shadow** for depth and elevation
- **Automatic theme switching** via `prefers-color-scheme`
- **System colors** using CSS variables (no hard-coded brand palette)
- **Flexible header** with optional title, subtitle, and actions
- **Clean content area** with proper spacing

### Usage

```tsx
import IslandPanel from './components/ui/IslandPanel';

// Basic panel
<IslandPanel>
  <p>Your content here</p>
</IslandPanel>

// Panel with title
<IslandPanel title="My Panel">
  <p>Content with a title</p>
</IslandPanel>

// Complete panel with title, subtitle, and actions
<IslandPanel 
  title="Settings" 
  subtitle="Configure your preferences"
  actions={
    <>
      <button>Cancel</button>
      <button>Save</button>
    </>
  }
>
  <p>Panel content</p>
</IslandPanel>
```

### Props

- `title` (optional): String - Title displayed in the panel header
- `subtitle` (optional): String - Subtitle or description below the title
- `actions` (optional): ReactNode - Actions to display in the header (buttons, icons, etc.)
- `children`: ReactNode - Main content of the panel
- `className` (optional): String - Additional CSS classes for customization

### CSS Variables

The component uses the following CSS variables defined in `index.css`:

**Light mode:**
- `--island-bg`: rgb(255 255 255)
- `--island-bg-secondary`: rgb(249 249 249)
- `--island-border`: rgb(229 229 229)
- `--island-text`: rgb(23 23 23)
- `--island-text-secondary`: rgb(115 115 115)
- `--island-shadow`: rgba(0 0 0 / 0.08)
- `--island-hover`: rgb(245 245 245)

**Dark mode:**
- `--island-bg`: rgb(30 30 30)
- `--island-bg-secondary`: rgb(23 23 23)
- `--island-border`: rgb(64 64 64)
- `--island-text`: rgb(250 250 250)
- `--island-text-secondary`: rgb(163 163 163)
- `--island-shadow`: rgba(0 0 0 / 0.3)
- `--island-hover`: rgb(40 40 40)

### Design Philosophy

The Island panel follows modern OS UI conventions:
- Uses system-defined colors that adapt to user preferences
- No hard-coded brand colors in the component itself
- Maintains consistency with native OS aesthetics
- Provides visual hierarchy through subtle shadows and backgrounds
