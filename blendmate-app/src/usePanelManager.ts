/**
 * Hook for managing panel visibility and focus state
 */

import { useState, useCallback } from 'react';
import { PanelId, PanelState } from './types/panels';
import { getInitialPanelStates } from './services/panelRegistry';

export function usePanelManager() {
  const [panelStates, setPanelStates] = useState<PanelState[]>(getInitialPanelStates());

  const showPanel = useCallback((panelId: PanelId) => {
    setPanelStates((prev) =>
      prev.map((panel) => ({
        ...panel,
        isVisible: panel.id === panelId ? true : panel.isVisible,
        isFocused: panel.id === panelId,
      }))
    );
  }, []);

  const hidePanel = useCallback((panelId: PanelId) => {
    setPanelStates((prev) =>
      prev.map((panel) => ({
        ...panel,
        isVisible: panel.id === panelId ? false : panel.isVisible,
        isFocused: panel.id === panelId ? false : panel.isFocused,
      }))
    );
  }, []);

  const togglePanel = useCallback((panelId: PanelId) => {
    setPanelStates((prev) => {
      const panel = prev.find((p) => p.id === panelId);
      if (!panel) return prev;

      if (panel.isVisible) {
        // If already visible and focused, hide it
        if (panel.isFocused) {
          return prev.map((p) => ({
            ...p,
            isVisible: p.id === panelId ? false : p.isVisible,
            isFocused: p.id === panelId ? false : p.isFocused,
          }));
        }
        // If visible but not focused, just focus it
        return prev.map((p) => ({
          ...p,
          isFocused: p.id === panelId,
        }));
      }
      // If not visible, show and focus it
      return prev.map((p) => ({
        ...p,
        isVisible: p.id === panelId ? true : p.isVisible,
        isFocused: p.id === panelId,
      }));
    });
  }, []);

  const focusPanel = useCallback((panelId: PanelId) => {
    setPanelStates((prev) =>
      prev.map((panel) => ({
        ...panel,
        isFocused: panel.id === panelId,
      }))
    );
  }, []);

  const getPanelState = useCallback(
    (panelId: PanelId) => {
      return panelStates.find((panel) => panel.id === panelId);
    },
    [panelStates]
  );

  const visiblePanels = panelStates.filter((panel) => panel.isVisible);
  const focusedPanel = panelStates.find((panel) => panel.isFocused);

  return {
    panelStates,
    showPanel,
    hidePanel,
    togglePanel,
    focusPanel,
    getPanelState,
    visiblePanels,
    focusedPanel,
  };
}
