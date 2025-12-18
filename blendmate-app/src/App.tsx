import { useState, useEffect } from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";
import NodeHelpView from "./components/NodeHelpView";
import HUD from "./components/layout/HUD";
import Footer from "./components/layout/Footer";
import Card from "./components/ui/Card";

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
      
      <HUD 
        status={status} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* --- MAIN ADVENTURE AREA --- */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* Real-time Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card label="Current Frame" value={frame} colorClass="text-blendmate-orange" />
          <Card label="Scene Verts" value="1.2M" colorClass="text-blendmate-blue" />
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

      <Footer lastMessage={lastMessage} sendJson={sendJson} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(61,148,255,0.3); }
      `}</style>
    </main>
  );
}
