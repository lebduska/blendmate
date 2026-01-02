import type { SocketStatus } from "../AppShell";

export type TopBarProps = {
  socketStatus: SocketStatus;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onResetLayout: () => void;
};

function statusLabel(s: SocketStatus) {
  if (s === "connected") return "Connected";
  if (s === "connecting") return "Connecting…";
  if (s === "disconnected") return "Disconnected";
  return String(s || "Unknown");
}

export function TopBar(props: TopBarProps) {
  const connected = props.socketStatus === "connected";
  const statusColor = connected
    ? 'var(--islands-color-success)'
    : 'var(--islands-color-error)';

  return (
    <div
      className="h-[44px] flex items-center justify-between px-3"
      style={{ borderBottom: '1px solid var(--islands-color-border-subtle)' }}
      data-tauri-drag-region
    >
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="font-semibold tracking-tight" data-tauri-drag-region>
          Blendmate
        </div>
        <span
          className="text-xs px-2 py-1 rounded"
          style={{ backgroundColor: 'var(--islands-color-background-tertiary)' }}
          data-tauri-drag-region
        >
          vNext Shell
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-2 py-1 rounded"
          style={{ backgroundColor: 'color-mix(in srgb, var(--islands-color-background-tertiary) 50%, transparent)' }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: statusColor }}
            aria-label="socket-status"
          />
          <span className="text-xs opacity-80">{statusLabel(props.socketStatus)}</span>
        </div>

        <button
          type="button"
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            backgroundColor: props.inspectorOpen
              ? 'var(--islands-color-background-elevated)'
              : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!props.inspectorOpen) {
              e.currentTarget.style.backgroundColor = 'var(--islands-color-background-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!props.inspectorOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          onClick={props.onToggleInspector}
        >
          Inspector
        </button>

        <button
          type="button"
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--islands-color-background-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onClick={props.onResetLayout}
          title="Reset layout"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
