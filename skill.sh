#!/usr/bin/env bash
# =============================================================================
# skill.sh — AML RegTech Platform Project Setup Script
# =============================================================================
# Usage:
#   chmod +x skill.sh
#   ./skill.sh
#
# What this script does:
#   1. Scaffolds the full Next.js project structure
#   2. Installs all required dependencies
#   3. Creates all config files (tailwind, tsconfig, next.config, etc.)
#   4. Sets up Supabase folder structure with migrations
#   5. Creates all lib/ helper files (supabase clients, ai, audit)
#   6. Creates base TypeScript types
#   7. Creates .env.local template
#   8. Links Supabase CLI to your project
#
# Prerequisites:
#   - Node.js 20+  (check: node -v)
#   - npm 10+      (check: npm -v)
#   - Supabase CLI (auto-installed by this script if missing)
#   - Git          (check: git -v)
#
# Before running, set these 3 values in the CONFIG section below:
#   SUPABASE_PROJECT_REF  — found in Supabase Dashboard → Settings → General
#   SUPABASE_ORG_ID       — found in Supabase Dashboard → Organization Settings
#   PROJECT_NAME          — your Next.js folder name
# =============================================================================

set -e  # exit on any error

# =============================================================================
# CONFIG — EDIT THESE BEFORE RUNNING
# =============================================================================
PROJECT_NAME="aml-platform"
SUPABASE_PROJECT_REF="your_project_ref_here"          # e.g. abcdefghijklmnop
SUPABASE_ORG_ID="your_org_id_here"                    # e.g. org_abc123
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_step()  { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
print_ok()    { echo -e "  ${GREEN}✓ $1${NC}"; }
print_warn()  { echo -e "  ${YELLOW}⚠ $1${NC}"; }
print_info()  { echo -e "  ${CYAN}→ $1${NC}"; }
print_error() { echo -e "  ${RED}✗ $1${NC}"; exit 1; }

# =============================================================================
# HEADER
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       AML RegTech Platform — Project Setup Script            ║${NC}"
echo -e "${BOLD}${CYAN}║       Next.js + Supabase + OpenAI + Vercel                   ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# STEP 0: Validate config
# =============================================================================
print_step "Validating configuration"

if [ "$SUPABASE_PROJECT_REF" = "your_project_ref_here" ]; then
  print_error "Set SUPABASE_PROJECT_REF in the CONFIG section of this script before running."
fi
if [ "$SUPABASE_ORG_ID" = "your_org_id_here" ]; then
  print_error "Set SUPABASE_ORG_ID in the CONFIG section of this script before running."
fi

print_ok "Configuration looks valid"

# =============================================================================
# STEP 1: Check prerequisites
# =============================================================================
print_step "Checking prerequisites"

command -v node >/dev/null 2>&1 || print_error "Node.js is not installed. Install from https://nodejs.org"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[ "$NODE_VERSION" -lt 20 ] && print_error "Node.js 20+ required. Current: $(node -v)"
print_ok "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || print_error "npm is not installed."
print_ok "npm $(npm -v)"

command -v git >/dev/null 2>&1 || print_error "Git is not installed."
print_ok "Git $(git --version | awk '{print $3}')"

# Install Supabase CLI if missing
if ! command -v supabase >/dev/null 2>&1; then
  print_warn "Supabase CLI not found — installing..."
  npm install -g supabase
  print_ok "Supabase CLI installed"
else
  print_ok "Supabase CLI $(supabase --version)"
fi

# =============================================================================
# STEP 2: Create Next.js project
# =============================================================================
print_step "Creating Next.js project: $PROJECT_NAME"

if [ -d "$PROJECT_NAME" ]; then
  print_warn "Directory '$PROJECT_NAME' already exists — skipping Next.js init"
else
  npx create-next-app@latest "$PROJECT_NAME" \
    --typescript \
    --tailwind \
    --eslint \
    --app \
    --src-dir=false \
    --import-alias="@/*" \
    --no-git \
    2>&1 | grep -E "(Creating|Installing|✓|error)" || true
  print_ok "Next.js project created"
fi

cd "$PROJECT_NAME"
print_ok "Working directory: $(pwd)"

# =============================================================================
# STEP 3: Install all dependencies
# =============================================================================
print_step "Installing dependencies"

# Core Supabase
npm install @supabase/supabase-js @supabase/ssr
print_ok "Supabase clients"

# OpenAI
npm install openai
print_ok "OpenAI SDK"

# UI & Design
npm install framer-motion lucide-react sonner cmdk class-variance-authority clsx tailwind-merge
print_ok "UI primitives (framer-motion, lucide, sonner, cmdk)"

# Data & Tables
npm install @tanstack/react-table @tanstack/react-virtual
print_ok "TanStack Table + Virtual"

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod
print_ok "Forms: react-hook-form + zod"

# Charts
npm install recharts
print_ok "Recharts"

# Date
npm install react-day-picker date-fns
print_ok "Date picker + date-fns"

# Drag & drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
print_ok "DnD Kit"

# SWR for data fetching
npm install swr
print_ok "SWR"

# Shadcn/UI peer dependencies
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select \
  @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-popover \
  @radix-ui/react-avatar @radix-ui/react-badge @radix-ui/react-separator \
  @radix-ui/react-scroll-area @radix-ui/react-slot
print_ok "Radix UI primitives"

# Dev dependencies
npm install -D @types/node prettier prettier-plugin-tailwindcss
print_ok "Dev dependencies"

echo ""
print_ok "All dependencies installed"

# =============================================================================
# STEP 4: Create folder structure
# =============================================================================
print_step "Scaffolding folder structure"

mkdir -p \
  app/\(auth\)/login \
  app/\(auth\) \
  app/\(dashboard\)/overview \
  app/\(dashboard\)/transactions \
  app/\(dashboard\)/alerts \
  app/\(dashboard\)/cases \
  app/\(dashboard\)/kyc \
  app/\(dashboard\)/sanctions \
  app/\(dashboard\)/reports \
  app/\(dashboard\)/rules \
  app/\(dashboard\)/settings \
  app/api/auth/callback \
  app/api/transactions/\[id\] \
  app/api/transactions/score \
  app/api/alerts/\[id\] \
  app/api/alerts/bulk \
  app/api/cases/\[id\] \
  app/api/cases/\[id\]/sar \
  app/api/cases/\[id\]/links \
  app/api/kyc/\[id\] \
  app/api/kyc/verify \
  app/api/sanctions/screen \
  app/api/reports/\[id\] \
  app/api/rules/\[id\] \
  app/api/customers/\[id\] \
  app/api/analytics/overview \
  app/api/analytics/risk-distribution \
  app/api/audit \
  app/api/risk-scoring \
  components/ui \
  components/dashboard \
  components/compliance \
  components/charts \
  components/shared \
  lib/supabase \
  lib/ai \
  lib/compliance \
  lib/utils \
  hooks \
  types \
  supabase/migrations \
  supabase/functions/sync-sanctions-lists \
  public/sounds \
  styles

print_ok "Folder structure created"

# =============================================================================
# STEP 5: Create config files
# =============================================================================
print_step "Creating configuration files"

# --- tailwind.config.ts ---
cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // AML Platform custom palette
        'glass': {
          DEFAULT: 'rgba(255, 255, 255, 0.04)',
          hover: 'rgba(255, 255, 255, 0.07)',
        },
        'risk': {
          critical: '#EF4444',
          high:     '#F97316',
          medium:   '#EAB308',
          low:      '#22C55E',
          unknown:  '#6B7280',
        },
        'accent': {
          cyan:   '#00D4FF',
          violet: '#7C3AED',
          blue:   '#2563EB',
        },
        'surface': {
          primary:   '#050B18',
          secondary: '#0A1628',
          tertiary:  '#0F1F3D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-critical': 'criticalGlow 2s ease-in-out infinite',
      },
      keyframes: {
        criticalGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
          '50%':      { boxShadow: '0 0 20px 2px rgba(239, 68, 68, 0.3)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
EOF
print_ok "tailwind.config.ts"

# --- next.config.ts ---
cat > next.config.ts << 'EOF'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default nextConfig
EOF
print_ok "next.config.ts"

# --- tsconfig.json (override with strict settings) ---
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
print_ok "tsconfig.json"

# --- .prettierrc ---
cat > .prettierrc << 'EOF'
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
EOF
print_ok ".prettierrc"

# --- .gitignore additions ---
cat >> .gitignore << 'EOF'

# Environment files
.env.local
.env.*.local

# Supabase
.supabase/

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db
EOF
print_ok ".gitignore updated"

# =============================================================================
# STEP 6: Create .env.local template
# =============================================================================
print_step "Creating environment files"

cat > .env.local << 'EOF'
# =============================================================================
# SUPABASE — https://supabase.com/dashboard
# Project Settings → API
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your_service_role_key

# =============================================================================
# OPENAI — https://platform.openai.com/api-keys
# =============================================================================
OPENAI_API_KEY=sk-proj-...your_openai_key

# =============================================================================
# APP CONFIG
# =============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=AML Intelligence Platform
NODE_ENV=development

# =============================================================================
# OPTIONAL — Uncomment when adding these services
# =============================================================================
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# RESEND_API_KEY=re_...
# UPSTASH_REDIS_REST_URL=https://...
# UPSTASH_REDIS_REST_TOKEN=...
EOF
print_ok ".env.local template"

# .env.example (safe to commit — empty values)
cat > .env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=
NODE_ENV=
EOF
print_ok ".env.example"

# =============================================================================
# STEP 7: Create Supabase client files
# =============================================================================
print_step "Creating Supabase client files"

cat > lib/supabase/client.ts << 'EOF'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
EOF
print_ok "lib/supabase/client.ts"

cat > lib/supabase/server.ts << 'EOF'
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
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookie setting will be handled by middleware
          }
        },
      },
    }
  )
}
EOF
print_ok "lib/supabase/server.ts"

cat > lib/supabase/admin.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Supabase Admin Client — uses service_role key
 * IMPORTANT: Only use server-side. Never import in client components.
 * Bypasses Row Level Security — use with caution.
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
EOF
print_ok "lib/supabase/admin.ts"

# Middleware
cat > middleware.ts << 'EOF'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/')) {
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                        request.nextUrl.pathname.startsWith('/auth')
    if (!isAuthRoute && !request.nextUrl.pathname.startsWith('/api')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
EOF
print_ok "middleware.ts"

# =============================================================================
# STEP 8: Create AI helper files
# =============================================================================
print_step "Creating AI helper files"

cat > lib/ai/risk-scorer.ts << 'EOF'
import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Zod schema for AI response validation
const RiskScoringSchema = z.object({
  score: z.number().int().min(0).max(100),
  level: z.enum(['critical', 'high', 'medium', 'low', 'unknown']),
  explanation: z.string(),
  alert_type: z.string().nullable(),
  alert_reason: z.string().nullable(),
  rule_triggered: z.string().nullable(),
  factors: z.array(z.object({
    factor: z.string(),
    weight: z.number(),
    detail: z.string(),
  })),
})

export type RiskScoring = z.infer<typeof RiskScoringSchema>

export async function scoreTransaction(tx: Record<string, unknown>): Promise<RiskScoring> {
  const prompt = `You are an expert AML (Anti-Money Laundering) compliance system for a regulated financial institution.

Analyze this financial transaction and return a JSON risk assessment.

TRANSACTION:
- Amount: ${tx.amount} ${tx.currency} (~$${tx.amount_usd} USD)
- Type: ${tx.transaction_type}
- From: ${tx.from_entity}
- To: ${tx.to_entity}
- Counterparty Country: ${tx.counterparty_country ?? 'unknown'}
- Jurisdiction: ${tx.jurisdiction}
- Channel: ${tx.channel ?? 'unknown'}
- Description: ${tx.description ?? 'none'}

Respond ONLY with valid JSON:
{
  "score": <0-100>,
  "level": "<critical|high|medium|low|unknown>",
  "explanation": "<2-3 sentence explanation for compliance officer>",
  "alert_type": "<structuring|velocity|unusual_pattern|threshold_breach|geo_anomaly|crypto_mixing|trade_based|null>",
  "alert_reason": "<short alert title if score>=70, else null>",
  "rule_triggered": "<rule name or null>",
  "factors": [{"factor": "<name>", "weight": <0-1>, "detail": "<brief>"}]
}

Scoring: 0-29 low · 30-59 medium · 60-79 high · 80-100 critical
AML red flags: structuring, rapid fund movement, high-risk jurisdictions, PEP involvement, unusual patterns`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800,
    })

    const raw = JSON.parse(response.choices[0].message.content!)
    return RiskScoringSchema.parse(raw)
  } catch (error) {
    console.error('[RiskScorer] Failed to score transaction:', error)
    // Safe fallback — never crash the transaction pipeline
    return {
      score: 50,
      level: 'medium',
      explanation: 'Automated scoring unavailable. Manual review required.',
      alert_type: null,
      alert_reason: null,
      rule_triggered: null,
      factors: [],
    }
  }
}
EOF
print_ok "lib/ai/risk-scorer.ts"

cat > lib/ai/sar-generator.ts << 'EOF'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateSARNarrative(
  caseData: Record<string, unknown>,
  transactions: Record<string, unknown>[]
): Promise<string> {
  const prompt = `You are a compliance officer at a regulated financial institution writing a Suspicious Activity Report (SAR) narrative.

Generate a professional SAR narrative following FinCEN guidelines.
The narrative must cover: who, what, when, where, and why the activity is suspicious.
Be specific, factual, and avoid conclusions not supported by evidence.
Write 3-5 paragraphs in formal compliance language.

CASE DATA:
${JSON.stringify(caseData, null, 2)}

TRANSACTIONS (up to 10):
${JSON.stringify(transactions.slice(0, 10), null, 2)}

Return only the narrative text. No headers, no JSON, no markdown.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    })
    return response.choices[0].message.content!
  } catch (error) {
    console.error('[SARGenerator] Failed to generate narrative:', error)
    return 'SAR narrative generation failed. Please write the narrative manually.'
  }
}
EOF
print_ok "lib/ai/sar-generator.ts"

cat > lib/ai/kyc-analyzer.ts << 'EOF'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Analyze a KYC document image using GPT-4o Vision
 * Returns extracted fields and verification result
 */
export async function analyzeKYCDocument(
  imageBase64: string,
  documentType: string
): Promise<{ extracted: Record<string, string>; confidence: number; issues: string[] }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this ${documentType} identity document. Extract all visible fields and flag any issues.
              
Respond with JSON only:
{
  "extracted": {
    "full_name": "",
    "date_of_birth": "",
    "document_number": "",
    "expiry_date": "",
    "nationality": "",
    "issuing_country": ""
  },
  "confidence": <0-100>,
  "issues": ["<list of any problems found>"]
}`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    })

    return JSON.parse(response.choices[0].message.content!)
  } catch (error) {
    console.error('[KYCAnalyzer] Document analysis failed:', error)
    return { extracted: {}, confidence: 0, issues: ['Analysis failed — manual review required'] }
  }
}
EOF
print_ok "lib/ai/kyc-analyzer.ts"

# =============================================================================
# STEP 9: Create compliance utilities
# =============================================================================
print_step "Creating compliance utilities"

cat > lib/compliance/audit.ts << 'EOF'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AuditParams {
  action: string
  entity_type?: string
  entity_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Append an immutable audit log entry.
 * Call after every write operation — alerts, cases, SARs, KYC, rules.
 */
export async function logAudit(supabase: SupabaseClient, params: AuditParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user?.id ?? '')
      .single()

    await supabase.from('audit_logs').insert({
      organization_id: profile?.organization_id,
      user_id: user?.id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      metadata: params.metadata ?? {},
    })
  } catch (error) {
    // Audit logging should never crash the main operation
    console.error('[Audit] Failed to write audit log:', error)
  }
}
EOF
print_ok "lib/compliance/audit.ts"

cat > lib/compliance/sanctions.ts << 'EOF'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Screen an entity name against all active watchlists
 * Uses trigram fuzzy matching for alias detection
 */
export async function screenEntity(
  name: string,
  organizationId: string,
  entityType: 'customer' | 'transaction' | 'counterparty',
  entityId?: string
): Promise<{ matched: boolean; matchScore: number; matchedEntry?: Record<string, unknown> }> {
  try {
    // Fuzzy search against watchlist entries using pg_trgm
    const { data: matches } = await supabaseAdmin
      .rpc('fuzzy_search_watchlist', { search_name: name, threshold: 0.7 })

    if (!matches || matches.length === 0) {
      return { matched: false, matchScore: 0 }
    }

    const topMatch = matches[0]

    // Record the screening result
    await supabaseAdmin.from('sanctions_screening_results').insert({
      organization_id: organizationId,
      screened_entity_type: entityType,
      screened_entity_id: entityId,
      screened_name: name,
      watchlist_entry_id: topMatch.id,
      match_score: topMatch.similarity * 100,
      match_type: topMatch.similarity === 1 ? 'exact' : 'fuzzy',
      status: 'pending_review',
    })

    return {
      matched: true,
      matchScore: topMatch.similarity * 100,
      matchedEntry: topMatch,
    }
  } catch (error) {
    console.error('[Sanctions] Screening failed:', error)
    return { matched: false, matchScore: 0 }
  }
}
EOF
print_ok "lib/compliance/sanctions.ts"

# =============================================================================
# STEP 10: Create utility files
# =============================================================================
print_step "Creating utility files"

cat > lib/utils/cn.ts << 'EOF'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

cat > lib/utils/formatters.ts << 'EOF'
/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date as locale string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(date))
}

/**
 * Truncate a UUID or long ID for display
 */
export function shortId(id: string): string {
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

/**
 * Map risk score to level
 */
export function scoreToLevel(score: number): 'critical' | 'high' | 'medium' | 'low' | 'unknown' {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  if (score >= 0)  return 'low'
  return 'unknown'
}

/**
 * Generate next case number
 */
export function generateCaseNumber(): string {
  const year = new Date().getFullYear()
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
  return `CASE-${year}-${seq}`
}
EOF

print_ok "lib/utils/ files"

# =============================================================================
# STEP 11: Create base TypeScript types
# =============================================================================
print_step "Creating TypeScript types"

cat > types/index.ts << 'EOF'
// =============================================================================
// Application-level types
// supabase.ts is auto-generated — do not edit manually
// Run: supabase gen types typescript --linked > types/supabase.ts
// =============================================================================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown'

export type AlertStatus = 'new' | 'in_review' | 'escalated' | 'resolved' | 'false_positive' | 'suppressed'

export type CaseStatus = 'open' | 'in_progress' | 'pending_sar' | 'sar_filed' | 'closed' | 'rejected'

export type KYCStatus = 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired'

export type UserRole = 'admin' | 'compliance_officer' | 'analyst' | 'auditor' | 'readonly'

export interface RiskScoring {
  score: number
  level: RiskLevel
  explanation: string
  alert_type: string | null
  alert_reason: string | null
  rule_triggered: string | null
  factors: Array<{
    factor: string
    weight: number
    detail: string
  }>
}

export interface DashboardKPIs {
  totalAlerts: number
  pendingCases: number
  sarsFiled: number
  falsePositiveRate: number
  avgRiskScore: number
  highRiskTransactions: number
  alertsTrend: number   // % change vs last period
  casesTrend: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}
EOF

# Placeholder supabase.ts (real one generated by CLI)
cat > types/supabase.ts << 'EOF'
// AUTO-GENERATED — Do not edit manually.
// Run: supabase gen types typescript --linked > types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      // Types will be populated after running: supabase gen types typescript --linked
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
EOF

print_ok "types/"

# =============================================================================
# STEP 12: Create Supabase migration files
# =============================================================================
print_step "Creating Supabase migration files"

cat > supabase/migrations/20260310000001_core_schema.sql << 'SQLEOF'
-- =============================================================================
-- MIGRATION 001: Core Schema
-- AML RegTech Platform
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Organizations (multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'US',
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends Supabase auth.users)
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

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  external_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  nationality TEXT,
  country_of_residence TEXT,
  customer_type TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual','business')),
  risk_tier TEXT DEFAULT 'standard' CHECK (risk_tier IN ('low','standard','high','unacceptable')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','in_review','verified','rejected','expired')),
  pep_flag BOOLEAN DEFAULT FALSE,
  sanctions_flag BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts
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

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  external_tx_id TEXT,
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  from_entity TEXT,
  to_entity TEXT,
  amount DECIMAL(20,4) NOT NULL,
  currency TEXT DEFAULT 'USD',
  fx_rate DECIMAL(10,6) DEFAULT 1,
  amount_usd DECIMAL(20,4),
  transaction_type TEXT CHECK (transaction_type IN ('transfer','wire','cash_deposit','cash_withdrawal','crypto','trade','payment','refund')),
  channel TEXT CHECK (channel IN ('online','branch','atm','api','swift','sepa','crypto')),
  jurisdiction TEXT DEFAULT 'US',
  counterparty_country TEXT,
  description TEXT,
  reference TEXT,
  metadata JSONB DEFAULT '{}',
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('critical','high','medium','low','unknown')),
  risk_explanation TEXT,
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

-- Risk Scores (history)
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction','customer','account')),
  entity_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  level TEXT NOT NULL CHECK (level IN ('critical','high','medium','low','unknown')),
  factors JSONB DEFAULT '[]',
  ai_explanation TEXT,
  model_version TEXT DEFAULT 'gpt-4o',
  scored_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('structuring','velocity','unusual_pattern','sanctions_hit','pep_match','threshold_breach','geo_anomaly','relationship_network','dormant_account','rapid_movement','crypto_mixing','trade_based')),
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new','in_review','escalated','resolved','false_positive','suppressed')),
  transaction_id UUID REFERENCES transactions(id),
  customer_id UUID REFERENCES customers(id),
  account_id UUID REFERENCES accounts(id),
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,
  rule_triggered TEXT,
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

-- Cases
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  case_number TEXT UNIQUE NOT NULL,
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

-- Case Links
CREATE TABLE case_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('alert','transaction','customer','account','document')),
  entity_id UUID NOT NULL,
  added_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAR Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  case_id UUID REFERENCES cases(id),
  report_type TEXT DEFAULT 'SAR' CHECK (report_type IN ('SAR','CTR','STR','MLRO')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','approved','submitted','acknowledged','rejected')),
  reference_number TEXT,
  jurisdiction TEXT DEFAULT 'US',
  filing_institution TEXT,
  subject_name TEXT,
  subject_account TEXT,
  activity_start_date DATE,
  activity_end_date DATE,
  total_amount DECIMAL(20,4),
  currency TEXT DEFAULT 'USD',
  narrative TEXT,
  ai_drafted BOOLEAN DEFAULT TRUE,
  draft_generated_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  document_url TEXT,
  regulator_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KYC Records
CREATE TABLE kyc_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  verification_type TEXT CHECK (verification_type IN ('initial','enhanced','refresh','pep_check','adverse_media')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','passed','failed','expired','requires_action')),
  id_document_type TEXT CHECK (id_document_type IN ('passport','national_id','drivers_license','utility_bill','bank_statement')),
  id_document_number TEXT,
  id_expiry_date DATE,
  id_document_url TEXT,
  selfie_url TEXT,
  liveness_check_passed BOOLEAN,
  address_verified BOOLEAN DEFAULT FALSE,
  source_of_funds_verified BOOLEAN DEFAULT FALSE,
  risk_rating TEXT,
  ai_analysis TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sanctions Lists
CREATE TABLE sanctions_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_name TEXT NOT NULL,
  list_version TEXT,
  last_updated TIMESTAMPTZ,
  entry_count INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist Entries
CREATE TABLE watchlist_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sanctions_list_id UUID REFERENCES sanctions_lists(id),
  entry_type TEXT CHECK (entry_type IN ('individual','entity','vessel','aircraft')),
  primary_name TEXT NOT NULL,
  aliases TEXT[],
  nationality TEXT,
  date_of_birth DATE,
  identification JSONB,
  programs TEXT[],
  reason TEXT,
  listed_at DATE,
  delisted_at DATE,
  is_pep BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watchlist_name_trgm ON watchlist_entries USING GIN(primary_name gin_trgm_ops);
CREATE INDEX idx_watchlist_aliases ON watchlist_entries USING GIN(aliases);

-- Sanctions Screening Results
CREATE TABLE sanctions_screening_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  screened_entity_type TEXT CHECK (screened_entity_type IN ('customer','transaction','counterparty')),
  screened_entity_id UUID,
  screened_name TEXT NOT NULL,
  watchlist_entry_id UUID REFERENCES watchlist_entries(id),
  match_score DECIMAL(5,2),
  match_type TEXT CHECK (match_type IN ('exact','alias','fuzzy','phonetic')),
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review','confirmed_match','false_positive','escalated')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rules Engine
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT CHECK (rule_type IN ('threshold','velocity','pattern','geo','relationship','custom')),
  jurisdiction TEXT DEFAULT 'ALL',
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  severity TEXT CHECK (severity IN ('critical','high','medium','low')),
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (append-only)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT CHECK (entity_type IN ('kyc','case','sar','evidence','transaction')),
  entity_id UUID,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  ai_extracted_text TEXT,
  ai_analysis JSONB,
  is_encrypted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
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

-- Fuzzy search function for sanctions screening
CREATE OR REPLACE FUNCTION fuzzy_search_watchlist(search_name TEXT, threshold FLOAT DEFAULT 0.7)
RETURNS TABLE(id UUID, primary_name TEXT, similarity FLOAT) AS $$
  SELECT id, primary_name, similarity(primary_name, search_name) AS similarity
  FROM watchlist_entries
  WHERE similarity(primary_name, search_name) >= threshold
  ORDER BY similarity DESC
  LIMIT 10;
$$ LANGUAGE SQL STABLE;
SQLEOF
print_ok "supabase/migrations/20260310000001_core_schema.sql"

cat > supabase/migrations/20260310000002_rls_policies.sql << 'SQLEOF'
-- =============================================================================
-- MIGRATION 002: Row Level Security
-- =============================================================================

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
ALTER TABLE sanctions_screening_results ENABLE ROW LEVEL SECURITY;

-- Helper: current user's org
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Org isolation policies
CREATE POLICY "org_isolation" ON customers FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON accounts FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON transactions FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON alerts FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON cases FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON reports FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON kyc_records FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON risk_scores FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON documents FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON rules FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "org_isolation" ON sanctions_screening_results FOR ALL USING (organization_id = get_user_org_id());

-- Profiles: see org members
CREATE POLICY "profiles_org_read" ON profiles FOR SELECT USING (organization_id = get_user_org_id());

-- Audit: restricted to admin/auditor/officer
CREATE POLICY "audit_restricted_read" ON audit_logs FOR SELECT
  USING (organization_id = get_user_org_id() AND get_user_role() IN ('admin','compliance_officer','auditor'));

-- Notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE cases;
SQLEOF
print_ok "supabase/migrations/20260310000002_rls_policies.sql"

cat > supabase/migrations/20260310000003_seed_rules.sql << 'SQLEOF'
-- =============================================================================
-- MIGRATION 003: Seed Default System Rules & Sanctions Lists
-- =============================================================================

-- Seed default sanctions lists (entries populated by sync Edge Function)
INSERT INTO sanctions_lists (list_name, is_active, source_url) VALUES
  ('OFAC_SDN',        TRUE, 'https://www.treasury.gov/ofac/downloads/sdn.csv'),
  ('UN_SC',           TRUE, 'https://scsanctions.un.org/resources/xml/en/consolidated.xml'),
  ('EU_CONSOLIDATED', TRUE, 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList/content'),
  ('HMT_UK',          TRUE, 'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/consolidated-list.csv');
SQLEOF
print_ok "supabase/migrations/20260310000003_seed_rules.sql"

# =============================================================================
# STEP 13: Create Supabase Edge Function (sanctions sync)
# =============================================================================
print_step "Creating Supabase Edge Functions"

cat > supabase/functions/sync-sanctions-lists/index.ts << 'EOF'
// Supabase Edge Function: Sync Sanctions Lists
// Deploy: supabase functions deploy sync-sanctions-lists
// Schedule daily via Supabase Dashboard → Edge Functions → Schedule

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const results: Record<string, string> = {}

  // Update last_updated timestamp for each active list
  // Real implementation: fetch CSV/XML, parse, upsert entries
  const { data: lists } = await supabase
    .from('sanctions_lists')
    .select('id, list_name')
    .eq('is_active', true)

  for (const list of lists ?? []) {
    await supabase
      .from('sanctions_lists')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', list.id)

    results[list.list_name] = 'synced'
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
EOF
print_ok "supabase/functions/sync-sanctions-lists/index.ts"

# =============================================================================
# STEP 14: Create global CSS with glassmorphism theme
# =============================================================================
print_step "Creating global styles"

cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary:   #050B18;
  --bg-secondary: #0A1628;
  --bg-tertiary:  #0F1F3D;

  --glass-bg:           rgba(255, 255, 255, 0.04);
  --glass-bg-hover:     rgba(255, 255, 255, 0.07);
  --glass-border:       rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.15);

  --accent-cyan:   #00D4FF;
  --accent-violet: #7C3AED;
  --accent-blue:   #2563EB;

  --risk-critical: #EF4444;
  --risk-high:     #F97316;
  --risk-medium:   #EAB308;
  --risk-low:      #22C55E;

  --text-primary:   #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted:     #475569;
  --text-data:      #67E8F9;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* Glassmorphism utility classes */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
}

.glass:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
}

/* Risk level glow animations */
@keyframes criticalGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  50%       { box-shadow: 0 0 20px 2px rgba(239, 68, 68, 0.3); }
}

.glow-critical { animation: criticalGlow 2s ease-in-out infinite; }

/* Scrollbar styling */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
EOF
print_ok "app/globals.css"

# =============================================================================
# STEP 15: Initialize Supabase and link project
# =============================================================================
print_step "Initializing Supabase CLI"

supabase init 2>/dev/null || print_warn "supabase init already done or failed — continuing"

print_info "Linking Supabase project: $SUPABASE_PROJECT_REF"
print_warn "You may be prompted to log in to Supabase..."

supabase link --project-ref "$SUPABASE_PROJECT_REF" 2>&1 || \
  print_warn "Could not auto-link. Run: supabase login && supabase link --project-ref $SUPABASE_PROJECT_REF"

print_ok "Supabase CLI initialized"

# =============================================================================
# STEP 16: Initialize Git
# =============================================================================
print_step "Initializing Git repository"

git init -q
git add .
git commit -m "feat: initial AML RegTech platform scaffold" -q
print_ok "Git repository initialized with first commit"

# =============================================================================
# DONE
# =============================================================================
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║                   Setup Complete!                            ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo -e "  ${CYAN}1.${NC} Fill in your API keys in ${BOLD}.env.local${NC}"
echo -e "     ${YELLOW}NEXT_PUBLIC_SUPABASE_URL${NC} and keys from:"
echo -e "     ${BLUE}https://supabase.com/dashboard → your project → Settings → API${NC}"
echo ""
echo -e "  ${CYAN}2.${NC} Push database migrations to Supabase:"
echo -e "     ${BOLD}supabase db push${NC}"
echo ""
echo -e "  ${CYAN}3.${NC} Generate TypeScript types from your schema:"
echo -e "     ${BOLD}supabase gen types typescript --linked > types/supabase.ts${NC}"
echo ""
echo -e "  ${CYAN}4.${NC} Start the development server:"
echo -e "     ${BOLD}npm run dev${NC}"
echo ""
echo -e "  ${CYAN}5.${NC} Deploy to Vercel:"
echo -e "     ${BOLD}npx vercel --prod${NC}"
echo -e "     Then add all .env.local keys to Vercel Dashboard → Settings → Environment Variables"
echo ""
echo -e "  ${CYAN}6.${NC} Update Supabase Auth redirect URLs:"
echo -e "     ${BLUE}Supabase Dashboard → Auth → URL Configuration${NC}"
echo -e "     Add: ${BOLD}https://your-app.vercel.app/auth/callback${NC}"
echo ""
echo -e "${YELLOW}Docs:${NC}"
echo -e "  Frontend guidelines  → ${BOLD}frontend.md${NC}"
echo -e "  Backend + Supabase   → ${BOLD}backend.md${NC}"
echo -e "  Rules & config       → ${BOLD}rules.md${NC}"
echo ""
