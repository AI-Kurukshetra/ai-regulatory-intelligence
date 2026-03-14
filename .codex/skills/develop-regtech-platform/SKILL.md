---
name: develop-regtech-platform
description: Phase-gated development workflow for the AI Regulatory Intelligence Platform in this repository. Use when Codex is building, debugging, reviewing, or validating Next.js + Supabase + Vercel work for this AML/compliance product and must stay aligned with implementation_blueprint.md, backend.md, frontend.md, and rules.md without moving to the next phase until current exit criteria are satisfied.
---

# Develop Regtech Platform

## Overview

Build and maintain this repository phase by phase. Prefer incremental edits to the existing codebase, keep Supabase multi-tenant safety intact, and validate each phase before declaring it complete.

## Workflow

### 1. Identify the active phase

- Read `implementation_blueprint.md` and `rules.md` before substantial work.
- Default to the highest incomplete phase.
- Refuse to start later-phase feature work unless the user explicitly waives the phase gate.

### 2. Load only the needed sources

- Start with [references/repo-sources.md](references/repo-sources.md).
- Open `implementation_blueprint.md` for roadmap, sprint goals, and architecture boundaries.
- Open `rules.md` for strict phase exit criteria and Supabase gotchas.
- Open `backend.md` when touching schema, auth, APIs, jobs, workers, or RLS.
- Open `frontend.md` when touching routes, dashboards, flows, or UI states.
- Open `AI-Powered Regulatory Intelligence Platform.pdf` only when product intent is unclear from the text docs.

### 3. Implement safely

- Modify the current repository; do not regenerate the app scaffold or overwrite broad config files with template output.
- Preserve user changes and work with the existing project structure.
- Use Next.js App Router and Vercel-safe patterns.
- Derive `organization_id` from authenticated context; never trust it from request payloads.
- Treat Supabase auth as `auth.users` plus `public.profiles`.
- Keep tenant isolation enforced with RLS and negative-path validation.
- Validate AI outputs before persistence and fall back to manual review when AI fails.
- Keep model choice configurable; do not hardcode a model unless the user asks for one.

### 4. Validate before closing a phase

- Run `bash scripts/phase-gate.sh phase-1` for reusable Foundation checks.
- Use [references/phase-gates.md](references/phase-gates.md) to compare repo state with the current phase definition.
- Report `done`, `pending`, and `external blocker` items separately.

### 5. Resolve document conflicts explicitly

- Prefer `implementation_blueprint.md` and `rules.md` when documents disagree about phase order or completion.
- Use `backend.md` and `frontend.md` as implementation detail guides unless they conflict with proven repo behavior or stricter phase gates.
- Call out mismatches instead of silently choosing one.

## Quick Uses

- "Use $develop-regtech-platform to complete Phase 1 and tell me what is still missing."
- "Use $develop-regtech-platform to add Phase 2 transaction ingestion without skipping the current phase gate."
- "Use $develop-regtech-platform to review whether this change is safe for Supabase RLS and Vercel deployment."

## Resources

- Read [references/repo-sources.md](references/repo-sources.md) first for the source-of-truth map.
- Read [references/phase-gates.md](references/phase-gates.md) when checking phase completion or choosing what to build next.
- Run `bash scripts/phase-gate.sh phase-1` to execute the reusable Foundation validation commands.
