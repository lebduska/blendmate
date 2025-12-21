interface NodeHelpViewProps {
  nodeId: string;
}

export default function NodeHelpView({ nodeId }: NodeHelpViewProps) {
  // TODO: Load actual node data from knowledge base
  const displayName = nodeId.replace('GeometryNode', '').replace(/([A-Z])/g, ' $1').trim();
  
  return (
    <div className="space-y-6">
      {/* Visual Title */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blendmate-blue rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blendmate-blue/20">
          📍
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tighter">{displayName}</h2>
          <p className="text-xs font-bold text-blendmate-blue uppercase tracking-widest opacity-60">Geometry Nodes • Basic</p>
        </div>
      </div>

      {/* Child-friendly explanation */}
      <section className="bg-black/20 rounded-3xl p-5 border border-white/5 italic text-lg leading-relaxed text-white/90">
        "Imagine you have a handful of <span className="text-blendmate-orange font-bold">stickers</span> and a <span className="text-blendmate-blue font-bold">map</span>. This node puts a sticker on every town on that map!"
      </section>

      {/* The "What goes where" simplified diagram */}
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-blendmate-blue flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform">1</div>
          <div>
            <p className="text-[10px] uppercase font-bold opacity-40">The Map (Points)</p>
            <p className="text-sm">Where do we put things?</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-blendmate-orange flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform">2</div>
          <div>
            <p className="text-[10px] uppercase font-bold opacity-40">The Sticker (Instance)</p>
            <p className="text-sm">What are we putting there?</p>
          </div>
        </div>
      </div>

      {/* Pro-tip / Pitfall in a friendly way */}
      <div className="bg-blendmate-orange/10 border border-blendmate-orange/20 rounded-2xl p-4 flex gap-4">
        <div className="text-2xl">⚠️</div>
        <div>
          <h4 className="text-xs font-black uppercase text-blendmate-orange mb-1">Watch out!</h4>
          <p className="text-xs opacity-70">If your computer starts breathing heavily, you might be putting too many stickers. Try to use simple stickers first!</p>
        </div>
      </div>

      {/* Action button for kids */}
      <button className="w-full py-4 bg-blendmate-blue text-black font-black uppercase tracking-tighter rounded-2xl hover:bg-blue-400 active:scale-95 transition-all shadow-xl shadow-blendmate-blue/20">
        Show me an example! ✨
      </button>
    </div>
  );
}
