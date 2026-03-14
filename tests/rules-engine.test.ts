import { describe, expect, it } from 'vitest'
import type { Database } from '../types/supabase'
import { evaluateRules, getVelocityLookbackHours } from '../lib/rules/engine'

type TransactionRow = Database['public']['Tables']['transactions']['Row']
type RuleRow = Database['public']['Tables']['rules']['Row']

function makeTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    organization_id: 'org-1',
    idempotency_key: 'idem-1',
    external_tx_id: null,
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

function makeRule(overrides: Partial<RuleRow> = {}): RuleRow {
  return {
    id: 'rule-1',
    organization_id: 'org-1',
    name: 'Large wire threshold',
    rule_type: 'threshold',
    conditions: { amount_gte: 10000 },
    severity: 'high',
    is_active: true,
    created_at: '2026-03-14T09:00:00.000Z',
    ...overrides
  }
}

describe('evaluateRules', () => {
  it('flags a transaction when a high-severity threshold rule matches', () => {
    const result = evaluateRules({
      transaction: makeTransaction(),
      rules: [makeRule()]
    })

    expect(result.score).toBe(75)
    expect(result.level).toBe('high')
    expect(result.status).toBe('flagged')
    expect(result.primaryAlertType).toBe('threshold_breach')
    expect(result.matchedRules).toHaveLength(1)
  })

  it('keeps the transaction completed when only medium severity matches', () => {
    const result = evaluateRules({
      transaction: makeTransaction({
        amount: 1500
      }),
      rules: [
        makeRule({
          name: 'Monitored corridor',
          rule_type: 'geo',
          severity: 'medium',
          conditions: { countries: ['AE', 'IR'] }
        })
      ]
    })

    expect(result.score).toBe(55)
    expect(result.level).toBe('medium')
    expect(result.status).toBe('completed')
    expect(result.primaryAlertType).toBeNull()
  })

  it('adds a bonus when multiple rules match and respects velocity lookback windows', () => {
    const rules = [
      makeRule({
        id: 'rule-threshold',
        name: 'Large wire threshold',
        rule_type: 'threshold',
        severity: 'high',
        conditions: { amount_gte: 10000 }
      }),
      makeRule({
        id: 'rule-velocity',
        name: 'Burst outbound transfers',
        rule_type: 'velocity',
        severity: 'medium',
        conditions: {
          window_hours: 6,
          transaction_count_gte: 3,
          aggregate_amount_gte: 30000
        }
      })
    ]

    const result = evaluateRules({
      transaction: makeTransaction(),
      rules,
      recentTransactions: [
        {
          id: 'tx-older-1',
          amount: 4000,
          created_at: '2026-03-14T08:30:00.000Z'
        },
        {
          id: 'tx-older-2',
          amount: 5000,
          created_at: '2026-03-14T07:00:00.000Z'
        }
      ]
    })

    expect(getVelocityLookbackHours(rules)).toBe(6)
    expect(result.matchedRules).toHaveLength(2)
    expect(result.score).toBe(85)
    expect(result.level).toBe('critical')
    expect(result.primaryAlertType).toBe('threshold_breach')
  })
})
