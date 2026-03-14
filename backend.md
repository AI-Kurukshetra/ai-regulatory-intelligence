# 🗄️ Backend Guide — Supabase + Next.js AML Platform

> **Stack:** Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) · Next.js 14 API Routes · OpenAI API  
> **Purpose:** Full backend specification + Supabase integration setup for AI-assisted development

---

## 1. Project Requirements Overview

### Core Backend Responsibilities
1. **Transaction ingestion & real-time processing** — receive, store, and instantly score incoming transactions
2. **AI-powered risk scoring** — call OpenAI API, store results, return explanation
3. **Alert lifecycle management** — create, assign, escalate, resolve alerts
4. **Case management** — investigations, evidence, approval workflows
5. **SAR generation** — AI-drafted Suspicious Activity Reports stored as documents
6. **KYC pipeline** — identity verification document storage and status tracking
7. **Sanctions screening** — match customers/transactions against watchlists
8. **Audit trail** — immutable log of every action in the system
9. **Multi-tenant isolation** — each financial institution is a separate `organization`
10. **REST API** — 20 endpoint groups for external system integration

---

## 2. Supabase Setup — Complete Connection Guide

### 2.1 Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase
```

### 2.2 Environment Variables
Create `.env.local` in your Next.js root:
```env
# Supabase — get from: supabase.com → your project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Server-only (never expose to client)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI
OPENAI_API_KEY=your_openai_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Where to find keys:** Supabase Dashboard → Your Project → Settings → API  
> `NEXT_PUBLIC_SUPABASE_URL` = Project URL  
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `anon` `public` key  
> `SUPABASE_SERVICE_ROLE_KEY` = `service_role` `secret` key ← **server only, never in client code**

### 2.3 Supabase Client Setup

**Browser Client** (for client components):
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server Client** (for Server Components, API routes):
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Admin Client** (for Edge Functions / privileged server operations):
```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Only use server-side — never expose service_role key to browser
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

### 2.4 Supabase CLI — For Direct DB Management (Codex-Friendly)
```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to your existing project
supabase link --project-ref YOUR_PROJECT_ID
# (find project ref: supabase.com → project → Settings → General → Reference ID)

# Pull existing schema to local
supabase db pull

# Apply local migrations to remote
supabase db push

# Generate TypeScript types from your schema
supabase gen types typescript --linked > types/supabase.ts
```

> **For AI (Codex) use:** Codex can write and run migration SQL files. The workflow is:
> 1. Codex creates `/supabase/migrations/YYYYMMDDHHMMSS_description.sql`
> 2. Run `supabase db push` to apply to your live project
> 3. Run `supabase gen types typescript --linked > types/supabase.ts` to regenerate types

---

## 3. Complete Database Schema

### 3.1 Core Entities — SQL Migrations

```sql
-- ============================================
-- MIGRATION: 001_core_schema.sql
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search on names

-- ============================================
-- ORGANIZATIONS (Multi-tenancy root)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'US',
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin','compliance_officer','analyst','auditor','readonly')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  external_id TEXT,                        -- ID in the bank's core system
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  nationality TEXT,
  country_of_residence TEXT,
  customer_type TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual','business')),
  risk_tier TEXT DEFAULT 'standard' CHECK (risk_tier IN ('low','standard','high','unacceptable')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','in_review','verified','rejected','expired')),
  pep_flag BOOLEAN DEFAULT FALSE,           -- Politically Exposed Person
  sanctions_flag BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACCOUNTS
-- ============================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID REFERENCES customers(id),
  account_number TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('checking','savings','business','crypto','investment')),
  currency TEXT DEFAULT 'USD',
  balance DECIMAL(20,4),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','frozen','closed','suspended')),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  external_tx_id TEXT,                      -- bank's transaction reference
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  from_entity TEXT,                         -- external party name
  to_entity TEXT,
  amount DECIMAL(20,4) NOT NULL,
  currency TEXT DEFAULT 'USD',
  fx_rate DECIMAL(10,6) DEFAULT 1,
  amount_usd DECIMAL(20,4),                 -- normalized amount
  transaction_type TEXT CHECK (transaction_type IN ('transfer','wire','cash_deposit','cash_withdrawal','crypto','trade','payment','refund')),
  channel TEXT CHECK (channel IN ('online','branch','atm','api','swift','sepa','crypto')),
  jurisdiction TEXT DEFAULT 'US',
  counterparty_country TEXT,
  description TEXT,
  reference TEXT,
  metadata JSONB DEFAULT '{}',
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('critical','high','medium','low','unknown')),
  risk_explanation TEXT,                    -- AI-generated explanation
  risk_scored_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','flagged','blocked','reversed')),
  flagged BOOLEAN DEFAULT FALSE,
  flagged_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_org ON transactions(organization_id);
CREATE INDEX idx_transactions_risk ON transactions(risk_level, risk_score DESC);
CREATE INDEX idx_transactions_flagged ON transactions(flagged) WHERE flagged = TRUE;
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ============================================
-- RISK SCORES (detailed history)
-- ============================================
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction','customer','account')),
  entity_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  level TEXT NOT NULL CHECK (level IN ('critical','high','medium','low','unknown')),
  factors JSONB DEFAULT '[]',               -- array of contributing factors
  ai_explanation TEXT,
  model_version TEXT DEFAULT 'gpt-4o',
  scored_by UUID REFERENCES profiles(id),  -- null = AI scored
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERTS
-- ============================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'structuring','velocity','unusual_pattern','sanctions_hit','pep_match',
    'threshold_breach','geo_anomaly','relationship_network','dormant_account',
    'rapid_movement','crypto_mixing','trade_based'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new','in_review','escalated','resolved','false_positive','suppressed')),
  transaction_id UUID REFERENCES transactions(id),
  customer_id UUID REFERENCES customers(id),
  account_id UUID REFERENCES accounts(id),
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,                          -- AI-generated alert summary
  rule_triggered TEXT,                      -- which rule fired this
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  false_positive_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_org_status ON alerts(organization_id, status);
CREATE INDEX idx_alerts_severity ON alerts(severity, created_at DESC);

-- ============================================
-- CASES (Investigation cases)
-- ============================================
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  case_number TEXT UNIQUE NOT NULL,         -- e.g. CASE-2026-001234
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','pending_sar','sar_filed','closed','rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  case_type TEXT CHECK (case_type IN ('aml','fraud','sanctions','kyc_failure','insider','other')),
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  due_date TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sar_required BOOLEAN DEFAULT FALSE,
  sar_filed BOOLEAN DEFAULT FALSE,
  total_amount_involved DECIMAL(20,4),
  currency TEXT DEFAULT 'USD',
  ai_risk_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CASE LINKS (many-to-many: cases ↔ alerts/transactions/customers)
-- ============================================
CREATE TABLE case_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('alert','transaction','customer','account','document')),
  entity_id UUID NOT NULL,
  added_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAR REPORTS (Suspicious Activity Reports)
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  case_id UUID REFERENCES cases(id),
  report_type TEXT DEFAULT 'SAR' CHECK (report_type IN ('SAR','CTR','STR','MLRO')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','approved','submitted','acknowledged','rejected')),
  reference_number TEXT,                    -- regulator's reference
  jurisdiction TEXT DEFAULT 'US',
  filing_institution TEXT,
  subject_name TEXT,
  subject_account TEXT,
  activity_start_date DATE,
  activity_end_date DATE,
  total_amount DECIMAL(20,4),
  currency TEXT DEFAULT 'USD',
  narrative TEXT,                           -- AI-generated narrative
  ai_drafted BOOLEAN DEFAULT TRUE,
  draft_generated_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  document_url TEXT,                        -- Supabase Storage URL
  regulator_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- KYC RECORDS
-- ============================================
CREATE TABLE kyc_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  verification_type TEXT CHECK (verification_type IN ('initial','enhanced','refresh','pep_check','adverse_media')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','passed','failed','expired','requires_action')),
  id_document_type TEXT CHECK (id_document_type IN ('passport','national_id','drivers_license','utility_bill','bank_statement')),
  id_document_number TEXT,
  id_expiry_date DATE,
  id_document_url TEXT,                     -- Supabase Storage
  selfie_url TEXT,
  liveness_check_passed BOOLEAN,
  address_verified BOOLEAN DEFAULT FALSE,
  source_of_funds_verified BOOLEAN DEFAULT FALSE,
  risk_rating TEXT,
  ai_analysis TEXT,                         -- AI-extracted document data
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SANCTIONS LISTS
-- ============================================
CREATE TABLE sanctions_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_name TEXT NOT NULL,                  -- 'OFAC_SDN','UN_SC','EU_CONSOLIDATED','HMT_UK'
  list_version TEXT,
  last_updated TIMESTAMPTZ,
  entry_count INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE watchlist_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sanctions_list_id UUID REFERENCES sanctions_lists(id),
  entry_type TEXT CHECK (entry_type IN ('individual','entity','vessel','aircraft')),
  primary_name TEXT NOT NULL,
  aliases TEXT[],                           -- array of known aliases
  nationality TEXT,
  date_of_birth DATE,
  identification JSONB,                     -- passport numbers etc
  programs TEXT[],                          -- ['SDGT','SDN']
  reason TEXT,
  listed_at DATE,
  delisted_at DATE,
  is_pep BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watchlist_name_trgm ON watchlist_entries USING GIN(primary_name gin_trgm_ops);
CREATE INDEX idx_watchlist_aliases ON watchlist_entries USING GIN(aliases);

-- ============================================
-- SANCTIONS SCREENING HITS
-- ============================================
CREATE TABLE sanctions_screening_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  screened_entity_type TEXT CHECK (screened_entity_type IN ('customer','transaction','counterparty')),
  screened_entity_id UUID,
  screened_name TEXT NOT NULL,
  watchlist_entry_id UUID REFERENCES watchlist_entries(id),
  match_score DECIMAL(5,2),                 -- 0-100 fuzzy match
  match_type TEXT CHECK (match_type IN ('exact','alias','fuzzy','phonetic')),
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review','confirmed_match','false_positive','escalated')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RULES ENGINE
-- ============================================
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT CHECK (rule_type IN ('threshold','velocity','pattern','geo','relationship','custom')),
  jurisdiction TEXT DEFAULT 'ALL',
  conditions JSONB NOT NULL DEFAULT '{}',   -- rule logic as JSON
  actions JSONB NOT NULL DEFAULT '{}',      -- what to do when triggered
  severity TEXT CHECK (severity IN ('critical','high','medium','low')),
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,          -- system rules cannot be deleted
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS (append-only, no updates or deletes)
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,                     -- 'case.created', 'alert.resolved', 'sar.submitted'
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent any modifications to audit log
CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT CHECK (entity_type IN ('kyc','case','sar','evidence','transaction')),
  entity_id UUID,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,               -- Supabase Storage path
  public_url TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  ai_extracted_text TEXT,                   -- AI-extracted content
  ai_analysis JSONB,
  is_encrypted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKFLOWS
-- ============================================
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  workflow_type TEXT CHECK (workflow_type IN ('sar_approval','case_escalation','alert_review','kyc_approval')),
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Row Level Security (RLS) — Multi-Tenant Isolation

```sql
-- ============================================
-- MIGRATION: 002_rls_policies.sql
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's organization_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- TRANSACTIONS: users see only their org's data
CREATE POLICY "org_isolation_transactions" ON transactions
  FOR ALL USING (organization_id = get_user_org_id());

-- ALERTS: same
CREATE POLICY "org_isolation_alerts" ON alerts
  FOR ALL USING (organization_id = get_user_org_id());

-- CASES: same
CREATE POLICY "org_isolation_cases" ON cases
  FOR ALL USING (organization_id = get_user_org_id());

-- CUSTOMERS: same
CREATE POLICY "org_isolation_customers" ON customers
  FOR ALL USING (organization_id = get_user_org_id());

-- AUDIT LOGS: only admins and auditors can read
CREATE POLICY "audit_read_policy" ON audit_logs
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('admin', 'compliance_officer', 'auditor')
  );

-- NOTIFICATIONS: users see only their own
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- PROFILES: users see profiles in their org
CREATE POLICY "profiles_org" ON profiles
  FOR SELECT USING (organization_id = get_user_org_id());
```

### 3.3 Realtime Setup

```sql
-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE cases;
```

---

## 4. Next.js API Routes Structure

```
/app/api/
├── auth/
│   ├── callback/route.ts          ← Supabase OAuth callback
│   └── signout/route.ts
├── transactions/
│   ├── route.ts                   ← GET (list), POST (ingest)
│   ├── [id]/route.ts              ← GET (detail), PATCH (update status)
│   └── score/route.ts             ← POST (trigger AI scoring)
├── alerts/
│   ├── route.ts                   ← GET (list with filters), POST
│   ├── [id]/route.ts              ← GET, PATCH (update status/assign)
│   └── bulk/route.ts              ← POST (bulk actions)
├── cases/
│   ├── route.ts                   ← GET, POST (create case)
│   ├── [id]/route.ts              ← GET, PATCH
│   ├── [id]/links/route.ts        ← POST (link entities to case)
│   └── [id]/sar/route.ts          ← POST (generate SAR draft)
├── kyc/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── verify/route.ts            ← POST (trigger AI doc analysis)
├── sanctions/
│   ├── screen/route.ts            ← POST (screen a name/entity)
│   └── lists/route.ts             ← GET (list available watchlists)
├── reports/
│   ├── route.ts
│   └── [id]/route.ts
├── rules/
│   ├── route.ts
│   └── [id]/route.ts
├── risk-scoring/
│   └── route.ts                   ← POST (score any entity)
├── analytics/
│   ├── overview/route.ts          ← GET (dashboard KPIs)
│   ├── risk-distribution/route.ts
│   └── transaction-volume/route.ts
├── customers/
│   ├── route.ts
│   └── [id]/route.ts
└── audit/
    └── route.ts                   ← GET (audit trail)
```

---

## 5. Key API Implementations

### 5.1 Transaction Ingestion + AI Scoring

```typescript
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreTransaction } from '@/lib/ai/risk-scorer'
import { checkSanctions } from '@/lib/compliance/sanctions'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // 1. Insert transaction
  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      organization_id: body.organization_id,
      external_tx_id: body.external_tx_id,
      amount: body.amount,
      currency: body.currency,
      transaction_type: body.type,
      from_entity: body.from_entity,
      to_entity: body.to_entity,
      jurisdiction: body.jurisdiction,
      metadata: body.metadata,
      status: 'processing',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 2. AI Risk Scoring (async — don't block response)
  scoreTransaction(tx).then(async (scoring) => {
    await supabase.from('transactions').update({
      risk_score: scoring.score,
      risk_level: scoring.level,
      risk_explanation: scoring.explanation,
      risk_scored_at: new Date().toISOString(),
      flagged: scoring.score >= 70,
      flagged_at: scoring.score >= 70 ? new Date().toISOString() : null,
      status: scoring.score >= 70 ? 'flagged' : 'completed',
    }).eq('id', tx.id)

    // 3. Create alert if high risk
    if (scoring.score >= 70) {
      await supabase.from('alerts').insert({
        organization_id: tx.organization_id,
        transaction_id: tx.id,
        alert_type: scoring.alert_type,
        severity: scoring.level,
        title: `${scoring.level.toUpperCase()}: ${scoring.alert_reason}`,
        ai_summary: scoring.explanation,
        rule_triggered: scoring.rule_triggered,
      })
    }

    // 4. Store risk score history
    await supabase.from('risk_scores').insert({
      organization_id: tx.organization_id,
      entity_type: 'transaction',
      entity_id: tx.id,
      score: scoring.score,
      level: scoring.level,
      factors: scoring.factors,
      ai_explanation: scoring.explanation,
    })
  })

  // 5. Sanctions check (also async)
  checkSanctions(tx)

  // 6. Audit log
  await logAudit(supabase, {
    action: 'transaction.created',
    entity_type: 'transaction',
    entity_id: tx.id,
    new_value: { amount: tx.amount, status: tx.status },
  })

  return NextResponse.json({ data: tx }, { status: 201 })
}
```

### 5.2 AI Risk Scoring Service

```typescript
// lib/ai/risk-scorer.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function scoreTransaction(tx: Transaction): Promise<RiskScoring> {
  const prompt = `You are an expert AML (Anti-Money Laundering) compliance analyst.
  
Analyze this financial transaction and return a risk assessment.

TRANSACTION DATA:
- Amount: ${tx.amount} ${tx.currency} (≈$${tx.amount_usd} USD)
- Type: ${tx.transaction_type}
- From: ${tx.from_entity}
- To: ${tx.to_entity}
- Counterparty Country: ${tx.counterparty_country}
- Jurisdiction: ${tx.jurisdiction}
- Channel: ${tx.channel}
- Description: ${tx.description || 'None provided'}

Respond ONLY with valid JSON in this exact structure:
{
  "score": <integer 0-100>,
  "level": "<critical|high|medium|low>",
  "explanation": "<2-3 sentence plain English explanation for compliance officer>",
  "alert_type": "<structuring|velocity|unusual_pattern|threshold_breach|geo_anomaly|crypto_mixing|trade_based|null>",
  "alert_reason": "<short alert title if score >= 70, else null>",
  "rule_triggered": "<rule name or null>",
  "factors": [
    {"factor": "<factor name>", "weight": <0-1>, "detail": "<brief detail>"}
  ]
}

Scoring guide: 
- 0-29: Low risk (routine transaction)
- 30-59: Medium risk (monitor but normal)  
- 60-79: High risk (investigate)
- 80-100: Critical risk (immediate action, potential SAR)

Key AML red flags to consider: structuring (amounts just below reporting thresholds), 
rapid movement of funds, high-risk jurisdictions, unusual transaction patterns, 
mismatched transaction purpose, PEP involvement.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1, // Low temperature for consistent scoring
  })

  const result = JSON.parse(response.choices[0].message.content!)
  return result as RiskScoring
}

export async function generateSARNarrative(caseData: Case, transactions: Transaction[]): Promise<string> {
  const prompt = `You are a compliance officer writing a Suspicious Activity Report (SAR) narrative.
  
Generate a professional, factual SAR narrative based on the following case data.
The narrative must comply with FinCEN guidelines and include: who, what, when, where, and why suspicious.

CASE: ${JSON.stringify(caseData, null, 2)}
TRANSACTIONS: ${JSON.stringify(transactions.slice(0, 10), null, 2)}

Write a formal 3-5 paragraph narrative. Be specific, factual, and avoid conclusions not supported by data.
Do not include placeholder text. Return only the narrative text.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1500,
  })

  return response.choices[0].message.content!
}
```

### 5.3 Realtime Subscriptions (Client)

```typescript
// hooks/use-realtime-alerts.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Alert } from '@/types'

export function useRealtimeAlerts(organizationId: string) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial load
    supabase
      .from('alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setAlerts(data) })

    // Real-time subscription
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new as Alert, ...prev])
          // Trigger notification sound for critical alerts
          if ((payload.new as Alert).severity === 'critical') {
            new Audio('/sounds/critical-alert.mp3').play().catch(() => {})
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizationId])

  return alerts
}
```

---

## 6. Supabase Storage Setup

```typescript
// Buckets to create in Supabase Dashboard → Storage:
// 1. "kyc-documents"     — private, for ID docs, selfies
// 2. "sar-reports"       — private, for SAR PDFs
// 3. "case-evidence"     — private, for case files
// 4. "org-assets"        — public, for logos

// lib/storage.ts
export async function uploadKYCDocument(
  file: File,
  customerId: string,
  orgId: string
): Promise<string> {
  const supabase = createClient()
  const path = `${orgId}/${customerId}/${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  // Store reference in DB
  await supabase.from('documents').insert({
    organization_id: orgId,
    entity_type: 'kyc',
    entity_id: customerId,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: data.path,
    is_encrypted: true,
  })

  return data.path
}

// Get signed URL (valid 60 mins)
export async function getDocumentUrl(storagePath: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('kyc-documents')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? ''
}
```

---

## 7. Supabase Edge Functions (Scheduled Jobs)

```typescript
// supabase/functions/sync-sanctions-lists/index.ts
// Deploy with: supabase functions deploy sync-sanctions-lists
// Schedule with: supabase.com → project → Edge Functions → Schedule

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch OFAC SDN list
  const response = await fetch('https://www.treasury.gov/ofac/downloads/sdn.csv')
  const csv = await response.text()
  
  // Parse and upsert entries...
  // (parse CSV, extract names/aliases, upsert to watchlist_entries)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## 8. Audit Logging Helper

```typescript
// lib/audit.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    action: string
    entity_type?: string
    entity_id?: string
    old_value?: Record<string, unknown>
    new_value?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id)
    .single()

  await supabase.from('audit_logs').insert({
    organization_id: profile?.organization_id,
    user_id: user?.id,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    old_value: params.old_value,
    new_value: params.new_value,
    metadata: params.metadata,
  })
}
```

---

## 9. TypeScript Types Generation

After applying all migrations, always regenerate types:
```bash
supabase gen types typescript --linked --schema public > types/supabase.ts
```

This gives you full type safety across all Supabase queries:
```typescript
import type { Database } from '@/types/supabase'
type Transaction = Database['public']['Tables']['transactions']['Row']
type Alert = Database['public']['Tables']['alerts']['Row']
type Case = Database['public']['Tables']['cases']['Row']
```
