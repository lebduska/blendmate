# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Workflow

- Branch naming: `{topic}-{summary}` (e.g. `ui-layout`, `fix-camera-animation`).
- Keep the working tree clean at the end of a session: either commit or discard local changes.
- When you change observable behavior, update `CONTEXT.md`.
- At the end of a session, update `.ai-workspace/issues/Blendmate/coding-vibe-resume.md` with a summary of changes.

## Commands & common tasks

All paths below are relative to the repo root.

### Desktop app (Tauri + React + TypeScript)

Setup (once per clone):
- `cd blendmate-app && npm install`

Run the desktop app in development (Tauri + Vite + Rust backend):
- `cd blendmate-app && npm run tauri dev`

Frontend-only build (Vite/TypeScript bundle):
- `cd blendmate-app && npm run build`

Tauri desktop bundle (native app build):
- `cd blendmate-app && npm run tauri build`

### Blender add-on

Install/update the add-on in Blender (summary):
- Use the folder `blendmate-addon/`.
- In Blender: `Edit → Preferences → Add-ons → Install...` and select `blendmate-addon/__init__.py` (or the whole folder, depending on Blender version), then enable **System: Blendmate Connector**.

Update vendored Python libraries for the add-on:
- `./ops/update_addon_libs.sh`

Notes:
- Dependencies are vendored into `blendmate-addon/libs/` using `websocket-client` from `blendmate-addon/requirements.txt`.
- The add-on must never block Blender's UI thread; keep handlers and connection logic non-blocking.

### Automation / ops

- `./ops/run.sh` — entrypoint for scripted/CLI workflows defined in `ops/run.py`.

### Testing

Automated tests are not yet set up; testing is manual.

Manual end-to-end test of Blender add-on ↔ desktop app WebSocket flow:
1. Start the desktop app WebSocket server:
   - `cd blendmate-app && npm run tauri dev`
2. Install and enable the Blender add-on as described above.
3. In Blender, trigger events and verify they arrive in the app (via UI and logs):
   - Save `.blend` file → `save_post` event.
   - Load `.blend` file → `load_post` event.
   - Change scene (e.g., move an object) → throttled `depsgraph_update_post`.
   - Change frame / render / other registered handlers as documented.
4. Observe received payloads in the Blendmate UI (last message panel) and in the app console output.

## Architecture overview

### High-level data flow

- **Blender add-on (Python, WebSocket client)** runs inside Blender and sends structured events about the current scene and user actions.
- **Tauri backend (Rust, Tokio WebSocket server)** listens on `ws://127.0.0.1:32123` and accepts connections from the add-on.
- The backend surfaces connection and message lifecycle events to the frontend as Tauri events:
  - `ws:status` — `"connected"` / `"disconnected"`.
  - `ws:message` — raw incoming text payload from Blender.
- **React UI (frontend)** subscribes to these events, shows connection status and last message, and presents contextual help for Geometry Nodes based on a local knowledge base.

### Blender side: `blendmate-addon/`

- Acts as a WebSocket client using vendored `websocket-client` under `blendmate-addon/libs/`.
- Registers Blender handlers (e.g., `save_post`, `load_post`, `depsgraph_update_post`) and sends normalized events to the desktop app.
- UI:
  - `blendmate-addon/ui/` defines the in-Blender UI.
  - `ui/panels.py` declares a `VIEW_3D` sidebar panel "Blendmate Dev" displaying add-on version and WebSocket connection status and gives guidance for reloading scripts during development.
- `ui/__init__.py` exposes `register()` / `unregister()` for Blender's add-on lifecycle.

### Desktop app: `blendmate-app/`

- **Rust backend (`blendmate-app/src-tauri/`)**
  - Configured as a Tauri application whose library `blendmate_app_lib` sets up a local WebSocket server.
  - Uses `tokio`, `tokio-tungstenite`, and `futures-util` for async networking and `serde`/`serde_json` for JSON payloads.
  - Emits Tauri events (`ws:status`, `ws:message`) to the React frontend; see `blendmate-app/docs/ARCHITECTURE.md`.

- **React frontend (`blendmate-app/src/`)**
  - `components/layout/HUD.tsx` — top navigation bar showing connection state, app branding, and tab switcher (`nodes`, `stats`, `chat`).
  - `components/layout/Footer.tsx` — bottom status bar showing the last received WebSocket message (JSON) and a button that sends a `{ type: "ping" }` JSON message back over the socket.
  - `components/NodeHelpView.tsx` — main node help view; renders friendly explanations, pitfalls, and actions for a Geometry Nodes node (currently wired with static content, intended to be driven by the knowledge base).
  - `components/ui/Card.tsx` — small presentational component used for dashboard-style metric cards.
  - `services/kbLoader.ts` — loads node help data from the local knowledge base.
  - `types/kb.ts` — TypeScript types for knowledge base entries (`KBNodeMeta`, `KBNodeEntry`).

### Knowledge & protocol layer

- Knowledge artifacts live under `knowledge/<source>-<version>/`.
  - Example: `knowledge/blender-4.5/GeometryNodeInstanceOnPoints/meta.json` plus optional `info.md` and `preview.webp` per node.
  - `knowledge/blender-4.5/handlers.json` catalogs Blender event handlers.
- The React app's `kbLoader.loadNodeHelp(nodeId)` expects the following file layout for a given `nodeId`:
  - `/knowledge/blender-4.5/${nodeId}/meta.json` → parsed as `KBNodeMeta`.
  - Optional `/knowledge/blender-4.5/${nodeId}/info.md` → markdown content.
  - Optional `/knowledge/blender-4.5/${nodeId}/preview.webp` → preview image URL.
- Protocol and event catalog:
  - `docs/ARCHITECTURE.md` documents the high-level messaging model and payload examples.
  - `docs/PROTOCOL_EVENTS.md` describes how protocol event catalogs are versioned and extended across Blender releases.

## Protocol, knowledge, and code change rules

- WebSocket protocol changes **must** update `docs/ARCHITECTURE.md` and any affected protocol/knowledge artifacts (e.g., handler catalogs under `knowledge/`).
- Extraction/knowledge tasks must produce machine-readable artifacts under `knowledge/<source>-<version>/` and keep existing versions for backward compatibility.
- Do not regenerate or overwrite existing knowledge artifacts unless explicitly instructed.
- Prefer small, incremental changes and avoid adding new dependencies or libraries without a clear reason.

## Project context files

- `AGENTS.md` — authoritative agent/workflow contract; always read it when working on automation or protocol/knowledge tasks.
- `CONTEXT.md` — current project state, priorities, known constraints, and how to run the app; update it whenever behavior or priorities change.
- `docs/ARCHITECTURE.md` and `docs/PROTOCOL_EVENTS.md` — canonical references for runtime architecture and protocol semantics.
