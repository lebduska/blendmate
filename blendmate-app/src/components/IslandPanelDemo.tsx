import IslandPanel from './ui/IslandPanel';

/**
 * Demo component showcasing the IslandPanel in various configurations
 */
export default function IslandPanelDemo() {
  return (
    <div className="space-y-6">
      {/* Basic panel with just content */}
      <IslandPanel>
        <p style={{ color: 'var(--island-text)' }}>
          This is a basic Island panel with just content. It automatically adapts to light/dark mode.
        </p>
      </IslandPanel>

      {/* Panel with title */}
      <IslandPanel title="Panel with Title">
        <p style={{ color: 'var(--island-text-secondary)' }}>
          This panel has a title in the header. The header has a subtle background to separate it from the content.
        </p>
      </IslandPanel>

      {/* Panel with title and subtitle */}
      <IslandPanel 
        title="Complete Panel" 
        subtitle="With title and subtitle"
      >
        <div className="space-y-3">
          <p style={{ color: 'var(--island-text)' }}>
            This panel demonstrates all features: title, subtitle, and content.
          </p>
          <p style={{ color: 'var(--island-text-secondary)' }}>
            The colors automatically adjust based on your system's light/dark mode preference.
          </p>
        </div>
      </IslandPanel>

      {/* Panel with actions */}
      <IslandPanel 
        title="Panel with Actions" 
        subtitle="Featuring header buttons"
        actions={
          <>
            <button 
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--island-hover)',
                color: 'var(--island-text)',
                border: '1px solid var(--island-border)',
              }}
            >
              Action
            </button>
            <button 
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--island-text)',
                color: 'var(--island-bg)',
              }}
            >
              Primary
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--island-text)' }}>
          Actions in the header provide quick access to common operations.
        </p>
      </IslandPanel>

      {/* Nested content example */}
      <IslandPanel title="Rich Content Example">
        <div className="space-y-4">
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: 'var(--island-bg-secondary)',
              border: '1px solid var(--island-border)',
            }}
          >
            <h4 className="font-semibold mb-2" style={{ color: 'var(--island-text)' }}>
              Nested Section
            </h4>
            <p style={{ color: 'var(--island-text-secondary)' }}>
              You can nest other elements with system colors inside the panel.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div 
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: 'var(--island-hover)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--island-text)' }}>
                Grid Item 1
              </p>
            </div>
            <div 
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: 'var(--island-hover)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--island-text)' }}>
                Grid Item 2
              </p>
            </div>
          </div>
        </div>
      </IslandPanel>

      {/* Info box about the component */}
      <div 
        className="rounded-lg p-4"
        style={{ 
          backgroundColor: 'var(--island-bg-secondary)',
          border: '1px solid var(--island-border)',
        }}
      >
        <h4 className="font-semibold mb-2" style={{ color: 'var(--island-text)' }}>
          About Island Panels
        </h4>
        <ul className="space-y-1 text-sm" style={{ color: 'var(--island-text-secondary)' }}>
          <li>• Rounded corners (16px) for modern aesthetic</li>
          <li>• Subtle shadow for depth and elevation</li>
          <li>• Automatic light/dark mode via prefers-color-scheme</li>
          <li>• Uses CSS variables for system colors</li>
          <li>• No hard-coded brand palette</li>
        </ul>
      </div>
    </div>
  );
}
