# blendmate tasks

This file is the human-readable task board for our chat.
Source of truth for execution is GitHub Issues + labels, but this stays clean and readable.

## Workflow
- Add `codex:ready` only when Goal + DoD are crystal clear.
- 1 Issue = 1 PR.
- When PR is opened: move to **In Review** and switch label to `codex:needs-review`.

## Now (P0)
### Ready for Codex
- [ ] **(app)** NodeHelpView: render markdown + preview + pitfalls/patterns (#5)
      DoD: Renders KB entry based on node_id with image preview.

## Next (P1)
- [ ] **(kb)** Loader: `node_id -> kb/gn/<node_id>/{meta.json,info.md,preview.webp}` (#4)
- [ ] **(kb)** Seed entries: Combine XYZ, Separate XYZ, Instance on Points (#25)
- [ ] **(protocol)** Document Blendmate protocol v0.1 (#12, #15)
- [ ] **(protocol)** Event catalog for Blender 4.5 (protocol v0.1) (#14)
- [ ] **(knowledge)** Blender knowledge extraction pipeline (Epic #16)
- [ ] **(knowledge)** Extract bpy.app.handlers inventory (Blender 4.5) (#17)
- [ ] **(addon)** Wire Blender handlers -> WS events (v0.1) (#19)
- [ ] **(ops)** Weather snapshot Prague + Tokyo (cheap benchmark) (#20)
- [ ] **(ops)** Ops runner improvements (validation + friendly errors) (#8)

## Later (P2)
- [ ] **(addon)** Blender add-on WS client (vendored lib), reconnect + throttle (#6)
- [ ] **(addon)** Send active GN node context: `{type:'context', area:'gn', node_id, node_name}` (#7)

## Done
- [x] **(app)** WebSocket server in Tauri (local-only `127.0.0.1:32123`) (#2)
- [x] **(app)** React `useBlendmateSocket()` hook + status UI (#3)
- [x] **(protocol)** Event catalog for Blender 4.5 (v0.1) (#11)
- [x] **(knowledge)** Add Blender 4.5 handler inventory (#18)
- [x] **(protocol)** Add Blender 4.5 protocol event catalog (#13)

## Notes
- Keep protocol in `docs/ARCHITECTURE.md`.
- Avoid extra deps unless clearly needed.
