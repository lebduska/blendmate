import { useMemo } from 'react';
import { ScrollArea } from "@/components/ui";
import { useBlenderStore, BlenderObject, BlenderCollection } from "@/stores/blenderStore";
import { Box, Folder, Camera, Lightbulb, Speaker, Type, Spline, Circle, Sparkles, Grid3X3, Move, RotateCcw, Maximize2, RulerIcon, Eye, EyeOff, Video, VideoOff, MousePointer2, MousePointer2Off } from "lucide-react";

// Blender object types to icons
const OBJECT_TYPE_ICONS: Record<string, React.ReactNode> = {
  MESH: <Box className="size-4 text-orange-400" />,
  CAMERA: <Camera className="size-4 text-purple-400" />,
  LIGHT: <Lightbulb className="size-4 text-yellow-400" />,
  SPEAKER: <Speaker className="size-4 text-blue-400" />,
  FONT: <Type className="size-4 text-pink-400" />,
  CURVE: <Spline className="size-4 text-green-400" />,
  EMPTY: <Circle className="size-4 text-gray-400" />,
  ARMATURE: <Sparkles className="size-4 text-cyan-400" />,
  LATTICE: <Grid3X3 className="size-4 text-indigo-400" />,
};

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div
        className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 px-1"
        style={{ color: 'var(--islands-color-text-secondary)' }}
      >
        {title}
      </div>
      <div
        className="rounded-md p-2.5 pl-3 text-xs"
        style={{ background: 'var(--islands-color-background-secondary)' }}
      >
        {children}
      </div>
    </div>
  );
}

function PropertyRow({ label, value, color, icon }: { label: string; value: React.ReactNode; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-2 py-0.5">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: 'var(--islands-color-text-secondary)' }}>{icon}</span>}
        <span style={{ color: 'var(--islands-color-text-secondary)' }}>{label}</span>
      </div>
      <span
        className="text-right font-mono"
        style={{ color: color || 'var(--islands-color-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

function Vector3Display({ value, precision = 2 }: { value: number[]; precision?: number }) {
  if (!value || value.length < 3) return <span>-</span>;
  return (
    <span className="font-mono text-[10px]">
      <span style={{ color: 'var(--islands-color-error)' }}>{value[0].toFixed(precision)}</span>
      {' '}
      <span style={{ color: 'var(--islands-color-success)' }}>{value[1].toFixed(precision)}</span>
      {' '}
      <span style={{ color: 'var(--islands-color-info)' }}>{value[2].toFixed(precision)}</span>
    </span>
  );
}

function ObjectProperties({ obj }: { obj: BlenderObject }) {
  const icon = OBJECT_TYPE_ICONS[obj.type] || <Box className="size-4 text-muted-foreground" />;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b" style={{ borderColor: 'var(--islands-color-border-subtle)' }}>
        {icon}
        <span className="font-semibold">{obj.name}</span>
        <span className="text-[10px] opacity-60 ml-auto">{obj.type}</span>
      </div>

      {/* Transform */}
      <PropertySection title="Transform">
        <PropertyRow label="Location" value={<Vector3Display value={obj.location} />} icon={<Move className="size-3.5" />} />
        <PropertyRow label="Rotation" value={<Vector3Display value={obj.rotation_euler} />} icon={<RotateCcw className="size-3.5" />} />
        <PropertyRow label="Scale" value={<Vector3Display value={obj.scale} />} icon={<Maximize2 className="size-3.5" />} />
        <PropertyRow label="Dimensions" value={<Vector3Display value={obj.dimensions} />} icon={<RulerIcon className="size-3.5" />} />
      </PropertySection>

      {/* Visibility */}
      <PropertySection title="Visibility">
        <PropertyRow
          label="Viewport"
          value={obj.hide_viewport ? 'Hidden' : 'Visible'}
          color={obj.hide_viewport ? 'var(--islands-color-error)' : 'var(--islands-color-success)'}
          icon={obj.hide_viewport ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        />
        <PropertyRow
          label="Render"
          value={obj.hide_render ? 'Hidden' : 'Visible'}
          color={obj.hide_render ? 'var(--islands-color-error)' : 'var(--islands-color-success)'}
          icon={obj.hide_render ? <VideoOff className="size-3.5" /> : <Video className="size-3.5" />}
        />
        <PropertyRow
          label="Selectable"
          value={obj.hide_select ? 'No' : 'Yes'}
          color={obj.hide_select ? 'var(--islands-color-error)' : 'var(--islands-color-success)'}
          icon={obj.hide_select ? <MousePointer2Off className="size-3.5" /> : <MousePointer2 className="size-3.5" />}
        />
      </PropertySection>

      {/* Hierarchy */}
      {(obj.parent || obj.children.length > 0) && (
        <PropertySection title="Hierarchy">
          {obj.parent && <PropertyRow label="Parent" value={obj.parent} />}
          {obj.children.length > 0 && (
            <PropertyRow label="Children" value={obj.children.join(', ')} />
          )}
        </PropertySection>
      )}

      {/* Type-specific data */}
      {obj.mesh && (
        <PropertySection title="Mesh Data">
          <PropertyRow label="Vertices" value={obj.mesh.vertices.toLocaleString()} color="var(--islands-color-info)" />
          <PropertyRow label="Edges" value={obj.mesh.edges.toLocaleString()} color="var(--islands-color-info)" />
          <PropertyRow label="Polygons" value={obj.mesh.polygons.toLocaleString()} color="var(--islands-color-info)" />
        </PropertySection>
      )}

      {obj.light && (
        <PropertySection title="Light Data">
          <PropertyRow label="Type" value={obj.light.type} />
          <PropertyRow label="Energy" value={obj.light.energy.toFixed(1)} color="var(--islands-color-warning)" />
          <PropertyRow label="Color" value={<Vector3Display value={obj.light.color} />} />
        </PropertySection>
      )}

      {obj.camera && (
        <PropertySection title="Camera Data">
          <PropertyRow label="Type" value={obj.camera.type} />
          {obj.camera.lens && <PropertyRow label="Lens" value={`${obj.camera.lens.toFixed(1)}mm`} />}
          {obj.camera.ortho_scale && <PropertyRow label="Ortho Scale" value={obj.camera.ortho_scale.toFixed(2)} />}
          <PropertyRow label="Clip Start" value={obj.camera.clip_start.toFixed(3)} />
          <PropertyRow label="Clip End" value={obj.camera.clip_end.toFixed(1)} />
        </PropertySection>
      )}

      {obj.curve && (
        <PropertySection title="Curve Data">
          <PropertyRow label="Splines" value={obj.curve.splines} />
          <PropertyRow label="Dimensions" value={obj.curve.dimensions} />
          <PropertyRow label="Resolution" value={obj.curve.resolution_u} />
        </PropertySection>
      )}

      {/* Modifiers */}
      {obj.modifiers.length > 0 && (
        <PropertySection title={`Modifiers (${obj.modifiers.length})`}>
          {obj.modifiers.map((mod, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className={mod.show_viewport ? '' : 'opacity-40'}>{mod.name}</span>
              <span className="text-[10px] opacity-60 ml-auto">{mod.type}</span>
              {mod.type === 'NODES' && (
                <div className="size-1.5 rounded-full bg-green-500" />
              )}
            </div>
          ))}
        </PropertySection>
      )}

      {/* Constraints */}
      {obj.constraints.length > 0 && (
        <PropertySection title={`Constraints (${obj.constraints.length})`}>
          {obj.constraints.map((con, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className={con.enabled ? '' : 'opacity-40'}>{con.name}</span>
              <span className="text-[10px] opacity-60 ml-auto">{con.type}</span>
            </div>
          ))}
        </PropertySection>
      )}

      {/* Materials */}
      {obj.materials.length > 0 && (
        <PropertySection title={`Materials (${obj.materials.length})`}>
          {obj.materials.map((mat, i) => (
            <div key={i} className="py-0.5">
              <span className={mat === obj.active_material ? 'font-semibold' : 'opacity-70'}>
                {mat || '(empty slot)'}
              </span>
              {mat === obj.active_material && (
                <span className="text-[10px] ml-2" style={{ color: 'var(--islands-color-brand-secondary)' }}>active</span>
              )}
            </div>
          ))}
        </PropertySection>
      )}

      {/* Animation */}
      {obj.has_animation && (
        <PropertySection title="Animation">
          <PropertyRow label="Action" value={obj.action_name || 'None'} />
        </PropertySection>
      )}

      {/* Custom Properties */}
      {obj.custom_properties && Object.keys(obj.custom_properties).length > 0 && (
        <PropertySection title="Custom Properties">
          {Object.entries(obj.custom_properties).map(([key, value]) => (
            <PropertyRow
              key={key}
              label={key}
              value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
            />
          ))}
        </PropertySection>
      )}
    </div>
  );
}

function CollectionProperties({ collection }: { collection: Omit<BlenderCollection, 'children'> }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b" style={{ borderColor: 'var(--islands-color-border-subtle)' }}>
        <Folder className="size-4 text-blue-400" />
        <span className="font-semibold">{collection.name}</span>
        <span className="text-[10px] opacity-60 ml-auto">Collection</span>
      </div>

      {/* Contents */}
      <PropertySection title="Contents">
        <PropertyRow label="Objects" value={collection.object_count} color="var(--islands-color-info)" />
        <PropertyRow label="Children" value={collection.children_count} color="var(--islands-color-info)" />
      </PropertySection>

      {/* Objects list */}
      {collection.objects.length > 0 && (
        <PropertySection title="Objects">
          {collection.objects.map((objName, i) => (
            <div key={i} className="py-0.5 opacity-80">{objName}</div>
          ))}
        </PropertySection>
      )}

      {/* Visibility */}
      {(collection.hide_viewport !== undefined || collection.hide_render !== undefined) && (
        <PropertySection title="Visibility">
          {collection.hide_viewport !== undefined && (
            <PropertyRow
              label="Viewport"
              value={collection.hide_viewport ? 'Hidden' : 'Visible'}
              color={collection.hide_viewport ? 'var(--islands-color-error)' : 'var(--islands-color-success)'}
              icon={collection.hide_viewport ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            />
          )}
          {collection.hide_render !== undefined && (
            <PropertyRow
              label="Render"
              value={collection.hide_render ? 'Hidden' : 'Visible'}
              color={collection.hide_render ? 'var(--islands-color-error)' : 'var(--islands-color-success)'}
              icon={collection.hide_render ? <VideoOff className="size-3.5" /> : <Video className="size-3.5" />}
            />
          )}
          {collection.hide_select !== undefined && (
            <PropertyRow
              label="Selectable"
              value={collection.hide_select ? 'No' : 'Yes'}
              color={collection.hide_select ? 'var(--islands-color-error)' : 'var(--islands-color-success)'}
              icon={collection.hide_select ? <MousePointer2Off className="size-3.5" /> : <MousePointer2 className="size-3.5" />}
            />
          )}
        </PropertySection>
      )}

      {/* Other */}
      {(collection.color_tag || collection.lineart_usage) && (
        <PropertySection title="Settings">
          {collection.color_tag && <PropertyRow label="Color Tag" value={collection.color_tag} />}
          {collection.lineart_usage && <PropertyRow label="Line Art" value={collection.lineart_usage} />}
        </PropertySection>
      )}

      {/* Custom Properties */}
      {collection.custom_properties && Object.keys(collection.custom_properties).length > 0 && (
        <PropertySection title="Custom Properties">
          {Object.entries(collection.custom_properties).map(([key, value]) => (
            <PropertyRow
              key={key}
              label={key}
              value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
            />
          ))}
        </PropertySection>
      )}
    </div>
  );
}

interface PropertiesPanelProps {
  currentNodeId: string;
}

export default function PropertiesPanel({ currentNodeId }: PropertiesPanelProps) {
  const sceneData = useBlenderStore((s) => s.sceneData);

  // Find the selected object or collection
  const selectedData = useMemo(() => {
    if (!sceneData || !currentNodeId) return null;

    // Check if it's an object (prefixed with obj_)
    if (currentNodeId.startsWith('obj_')) {
      const objName = currentNodeId.slice(4);
      const obj = sceneData.objects[objName];
      if (obj) return { type: 'object' as const, data: obj };
    }

    // Check if it's a collection (prefixed with col_)
    if (currentNodeId.startsWith('col_')) {
      const colName = currentNodeId.slice(4);
      // Search for collection in the tree
      const findCollection = (col: BlenderCollection): BlenderCollection | null => {
        if (col.name === colName) return col;
        for (const child of col.children) {
          const found = findCollection(child);
          if (found) return found;
        }
        return null;
      };
      const col = findCollection(sceneData.collections);
      if (col) {
        // Remove children for display
        const { children: _children, ...colWithoutChildren } = col;
        return { type: 'collection' as const, data: colWithoutChildren };
      }
    }

    return null;
  }, [sceneData, currentNodeId]);

  if (!sceneData) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">
        <span>Waiting for Blender...</span>
      </div>
    );
  }

  if (!selectedData) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">
        <span>Select an object or collection</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        {selectedData.type === 'object' ? (
          <ObjectProperties obj={selectedData.data} />
        ) : (
          <CollectionProperties collection={selectedData.data} />
        )}
      </div>
    </ScrollArea>
  );
}
