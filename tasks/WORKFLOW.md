# Blendmate operating model (clean handoff + deterministic ops)

This repo is intentionally set up so that **AI never needs hidden context** and you can always leave the project with a **clean desk**.

If you open the repo after a week and you (or I) forgot everything, the goal is that 2 files bring the whole context back instantly.

## 0) Source of truth for context

### Required files

- `CONTEXT.md` *(short, 1–2 screens)*
  - What Blendmate is (1 sentence)
  - Current state (what works / what’s blocked)
  - How to run (3 commands max)
  - Current priorities (top 3)
  - Constraints (what we are NOT doing)
  - Known pitfalls

- `STATUS.md` *(live checklist)*
  - DONE / IN PROGRESS / NEXT
  - links to the key issues

If these files are missing or stale, that is a bug in our workflow.

---

## 1) Clean desk rule

Before you stop working, the repo must be in one of these states:

- **clean** (`git status` shows nothing)
- or **WIP is safely stored** (stash or WIP branch)

### Quick commands

```bash
# see what would block you next time
git status

# safest “I’m stopping now”
git stash push -u -m "wip: pause"

# or, if it is coherent enough
git switch -c wip/<topic>
git add -A
git commit -m "wip: <topic>"
```

---

## 2) GitHub access model

### Today (default): GitHub CLI via runner

You run commands locally. AI only writes plans/specs.

- **AI writes** a plan file: `ops/inbox.json`
- **You run** one command: `./ops/run.sh`
- **Runner executes** whitelisted actions via `gh` + `git`
- **Runner logs** to `ops/outbox.jsonl`
- **AI reads** the outbox and writes the next plan

This keeps changes deterministic and auditable.

### Optional later: MCP

If we add MCP-based GitHub access, it must still respect the same safety model:

- no direct pushes to `main`
- changes are PR-based
- actions are logged
- unknown actions are rejected

Until explicitly implemented, assume **no MCP** and use the runner.

---

## 3) Runner files (plan -> execute -> outbox)

- `ops/inbox.json` — plan written by AI (single JSON)
- `ops/outbox.jsonl` — append-only execution log
- `ops/run.sh` / `ops/run.py` — entrypoint (you run it)

### Plan format (example)

```json
{
  "repo": "lebduska/blendmate",
  "mode": "dry-run",
  "actions": [
    { "type": "gh_pr_list" },
    { "type": "gh_issue_list", "labels": ["codex:ready"], "state": "open" },
    { "type": "git_status" }
  ]
}
```

### Run

```bash
./ops/run.sh
```

Then open `ops/outbox.jsonl` and ask AI to interpret it.

---

## 4) Discoverability rule

Anything we rely on must be discoverable from the repo root.

Minimum:
- `README.md` links to: `CONTEXT.md`, `STATUS.md`, `AGENTS.md`
- `CONTEXT.md` links to: `tasks/` docs (if needed)

If a doc can be "lost" by not opening the right folder, we treat that as a workflow bug.

---

## 5) One issue = one PR (when we implement)

- Small PRs only
- One issue per PR
- Clear DoD in the issue body
- Manual test steps included

### Naming Conventions & Linking

#### Branches
Používej formát: `type/id-summary`
- `feat/23-node-help-ui`
- `fix/15-connection-leak`
- `chore/setup-linters`

#### Linking to Issues
GitHub automaticky propojí PR s issue a po mergi ho uzavře, pokud v popisu PR (nebo v commitu) použiješ klíčové slovo:
- `Fixes #23`
- `Closes #15`

Tato klíčová slova jsou součástí naší **Pull Request šablony**.

---

## Appendix: why this exists

Because the biggest enemy of momentum is **invisible context**.

This workflow makes the repo self-explanatory even after a break.
