import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

type SocketStatus = "connecting" | "connected" | "disconnected";

type Message = {
  type: string;
  [key: string]: unknown;
};

type RequestAction = "get_scene" | "get_gn_context" | "ping";

/**
 * Hook to communicate with Blender via Tauri WebSocket backend.
 *
 * Architecture:
 * - Blender addon connects as WS client to Tauri's WS server (port 32123)
 * - Tauri backend emits "ws:status" and "ws:message" events to frontend
 * - Frontend can send requests via Tauri invoke("send_to_blender")
 */
export function useBlendmateSocket() {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const requestIdRef = useRef(0);

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
        // If we receive any message, we're definitely connected
        setStatus("connected");
      } catch (e) {
        console.error("[Blendmate] Failed to parse message:", e, event.payload);
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  /**
   * Send a request to Blender addon.
   * Returns the request ID for tracking responses.
   */
  const sendRequest = useCallback(async (action: RequestAction, data?: Record<string, unknown>) => {
    const id = `req-${++requestIdRef.current}`;
    const message = JSON.stringify({
      type: "request",
      id,
      action,
      ...data,
    });

    try {
      await invoke("send_to_blender", { message });
      console.log("[Blendmate] Sent request:", action, id);
      return id;
    } catch (e) {
      console.error("[Blendmate] Failed to send request:", e);
      throw e;
    }
  }, []);

  /**
   * Request full scene data from Blender.
   */
  const requestScene = useCallback(() => sendRequest("get_scene"), [sendRequest]);

  /**
   * Request GN context (active node info).
   */
  const requestGnContext = useCallback(() => sendRequest("get_gn_context"), [sendRequest]);

  /**
   * Ping Blender addon.
   */
  const ping = useCallback(() => sendRequest("ping"), [sendRequest]);

  const connection = useMemo(
    () => ({
      status,
      lastMessage,
      sendRequest,
      requestScene,
      requestGnContext,
      ping,
    }),
    [lastMessage, status, sendRequest, requestScene, requestGnContext, ping]
  );

  return connection;
}
