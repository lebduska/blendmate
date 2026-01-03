/**
 * Hook for binding to a Blender property with optimistic updates
 *
 * Provides a React-like state interface for Blender properties:
 * - Optimistic updates (UI updates immediately)
 * - Debounced writes to Blender (for smooth dragging)
 * - Automatic rollback on error
 *
 * Example:
 *   const [location, setLocation, { isPending, error }] = useBlenderProperty<[number, number, number]>(
 *     "objects['Cube']",
 *     "location",
 *     [0, 0, 0]
 *   );
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useBlenderStore } from '@/stores/blenderStore';

type PropertyState = {
  isPending: boolean;
  error: string | null;
  lastSynced: number | null;
};

type UseBlenderPropertyResult<T> = [
  value: T,
  setValue: (newValue: T) => void,
  state: PropertyState
];

type UseBlenderPropertyOptions = {
  /** Debounce delay in ms for writes (default: 50) */
  debounceMs?: number;
  /** Whether to sync from Blender on mount (default: false) */
  syncOnMount?: boolean;
  /** Callback when value is successfully synced to Blender */
  onSync?: () => void;
  /** Callback when sync fails */
  onError?: (error: string) => void;
};

export function useBlenderProperty<T>(
  target: string,
  path: string,
  initialValue: T,
  options: UseBlenderPropertyOptions = {}
): UseBlenderPropertyResult<T> {
  const {
    debounceMs = 50,
    syncOnMount = false,
    onSync,
    onError,
  } = options;

  const sendCommand = useBlenderStore((s) => s.sendCommand);
  const connectionStatus = useBlenderStore((s) => s.connectionStatus);

  const [value, setValueInternal] = useState<T>(initialValue);
  const [state, setState] = useState<PropertyState>({
    isPending: false,
    error: null,
    lastSynced: null,
  });

  // Track the last value we tried to sync
  const lastSyncedValue = useRef<T>(initialValue);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial value from Blender
  useEffect(() => {
    if (!syncOnMount || connectionStatus === 'disconnected') return;

    sendCommand<T>('property.get', target, { path }).then((response) => {
      if (response.success && response.data !== undefined) {
        setValueInternal(response.data);
        lastSyncedValue.current = response.data;
        setState((s) => ({ ...s, lastSynced: Date.now() }));
      }
    });
  }, [syncOnMount, connectionStatus, sendCommand, target, path]);

  // Sync value to Blender with debouncing
  const syncToBlender = useCallback(
    async (newValue: T) => {
      // Skip if not connected
      if (connectionStatus === 'disconnected') {
        setState((s) => ({ ...s, error: 'Not connected' }));
        return;
      }

      setState((s) => ({ ...s, isPending: true, error: null }));

      const response = await sendCommand<T>('property.set', target, {
        path,
        value: newValue,
      });

      if (response.success) {
        lastSyncedValue.current = newValue;
        setState({
          isPending: false,
          error: null,
          lastSynced: Date.now(),
        });
        onSync?.();
      } else {
        // Rollback to last known good value
        setValueInternal(lastSyncedValue.current);
        setState({
          isPending: false,
          error: response.error,
          lastSynced: state.lastSynced,
        });
        onError?.(response.error);
      }
    },
    [connectionStatus, sendCommand, target, path, state.lastSynced, onSync, onError]
  );

  // Debounced setter
  const setValue = useCallback(
    (newValue: T) => {
      // Optimistic update
      setValueInternal(newValue);

      // Clear existing debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Schedule sync to Blender
      debounceTimer.current = setTimeout(() => {
        syncToBlender(newValue);
      }, debounceMs);
    },
    [debounceMs, syncToBlender]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return [value, setValue, state];
}

/**
 * Hook for immediate (non-debounced) property updates
 * Use this for discrete changes like toggles, not for continuous values
 */
export function useBlenderPropertyImmediate<T>(
  target: string,
  path: string,
  initialValue: T,
  options: Omit<UseBlenderPropertyOptions, 'debounceMs'> = {}
): UseBlenderPropertyResult<T> {
  return useBlenderProperty(target, path, initialValue, {
    ...options,
    debounceMs: 0,
  });
}

export default useBlenderProperty;
