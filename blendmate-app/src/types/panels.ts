/**
 * Panel system types for BlendMate
 * Defines the structure for the panel-based UI model
 */

import { ComponentType } from 'react';

export type PanelId = 'nodes-help' | 'events-log' | 'chat' | 'stats';

export type PanelPlacement = 'main' | 'sidebar' | 'bottom';

export interface PanelProps {
  // Common props that all panels receive
  isVisible: boolean;
  isFocused: boolean;
  // Index signature allows panels to accept panel-specific props
  // This is an intentional trade-off for extensibility in the MVP
  // Future enhancement: Consider discriminated union types for full type safety
  [key: string]: unknown;
}

export interface PanelDefinition {
  id: PanelId;
  title: string;
  icon?: string; // emoji or icon identifier
  defaultPlacement: PanelPlacement;
  component: ComponentType<PanelProps>;
  defaultVisible?: boolean;
}

export interface PanelState {
  id: PanelId;
  isVisible: boolean;
  isFocused: boolean;
  placement: PanelPlacement;
}
