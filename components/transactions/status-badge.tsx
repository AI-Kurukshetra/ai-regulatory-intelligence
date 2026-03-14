import { cn } from '@/lib/utils/cn'
import { formatLabel } from '@/lib/utils/formatters'

type StatusBadgeProps = {
  status: string | null | undefined
}

const statusClassMap: Record<string, string> = {
  pending: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
  processing: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  flagged: 'border-red-500/30 bg-red-500/10 text-red-200',
  blocked: 'border-red-500/30 bg-red-500/15 text-red-200',
  failed: 'border-red-700/40 bg-red-950/30 text-red-200',
  new: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  in_review: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  escalated: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  false_positive: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  clear: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  review: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  hit: 'border-red-500/30 bg-red-500/15 text-red-200',
  skipped: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  potential: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  confirmed: 'border-red-500/30 bg-red-500/15 text-red-200',
  dismissed: 'border-slate-500/30 bg-slate-500/10 text-slate-200'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status ?? 'unknown'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]',
        statusClassMap[normalizedStatus] ?? 'border-white/15 bg-white/5 text-slate-200'
      )}
    >
      {formatLabel(normalizedStatus)}
    </span>
  )
}
