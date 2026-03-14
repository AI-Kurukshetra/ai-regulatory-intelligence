# ⚙️ Development Rules, Configuration & Standards
## AML RegTech Platform — Codex AI Development Guide

> This file defines the rules, configuration, API keys, and development standards that **every AI agent and developer must follow** to achieve 100% consistent, high-quality output across the entire codebase.

---

## 1. API Keys & Environment Configuration

### Required `.env.local` (copy this exactly)
```env
# ============================================
# SUPABASE — https://supabase.com/dashboard
# Project: [Your Project Name]
# Org: [Your Org Name]
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...          # anon / public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...               # service_role SECRET — server only

# ============================================
# OPENAI — https://platform.openai.com/api-keys
# ============================================
OPENAI_API_KEY=sk-proj-...

# ============================================
# APP CONFIG
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=AML Intelligence Platform
NODE_ENV=development

# ============================================
# OPTIONAL — Add when integrating
# ============================================
# STRIPE_SECRET_KEY=sk_live_...               # billing
# STRIPE_WEBHOOK_SECRET=whsec_...
# RESEND_API_KEY=re_...                       # email notifications
# UPSTASH_REDIS_REST_URL=https://...          # rate limiting
# UPSTASH_REDIS_REST_TOKEN=...
# TRIGGER_API_KEY=tr_dev_...                  # background jobs
```

> **Security rules:**
> - `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` MUST NEVER appear in client-side code
> - Only variables prefixed `NEXT_PUBLIC_` are safe in browser bundles
> - Never commit `.env.local` to git — verify `.gitignore` includes it

---

## 2. Project Structure — Mandatory Convention

```
aml-platform/
├── .env.local                    ← secrets, never commit
├── .env.example                  ← committed, all keys with empty values
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── supabase/
│   ├── config.toml               ← supabase project config
│   └── migrations/               ← all SQL migration files
│       ├── 001_core_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_seed_rules.sql
│       └── ...
├── app/
│   ├── (auth)/                   ← public routes
│   ├── (dashboard)/              ← protected routes
│   └── api/                      ← Next.js API routes
├── components/
│   ├── ui/                       ← base components (shadcn + custom)
│   ├── dashboard/
│   ├── compliance/
│   ├── charts/
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts             ← browser client
│   │   ├── server.ts             ← server client
│   │   └── admin.ts              ← service role client
│   ├── ai/
│   │   ├── risk-scorer.ts
│   │   ├── sar-generator.ts
│   │   └── kyc-analyzer.ts
│   ├── compliance/
│   │   ├── sanctions.ts
│   │   ├── rules-engine.ts
│   │   └── audit.ts
│   └── utils/
│       ├── cn.ts
│       ├── formatters.ts
│       └── validators.ts
├── hooks/
│   ├── use-realtime-alerts.ts
│   ├── use-transactions.ts
│   └── use-auth.ts
├── types/
│   ├── supabase.ts               ← auto-generated, never edit manually
│   └── index.ts                  ← app-level types
└── public/
    └── sounds/                   ← alert sounds
```

---

## 3. Coding Standards — Rules Every AI Agent Must Follow

### 3.1 TypeScript Rules
```typescript
// ✅ ALWAYS: explicit types on all function parameters and return values
async function scoreTransaction(tx: Transaction): Promise<RiskScoring> { ... }

// ✅ ALWAYS: use Database types from Supabase-generated types
import type { Database } from '@/types/supabase'
type Transaction = Database['public']['Tables']['transactions']['Row']

// ❌ NEVER: use `any` type
const data: any = ...  // forbidden

// ❌ NEVER: ignore TypeScript errors with @ts-ignore
// @ts-ignore  // forbidden

// ✅ ALWAYS: null checks on Supabase responses
const { data, error } = await supabase.from('transactions').select().single()
if (error) return NextResponse.json({ error: error.message }, { status: 500 })
if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
```

### 3.2 API Route Rules
```typescript
// ✅ ALWAYS: authenticate every API route — no exceptions
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}

// ✅ ALWAYS: validate request body with Zod
import { z } from 'zod'
const CreateAlertSchema = z.object({
  transaction_id: z.string().uuid(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string().min(1).max(500),
})
const parsed = CreateAlertSchema.safeParse(body)
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

// ✅ ALWAYS: log audit trail for write operations
await logAudit(supabase, { action: 'alert.created', entity_type: 'alert', entity_id: alert.id })

// ✅ ALWAYS: return consistent response shape
return NextResponse.json({ data: result })          // success
return NextResponse.json({ error: 'message' }, { status: 4xx|5xx })  // error

// ❌ NEVER: expose raw Supabase errors to client
return NextResponse.json({ error: supabaseError })  // bad — leaks internals
```

### 3.3 Supabase Query Rules
```typescript
// ✅ ALWAYS: include organization_id filter on every query (belt + suspenders on top of RLS)
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('organization_id', orgId)   // explicit filter + RLS
  .order('created_at', { ascending: false })

// ✅ ALWAYS: use .select() with explicit columns on large tables — never SELECT *
.select('id, amount, risk_level, risk_score, status, created_at')

// ✅ ALWAYS: paginate large result sets
.range(page * limit, (page + 1) * limit - 1)

// ❌ NEVER: call supabase admin client from client components
import { supabaseAdmin } from '@/lib/supabase/admin'  // SERVER ONLY

// ✅ ALWAYS: handle both error and empty data cases
const { data, error } = await supabase.from('cases').select().single()
if (error?.code === 'PGRST116') return null  // not found
if (error) throw error
```

### 3.4 AI / OpenAI Rules
```typescript
// ✅ ALWAYS: use response_format: json_object for structured data
const response = await openai.chat.completions.create({
  model: 'gpt-4o',                    // always gpt-4o for this project
  response_format: { type: 'json_object' },
  temperature: 0.1,                   // low temperature for compliance scoring
  messages: [...]
})

// ✅ ALWAYS: parse and validate AI response with try/catch
try {
  const result = JSON.parse(response.choices[0].message.content!)
  const validated = RiskScoringSchema.parse(result)  // zod validation
  return validated
} catch (error) {
  console.error('AI response parsing failed:', error)
  // Return safe fallback — never crash on AI failure
  return { score: 50, level: 'medium', explanation: 'Manual review required', factors: [] }
}

// ✅ ALWAYS: include model version in risk_scores table
await supabase.from('risk_scores').insert({ model_version: 'gpt-4o', ... })

// ❌ NEVER: call OpenAI from client-side components
// All AI calls go through Next.js API routes
```

### 3.5 Component Rules
```typescript
// ✅ ALWAYS: use 'use client' only when needed (hooks, events, browser APIs)
// Default to Server Components

// ✅ ALWAYS: use Suspense + loading.tsx for async server components
export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionTableSkeleton />}>
      <TransactionTable />
    </Suspense>
  )
}

// ✅ ALWAYS: handle loading and error states in every data component
if (isLoading) return <SkeletonTable />
if (error) return <ErrorState message={error.message} />
if (!data?.length) return <EmptyState />

// ✅ ALWAYS: use GlassCard for all container elements
// ❌ NEVER: use plain white backgrounds or gray-100 surfaces

// ✅ ALWAYS: format financial data with monospace font + locale formatting
{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
```

---

## 4. Git & Commit Standards

```bash
# Commit message format: <type>(<scope>): <description>
feat(transactions): add real-time risk scoring pipeline
fix(alerts): resolve websocket disconnection on tab switch
chore(db): add migration for sanctions screening results table
docs(api): update transaction endpoint documentation
refactor(ai): extract SAR generation to dedicated service

# Branch naming
feature/transaction-monitoring
fix/alert-assignment-bug
chore/update-sanctions-lists
migration/add-kyc-records-table
```

**Commit rules:**
- Never commit directly to `main` — use feature branches
- Every database change needs a migration file in `/supabase/migrations/`
- Run `supabase gen types typescript --linked > types/supabase.ts` after every schema change and commit the updated types file
- Never commit `.env.local`, never commit secrets

---

## 5. Database Migration Rules (Critical)

```bash
# WORKFLOW for every schema change:

# 1. Create migration file (use timestamp format)
# File: supabase/migrations/YYYYMMDDHHMMSS_describe_change.sql

# 2. Write SQL in migration file
# Example: supabase/migrations/20260310120000_add_entity_resolution.sql

# 3. Push to your Supabase project
supabase db push

# 4. Regenerate TypeScript types
supabase gen types typescript --linked > types/supabase.ts

# 5. Commit both files
git add supabase/migrations/20260310120000_add_entity_resolution.sql
git add types/supabase.ts
git commit -m "chore(db): add entity resolution table"
```

**Migration rules:**
- Migrations are APPEND-ONLY — never edit a migration that has been pushed
- Always test with `supabase db diff` before pushing
- Every table must have `organization_id` for multi-tenant isolation
- Every table must have `created_at TIMESTAMPTZ DEFAULT NOW()`
- Always create indexes for columns used in WHERE clauses
- Never use `DROP TABLE` or `DROP COLUMN` without a data migration plan

---

## 6. Security Checklist (Every PR)

- [ ] No API keys or secrets in code — all from `process.env`
- [ ] Every API route has authentication check
- [ ] Every Supabase query filtered by `organization_id`
- [ ] RLS policies verified for new tables
- [ ] Input validation with Zod on all POST/PATCH endpoints
- [ ] Audit log entry for every write operation
- [ ] No raw SQL in application code — use Supabase query builder
- [ ] No `supabaseAdmin` calls from client-side code
- [ ] Sensitive data (PII, documents) handled via signed URLs only
- [ ] No console.log with sensitive data in production code

---

## 7. AI Prompt Engineering Standards

When writing OpenAI prompts in this project:

```typescript
// Template for all risk/compliance prompts
const SYSTEM_CONTEXT = `You are an expert AML (Anti-Money Laundering) compliance system for a regulated financial institution.
You analyze financial data to detect suspicious activities following FinCEN, FATF, and Basel AML guidelines.
Always be precise, factual, and provide explainable reasoning that satisfies regulatory requirements.
Your outputs will be reviewed by licensed compliance officers.`

// Rules:
// 1. Always specify response format (JSON for structured data)
// 2. Always include scoring rubric in prompt
// 3. Always use temperature 0.1-0.2 for scoring/classification
// 4. Always use temperature 0.3-0.5 for narrative generation
// 5. Always validate response with Zod schema
// 6. Always provide fallback if AI fails
// 7. Store model version with every AI-generated record
// 8. Never include raw customer PII in prompts — use anonymized IDs
```

---

## 8. Performance Standards

| Metric | Target |
|---|---|
| API response time (P95) | < 500ms |
| AI scoring (async) | < 5s |
| Page load (LCP) | < 2.5s |
| Transaction table (1000 rows) | < 100ms render |
| Realtime alert delivery | < 1s |
| Supabase query (indexed) | < 50ms |

**Optimization rules:**
- Use `React.memo` on table row components
- All data tables must use TanStack Virtual (windowing)
- Charts load lazily via `next/dynamic`
- Supabase queries: always select specific columns, always paginate
- AI calls are always async — never block user-facing responses

---

## 9. Testing Standards

```bash
# Test file naming
transaction.test.ts         ← unit tests for utilities
api/transactions.test.ts    ← API route integration tests
e2e/alert-workflow.test.ts  ← Playwright end-to-end

# Test coverage requirements (enforced in CI)
# Utilities: 80%+
# API routes: 70%+
# Components: 60%+
```

**Critical paths that MUST have tests:**
1. Transaction risk scoring pipeline
2. Sanctions screening match/no-match
3. SAR generation and approval workflow
4. Authentication + RLS (verify data isolation between orgs)
5. Audit log append-only verification

---

## 10. Deployment Checklist (Vercel)

```bash
# Environment variables to add in Vercel Dashboard:
# Project Settings → Environment Variables

NEXT_PUBLIC_SUPABASE_URL          ← all environments
NEXT_PUBLIC_SUPABASE_ANON_KEY     ← all environments
SUPABASE_SERVICE_ROLE_KEY         ← production + preview only
OPENAI_API_KEY                    ← production + preview only
NEXT_PUBLIC_APP_URL               ← per environment

# Vercel build command
npm run build

# next.config.ts recommended settings
const config = {
  experimental: { serverActions: { allowedOrigins: ['your-domain.com'] } },
  images: { remotePatterns: [{ hostname: '*.supabase.co' }] },
}
```

**Pre-deploy checklist:**
- [ ] All migrations applied to production Supabase project
- [ ] `supabase gen types` committed
- [ ] Environment variables set in Vercel
- [ ] Supabase Auth → URL Configuration → add production domain
- [ ] Supabase Auth → Redirect URLs → add `https://your-domain.com/auth/callback`
- [ ] RLS policies tested in production environment
- [ ] Supabase Realtime enabled on `alerts`, `transactions`, `notifications` tables

---

## 11. MVP Completion Checklist

### Phase 1 — Foundation ✓ when:
- [ ] Supabase project linked, all migrations applied
- [ ] Auth working (email/password + magic link)
- [ ] RBAC: admin, compliance_officer, analyst roles enforced
- [ ] RLS verified: org A cannot see org B data
- [ ] Next.js skeleton deployed to Vercel

### Phase 2 — Transaction Core ✓ when:
- [ ] POST /api/transactions works and stores data
- [ ] OpenAI risk scoring runs and updates transaction
- [ ] Alert auto-created for score >= 70
- [ ] Realtime alerts appear in dashboard < 1s
- [ ] OFAC sanctions screening on new transactions

### Phase 3 — Compliance Operations ✓ when:
- [ ] Case creation from alerts
- [ ] SAR AI draft generation works
- [ ] KYC document upload + AI analysis
- [ ] Audit log records every write action
- [ ] All write actions require authentication

### Phase 4 — Dashboard + API ✓ when:
- [ ] Overview dashboard KPIs load correctly
- [ ] All 20 API endpoint groups respond
- [ ] Compliance officer can create/submit a SAR end-to-end
- [ ] Audit trail is complete and read-only

---

## 12. Common Supabase Gotchas & Solutions

| Problem | Solution |
|---|---|
| RLS blocking service role | Use `supabaseAdmin` (service role bypasses RLS) |
| Realtime not firing | Check table is added to `supabase_realtime` publication |
| Types out of sync | Run `supabase gen types typescript --linked > types/supabase.ts` |
| Auth session on server | Use `createServerClient` from `@supabase/ssr`, not `createClient` |
| Cookies error in API route | Import `cookies` from `next/headers`, not from `@supabase/ssr` |
| Storage 403 error | Check bucket policy — private buckets need signed URLs |
| Migration not applying | Run `supabase db push` and check for conflicts with `supabase db diff` |
| Edge function timeout | Max 150s — use background jobs (Trigger.dev) for long tasks |
| Fuzzy name matching slow | Add `pg_trgm` GIN index on name columns |
