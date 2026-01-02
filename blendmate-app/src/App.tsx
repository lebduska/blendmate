import { useState, useEffect, useRef } from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";
import { Outliner, NodeHelpView } from "@/components";
import { EventsLogPanel } from "@/components/panels";
import { Activity, LayoutGrid, Info, ListTree } from "lucide-react";
import BackgroundPaths from "@/components/ui/BackgroundPaths";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ScrollArea } from "@/components/ui";

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
  // Status colors using Islands tokens
  const wsColorVar = wsConnected && isAlive
    ? 'var(--islands-color-success)'      // live - green
    : wsConnected
      ? 'var(--islands-color-warning)'    // connected - amber
      : 'var(--islands-color-error)';     // disconnected - red
  const wsLabel = wsConnected && isAlive ? 'live' : wsConnected ? 'connected' : 'disconnected';

  return (
    <div className="relative flex flex-col h-screen text-foreground overflow-hidden font-sans">
      {/* Base background layer */}
      <div className="absolute inset-0 -z-20 bg-background" aria-hidden />
      <BackgroundPaths />
      {/* App content (stack above beams) */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <main className="h-full min-w-0 flex flex-col overflow-hidden p-1.5">
          <ResizablePanelGroup orientation="horizontal" disableCursor className="h-full">
            {/* Left Island: Outliner */}
            <ResizablePanel defaultSize={100} minSize={100} maxSize={500}>
              <div className="island h-full flex flex-col">
                <div className="panel-header">
                  <ListTree className="panel-header__icon" />
                  <span className="panel-header__title">Outliner</span>
                </div>
                <ScrollArea className="flex-1 p-2">
                  <Outliner currentNodeId={currentNodeId} setCurrentNodeId={setCurrentNodeId} />
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Center Island: Bench (Events Log) */}
            <ResizablePanel defaultSize={400} minSize={20}>
              <div className="island h-full flex flex-col">
                <div className="panel-header justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="panel-header__icon" />
                    <span className="panel-header__title">Bench</span>
                    {status === 'connected' && (
                      <button
                        onClick={() => requestScene()}
                        className="btn btn--primary ml-2"
                      >
                        Get Scene
                      </button>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1.5 pl-3"
                    style={{ borderLeft: '1px solid var(--islands-color-border-subtle)' }}
                  >
                    <div
                      className={`size-1.5 rounded-full ${wsConnected && isAlive ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: wsColorVar }}
                      aria-hidden="true"
                    />
                    <span className="panel-header__title" style={{ opacity: 0.4 }}>
                      {wsLabel}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  <EventsLogPanel isVisible={true} isFocused={false} />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Right Island: Context Container */}
            <ResizablePanel defaultSize={400} minSize={300} maxSize={800}>
              <div className="island h-full flex flex-col">
                <div className="panel-header">
                  <Info className="panel-header__icon" />
                  <span className="panel-header__title">Context</span>
                </div>
                <ScrollArea className="flex-1 p-4">
                   <NodeHelpView nodeId={currentNodeId} />
                </ScrollArea>
              </div>
            </ResizablePanel>

          </ResizablePanelGroup>
        </main>
      </div>

      {/* Mini Footer / Status */}
      <footer className="h-8 px-4 border-t flex items-center justify-between text-[10px] bg-card/30 backdrop-blur-xl">
        <div className="flex items-center gap-4 opacity-50 font-medium">
          <span>BLENDMATE v0.1.0</span>
          <span className="flex items-center gap-1">
            <Activity className="size-3" style={{ color: 'var(--islands-color-success)' }} />
            60 FPS
          </span>
        </div>
      </footer>
    </div>
  );
}
