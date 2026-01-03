import { useMemo } from "react";
import {
  Box,
  Folder,
  Spline,
  Circle,
  Camera,
  Lightbulb,
  Speaker,
  Type,
  Sparkles,
  Grid3X3,
  Info,
  Wrench,
  Layers,
} from "lucide-react";
import { useBlenderStore, BlenderObject, BlenderCollection } from "@/stores/blenderStore";

const OBJECT_TYPE_ICONS: Record<string, React.ReactNode> = {
  MESH: <Box className="size-4 text-orange-400" />,
  CURVE: <Spline className="size-4 text-green-400" />,
  CAMERA: <Camera className="size-4 text-purple-400" />,
  LIGHT: <Lightbulb className="size-4 text-yellow-400" />,
  SPEAKER: <Speaker className="size-4 text-blue-400" />,
  FONT: <Type className="size-4 text-pink-400" />,
  EMPTY: <Circle className="size-4 text-gray-400" />,
  ARMATURE: <Sparkles className="size-4 text-cyan-400" />,
  LATTICE: <Grid3X3 className="size-4 text-indigo-400" />,
};

const TYPE_SUMMARIES: Record<string, { title: string; description: string }> = {
  MESH: {
    title: "Mesh",
    description:
      "Polygon geometry made of vertices, edges, and faces. Use it for solid forms and surface edits. In GN, mesh data is often converted to points, curves, or volumes.",
  },
  CURVE: {
    title: "Curve",
    description:
      "Spline-based geometry with a direction. Useful for paths, profiles, and procedural lines that can be converted to meshes or swept.",
  },
  CAMERA: {
    title: "Camera",
    description:
      "Viewpoint for rendering. Not used as geometry directly, but can drive GN parameters or act as a reference.",
  },
  LIGHT: {
    title: "Light",
    description:
      "Light source for rendering. Not geometry, but can be referenced for effects or drivers.",
  },
  EMPTY: {
    title: "Empty",
    description:
      "Transform-only object used as a locator or pivot. Often used for constraints or as a controller.",
  },
  COLLECTION: {
    title: "Collection",
    description:
      "A named group of objects. Useful for organizing scene content and instancing grouped assets.",
  },
};

const MODIFIER_SUMMARIES: Record<string, string> = {
  NODES: "Procedural stack based on node graph (Geometry Nodes).",
  SUBSURF: "Smooths mesh by subdivision.",
  ARRAY: "Duplicates geometry in a linear or radial pattern.",
  MIRROR: "Mirrors geometry across an axis.",
  SOLIDIFY: "Adds thickness to surfaces.",
  BEVEL: "Chamfers edges to create softer corners.",
  DISPLACE: "Offsets vertices based on a texture or value.",
  BOOLEAN: "Combines geometry with union, difference, or intersect.",
  DECIMATE: "Reduces geometry complexity.",
  TRIANGULATE: "Converts faces to triangles.",
  WELD: "Merges nearby vertices.",
  SHRINKWRAP: "Projects geometry onto another surface.",
  SIMPLE_DEFORM: "Bend, taper, or twist deformation.",
  ARMATURE: "Deforms mesh using bones.",
  CLOTH: "Simulates fabric behavior.",
  FLUID: "Simulates liquid or gas behavior.",
  COLLISION: "Enables interaction with physics sims.",
};

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className="opacity-70">{icon}</span>
      <span>{title}</span>
    </div>
  );
}

function findCollection(
  root: BlenderCollection,
  name: string
): BlenderCollection | null {
  if (root.name === name) return root;
  for (const child of root.children) {
    const found = findCollection(child, name);
    if (found) return found;
  }
  return null;
}

function resolveSelection(
  sceneData: ReturnType<typeof useBlenderStore.getState>["sceneData"],
  selectedId: string | null
) {
  if (!sceneData) return null;

  if (selectedId?.startsWith("obj_")) {
    const name = selectedId.slice(4);
    const obj = sceneData.objects[name];
    if (obj) return { kind: "object" as const, data: obj, source: "selection" as const };
  }

  if (selectedId?.startsWith("col_")) {
    const name = selectedId.slice(4);
    const col = findCollection(sceneData.collections, name);
    if (col) return { kind: "collection" as const, data: col, source: "selection" as const };
  }

  if (sceneData.active_object) {
    const obj = sceneData.objects[sceneData.active_object];
    if (obj) return { kind: "object" as const, data: obj, source: "active" as const };
  }

  if (sceneData.selected_objects.length > 0) {
    const obj = sceneData.objects[sceneData.selected_objects[0]];
    if (obj) return { kind: "object" as const, data: obj, source: "active" as const };
  }

  return null;
}

export default function ContextSummary({ selectedId }: { selectedId: string | null }) {
  const sceneData = useBlenderStore((s) => s.sceneData);
  const activeNodeId = useBlenderStore((s) => s.activeNodeId);

  const selection = useMemo(
    () => resolveSelection(sceneData, selectedId),
    [sceneData, selectedId]
  );

  if (!sceneData) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">
        <span>Waiting for Blender...</span>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="space-y-3 text-xs text-muted-foreground">
        <SectionTitle icon={<Info className="size-3" />} title="Context" />
        <div>Select an object or collection to see type context.</div>
      </div>
    );
  }

  if (selection.kind === "collection") {
    const col = selection.data;
    const summary = TYPE_SUMMARIES.COLLECTION;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Folder className="size-4 text-blue-400" />
          <div className="text-sm font-semibold">{col.name}</div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">
            {selection.source === "selection" ? "Selected" : "Active"}
          </span>
        </div>

        <div className="space-y-2">
          <SectionTitle icon={<Layers className="size-3" />} title={summary.title} />
          <div className="text-xs text-muted-foreground leading-relaxed">
            {summary.description}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 p-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Objects</span>
            <span>{col.object_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Children</span>
            <span>{col.children_count}</span>
          </div>
        </div>

        {activeNodeId && (
          <div className="rounded-lg border border-white/10 p-2 text-[11px] text-muted-foreground">
            Active node: <span className="text-foreground">{activeNodeId}</span>
          </div>
        )}
      </div>
    );
  }

  const obj = selection.data as BlenderObject;
  const summary = TYPE_SUMMARIES[obj.type] ?? {
    title: obj.type,
    description: "Scene object with transform and data.",
  };
  const icon = OBJECT_TYPE_ICONS[obj.type] || <Box className="size-4 text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-sm font-semibold">{obj.name}</div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">
          {selection.source === "selection" ? "Selected" : "Active"}
        </span>
      </div>

      <div className="space-y-2">
        <SectionTitle icon={<Info className="size-3" />} title={summary.title} />
        <div className="text-xs text-muted-foreground leading-relaxed">
          {summary.description}
        </div>
      </div>

      {(obj.mesh || obj.curve) && (
        <div className="rounded-lg border border-white/10 p-2 text-xs">
          {obj.mesh && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mesh data</span>
              <span>{obj.mesh.vertices.toLocaleString()} verts</span>
            </div>
          )}
          {obj.curve && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Curve data</span>
              <span>{obj.curve.splines} splines</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <SectionTitle icon={<Wrench className="size-3" />} title="Modifiers" />
        {obj.modifiers.length === 0 ? (
          <div className="text-xs text-muted-foreground">No modifiers.</div>
        ) : (
          <div className="space-y-2">
            {obj.modifiers.map((mod) => (
              <div key={mod.name} className="rounded-lg border border-white/10 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-foreground">{mod.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{mod.type}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {MODIFIER_SUMMARIES[mod.type] ?? "Modifier applied to the object."}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeNodeId && (
        <div className="rounded-lg border border-white/10 p-2 text-[11px] text-muted-foreground">
          Active node: <span className="text-foreground">{activeNodeId}</span>
        </div>
      )}
    </div>
  );
}
