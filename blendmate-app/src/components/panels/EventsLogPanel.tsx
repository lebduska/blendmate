import { PanelProps } from '../../types/panels';

interface EventsLogPanelProps extends PanelProps {
  events: Array<{ type: string; timestamp: number; data: any }>;
}

export default function EventsLogPanel({ events }: EventsLogPanelProps) {
  const recentEvents = events.slice(-10).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blendmate-orange rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blendmate-orange/20">
          📋
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tighter">Events Log</h2>
          <p className="text-xs font-bold text-blendmate-orange uppercase tracking-widest opacity-60">Recent Activity</p>
        </div>
      </div>

      <div className="space-y-2">
        {recentEvents.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-6 text-center italic opacity-30">
            No events yet...
          </div>
        ) : (
          recentEvents.map((event, idx) => (
            <div 
              key={`${event.timestamp}-${idx}`}
              className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blendmate-orange uppercase">{event.type}</span>
                <span className="text-[9px] text-white/30 font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-xs font-mono text-white/60 truncate">
                {JSON.stringify(event.data)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
