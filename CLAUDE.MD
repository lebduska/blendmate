# CLAUDE.MD

This file is specifically for **Claude AI** working on the Blendmate project.
Read this first when starting any work session.

---

## Quick Project Overview

**Blendmate** is a contextual assistant for Blender that:
- Runs as a **Tauri desktop app** (React + TypeScript)
- Connects to Blender via a **Python add-on** that sends events over WebSocket
- Provides an **event console** and **contextual help for Geometry Nodes**
- Uses a **local knowledge base** (`knowledge/blender-4.5/`)

**Goal:** Help Blender users learn and work faster with real-time contextual information.

---

## Critical Rules (Read Before Every Task)

### 1. Always Work with Issues
- **NEVER** start work without a GitHub issue number
- Fetch issue details first: `gh issue view <N> --repo lebduska/blendmate --json title,body,url,labels`
- The issue is the **authoritative source** for requirements
- Do NOT invent features or requirements not in the issue

### 2. Branch and PR Workflow
- **One issue = One branch = One PR**
- Branch naming: `{id}-{summary}` (e.g., `23-ui-layout`)
- Always link PR to issue: `Fixes #<id>` in PR description
- Comment on issue after PR is created with summary + PR link

### 3. Git Operations
- Develop on designated feature branches (usually `claude/update-claude-md-*`)
- Push using: `git push -u origin <branch-name>`
- Commit messages should be clear and descriptive
- Clean working tree before ending session (commit or discard)

### 4. Documentation Updates Required
- If you change behavior, **update relevant docs**:
  - `CONTEXT.md` - Project state and focus
  - Architecture docs in `docs/`
  - Component-specific docs (e.g., `blendmate-app/PANELS.md`)
- **"Without documentation, it's not done"**

### 5. Event Handler Registration
- **CRITICAL:** All Blender event handlers MUST go through `blendmate-addon/events/registry.py`
- NEVER register handlers, timers, or msgbus directly
- This is the centralized event registry system

---

## Project Structure

```
blendmate/
├── blendmate-addon/          # Blender Python add-on
│   ├── events/registry.py    # ⚠️ CENTRAL event handler registry
│   └── __init__.py           # Add-on entry point
├── blendmate-app/            # Tauri desktop application
│   ├── src/                  # React/TypeScript frontend
│   ├── src-tauri/            # Rust backend (WebSocket server)
│   ├── PANELS.md             # Panel system documentation
│   └── docs/UI_RULES.md      # UI behavior rules
├── knowledge/                # Local knowledge base
│   └── blender-4.5/          # Blender 4.5 specific data
│       ├── geometry-nodes/   # GN node metadata & docs
│       └── handlers.json     # Blender event handlers
├── docs/                     # Architecture documentation
│   ├── ARCHITECTURE.md       # System architecture
│   ├── PROTOCOL_EVENTS.md    # WebSocket protocol spec
│   └── blender-events.md     # Blender event reference
├── AGENTS.md                 # Rules for AI agents (READ THIS)
├── CONTEXT.md                # Current project state & focus
└── README.md                 # User-facing documentation
```

---

## Common Commands

### Development
```bash
# Run desktop app in dev mode
cd blendmate-app && npm run tauri dev

# Install dependencies (first time)
cd blendmate-app && npm install

# Build for production
cd blendmate-app && npm run build
```

### GitHub CLI
```bash
# View issue details
gh issue view <N> --repo lebduska/blendmate --json title,body,url,labels

# Create a PR
gh pr create --title "Title" --body "Body with 'Fixes #<N>'"

# List priority issues
gh issue list --repo lebduska/blendmate --label "prio:p0"
```

### Git Workflow
```bash
# Create and switch to feature branch
git checkout -b <issue-id>-<summary>

# Stage and commit changes
git add <files>
git commit -m "feat(scope): description"

# Push to remote
git push -u origin <branch-name>
```

---

## Architecture Quick Reference

### WebSocket Protocol
- **Server runs in Tauri app:** `ws://127.0.0.1:32123`
- **Client:** Blender add-on connects and sends events
- **Event format:** See `docs/PROTOCOL_EVENTS.md`
- **Throttling:** Some events (like `depsgraph_update_post`) are throttled to 2-5×/s

### Panel System
- App uses **panel-based UI** instead of fixed tabs
- Each panel is independent and can be opened/closed
- See `blendmate-app/PANELS.md` for details
- Layout persists to `localStorage` (key: `blendmate_layout`, version: 1)

### Knowledge Base
- Lives in `knowledge/<source>-<version>/`
- **DO NOT regenerate** unless explicitly required by issue
- Prefer official docs as source of truth, code for clarification

---

## Tech Stack

### Desktop App
- **Framework:** Tauri 2.x
- **Frontend:** React 19.x + TypeScript
- **Styling:** Tailwind CSS 4.x
- **Build:** Vite 7.x
- **Backend:** Rust (WebSocket server)

### Blender Add-on
- **Language:** Python 3.x
- **API:** Blender 4.5 Python API
- **Communication:** WebSocket client

---

## Current State & Priorities

### What Works
✅ Blender add-on sends events to desktop app
✅ Desktop app receives and displays connection status
✅ Panel-based UI system in place
✅ Centralized event registry in add-on
✅ Basic knowledge base structure for Blender 4.5

### Current Focus Areas
Check `prio:p0` label in GitHub issues for current priorities. Typically:
1. **Node help view** - Display GN node docs from knowledge base
2. **Knowledge base loader** - Reliable data fetching by `node_id`
3. **Knowledge extraction** - Tools to populate knowledge base

### What We're NOT Doing
❌ No autonomous commits to `main`
❌ No automated tests yet (manual testing only)
❌ No AI integration inside Blender UI (external app only)
❌ No CI/CD pipelines yet

---

## Important Files to Know

### Must Read Before Changes
- `AGENTS.md` - AI agent contract and rules
- `CONTEXT.md` - Current project state
- `docs/ARCHITECTURE.md` - System design
- `docs/PROTOCOL_EVENTS.md` - WebSocket protocol
- `blendmate-app/docs/UI_RULES.md` - UI behavior rules

### Update When Changing Behavior
- `CONTEXT.md` - If changing project state/focus
- Architecture docs - If changing system design
- Component docs - If changing specific components

---

## Testing

### Manual E2E Test
1. Run desktop app: `cd blendmate-app && npm run tauri dev`
2. Install add-on in Blender (Edit → Preferences → Add-ons → Install)
3. Enable "System: Blendmate Connector"
4. Trigger events in Blender:
   - Save file → `save_post`
   - Load file → `load_post`
   - Change frame → `frame_change_post`
   - Render → `render_complete`
   - Move object → `depsgraph_update_post` (throttled)
5. Verify events appear in desktop app

---

## Common Pitfalls

⚠️ **Event handlers:** Must use `blendmate-addon/events/registry.py`
⚠️ **Knowledge base:** Don't regenerate without explicit instruction
⚠️ **Issue-driven:** Don't implement features not in an issue
⚠️ **Documentation:** Update docs when behavior changes
⚠️ **Branch naming:** Follow `{id}-{summary}` convention
⚠️ **Clean desk:** Commit or discard before ending session

---

## When You're Stuck

1. **Read the issue again** - Ensure you understand requirements
2. **Check documentation:**
   - `CONTEXT.md` for current state
   - `docs/ARCHITECTURE.md` for design decisions
   - `AGENTS.md` for workflow rules
3. **Ask for clarification** - Comment on the issue if requirements are unclear
4. **Don't guess** - Better to ask than implement wrong solution

---

## Workflow Summary

For each task:
1. ✅ Fetch issue details with `gh issue view <N>`
2. ✅ Create/checkout feature branch
3. ✅ Read relevant documentation
4. ✅ Implement changes
5. ✅ Update documentation if behavior changed
6. ✅ Test manually (E2E test)
7. ✅ Commit with clear message
8. ✅ Push to feature branch
9. ✅ Create PR linking to issue
10. ✅ Comment on issue with summary + PR link

---

## Links

- **Repository:** https://github.com/lebduska/blendmate
- **Issues:** https://github.com/lebduska/blendmate/issues
- **Priority Issues:** https://github.com/lebduska/blendmate/issues?q=is%3Aopen+label%3Aprio%3Ap0

---

## Notes for Claude

- This project values **deterministic, reviewable output**
- Prefer **conservative implementations** over "best guess"
- **Stop and ask** when requirements are unclear
- Follow the **single source of truth** principle (GitHub Issues)
- Be **explicit about what you're doing** and why

Remember: You're working on a real project with a real user. Quality and correctness matter more than speed.
