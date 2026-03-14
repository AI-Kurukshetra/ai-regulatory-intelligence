import { describe, expect, it } from 'vitest'
import { buildCaseNumber, canTransitionCaseStatus, priorityFromAlertSeverity } from '../lib/cases/transitions'

describe('canTransitionCaseStatus', () => {
  it('allows forward progression into SAR review', () => {
    expect(canTransitionCaseStatus('in_progress', 'pending_sar')).toBe(true)
  })

  it('rejects reopening a closed case through the normal transition map', () => {
    expect(canTransitionCaseStatus('closed', 'in_progress')).toBe(false)
  })
})

describe('priorityFromAlertSeverity', () => {
  it('maps alert severity to case priority', () => {
    expect(priorityFromAlertSeverity('critical')).toBe('critical')
    expect(priorityFromAlertSeverity('high')).toBe('high')
    expect(priorityFromAlertSeverity('unknown')).toBe('medium')
  })
})

describe('buildCaseNumber', () => {
  it('creates a human-readable case number prefix', () => {
    expect(buildCaseNumber(new Date('2026-03-14T00:00:00.000Z'))).toMatch(/^CASE-20260314-[A-Z0-9]{4}$/)
  })
})
