import { useState, useEffect } from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";
import { usePanelManager } from "./usePanelManager";
import { PanelState, LoggedEvent } from "./types/panels";
import { PANEL_REGISTRY } from "./services/panelRegistry";
import HUD from "./components/layout/HUD";
import Footer from "./components/layout/Footer";
import Card from "./components/ui/Card";

export default function App() {
  const { status, lastMessage, sendJson } = useBlendmateSocket();
  const { panelStates, togglePanel, visiblePanels } = usePanelManager();
  
  const [frame, setFrame] = useState(1);
  const [currentNodeId, setCurrentNodeId] = useState('GeometryNodeInstanceOnPoints');
  const [events, setEvents] = useState<LoggedEvent[]>([]);

  // React to incoming context messages from Blender
  useEffect(() => {
    if (lastMessage) {
      // Add to events log with size limit to prevent memory issues
      setEvents((prev: LoggedEvent[]) => {
        const newEvents = [...prev, { 
          type: lastMessage.type as string, 
          timestamp: Date.now(), 
          data: lastMessage 
        }];
        // Keep only last 100 events
        return newEvents.slice(-100);
      });

      if (lastMessage.type === 'context' && lastMessage.node_id) {
        setCurrentNodeId(lastMessage.node_id as string);
        togglePanel('nodes-help');
      } else if (lastMessage.type === 'event' && lastMessage.event === 'frame_change') {
        setFrame(lastMessage.frame as number);
      }
    }
  }, [lastMessage, togglePanel]);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-blendmate-dark text-white font-sans selection:bg-blendmate-blue/30">
      
      <HUD 
        status={status} 
        panelStates={panelStates}
        onPanelToggle={togglePanel}
      />

      {/* --- MAIN ADVENTURE AREA --- */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* Real-time Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card label="Current Frame" value={frame} colorClass="text-blendmate-orange" />
          <Card label="Scene Verts" value="1.2M" colorClass="text-blendmate-blue" />
        </div>

        {/* Render visible panels */}
        {visiblePanels.map((panelState: PanelState) => {
          const panelDef = PANEL_REGISTRY[panelState.id];
          const PanelComponent = panelDef.component;
          
          return (
            <section 
              key={panelState.id}
              className={`relative group ${panelState.isFocused ? 'ring-2 ring-blendmate-blue/50' : ''}`}
            >
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-blendmate-blue to-blendmate-orange opacity-20 blur group-hover:opacity-40 transition duration-1000 ${panelState.isFocused ? 'opacity-30' : ''}`}></div>
              <div className="relative bg-blendmate-gray rounded-3xl p-6 border border-white/10 shadow-2xl">
                <PanelComponent 
                  isVisible={panelState.isVisible}
                  isFocused={panelState.isFocused}
                  {...(panelState.id === 'nodes-help' && {
                    currentNodeId,
                    onNodeIdChange: setCurrentNodeId,
                  })}
                  {...(panelState.id === 'events-log' && {
                    events,
                  })}
                  {...(panelState.id === 'chat' && {
                    messages: [],
                  })}
                />
              </div>
            </section>
          );
        })}

        {/* Show helper message when no panels are visible */}
        {visiblePanels.length === 0 && (
          <section className="bg-blendmate-gray rounded-3xl p-12 border border-white/10 shadow-2xl min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4 opacity-20">👋</div>
            <div className="text-xl font-bold mb-2 opacity-60">No panels visible</div>
            <div className="text-sm opacity-40">Click a panel button in the header to get started</div>
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
