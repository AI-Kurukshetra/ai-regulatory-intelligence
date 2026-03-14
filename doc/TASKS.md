# TASKS

- [x] 2026-03-14 17:35 Codex — Audit the product brief against the repo phase plan and document Phase 2 coverage gaps.
- [x] 2026-03-14 18:00 Codex — Implement Phase 2 ingestion reliability fixes, queue backfill, overview dashboard snapshot, and the missing phase-gate script.
- [x] 2026-03-14 18:20 Codex — Audit Phase 3 scope against the repo source docs and record the architecture/gap analysis.
- [x] 2026-03-14 18:20 Codex — Implement the first Phase 3 slice: case workflow, investigator notes, SAR draft generation, reports API, and working cases/reports dashboard pages.
- [x] 2026-03-14 23:48 Codex — Prepare Supabase scheduled Edge Function orchestration for Phase 2 queue processing and generate the local `JOB_RUNNER_SECRET`.
- [x] 2026-03-14 23:59 Codex — Refresh the shared UI and add a light/night theme switch across the auth flow and dashboard shell.
- [x] 2026-03-14 18:34 Codex — Add the rapid MVP regulatory-intelligence slice: document ingestion/storage, AI summarization, search filters, intelligence dashboard pages, and overview integration.
- [x] 2026-03-14 18:37 Codex — Repair GitHub/CI `next build` failures by deferring Supabase env access until runtime usage.
- [x] 2026-03-14 18:44 Codex — Seed Supabase with demo data for the `bacancy.com` tenant so Overview, Transactions, Alerts, Cases, Reports, and Intelligence render with showable content.
- [x] 2026-03-14 18:49 Codex — Repair the local Next runtime after corrupted `.next` artifacts caused `_document` module and `routes-manifest.json` boot failures.
- [x] 2026-03-14 18:56 Codex — Deploy the app to Vercel, configure the required production environment variables, and publish `https://ai-regulatory-intelligence.vercel.app`.
- [ ] 2026-03-14 23:48 Codex — Activate hosted Supabase cron for `/api/internal/jobs/process` now that the public base URL `https://ai-regulatory-intelligence.vercel.app` is available.
- [ ] 2026-03-14 18:00 Codex — Repair Supabase migration history drift for `20260314205000_phase2_sanctions_screening` so the recorded ledger matches the live schema.
- [ ] 2026-03-14 18:20 Codex — Implement the remaining Phase 3 KYC document upload and AI analysis flow.
- [ ] 2026-03-14 18:20 Codex — Harden SAR generation into an asynchronous worker path if report-generation latency becomes a concern.
