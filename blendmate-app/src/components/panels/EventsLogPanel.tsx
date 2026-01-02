import { useEffect, useRef, useState } from 'react';
import { PanelProps } from '../../types/panels';
import { useBlendmateSocket } from '../../useBlendmateSocket';

type LogLine = {
  timestamp: number;
  time: string;
  data: unknown;
};

/**
 * Syntax highlight JSON using Islands design tokens
 *
 * Color mapping:
 * - Keys: brand-secondary (light blue) - draws attention to structure
 * - Strings: warning (amber) - warm color for text values
 * - Numbers: info (blue) - cool color for numeric data
 * - Booleans: success (green) - positive/active feel
 * - Null: text-disabled (grey) - de-emphasized
 * - Default text: text-primary (light grey)
 */
function JsonSyntax({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);

  // Colorize JSON using Islands token CSS variables
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span style="color: var(--islands-color-brand-secondary)">"$1"</span>:') // keys
    .replace(/: "([^"]*)"/g, ': <span style="color: var(--islands-color-warning)">"$1"</span>') // string values
    .replace(/: (\d+\.?\d*)/g, ': <span style="color: var(--islands-color-info)">$1</span>') // numbers
    .replace(/: (true|false)/g, ': <span style="color: var(--islands-color-success)">$1</span>') // booleans
    .replace(/: (null)/g, ': <span style="color: var(--islands-color-text-disabled)">$1</span>'); // null

  return (
    <pre
      className="whitespace-pre-wrap break-all"
      style={{ color: 'var(--islands-color-text-primary)' }}
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
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: 'var(--islands-color-background-primary)' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-2 py-1 shrink-0"
        style={{ borderBottom: '1px solid var(--islands-color-border-subtle)' }}
      >
        <span
          className="text-[10px]"
          style={{ color: 'var(--islands-color-text-secondary)' }}
        >
          {lines.length} lines
        </span>
        <div className="flex-1" />
        <button
          onClick={scrollToBottom}
          className="px-2 py-0.5 text-[10px] rounded transition-colors"
          style={{
            backgroundColor: autoScroll
              ? 'color-mix(in srgb, var(--islands-color-brand-primary) 30%, transparent)'
              : 'color-mix(in srgb, var(--islands-color-background-tertiary) 50%, transparent)',
            color: autoScroll
              ? 'var(--islands-color-brand-secondary)'
              : 'var(--islands-color-text-secondary)',
          }}
        >
          {autoScroll ? '↓ Auto' : '↓ Follow'}
        </button>
        <button
          onClick={clearLog}
          className="px-2 py-0.5 text-[10px] rounded transition-colors hover:opacity-80"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--islands-color-error) 20%, transparent)',
            color: 'var(--islands-color-error)',
          }}
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
          <div style={{ color: 'var(--islands-color-text-secondary)' }}>
            $ waiting for events...
          </div>
        )}
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="mb-2 pb-2"
            style={{ borderBottom: '1px solid var(--islands-color-border-subtle)' }}
          >
            <div
              className="text-[10px] mb-1"
              style={{ color: 'var(--islands-color-text-secondary)' }}
            >
              [{line.time}]
            </div>
            <JsonSyntax data={line.data} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
