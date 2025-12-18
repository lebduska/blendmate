# AGENTS.md

Project: blendmate
Personal companion app for Blender.

MVP:
Active GN node in Blender -> WebSocket -> app shows node help.

---
## Core Principles

- This repository is AI-assisted.
- Agents (Cursor / Codex) are expected to read this file first.
- Prefer deterministic, cacheable outputs over narrative explanations.

---
## Execution Model (CLI-first)

- This project is operated primarily via local CLI agent runs.
- Agents are expected to run in a real TTY environment.
- Determinism, reproducibility, and auditability are required for non-trivial tasks.
- Web-based agent runs are acceptable only for small, low-risk changes.

Note:
- This section describes the *environmental assumptions* under which agents operate.
- It is not an instruction for humans to manually follow steps unless explicitly stated.

---
## Workflow Rules

- **Jediný zdroj pravdy (SSOT):** GitHub Issues. Vždy si nejdříve načti detaily úkolu přes `gh issue view <N>`.
- **1 Issue = 1 PR:** Každý úkol musí mít svou vlastní větev a vlastní Pull Request.
- **Větve (Branches):** Používej formát `{id}-{summary}` (např. `23-ui-layout`).
- **Propojení:** V popisu PR vždy uveď `Fixes #<id>`, aby se issue po mergi automaticky uzavřelo.
- **Komentování:** Po dokončení práce přidej k issue stručný komentář o tom, co bylo uděláno, a odkaz na PR.
- **Clean Desk:** Před ukončením session musí být všechny změny buď commitnuty do příslušné větve, nebo zahozeny. Žádný lokální nepořádek.
- **Bez dokumentace není hotovo:** Pokud měníš chování, aktualizuj `CONTEXT.md`.

---
## Issue & Task Discovery

- Default execution context is a local CLI agent run with access to git and GitHub CLI.
- Active tasks are tracked in GitHub Issues.
- GitHub Issues are the single source of truth for task requirements.
- When an issue number is referenced (e.g. "issue #12"), the agent MUST fetch the issue before starting any work.

Required procedure:
1. Fetch the issue via GitHub CLI:
   `gh issue view <N> --repo lebduska/blendmate --json title,body,url,labels`
2. Treat the fetched issue body as authoritative instructions.
3. Do not infer, extend, or invent requirements beyond the issue text.
4. If requirements are missing or ambiguous, ask for clarification by commenting on the issue and STOP.

- Do not search for issue numbers in the repository filesystem.
- Do not proceed based on assumptions if the issue content is not available.

---
## Knowledge Extraction & Caching

- Extraction tasks must produce machine-readable artifacts.
- Extracted knowledge must be stored under:

  knowledge/<source>-<version>/

  Example:
  knowledge/blender-4.5/handlers.json

- The `knowledge/` directory is versioned and committed to git.
- Do not regenerate knowledge artifacts unless explicitly instructed.

---
## Sources of Truth

- Prefer official documentation as the primary source of truth.
- Source code is used only to clarify undocumented or ambiguous behavior.
- Do not invent APIs, handlers, or events that are not explicitly exposed.

---
## Output Expectations

- Outputs must be deterministic and reviewable.
- Prefer JSON, Markdown, or other structured formats.
- Validate generated JSON before committing.

---
## Logging & Run Records

Goal: enable post-hoc analysis of prompt quality, agent behavior (Cursor vs Codex), and throughput.

- Agents do NOT need to know how they are launched (e.g. via `ops/codexrun.sh`); wrappers exist to enforce logging and environment guarantees for humans and automation.

- For any non-trivial task (protocol/knowledge/extraction/addon/app), runs SHOULD be logged.
- Preferred format: one run = one Markdown log file under `logs/`.
- Logs are append-only artifacts and may be committed, or attached to PRs, depending on sensitivity.

Minimum contents per run log:
- Timestamp start/end + duration
- Agent type (cursor/codex/other) + command used
- Git context (repo, branch, HEAD commit)
- Issue reference (URL + `gh issue view <N>` output snippet)
- Prompt / instruction used (exact text)
- Key terminal transcript (commands + output)
- Result summary (files touched) + diff link or patch (optional)

Recommended filename:
- `logs/YYYY-MM-DD-HHMMSS-issue<N>-<agent>-<label>.md`

Implementation note:
- This is achieved via a local wrapper (e.g., `script` or `tee`) that captures stdout/stderr.
- Do NOT re-generate long transcripts via the model (wastes tokens). Capture them at the shell level.

Database vs files:
- Start with file logs (Markdown/JSON) for simplicity.
- If you need cross-run analytics later, add a small SQLite index (run_id, issue, agent, start/end, duration, outcome) that points to the log file path.

---
## Agent Behavior Guidelines

- Treat this document as an agent contract: it defines constraints and expectations, not user-facing instructions.
- Do not attempt to crawl large external repositories unless explicitly instructed.
- If required information is missing, stop and request clarification.
- Avoid "best guess" implementations when dealing with protocols or APIs.

---
## Goal

Blendmate aims to build a reusable knowledge and protocol layer on top of Blender,
enabling contextual help, AI reasoning, and UI assistance without duplicating Blender internals.
