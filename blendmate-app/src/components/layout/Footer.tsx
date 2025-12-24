import { Activity } from "lucide-react";

interface FooterProps {
  lastMessage: any;
  sendJson: (json: any) => void;
}

export default function Footer({ lastMessage, sendJson }: FooterProps) {
  return (
    <footer
      data-tauri-drag-region
      className="p-3 bg-muted/20 border-t backdrop-blur-2xl cursor-default"
    >
      <div className="font-mono text-[9px] text-muted-foreground flex justify-between items-center gap-4">
        <div className="truncate bg-muted/50 px-2 py-1 rounded border flex-1">
          {lastMessage ? (
             <span className="flex gap-2">
               <span className="text-primary font-bold">[RECV]</span>
               <span className="truncate opacity-70">{JSON.stringify(lastMessage)}</span>
             </span>
          ) : (
            <span className="opacity-40 italic animate-pulse">Awaiting Blender signal...</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
            <Activity className="size-3" />
            <span>60 FPS</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="uppercase tracking-widest opacity-50 text-[8px]">Stream</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
