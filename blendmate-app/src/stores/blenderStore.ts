import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// Types
export type BlenderModifier = {
  name: string;
  type: string;
  show_viewport: boolean;
  show_render: boolean;
};

export type BlenderConstraint = {
  name: string;
  type: string;
  enabled: boolean;
};

export type BlenderMeshData = {
  vertices: number;
  edges: number;
  polygons: number;
  materials: number;
};

export type BlenderGeometry = {
  vertices: number[];  // Flat array [x1,y1,z1, x2,y2,z2, ...]
  edges: number[];     // Flat array [v1,v2, v1,v2, ...]
  vertex_count: number;
  edge_count: number;
};

export type BlenderCurveData = {
  splines: number;
  dimensions: string;
  resolution_u: number;
};

export type BlenderLightData = {
  type: string;
  color: number[];
  energy: number;
};

export type BlenderCameraData = {
  type: string;
  lens: number | null;
  ortho_scale: number | null;
  clip_start: number;
  clip_end: number;
};

export type BlenderObject = {
  name: string;
  type: string;
  visible: boolean;
  selected: boolean;
  parent: string | null;
  children: string[];
  // Transform
  location: number[];
  rotation_euler: number[];
  scale: number[];
  dimensions: number[];
  // Display
  display_type: string;
  show_name: boolean;
  show_axis: boolean;
  show_wire: boolean;
  show_in_front: boolean;
  color: number[];
  // Visibility
  hide_viewport: boolean;
  hide_render: boolean;
  hide_select: boolean;
  // Modifiers & Constraints
  modifiers: BlenderModifier[];
  has_gn: boolean;
  constraints: BlenderConstraint[];
  // Materials
  materials: (string | null)[];
  active_material: string | null;
  // Data
  data_name?: string;
  mesh?: BlenderMeshData;
  geometry?: BlenderGeometry;
  curve?: BlenderCurveData;
  light?: BlenderLightData;
  camera?: BlenderCameraData;
  // Custom properties
  custom_properties?: Record<string, unknown>;
  // Animation
  has_animation: boolean;
  action_name?: string;
};

export type BlenderCollection = {
  name: string;
  objects: string[];
  object_count: number;
  children: BlenderCollection[];
  children_count: number;
  // Visibility
  hide_viewport?: boolean;
  hide_render?: boolean;
  hide_select?: boolean;
  // Other
  color_tag?: string;
  lineart_usage?: string;
  instance_offset?: number[];
  custom_properties?: Record<string, unknown>;
};

export type BlenderSceneData = {
  scene: {
    name: string;
    frame_current: number;
    frame_start: number;
    frame_end: number;
  };
  active_object: string | null;
  selected_objects: string[];
  objects: Record<string, BlenderObject>;
  collections: BlenderCollection;
  filepath: string;
};

type ConnectionStatus = 'disconnected' | 'connected' | 'live';

type BlenderMessage = {
  type: string;
  event?: string;
  action?: string;
  data?: unknown;
  error?: string;
  warnings?: string[];
  filepath?: string;
  filename?: string;
  node_id?: string;
  [key: string]: unknown;
};

// Command response type
export type CommandResponse<T = unknown> = {
  success: true;
  data?: T;
  warnings?: string[];
} | {
  success: false;
  error: string;
};

// Pending command tracker
type PendingCommand = {
  resolve: (response: CommandResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

// Cached geometry for 3D viewer
export type CachedGeometry = {
  vertices: number[];
  edges: number[];
  triangles?: number[];
  vertex_count: number;
  edge_count: number;
  triangle_count?: number;
  skipped?: boolean;
  reason?: string;
};

// Blender capabilities (fetched once per session)
export type OperatorInfo = {
  desc: string;
  params: Record<string, string>;
  requires?: string;
  note?: string;
};

export type ModifierInfo = {
  desc: string;
  props: Record<string, string>;
};

export type BlenderCapabilities = {
  operators: Record<string, OperatorInfo>;
  modifiers: Record<string, ModifierInfo>;
  object_types: string[];
  primitive_meshes: string[];
};

interface BlenderState {
  // Connection
  connectionStatus: ConnectionStatus;
  lastHeartbeat: number | null;

  // Scene
  sceneData: BlenderSceneData | null;
  filepath: string | null;

  // Geometry cache for 3D viewer
  geometryCache: Record<string, CachedGeometry>;
  geometryLoading: boolean;

  // Capabilities (loaded once per session)
  capabilities: BlenderCapabilities | null;
  capabilitiesLoading: boolean;

  // Context
  activeNodeId: string | null;

  // Actions
  requestScene: () => Promise<void>;
  requestGnContext: () => Promise<void>;
  requestGeometry: (objectNames?: string[]) => Promise<void>;
  requestCapabilities: () => Promise<void>;

  // Command API
  sendCommand: <T = unknown>(
    action: string,
    target: string,
    params?: Record<string, unknown>
  ) => Promise<CommandResponse<T>>;

  // Internal
  _processMessage: (msg: BlenderMessage) => void;
  _setConnectionStatus: (status: ConnectionStatus) => void;
  _requestIdCounter: number;
  _pendingCommands: Map<string, PendingCommand>;
}

let unlisteners: UnlistenFn[] = [];
let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
let geometryDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

// Command timeout in milliseconds
const COMMAND_TIMEOUT = 10000;

export const useBlenderStore = create<BlenderState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    connectionStatus: 'disconnected',
    lastHeartbeat: null,
    sceneData: null,
    filepath: null,
    geometryCache: {},
    geometryLoading: false,
    capabilities: null,
    capabilitiesLoading: false,
    activeNodeId: null,
    _requestIdCounter: 0,
    _pendingCommands: new Map(),

    // Actions
    requestScene: async () => {
      const state = get();
      const id = `req-${++state._requestIdCounter}`;
      const message = JSON.stringify({ type: 'request', id, action: 'get_scene' });

      try {
        await invoke('send_to_blender', { message });
        console.log('[BlenderStore] Requested scene:', id);
      } catch (e) {
        console.error('[BlenderStore] Failed to request scene:', e);
      }
    },

    requestGnContext: async () => {
      const state = get();
      const id = `req-${++state._requestIdCounter}`;
      const message = JSON.stringify({ type: 'request', id, action: 'get_gn_context' });

      try {
        await invoke('send_to_blender', { message });
        console.log('[BlenderStore] Requested GN context:', id);
      } catch (e) {
        console.error('[BlenderStore] Failed to request GN context:', e);
      }
    },

    requestGeometry: async (objectNames?: string[]) => {
      const state = get();
      const id = `req-${++state._requestIdCounter}`;

      set({ geometryLoading: true });

      const message = JSON.stringify({
        type: 'request',
        id,
        action: 'get_geometry',
        params: objectNames ? { objects: objectNames } : {},
      });

      try {
        await invoke('send_to_blender', { message });
        console.log('[BlenderStore] Requested geometry:', id, objectNames || 'all');
      } catch (e) {
        console.error('[BlenderStore] Failed to request geometry:', e);
        set({ geometryLoading: false });
      }
    },

    requestCapabilities: async () => {
      const state = get();

      // Skip if already loaded or loading
      if (state.capabilities || state.capabilitiesLoading) {
        console.log('[BlenderStore] Capabilities already loaded/loading, skipping');
        return;
      }

      const id = `req-${++state._requestIdCounter}`;
      set({ capabilitiesLoading: true });

      const message = JSON.stringify({
        type: 'request',
        id,
        action: 'get_capabilities',
        target: '',
        params: {},
      });

      try {
        await invoke('send_to_blender', { message });
        console.log('[BlenderStore] Requested capabilities:', id);
      } catch (e) {
        console.error('[BlenderStore] Failed to request capabilities:', e);
        set({ capabilitiesLoading: false });
      }
    },

    // Generic command sender with response tracking
    sendCommand: async <T = unknown>(
      action: string,
      target: string,
      params: Record<string, unknown> = {}
    ): Promise<CommandResponse<T>> => {
      const state = get();

      if (state.connectionStatus === 'disconnected') {
        return { success: false, error: 'Not connected to Blender' };
      }

      const id = `cmd-${++state._requestIdCounter}`;
      const message = JSON.stringify({
        type: 'request',
        id,
        action,
        target,
        params,
      });

      return new Promise((resolve, reject) => {
        // Set up timeout
        const timeout = setTimeout(() => {
          const pending = state._pendingCommands.get(id);
          if (pending) {
            state._pendingCommands.delete(id);
            resolve({ success: false, error: 'Command timeout' });
          }
        }, COMMAND_TIMEOUT);

        // Track the pending command
        state._pendingCommands.set(id, { resolve: resolve as (r: CommandResponse) => void, reject, timeout });

        // Send the command
        invoke('send_to_blender', { message })
          .then(() => {
            console.log(`[BlenderStore] Sent command: ${action} (${id})`);
          })
          .catch((e) => {
            // Clean up on send failure
            clearTimeout(timeout);
            state._pendingCommands.delete(id);
            resolve({ success: false, error: `Failed to send: ${e}` });
          });
      });
    },

    _setConnectionStatus: (status) => {
      set({ connectionStatus: status });
    },

    _processMessage: (msg) => {
      console.log('[BlenderStore] Processing message:', msg.type, msg.event || msg.action || '');

      // Extract filepath from any message that has it
      const filepath = msg.filepath || msg.filename;
      if (filepath && filepath !== '(unsaved)') {
        set({ filepath });
      } else if (filepath === '(unsaved)') {
        set({ filepath: null });
      }

      // Handle different message types
      switch (msg.type) {
        case 'heartbeat':
          // Clear existing timeout
          if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
          }

          set({
            connectionStatus: 'live',
            lastHeartbeat: Date.now(),
          });

          // Reset to 'connected' if no heartbeat for 10 seconds
          heartbeatTimeout = setTimeout(() => {
            const current = get().connectionStatus;
            if (current === 'live') {
              set({ connectionStatus: 'connected' });
            }
          }, 10000);
          break;

        case 'context':
          if (msg.node_id) {
            set({ activeNodeId: msg.node_id as string });
          }
          break;

        case 'response': {
          const requestId = msg.id as string | undefined;

          // Check if this is a response to a pending command
          if (requestId && get()._pendingCommands.has(requestId)) {
            const pending = get()._pendingCommands.get(requestId)!;
            clearTimeout(pending.timeout);
            get()._pendingCommands.delete(requestId);

            if (msg.error) {
              pending.resolve({ success: false, error: msg.error });
            } else {
              pending.resolve({
                success: true,
                data: msg.data,
                warnings: msg.warnings,
              });
            }
          }

          // Also handle built-in responses
          if (msg.action === 'get_scene' && msg.data) {
            console.log('[BlenderStore] Received scene data');
            set({ sceneData: msg.data as BlenderSceneData });
          } else if (msg.action === 'get_geometry' && msg.data) {
            // Handle geometry response - data is a dict {objectName: geometryData}
            const geometryData = msg.data as Record<string, CachedGeometry & { name?: string }>;
            const newCache: Record<string, CachedGeometry> = { ...get().geometryCache };

            for (const [name, geo] of Object.entries(geometryData)) {
              newCache[name] = {
                vertices: geo.vertices || [],
                edges: geo.edges || [],
                triangles: geo.triangles || [],
                vertex_count: geo.vertex_count || 0,
                edge_count: geo.edge_count || 0,
                triangle_count: geo.triangle_count || 0,
                skipped: geo.skipped,
                reason: geo.reason,
              };
            }

            console.log('[BlenderStore] Cached geometry for', Object.keys(geometryData).length, 'objects');
            set({ geometryCache: newCache, geometryLoading: false });
          } else if (msg.action === 'get_capabilities' && msg.data) {
            // Handle capabilities response - cache for the entire session
            const capabilities = msg.data as BlenderCapabilities;
            console.log('[BlenderStore] Received capabilities:',
              Object.keys(capabilities.operators).length, 'operators,',
              Object.keys(capabilities.modifiers).length, 'modifiers'
            );
            set({ capabilities, capabilitiesLoading: false });
          }
          break;
        }

        case 'event':
          if (msg.event === 'load_post') {
            // New file loaded - clear geometry cache and request fresh scene
            console.log('[BlenderStore] File loaded - clearing cache and refreshing scene');
            set({ geometryCache: {} });
            get().requestScene();
          } else if (msg.event === 'save_post') {
            // File saved - just refresh scene data
            console.log('[BlenderStore] File saved - refreshing scene');
            get().requestScene();
          } else if (msg.event === 'depsgraph_update') {
            // Scene changed - smart refresh
            const changedObjects = (msg.changed_objects as string[]) || [];
            const geometryChanged = (msg.geometry_changed as string[]) || [];

            console.log('[BlenderStore] Depsgraph update:', changedObjects.length, 'objects changed,', geometryChanged.length, 'geometry changed');

            // Always refresh scene data (lightweight)
            get().requestScene();

            // Only refresh geometry for objects that changed geometry
            if (geometryChanged.length > 0) {
              // Debounce geometry requests
              if (geometryDebounceTimeout) {
                clearTimeout(geometryDebounceTimeout);
              }
              geometryDebounceTimeout = setTimeout(() => {
                console.log('[BlenderStore] Refreshing geometry for:', geometryChanged);
                get().requestGeometry(geometryChanged);
              }, 150); // 150ms debounce
            }
          } else if (msg.event === 'connected') {
            // Blender connected - request initial scene
            console.log('[BlenderStore] Blender connected - requesting initial scene');
            get().requestScene();
          }
          break;
      }
    },
  }))
);

// Initialize WebSocket listeners (call once on app start)
export async function initBlenderConnection() {
  // Clean up existing listeners
  unlisteners.forEach((unlisten) => unlisten());
  unlisteners = [];

  const store = useBlenderStore.getState();

  // Listen for connection status
  const unlistenStatus = await listen<string>('ws:status', (event) => {
    console.log('[BlenderStore] WS status:', event.payload);
    if (event.payload === 'connected') {
      store._setConnectionStatus('connected');
      // Request scene and capabilities when WS connects
      console.log('[BlenderStore] WS connected - requesting initial scene and capabilities');
      setTimeout(() => {
        const currentStore = useBlenderStore.getState();
        currentStore.requestScene();
        currentStore.requestCapabilities();
      }, 100); // Small delay to ensure connection is stable
    } else {
      store._setConnectionStatus('disconnected');
      // Clear scene data, geometry cache, and capabilities on disconnect
      useBlenderStore.setState({
        sceneData: null,
        geometryCache: {},
        capabilities: null,
        capabilitiesLoading: false,
      });
    }
  });
  unlisteners.push(unlistenStatus);

  // Listen for messages
  const unlistenMessage = await listen<string>('ws:message', (event) => {
    try {
      const data = JSON.parse(event.payload) as BlenderMessage;
      store._processMessage(data);
    } catch (e) {
      console.error('[BlenderStore] Failed to parse message:', e);
    }
  });
  unlisteners.push(unlistenMessage);

  console.log('[BlenderStore] Initialized WebSocket listeners');
}

// Cleanup function
export function cleanupBlenderConnection() {
  unlisteners.forEach((unlisten) => unlisten());
  unlisteners = [];

  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = null;
  }
}
