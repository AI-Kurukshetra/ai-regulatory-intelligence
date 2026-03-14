import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractResponseText,
  parseAiRiskAssessmentText,
  scoreTransactionWithAI
} from '../lib/ai/risk-scoring'
import type { Database } from '../types/supabase'
import type { RuleEngineResult } from '../lib/rules/engine'

type TransactionRow = Database['public']['Tables']['transactions']['Row']

const originalApiKey = process.env.OPENAI_API_KEY
const originalModel = process.env.OPENAI_MODEL_RISK_SCORING

function makeTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    organization_id: 'org-1',
    idempotency_key: 'idem-1',
    external_tx_id: 'ext-1',
    from_account_id: 'from-1',
    to_account_id: 'to-1',
    amount: 25000,
    currency: 'USD',
    counterparty_name: 'Acme Trading LLC',
    counterparty_country: 'AE',
    transaction_type: 'wire',
    status: 'pending',
    risk_score: null,
    risk_level: null,
    risk_explanation: null,
    screening_status: 'pending',
    screened_at: null,
    scored_at: null,
    created_at: '2026-03-14T10:00:00.000Z',
    ...overrides
  }
}

const baseRuleEvaluation: RuleEngineResult = {
  score: 75,
  level: 'high',
  status: 'flagged',
  explanation: 'Matched threshold rule.',
  matchedRules: [],
  factors: [
    {
      factor: 'Large wire threshold',
      weight: 0.75,
      detail: 'Amount exceeded configured limit.'
    }
  ],
  primaryAlertType: 'threshold_breach',
  primaryAlertTitle: 'Large wire threshold triggered manual review'
}

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey
  process.env.OPENAI_MODEL_RISK_SCORING = originalModel
  vi.restoreAllMocks()
})

describe('parseAiRiskAssessmentText', () => {
  it('parses a valid AI scoring payload', () => {
    const parsed = parseAiRiskAssessmentText(
      JSON.stringify({
        score: 82,
        level: 'critical',
        summary: 'Escalate due to corridor and size.',
        requires_manual_review: true,
        alert_type: 'geo_anomaly',
        alert_reason: 'High-risk corridor',
        factors: [
          {
            factor: 'Corridor risk',
            weight: 0.8,
            detail: 'Transaction originated from a monitored corridor.'
          }
        ]
      })
    )

    expect(parsed.score).toBe(82)
    expect(parsed.level).toBe('critical')
    expect(parsed.alert_type).toBe('geo_anomaly')
  })

  it('rejects malformed JSON', () => {
    expect(() => parseAiRiskAssessmentText('not-json')).toThrow(
      'OpenAI risk scoring did not return valid JSON'
    )
  })
})

describe('extractResponseText', () => {
  it('extracts assistant output_text from a responses payload', () => {
    const outputText = extractResponseText({
      output: [
        { type: 'reasoning', summary: [] },
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: '{"score":80,"level":"critical","summary":"Escalate","requires_manual_review":true,"alert_type":"unusual_pattern","alert_reason":"Escalate","factors":[]}'
            }
          ]
        }
      ]
    })

    expect(outputText).toContain('"score":80')
  })
})

describe('scoreTransactionWithAI', () => {
  it('returns a validated assessment when OpenAI responds with JSON output', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_MODEL_RISK_SCORING = 'gpt-5-mini'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    score: 88,
                    level: 'critical',
                    summary: 'Escalate for manual review.',
                    requires_manual_review: true,
                    alert_type: 'threshold_breach',
                    alert_reason: 'Large cross-border wire',
                    factors: [
                      {
                        factor: 'Transaction amount',
                        weight: 0.88,
                        detail: 'Transaction exceeds the usual pattern.'
                      }
                    ]
                  })
                }
              ]
            }
          ]
        })
      })
    )

    const result = await scoreTransactionWithAI({
      transaction: makeTransaction(),
      ruleEvaluation: baseRuleEvaluation
    })

    expect(result?.model).toBe('gpt-5-mini')
    expect(result?.assessment.score).toBe(88)
    expect(result?.assessment.requires_manual_review).toBe(true)
  })
})
