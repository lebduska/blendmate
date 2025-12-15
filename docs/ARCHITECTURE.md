# Architecture (MVP)

Blender Add-on (Python, WS client)
  -> ws://127.0.0.1:32123
Tauri App (Rust WS server)
  -> React UI

Message example:
{
  "type": "context",
  "area": "gn",
  "node_id": "GeometryNodeCombineXYZ",
  "node_name": "Combine XYZ"
}
