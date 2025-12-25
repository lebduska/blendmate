import { useEffect, useState } from 'react';
import { PanelProps } from '@/types/panels.ts';
import { useBlendmateSocket } from '@/useBlendmateSocket.ts';
import { Badge, ScrollArea, Button } from '@/components/ui';
import { ListTree } from 'lucide-react';

export default function EventsLogPanel(_props: PanelProps) {
  const { lastMessage, status } = useBlendmateSocket();
  const [events, setEvents] = useState<Array<{ type: string; timestamp: number; data: unknown }>>([]);

  useEffect(() => {
    if (lastMessage) {
      setEvents((prev) => {
        const next = [
          ...prev,
          {
            type: (lastMessage as any).type as string || 'unknown',
            timestamp: Date.now(),
            data: lastMessage,
          },
        ];
        return next.slice(-500);
      });
    }
  }, [lastMessage]);

  const clear = () => setEvents([]);

  const statusColor = status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-yellow-400' : 'bg-red-500';

  return (
    <div className="flex flex-col gap-2">
      {/* Header matching Outliner (slightly lower) */}
      <div className="h-7 px-4 border-b flex items-center justify-between bg-muted/10 shrink-0">
        <div className="flex items-center gap-2">
          <ListTree className="size-3.5 text-primary/70" />
          <span className="text-[9px] font-semibold uppercase tracking-normal opacity-60">Events</span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${statusColor}`} aria-hidden="true" />
        </div>
      </div>

      <div className="border rounded overflow-hidden">
        <ScrollArea className="h-56 p-2">
          <div className="space-y-2">
            {[...events].reverse().map((ev, idx) => (
              <div key={idx} className="p-2 bg-card/60 rounded border border-muted/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    <Badge variant="secondary" className="text-[11px]">{ev.type}</Badge>
                  </div>
                </div>
                <pre className="text-xs max-h-40 overflow-auto whitespace-pre-wrap text-[12px] bg-transparent m-0 p-1 font-mono">{JSON.stringify(ev.data, null, 2)}</pre>
              </div>
            ))}

            {events.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">No events yet — waiting for WebSocket messages...</div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with clear button and simple status */}
        <div className="px-4 py-2 border-t flex items-center justify-between bg-muted/10">
          <div className="text-xs text-muted-foreground">{events.length} events</div>
          <div>
            <Button variant="outline" size="sm" onClick={clear}>Clear</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
