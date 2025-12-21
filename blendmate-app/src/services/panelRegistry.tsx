/**
 * Panel registry for BlendMate
 * Central registry of all available panels in the application
 * 
 * Note: Component types are cast to ComponentType<PanelProps> to allow
 * panels with extended props to be stored in a common registry.
 * Each panel receives its specific props via the index signature in PanelProps.
 * This is an intentional trade-off between type safety and extensibility.
 * 
 * Future enhancement: Consider using a generic registry with discriminated unions
 * for full type safety while maintaining flexibility.
 */

import { ComponentType } from 'react';
import { PanelDefinition, PanelId, PanelProps } from '../types/panels';
import NodesHelpPanel from '../components/panels/NodesHelpPanel';
import EventsLogPanel from '../components/panels/EventsLogPanel';
import ChatPanel from '../components/panels/ChatPanel';
import StatsPanel from '../components/panels/StatsPanel';

export const PANEL_REGISTRY: Record<PanelId, PanelDefinition> = {
  'nodes-help': {
    id: 'nodes-help',
    title: 'Nodes Help',
    icon: '📍',
    defaultPlacement: 'main',
    component: NodesHelpPanel as ComponentType<PanelProps>,
    defaultVisible: true,
  },
  'events-log': {
    id: 'events-log',
    title: 'Events Log',
    icon: '📋',
    defaultPlacement: 'main',
    component: EventsLogPanel as ComponentType<PanelProps>,
    defaultVisible: false,
  },
  'chat': {
    id: 'chat',
    title: 'Chat',
    icon: '💬',
    defaultPlacement: 'main',
    component: ChatPanel as ComponentType<PanelProps>,
    defaultVisible: false,
  },
  'stats': {
    id: 'stats',
    title: 'Stats',
    icon: '📊',
    defaultPlacement: 'main',
    component: StatsPanel as ComponentType<PanelProps>,
    defaultVisible: false,
  },
};

/**
 * Get initial panel states from registry
 */
export function getInitialPanelStates() {
  const states = Object.values(PANEL_REGISTRY).map((panel) => ({
    id: panel.id,
    isVisible: panel.defaultVisible ?? false,
    isFocused: false, // Will be set below
    placement: panel.defaultPlacement,
  }));
  
  // Focus the first visible panel
  const firstVisibleIndex = states.findIndex((state) => state.isVisible);
  if (firstVisibleIndex !== -1) {
    states[firstVisibleIndex].isFocused = true;
  }
  
  return states;
}
