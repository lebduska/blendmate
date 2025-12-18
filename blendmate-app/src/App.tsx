import { useState, useEffect } from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";
import NodeHelpView from "./components/NodeHelpView";

export default function App() {
  const { status, lastMessage, sendJson } = useBlendmateSocket();
  const [activeTab, setActiveTab] = useState<'nodes' | 'stats' | 'chat'>('nodes');
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => setFrame(f => (f % 250) + 1), 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-blendmate-dark text-white font-sans selection:bg-blendmate-blue/30">
      
      {/* --- TOP HUD NAVIGATION --- */}
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
          {(['nodes', 'stats', 'chat'] as const).map((tab) => (
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

      {/* --- MAIN ADVENTURE AREA --- */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* Real-time Stats Card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blendmate-gray/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider opacity-40 mb-1">Current Frame</p>
            <p className="text-3xl font-mono font-black text-blendmate-orange italic">{frame}</p>
          </div>
          <div className="bg-blendmate-gray/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider opacity-40 mb-1">Scene Verts</p>
            <p className="text-3xl font-mono font-black text-blendmate-blue italic">1.2M</p>
          </div>
        </div>

        {/* Node Help View (Mockup for #23) */}
        {activeTab === 'nodes' && (
          <section className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blendmate-blue to-blendmate-orange opacity-20 blur group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-blendmate-gray rounded-3xl p-6 border border-white/10 shadow-2xl">
              <NodeHelpView />
            </div>
          </section>
        )}

        {/* Other Tabs content placeholders... */}
        {activeTab === 'chat' && (
          <section className="bg-blendmate-gray rounded-3xl p-6 border border-white/10 shadow-2xl min-h-[200px] flex items-center justify-center italic opacity-30">
            Chat history is empty...
          </section>
        )}

        {/* ADHD Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {['Purge', 'Pack', 'Render'].map(action => (
            <button key={action} className="py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-bold uppercase hover:bg-white/10 active:scale-95 transition-all">
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* --- CYBERPUNK FOOTER / CONSOLE --- */}
      <footer 
        data-tauri-drag-region
        className="p-4 bg-black/60 border-t border-white/5 backdrop-blur-2xl cursor-default"
      >
        <div className="flex items-center gap-3 mb-3">
          <input 
            type="text" 
            placeholder="Ask your soulmate anything..." 
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blendmate-blue/50 transition-all"
          />
          <button 
            onClick={() => sendJson({type: "ping"})}
            className="bg-blendmate-blue text-black p-2 rounded-xl hover:scale-105 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="font-mono text-[9px] text-white/20 flex justify-between items-center">
          <div className="truncate max-w-[70%]">
            {lastMessage ? `[RECV] ${JSON.stringify(lastMessage)}` : '> Awaiting Blender signal...'}
          </div>
          <div className="flex gap-2">
            <span className="animate-pulse">●</span>
            <span>60 FPS</span>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(61,148,255,0.3); }
      `}</style>
    </main>
  );
}
