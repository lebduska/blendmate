import { useEffect, useMemo, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

type SocketStatus = "connecting" | "connected" | "disconnected";

type Message = {
  type: string;
  [key: string]: unknown;
};

/**
 * Hook to receive WebSocket messages from Blender via Tauri backend.
 *
 * Architecture:
 * - Blender addon connects as WS client to Tauri's WS server (port 32123)
 * - Tauri backend emits "ws:status" and "ws:message" events to frontend
 * - This hook listens to those Tauri events (NOT direct WebSocket)
 */
export function useBlendmateSocket() {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    // Listen for connection status changes from Tauri backend
    listen<string>("ws:status", (event) => {
      console.log("[Blendmate] WS status:", event.payload);
      if (event.payload === "connected") {
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    // Listen for messages from Blender (forwarded by Tauri backend)
    listen<string>("ws:message", (event) => {
      try {
        const data = JSON.parse(event.payload) as Message;
        console.log("[Blendmate] WS message:", data);
        setLastMessage(data);
      } catch (e) {
        console.error("[Blendmate] Failed to parse message:", e, event.payload);
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  const connection = useMemo(
    () => ({
      status,
      lastMessage,
    }),
    [lastMessage, status]
  );

  return connection;
}
