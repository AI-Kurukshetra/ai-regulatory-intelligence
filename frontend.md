# 🎨 Frontend Guidelines — AML RegTech Platform

> **Stack:** Next.js 14+ (App Router) · TypeScript · Tailwind CSS · Framer Motion · Shadcn/UI  
> **Deployment:** Vercel  
> **Design System:** Glassmorphism — Dark Intelligence Theme

---

## 1. Design Philosophy

This is an **enterprise financial intelligence platform** used by compliance officers, fraud analysts, and risk managers — people who stare at dashboards for hours under high-stakes pressure. The UI must communicate:

- **Trust & Authority** — dark, serious, data-dense
- **Clarity under pressure** — high-contrast alerts, clear hierarchy
- **Intelligence** — AI-powered feel, not a generic CRUD app

### ✅ Glassmorphism — Why It Works Here

Glassmorphism is **ideal** for this project because:
- Dark frosted panels on gradient backgrounds look like premium security software (think Palantir, Sentinel)
- Layered glass cards give visual depth to nested data (cases → alerts → transactions)
- Glowing accent colors work naturally for status indicators (red = critical risk, amber = warning, green = clear)
- It differentiates from legacy AML tools (grey corporate SaaS)

**Reference aesthetic:** Dark navy/slate background + frosted glass cards + cyan/violet accent glows + monospace data text

---

## 2. Color System

```css
/* globals.css — CSS Variables */
:root {
  /* Base backgrounds */
  --bg-primary: #050B18;        /* deepest background */
  --bg-secondary: #0A1628;      /* page background */
  --bg-tertiary: #0F1F3D;       /* sidebar, nav */

  /* Glass surfaces */
  --glass-bg: rgba(255, 255, 255, 0.04);
  --glass-bg-hover: rgba(255, 255, 255, 0.07);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.15);

  /* Accent colors */
  --accent-cyan: #00D4FF;       /* primary actions, links */
  --accent-violet: #7C3AED;     /* AI/ML indicators */
  --accent-blue: #2563EB;       /* info, neutral actions */

  /* Risk / Status colors */
  --risk-critical: #EF4444;     /* critical risk score */
  --risk-high: #F97316;         /* high risk */
  --risk-medium: #EAB308;       /* medium risk */
  --risk-low: #22C55E;          /* low risk / clear */
  --risk-unknown: #6B7280;      /* unscored */

  /* Text */
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --text-data: #67E8F9;         /* monospace data values */

  /* Glow effects */
  --glow-cyan: 0 0 20px rgba(0, 212, 255, 0.3);
  --glow-red: 0 0 20px rgba(239, 68, 68, 0.4);
  --glow-green: 0 0 15px rgba(34, 197, 94, 0.3);
}
```

---

## 3. Glass Component Patterns

### Base Glass Card
```tsx
// components/ui/glass-card.tsx
import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: "none" | "cyan" | "red" | "green" | "violet"
}

export function GlassCard({ children, className, glow = "none" }: GlassCardProps) {
  const glowStyles = {
    none: "",
    cyan: "shadow-[0_0_30px_rgba(0,212,255,0.15)] border-[rgba(0,212,255,0.2)]",
    red: "shadow-[0_0_30px_rgba(239,68,68,0.2)] border-[rgba(239,68,68,0.3)]",
    green: "shadow-[0_0_25px_rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.2)]",
    violet: "shadow-[0_0_30px_rgba(124,58,237,0.2)] border-[rgba(124,58,237,0.25)]",
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.04] backdrop-blur-md",
        "border-white/[0.08] transition-all duration-300",
        "hover:bg-white/[0.07] hover:border-white/[0.15]",
        glowStyles[glow],
        className
      )}
    >
      {children}
    </div>
  )
}
```

### Risk Score Badge
```tsx
// components/ui/risk-badge.tsx
type RiskLevel = "critical" | "high" | "medium" | "low" | "unknown"

const riskConfig = {
  critical: { label: "CRITICAL", class: "bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]" },
  high:     { label: "HIGH",     class: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  medium:   { label: "MEDIUM",   class: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  low:      { label: "LOW",      class: "bg-green-500/20 text-green-400 border-green-500/40" },
  unknown:  { label: "UNSCORED", class: "bg-gray-500/20 text-gray-400 border-gray-500/40" },
}

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const config = riskConfig[level]
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border", config.class)}>
      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", {
        "bg-red-400": level === "critical",
        "bg-orange-400": level === "high",
        "bg-yellow-400": level === "medium",
        "bg-green-400": level === "low",
        "bg-gray-400": level === "unknown",
      })} />
      {config.label}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  )
}
```

---

## 4. Typography Rules

```css
/* Font stack */
--font-display: 'Inter', system-ui, sans-serif;   /* headings, UI labels */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace; /* all financial data */
```

**Rules:**
- All monetary amounts → `font-mono text-[--text-data]`
- Transaction IDs, account numbers, case IDs → `font-mono text-xs`
- Risk scores → `font-mono font-bold`
- Page headings → `font-semibold tracking-tight`
- Dashboard labels → `text-xs uppercase tracking-widest text-[--text-muted]`
- Never use serif fonts anywhere

---

## 5. Layout System

### App Shell Structure
```
/app
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx              ← centered glass card on dark gradient
├── (dashboard)/
│   ├── layout.tsx              ← sidebar + topbar shell
│   ├── overview/page.tsx
│   ├── transactions/
│   ├── alerts/
│   ├── cases/
│   ├── kyc/
│   ├── sanctions/
│   ├── reports/
│   ├── rules/
│   └── settings/
└── layout.tsx                  ← root layout, ThemeProvider
```

### Sidebar
- Width: `w-64` collapsed → `w-16` icon-only mode
- Background: `bg-[#0A1628]/80 backdrop-blur-xl border-r border-white/[0.06]`
- Active item: left border accent `border-l-2 border-[--accent-cyan]` + subtle glow background
- Navigation sections: Monitor · Compliance · Intelligence · Admin

### Top Bar
- Height: `h-14`
- Contains: breadcrumb, global search (cmd+k), notifications bell, user avatar
- Background: `bg-[#050B18]/60 backdrop-blur-md border-b border-white/[0.06]`

### Page Grid
```tsx
// Standard 12-column grid
<div className="grid grid-cols-12 gap-4 p-6">
  {/* KPI row */}
  <div className="col-span-12 grid grid-cols-4 gap-4"> ... </div>
  {/* Main content + sidebar */}
  <div className="col-span-8"> ... </div>
  <div className="col-span-4"> ... </div>
</div>
```

---

## 6. Key Page Designs

### 6.1 Overview Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│  [KPI] Total Alerts  [KPI] Pending Cases  [KPI] SARs Filed  [KPI] False Pos %  │
├──────────────────────────────────┬──────────────────────────┤
│  Real-time Transaction Feed       │  Risk Distribution Chart  │
│  (live WebSocket, glass rows)     │  (donut — risk levels)    │
├──────────────────────────────────┤                          │
│  Recent High-Risk Alerts          │  Top Flagged Entities    │
│  (sortable, filterable table)     │  (mini list)             │
└──────────────────────────────────┴──────────────────────────┘
```

### 6.2 Transaction Monitor
- Full-width data table with virtual scrolling (TanStack Table)
- Columns: Timestamp · TxID · From → To · Amount · Type · Risk Score · Status · Actions
- Row color coding by risk: critical rows have subtle red left border glow
- Filters bar (glass): date range, risk level, amount range, jurisdiction, status
- Click row → side panel slides in with AI explanation + full audit trail

### 6.3 Alert Management
- Kanban-style board: New → Under Review → Escalated → Resolved
- Card shows: alert type, entity, risk score, age, assigned officer
- Drag-and-drop (dnd-kit) between columns
- Bulk select + assign actions

### 6.4 Case Management
- Master-detail layout
- Left: filterable case list with status indicators
- Right: case detail — timeline, linked transactions, SAR draft, notes, evidence files

### 6.5 KYC / Customer Profile
- Customer card (glass) at top: photo placeholder, name, risk tier, onboarding date
- Tabs: Identity Docs · Transaction History · Related Entities · Watchlist Hits · Audit Log
- Document upload zone with drag-and-drop (glass dashed border)

---

## 7. Data Display Components

### Financial Table Rules
```tsx
// Always use monospace for financial data columns
<TableCell className="font-mono text-sm text-cyan-300">
  ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
</TableCell>

// Transaction IDs truncated with tooltip
<TableCell className="font-mono text-xs text-slate-400">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>{txId.slice(0, 8)}...{txId.slice(-4)}</TooltipTrigger>
      <TooltipContent>{txId}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</TableCell>
```

### Real-time Feed Item (Live transactions)
```tsx
// Animate in from top with Framer Motion
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
>
  <RiskBadge level={tx.riskLevel} score={tx.riskScore} />
  <span className="font-mono text-xs text-slate-400">{tx.id}</span>
  <span className="text-sm text-slate-200">{tx.fromEntity} → {tx.toEntity}</span>
  <span className="font-mono text-sm text-cyan-300 ml-auto">${tx.amount}</span>
</motion.div>
```

### KPI Metric Card
```tsx
<GlassCard className="p-5">
  <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">{label}</p>
  <p className="text-3xl font-semibold text-white font-mono">{value}</p>
  <p className={cn("text-xs mt-1 flex items-center gap-1", trend > 0 ? "text-green-400" : "text-red-400")}>
    {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last period
  </p>
</GlassCard>
```

---

## 8. Animation & Interaction Rules

```tsx
// Page transitions — subtle fade+slide
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 }
}
const pageTransition = { duration: 0.2, ease: "easeInOut" }

// Staggered list items
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

// Alert pulse (critical only)
// Use CSS animation, not JS — performance critical
.alert-critical-pulse {
  animation: criticalPulse 2s ease-in-out infinite;
}
@keyframes criticalPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  50% { box-shadow: 0 0 20px 2px rgba(239, 68, 68, 0.3); }
}
```

**Rules:**
- No animation on tables/lists during data updates — use subtle row highlight instead
- Transition duration max `300ms` for interactive elements
- Loading states: skeleton shimmer, not spinners (except for AI operations)
- Critical alerts: pulsing red glow border
- No parallax, no scroll-triggered animations on data pages

---

## 9. AI Output Display

When rendering AI-generated content (risk explanations, SAR drafts):

```tsx
// AI Explanation Block
<GlassCard className="p-4 border-violet-500/20" glow="violet">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
    <span className="text-xs text-violet-300 uppercase tracking-widest">AI Analysis</span>
  </div>
  <p className="text-sm text-slate-300 leading-relaxed">{aiExplanation}</p>
  <div className="mt-3 flex gap-2">
    <span className="text-xs text-slate-500">Confidence: {confidence}%</span>
    <span className="text-xs text-slate-500">·</span>
    <span className="text-xs text-slate-500">Model: {modelVersion}</span>
  </div>
</GlassCard>
```

---

## 10. Form Design

```tsx
// Glass input style (add to tailwind config or component)
const inputClass = cn(
  "w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2",
  "text-sm text-slate-200 placeholder:text-slate-600",
  "focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.07]",
  "focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)]",
  "transition-all duration-200"
)
```

- All selects: custom styled (no native browser UI)
- Date pickers: use `react-day-picker` with dark glass theme
- Form validation: `react-hook-form` + `zod`
- Error states: red border glow, error message below in `text-red-400 text-xs`

---

## 11. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| `xl` (1280px+) | Full sidebar + 12-col grid |
| `lg` (1024px) | Sidebar icon-only + 8-col content |
| `md` (768px) | Hidden sidebar (hamburger) + full width |
| `sm` (< 768px) | Mobile — simplified views, no tables |

> **Note:** This is primarily a desktop-first app. Mobile is secondary — compliance officers work at desks. Optimize for 1440px+ screens.

---

## 12. Component Library Stack

```json
{
  "ui-primitives": "shadcn/ui",
  "animation": "framer-motion",
  "tables": "tanstack/react-table",
  "charts": "recharts",
  "forms": "react-hook-form + zod",
  "drag-drop": "dnd-kit",
  "date": "react-day-picker",
  "icons": "lucide-react",
  "toast": "sonner",
  "command-palette": "cmdk"
}
```

---

## 13. File & Folder Conventions

```
/components
  /ui           ← shadcn primitives + custom base components
  /dashboard    ← page-specific composed components
  /compliance   ← SAR, KYC, case management components
  /charts       ← recharts wrappers with dark theme
  /shared       ← navbar, sidebar, breadcrumb, modals

/app
  /(auth)       ← login, 2FA
  /(dashboard)  ← all protected routes

/lib
  /supabase     ← client, server, types
  /ai           ← openai helpers
  /utils        ← cn(), formatters, validators

/types
  index.ts      ← all TypeScript interfaces (Transaction, Alert, Case, etc.)

/hooks
  use-realtime-alerts.ts
  use-transactions.ts
  use-risk-score.ts
```

---

## 14. Performance Rules

- All data tables must use virtual scrolling (TanStack Virtual) — never render > 100 DOM rows
- Images (KYC documents): lazy load, never store in client state
- Real-time subscriptions: clean up on component unmount
- API calls: use SWR or React Query for caching — never raw fetch in components
- Bundle: use Next.js dynamic imports for heavy components (charts, rich text editor for SAR)
- Avoid `useEffect` for data fetching — use Server Components + Suspense where possible
