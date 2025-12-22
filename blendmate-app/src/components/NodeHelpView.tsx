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
      .catch(() => {
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
  const previewUrl = (entry as any)?.previewUrl ?? (entry.meta as any)?.previewUrl ?? null;

  return (
    <div className="space-y-6 px-3 sm:px-0">
      {/* Header: stacked on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-[10px] font-bold uppercase tracking-[0.2em] text-blendmate-blue mb-1 block truncate">
            {entry.meta?.category}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black italic text-white drop-shadow-md truncate">
            {entry.meta?.name ?? nodeId}
          </h2>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[11px] sm:text-[9px] font-mono opacity-40">
            {entry.meta?.node_id || nodeId}
          </div>
        </div>
      </div>

      {/* Description / Markdown */}
      <div className="prose prose-invert max-w-none text-sm sm:text-base
        prose-headings:italic prose-headings:font-black prose-headings:text-blendmate-orange
        prose-p:text-white/80 prose-p:leading-relaxed prose-strong:text-blendmate-blue prose-strong:font-bold
      ">
        <ReactMarkdown>{descriptionMarkdown}</ReactMarkdown>
      </div>

      {/* Visual Preview (responsive) */}
      <div className="relative bg-black/40 rounded-2xl border border-white/5 overflow-hidden group w-full">
        {/* mobile: fixed height, larger screens: aspect-video */}
        <div className="w-full h-48 sm:h-auto sm:aspect-video">
          {previewUrl ? (
            <img src={previewUrl} alt={`${entry.meta?.name || 'Node'} preview`} className="object-cover w-full h-full" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-xs text-white/20 font-mono italic">Preview Image Coming Soon</span>
            </div>
          )}
        </div>
      </div>

      {/* Tags: horizontal scroll on small screens, wrap on larger */}
      <div className="flex gap-2 pt-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
        {tags.length > 0 ? (
          tags.map(tag => (
            <span key={tag} className="shrink-0 px-2 py-0.5 bg-blendmate-blue/10 border border-blendmate-blue/20 rounded-md text-[10px] sm:text-[9px] font-bold uppercase text-blendmate-blue/80">
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
