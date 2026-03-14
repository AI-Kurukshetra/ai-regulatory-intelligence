# Repo Sources

Use this map to decide which project documents to load.

## Primary sources

- `implementation_blueprint.md`
  - Roadmap, sprint plan, architecture direction, API and schema expectations.
  - Use first when deciding what belongs in the current phase.

- `rules.md`
  - Hard phase gates and project-specific implementation rules.
  - Use first when deciding whether a phase is actually complete.

## Implementation guides

- `backend.md`
  - Supabase schema, auth model, RLS expectations, API ideas, job/worker notes.
  - Use when editing migrations, route handlers, auth helpers, queue logic, or audit trails.

- `frontend.md`
  - Dashboard structure, route expectations, UX flows, and component ideas.
  - Use when editing pages, navigation, forms, and analyst/compliance workflows.

## Product context

- `AI-Powered Regulatory Intelligence Platform.pdf`
  - Product rationale and market framing.
  - Use only when repo docs do not fully explain why a feature exists.

## Live repo artifacts to inspect early

- `app/`
- `lib/`
- `supabase/migrations/`
- `types/supabase.ts`
- `scripts/verify-rls.mjs`
- `.github/workflows/ci.yml`

## Do not treat as source of truth

- `skill.sh`
  - One-time scaffold artifact.
  - Use only for historical reference, not for current implementation decisions.
