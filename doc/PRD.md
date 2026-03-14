# PRD

## Source Summary

Primary product source:
- `AI-Powered Regulatory Intelligence Platform.pdf`

Primary planning sources:
- `implementation_blueprint.md`
- `rules.md`

## Core Product Requirements

Must-have requirements from the product brief:
- Real-time transaction monitoring
- ML/AI-based risk scoring
- SAR generation
- Customer due diligence and KYC automation
- Sanctions screening
- Case management
- Regulatory reporting dashboard
- Alert management
- Rule engine
- Audit trail management
- Multi-jurisdiction compliance
- Role-based access control
- Integration APIs
- Security and encryption baseline

Important requirements from the product brief:
- False-positive reduction
- Custom risk parameters
- Batch processing
- Entity resolution
- Workflow automation
- Risk assessment reports

## Coverage Audit Notes

Well covered by the repo phase plan:
- Auth, RBAC, org isolation
- Transaction ingestion with idempotency
- Queue/job processing model
- Rule-based and AI-assisted risk scoring
- Alerts, realtime feed, cases, SAR workflow
- Audit logging and hardening
- Dashboard and release-readiness work

Not fully covered or only partially covered in the phase plan:
- Customer due diligence automation
- KYC verification and document analysis
- Multi-jurisdiction compliance depth
- Batch screening/processing of historical transactions
- Entity resolution / relationship graphing
- Risk assessment reports for management/regulators
- Broader integration API coverage beyond core MVP routes
- Explicit encryption/data protection work beyond general security review

Planning conflict to keep in mind:
- `implementation_blueprint.md` places AI scoring, alerts, and realtime feed in Sprint 3.
- `rules.md` uses a stricter Phase 2 gate that already expects scoring, auto-alerting, realtime alerts, and OFAC screening.
- Current repo implementation follows the stricter `rules.md` interpretation more closely than the sprint table.

## Phase 3 Scope Audit

Based on the repo source-of-truth, the next implementation phase is:
- Case creation from alerts
- Case lifecycle/status handling
- Investigator notes and timeline support
- SAR draft generation and report persistence
- KYC document upload and AI-assisted analysis

Phase 3 gaps or mismatches that remain visible:
- The user prompt's examples around regulatory document summarization, regulatory change alerts, AI search, and impact detection are not part of the current repo phase plan.
- Those "regulatory intelligence" features would require a plan update because the current product and sprint docs are scoped around AML case operations, SAR drafting, and KYC workflow instead.
- KYC upload + AI analysis is still only partially planned in the repo and remains unimplemented after the initial Phase 3 slice completed in this session.

## Phase 3 Technical Architecture

Backend/API:
- `POST /api/v1/cases` creates a case from one or more alerts, links them through `case_alerts`, updates the alerts to `in_review`, and writes audit events.
- `GET/PATCH /api/v1/cases/:id` exposes case detail and controlled status updates.
- `POST /api/v1/cases/:id/notes` appends investigator notes.
- `POST /api/v1/cases/:id/sar-draft` generates or refreshes a SAR draft and persists it in `reports`.
- `GET /api/v1/reports` and `GET /api/v1/reports/:id` provide report visibility.

Database:
- `case_notes` stores investigator notes by case, organization, and author.
- Existing `cases`, `case_alerts`, `alerts`, `reports`, `documents`, and `audit_logs` tables remain the primary Phase 3 entities.

AI pipeline:
- SAR drafts are generated from linked case context: case metadata, linked alerts, linked transactions, and investigator notes.
- The current implementation uses direct AI generation with a deterministic fallback narrative when OpenAI is unavailable.
- A queued/background SAR worker is still a future hardening step rather than part of this first Phase 3 slice.

UI:
- Alerts expose alert-to-case conversion.
- Cases have a real list page and a detail page for notes, status, linked alerts/transactions, and SAR drafting.
- Reports have a real list page with narrative preview and case linkage.
