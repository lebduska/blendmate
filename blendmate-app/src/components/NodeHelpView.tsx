import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { KBNodeEntry } from "../types/kb";
import { loadNodeHelp } from "../services/kbLoader";
import ImagePlaceholder from "./ui/ImagePlaceholder";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Info, Tag } from "lucide-react";

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
  const previewUrl = (entry as any)?.previewUrl ?? (entry.meta as any)?.previewUrl ?? null;

  return (
    <div className="space-y-6 mono-panel">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
           <div className="space-y-1">
             <h2 className="text-lg font-medium tracking-tight text-foreground mono-heading">
               {entry.meta?.name ?? nodeId}
             </h2>
             <Badge variant="secondary" className="font-semibold text-[10px] uppercase tracking-wider">
               {entry.meta?.category ?? 'Node'}
             </Badge>
           </div>
           <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
             {entry.meta?.node_id || nodeId}
           </div>
        </div>
      </div>

      {/* Description / Markdown */}
      <div className="prose prose-invert max-w-none text-xs
        prose-headings:text-primary prose-headings:font-bold prose-headings:mt-4 first:prose-headings:mt-0
        prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground
      ">
        <ReactMarkdown>{descriptionMarkdown}</ReactMarkdown>
      </div>

      {/* Visual Preview */}
      <div className="relative rounded-xl border overflow-hidden group aspect-video bg-muted/50">
        {previewUrl ? (
          <img src={previewUrl} alt={`${entry.meta?.name || 'Node'} preview`} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
            <ImagePlaceholder />
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Info className="size-3" />
              Preview Image Coming Soon
            </div>
          </div>
        )}
      </div>

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
