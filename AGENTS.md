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
## Workflow Rules

- Small PRs only
- One issue = one PR
- No breaking changes without docs update
- Prefer adding new artifacts over mutating existing ones

---
## Issue & Task Discovery

- Active tasks are tracked in GitHub Issues.
- Issue instructions are authoritative; do not infer missing requirements.
- If an issue number is referenced (e.g. "issue #11"), the agent must:
  1. Locate the issue via the repository's Issues list, or
  2. Ask for the issue body if it is not available locally.

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
## Agent Behavior Guidelines

- Do not attempt to crawl large external repositories unless explicitly instructed.
- If required information is missing, stop and request clarification.
- Avoid "best guess" implementations when dealing with protocols or APIs.

---
## Goal

Blendmate aims to build a reusable knowledge and protocol layer on top of Blender,
enabling contextual help, AI reasoning, and UI assistance without duplicating Blender internals.
