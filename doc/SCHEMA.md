# SCHEMA

## Migration History Notes

Recorded local migrations:
- `20260314130000_mvp_core.sql`
- `20260314154000_audit_log_insert_policy.sql`
- `20260314160000_phase2_rules_and_job_claim.sql`
- `20260314183000_auth_bootstrap_and_profiles_policy.sql`
- `20260314195000_alerts_realtime_publication.sql`
- `20260314205000_phase2_sanctions_screening.sql`
- `20260314212000_phase2_ingestion_reliability.sql`
- `20260314223000_phase3_case_notes.sql`
- `20260314234500_phase2_scheduler_dispatch.sql`
- `20260315000500_regulatory_intelligence_mvp.sql`

Known drift to reconcile later:
- Live Supabase schema includes the sanctions-screening objects from `20260314205000_phase2_sanctions_screening.sql`, but that migration version is not present in the recorded migration ledger.

## 2026-03-14 — Phase 2 Ingestion Reliability

Added by:
- `supabase/migrations/20260314212000_phase2_ingestion_reliability.sql`

Schema changes:
- Added unique index `idx_jobs_unique_transaction_job` on `(organization_id, job_type, payload->>'transaction_id')` for transaction-processing jobs.
- Added RPC function `public.ingest_transaction(...)`.
- Granted `authenticated` execute access to `public.ingest_transaction(...)`.

Behavior changes:
- Transaction ingestion now creates the transaction, its worker jobs, and the ingestion audit record in one database transaction.
- Idempotent replays now requeue failed transaction-processing jobs when the transaction is still unprocessed.
- Existing transactions missing Phase 2 jobs were backfilled into the queue during migration application.

## 2026-03-14 — Phase 2 Scheduler Dispatch

Added by:
- `supabase/migrations/20260314234500_phase2_scheduler_dispatch.sql`

Schema changes:
- Enabled extensions `pg_cron` and `pg_net`
- Added security-definer helper function `public.invoke_phase2_job_scheduler(text[], integer)`

Behavior changes:
- Supabase can now dispatch scheduled Phase 2 queue processing through the hosted `process-jobs` Edge Function.
- The dispatch helper expects Vault secrets named `phase2_scheduler_project_url`, `phase2_scheduler_publishable_key`, `phase2_scheduler_app_url`, and `phase2_scheduler_job_secret`.
- Automatic execution is still blocked until `phase2_scheduler_app_url` points to a publicly reachable app deployment instead of local development.

## 2026-03-14 — Phase 3 Case Notes

Added by:
- `supabase/migrations/20260314223000_phase3_case_notes.sql`

Schema changes:
- Added table `public.case_notes`
  - `id UUID PRIMARY KEY`
  - `organization_id UUID REFERENCES organizations(id)`
  - `case_id UUID REFERENCES cases(id)`
  - `author_user_id UUID REFERENCES profiles(id)`
  - `note TEXT`
  - `created_at TIMESTAMPTZ`
- Added indexes `idx_case_notes_case_created` and `idx_case_notes_org_case`
- Enabled RLS on `public.case_notes`
- Added policy `case_notes_org_all`

Behavior changes:
- Cases can now store investigator notes and render a case timeline.
- SAR drafting can include investigator notes as part of the AI/manual narrative context.

## 2026-03-14 — Regulatory Intelligence MVP

Added by:
- `supabase/migrations/20260315000500_regulatory_intelligence_mvp.sql`

Schema changes:
- Added table `public.regulatory_documents`
  - `id UUID PRIMARY KEY`
  - `organization_id UUID REFERENCES organizations(id)`
  - `title TEXT`
  - `source TEXT`
  - `source_url TEXT`
  - `jurisdiction TEXT`
  - `document_type TEXT CHECK IN ('rule','guidance','enforcement','notice','policy','other')`
  - `content TEXT`
  - `summary TEXT`
  - `change_type TEXT`
  - `impact_level TEXT CHECK IN ('critical','high','medium','low')`
  - `key_points JSONB`
  - `affected_areas JSONB`
  - `action_items JSONB`
  - `tags JSONB`
  - `requires_attention BOOLEAN`
  - `attention_reason TEXT`
  - `analysis_status TEXT CHECK IN ('pending','completed','fallback','failed')`
  - `analysis_model TEXT`
  - `published_at TIMESTAMPTZ`
  - `effective_at TIMESTAMPTZ`
  - `analyzed_at TIMESTAMPTZ`
  - `created_by UUID REFERENCES profiles(id)`
  - `created_at TIMESTAMPTZ`
  - `updated_at TIMESTAMPTZ`
- Added indexes `idx_regulatory_documents_org_created`, `idx_regulatory_documents_org_attention`, and `idx_regulatory_documents_org_impact`
- Enabled RLS on `public.regulatory_documents`
- Added policy `regulatory_documents_org_all`

Behavior changes:
- The platform can now ingest regulatory content, persist summaries and action items, and mark high-impact updates that require attention.
- Regulatory intelligence queries are organization-scoped and support filtered list/detail views in the dashboard.
