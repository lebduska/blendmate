# blendmate tasks

This file is the human-readable task board for our chat.
Source of truth for execution is GitHub Issues + labels, but this stays clean and readable.

## Workflow
- Add `codex:ready` only when Goal + DoD are crystal clear.
- 1 Issue = 1 PR.
- When PR is opened: move to **In Review** and switch label to `codex:needs-review`.

## Now (P0)
### Ready for Codex
- [ ] **(app)** WebSocket server in Tauri (local-only `127.0.0.1:32123`)  
      DoD: emits `ws:status` + forwards incoming text as `ws:message`.
- [ ] **(app)** React `useBlendmateSocket()` hook + status UI  
      DoD: shows Connected/Waiting + prints last message.

### In review
- [ ] **(app)** Codex branch: `codex/implement-websocket-server-with-events`  
      Action: open PR (if not yet) and request review.

## Next (P1)
- [ ] **(kb)** Loader: `node_id -> kb/gn/<node_id>/{meta.json,info.md,preview.webp}`
- [ ] **(app)** NodeHelpView: render markdown + preview + pitfalls/patterns
- [ ] **(kb)** Seed entries: Combine XYZ, Separate XYZ, Instance on Points

## Later (P2)
- [ ] **(addon)** Blender add-on WS client (vendored lib), reconnect + throttle
- [ ] **(addon)** Send active GN node context: `{type:'context', area:'gn', node_id, node_name}`

## Notes
- Keep protocol in `docs/ARCHITECTURE.md`.
- Avoid extra deps unless clearly needed.
