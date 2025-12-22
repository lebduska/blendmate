import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { KBNodeEntry } from "../types/kb";
import { loadNodeHelp } from "../services/kbLoader";

interface NodeHelpViewProps {
  nodeId: string;
}

export default function NodeHelpView({ nodeId }: NodeHelpViewProps) {
  const [entry, setEntry] = useState<KBNodeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    loadNodeHelp(nodeId)
      .then((data) => {
        if (isMounted) {
          setEntry(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError("Tenhle uzel ještě neznám, ale brzy se ho naučím! 🎓");
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [nodeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="h-4 w-32 bg-white/10 rounded" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="text-center py-12 px-6">
        <div className="text-4xl mb-4">✨</div>
        <p className="text-white/40 italic text-sm leading-relaxed">{error || `Hledám informace pro uzel ${nodeId}...`}</p>
      </div>
    );
  }

  // safe defaults
  const tags = entry.meta?.tags ?? [];
  const descriptionMarkdown = entry.markdown || entry.meta?.description || "(žádný popis)";
  const previewUrl = (entry as any).previewUrl || entry.meta?.previewUrl || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blendmate-blue mb-1 block">
            {entry.meta?.category}
          </span>
          <h2 className="text-3xl font-black italic text-white drop-shadow-md">
            {entry.meta?.name}
          </h2>
        </div>
        <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[9px] font-mono opacity-40">
          {entry.meta?.node_id || nodeId}
        </div>
      </div>

      {/* Description / Markdown */}
      <div className="prose prose-invert prose-sm max-w-none 
        prose-headings:italic prose-headings:font-black prose-headings:text-blendmate-orange
        prose-p:text-white/80 prose-p:leading-relaxed
        prose-strong:text-blendmate-blue prose-strong:font-bold
      ">
        <ReactMarkdown>{descriptionMarkdown}</ReactMarkdown>
      </div>

      {/* Visual Preview (shows image if available, otherwise placeholder) */}
      <div className="relative aspect-video bg-black/40 rounded-2xl border border-white/5 overflow-hidden group">
        {previewUrl ? (
          <img src={previewUrl} alt={`${entry.meta?.name || 'Node'} preview`} className="object-cover w-full h-full" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-xs text-white/10 font-mono italic">Preview Image Coming Soon</span>
          </div>
        )}
        {/* V budoucnu: <img src={entry.previewUrl} className="..." /> */}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 pt-2">
        {tags.length > 0 ? (
          tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-blendmate-blue/10 border border-blendmate-blue/20 rounded-md text-[9px] font-bold uppercase text-blendmate-blue/80">
              #{tag}
            </span>
          ))
        ) : (
          <span className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] italic text-white/40">Žádné tagy</span>
        )}
      </div>
    </div>
  );
}
