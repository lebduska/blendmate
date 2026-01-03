/**
 * Blender Icon Mapping
 *
 * Maps Blendmate domain concepts to Blender SVG icon names.
 * Source: Blender repo release/datafiles/icons_svg/
 */

// ============================================================================
// Object Type Icons
// ============================================================================

export const OBJECT_ICONS: Record<string, string> = {
  // Geometry
  MESH: 'mesh_data',
  CURVE: 'curve_data',
  SURFACE: 'surface_data',
  META: 'meta_data',
  FONT: 'font_data',
  VOLUME: 'volume_data',
  CURVES: 'curves_data',
  POINTCLOUD: 'pointcloud_data',
  GPENCIL: 'outliner_data_greasepencil',

  // Rigging
  ARMATURE: 'armature_data',
  LATTICE: 'lattice_data',

  // Rendering
  CAMERA: 'camera_data',
  LIGHT: 'light_data',
  LIGHT_PROBE: 'lightprobe_sphere',

  // Other
  EMPTY: 'empty_data',
  SPEAKER: 'speaker',
};

// ============================================================================
// Modifier Icons
// ============================================================================

export const MODIFIER_ICONS: Record<string, string> = {
  // Generate
  SUBSURF: 'mod_subsurf',
  SOLIDIFY: 'mod_solidify',
  BOOLEAN: 'mod_boolean',
  ARRAY: 'mod_array',
  BEVEL: 'mod_bevel',
  DECIMATE: 'mod_decim',
  TRIANGULATE: 'mod_triangulate',
  WELD: 'mod_weld',
  SCREW: 'mod_screw',
  SKIN: 'mod_skin',
  REMESH: 'mod_remesh',
  BUILD: 'mod_build',
  WIREFRAME: 'mod_wireframe',
  EDGE_SPLIT: 'mod_edgesplit',
  MASK: 'mod_mask',
  MULTIRES: 'mod_multires',

  // Deform
  MIRROR: 'mod_mirror',
  ARMATURE: 'mod_armature',
  LATTICE: 'mod_lattice',
  SHRINKWRAP: 'mod_shrinkwrap',
  SIMPLE_DEFORM: 'mod_simpledeform',
  SMOOTH: 'mod_smooth',
  LAPLACIANSMOOTH: 'mod_smooth',
  CORRECTIVE_SMOOTH: 'mod_smooth',
  SURFACE_DEFORM: 'mod_meshdeform',
  MESH_DEFORM: 'mod_meshdeform',
  HOOK: 'hook',
  CAST: 'mod_cast',
  CURVE: 'mod_curve',
  DISPLACE: 'mod_displace',
  WAVE: 'mod_wave',
  LAPLACIANDEFORM: 'mod_meshdeform',
  WARP: 'mod_warp',

  // Procedural
  NODES: 'geometry_nodes',

  // Physics
  CLOTH: 'mod_cloth',
  FLUID: 'mod_fluid',
  COLLISION: 'mod_physics',
  SOFT_BODY: 'mod_soft',
  PARTICLE_SYSTEM: 'mod_particles',
  DYNAMIC_PAINT: 'mod_dynamicpaint',
  OCEAN: 'mod_ocean',
};

// ============================================================================
// Category Icons
// ============================================================================

export const CATEGORY_ICONS: Record<string, string> = {
  // Influence categories
  source: 'object_data',
  transform: 'orientation_global',
  geometry: 'mesh_data',
  generate: 'modifier',
  deform: 'mod_simpledeform',
  procedural: 'geometry_nodes',
  shading: 'material',
  physics: 'physics',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the Blender icon name for an object type.
 */
export function getObjectIconName(objectType: string): string {
  return OBJECT_ICONS[objectType] ?? 'object_data';
}

/**
 * Get the Blender icon name for a modifier type.
 */
export function getModifierIconName(modifierType: string): string {
  return MODIFIER_ICONS[modifierType] ?? 'modifier';
}

/**
 * Get the Blender icon name for a category.
 */
export function getCategoryIconName(category: string): string {
  return CATEGORY_ICONS[category] ?? 'dot';
}
