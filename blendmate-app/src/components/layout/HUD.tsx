import { PanelId, PanelState } from '../../types/panels';
import { PANEL_REGISTRY } from '../../services/panelRegistry';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface HUDProps {
  status: string;
  panelStates: PanelState[];
  onPanelToggle: (panelId: PanelId) => void;
}

export default function HUD({ status, panelStates, onPanelToggle }: HUDProps) {
  // Derive panel order from registry keys to maintain consistency
  const panelOrder = Object.keys(PANEL_REGISTRY) as PanelId[];

  return (
    <nav
      data-tauri-drag-region
      className="flex items-center justify-between px-6 py-3 border-b bg-background/50 backdrop-blur-xl cursor-default"
    >
      <div data-tauri-drag-region className="flex items-center gap-4 select-none">
        <div className="relative">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            status === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-destructive'
          )} />
          {status === 'connected' && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-40" />}
        </div>
        <div className="flex flex-col">
          <h1 className="text-xs font-black tracking-[0.2em] uppercase italic">
            Blend<span className="text-primary">Mate</span>
          </h1>
          <span className="text-[9px] font-mono opacity-30">COMPANION v0.1.0</span>
        </div>
      </div>

      {/* Panel launcher / focus switcher */}
      <div className="flex bg-muted/50 p-1 rounded-lg border">
        {panelOrder.map((panelId) => {
          const panel = PANEL_REGISTRY[panelId];
          const state = panelStates.find((p) => p.id === panelId);
          const isVisible = state?.isVisible ?? false;
          const isFocused = state?.isFocused ?? false;

          return (
            <button
              key={panelId}
              onClick={() => onPanelToggle(panelId)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2",
                isFocused && isVisible
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : isVisible
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title={panel.title}
            >
              <span>{panel.icon}</span>
              <span className="hidden sm:inline">{panel.title.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
         <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0">
           {status === 'connected' ? 'ONLINE' : 'OFFLINE'}
         </Badge>
      </div>
    </nav>
  );
}
