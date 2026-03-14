import { afterEach, describe, expect, it } from 'vitest'
import { analyzeRegulatoryDocument } from '../lib/ai/regulatory-analysis'

const originalApiKey = process.env.OPENAI_API_KEY

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey
})

describe('analyzeRegulatoryDocument', () => {
  it('returns a deterministic fallback analysis when OpenAI is unavailable', async () => {
    process.env.OPENAI_API_KEY = ''

    const result = await analyzeRegulatoryDocument({
      title: 'FinCEN Advisory on Sanctions Evasion Controls',
      source: 'FinCEN',
      jurisdiction: 'US',
      document_type: 'guidance',
      effective_at: '2026-04-01T00:00:00.000Z',
      published_at: '2026-03-14T00:00:00.000Z',
      content:
        'Financial institutions must strengthen sanctions screening, transaction monitoring, and suspicious activity report escalation for jurisdictions associated with sanctions evasion. The guidance is effective immediately and requires policy updates, board oversight, and refreshed documentation for higher-risk onboarding and reporting controls.'
    })

    expect(result.usedFallback).toBe(true)
    expect(result.model).toBe('manual-fallback')
    expect(result.analysis.summary.length).toBeGreaterThan(20)
    expect(result.analysis.requires_attention).toBe(true)
    expect(['high', 'critical']).toContain(result.analysis.impact_level)
    expect(result.analysis.affected_areas).toContain('Sanctions screening')
    expect(result.analysis.action_items.length).toBeGreaterThan(0)
  })
})
