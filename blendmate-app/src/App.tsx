import { useState, useEffect, useRef } from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";
import { Outliner, NodeHelpView } from "@/components";
import { EventsLogPanel } from "@/components/panels";
import { Activity, LayoutGrid, Info, ListTree } from "lucide-react";
import BackgroundPaths from "@/components/ui/BackgroundPaths";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, Card, ScrollArea } from "@/components/ui";

export default function App() {
  const { lastMessage, status, requestScene } = useBlendmateSocket();
  const [currentNodeId, setCurrentNodeId] = useState<string>('GeometryNodeInstanceOnPoints');
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [isAlive, setIsAlive] = useState(false);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track heartbeat messages for status indicator
  useEffect(() => {
    if (lastMessage) {
      if ((lastMessage as any).type === 'heartbeat') {
        setLastHeartbeat(Date.now());
        setIsAlive(true);

        // Reset alive status if no heartbeat for 10 seconds
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = setTimeout(() => {
          setIsAlive(false);
        }, 10000);
      } else if ((lastMessage as any).type === 'context' && (lastMessage as any).node_id) {
        setCurrentNodeId((lastMessage as any).node_id as string);
      }
    }
  }, [lastMessage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
    };
  }, []);

  const wsConnected = status === 'connected';
  const wsColor = wsConnected && isAlive ? 'bg-emerald-500 animate-pulse' : wsConnected ? 'bg-amber-500' : 'bg-red-500';
  const wsLabel = wsConnected && isAlive ? 'live' : wsConnected ? 'connected' : 'disconnected';

  return (
    <div className="relative flex flex-col h-screen text-foreground overflow-hidden font-sans">
      {/* Base background layer */}
      <div className="absolute inset-0 -z-20 bg-background" aria-hidden />
      <BackgroundPaths
      />
      {/* App content (stack above beams) */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <main className="h-full min-w-0 flex flex-col overflow-hidden p-1.5">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            {/* Left Island: Outliner */}
            <ResizablePanel defaultSize={100} minSize={100} maxSize={500}>
              <Card className="h-full flex flex-col overflow-hidden shadow-none bg-card/65 backdrop-blur-md border-muted/20 py-2 gap-0">
                <div className="h-8 px-4 border-b flex items-center gap-2 bg-muted/10 shrink-0">
                  <ListTree className="size-3.5 text-primary/70" />
                  <span className="text-[9px] font-semibold uppercase tracking-normal opacity-60">Outliner</span>
                </div>
                <ScrollArea className="flex-1 p-2">
                  <Outliner currentNodeId={currentNodeId} setCurrentNodeId={setCurrentNodeId} />
                </ScrollArea>
              </Card>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-transparent cool-resizable-handle" />

            {/* Center Island: Bench (Events Log) */}
            <ResizablePanel defaultSize={400} minSize={20}>
              <Card className="h-full flex flex-col overflow-hidden shadow-none bg-card/65 backdrop-blur-md border-muted/20 py-2 gap-0">
                <div className="h-8 px-4 border-b flex items-center justify-between bg-muted/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="size-3.5 text-primary/70" />
                    <span className="text-[9px] font-semibold uppercase tracking-normal opacity-60">Bench</span>
                    {status === 'connected' && (
                      <button
                        onClick={() => requestScene()}
                        className="ml-2 px-2 py-0.5 text-[9px] bg-primary/20 hover:bg-primary/30 rounded"
                      >
                        Get Scene
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                       <div className={`size-1.5 rounded-full ${wsColor}`} aria-hidden="true" />
                       <span className="text-[9px] font-semibold uppercase tracking-normal opacity-40">
                         {wsLabel}
                       </span>
                     </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  <EventsLogPanel isVisible={true} isFocused={false} />
                </div>
              </Card>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-transparent cool-resizable-handle" />

            {/* Right Island: Context Container */}
            <ResizablePanel defaultSize={400} minSize={300} maxSize={800}>
              <Card className="h-full flex flex-col overflow-hidden shadow-none bg-card/65 backdrop-blur-md border-muted/20 py-2 gap-0">
                <div className="h-8 px-4 border-b flex items-center gap-2 bg-muted/10 shrink-0">
                  <Info className="size-3.5 text-primary/70" />
                  <span className="text-[9px] font-semibold uppercase tracking-normal opacity-60">Context</span>
                </div>
                <ScrollArea className="flex-1 p-4">
                   <NodeHelpView nodeId={currentNodeId} />
                </ScrollArea>
              </Card>
            </ResizablePanel>

          </ResizablePanelGroup>
        </main>
      </div>

      {/* Mini Footer / Status */}
      <footer className="h-8 px-4 border-t flex items-center justify-between text-[10px] bg-card/30 backdrop-blur-xl">
        <div className="flex items-center gap-4 opacity-50 font-medium">
          <span>BLENDMATE v0.1.0</span>
          <span className="flex items-center gap-1">
            <Activity className="size-3 text-emerald-500" />
            60 FPS
          </span>
        </div>
      </footer>
    </div>
  );
}
