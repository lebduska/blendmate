interface FooterProps {
  lastMessage: any;
  sendJson: (json: any) => void;
}

export default function Footer({ lastMessage, sendJson }: FooterProps) {
  return (
    <footer 
      data-tauri-drag-region
      className="p-4 bg-black/60 border-t border-white/5 backdrop-blur-2xl cursor-default"
    >
      <div className="flex items-center gap-3 mb-3">
        <input 
          type="text" 
          placeholder="Ask your soulmate anything..." 
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blendmate-blue/50 transition-all"
        />
        <button 
          onClick={() => sendJson({type: "ping"})}
          className="bg-blendmate-blue text-black p-2 rounded-xl hover:scale-105 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="font-mono text-[9px] text-white/20 flex justify-between items-center">
        <div className="truncate max-w-[70%]">
          {lastMessage ? `[RECV] ${JSON.stringify(lastMessage)}` : '> Awaiting Blender signal...'}
        </div>
        <div className="flex gap-2">
          <span className="animate-pulse">●</span>
          <span>60 FPS</span>
        </div>
      </div>
    </footer>
  );
}
