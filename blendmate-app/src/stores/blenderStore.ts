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

// Protocol v1 envelope structure
type ProtocolEnvelope = {
  v: number;
  type: string;
  ts: number;
  id: string;
  source: string;
  reply_to?: string;
  body: Record<string, unknown>;
};

// Protocol v1 error structure
type ProtocolError = {
  code: string;
  message: string;
  data?: unknown;
};

// Current protocol version we support
const PROTOCOL_VERSION = 1;

// Legacy message format (for backwards compatibility)
type LegacyMessage = {
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

// Union type for incoming messages
type BlenderMessage = ProtocolEnvelope | LegacyMessage;

// Type guard to check if message is new envelope format
function isEnvelope(msg: BlenderMessage): msg is ProtocolEnvelope {
  return 'v' in msg && 'body' in msg && typeof msg.v === 'number';
}

// Extract normalized message data from envelope or legacy format
function unwrapMessage(msg: BlenderMessage): {
  type: string;
  body: Record<string, unknown>;
  replyTo?: string;
  legacyEvent?: string;
} {
  if (isEnvelope(msg)) {
    // New envelope format
    const body = msg.body as Record<string, unknown>;
    // Check for legacy event in body._legacy
    const legacy = body._legacy as LegacyMessage | undefined;
    return {
      type: msg.type,
      body,
      replyTo: msg.reply_to,
      legacyEvent: legacy?.event as string | undefined,
    };
  } else {
    // Legacy format - normalize to similar structure
    return {
      type: msg.type,
      body: msg as Record<string, unknown>,
      legacyEvent: msg.event,
    };
  }
}

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

  // Protocol version (0 = legacy, 1 = protocol v1)
  protocolVersion: number;

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
  upgradeProtocol: () => Promise<boolean>;

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
    protocolVersion: 0, // Start in legacy mode
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

    // Upgrade protocol to v1 (sends legacy request, receives legacy response)
    upgradeProtocol: async (): Promise<boolean> => {
      const state = get();

      // Skip if already upgraded
      if (state.protocolVersion >= PROTOCOL_VERSION) {
        console.log('[BlenderStore] Already at protocol v' + state.protocolVersion);
        return true;
      }

      const id = `req-${++state._requestIdCounter}`;
      const message = JSON.stringify({
        type: 'request',
        id,
        action: 'protocol.upgrade',
        params: { version: PROTOCOL_VERSION },
      });

      return new Promise((resolve) => {
        // Set up timeout
        const timeout = setTimeout(() => {
          const pending = state._pendingCommands.get(id);
          if (pending) {
            state._pendingCommands.delete(id);
            console.warn('[BlenderStore] Protocol upgrade timeout - staying in legacy mode');
            resolve(false);
          }
        }, 5000); // 5 second timeout for upgrade

        // Track the pending request
        state._pendingCommands.set(id, {
          resolve: (response: CommandResponse) => {
            if (response.success) {
              const data = response.data as { version?: number } | undefined;
              const version = data?.version ?? PROTOCOL_VERSION;
              set({ protocolVersion: version });
              console.log('[BlenderStore] Protocol upgraded to v' + version);
              resolve(true);
            } else {
              console.warn('[BlenderStore] Protocol upgrade failed:', response.error);
              resolve(false);
            }
          },
          reject: () => resolve(false),
          timeout,
        });

        // Send the upgrade request
        invoke('send_to_blender', { message })
          .then(() => {
            console.log('[BlenderStore] Sent protocol.upgrade request');
          })
          .catch((e) => {
            clearTimeout(timeout);
            state._pendingCommands.delete(id);
            console.error('[BlenderStore] Failed to send protocol.upgrade:', e);
            resolve(false);
          });
      });
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
      // Unwrap envelope if present
      const unwrapped = unwrapMessage(msg);
      const { type, body, replyTo, legacyEvent } = unwrapped;

      console.log('[BlenderStore] Processing message:', { type, legacyEvent, bodyKeys: Object.keys(body) });

      // Extract filepath from body
      const filepath = (body.filepath || body.filename) as string | undefined;
      if (filepath && filepath !== '(unsaved)') {
        set({ filepath });
      } else if (filepath === '(unsaved)') {
        set({ filepath: null });
      }

      // Handle new protocol type strings (event.scene.*, event.depsgraph.*, etc.)
      // Also handle legacy type strings for backwards compatibility

      // Heartbeat
      if (type === 'heartbeat') {
        if (heartbeatTimeout) {
          clearTimeout(heartbeatTimeout);
        }

        set({
          connectionStatus: 'live',
          lastHeartbeat: Date.now(),
        });

        heartbeatTimeout = setTimeout(() => {
          const current = get().connectionStatus;
          if (current === 'live') {
            set({ connectionStatus: 'connected' });
          }
        }, 10000);
        return;
      }

      // Node context change
      if (type === 'context' || type === 'event.node.active_changed') {
        const nodeId = (body.node_id || body.node_id) as string | undefined;
        if (nodeId) {
          set({ activeNodeId: nodeId });
        }
        return;
      }

      // Response handling
      if (type === 'response') {
        // Debug: log full response structure
        console.log('[BlenderStore] Response received:', {
          replyTo,
          bodyKeys: Object.keys(body),
          action: body.action,
          hasData: !!body.data,
        });

        // Get request ID from envelope reply_to or legacy id field
        const requestId = replyTo || (body.id as string | undefined);

        // Check if this is a response to a pending command
        if (requestId && get()._pendingCommands.has(requestId)) {
          const pending = get()._pendingCommands.get(requestId)!;
          clearTimeout(pending.timeout);
          get()._pendingCommands.delete(requestId);

          // Handle new protocol response format (ok/error)
          if ('ok' in body) {
            if (body.ok) {
              pending.resolve({
                success: true,
                data: body.data,
                warnings: body.warnings as string[] | undefined,
              });
            } else {
              const error = body.error as ProtocolError | undefined;
              pending.resolve({
                success: false,
                error: error?.message || 'Unknown error',
              });
            }
          } else {
            // Legacy response format
            if (body.error) {
              pending.resolve({ success: false, error: body.error as string });
            } else {
              pending.resolve({
                success: true,
                data: body.data,
                warnings: body.warnings as string[] | undefined,
              });
            }
          }
        }

        // Also handle built-in responses
        const responseData = body.data as Record<string, unknown> | undefined;
        const action = body.action as string | undefined;

        if (action === 'get_scene' && responseData) {
          console.log('[BlenderStore] Received scene data');
          const sceneData = responseData as unknown as BlenderSceneData;
          set({ sceneData });

          // Types that can be converted to mesh geometry
          // CURVE = legacy Bezier/NURBS, CURVES = new hair curves (Blender 3.3+)
          const GEOMETRY_TYPES = ['MESH', 'CURVE', 'CURVES', 'SURFACE', 'FONT', 'META'];

          // Auto-request geometry for all convertible objects (if not already loading)
          const geometryObjects = Object.entries(sceneData.objects)
            .filter(([_, obj]) => GEOMETRY_TYPES.includes(obj.type))
            .map(([name]) => name);

          const currentCache = get().geometryCache;
          const missingGeometry = geometryObjects.filter(name => !currentCache[name]);

          if (missingGeometry.length > 0 && !get().geometryLoading) {
            console.log('[BlenderStore] Auto-requesting geometry for', missingGeometry.length, 'objects:', missingGeometry);
            get().requestGeometry(missingGeometry);
          }
        } else if (action === 'get_geometry' && responseData) {
          const geometryData = responseData as Record<string, CachedGeometry & { name?: string }>;
          const newCache: Record<string, CachedGeometry> = { ...get().geometryCache };

          for (const [name, geo] of Object.entries(geometryData)) {
            const cached: CachedGeometry = {
              vertices: geo.vertices || [],
              edges: geo.edges || [],
              triangles: geo.triangles || [],
              vertex_count: geo.vertex_count || 0,
              edge_count: geo.edge_count || 0,
              triangle_count: geo.triangle_count || 0,
              skipped: geo.skipped,
              reason: geo.reason,
            };
            newCache[name] = cached;

            // Debug log each object's geometry
            console.log(`[BlenderStore] Geometry "${name}":`, {
              vertices: cached.vertices.length,
              edges: cached.edges.length,
              triangles: cached.triangles?.length || 0,
              skipped: cached.skipped,
              reason: cached.reason,
            });
          }

          console.log('[BlenderStore] Cached geometry for', Object.keys(geometryData).length, 'objects');
          set({ geometryCache: newCache, geometryLoading: false });
        } else if (action === 'get_capabilities' && responseData) {
          const capabilities = responseData as unknown as BlenderCapabilities;
          console.log('[BlenderStore] Received capabilities:',
            Object.keys(capabilities.operators).length, 'operators,',
            Object.keys(capabilities.modifiers).length, 'modifiers'
          );
          set({ capabilities, capabilitiesLoading: false });
        }
        return;
      }

      // Event handling - support both new and legacy type strings
      const eventType = type.startsWith('event.') ? type : legacyEvent;

      // File loaded
      if (eventType === 'event.scene.file_loaded' || eventType === 'load_post') {
        console.log('[BlenderStore] File loaded - clearing cache and refreshing scene');
        set({ geometryCache: {} });
        get().requestScene();
        return;
      }

      // File saved
      if (eventType === 'event.scene.file_saved' || eventType === 'save_post') {
        console.log('[BlenderStore] File saved - refreshing scene');
        get().requestScene();
        return;
      }

      // Depsgraph update
      if (eventType === 'event.depsgraph.updated' || eventType === 'depsgraph_update') {
        // Support both new field names (changed_object_ids) and legacy (changed_objects)
        const changedObjects = (body.changed_object_ids || body.changed_objects || []) as string[];
        const geometryChanged = (body.geometry_changed_ids || body.geometry_changed || []) as string[];
        const batchSize = body.batch_size as number | undefined;

        console.log('[BlenderStore] Depsgraph update:',
          changedObjects.length, 'objects changed,',
          geometryChanged.length, 'geometry changed',
          batchSize ? `(batch of ${batchSize})` : ''
        );

        // Always refresh scene data (lightweight)
        get().requestScene();

        // Only refresh geometry for objects that changed geometry
        if (geometryChanged.length > 0) {
          if (geometryDebounceTimeout) {
            clearTimeout(geometryDebounceTimeout);
          }
          geometryDebounceTimeout = setTimeout(() => {
            console.log('[BlenderStore] Refreshing geometry for:', geometryChanged);
            get().requestGeometry(geometryChanged);
          }, 150);
        }
        return;
      }

      // Connected event
      if (eventType === 'event.scene.connected' || eventType === 'connected') {
        // Check if this is a v1 envelope (upgrade confirmation)
        if (isEnvelope(msg)) {
          console.log('[BlenderStore] Received v1 event.scene.connected - protocol upgrade confirmed');
          // Protocol upgrade was successful, v1 event is the confirmation
        } else {
          // Legacy connected event - attempt protocol upgrade
          console.log('[BlenderStore] Blender connected (legacy) - attempting protocol upgrade');
          get().upgradeProtocol().then((success) => {
            if (success) {
              console.log('[BlenderStore] Protocol upgrade successful');
            } else {
              console.log('[BlenderStore] Staying in legacy mode');
            }
            // Request scene after upgrade attempt
            get().requestScene();
          });
          return; // Don't request scene yet, will be done after upgrade
        }
        get().requestScene();
        return;
      }

      // Frame change (new protocol)
      if (eventType === 'event.timeline.frame_changed' || eventType === 'frame_change') {
        // Currently no special handling needed, but could update UI
        return;
      }

      // Unknown event type - log for debugging
      if (type.startsWith('event.') || type === 'event') {
        console.log('[BlenderStore] Unhandled event type:', type, eventType);
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
      // Clear scene data, geometry cache, capabilities, and reset protocol on disconnect
      useBlenderStore.setState({
        sceneData: null,
        geometryCache: {},
        capabilities: null,
        capabilitiesLoading: false,
        protocolVersion: 0, // Reset to legacy mode
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

  // Try to request scene after a delay - handles case where Blender was already connected
  // before listeners were set up (e.g., app hot-reload or reconnection race)
  // Use multiple attempts with increasing delays
  const probeAttempts = [500, 1500, 3000];
  probeAttempts.forEach((delay, index) => {
    setTimeout(() => {
      const currentStore = useBlenderStore.getState();
      // Only try if we don't have scene data yet
      if (!currentStore.sceneData) {
        console.log(`[BlenderStore] Probing for existing connection (attempt ${index + 1}/${probeAttempts.length})...`);
        currentStore.requestScene().catch(() => {
          // Silently ignore - not connected yet
        });
      }
    }, delay);
  });
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
