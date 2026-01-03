/**
 * InfluenceInspector - Shows all influences affecting the active object
 * Categories: Source, Transform, Geometry, Generate, Deform, Procedural, Shading
 */

import { useMemo } from 'react';
import { useBlenderStore, type BlenderObject } from '@/stores/blenderStore';
import { useBlenderCommand } from '@/hooks/useBlenderCommand';
import { getModifierCategory, BlenderObjectIcon, BlenderCategoryIcon } from '@/domain/blender';
import { CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, GroupCard, ItemRow, EmptyState, ObjectHeader } from '@/components/ui';

const ALL_CATEGORIES = ['source', 'transform', 'geometry', 'generate', 'deform', 'procedural', 'shading'] as const;

type InfluenceCategory = typeof ALL_CATEGORIES[number];

const CATEGORY_LABELS: Record<InfluenceCategory, string> = {
  source: 'Source',
  transform: 'Transform',
  geometry: 'Geometry',
  generate: 'Generate',
  deform: 'Deform',
  procedural: 'Procedural',
  shading: 'Shading',
};

// ============================================================================
// Types
// ============================================================================

type InfluenceItem = {
  id: string;
  name: string;
  value?: string;
  type?: string;
  enabled: boolean;
  implicit?: boolean;
  onClick?: () => void;
};

type InfluenceGroup = {
  category: InfluenceCategory;
  items: InfluenceItem[];
};

// ============================================================================
// Helpers
// ============================================================================

const formatVector = (vec: number[]): string =>
  vec.map(v => v.toFixed(2)).join(' / ');

// ============================================================================
// Data builders
// ============================================================================

function buildSourceItems(obj: BlenderObject): InfluenceItem[] {
  return [{
    id: 'source_data',
    name: obj.data_name || obj.name,
    type: obj.type,
    enabled: true,
  }];
}

function buildTransformItems(obj: BlenderObject): InfluenceItem[] {
  return [
    { id: 'loc', name: 'Location', value: formatVector(obj.location), enabled: true, implicit: true },
    { id: 'rot', name: 'Rotation', value: formatVector(obj.rotation_euler.map(r => r * 180 / Math.PI)), enabled: true, implicit: true },
    { id: 'scale', name: 'Scale', value: formatVector(obj.scale), enabled: true, implicit: true },
  ];
}

function buildGeometryItems(obj: BlenderObject): InfluenceItem[] {
  if (obj.mesh) {
    return [
      { id: 'verts', name: 'Vertices', value: obj.mesh.vertices.toLocaleString(), enabled: true, implicit: true },
      { id: 'edges', name: 'Edges', value: obj.mesh.edges.toLocaleString(), enabled: true, implicit: true },
      { id: 'faces', name: 'Faces', value: obj.mesh.polygons.toLocaleString(), enabled: true, implicit: true },
    ];
  }
  if (obj.geometry) {
    return [
      { id: 'verts', name: 'Vertices', value: obj.geometry.vertex_count.toLocaleString(), enabled: true, implicit: true },
      { id: 'edges', name: 'Edges', value: obj.geometry.edge_count.toLocaleString(), enabled: true, implicit: true },
    ];
  }
  if (obj.curve) {
    return [
      { id: 'splines', name: 'Splines', value: obj.curve.splines.toLocaleString(), enabled: true, implicit: true },
      { id: 'res', name: 'Resolution', value: obj.curve.resolution_u.toString(), enabled: true, implicit: true },
    ];
  }
  return [];
}

function buildModifierItems(
  obj: BlenderObject,
  category: InfluenceCategory,
  onSelect: () => void
): InfluenceItem[] {
  return obj.modifiers
    .filter(mod => getModifierCategory(mod.type) === category)
    .map(mod => ({
      id: `mod_${mod.name}`,
      name: mod.name,
      type: mod.type,
      enabled: mod.show_viewport,
      onClick: onSelect,
    }));
}

function buildShadingItems(obj: BlenderObject): InfluenceItem[] {
  return obj.materials
    .filter((m): m is string => m !== null)
    .map(mat => ({
      id: `mat_${mat}`,
      name: mat,
      type: 'MATERIAL',
      enabled: true,
    }));
}

// ============================================================================
// Component
// ============================================================================

interface InfluenceInspectorProps {
  className?: string;
}

export default function InfluenceInspector({ className }: InfluenceInspectorProps) {
  const sceneData = useBlenderStore((s) => s.sceneData);
  const { selectObject } = useBlenderCommand();

  const activeObject = useMemo<BlenderObject | null>(() => {
    if (!sceneData?.active_object || !sceneData.objects) return null;
    return sceneData.objects[sceneData.active_object] ?? null;
  }, [sceneData]);

  const groups = useMemo<InfluenceGroup[]>(() => {
    if (!activeObject) return [];

    const onSelect = () => selectObject(activeObject.name, 'set');

    return ALL_CATEGORIES.map(category => ({
      category,
      items: category === 'source' ? buildSourceItems(activeObject)
        : category === 'transform' ? buildTransformItems(activeObject)
        : category === 'geometry' ? buildGeometryItems(activeObject)
        : category === 'shading' ? buildShadingItems(activeObject)
        : buildModifierItems(activeObject, category, onSelect),
    }));
  }, [activeObject, selectObject]);

  if (!activeObject) {
    return (
      <EmptyState
        icon={<CircleDot className="size-6" />}
        title="No Active Object"
        description="Select an object in Blender to see its influences"
        className={className}
      />
    );
  }

  const ObjectIcon = BlenderObjectIcon(activeObject.type);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-3 space-y-2">
        <ObjectHeader
          icon={<ObjectIcon size={16} />}
          name={activeObject.name}
          type={activeObject.type}
        />

        <div className="space-y-1.5">
          {groups.map(({ category, items }) => {
            const CategoryIcon = BlenderCategoryIcon(category);
            return (
              <GroupCard
                key={category}
                icon={<CategoryIcon size={14} />}
                label={CATEGORY_LABELS[category]}
                count={items.length}
                isEmpty={items.length === 0}
              >
                {items.map(item => (
                  <ItemRow
                    key={item.id}
                    name={item.name}
                    value={item.value}
                    type={category !== 'source' ? item.type : undefined}
                    enabled={item.enabled}
                    implicit={item.implicit}
                    showIndicator={!item.implicit}
                    onClick={item.onClick}
                  />
                ))}
              </GroupCard>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
