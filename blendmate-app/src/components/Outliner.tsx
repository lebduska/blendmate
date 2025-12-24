import { useState, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Folder, File, Box, Layers, Video, Lightbulb, Palette, Link as LinkIcon, Scissors, Hash } from "lucide-react";

type NodeItem = {
  id: string;
  label: string;
  children?: NodeItem[];
  icon?: React.ReactNode;
};

const SAMPLE_TREE: NodeItem[] = [
  {
    id: 'scene',
    label: 'Scene Collection',
    icon: <Folder className="size-3.5 text-blue-400" />,
    children: [
      {
        id: 'geometry',
        label: 'Geometry',
        icon: <Layers className="size-3.5 text-green-400" />,
        children: [
          { id: 'GeometryNodeCombineXYZ', label: 'Combine XYZ', icon: <LinkIcon className="size-3.5 text-orange-400" /> },
          { id: 'GeometryNodeInstanceOnPoints', label: 'Instance on Points', icon: <Box className="size-3.5 text-orange-400" /> },
          { id: 'GeometryNodeSeparateXYZ', label: 'Separate XYZ', icon: <Scissors className="size-3.5 text-orange-400" /> },
        ],
      },
      {
        id: 'materials',
        label: 'Materials',
        icon: <Palette className="size-3.5 text-pink-400" />,
        children: [
          { id: 'mat_default', label: 'Default', icon: <Hash className="size-3.5 text-muted-foreground" /> },
        ],
      },
    ],
  },
  { id: 'cameras', label: 'Cameras', icon: <Video className="size-3.5 text-purple-400" /> },
  { id: 'lights', label: 'Lights', icon: <Lightbulb className="size-3.5 text-yellow-400" /> },
];

export default function Outliner({
  currentNodeId,
  setCurrentNodeId,
}: {
  currentNodeId: string;
  setCurrentNodeId: (id: string) => void;
}) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    // expand top-level groups by default
    const map: Record<string, boolean> = {};
    SAMPLE_TREE.forEach((n) => (map[n.id] = true));
    return map;
  });

  const toggle = useCallback((id: string) => {
    setExpandedMap((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const onSelect = useCallback(
    (id: string) => {
      setCurrentNodeId(id);
    },
    [setCurrentNodeId]
  );

  const renderNode = (node: NodeItem, depth = 0) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const expanded = !!expandedMap[node.id];
    const selected = currentNodeId === node.id;

    return (
      <div key={node.id}>
        <button
          onClick={() => (hasChildren ? toggle(node.id) : onSelect(node.id))}
          onDoubleClick={() => onSelect(node.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(node.id);
            } else if (e.key === 'ArrowRight' && hasChildren) {
              e.preventDefault();
              setExpandedMap((p) => ({ ...p, [node.id]: true }));
            } else if (e.key === 'ArrowLeft' && hasChildren) {
              e.preventDefault();
              setExpandedMap((p) => ({ ...p, [node.id]: false }));
            }
          }}
          className={cn(
            "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md transition-all group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
            selected ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: 4 + depth * 12 }}
        >
          {/* caret */}
          <div className="size-4 flex items-center justify-center">
            {hasChildren && (
              expanded ? <ChevronDown className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
            )}
          </div>

          {/* icon */}
          <div className="shrink-0 flex items-center justify-center size-4 opacity-80 group-hover:opacity-100 transition-opacity">
            {node.icon || <File className="size-3" />}
          </div>

          {/* label */}
          <span className="truncate text-xs font-medium">
            {node.label}
          </span>
        </button>

        {hasChildren && expanded && (
          <div className="mt-0.5 ml-1.5 border-l border-muted/30">
            {node.children!.map((c) => (
              <div key={c.id}>{renderNode(c, depth + 1)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {SAMPLE_TREE.map((n) => renderNode(n, 0))}
    </div>
  );
}
