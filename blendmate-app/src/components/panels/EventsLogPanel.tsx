import { useEffect, useRef, useState } from 'react';
import { PanelProps } from '../../types/panels';
import { useBlendmateSocket } from '../../useBlendmateSocket';

type LogLine = {
  timestamp: number;
  time: string;
  data: unknown;
};

// Syntax highlight JSON
function JsonSyntax({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);

  // Colorize JSON parts
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:') // keys
    .replace(/: "([^"]*)"/g, ': <span class="text-amber-300">"$1"</span>') // string values
    .replace(/: (\d+\.?\d*)/g, ': <span class="text-cyan-400">$1</span>') // numbers
    .replace(/: (true|false)/g, ': <span class="text-pink-400">$1</span>') // booleans
    .replace(/: (null)/g, ': <span class="text-gray-500">$1</span>'); // null

  return (
    <pre
      className="whitespace-pre-wrap break-all text-green-300/80"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export default function EventsLogPanel(_props: PanelProps) {
  const { lastMessage } = useBlendmateSocket();
  const [lines, setLines] = useState<LogLine[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMessage) {
      // Skip heartbeat messages from log
      if ((lastMessage as any).type === 'heartbeat') return;

      const ts = new Date().toLocaleTimeString('cs-CZ', { hour12: false });
      setLines((prev) => [...prev, { timestamp: Date.now(), time: ts, data: lastMessage }].slice(-500));
    }
  }, [lastMessage]);

  // Auto-scroll to bottom only if enabled
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, autoScroll]);

  // Detect manual scroll - disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  const clearLog = () => setLines([]);

  return (
    <div className="h-full flex flex-col bg-black/90">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-green-900/50 shrink-0">
        <span className="text-green-600 text-[10px]">{lines.length} lines</span>
        <div className="flex-1" />
        <button
          onClick={scrollToBottom}
          className={`px-2 py-0.5 text-[10px] rounded ${autoScroll ? 'bg-green-900/50 text-green-400' : 'bg-green-900/30 text-green-600 hover:bg-green-900/50'}`}
        >
          {autoScroll ? '↓ Auto' : '↓ Follow'}
        </button>
        <button
          onClick={clearLog}
          className="px-2 py-0.5 text-[10px] bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded"
        >
          Clear
        </button>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 font-mono text-xs p-2 overflow-auto"
      >
        {lines.length === 0 && (
          <div className="text-green-600">$ waiting for events...</div>
        )}
        {lines.map((line, idx) => (
          <div key={idx} className="mb-2 pb-2 border-b border-green-900/30">
            <div className="text-green-600 text-[10px] mb-1">[{line.time}]</div>
            <JsonSyntax data={line.data} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
