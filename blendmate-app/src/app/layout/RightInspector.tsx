export function RightInspector() {
  return (
    <div className="h-full w-full p-3">
      <div className="text-xs opacity-70 mb-2">Inspector</div>
      <div className="rounded-xl border border-white/10 p-3">
        <div className="text-sm font-medium mb-1">Nothing selected</div>
        <div className="text-sm opacity-70">
          Contextual help will appear here (tools, nodes, selection mode, shortcuts…).
        </div>
      </div>
    </div>
  );
}
