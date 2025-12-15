# blendmate workflow (AI orchestration)

Goal: minimize copy/paste. We (ChatGPT/Cursor) write **a plan file** in the repo, you run **one command**, the runner executes many actions (GitHub + git + builds) and writes results back for the next iteration.

This is a *human-in-the-loop* agent system:
- **You** approve by running a command.
- **Runner** performs actions deterministically.
- **AI** (me) only edits plan/spec files.

---

## Files

- `ops/inbox.json`  
  The plan (written by AI). Single JSON document.

- `ops/outbox.jsonl`  
  Execution log (written by runner). Append-only JSON Lines.

- `ops/run.sh` / `ops/run.py`  
  Runner entrypoint. You run `./ops/run.sh`.

---

## Safety model

- Default mode is `dry-run` (no side effects).
- The runner only supports a **whitelist** of actions.
- Any unknown action is rejected and logged.
- No direct pushes to `main` from the runner (use PRs).

---

## Prerequisites

- GitHub CLI installed and authenticated:

```bash
gh auth status
```

- Repo checked out locally and clean:

```bash
git status
```

---

## Quickstart (one-time setup)

Create the ops scaffolding:

```bash
mkdir -p ops
touch ops/inbox.json ops/outbox.jsonl

cat > ops/run.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
python3 ops/run.py
SH
chmod +x ops/run.sh
```

Create the runner:

```bash
cat > ops/run.py <<'PY'
#!/usr/bin/env python3
import json, time, shlex, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "ops" / "inbox.json"
OUTBOX = ROOT / "ops" / "outbox.jsonl"

MAX_LOG_CHARS = 8000


def _log(event: dict):
    event["ts"] = int(time.time())
    OUTBOX.parent.mkdir(parents=True, exist_ok=True)
    with OUTBOX.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def _run(cmd: str, cwd: Path | None = None, timeout: int | None = None) -> dict:
    p = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        shell=True,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return {
        "ok": p.returncode == 0,
        "code": p.returncode,
        "stdout": (p.stdout or "")[-MAX_LOG_CHARS:],
        "stderr": (p.stderr or "")[-MAX_LOG_CHARS:],
    }


def _require_tools():
    for tool in ("gh", "git", "python3"):
        r = _run(f"command -v {shlex.quote(tool)}")
        if not r["ok"]:
            raise SystemExit(f"Missing tool in PATH: {tool}")


def main():
    _require_tools()

    if not INBOX.exists() or INBOX.stat().st_size == 0:
        raise SystemExit("ops/inbox.json is missing or empty")

    plan = json.loads(INBOX.read_text(encoding="utf-8"))
    mode = plan.get("mode", "dry-run")
    repo = plan.get("repo", "")
    actions = plan.get("actions", [])

    _log({"type": "plan_start", "mode": mode, "repo": repo, "count": len(actions)})

    for i, a in enumerate(actions):
        t = a.get("type")
        _log({"type": "action_start", "i": i, "action": a})

        if mode == "dry-run":
            _log({"type": "action_skip", "i": i, "reason": "dry-run"})
            continue

        # --- GitHub (gh) actions ---
        if t == "gh_label_create":
            name = a["name"]
            color = a.get("color", "ededed")
            desc = a.get("description", "")
            cmd = f'gh label create {shlex.quote(name)} --color {shlex.quote(color)} --description {shlex.quote(desc)} --force'
            res = _run(cmd, cwd=ROOT)
            _log({"type": "action_result", "i": i, "action_type": t, **res})
            continue

        if t == "gh_issue_create":
            title = a["title"]
            body = a.get("body", "")
            labels = a.get("labels", [])
            label_arg = ",".join(labels)
            cmd = f'gh issue create -t {shlex.quote(title)} -b {shlex.quote(body)}'
            if label_arg:
                cmd += f' -l {shlex.quote(label_arg)}'
            res = _run(cmd, cwd=ROOT)
            _log({"type": "action_result", "i": i, "action_type": t, **res})
            continue

        if t == "gh_pr_list":
            res = _run('gh pr list --limit 50 --json number,title,headRefName,baseRefName,state,url', cwd=ROOT)
            _log({"type": "action_result", "i": i, "action_type": t, **res})
            continue

        if t == "gh_issue_list":
            # optional filters: labels, state
            state = a.get("state", "open")
            labels = a.get("labels", [])
            label_flags = " ".join([f"--label {shlex.quote(x)}" for x in labels])
            res = _run(f'gh issue list --state {shlex.quote(state)} {label_flags} --limit 200', cwd=ROOT)
            _log({"type": "action_result", "i": i, "action_type": t, **res})
            continue

        # --- git helpers ---
        if t == "git_status":
            res = _run("git status --porcelain=v1", cwd=ROOT)
            _log({"type": "action_result", "i": i, "action_type": t, **res})
            continue

        # --- generic command ---
        if t == "cmd":
            command = a["command"]
            cwd = ROOT / a.get("cwd", "")
            timeout = int(a.get("timeout_sec", 300))
            res = _run(command, cwd=cwd, timeout=timeout)
            _log({"type": "action_result", "i": i, "action_type": t, "cwd": str(cwd), **res})
            continue

        _log({"type": "action_error", "i": i, "error": f"Unknown action type: {t}", "action": a})

    _log({"type": "plan_done"})


if __name__ == "__main__":
    main()
PY
chmod +x ops/run.py
```

Commit the runner scaffolding:

```bash
git add ops tasks/WORKFLOW.md
git commit -m "chore: add ops runner workflow"
```

---

## Using the runner

### 1) AI writes a plan
Example `ops/inbox.json`:

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

### 2) You run one command

```bash
./ops/run.sh
```

### 3) AI reads the outbox
Open `ops/outbox.jsonl` in Cursor and ask me to interpret it.

---

## Next capability (Iteration 2)

Once the skeleton works, we extend the runner with GitHub Project (kanban) operations.
Projects v2 typically requires GitHub GraphQL API.

Planned additions:
- `gh_project_list`
- `gh_project_items_list`
- `gh_project_item_move` (column/status field)
- `gh_issue_add_labels` / `gh_issue_remove_labels`

---

## Codex task to implement this

Create a GitHub Issue with this content (or run the `gh issue create` command below).

### Issue title
`feat(ops): add ops runner (plan -> execute -> outbox)`

### Labels
`area:app`, `prio:p0`, `codex:ready`

### Body
Goal:
- Add an `ops/` runner so AI can write a plan file and the user can execute many repo/GitHub actions via one command.

Definition of Done:
- Add `ops/run.sh`, `ops/run.py`, `ops/inbox.json` (example) and `ops/outbox.jsonl` (append-only).
- `./ops/run.sh` works on macOS.
- Supports actions:
  - gh: `gh_issue_create`, `gh_issue_list`, `gh_pr_list`, `gh_label_create`
  - git: `git_status`
  - generic: `cmd` with `cwd` and `timeout_sec`
- Has `dry-run` vs `apply` modes.
- Rejects unknown action types.
- Documents usage in `tasks/WORKFLOW.md`.

How to test:
- Put a dry-run plan that lists issues and PRs.
- Run `./ops/run.sh` and confirm `ops/outbox.jsonl` contains `plan_start`, action logs, and `plan_done`.

Constraints:
- Keep it dependency-free (stdlib only).
- Do not push to `main` automatically.

### Create the issue via CLI
```bash
gh issue create \
  -t "feat(ops): add ops runner (plan -> execute -> outbox)" \
  -l "area:app,prio:p0,codex:ready" \
  -b "Goal:\n- Add an ops runner so AI can write a plan file and the user can execute many repo/GitHub actions via one command.\n\nDefinition of Done:\n- Add ops/run.sh, ops/run.py, ops/inbox.json (example) and ops/outbox.jsonl (append-only).\n- ./ops/run.sh works on macOS.\n- Supports actions: gh_issue_create, gh_issue_list, gh_pr_list, gh_label_create; git_status; cmd with cwd+timeout.\n- Has dry-run vs apply modes.\n- Rejects unknown action types.\n- Documents usage in tasks/WORKFLOW.md.\n\nHow to test:\n- Put a dry-run plan that lists issues and PRs.\n- Run ./ops/run.sh and confirm ops/outbox.jsonl contains plan_start/action logs/plan_done.\n\nConstraints:\n- Dependency-free (stdlib only).\n- Do not push to main automatically."
```
