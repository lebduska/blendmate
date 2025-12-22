import React from "react";
import { useBlendmateSocket } from "./useBlendmateSocket";
import { AppShell } from "./app/AppShell";

/**
 * App = plumbing wrapper only.
 * UI layout lives in src/app/AppShell.tsx (vNext).
 */
export default function App() {
  const { status, lastMessage, sendJson } = useBlendmateSocket();

  return (
    <AppShell
      socketStatus={status}
      lastMessage={lastMessage}
      sendJson={sendJson}
    />
  );
}
