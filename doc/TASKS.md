# TASKS

- [x] 2026-03-14 17:35 Codex — Audit the product brief against the repo phase plan and document Phase 2 coverage gaps.
- [x] 2026-03-14 18:00 Codex — Implement Phase 2 ingestion reliability fixes, queue backfill, overview dashboard snapshot, and the missing phase-gate script.
- [x] 2026-03-14 18:20 Codex — Audit Phase 3 scope against the repo source docs and record the architecture/gap analysis.
- [x] 2026-03-14 18:20 Codex — Implement the first Phase 3 slice: case workflow, investigator notes, SAR draft generation, reports API, and working cases/reports dashboard pages.
- [x] 2026-03-14 23:48 Codex — Prepare Supabase scheduled Edge Function orchestration for Phase 2 queue processing and generate the local `JOB_RUNNER_SECRET`.
- [x] 2026-03-14 23:59 Codex — Refresh the shared UI and add a light/night theme switch across the auth flow and dashboard shell.
- [!] 2026-03-14 23:48 Codex — Activate hosted Supabase cron for `/api/internal/jobs/process`; blocked until the app has a public base URL instead of `http://localhost:3000`.
- [ ] 2026-03-14 18:00 Codex — Repair Supabase migration history drift for `20260314205000_phase2_sanctions_screening` so the recorded ledger matches the live schema.
- [ ] 2026-03-14 18:20 Codex — Implement the remaining Phase 3 KYC document upload and AI analysis flow.
- [ ] 2026-03-14 18:20 Codex — Harden SAR generation into an asynchronous worker path if report-generation latency becomes a concern.
