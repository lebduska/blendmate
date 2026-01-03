/**
 * Hook for sending commands to Blender
 *
 * Provides a simple interface for calling Blender commands:
 * - property.set / property.get
 * - object.select / object.rename
 * - operator.call
 */

import { useCallback } from 'react';
import { useBlenderStore, CommandResponse } from '@/stores/blenderStore';

export function useBlenderCommand() {
  const sendCommand = useBlenderStore((s) => s.sendCommand);
  const connectionStatus = useBlenderStore((s) => s.connectionStatus);

  const isConnected = connectionStatus !== 'disconnected';

  // Generic command sender
  const send = useCallback(
    async <T = unknown>(
      action: string,
      target: string,
      params?: Record<string, unknown>
    ): Promise<CommandResponse<T>> => {
      return sendCommand<T>(action, target, params);
    },
    [sendCommand]
  );

  // Convenience methods

  /**
   * Get a property value from Blender
   * @param target - Path to object, e.g. "objects['Cube']"
   * @param path - Property path, e.g. "location" or "modifiers[0].show_viewport"
   */
  const getProperty = useCallback(
    async <T = unknown>(target: string, path: string): Promise<CommandResponse<T>> => {
      return sendCommand<T>('property.get', target, { path });
    },
    [sendCommand]
  );

  /**
   * Set a property value in Blender
   * @param target - Path to object, e.g. "objects['Cube']"
   * @param path - Property path, e.g. "location" or "location[0]"
   * @param value - The value to set
   */
  const setProperty = useCallback(
    async <T = unknown>(
      target: string,
      path: string,
      value: unknown
    ): Promise<CommandResponse<T>> => {
      return sendCommand<T>('property.set', target, { path, value });
    },
    [sendCommand]
  );

  /**
   * Set multiple properties in a single undo step
   * @param target - Path to object
   * @param properties - Array of {path, value} objects
   */
  const setPropertiesBatch = useCallback(
    async (
      target: string,
      properties: Array<{ path: string; value: unknown }>
    ): Promise<CommandResponse<{ count: number }>> => {
      return sendCommand('property.set_batch', target, { properties });
    },
    [sendCommand]
  );

  /**
   * Select an object in Blender
   * @param objectName - Object name (not full path)
   * @param mode - "set" (replace), "add", "remove", "toggle"
   */
  const selectObject = useCallback(
    async (
      objectName: string,
      mode: 'set' | 'add' | 'remove' | 'toggle' = 'set'
    ): Promise<CommandResponse> => {
      return sendCommand('object.select', objectName, { mode, active: true });
    },
    [sendCommand]
  );

  /**
   * Rename an object in Blender
   * @param objectName - Current object name
   * @param newName - New name
   */
  const renameObject = useCallback(
    async (
      objectName: string,
      newName: string
    ): Promise<CommandResponse<{ name: string }>> => {
      return sendCommand('object.rename', objectName, { name: newName });
    },
    [sendCommand]
  );

  /**
   * Call a Blender operator
   * @param operator - Operator path, e.g. "object.duplicate" or "mesh.primitive_cube_add"
   * @param params - Operator parameters
   */
  const callOperator = useCallback(
    async (
      operator: string,
      params?: Record<string, unknown>
    ): Promise<CommandResponse<{ result: string }>> => {
      return sendCommand('operator.call', operator, params);
    },
    [sendCommand]
  );

  return {
    isConnected,
    send,
    getProperty,
    setProperty,
    setPropertiesBatch,
    selectObject,
    renameObject,
    callOperator,
  };
}

export default useBlenderCommand;
