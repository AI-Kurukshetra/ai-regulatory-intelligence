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
