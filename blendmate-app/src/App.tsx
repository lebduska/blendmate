import { useBlendmateSocket } from "./useBlendmateSocket";

export default function App() {
  const { status } = useBlendmateSocket();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header 
        data-tauri-drag-region
        className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
      >
        <h1 className="text-lg font-semibold">Blendmate</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600">{status}</span>
        </div>
      </header>

      {/* Workspace */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">Workspace area — ready for lab features.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
        Blendmate v0.1.0
      </footer>
    </div>
  );
}
