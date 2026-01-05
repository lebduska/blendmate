/**
 * InfluenceInspector - Pipeline view showing influences affecting the object
 *
 * Philosophy (from blendmate-identity.md):
 * - "Forenzní zpráva, ne ovládací panel" - reveals reality, doesn't change it
 * - Answers: What is it? How was it created? What state is it in?
 * - Uses Blender iconography for continuity
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlenderStore, type BlenderObject } from '@/stores/blenderStore';
import { BlenderObjectIcon, BlenderModifierIcon } from '@/domain/blender';
import { CircleDot, ChevronDown, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, EmptyState } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

type PipelineStage = {
  id: string;
  type: 'source' | 'modifier' | 'material';
  name: string;
  subtype?: string;
  enabled: boolean;
  hint?: string;
};

// ============================================================================
// Helpers
// ============================================================================

function buildPipelineStages(obj: BlenderObject, t: (key: string) => string): PipelineStage[] {
  const stages: PipelineStage[] = [];

  // 1. Source - the base data
  stages.push({
    id: 'source',
    type: 'source',
    name: obj.data_name || obj.name,
    subtype: obj.type,
    enabled: true,
  });

  // 2. Modifiers - in stack order
  obj.modifiers.forEach((mod, index) => {
    const hintKey = `modifiers.types.${mod.type}`;
    const hint = t(hintKey);
    stages.push({
      id: `mod_${index}_${mod.name}`,
      type: 'modifier',
      name: mod.name,
      subtype: mod.type,
      enabled: mod.show_viewport,
      hint: hint !== hintKey ? hint : undefined,
    });
  });

  // 3. Materials - output stage
  const materials = obj.materials.filter((m): m is string => m !== null);
  if (materials.length > 0) {
    materials.forEach((mat, index) => {
      stages.push({
        id: `mat_${index}_${mat}`,
        type: 'material',
        name: mat,
        enabled: true,
      });
    });
  }

  return stages;
}

function buildStorySummary(obj: BlenderObject, t: (key: string) => string): string {
  const parts: string[] = [];

  // Object type - small caps style (uppercase)
  const typeKey = `object.types.${obj.type}`;
  const typeName = t(typeKey) !== typeKey ? t(typeKey).toUpperCase() : obj.type;
  parts.push(typeName);

  // Active modifiers summary
  const activeModifiers = obj.modifiers.filter(m => m.show_viewport);
  if (activeModifiers.length > 0) {
    const modNames = activeModifiers.slice(0, 3).map(m => m.name.toLowerCase());
    if (activeModifiers.length > 3) {
      modNames.push(`+${activeModifiers.length - 3}`);
    }
    parts.push(modNames.join(' → '));
  }

  // Materials
  const materials = obj.materials.filter((m): m is string => m !== null);
  if (materials.length === 1) {
    parts.push(materials[0].toLowerCase());
  } else if (materials.length > 1) {
    parts.push(`${materials.length} materials`);
  }

  return parts.join(' • ');
}

function formatGeometryStats(obj: BlenderObject): string | null {
  if (obj.mesh) {
    const v = obj.mesh.vertices ?? 0;
    const e = obj.mesh.edges ?? 0;
    const f = obj.mesh.polygons ?? 0;
    return `${v.toLocaleString()} verts • ${e.toLocaleString()} edges • ${f.toLocaleString()} faces`;
  }
  if (obj.geometry) {
    const v = obj.geometry.vertex_count ?? 0;
    const e = obj.geometry.edge_count ?? 0;
    return `${v.toLocaleString()} verts • ${e.toLocaleString()} edges`;
  }
  if (obj.curve) {
    return `${obj.curve.splines ?? 0} splines • res ${obj.curve.resolution_u ?? 0}`;
  }
  return null;
}

// ============================================================================
// Sub-components
// ============================================================================

interface PipelineNodeProps {
  stage: PipelineStage;
  isFirst: boolean;
}

function PipelineNode({ stage, isFirst }: PipelineNodeProps) {
  const Icon = stage.type === 'source'
    ? BlenderObjectIcon(stage.subtype || 'MESH')
    : stage.type === 'material'
      ? () => <Palette size={14} />
      : BlenderModifierIcon(stage.subtype || 'NODES');

  const nodeContent = (
    <div
      className={cn(
        "relative flex items-center gap-2.5 px-3 py-2 rounded transition-colors",
        !stage.enabled && "opacity-40"
      )}
      style={{
        background: stage.enabled
          ? 'var(--islands-color-background-secondary)'
          : 'var(--islands-color-background-tertiary)',
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "size-6 rounded flex items-center justify-center shrink-0",
          stage.type === 'source' && "bg-[var(--blender-orange-dark)]",
          stage.type === 'modifier' && (stage.enabled ? "bg-blue-600" : "bg-gray-600"),
          stage.type === 'material' && "bg-purple-600",
        )}
      >
        <Icon size={14} className="text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium truncate"
          style={{ color: stage.enabled ? 'var(--islands-color-text-primary)' : 'var(--islands-color-text-tertiary)' }}
        >
          {stage.name}
        </p>
        {/* Show hint directly if available, otherwise show subtype */}
        {stage.hint ? (
          <p
            className="text-[10px] leading-tight"
            style={{ color: 'var(--islands-color-text-secondary)' }}
          >
            {stage.hint}
          </p>
        ) : stage.subtype && stage.type !== 'material' ? (
          <p
            className="text-[10px] truncate uppercase tracking-wide"
            style={{ color: 'var(--islands-color-text-tertiary)' }}
          >
            {stage.subtype}
          </p>
        ) : null}
      </div>

      {/* Status indicator for modifiers */}
      {stage.type === 'modifier' && (
        <div
          className={cn(
            "size-1.5 rounded-full shrink-0",
            stage.enabled ? "bg-green-500" : "bg-red-500/50"
          )}
        />
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Connector line from previous */}
      {!isFirst && (
        <div className="flex justify-center py-1">
          <ChevronDown
            size={12}
            style={{ color: 'var(--islands-color-text-tertiary)' }}
          />
        </div>
      )}

      {nodeContent}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface InfluenceInspectorProps {
  className?: string;
  selectedObjectName?: string | null;
}

export default function InfluenceInspector({ className, selectedObjectName }: InfluenceInspectorProps) {
  const { t } = useTranslation();
  const sceneData = useBlenderStore((s) => s.sceneData);

  // Use selectedObjectName if provided, otherwise fall back to Blender's active_object
  const activeObject = useMemo<BlenderObject | null>(() => {
    if (!sceneData?.objects) return null;
    const objectName = selectedObjectName ?? sceneData.active_object;
    if (!objectName) return null;
    return sceneData.objects[objectName] ?? null;
  }, [sceneData, selectedObjectName]);

  const pipelineStages = useMemo(() => {
    if (!activeObject) return [];
    return buildPipelineStages(activeObject, t);
  }, [activeObject, t]);

  const storySummary = useMemo(() => {
    if (!activeObject) return '';
    return buildStorySummary(activeObject, t);
  }, [activeObject, t]);

  const geometryStats = useMemo(() => {
    if (!activeObject) return null;
    return formatGeometryStats(activeObject);
  }, [activeObject]);

  if (!activeObject) {
    return (
      <EmptyState
        icon={<CircleDot className="size-6" />}
        title={t('influence.noObject')}
        description={t('influence.selectObject')}
        className={className}
      />
    );
  }

  const ObjectIcon = BlenderObjectIcon(activeObject.type);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-3 space-y-4">
        {/* Header with object info */}
        <div
          className="pb-3 border-b"
          style={{ borderColor: 'var(--islands-color-border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="size-9 rounded flex items-center justify-center shrink-0"
              style={{ background: 'var(--blender-orange-dark)' }}
            >
              <ObjectIcon size={18} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--islands-color-text-primary)' }}
              >
                {activeObject.name}
              </p>
              {/* Story summary - forensic sentence */}
              <p
                className="text-[11px] truncate"
                style={{ color: 'var(--islands-color-text-secondary)' }}
              >
                {storySummary}
              </p>
            </div>
          </div>

          {/* Geometry stats - inherent info */}
          {geometryStats && (
            <div
              className="mt-2 px-2 py-1.5 rounded text-[10px] font-mono"
              style={{
                background: 'var(--islands-color-background-tertiary)',
                color: 'var(--islands-color-text-tertiary)',
              }}
            >
              {geometryStats}
            </div>
          )}
        </div>

        {/* Pipeline flow */}
        <div>
          <p
            className="text-[10px] uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--islands-color-text-tertiary)' }}
          >
            {t('influence.pipeline')}
          </p>
          <div className="space-y-0">
            {pipelineStages.map((stage, index) => (
              <PipelineNode
                key={stage.id}
                stage={stage}
                isFirst={index === 0}
              />
            ))}
          </div>

          {/* Empty state for no modifiers/materials */}
          {pipelineStages.length === 1 && (
            <p
              className="text-[11px] text-center py-3 italic"
              style={{ color: 'var(--islands-color-text-tertiary)' }}
            >
              {t('influence.noModifiers')}
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
