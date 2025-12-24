import { PanelState } from "../../types/panels";
import { PANEL_REGISTRY } from "../../services/panelRegistry";
import NodeHelpView from "../NodeHelpView";
import Outliner from "../Outliner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Play, Package, Trash2, Send } from "lucide-react";

interface SandboxLayoutProps {
  visiblePanels: PanelState[];
  currentNodeId: string;
  setCurrentNodeId: (id: string) => void;
  events: any[];
  frame: number;
}

export default function SandboxLayout({ visiblePanels, currentNodeId, setCurrentNodeId, events, frame }: SandboxLayoutProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left: Outliner / Context */}
        <aside className="w-64 shrink-0 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">Outliner</span>
              <Search className="size-4 text-muted-foreground" />
            </div>
            <ScrollArea className="flex-1 p-2">
              <Outliner currentNodeId={currentNodeId} setCurrentNodeId={setCurrentNodeId} />
            </ScrollArea>
          </Card>
        </aside>

        {/* Center: Workspace with panels */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Workspace</span>
              <div className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">Active</div>
            </div>
            <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              Frame {frame}
            </div>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-1 gap-4">
              {visiblePanels.length > 0 ? (
                visiblePanels.map((panelState: PanelState) => {
                  const panelDef = PANEL_REGISTRY[panelState.id];
                  const PanelComponent = panelDef.component;
                  return (
                    <section
                      key={panelState.id}
                      className="relative group transition-all"
                    >
                      {panelState.isFocused && (
                        <div className="absolute -inset-px rounded-3xl bg-primary/20 ring-1 ring-primary/50" />
                      )}
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
                    </section>
                  );
                })
              ) : (
                <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed bg-muted/20">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="size-6 text-muted-foreground opacity-50" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">No panels visible</div>
                  <p className="text-xs text-muted-foreground/60 mt-1">Open one from the HUD or use shortcuts</p>
                </Card>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <Button variant="outline" size="sm" className="gap-2 text-[10px] uppercase font-bold">
                <Trash2 className="size-3" /> Purge
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-[10px] uppercase font-bold">
                <Package className="size-3" /> Pack
              </Button>
              <Button variant="default" size="sm" className="gap-2 text-[10px] uppercase font-bold">
                <Play className="size-3" /> Render
              </Button>
            </div>
          </ScrollArea>
        </main>

        {/* Right: Inspector / Help */}
        <aside className="w-80 shrink-0 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col overflow-hidden bg-card/50 backdrop-blur-sm">
             <div className="p-4 border-b">
               <span className="text-sm font-semibold tracking-tight">Inspector / Help</span>
               <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Current Node Context</p>
             </div>
             <ScrollArea className="flex-1 p-4">
               <NodeHelpView nodeId={currentNodeId} />
             </ScrollArea>
          </Card>
        </aside>
      </div>

      {/* Bottom: Prompt bar */}
      <div className="p-4 border-t bg-muted/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="relative flex-1">
             <Input
               className="pr-10 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30"
               placeholder="Type a prompt or action..."
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground/50 pointer-events-none">
               ⌘ K
             </div>
          </div>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Send className="size-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
