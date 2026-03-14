# BLOCKERS

[2026-03-14] BLOCKER — Codex
Problem:   Hosted Supabase cron cannot complete Phase 2 automatic job execution yet because the deployed `process-jobs` Edge Function must forward to `/api/internal/jobs/process`, and the current app URL is still `http://localhost:3000`, which is not reachable from Supabase.
Attempted: Added the Supabase scheduler dispatch migration, deployed the `process-jobs` Edge Function, regenerated types, and generated the local `JOB_RUNNER_SECRET`.
Needs:     A public application base URL to store in Vault as `phase2_scheduler_app_url`, then the cron job can safely call `public.invoke_phase2_job_scheduler(...)`.

Deferred follow-ups:
- Repair Supabase migration history drift for `20260314205000_phase2_sanctions_screening`.
