# AI Regulatory Intelligence

Next.js + Supabase AML intelligence platform scaffold.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy env template and set values:

```bash
cp .env.example .env.local
```

3. Run dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Current status

- Phase 1 scaffold completed.
- Auth route + protected dashboard shell ready.
- Supabase clients (`browser`, `server`, `admin`) added.
- Initial MVP migration file created:
  - `supabase/migrations/20260314130000_mvp_core.sql`

## Next implementation targets

- Transaction ingestion API (`POST /api/v1/transactions`)
- Worker job processor (risk scoring + alert creation)
- Case workflow and SAR draft endpoint
