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

  return (
    <div
      className="h-[44px] flex items-center justify-between px-3 border-b border-white/10"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="font-semibold tracking-tight" data-tauri-drag-region>
          Blendmate
        </div>
        <span className="text-xs px-2 py-1 rounded bg-white/10" data-tauri-drag-region>
          vNext Shell
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/5">
          <span
            className={"inline-block h-2 w-2 rounded-full " + (connected ? "bg-green-500" : "bg-red-500")}
            aria-label="socket-status"
          />
          <span className="text-xs opacity-80">{statusLabel(props.socketStatus)}</span>
        </div>

        <button
          type="button"
          className={"text-xs px-2 py-1 rounded hover:bg-white/10 " + (props.inspectorOpen ? "bg-white/10" : "")}
          onClick={props.onToggleInspector}
        >
          Inspector
        </button>

        <button
          type="button"
          className="text-xs px-2 py-1 rounded hover:bg-white/10"
          onClick={props.onResetLayout}
          title="Reset layout"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
