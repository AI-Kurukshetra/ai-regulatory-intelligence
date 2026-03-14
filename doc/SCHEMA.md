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
