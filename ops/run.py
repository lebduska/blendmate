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