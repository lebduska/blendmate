import { useState, useEffect } from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";
import { usePanelManager } from "./usePanelManager";
import { LoggedEvent } from "./types/panels";
import HUD from "./components/layout/HUD";
import Footer from "./components/layout/Footer";
import SandboxLayout from "./components/layout/SandboxLayout";

export default function App() {
  const { status, lastMessage, sendJson } = useBlendmateSocket();
  const { panelStates, togglePanel, visiblePanels } = usePanelManager();
  
  const [frame, setFrame] = useState(1);
  const [currentNodeId, setCurrentNodeId] = useState('GeometryNodeInstanceOnPoints');
  const [events, setEvents] = useState<LoggedEvent[]>([]);

  // React to incoming context messages from Blender
  // Rule 1 (UI_RULES.md): No auto-opening panels on events
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
        // Quiet companion rule: do not auto-open or focus panels on context changes
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

      {/* Use sandbox layout for interactive UI exploration */}
      <SandboxLayout
        visiblePanels={visiblePanels}
        currentNodeId={currentNodeId}
        setCurrentNodeId={setCurrentNodeId}
        events={events}
        frame={frame}
      />

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
