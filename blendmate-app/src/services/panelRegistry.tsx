/**
 * Panel registry for BlendMate
 * Central registry of all available panels in the application
 */

import { ComponentType } from 'react';
import { PanelDefinition, PanelId, PanelProps } from '../types/panels';
import NodesHelpPanel from '../components/panels/NodesHelpPanel';
import EventsLogPanel from '../components/panels/EventsLogPanel';
import ChatPanel from '../components/panels/ChatPanel';

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
    component: (() => (
      <div className="bg-white/5 rounded-2xl p-8 text-center italic opacity-30">
        Stats panel coming soon...
      </div>
    )) as ComponentType<PanelProps>,
    defaultVisible: false,
  },
};

/**
 * Get initial panel states from registry
 */
export function getInitialPanelStates() {
  return Object.values(PANEL_REGISTRY).map((panel) => ({
    id: panel.id,
    isVisible: panel.defaultVisible ?? false,
    isFocused: panel.id === 'nodes-help', // First visible panel is focused by default
    placement: panel.defaultPlacement,
  }));
}
