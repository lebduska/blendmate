import { ReactNode } from 'react';

interface IslandPanelProps {
  /** Title displayed in the panel header */
  title?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Actions to display in the header (buttons, icons, etc.) */
  actions?: ReactNode;
  /** Main content of the panel */
  children: ReactNode;
  /** Additional CSS classes for customization */
  className?: string;
}

/**
 * Island Panel Component
 * 
 * A modern, elevated panel with soft rounded corners and subtle shadow.
 * Automatically adapts to light/dark mode using system color preferences.
 * 
 * Features:
 * - Rounded corners (16px)
 * - Subtle shadow for depth
 * - Header with title and optional actions
 * - Content area with proper spacing
 * - Light/dark mode support via prefers-color-scheme
 * - Uses CSS variables for system colors (no hard-coded brand palette)
 */
export default function IslandPanel({ 
  title, 
  subtitle, 
  actions, 
  children, 
  className = '' 
}: IslandPanelProps) {
  return (
    <div 
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--island-bg)',
        border: '1px solid var(--island-border)',
        boxShadow: '0 2px 8px var(--island-shadow), 0 1px 2px var(--island-shadow)',
      }}
    >
      {/* Header - only render if title or actions exist */}
      {(title || actions) && (
        <div 
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            borderColor: 'var(--island-border)',
            backgroundColor: 'var(--island-bg-secondary)',
          }}
        >
          <div className="flex-1 min-w-0">
            {title && (
              <h3 
                className="text-base font-semibold truncate"
                style={{ color: 'var(--island-text)' }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p 
                className="text-sm mt-0.5 truncate"
                style={{ color: 'var(--island-text-secondary)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Content Area */}
      <div 
        className="p-5"
        style={{ color: 'var(--island-text)' }}
      >
        {children}
      </div>
    </div>
  );
}
