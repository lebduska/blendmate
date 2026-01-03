import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Move, RotateCcw, Maximize2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, Input } from "@/components/ui";
import { useBlenderCommand } from "@/hooks";
import type { BlenderSceneData, BlenderCollection, BlenderObject } from "@/stores/blenderStore";
import { BlenderObjectIcon } from '@/domain/blender';
import {
  ObjectData,
  OutlinerCollection,
  HideOff,
  HideOn,
  RestrictRenderOff,
  RestrictRenderOn,
} from '@/components/icons/blender';

type CollectionTooltipData = Omit<BlenderCollection, 'children'>;

type TreeNode = {
  id: string;
  label: string;
  type: 'collection' | 'object';
  objectType?: string;
  visible?: boolean;
  selected?: boolean;
  hasGN?: boolean;
  parentId?: string | null;
  children?: TreeNode[];
  // Raw data for tooltip
  rawData: BlenderObject | CollectionTooltipData;
};

function TooltipSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="text-[9px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--islands-color-text-secondary)' }}>
        {title}
      </div>
      <div className="text-[10px]">{children}</div>
    </div>
  );
}

function TooltipRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: 'var(--islands-color-text-secondary)' }}>{label}</span>
      <span className="font-mono" style={{ color: color || 'var(--islands-color-text-primary)' }}>{value}</span>
    </div>
  );
}

function Vec3({ v, precision = 2 }: { v: number[]; precision?: number }) {
  if (!v || v.length < 3) return <span>-</span>;
  return (
    <span className="font-mono">
      <span style={{ color: 'var(--islands-color-error)' }}>{v[0].toFixed(precision)}</span>
      {' '}
      <span style={{ color: 'var(--islands-color-success)' }}>{v[1].toFixed(precision)}</span>
      {' '}
      <span style={{ color: 'var(--islands-color-info)' }}>{v[2].toFixed(precision)}</span>
    </span>
  );
}


function TransformRow({ icon, value }: { icon: React.ReactNode; value: number[] }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--islands-color-text-secondary)' }}>{icon}</span>
      <Vec3 v={value} />
    </div>
  );
}

function ObjectTooltip({ obj }: { obj: BlenderObject }) {
  return (
    <div className="max-w-xs">
      <TooltipSection title="Transform">
        <TransformRow icon={<Move className="size-3" />} value={obj.location} />
        <TransformRow icon={<RotateCcw className="size-3" />} value={obj.rotation_euler} />
        <TransformRow icon={<Maximize2 className="size-3" />} value={obj.scale} />
      </TooltipSection>

      {obj.mesh && (
        <TooltipSection title="Mesh">
          <TooltipRow label="Verts" value={obj.mesh.vertices.toLocaleString()} color="var(--islands-color-info)" />
          <TooltipRow label="Faces" value={obj.mesh.polygons.toLocaleString()} color="var(--islands-color-info)" />
        </TooltipSection>
      )}

      {obj.light && (
        <TooltipSection title="Light">
          <TooltipRow label="Type" value={obj.light.type} />
          <TooltipRow label="Energy" value={obj.light.energy.toFixed(1)} color="var(--islands-color-warning)" />
        </TooltipSection>
      )}

      {obj.camera && (
        <TooltipSection title="Camera">
          <TooltipRow label="Type" value={obj.camera.type} />
          {obj.camera.lens && <TooltipRow label="Lens" value={`${obj.camera.lens.toFixed(0)}mm`} />}
        </TooltipSection>
      )}

      {obj.modifiers.length > 0 && (
        <TooltipSection title={`Modifiers (${obj.modifiers.length})`}>
          {obj.modifiers.slice(0, 3).map((m, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className={m.show_viewport ? '' : 'opacity-40'}>{m.name}</span>
              {m.type === 'NODES' && <span className="size-1.5 rounded-full bg-green-500" />}
            </div>
          ))}
          {obj.modifiers.length > 3 && (
            <span className="opacity-50">+{obj.modifiers.length - 3} more</span>
          )}
        </TooltipSection>
      )}

      {obj.materials.length > 0 && (
        <TooltipSection title={`Materials (${obj.materials.length})`}>
          {obj.materials.slice(0, 2).map((m, i) => (
            <div key={i} className="opacity-80">{m || '(empty)'}</div>
          ))}
          {obj.materials.length > 2 && (
            <span className="opacity-50">+{obj.materials.length - 2} more</span>
          )}
        </TooltipSection>
      )}
    </div>
  );
}

function CollectionTooltip({ col }: { col: CollectionTooltipData }) {
  return (
    <div className="max-w-xs">
      <TooltipSection title="Contents">
        <TooltipRow label="Objects" value={col.object_count} color="var(--islands-color-info)" />
        <TooltipRow label="Children" value={col.children_count} color="var(--islands-color-info)" />
      </TooltipSection>

      {col.objects.length > 0 && (
        <TooltipSection title="Objects">
          {col.objects.slice(0, 4).map((name, i) => (
            <div key={i} className="opacity-80">{name}</div>
          ))}
          {col.objects.length > 4 && (
            <span className="opacity-50">+{col.objects.length - 4} more</span>
          )}
        </TooltipSection>
      )}

      {col.color_tag && col.color_tag !== 'NONE' && (
        <TooltipSection title="Tag">
          <span>{col.color_tag}</span>
        </TooltipSection>
      )}
    </div>
  );
}

// Build object node with its children recursively
function buildObjectNode(
  objectName: string,
  objects: Record<string, BlenderObject>,
  selectedObjects: string[],
  collectionObjects: Set<string>,
  parentId: string | null
): TreeNode {
  const obj = objects[objectName];

  // Find children that are also in this collection
  const childNodes: TreeNode[] = [];
  for (const childName of obj.children) {
    if (collectionObjects.has(childName)) {
      childNodes.push(buildObjectNode(childName, objects, selectedObjects, collectionObjects, `obj_${objectName}`));
    }
  }

  return {
    id: `obj_${objectName}`,
    label: objectName,
    type: 'object',
    objectType: obj.type,
    visible: obj.visible,
    selected: selectedObjects.includes(objectName),
    hasGN: obj.has_gn,
    parentId,
    children: childNodes.length > 0 ? childNodes : undefined,
    rawData: obj,
  };
}

function buildTree(
  collection: BlenderCollection,
  objects: Record<string, BlenderObject>,
  selectedObjects: string[],
  parentId: string | null = null
): TreeNode {
  const childNodes: TreeNode[] = [];

  // Add child collections first
  for (const childCollection of collection.children) {
    childNodes.push(buildTree(childCollection, objects, selectedObjects, `col_${collection.name}`));
  }

  // Create set of objects in this collection for quick lookup
  const collectionObjectsSet = new Set(collection.objects);

  // Add only root objects (those without a parent in this collection)
  for (const objectName of collection.objects) {
    const obj = objects[objectName];
    if (obj) {
      // Skip if this object's parent is also in this collection (it will be added as a child)
      const parentInCollection = obj.parent && collectionObjectsSet.has(obj.parent);
      if (!parentInCollection) {
        childNodes.push(buildObjectNode(objectName, objects, selectedObjects, collectionObjectsSet, `col_${collection.name}`));
      }
    }
  }

  // Create a copy without recursive children to avoid circular reference in tooltip
  const { children: _children, ...collectionDataWithoutChildren } = collection;

  return {
    id: `col_${collection.name}`,
    label: collection.name,
    type: 'collection',
    parentId,
    children: childNodes.length > 0 ? childNodes : undefined,
    rawData: collectionDataWithoutChildren,
  };
}

export default function ScenePanel({
  sceneData,
  selectedId,
  setSelectedId,
  observeOutgoing = true,
}: {
  sceneData: BlenderSceneData | null;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  observeOutgoing?: boolean;
}) {
  const { t } = useTranslation();
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Blender commands
  const { renameObject, setProperty } = useBlenderCommand();

  // Toggle visibility handlers
  const toggleViewportVisibility = useCallback(async (e: React.MouseEvent, objectName: string, currentHidden: boolean) => {
    e.stopPropagation();
    if (!observeOutgoing) return;

    const result = await setProperty(
      `objects['${objectName}']`,
      'hide_viewport',
      !currentHidden
    );

    if (result.success) {
      console.log(`[ScenePanel] Toggled viewport visibility for "${objectName}": ${!currentHidden}`);
    } else {
      console.error(`[ScenePanel] Toggle visibility failed: ${result.error}`);
    }
  }, [observeOutgoing, setProperty]);

  const toggleRenderVisibility = useCallback(async (e: React.MouseEvent, objectName: string, currentHidden: boolean) => {
    e.stopPropagation();
    if (!observeOutgoing) return;

    const result = await setProperty(
      `objects['${objectName}']`,
      'hide_render',
      !currentHidden
    );

    if (result.success) {
      console.log(`[ScenePanel] Toggled render visibility for "${objectName}": ${!currentHidden}`);
    } else {
      console.error(`[ScenePanel] Toggle render visibility failed: ${result.error}`);
    }
  }, [observeOutgoing, setProperty]);

  // Build tree from scene data
  const tree = useMemo<TreeNode[]>(() => {
    if (!sceneData) {
      return [];
    }
    const rootNode = buildTree(
      sceneData.collections,
      sceneData.objects,
      sceneData.selected_objects
    );
    return [rootNode];
  }, [sceneData]);

  // Auto-expand root collection when scene data changes
  useEffect(() => {
    if (sceneData?.collections) {
      setExpandedMap((prev) => ({
        ...prev,
        [`col_${sceneData.collections.name}`]: true,
      }));
    }
  }, [sceneData?.collections?.name]);

  // Expand parents when selection changes
  useEffect(() => {
    if (!selectedId || tree.length === 0) return;
    const parentMap = new Map<string, string | null>();

    const walk = (node: TreeNode) => {
      parentMap.set(node.id, node.parentId ?? null);
      node.children?.forEach(walk);
    };
    tree.forEach(walk);

    const expandedUpdates: Record<string, boolean> = {};
    let current = parentMap.get(selectedId);
    while (current) {
      expandedUpdates[current] = true;
      current = parentMap.get(current) ?? null;
    }

    if (Object.keys(expandedUpdates).length > 0) {
      setExpandedMap((prev) => ({ ...prev, ...expandedUpdates }));
    }
  }, [selectedId, tree]);

  const toggle = useCallback((id: string) => {
    setExpandedMap((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const onSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
    },
    [setSelectedId]
  );

  // Start inline editing
  const startEditing = useCallback((id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  // Commit the edit
  const commitEdit = useCallback(async (nodeId: string, originalLabel: string) => {
    const newName = editValue.trim();

    // Cancel if empty or unchanged
    if (!newName || newName === originalLabel) {
      cancelEditing();
      return;
    }

    // Only send to Blender if outgoing is enabled
    if (observeOutgoing && nodeId.startsWith('obj_')) {
      const objectName = nodeId.slice(4); // Remove 'obj_' prefix
      const result = await renameObject(objectName, newName);

      if (result.success) {
        console.log(`[ScenePanel] Renamed "${objectName}" to "${result.data?.name}"`);
        // Selection will update when scene refreshes
      } else {
        console.error(`[ScenePanel] Rename failed: ${result.error}`);
        // Could show a toast here
      }
    }

    cancelEditing();
  }, [editValue, observeOutgoing, renameObject, cancelEditing]);

  // Handle keyboard in edit mode
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent, nodeId: string, originalLabel: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(nodeId, originalLabel);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  }, [commitEdit, cancelEditing]);

  const renderNode = (node: TreeNode, depth = 0) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const expanded = !!expandedMap[node.id];
    const selected = selectedId === node.id;
    const isBlenderSelected = node.selected;
    const isEditing = editingId === node.id;
    const canEdit = node.type === 'object'; // Only objects can be renamed

    const ObjectIcon = node.type === 'object' ? BlenderObjectIcon(node.objectType || '') : null;
    const icon = node.type === 'collection'
      ? <OutlinerCollection size={14} className="text-muted-foreground" />
      : ObjectIcon ? <ObjectIcon size={14} className="text-muted-foreground" /> : <ObjectData size={14} className="text-muted-foreground" />;

    // Handle double-click on label to start editing
    const handleLabelDoubleClick = (e: React.MouseEvent) => {
      if (canEdit) {
        e.stopPropagation();
        startEditing(node.id, node.label);
      }
    };

    return (
      <div key={node.id}>
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              onClick={() => (hasChildren ? toggle(node.id) : onSelect(node.id))}
              onDoubleClick={() => !isEditing && onSelect(node.id)}
              onKeyDown={(e) => e.key === 'Enter' && (hasChildren ? toggle(node.id) : onSelect(node.id))}
              className={cn(
                "w-full text-left flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm transition-colors group focus-visible:outline-none cursor-pointer border-l-2",
                selected
                  ? "bg-[var(--islands-color-background-elevated)] text-[var(--islands-color-text-primary)] border-l-[var(--blender-orange)]"
                  : isBlenderSelected
                    ? "bg-[var(--islands-color-background-secondary)] text-[var(--islands-color-text-primary)] border-l-[var(--islands-color-text-tertiary)]"
                    : "hover:bg-[var(--islands-color-background-secondary)] text-[var(--islands-color-text-secondary)] hover:text-[var(--islands-color-text-primary)] border-l-transparent"
              )}
              style={{ paddingLeft: 4 + depth * 12 }}
            >
              {/* caret */}
              <div className="size-4 flex items-center justify-center">
                {hasChildren && (
                  expanded
                    ? <ChevronDown className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    : <ChevronRight className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                )}
              </div>

              {/* icon */}
              <div className="shrink-0 flex items-center justify-center size-4 opacity-80 group-hover:opacity-100 transition-opacity">
                {icon}
              </div>

              {/* label or input */}
              {isEditing ? (
                <Input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(node.id, node.label)}
                  onKeyDown={(e) => handleEditKeyDown(e, node.id, node.label)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 px-1 py-0 text-xs font-medium flex-1 min-w-0 bg-background text-foreground border-primary"
                  autoFocus
                />
              ) : (
                <span
                  className="truncate text-xs font-medium flex-1"
                  onDoubleClick={handleLabelDoubleClick}
                >
                  {node.label}
                </span>
              )}

              {/* visibility toggles for objects */}
              {node.type === 'object' && !isEditing && (
                <div className="shrink-0 flex items-center gap-0.5">
                  <button
                    onClick={(e) => toggleViewportVisibility(e, node.label, (node.rawData as BlenderObject).hide_viewport)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      observeOutgoing ? "hover:bg-white/10 cursor-pointer" : "cursor-default opacity-60"
                    )}
                    title={observeOutgoing ? "Toggle viewport visibility" : "Enable outgoing to toggle"}
                  >
                    {(node.rawData as BlenderObject).hide_viewport ? (
                      <HideOn size={12} style={{ color: 'var(--islands-color-error)' }} />
                    ) : (
                      <HideOff size={12} style={{ color: 'var(--islands-color-success)' }} />
                    )}
                  </button>
                  <button
                    onClick={(e) => toggleRenderVisibility(e, node.label, (node.rawData as BlenderObject).hide_render)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      observeOutgoing ? "hover:bg-white/10 cursor-pointer" : "cursor-default opacity-60"
                    )}
                    title={observeOutgoing ? "Toggle render visibility" : "Enable outgoing to toggle"}
                  >
                    {(node.rawData as BlenderObject).hide_render ? (
                      <RestrictRenderOn size={12} style={{ color: 'var(--islands-color-error)' }} />
                    ) : (
                      <RestrictRenderOff size={12} style={{ color: 'var(--islands-color-success)' }} />
                    )}
                  </button>
                </div>
              )}

              {/* GN indicator */}
              {node.hasGN && !isEditing && (
                <div className="shrink-0 size-1.5 rounded-full bg-green-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="p-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b" style={{ borderColor: 'var(--islands-color-border-subtle)' }}>
                {icon}
                <span className="font-semibold text-xs">{node.label}</span>
                <span className="text-[10px] opacity-60">
                  {node.type === 'collection' ? 'Collection' : node.objectType}
                </span>
              </div>
              {node.type === 'object' ? (
                <ObjectTooltip obj={node.rawData as BlenderObject} />
              ) : (
                <CollectionTooltip col={node.rawData as CollectionTooltipData} />
              )}
            </div>
          </TooltipContent>
        </Tooltip>

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

  if (!sceneData) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">
        <span>{t('connection.waitingForBlender')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((n) => renderNode(n, 0))}
    </div>
  );
}
