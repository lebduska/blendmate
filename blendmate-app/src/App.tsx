import { FormEvent, useMemo, useState } from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";

function App() {
  const { status, lastMessage, sendJson } = useBlendmateSocket();
  const [outgoing, setOutgoing] = useState("Hello from Blendmate!");

  return (
    <main className="min-h-screen bg-blendmate-dark text-white p-4 font-sans select-none">
      {/* Header / Status Bar */}
      <header className="flex items-center justify-between mb-6 bg-blendmate-gray/50 p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 
            status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-bold tracking-tight uppercase opacity-80">
            {status}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-blendmate-orange animate-pulse" title="Blender Eye" />
          <div className="w-6 h-6 rounded-full bg-blendmate-blue" title="Soulmate Eye" />
        </div>
      </header>

      {/* Hero / Big Simple Message */}
      <section className="mb-8 text-center py-10">
        <h1 className="text-4xl font-black mb-2 tracking-tighter">
          I'm your <span className="text-blendmate-blue">soulmate</span>.
        </h1>
        <p className="text-lg opacity-60">Ready to help with your nodes!</p>
      </section>

      {/* Action / Debug Panel (Will be replaced by NodeHelpView) */}
      <section className="bg-blendmate-gray p-6 rounded-3xl border border-white/10 shadow-2xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="bg-blendmate-orange w-2 h-6 rounded-full" />
          Quick Test
        </h2>
        
        <form onSubmit={(e) => { e.preventDefault(); sendJson({ type: "message", text: outgoing }); }} className="space-y-4">
          <input
            className="w-full bg-blendmate-dark border border-white/10 rounded-xl p-3 focus:outline-none focus:border-blendmate-blue transition-colors"
            value={outgoing}
            onChange={(e) => setOutgoing(e.target.value)}
          />
          <button 
            type="submit"
            disabled={status !== "connected"}
            className="w-full bg-blendmate-blue hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blendmate-blue py-3 rounded-xl font-bold transition-all transform active:scale-95"
          >
            Send to Blender
          </button>
        </form>
      </section>

      {/* Last Message Peek */}
      <footer className="mt-8 opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-xs font-mono truncate">
          {lastMessage || "Waiting for magic..."}
        </p>
      </footer>
    </main>
  );
}

export default App;
