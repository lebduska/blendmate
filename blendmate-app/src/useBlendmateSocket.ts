import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SocketStatus = "connecting" | "connected" | "disconnected";

type Message = {
  type: string;
  [key: string]: unknown;
};

export function useBlendmateSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:32123");
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setStatus("connected");
      socket.send(JSON.stringify({ type: "ping" } satisfies Message));
    });

    socket.addEventListener("close", () => {
      setStatus("disconnected");
    });

    socket.addEventListener("error", () => {
      setStatus("disconnected");
    });

    socket.addEventListener("message", (event) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : null;
        setLastMessage(data);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const sendJson = useCallback((payload: Message) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const connection = useMemo(
    () => ({
      status,
      lastMessage,
      sendJson,
    }),
    [lastMessage, sendJson, status]
  );

  return connection;
}
