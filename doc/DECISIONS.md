# DECISIONS

- 2026-03-14 Codex — Initialized `/doc` tracking files because the repository was missing the required AGENTS.md context structure.
- 2026-03-14 Codex — Treated `rules.md` as the stricter Phase 2 gate while still documenting its conflict with `implementation_blueprint.md`; the audit uses both, but completion calls out the mismatch explicitly instead of silently choosing one.
- 2026-03-14 Codex — Moved transaction ingestion reliability into a Postgres RPC (`public.ingest_transaction`) so transaction creation, queue row creation, and audit insertion happen in one database transaction rather than three separate API calls.
- 2026-03-14 Codex — Added a unique transaction-job index and replay/backfill logic so idempotent retries can repair missing queue rows instead of only returning an existing transaction.
- 2026-03-14 Codex — Kept the worker execution model as an authenticated internal route plus queue claim RPC; scheduled runtime orchestration remains a separate follow-up because deployment steps were explicitly deferred for this task.
