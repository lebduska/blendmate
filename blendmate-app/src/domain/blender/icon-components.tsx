/**
 * Blender Icon Components
 *
 * Maps Blender object types and modifier types to their React icon components.
 */

import type { ComponentType, SVGProps } from 'react';
import {
  MeshData,
  CurveData,
  SurfaceData,
  MetaData,
  FontData,
  VolumeData,
  CurvesData,
  PointcloudData,
  OutlinerDataGreasepencil,
  ArmatureData,
  LatticeData,
  CameraData,
  LightData,
  LightprobeSphere,
  EmptyData,
  Speaker,
  ModSubsurf,
  ModSolidify,
  ModBoolean,
  ModArray,
  ModBevel,
  ModDecim,
  ModTriangulate,
  ModScrew,
  ModSkin,
  ModRemesh,
  ModBuild,
  ModWireframe,
  ModEdgesplit,
  ModMask,
  ModMultires,
  ModMirror,
  ModArmature,
  ModLattice,
  ModShrinkwrap,
  ModSimpledeform,
  ModSmooth,
  ModMeshdeform,
  Hook,
  ModCast,
  ModCurve,
  ModDisplace,
  ModWave,
  ModWarp,
  GeometryNodes,
  ModCloth,
  ModFluid,
  ModPhysics,
  ModSoft,
  ModParticles,
  ModDynamicpaint,
  ModOcean,
  ObjectData,
  OrientationGlobal,
  Modifier,
  Material,
} from '@/components/icons/blender';

type BlenderIconProps = SVGProps<SVGSVGElement> & { size?: number | string };
type BlenderIconComponent = ComponentType<BlenderIconProps>;

// ============================================================================
// Object Type Icons
// ============================================================================

const OBJECT_ICON_MAP: Record<string, BlenderIconComponent> = {
  MESH: MeshData,
  CURVE: CurveData,
  SURFACE: SurfaceData,
  META: MetaData,
  FONT: FontData,
  VOLUME: VolumeData,
  CURVES: CurvesData,
  POINTCLOUD: PointcloudData,
  GPENCIL: OutlinerDataGreasepencil,
  ARMATURE: ArmatureData,
  LATTICE: LatticeData,
  CAMERA: CameraData,
  LIGHT: LightData,
  LIGHT_PROBE: LightprobeSphere,
  EMPTY: EmptyData,
  SPEAKER: Speaker,
};

// ============================================================================
// Modifier Type Icons
// ============================================================================

const MODIFIER_ICON_MAP: Record<string, BlenderIconComponent> = {
  // Generate
  SUBSURF: ModSubsurf,
  SOLIDIFY: ModSolidify,
  BOOLEAN: ModBoolean,
  ARRAY: ModArray,
  BEVEL: ModBevel,
  DECIMATE: ModDecim,
  TRIANGULATE: ModTriangulate,
  SCREW: ModScrew,
  SKIN: ModSkin,
  REMESH: ModRemesh,
  BUILD: ModBuild,
  WIREFRAME: ModWireframe,
  EDGE_SPLIT: ModEdgesplit,
  MASK: ModMask,
  MULTIRES: ModMultires,

  // Deform
  MIRROR: ModMirror,
  ARMATURE: ModArmature,
  LATTICE: ModLattice,
  SHRINKWRAP: ModShrinkwrap,
  SIMPLE_DEFORM: ModSimpledeform,
  SMOOTH: ModSmooth,
  LAPLACIANSMOOTH: ModSmooth,
  CORRECTIVE_SMOOTH: ModSmooth,
  SURFACE_DEFORM: ModMeshdeform,
  MESH_DEFORM: ModMeshdeform,
  HOOK: Hook,
  CAST: ModCast,
  CURVE: ModCurve,
  DISPLACE: ModDisplace,
  WAVE: ModWave,
  LAPLACIANDEFORM: ModMeshdeform,
  WARP: ModWarp,

  // Procedural
  NODES: GeometryNodes,

  // Physics
  CLOTH: ModCloth,
  FLUID: ModFluid,
  COLLISION: ModPhysics,
  SOFT_BODY: ModSoft,
  PARTICLE_SYSTEM: ModParticles,
  DYNAMIC_PAINT: ModDynamicpaint,
  OCEAN: ModOcean,
};

// ============================================================================
// Category Icons
// ============================================================================

const CATEGORY_ICON_MAP: Record<string, BlenderIconComponent> = {
  source: ObjectData,
  transform: OrientationGlobal,
  geometry: MeshData,
  generate: Modifier,
  deform: ModSimpledeform,
  procedural: GeometryNodes,
  shading: Material,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the Blender icon component for an object type.
 */
export function BlenderObjectIcon(objectType: string): BlenderIconComponent {
  return OBJECT_ICON_MAP[objectType] ?? ObjectData;
}

/**
 * Get the Blender icon component for a modifier type.
 */
export function BlenderModifierIcon(modifierType: string): BlenderIconComponent {
  return MODIFIER_ICON_MAP[modifierType] ?? Modifier;
}

/**
 * Get the Blender icon component for a category.
 */
export function BlenderCategoryIcon(category: string): BlenderIconComponent {
  return CATEGORY_ICON_MAP[category] ?? ObjectData;
}
