interface HUDProps {
  status: string;
  activeTab: 'nodes' | 'stats' | 'chat' | 'demo';
  setActiveTab: (tab: 'nodes' | 'stats' | 'chat' | 'demo') => void;
}

export default function HUD({ status, activeTab, setActiveTab }: HUDProps) {
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

      <div className="flex bg-black/40 p-1 rounded-full border border-white/5">
        {(['demo', 'nodes', 'stats', 'chat'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${
              activeTab === tab ? 'bg-blendmate-blue text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}
