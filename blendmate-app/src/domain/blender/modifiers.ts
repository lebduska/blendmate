/**
 * Blender Modifier Domain Model
 *
 * Centralized definitions for modifier types, categories, and metadata.
 * Used across the application for consistent modifier handling.
 */

// ============================================================================
// Categories
// ============================================================================

export const ModifierCategory = {
  GENERATE: 'generate',
  DEFORM: 'deform',
  PROCEDURAL: 'procedural',
  PHYSICS: 'physics',
} as const;

export type ModifierCategoryType = typeof ModifierCategory[keyof typeof ModifierCategory];

// ============================================================================
// Modifier Definitions
// ============================================================================

export type ModifierDefinition = {
  category: ModifierCategoryType;
  i18nKey: string;
  blenderDocs?: string;
};

/**
 * All Blender modifier types with their metadata.
 * Keys match Blender's internal modifier type names.
 */
export const MODIFIER_DEFINITIONS: Record<string, ModifierDefinition> = {
  // Generate modifiers
  SUBSURF: { category: 'generate', i18nKey: 'modifiers.types.SUBSURF' },
  SOLIDIFY: { category: 'generate', i18nKey: 'modifiers.types.SOLIDIFY' },
  BOOLEAN: { category: 'generate', i18nKey: 'modifiers.types.BOOLEAN' },
  ARRAY: { category: 'generate', i18nKey: 'modifiers.types.ARRAY' },
  BEVEL: { category: 'generate', i18nKey: 'modifiers.types.BEVEL' },
  DECIMATE: { category: 'generate', i18nKey: 'modifiers.types.DECIMATE' },
  TRIANGULATE: { category: 'generate', i18nKey: 'modifiers.types.TRIANGULATE' },
  WELD: { category: 'generate', i18nKey: 'modifiers.types.WELD' },
  SCREW: { category: 'generate', i18nKey: 'modifiers.types.SCREW' },
  SKIN: { category: 'generate', i18nKey: 'modifiers.types.SKIN' },
  REMESH: { category: 'generate', i18nKey: 'modifiers.types.REMESH' },
  BUILD: { category: 'generate', i18nKey: 'modifiers.types.BUILD' },
  WIREFRAME: { category: 'generate', i18nKey: 'modifiers.types.WIREFRAME' },
  EDGE_SPLIT: { category: 'generate', i18nKey: 'modifiers.types.EDGE_SPLIT' },
  MASK: { category: 'generate', i18nKey: 'modifiers.types.MASK' },
  MULTIRES: { category: 'generate', i18nKey: 'modifiers.types.MULTIRES' },

  // Deform modifiers
  MIRROR: { category: 'deform', i18nKey: 'modifiers.types.MIRROR' },
  ARMATURE: { category: 'deform', i18nKey: 'modifiers.types.ARMATURE' },
  LATTICE: { category: 'deform', i18nKey: 'modifiers.types.LATTICE' },
  SHRINKWRAP: { category: 'deform', i18nKey: 'modifiers.types.SHRINKWRAP' },
  SIMPLE_DEFORM: { category: 'deform', i18nKey: 'modifiers.types.SIMPLE_DEFORM' },
  SMOOTH: { category: 'deform', i18nKey: 'modifiers.types.SMOOTH' },
  LAPLACIANSMOOTH: { category: 'deform', i18nKey: 'modifiers.types.LAPLACIANSMOOTH' },
  CORRECTIVE_SMOOTH: { category: 'deform', i18nKey: 'modifiers.types.CORRECTIVE_SMOOTH' },
  SURFACE_DEFORM: { category: 'deform', i18nKey: 'modifiers.types.SURFACE_DEFORM' },
  MESH_DEFORM: { category: 'deform', i18nKey: 'modifiers.types.MESH_DEFORM' },
  HOOK: { category: 'deform', i18nKey: 'modifiers.types.HOOK' },
  CAST: { category: 'deform', i18nKey: 'modifiers.types.CAST' },
  CURVE: { category: 'deform', i18nKey: 'modifiers.types.CURVE' },
  DISPLACE: { category: 'deform', i18nKey: 'modifiers.types.DISPLACE' },
  WAVE: { category: 'deform', i18nKey: 'modifiers.types.WAVE' },
  LAPLACIANDEFORM: { category: 'deform', i18nKey: 'modifiers.types.LAPLACIANDEFORM' },
  WARP: { category: 'deform', i18nKey: 'modifiers.types.WARP' },

  // Procedural modifiers
  NODES: { category: 'procedural', i18nKey: 'modifiers.types.NODES' },

  // Physics modifiers
  CLOTH: { category: 'physics', i18nKey: 'modifiers.types.CLOTH' },
  FLUID: { category: 'physics', i18nKey: 'modifiers.types.FLUID' },
  COLLISION: { category: 'physics', i18nKey: 'modifiers.types.COLLISION' },
  SOFT_BODY: { category: 'physics', i18nKey: 'modifiers.types.SOFT_BODY' },
  PARTICLE_SYSTEM: { category: 'physics', i18nKey: 'modifiers.types.PARTICLE_SYSTEM' },
  DYNAMIC_PAINT: { category: 'physics', i18nKey: 'modifiers.types.DYNAMIC_PAINT' },
  OCEAN: { category: 'physics', i18nKey: 'modifiers.types.OCEAN' },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the category for a modifier type.
 * Returns 'generate' as default for unknown types.
 */
export function getModifierCategory(modifierType: string): ModifierCategoryType {
  return MODIFIER_DEFINITIONS[modifierType]?.category ?? 'generate';
}

/**
 * Get the i18n key for a modifier type.
 */
export function getModifierI18nKey(modifierType: string): string {
  return MODIFIER_DEFINITIONS[modifierType]?.i18nKey ?? `modifiers.types.${modifierType}`;
}

/**
 * Get all modifier types for a specific category.
 */
export function getModifiersByCategory(category: ModifierCategoryType): string[] {
  return Object.entries(MODIFIER_DEFINITIONS)
    .filter(([, def]) => def.category === category)
    .map(([type]) => type);
}

/**
 * Check if a modifier type exists in our definitions.
 */
export function isKnownModifier(modifierType: string): boolean {
  return modifierType in MODIFIER_DEFINITIONS;
}

// ============================================================================
// Category Sets (for fast lookup)
// ============================================================================

/** Set of all generate modifier types */
export const GENERATE_MODIFIERS = new Set(getModifiersByCategory('generate'));

/** Set of all deform modifier types */
export const DEFORM_MODIFIERS = new Set(getModifiersByCategory('deform'));

/** Set of all procedural modifier types */
export const PROCEDURAL_MODIFIERS = new Set(getModifiersByCategory('procedural'));

/** Set of all physics modifier types */
export const PHYSICS_MODIFIERS = new Set(getModifiersByCategory('physics'));
