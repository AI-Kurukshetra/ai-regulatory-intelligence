import { requirePageAuth } from '@/lib/auth/page-context'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  await requirePageAuth(['admin', 'compliance_officer', 'analyst', 'auditor', 'readonly'])

  return (
    <section className="glass-card rounded-2xl p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Future phase</p>
      <h1 className="mt-2 text-2xl font-semibold">Regulatory Reports</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
        SAR drafting and report lifecycles come after the transaction and alert layers are stable. This placeholder
        keeps navigation coherent while we stay disciplined about the sprint boundary.
      </p>
    </section>
  )
}
