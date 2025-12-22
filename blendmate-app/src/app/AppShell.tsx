import React, { useEffect } from "react";
import { TopBar } from "./layout/TopBar";
import { CenterWorkspace } from "./layout/CenterWorkspace";
import { RightInspector } from "./layout/RightInspector";
import { BottomBar } from "./layout/BottomBar";
import { useLayoutStore } from "../state/layoutStore";

export type SocketStatus = "connecting" | "connected" | "disconnected" | string;

export type AppShellProps = {
  socketStatus: SocketStatus;
  lastMessage: any;
  sendJson: (json: any) => void;
};

export function AppShell(props: AppShellProps) {
  const layout = useLayoutStore();

  useEffect(() => {
    // Sanity marker: guarantees you're seeing the vNext shell build.
    // eslint-disable-next-line no-console
    console.info("Blendmate UI vNext Shell mounted");
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <TopBar
        socketStatus={props.socketStatus}
        inspectorOpen={layout.inspectorOpen}
        onToggleInspector={layout.toggleInspector}
        onResetLayout={layout.resetLayout}
      />

      <div className="flex h-[calc(100vh-88px)] w-full">
        <div className="flex min-w-0 flex-1">
          <CenterWorkspace />
        </div>

        {layout.inspectorOpen ? (
          <div className="w-[360px] shrink-0 border-l border-white/10">
            <RightInspector />
          </div>
        ) : null}
      </div>

      {layout.bottomOpen ? (
        <div className="h-[44px] border-t border-white/10">
          <BottomBar
            lastMessage={props.lastMessage}
            sendJson={props.sendJson}
            onToggleBottom={layout.toggleBottom}
            vnextBadge
          />
        </div>
      ) : (
        <div className="h-[44px] border-t border-white/10 flex items-center justify-between px-3 text-xs opacity-80">
          <span>Bottom bar hidden</span>
          <button
            className="px-2 py-1 rounded hover:bg-white/10"
            onClick={layout.toggleBottom}
            type="button"
          >
            Show
          </button>
        </div>
      )}
    </div>
  );
}
