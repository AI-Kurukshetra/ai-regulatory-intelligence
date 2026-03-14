# CHANGELOG

- 2026-03-14 Codex — Initialized the required `/doc` tracking structure from `AGENTS.md`.
- 2026-03-14 Codex — Added `supabase/migrations/20260314212000_phase2_ingestion_reliability.sql` with an atomic `ingest_transaction` RPC, a unique transaction-job index, and a backfill for missing Phase 2 queue rows.
- 2026-03-14 Codex — Applied the Phase 2 reliability migration to Supabase and regenerated `types/supabase.ts`.
- 2026-03-14 Codex — Refactored `app/api/v1/transactions/route.ts` to use the atomic ingestion RPC and return queue metadata.
- 2026-03-14 Codex — Updated `lib/ai/risk-scoring.ts` prompt context so sanctions screening is described as a separate worker instead of “not implemented”.
- 2026-03-14 Codex — Replaced the placeholder overview dashboard with a live Phase 2 operations snapshot in `app/(dashboard)/overview/page.tsx`.
- 2026-03-14 Codex — Added `scripts/phase-gate.sh` so Foundation and Transaction Core gates have a repeatable local validation command.
