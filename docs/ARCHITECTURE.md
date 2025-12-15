# Architecture (MVP)

Blender Add-on (Python, WS client)
  -> ws://127.0.0.1:32123
Tauri App (Rust WS server)
  -> React UI

Tauri emits global events for the WebSocket lifecycle:
- `ws:status` with `"connected"` / `"disconnected"` when a client opens or closes a socket.
- `ws:message` with the raw incoming text payload.

Message example:
{
  "type": "context",
  "area": "gn",
  "node_id": "GeometryNodeCombineXYZ",
  "node_name": "Combine XYZ"
}
