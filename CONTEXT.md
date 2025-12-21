# Blendmate — Project Context

## What this project is (1 sentence)
Blendmate is a context-aware assistant for Blender workflows that listens to Blender events via WebSockets and provides an extensible event console and knowledge support UI.

## Current state (as of now)
- WebSocket addon for Blender implemented; sends Blender handler events.
- Tauri/React app scaffold present; connects to WS and shows basic status/last message (#2, #3).
- Protocol and knowledge extraction for Blender 4.5 started (#11, #13, #18).
- Workflow and docs scaffolding present (`WORKFLOW.md`, `AGENTS.md`, task labels & priorities).
- CI/CD and formal releases are not yet set up.

## How to run (3 commands max)
```bash
# install dependencies (once)
npm install

# run desktop app for development
npm run tauri dev
```

**Nainstaluj addon v Blenderu**: `Edit` → `Preferences` → `Add-ons` → `Install...` → vyber `addon/` directory

## Top priorities (today / this week)
1. NodeHelpView (#5) — render markdown + preview + pitfalls/patterns for GN nodes.
2. KB Loader (#4) — implement node_id based loading for knowledge base.
3. Blender knowledge extraction pipeline (#16, #17) — automate handler and API inventory.

## Known pitfalls / constraints
- UI work depends on stable WebSocket protocol; disconnects and throttling must be handled first.
- Do not start new feature tasks before top priorities are closed or clearly blocked.
- Agents and CLI workflows depend on clean context files (CONTEXT.md, STATUS.md, AGENTS.md) for meaningful results.

## Things we are explicitly NOT doing right now
- No autonomous commits or direct pushes to main by agents.
- No automated tests yet (manual testing only).
- No integrated AI generation inside Blender (UI only external app).

## Tools & environment
- Frontend: Tauri + React + TypeScript
- Backend/Protocol: WebSockets for event ingestion
- Blender: Python addon registering handlers
- CLI/automation: GitHub CLI + ops runner
- Local dev OS: macOS (Silicon tested)

## Base URLs & settings
- WebSocket default: ws://127.0.0.1:32123
- React dev server: shown via Tauri

