/**
 * Blender Object Domain Model
 *
 * Centralized definitions for object types and metadata.
 * Used across the application for consistent object handling.
 */

// ============================================================================
// Categories
// ============================================================================

export const ObjectCategory = {
  GEOMETRY: 'geometry',
  RIGGING: 'rigging',
  RENDERING: 'rendering',
  OTHER: 'other',
} as const;

export type ObjectCategoryType = typeof ObjectCategory[keyof typeof ObjectCategory];

// ============================================================================
// Object Type Definitions
// ============================================================================

export type ObjectDefinition = {
  category: ObjectCategoryType;
  i18nKey: string;
  i18nDescKey: string;
  icon: string;
  hasData: boolean;
};

/**
 * All Blender object types with their metadata.
 * Keys match Blender's internal object type names (bpy.types.Object.type).
 */
export const OBJECT_DEFINITIONS: Record<string, ObjectDefinition> = {
  // Geometry objects
  MESH: {
    category: 'geometry',
    i18nKey: 'object.types.MESH',
    i18nDescKey: 'object.descriptions.MESH',
    icon: 'box',
    hasData: true,
  },
  CURVE: {
    category: 'geometry',
    i18nKey: 'object.types.CURVE',
    i18nDescKey: 'object.descriptions.CURVE',
    icon: 'spline',
    hasData: true,
  },
  SURFACE: {
    category: 'geometry',
    i18nKey: 'object.types.SURFACE',
    i18nDescKey: 'object.descriptions.SURFACE',
    icon: 'layers',
    hasData: true,
  },
  META: {
    category: 'geometry',
    i18nKey: 'object.types.META',
    i18nDescKey: 'object.descriptions.META',
    icon: 'circle',
    hasData: true,
  },
  FONT: {
    category: 'geometry',
    i18nKey: 'object.types.FONT',
    i18nDescKey: 'object.descriptions.FONT',
    icon: 'type',
    hasData: true,
  },
  VOLUME: {
    category: 'geometry',
    i18nKey: 'object.types.VOLUME',
    i18nDescKey: 'object.descriptions.VOLUME',
    icon: 'cloud',
    hasData: true,
  },
  CURVES: {
    category: 'geometry',
    i18nKey: 'object.types.CURVES',
    i18nDescKey: 'object.descriptions.CURVES',
    icon: 'waves',
    hasData: true,
  },
  POINTCLOUD: {
    category: 'geometry',
    i18nKey: 'object.types.POINTCLOUD',
    i18nDescKey: 'object.descriptions.POINTCLOUD',
    icon: 'scatter-chart',
    hasData: true,
  },
  GPENCIL: {
    category: 'geometry',
    i18nKey: 'object.types.GPENCIL',
    i18nDescKey: 'object.descriptions.GPENCIL',
    icon: 'pencil',
    hasData: true,
  },

  // Rigging objects
  ARMATURE: {
    category: 'rigging',
    i18nKey: 'object.types.ARMATURE',
    i18nDescKey: 'object.descriptions.ARMATURE',
    icon: 'bone',
    hasData: true,
  },
  LATTICE: {
    category: 'rigging',
    i18nKey: 'object.types.LATTICE',
    i18nDescKey: 'object.descriptions.LATTICE',
    icon: 'grid-3x3',
    hasData: true,
  },

  // Rendering objects
  CAMERA: {
    category: 'rendering',
    i18nKey: 'object.types.CAMERA',
    i18nDescKey: 'object.descriptions.CAMERA',
    icon: 'camera',
    hasData: true,
  },
  LIGHT: {
    category: 'rendering',
    i18nKey: 'object.types.LIGHT',
    i18nDescKey: 'object.descriptions.LIGHT',
    icon: 'sun',
    hasData: true,
  },
  LIGHT_PROBE: {
    category: 'rendering',
    i18nKey: 'object.types.LIGHT_PROBE',
    i18nDescKey: 'object.descriptions.LIGHT_PROBE',
    icon: 'radar',
    hasData: true,
  },

  // Other objects
  EMPTY: {
    category: 'other',
    i18nKey: 'object.types.EMPTY',
    i18nDescKey: 'object.descriptions.EMPTY',
    icon: 'crosshair',
    hasData: false,
  },
  SPEAKER: {
    category: 'other',
    i18nKey: 'object.types.SPEAKER',
    i18nDescKey: 'object.descriptions.SPEAKER',
    icon: 'volume-2',
    hasData: true,
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the category for an object type.
 * Returns 'other' as default for unknown types.
 */
export function getObjectCategory(objectType: string): ObjectCategoryType {
  return OBJECT_DEFINITIONS[objectType]?.category ?? 'other';
}

/**
 * Get the i18n key for an object type name.
 */
export function getObjectI18nKey(objectType: string): string {
  return OBJECT_DEFINITIONS[objectType]?.i18nKey ?? `object.types.${objectType}`;
}

/**
 * Get the i18n key for an object type description.
 */
export function getObjectDescI18nKey(objectType: string): string {
  return OBJECT_DEFINITIONS[objectType]?.i18nDescKey ?? `object.descriptions.${objectType}`;
}

/**
 * Get the icon name for an object type.
 */
export function getObjectIcon(objectType: string): string {
  return OBJECT_DEFINITIONS[objectType]?.icon ?? 'box';
}

/**
 * Get all object types for a specific category.
 */
export function getObjectsByCategory(category: ObjectCategoryType): string[] {
  return Object.entries(OBJECT_DEFINITIONS)
    .filter(([, def]) => def.category === category)
    .map(([type]) => type);
}

/**
 * Check if an object type exists in our definitions.
 */
export function isKnownObjectType(objectType: string): boolean {
  return objectType in OBJECT_DEFINITIONS;
}

/**
 * Check if an object type has associated data (mesh, curve, etc.).
 */
export function objectHasData(objectType: string): boolean {
  return OBJECT_DEFINITIONS[objectType]?.hasData ?? false;
}

// ============================================================================
// Category Sets (for fast lookup)
// ============================================================================

/** Set of all geometry object types */
export const GEOMETRY_OBJECTS = new Set(getObjectsByCategory('geometry'));

/** Set of all rigging object types */
export const RIGGING_OBJECTS = new Set(getObjectsByCategory('rigging'));

/** Set of all rendering object types */
export const RENDERING_OBJECTS = new Set(getObjectsByCategory('rendering'));

/** Set of all other object types */
export const OTHER_OBJECTS = new Set(getObjectsByCategory('other'));
