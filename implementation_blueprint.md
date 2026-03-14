# Build-Ready Implementation Blueprint

## 1. Decision: Do Existing Files Match?

Short answer: **partially**.  
`backend.md`, `frontend.md`, and `rules.md` are strong draft guides, but they are **not fully build-ready** as a single implementation source of truth.

### What already matches
- Strong feature coverage for AML use cases (transactions, alerts, cases, SAR, KYC, sanctions).
- Good Supabase + Next.js direction.
- Useful coding/security/testing conventions.
- MVP phase intent is present.

### Critical gaps to fix before implementation
- API examples include risky patterns for Vercel serverless (fire-and-forget async in request handlers).
- Tenant isolation is incomplete (RLS not shown for every table and write-policy detail is uneven).
- `organization_id` is accepted from request body in examples; should be derived from authenticated user profile.
- No strict API contract (versioned request/response/error schema).
- No idempotency strategy for ingestion endpoints.
- Model/versioning guidance is hardcoded and outdated-prone (`gpt-4o` hardcoded in docs).
- No production job orchestration contract (queue/outbox/worker ownership and retries).

This document replaces those gaps with an executable plan.

---

## 2. Product PRD (MVP-first)

### 2.1 Objective
Build a US-focused AML compliance platform for mid-sized banks/fintechs that:
- Ingests transactions in near real-time.
- Scores risk using rule + AI hybrid detection.
- Creates and triages alerts.
- Supports case investigation workflow.
- Generates SAR drafts for compliance officer review.
- Preserves full audit trail for regulatory defensibility.

### 2.2 Primary users
- `compliance_officer`: triage alerts, manage cases, approve SAR.
- `analyst`: investigate, annotate, escalate.
- `admin`: organization settings, users, rules.
- `auditor`: read-only access to evidence trail.

### 2.3 MVP scope (must ship)
- Auth + RBAC + org isolation.
- Transaction ingestion API (idempotent).
- Rule engine v1 (threshold + velocity + geo high-risk country checks).
- AI-assisted risk scoring (structured JSON output).
- Alert lifecycle (`new`, `in_review`, `escalated`, `resolved`, `false_positive`).
- Case workflow (create from alert, link entities, investigator notes).
- SAR draft generation and status tracking.
- Immutable audit logs.
- Dashboard KPIs and live alert feed.

### 2.4 Out of scope (post-MVP)
- Multi-jurisdiction filing logic.
- Graph analytics and adaptive learning loops.
- Mobile app.
- Cryptocurrency chain analytics.

### 2.5 Non-functional requirements
- `P95` read API latency `< 500ms` (non-AI routes).
- Ingestion endpoint returns `< 800ms` and enqueues scoring async.
- Alert creation SLA `< 10s` from ingestion for normal load.
- Uptime target: `99.9%`.
- Full tenant isolation with RLS and org-scoped queries.
- All write operations auditable with actor + before/after payload.

---

## 3. Phased Technical Architecture (Next.js + Supabase + Vercel)

### 3.1 Runtime split
- **Next.js on Vercel**
  - App Router UI.
  - API routes for authenticated CRUD and ingestion.
  - Server components for secure data reads.
- **Supabase**
  - Postgres primary data store.
  - Auth + RLS + Storage.
  - Realtime for alerts/cases notifications.
  - Edge Functions for background workers/scheduled syncs.

### 3.2 Core services
- `ingestion-service` (API route): validate + persist transaction + enqueue job.
- `risk-worker` (Edge Function cron/webhook): fetch queued jobs, run rules + AI, persist risk + create alerts.
- `sanctions-worker`: scheduled watchlist sync + name screening.
- `sar-service`: generate drafts from case evidence and linked transactions.
- `audit-service`: centralized write-path logging helper.

### 3.3 Data flow (MVP)
1. External source calls `POST /api/v1/transactions` with idempotency key.
2. API stores transaction as `pending` and inserts `jobs` row.
3. Worker picks job (`FOR UPDATE SKIP LOCKED`), computes risk + reasons.
4. Worker updates transaction risk fields and inserts `risk_scores`.
5. If threshold crossed, worker inserts `alerts` row.
6. UI subscribes to alerts via Supabase Realtime.
7. Analyst converts alert to case; case links evidence/transactions.
8. SAR draft is generated and reviewed/approved.
9. Every write emits `audit_logs`.

### 3.4 Why this architecture
- Avoids unreliable in-request background promises in serverless.
- Keeps ingestion fast and durable.
- Preserves regulator-friendly traceability and replayability.

---

## 4. Database Schema (MVP, Supabase/Postgres)

Use a first migration like: `supabase/migrations/20260314130000_mvp_core.sql`.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN ('admin','compliance_officer','analyst','auditor','readonly')),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  external_id TEXT,
  full_name TEXT NOT NULL,
  country_of_residence TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','in_review','verified','rejected')),
  risk_tier TEXT NOT NULL DEFAULT 'standard' CHECK (risk_tier IN ('low','standard','high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_id)
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID REFERENCES customers(id),
  external_id TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_id)
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  idempotency_key TEXT NOT NULL,
  external_tx_id TEXT,
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  amount NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  counterparty_country TEXT,
  transaction_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','flagged','blocked','failed')),
  risk_score INT CHECK (risk_score BETWEEN 0 AND 100),
  risk_level TEXT CHECK (risk_level IN ('critical','high','medium','low','unknown')),
  risk_explanation TEXT,
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('threshold','velocity','geo','custom')),
  conditions JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  level TEXT NOT NULL CHECK (level IN ('critical','high','medium','low','unknown')),
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_provider TEXT NOT NULL DEFAULT 'openai',
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  transaction_id UUID REFERENCES transactions(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','escalated','resolved','false_positive')),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  case_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','pending_sar','sar_filed','closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, case_number)
);

CREATE TABLE case_alerts (
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, alert_id)
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL DEFAULT 'SAR' CHECK (report_type IN ('SAR')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','submitted','rejected')),
  narrative TEXT,
  generated_by_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('kyc','case','sar','evidence')),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  job_type TEXT NOT NULL CHECK (job_type IN ('score_transaction','screen_sanctions','generate_sar')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_org_created ON transactions(organization_id, created_at DESC);
CREATE INDEX idx_tx_org_status ON transactions(organization_id, status);
CREATE INDEX idx_alert_org_status ON alerts(organization_id, status, created_at DESC);
CREATE INDEX idx_case_org_status ON cases(organization_id, status, created_at DESC);
CREATE INDEX idx_jobs_status_run_after ON jobs(status, run_after);

-- Append-only audit logs
CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

### 4.1 RLS baseline
- Enable RLS on every tenant table.
- Policy pattern:
  - `USING (organization_id = current_org_id())`
  - `WITH CHECK (organization_id = current_org_id())`
- Never accept `organization_id` from API payload; derive from authenticated profile.
- Keep `service_role` usage restricted to server-only worker paths.

---

## 5. API Contracts (v1)

Base path: `/api/v1`  
Auth: Supabase session JWT (cookie/header).  
Response envelope:
- Success: `{ "data": ..., "meta": ...? }`
- Error: `{ "error": { "code": "STRING", "message": "human readable", "details": ...? } }`

### 5.1 Ingest transaction
- `POST /transactions`
- Headers: `Idempotency-Key: <uuid-or-unique-string>`
- Request:
```json
{
  "external_tx_id": "tx_100923",
  "from_account_id": "uuid",
  "to_account_id": "uuid",
  "amount": 12500.5,
  "currency": "USD",
  "transaction_type": "wire",
  "counterparty_country": "AE"
}
```
- `201`:
```json
{
  "data": {
    "id": "uuid",
    "status": "pending",
    "risk_score": null
  }
}
```

### 5.2 List transactions
- `GET /transactions?status=flagged&limit=50&cursor=...`
- `200` includes cursor pagination metadata.

### 5.3 Get transaction detail
- `GET /transactions/:id`
- Includes latest risk score factors and linked alerts.

### 5.4 List alerts
- `GET /alerts?status=new&severity=high`

### 5.5 Update alert
- `PATCH /alerts/:id`
- Request:
```json
{
  "status": "in_review",
  "assigned_to": "uuid"
}
```

### 5.6 Create case from alert
- `POST /cases`
- Request:
```json
{
  "title": "Potential structuring pattern",
  "priority": "high",
  "alert_ids": ["uuid"]
}
```

### 5.7 Update case
- `PATCH /cases/:id`
- Supports status transitions with server-side validation.

### 5.8 Generate SAR draft
- `POST /cases/:id/sar-draft`
- `202` accepted (job queued), then `GET /reports/:id` for result.

### 5.9 List reports
- `GET /reports?status=draft`

### 5.10 Audit feed
- `GET /audit?entity_type=case&entity_id=uuid`
- `admin/compliance_officer/auditor` only.

### 5.11 Error codes (minimum set)
- `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT_IDEMPOTENCY`, `RATE_LIMITED`, `INTERNAL_ERROR`.

---

## 6. AI Integration Contract (Codex/OpenAI key compatible)

### 6.1 Env
- `OPENAI_API_KEY`
- `OPENAI_MODEL_RISK_SCORING` (example: `gpt-5-mini`)
- `OPENAI_MODEL_SAR_DRAFT` (example: `gpt-5`)

### 6.2 Rules
- AI is **assistive**, not final authority for filing decisions.
- Prompt payload must avoid unnecessary PII where possible.
- All model outputs validated by Zod before persistence.
- On AI failure, set transaction to `failed` or safe fallback path and create analyst task.
- Persist `model_name`, `model_provider`, and inference timestamp for every AI-generated artifact.

---

## 7. Sprint Plan (6 sprints, 1 week each)

### Sprint 1: Foundation
- Deliverables:
  - Next.js app scaffold + auth flow.
  - Supabase project setup, migrations, generated types.
  - RBAC + base RLS policies.
- Exit criteria:
  - User can sign in and only see their org data.
  - CI runs lint + typecheck + tests.

### Sprint 2: Transaction Core
- Deliverables:
  - `POST/GET /transactions` with idempotency.
  - Queue table + worker skeleton.
  - Rule engine v1.
- Exit criteria:
  - New transaction is persisted and queued reliably.

### Sprint 3: Risk + Alerts
- Deliverables:
  - AI scoring worker with structured response validation.
  - `risk_scores` persistence.
  - Alert creation and realtime feed.
- Exit criteria:
  - Alert appears in UI within SLA from ingestion.

### Sprint 4: Case Ops + SAR Draft
- Deliverables:
  - Case CRUD + linking alerts.
  - SAR draft generation endpoint + reports lifecycle.
  - Document upload storage paths and signed URL access.
- Exit criteria:
  - Analyst can move from alert to case and request SAR draft.

### Sprint 5: Auditability + Hardening
- Deliverables:
  - Audit middleware for all write operations.
  - Status transition guards.
  - Security checks, rate limiting, retry/backoff.
- Exit criteria:
  - Audit trail complete and append-only.
  - Negative-path tests passing (cross-tenant access blocked).

### Sprint 6: Dashboard + Release Readiness
- Deliverables:
  - KPI dashboard and operational metrics.
  - Load/perf checks, observability, runbooks.
  - Vercel production configuration and smoke tests.
- Exit criteria:
  - MVP demo: ingest -> score -> alert -> case -> SAR draft end-to-end.

---

## 8. Acceptance Checklist (Go-Live Gate)

- [ ] No API route trusts client-provided `organization_id`.
- [ ] All tenant tables have RLS enabled + tested.
- [ ] Ingestion is idempotent.
- [ ] Worker retries are bounded and observable.
- [ ] All writes create audit logs.
- [ ] AI outputs are schema-validated before save.
- [ ] Security review complete (secrets, authz, storage URLs, logs).
- [ ] E2E happy path and tenant-isolation tests pass.

---

## 9. How to Use Existing Files with This Blueprint

- Keep:
  - `frontend.md` for visual/UX direction.
  - Most coding conventions from `rules.md`.
  - Core domain table ideas from `backend.md`.
- Replace/override with this document:
  - Background job execution pattern.
  - API contracts and idempotency.
  - RLS completeness and org derivation rule.
  - AI model/version configurability.
