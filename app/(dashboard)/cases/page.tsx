import { requirePageAuth } from '@/lib/auth/page-context'

export const dynamic = 'force-dynamic'

export default async function CasesPage() {
  await requirePageAuth(['admin', 'compliance_officer', 'analyst', 'auditor', 'readonly'])

  return (
    <section className="glass-card rounded-2xl p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Future phase</p>
      <h1 className="mt-2 text-2xl font-semibold">Case Management</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
        Cases are intentionally not implemented yet. We will unlock alert-to-case workflows after Phase 2 is accepted
        so we do not blur the boundary between transaction core and compliance operations.
      </p>
    </section>
  )
}
