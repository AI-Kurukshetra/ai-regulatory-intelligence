import { cn } from '@/lib/utils/cn'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown'

type RiskBadgeProps = {
  level?: string | null
  score?: number | null
}

const riskConfig: Record<
  RiskLevel,
  {
    label: string
    className: string
    dotClassName: string
  }
> = {
  critical: {
    label: 'Critical',
    className: 'border-red-500/40 bg-red-500/15 text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.18)]',
    dotClassName: 'bg-red-400'
  },
  high: {
    label: 'High',
    className: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
    dotClassName: 'bg-orange-400'
  },
  medium: {
    label: 'Medium',
    className: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
    dotClassName: 'bg-yellow-400'
  },
  low: {
    label: 'Low',
    className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    dotClassName: 'bg-emerald-400'
  },
  unknown: {
    label: 'Unscored',
    className: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
    dotClassName: 'bg-slate-400'
  }
}

function normalizeLevel(level?: string | null): RiskLevel {
  if (
    level === 'critical' ||
    level === 'high' ||
    level === 'medium' ||
    level === 'low' ||
    level === 'unknown'
  ) {
    return level
  }

  return 'unknown'
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const normalizedLevel = normalizeLevel(level)
  const config = riskConfig[normalizedLevel]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
        config.className
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', config.dotClassName)} />
      <span>{config.label}</span>
      {typeof score === 'number' ? <span className="font-mono text-[10px] opacity-80">{score}</span> : null}
    </span>
  )
}
