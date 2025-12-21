import { PanelId, PanelState } from '../../types/panels';
import { PANEL_REGISTRY } from '../../services/panelRegistry';

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
      className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-blendmate-gray/20 backdrop-blur-xl cursor-default"
    >
      <div data-tauri-drag-region className="flex items-center gap-4 select-none">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_15px_rgba(34,197,94,0.6)]`} />
          {status === 'connected' && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />}
        </div>
        <h1 className="text-sm font-black tracking-[0.2em] uppercase italic">
          Blend<span className="text-blendmate-blue">Mate</span> <span className="text-[10px] font-normal opacity-30 ml-2">v0.1.0</span>
        </h1>
      </div>

      {/* Panel launcher / focus switcher */}
      <div className="flex bg-black/40 p-1 rounded-full border border-white/5">
        {panelOrder.map((panelId) => {
          const panel = PANEL_REGISTRY[panelId];
          const state = panelStates.find((p) => p.id === panelId);
          const isVisible = state?.isVisible ?? false;
          const isFocused = state?.isFocused ?? false;

          return (
            <button
              key={panelId}
              onClick={() => onPanelToggle(panelId)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                isFocused && isVisible
                  ? 'bg-blendmate-blue text-black'
                  : isVisible
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white'
              }`}
              title={panel.title}
            >
              <span className="mr-1">{panel.icon}</span>
              {panel.title.split(' ')[0]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
