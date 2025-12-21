/**
 * Layout persistence service
 * Stores and restores workspace layout (tab selection, panel states, etc.)
 * Uses localStorage with a versioned schema for future-proofing.
 */

const LAYOUT_STORAGE_KEY = 'blendmate_layout';
const CURRENT_LAYOUT_VERSION = 1;

export interface WorkspaceLayout {
  layoutVersion: number;
  activeTab: 'nodes' | 'stats' | 'chat';
  // Future: panel visibility, positions, sizes, etc.
}

// Partial type for saving - layoutVersion is optional as it's set by the service
export type WorkspaceLayoutInput = Omit<WorkspaceLayout, 'layoutVersion'> & {
  layoutVersion?: number;
};

const DEFAULT_LAYOUT: WorkspaceLayout = {
  layoutVersion: CURRENT_LAYOUT_VERSION,
  activeTab: 'nodes',
};

/**
 * Save the current workspace layout to localStorage
 */
export function saveLayout(layout: WorkspaceLayoutInput): void {
  try {
    const layoutWithVersion = {
      ...layout,
      layoutVersion: CURRENT_LAYOUT_VERSION,
    };
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutWithVersion));
  } catch (error) {
    console.error('Failed to save layout:', error);
  }
}

/**
 * Restore workspace layout from localStorage
 * Returns default layout if none exists or if version is incompatible
 */
export function restoreLayout(): WorkspaceLayout {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_LAYOUT;
    }

    const parsed = JSON.parse(stored) as WorkspaceLayout;
    
    // Version check - if layout version doesn't match, use default
    if (parsed.layoutVersion !== CURRENT_LAYOUT_VERSION) {
      console.warn(`Layout version mismatch. Expected ${CURRENT_LAYOUT_VERSION}, got ${parsed.layoutVersion}. Using default.`);
      return DEFAULT_LAYOUT;
    }

    // Validate activeTab is one of the allowed values
    const validTabs: Array<'nodes' | 'stats' | 'chat'> = ['nodes', 'stats', 'chat'];
    if (!validTabs.includes(parsed.activeTab)) {
      console.warn('Invalid activeTab value. Using default.');
      return DEFAULT_LAYOUT;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to restore layout:', error);
    return DEFAULT_LAYOUT;
  }
}

/**
 * Reset layout to default values
 */
export function resetLayout(): WorkspaceLayout {
  try {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset layout:', error);
  }
  return DEFAULT_LAYOUT;
}
