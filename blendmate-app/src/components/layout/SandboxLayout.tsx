import { PanelState } from "../../types/panels";
import { PANEL_REGISTRY } from "../../services/panelRegistry";
import NodeHelpView from "../NodeHelpView";

interface SandboxLayoutProps {
  visiblePanels: PanelState[];
  currentNodeId: string;
  setCurrentNodeId: (id: string) => void;
  events: any[];
  frame: number;
}

export default function SandboxLayout({ visiblePanels, currentNodeId, setCurrentNodeId, events, frame }: SandboxLayoutProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-auto p-6 space-y-4 custom-scrollbar">

      <div className="flex gap-4 h-full">
        {/* Left: Outliner / Context */}
        <aside className="w-60 shrink-0 bg-blendmate-gray rounded-2xl p-4 border border-white/5">
          <div className="text-sm font-bold mb-2">Context Outliner</div>
          <div className="space-y-1 text-xs opacity-80">
            {/* lightweight interactive list */}
            {['GeometryNodeCombineXYZ','GeometryNodeInstanceOnPoints','GeometryNodeSeparateXYZ'].map(node => (
              <button
                key={node}
                onClick={() => setCurrentNodeId(node)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-white/5 ${currentNodeId===node ? 'bg-white/5 ring-1 ring-blendmate-blue/30' : ''}`}
              >
                {node}
              </button>
            ))}
          </div>
        </aside>

        {/* Center: Workspace with panels */}
        <main className="flex-1">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold">Workspace</div>
              <div className="text-xs opacity-60">Frame {frame}</div>
            </div>

            {visiblePanels.length > 0 ? (
              visiblePanels.map((panelState: PanelState) => {
                const panelDef = PANEL_REGISTRY[panelState.id];
                const PanelComponent = panelDef.component;
                return (
                  <section key={panelState.id} className={`relative group ${panelState.isFocused ? 'ring-2 ring-blendmate-blue/50' : ''}`}>
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
              })
            ) : (
              <section className="bg-blendmate-gray rounded-3xl p-12 border border-white/10 shadow-2xl min-h-[220px] flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-2 opacity-20">🧭</div>
                <div className="text-sm opacity-40">No panels visible — Open one from the HUD</div>
              </section>
            )}

            {/* Quick action cards */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              {['Purge','Pack','Render'].map(a => <button key={a} className="py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-bold uppercase">{a}</button>)}
            </div>
          </div>
        </main>

        {/* Right: Inspector / Help */}
        <aside className="w-80 shrink-0 bg-blendmate-gray rounded-2xl p-4 border border-white/5">
          <div className="text-sm font-bold mb-2">Inspector / Help</div>
          <div className="mb-3 text-xs opacity-70">Current Node</div>
          <div className="mb-4">
            <NodeHelpView nodeId={currentNodeId} />
          </div>
        </aside>
      </div>

      {/* Bottom: Prompt bar */}
      <div className="h-20 bg-blendmate-gray/60 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
        <input
          className="flex-1 bg-transparent border border-white/5 rounded px-3 py-2 text-sm placeholder:opacity-40"
          placeholder="Type a prompt or action... (sandbox)"
        />
        <button className="px-4 py-2 bg-blendmate-blue rounded-2xl text-sm font-bold">Ask AI</button>
      </div>
    </div>
  );
}
