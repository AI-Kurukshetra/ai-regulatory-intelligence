import type { CasePriority, CaseStatus } from '@/lib/cases/schema'

const allowedCaseTransitions: Record<CaseStatus, readonly CaseStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['pending_sar', 'closed'],
  pending_sar: ['in_progress', 'sar_filed', 'closed'],
  sar_filed: ['closed'],
  closed: []
}

export function canTransitionCaseStatus(currentStatus: CaseStatus, nextStatus: CaseStatus) {
  return currentStatus === nextStatus || allowedCaseTransitions[currentStatus].includes(nextStatus)
}

export function priorityFromAlertSeverity(severity: string | null | undefined): CasePriority {
  switch (severity) {
    case 'critical':
      return 'critical'
    case 'high':
      return 'high'
    case 'low':
      return 'low'
    default:
      return 'medium'
  }
}

export function buildCaseNumber(now = new Date()) {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CASE-${stamp}-${suffix}`
}
