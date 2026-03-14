import { afterEach, describe, expect, it } from 'vitest'
import { generateSarDraft } from '../lib/ai/sar-draft'

const originalApiKey = process.env.OPENAI_API_KEY

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey
})

describe('generateSarDraft', () => {
  it('falls back to a deterministic narrative when OpenAI is unavailable', async () => {
    process.env.OPENAI_API_KEY = ''

    const result = await generateSarDraft({
      case: {
        case_number: 'CASE-20260314-ABCD',
        title: 'Potential structuring investigation',
        priority: 'high',
        status: 'in_progress',
        description: 'Multiple high-risk outbound wires require review.'
      },
      alerts: [
        {
          title: 'Large wire threshold triggered manual review',
          severity: 'high',
          alert_type: 'threshold_breach',
          description: 'Amount exceeded configured limit.',
          created_at: '2026-03-14T10:00:00.000Z'
        }
      ],
      transactions: [
        {
          id: 'tx-1',
          external_tx_id: 'ext-1',
          amount: 12500,
          currency: 'USD',
          transaction_type: 'wire',
          status: 'flagged',
          risk_score: 82,
          risk_level: 'critical',
          created_at: '2026-03-14T09:00:00.000Z'
        }
      ],
      notes: [
        {
          note: 'Customer relationship manager could not explain the transfer pattern.',
          created_at: '2026-03-14T11:00:00.000Z',
          author_name: 'Analyst Jane'
        }
      ]
    })

    expect(result.usedFallback).toBe(true)
    expect(result.model).toBe('manual-fallback')
    expect(result.narrative).toContain('CASE-20260314-ABCD')
    expect(result.narrative).toContain('Analyst Jane')
  })
})
