import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { changeLanguage, getCurrentLanguage } from "./i18n";
import { useBlenderStore } from "./stores/blenderStore";
import { ScenePanel, ContextPanel } from "@/components";
import { SceneViewer, Mate, type ViewMode } from "@/components/bench";
import { ListTree, Minus, Square, X, Minimize2, FileBox, RefreshCw, Radar, UploadCloud, Languages, Check, Bot, Eye, PanelLeft, PanelRight, PanelBottom } from "lucide-react";
import BackgroundPaths from "@/components/ui/BackgroundPaths";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ScrollArea, Tooltip, TooltipTrigger, TooltipContent, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui";

type FileInfo = {
  path: string;
  filename: string;
  size_bytes: number;
  size_human: string;
  modified: string | null;
};

export default function App() {
  const { t } = useTranslation();

  // Zustand store - reactive subscriptions
  const connectionStatus = useBlenderStore((s) => s.connectionStatus);
  const sceneData = useBlenderStore((s) => s.sceneData);
  const filepath = useBlenderStore((s) => s.filepath);
  const activeNodeId = useBlenderStore((s) => s.activeNodeId);
  const geometryCache = useBlenderStore((s) => s.geometryCache);
  const requestScene = useBlenderStore((s) => s.requestScene);
  const requestGeometry = useBlenderStore((s) => s.requestGeometry);
  const sendCommand = useBlenderStore((s) => s.sendCommand);

  // Reload addon handler
  const handleReloadAddon = useCallback(async () => {
    console.log('[App] Reloading addon...');
    const result = await sendCommand('addon.reload', '', {});
    if (result.success) {
      console.log('[App] Addon reloaded successfully');
    } else {
      console.error('[App] Addon reload failed:', result.error);
    }
  }, [sendCommand]);

  // Local UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [observeIncoming, setObserveIncoming] = useState(false);
  const [observeOutgoing, setObserveOutgoing] = useState(true);
  const [currentLang, setCurrentLang] = useState<'en' | 'cs'>(getCurrentLanguage());
  const [viewMode, setViewMode] = useState<ViewMode>('wireframe');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const currentNodeId = activeNodeId ?? "GeometryNodeCollectionInfo";

  const handleLanguageChange = useCallback((lang: 'en' | 'cs') => {
    changeLanguage(lang);
    setCurrentLang(lang);
  }, []);

  // Auto-load scene when connected but outliner is empty
  useEffect(() => {
    if (connectionStatus !== 'disconnected' && !sceneData) {
      requestScene();
    }
  }, [connectionStatus, sceneData, requestScene]);

  // Auto-load geometry when scene data arrives (only once per scene)
  const geometryRequestedRef = useRef(false);
  useEffect(() => {
    if (sceneData && !geometryRequestedRef.current) {
      geometryRequestedRef.current = true;
      console.log('[App] Scene loaded, requesting geometry (once)...');
      requestGeometry();
    }
  }, [sceneData, requestGeometry]);

  // Reset geometry request flag when connection drops
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      geometryRequestedRef.current = false;
    }
  }, [connectionStatus]);

  // Sync Blender active object into the UI selection when incoming is enabled
  useEffect(() => {
    if (!observeIncoming || !sceneData) return;
    const activeObjectName = sceneData.active_object;
    const nextSelectedId = activeObjectName ? `obj_${activeObjectName}` : null;
    if (nextSelectedId !== selectedId) {
      setSelectedId(nextSelectedId);
    }
  }, [observeIncoming, sceneData, selectedId]);

  // Window control handlers
  const handleMinimize = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const appWindow = getCurrentWindow();
    const currentFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!currentFullscreen);
    setIsFullscreen(!currentFullscreen);
  }, []);

  const handleClose = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  }, []);

  const handleRevealFile = useCallback(async () => {
    if (filepath) {
      await revealItemInDir(filepath);
    }
  }, [filepath]);

  // Extract just the filename from the full path
  const filename = filepath ? filepath.split('/').pop() : null;

  // Fetch file info when filepath changes
  useEffect(() => {
    if (filepath) {
      invoke<FileInfo>('get_file_info', { path: filepath })
        .then(setFileInfo)
        .catch((err) => {
          console.error('Failed to get file info:', err);
          setFileInfo(null);
        });
    } else {
      setFileInfo(null);
    }
  }, [filepath]);

  // Connection status colors
  const wsDotColor = connectionStatus === 'disconnected'
    ? 'var(--islands-color-error)'
    : connectionStatus === 'live'
      ? '#28c840'
      : 'var(--blender-orange-light)';

  const wsLabel = connectionStatus === 'live'
    ? t('connection.activeLabel')
    : connectionStatus === 'connected'
      ? t('connection.socketLabel')
      : t('connection.offlineLabel');
  const isConnected = connectionStatus !== 'disconnected';
  const isLive = connectionStatus === 'live';

  return (
    <div className={`relative flex flex-col h-screen text-foreground overflow-hidden font-sans ${isFullscreen ? '' : 'rounded-lg'}`} style={{ background: 'var(--islands-color-background-primary)' }}>
      {/* Base background layer */}
      <div className="absolute inset-0 -z-20 bg-background" aria-hidden />
      <BackgroundPaths />

      {/* Custom Titlebar - IDEA style with custom window controls */}
      <header
        className={`h-10 flex items-center shrink-0 ${isFullscreen ? '' : 'rounded-t-lg'}`}
        style={{
          borderBottom: '1px solid var(--islands-color-border-subtle)',
          background: 'var(--islands-color-background-secondary)',
        }}
        data-tauri-drag-region
      >
        {/* Left side: Window controls (IDEA style - dormant until hover) */}
        <div className="flex items-center gap-0.5 pl-3 pr-4">
          <button
            onClick={handleClose}
            className="window-control window-control--close"
            aria-label="Close"
          >
            <X className="size-2.5" />
          </button>
          <button
            onClick={handleMinimize}
            className="window-control window-control--minimize"
            aria-label="Minimize"
          >
            <Minus className="size-2.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="window-control window-control--maximize"
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-2" /> : <Square className="size-2" />}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0" data-tauri-drag-region>
          <span
            className="text-xs font-semibold uppercase tracking-wide shrink-0"
            style={{ color: 'var(--blender-orange-light)' }}
            data-tauri-drag-region
          >
            Blendmate
          </span>
          {filepath && filename ? (
            <>
              <span
                className="text-xs shrink-0"
                style={{ color: 'var(--blender-blue-light)' }}
                data-tauri-drag-region
              >
                {t('titlebar.observes')}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRevealFile}
                    className="text-xs truncate hover:underline cursor-pointer"
                    style={{ color: 'var(--islands-color-text-secondary)' }}
                  >
                    ../{filename}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  <div className="flex gap-3">
                    <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded" style={{ background: 'var(--blender-orange-dark)' }}>
                      <FileBox className="size-5 text-white" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-medium truncate" style={{ color: 'var(--blender-orange-light)' }}>
                        {filename}
                      </span>
                      <span className="text-xs opacity-70 truncate">
                        {filepath}
                      </span>
                      {fileInfo && (
                        <div className="flex gap-3 text-xs opacity-60 mt-1">
                          <span>{fileInfo.size_human}</span>
                          {fileInfo.modified && <span>{fileInfo.modified}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <span
              className="text-xs"
              style={{ color: 'var(--islands-color-text-secondary)' }}
              data-tauri-drag-region
            >
              {t('connection.waitingForBlender')}
            </span>
          )}
        </div>

        {/* Panel toggle buttons */}
        <div className="flex items-center gap-1 pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowLeftPanel(v => !v)}
                className={`p-1.5 rounded transition-colors ${showLeftPanel ? 'text-[var(--blender-orange-light)]' : 'text-[var(--islands-color-text-secondary)] opacity-50'}`}
                style={{ background: showLeftPanel ? 'var(--islands-color-background-elevated)' : 'transparent' }}
              >
                <PanelLeft className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showLeftPanel ? 'Skrýt levý panel' : 'Zobrazit levý panel'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowRightPanel(v => !v)}
                className={`p-1.5 rounded transition-colors ${showRightPanel ? 'text-[var(--blender-orange-light)]' : 'text-[var(--islands-color-text-secondary)] opacity-50'}`}
                style={{ background: showRightPanel ? 'var(--islands-color-background-elevated)' : 'transparent' }}
              >
                <PanelRight className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showRightPanel ? 'Skrýt pravý panel' : 'Zobrazit pravý panel'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowChatPanel(v => !v)}
                className={`p-1.5 rounded transition-colors ${showChatPanel ? 'text-[var(--blender-orange-light)]' : 'text-[var(--islands-color-text-secondary)] opacity-50'}`}
                style={{ background: showChatPanel ? 'var(--islands-color-background-elevated)' : 'transparent' }}
              >
                <PanelBottom className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showChatPanel ? 'Skrýt AI chat' : 'Zobrazit AI chat'}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* App content (stack above beams) */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <main className="h-full min-w-0 flex flex-col overflow-hidden" style={{ padding: 'var(--islands-panel-gap)' }}>
          <ResizablePanelGroup orientation="horizontal" disableCursor className="h-full" style={{ gap: 'var(--islands-panel-gap)' }}>
            {/* Left Island: Scene Panel */}
            {showLeftPanel && (
              <>
                <ResizablePanel defaultSize={200} minSize={150} maxSize={400}>
                  <div className="island h-full flex flex-col">
                    <div className="panel-header justify-between">
                      <div className="flex items-center gap-2">
                        <ListTree className="panel-header__icon" />
                        <span className="panel-header__title">{t('panels.scene')}</span>
                      </div>
                      {isConnected && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => requestScene()}
                              className="p-1 rounded hover:bg-[var(--islands-color-background-elevated)] transition-colors"
                              style={{ color: 'var(--islands-color-text-secondary)' }}
                            >
                              <RefreshCw className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{t('connection.refreshScene')}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <ScrollArea className="flex-1 p-2">
                      <ScenePanel sceneData={sceneData} selectedId={selectedId} setSelectedId={setSelectedId} observeOutgoing={observeOutgoing} />
                    </ScrollArea>
                  </div>
                </ResizablePanel>

                <ResizableHandle />
              </>
            )}

            {/* Center: 3D Viewer + AI Chat (vertical split) */}
            <ResizablePanel defaultSize={400} minSize={200}>
              <ResizablePanelGroup orientation="vertical" className="h-full" style={{ gap: 'var(--islands-panel-gap)' }}>
                {/* 3D Viewer */}
                <ResizablePanel defaultSize={60} minSize={20}>
                  <div className="island h-full flex flex-col overflow-hidden">
                    <div className="panel-header justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="panel-header__icon" />
                        <span className="panel-header__title">{t('panels.bench')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={viewMode}
                          onChange={(e) => setViewMode(e.target.value as ViewMode)}
                          className="text-[10px] px-2 py-1 rounded border-0 cursor-pointer"
                          style={{
                            background: 'var(--islands-color-background-elevated)',
                            color: 'var(--islands-color-text-secondary)',
                          }}
                        >
                          <option value="wireframe">Wireframe</option>
                          <option value="solid">Solid</option>
                          <option value="xray">X-Ray</option>
                          <option value="matcap">Matcap</option>
                          <option value="points">Points</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                      <SceneViewer
                        objects={sceneData?.objects ?? {}}
                        geometryCache={geometryCache}
                        selectedObjectName={selectedId?.startsWith('obj_') ? selectedId.slice(4) : null}
                        viewMode={viewMode}
                        onSelectObject={(objectName) => setSelectedId(objectName ? `obj_${objectName}` : null)}
                      />
                    </div>
                  </div>
                </ResizablePanel>

                {/* AI Chat */}
                {showChatPanel && (
                  <>
                    <ResizableHandle orientation="vertical" />

                    <ResizablePanel defaultSize={40} minSize={15}>
                      <div className="island h-full flex flex-col overflow-hidden">
                        <div className="panel-header justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="panel-header__icon" />
                            <span className="panel-header__title">Mate</span>
                          </div>
                        </div>
                        <div className="flex-1 min-h-0">
                          <Mate
                            sceneData={sceneData}
                            selectedObjectName={selectedId?.startsWith('obj_') ? selectedId.slice(4) : null}
                          />
                        </div>
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>

            {/* Right Island: Context Panel with Vertical Tabs */}
            {showRightPanel && (
              <>
                <ResizableHandle />

                <ResizablePanel defaultSize={300} minSize={250} maxSize={500}>
                  <div className="island h-full overflow-hidden">
                    <ContextPanel currentNodeId={currentNodeId} selectedId={selectedId} />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </main>
      </div>

      {/* Mini Footer / Status */}
      <footer className="px-4 py-2 border-t flex items-center justify-between text-[10px] bg-card/30 backdrop-blur-xl">
        <div className="flex items-center gap-2 opacity-50 font-medium">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider border transition-colors hover:bg-white/10"
                  style={{
                    color: 'var(--islands-color-text-secondary)',
                    borderColor: 'var(--islands-color-border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span className="relative flex size-1.5">
                    {isLive && (
                      <span
                        className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60"
                        style={{ backgroundColor: wsDotColor }}
                      />
                    )}
                    <span
                      className="relative inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: wsDotColor }}
                    />
                  </span>
                  {wsLabel}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-[11px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex size-2 rounded-full"
                  style={{ backgroundColor: wsDotColor }}
                />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {wsLabel}
                </span>
              </div>
              <div>
                {connectionStatus === 'live'
                  ? t('connection.statusActive')
                  : connectionStatus === 'connected'
                    ? t('connection.statusConnected')
                    : t('connection.statusDisconnected')}
              </div>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-1 ml-2 rounded-full px-1 py-0.5 border transition-colors hover:bg-white/10"
            style={{
              borderColor: 'var(--islands-color-border-subtle)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setObserveIncoming((value) => !value)}
                  className={`size-6 rounded-full transition-colors flex items-center justify-center ${
                    observeIncoming ? '' : ''
                  }`}
                  aria-pressed={observeIncoming}
                  aria-label="Incoming observability"
                  style={
                    observeIncoming
                      ? { color: '#28c840' }
                      : { color: 'var(--islands-color-error)' }
                  }
                >
                  <Radar className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-[11px] leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <Radar className="size-3.5" style={{ color: observeIncoming ? '#28c840' : 'var(--islands-color-error)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Příchozí (WS)</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-flex size-1.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
                    <span>Zapnuto: všechny eventy projdou.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-flex size-1.5 rounded-full" style={{ backgroundColor: 'var(--islands-color-error)' }} />
                    <span>Vypnuto: aplikuje se filtr (např. neměnit výběr ve Scéně).</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setObserveOutgoing((value) => !value)}
                  className={`size-6 rounded-full transition-colors flex items-center justify-center ${
                    observeOutgoing ? '' : ''
                  }`}
                  aria-pressed={observeOutgoing}
                  aria-label="Outgoing observability"
                  style={
                    observeOutgoing
                      ? { color: '#28c840' }
                      : { color: 'var(--islands-color-error)' }
                  }
                >
                  <UploadCloud className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-[11px] leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <UploadCloud className="size-3.5" style={{ color: observeOutgoing ? '#28c840' : 'var(--islands-color-error)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Odchozí (Blender)</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-flex size-1.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
                    <span>Zapnuto: změny se propisují okamžitě.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-flex size-1.5 rounded-full" style={{ backgroundColor: 'var(--islands-color-error)' }} />
                    <span>Vypnuto: změny se zatím jen připravují.</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Reload Addon Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleReloadAddon}
                  className="size-6 rounded-full transition-colors flex items-center justify-center hover:bg-[var(--islands-color-background-elevated)]"
                  aria-label="Reload Addon"
                  style={{ color: 'var(--islands-color-text-secondary)' }}
                >
                  <RefreshCw className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">
                Reload Blender Addon
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors hover:bg-[var(--islands-color-background-elevated)]"
              style={{ color: 'var(--islands-color-text-secondary)' }}
            >
              <Languages className="size-3.5" />
              <span>{currentLang}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px]">
            <DropdownMenuItem
              onClick={() => handleLanguageChange('en')}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <span>English</span>
              {currentLang === 'en' && <Check className="size-4" style={{ color: 'var(--islands-color-success)' }} />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange('cs')}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <span>Čeština</span>
              {currentLang === 'cs' && <Check className="size-4" style={{ color: 'var(--islands-color-success)' }} />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>
    </div>
  );
}
