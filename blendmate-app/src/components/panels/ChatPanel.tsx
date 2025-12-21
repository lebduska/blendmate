import { PanelProps } from '../../types/panels';

interface ChatPanelProps extends PanelProps {
  messages?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
}

export default function ChatPanel({ messages = [] }: ChatPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blendmate-blue rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blendmate-blue/20">
          💬
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tighter">Chat</h2>
          <p className="text-xs font-bold text-blendmate-blue uppercase tracking-widest opacity-60">Conversation</p>
        </div>
      </div>

      <div className="space-y-3 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-8 text-center italic opacity-30 flex flex-col items-center justify-center h-full">
            <div className="text-4xl mb-3">💭</div>
            <div>Chat history is empty...</div>
            <div className="text-[10px] mt-2 opacity-50">Start a conversation with your BlendMate!</div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={`${msg.timestamp}-${idx}`}
              className={`rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-blendmate-blue/20 border border-blendmate-blue/30 ml-8' 
                  : 'bg-white/5 border border-white/5 mr-8'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase opacity-60">
                  {msg.role === 'user' ? 'You' : 'BlendMate'}
                </span>
                <span className="text-[9px] text-white/30 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm text-white/90">{msg.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
