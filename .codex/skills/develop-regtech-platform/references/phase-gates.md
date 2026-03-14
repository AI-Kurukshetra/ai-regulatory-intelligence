# Phase Gates

Use this file to decide whether the current phase is complete. Prefer `rules.md` when it is stricter than the blueprint.

## Phase 1: Foundation

Target:
- Working Next.js + Supabase foundation
- Auth flow
- RBAC and tenant isolation
- Build/test/CI readiness

Done when:
- Supabase project is linked and migrations are applied
- Auth works with email/password and magic link
- Roles are enforced in app/API behavior
- RLS is verified so org A cannot access org B data
- App passes lint, typecheck, tests, and build
- Vercel config is ready; live deployment is the only acceptable external blocker

Reusable validation:
- `bash scripts/phase-gate.sh phase-1`

## Phase 2: Transaction Core

Target:
- Transaction ingestion, idempotency, queue/job skeleton, initial rule engine

Done when:
- `POST/GET` transaction flows work with authenticated tenant context
- No API trusts client-provided `organization_id`
- Ingestion is idempotent
- Transaction write creates follow-up work for scoring
- Validation and authz failures return clear errors

Suggested checks:
- API route tests or manual route exercise
- Schema review for transaction and job tables
- Audit trail coverage for transaction creation

## Phase 3: Risk and Alerts

Target:
- Risk scoring worker, `risk_scores`, alert generation, realtime feed

Done when:
- Scoring result is persisted and associated with the transaction
- Alert creation thresholds are enforced
- AI outputs are schema-validated before save
- Failure path falls back safely to analyst/manual review

Suggested checks:
- Worker execution path
- Negative tests for malformed AI output
- Alert visibility in tenant-scoped UI

## Phase 4: Case Ops and SAR

Target:
- Case lifecycle, alert linking, SAR draft generation, document access

Done when:
- Analyst can create a case from an alert
- SAR draft generation works with reviewable output
- Documents use secure storage paths and scoped access
- All write actions require authentication and produce audit records

## Phase 5: Auditability and Hardening

Target:
- Status guards, rate limiting, retries, broader negative-path testing

Done when:
- Write paths produce complete audit records
- Status transitions are validated
- Security and failure handling are visible and bounded

## Phase 6: Dashboard and Release Readiness

Target:
- Operational dashboard, observability, release checks, production readiness

Done when:
- MVP happy path works end to end
- Monitoring and runbook basics exist
- Production deployment and smoke tests are complete
