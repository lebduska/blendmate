import { useMemo, useState } from "react";

export type BottomBarProps = {
  lastMessage: any;
  sendJson: (json: any) => void;
  onToggleBottom: () => void;
  vnextBadge?: boolean;
};

export function BottomBar(props: BottomBarProps) {
  const [prompt, setPrompt] = useState("");

  const last = useMemo(() => {
    if (!props.lastMessage) return "Awaiting Blender signal…";
    try {
      return "[RECV] " + JSON.stringify(props.lastMessage);
    } catch {
      return "[RECV] (unserializable message)";
    }
  }, [props.lastMessage]);

  return (
    <div className="h-full flex items-center gap-2 px-3" data-tauri-drag-region>
      {props.vnextBadge ? (
        <span className="text-[11px] px-2 py-1 rounded bg-white/10 shrink-0">vNext</span>
      ) : null}

      <button
        type="button"
        className="text-xs px-2 py-1 rounded hover:bg-white/10 shrink-0"
        onClick={props.onToggleBottom}
        title="Hide bottom bar"
      >
        Hide
      </button>

      <div className="flex-1 min-w-0">
        <input
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm outline-none"
          placeholder="Ask your soulmate anything…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="text-xs px-2 py-1 rounded hover:bg-white/10 shrink-0"
        onClick={() => props.sendJson({ type: "ping" })}
        title="Send ping"
      >
        Ping
      </button>

      <div className="max-w-[40%] min-w-[240px] truncate text-xs opacity-70" title={last}>
        {last}
      </div>
    </div>
  );
}
