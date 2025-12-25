export function CenterWorkspace() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="h-[36px] flex items-center gap-2 px-3 border-b border-white/10">
        <div className="text-xs px-2 py-1 rounded bg-white/10">Workspace</div>
        <div className="text-xs opacity-60">tabs/splits later</div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <div className="h-full w-full rounded-xl border border-white/10 flex items-center justify-center">
          <div className="text-sm opacity-80 text-center max-w-[520px] px-6">
            <div className="font-medium mb-2">Sandbox canvas</div>
            <div className="opacity-70">
              This is the vNext shell baseline. We'll add tabs, panels, and workflows on top of this.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
