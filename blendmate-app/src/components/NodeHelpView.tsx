import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { KBNodeEntry } from "../types/kb";
import { loadNodeHelp } from "../services/kbLoader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Tag } from "lucide-react";

interface NodeHelpViewProps {
  nodeId: string;
  showParams?: boolean;
}

export default function NodeHelpView({ nodeId, showParams = true }: NodeHelpViewProps) {
  const [entry, setEntry] = useState<KBNodeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [resolvedNodeId, setResolvedNodeId] = useState(nodeId);

  const fallbackNodeIds = [
    "GeometryNodeCollectionInfo",
    "GeometryNodeMeshToPoints",
  ];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setIsFallback(false);
    setResolvedNodeId(nodeId);

    const load = async () => {
      try {
        const data = await loadNodeHelp(nodeId);
        if (!isMounted) return;
        setEntry(data);
        setIsFallback(false);
        setResolvedNodeId(nodeId);
        setLoading(false);
        return;
      } catch {
        for (const fallbackId of fallbackNodeIds) {
          try {
            const data = await loadNodeHelp(fallbackId);
            if (!isMounted) return;
            setEntry(data);
            setIsFallback(true);
            setResolvedNodeId(fallbackId);
            setLoading(false);
            return;
          } catch {
            // try next fallback
          }
        }
      }

      if (isMounted) {
        setError("Tenhle uzel ještě neznám, ale brzy se ho naučím! 🎓");
        setLoading(false);
      }
    };

    load();

    return () => { isMounted = false; };
  }, [nodeId]);

  if (loading) {
    return (
      <div className="space-y-6 mono-panel">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="text-center py-8 mono-panel">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Sparkles className="size-6 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground italic text-sm leading-relaxed">{error || `Hledám informace pro uzel ${nodeId}...`}</p>
      </div>
    );
  }

  // safe defaults
  const tags = entry.meta?.tags ?? [];
  const descriptionMarkdown = entry.markdown || entry.meta?.description || "(žádný popis)";
  const params = entry.params;
  const hasParams = Boolean(
    (params?.inputs && params.inputs.length > 0) ||
    (params?.properties && params.properties.length > 0) ||
    (params?.outputs && params.outputs.length > 0)
  );

  const renderParamList = (title: string, items: NonNullable<typeof params>['inputs']) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.name} className="rounded-lg border border-white/10 p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{item.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground/80 px-1.5 py-0.5 rounded bg-muted/40 border border-white/10">
                  {item.type}
                </span>
              </div>
              {item.description && (
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </div>
              )}
              {item.options && item.options.length > 0 && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  Options: {item.options.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-6 mono-panel">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
           <div className="space-y-1">
             <h2 className="text-lg font-medium tracking-tight text-foreground mono-heading">
               {entry.meta?.name ?? resolvedNodeId}
             </h2>
             <div className="flex items-center gap-2">
               <Badge variant="secondary" className="font-semibold text-[10px] uppercase tracking-wider">
                 {entry.meta?.category ?? 'Node'}
               </Badge>
               {isFallback && (
                 <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                   Template
                 </span>
               )}
             </div>
           </div>
           <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
             {entry.meta?.node_id || resolvedNodeId}
           </div>
        </div>
      </div>

      {entry.previewUrl && (
        <div className="rounded-xl border border-white/10 bg-muted/20 p-2">
          <img
            src={entry.previewUrl}
            alt={`${entry.meta?.name ?? nodeId} preview`}
            className="w-full rounded-lg object-contain"
            loading="lazy"
          />
        </div>
      )}

      {/* Description / Markdown */}
      <div className="prose prose-invert max-w-none text-xs
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-4 first:prose-headings:mt-0
        prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground
      ">
        <ReactMarkdown>{descriptionMarkdown}</ReactMarkdown>
      </div>

      {showParams && (
        hasParams ? (
          <div className="space-y-4">
            {renderParamList("Inputs", params?.inputs)}
            {renderParamList("Properties", params?.properties)}
            {renderParamList("Outputs", params?.outputs)}
            {params?.notes && params.notes.length > 0 && (
              <div className="rounded-lg border border-white/10 p-2 text-[11px] text-muted-foreground">
                {params.notes.map((note) => (
                  <div key={note}>• {note}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
            No parameters listed
          </div>
        )
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
         {tags.length > 0 ? (
           tags.map(tag => (
             <Badge key={tag} variant="outline" className="gap-1 px-2 py-0 text-[10px] text-muted-foreground hover:bg-muted transition-colors">
               <Tag className="size-2.5" />
               {tag}
             </Badge>
           ))
         ) : (
           <span className="text-[10px] italic text-muted-foreground opacity-50 px-2">No tags available</span>
         )}
       </div>
     </div>
   );
 }
