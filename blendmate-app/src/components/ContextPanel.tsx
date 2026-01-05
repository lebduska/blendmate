import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { Info, Terminal, Settings, Layers, ScanLine } from "lucide-react";
import { ScrollArea, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import ContextSummary from "@/components/ContextSummary";
import PropertiesPanel from "@/components/PropertiesPanel";
import InfluenceInspector from "@/components/InfluenceInspector";
import { EventsLogPanel } from "@/components/panels";

type TabId = 'influence' | 'context' | 'console' | 'properties' | 'layers';

type Tab = {
  id: TabId;
  labelKey: string;
  icon: React.ReactNode;
};

const TABS: Tab[] = [
  { id: 'influence', labelKey: 'panels.influence', icon: <ScanLine className="size-4" /> },
  { id: 'context', labelKey: 'panels.context', icon: <Info className="size-4" /> },
  { id: 'console', labelKey: 'panels.console', icon: <Terminal className="size-4" /> },
  { id: 'properties', labelKey: 'panels.properties', icon: <Settings className="size-4" /> },
  { id: 'layers', labelKey: 'panels.layers', icon: <Layers className="size-4" /> },
];

interface ContextPanelProps {
  selectedId: string | null;
  currentNodeId?: string;
}

export default function ContextPanel({ selectedId, currentNodeId: _currentNodeId }: ContextPanelProps) {
  // _currentNodeId is reserved for future GN node context display
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('influence');

  const handleTabClick = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  const activeTabData = TABS.find(tab => tab.id === activeTab);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="panel-header">
        {activeTabData?.icon}
        <span className="panel-header__title">
          {activeTabData ? t(activeTabData.labelKey) : ''}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Tab Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'influence' && (
            <InfluenceInspector selectedObjectName={selectedId?.startsWith('obj_') ? selectedId.slice(4) : null} />
          )}

          {activeTab === 'context' && (
            <ScrollArea className="h-full p-4">
              <ContextSummary selectedId={selectedId} />
            </ScrollArea>
          )}

          {activeTab === 'console' && (
            <EventsLogPanel isVisible={true} isFocused={false} />
          )}

          {activeTab === 'properties' && (
            <PropertiesPanel currentNodeId={selectedId || ''} />
          )}

          {activeTab === 'layers' && (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              <span>{t('panels.layers')} - {t('common.comingSoon')}</span>
            </div>
          )}
        </div>

        {/* Vertical Tab Bar (Right) */}
        <div
          className="flex flex-col shrink-0 border-l pt-2"
          style={{
            background: 'var(--islands-color-background-tertiary)',
            borderColor: 'var(--islands-color-border-subtle)',
          }}
        >
          {TABS.map((tab) => (
            <Tooltip key={tab.id} delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 transition-all",
                    "hover:bg-[var(--islands-color-background-elevated)]",
                    activeTab === tab.id
                      ? "text-[var(--blender-orange-light)] bg-[var(--islands-color-background-secondary)]"
                      : "text-[var(--islands-color-text-secondary)]"
                  )}
                  aria-label={t(tab.labelKey)}
                >
                  {tab.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">{t(tab.labelKey)}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
