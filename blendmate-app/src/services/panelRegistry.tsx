/**
 * Panel registry for BlendMate
 * Central registry of all available panels in the application
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
  return Object.values(PANEL_REGISTRY).map((panel, index) => ({
    id: panel.id,
    isVisible: panel.defaultVisible ?? false,
    // First visible panel is focused by default
    isFocused: (panel.defaultVisible ?? false) && index === 0,
    placement: panel.defaultPlacement,
  }));
}
