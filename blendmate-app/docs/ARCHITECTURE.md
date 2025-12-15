# Architecture Overview

## Local WebSocket Server

The Tauri backend hosts a Tokio-based WebSocket server listening on `127.0.0.1:32123`. Connections are accepted with `tokio-tungstenite`, and lifecycle events are surfaced to the frontend via Tauri events:

- `ws:status`: Emitted with `"connected"` when a client handshake succeeds and `"disconnected"` when the connection ends.
- `ws:message`: Emitted for each incoming text message, forwarding the raw payload.

The server is started during app setup in `src-tauri/src/lib.rs` and runs entirely locally; no external networking is exposed.
