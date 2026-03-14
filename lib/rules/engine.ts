import { z } from 'zod'
import type { Database, Json } from '@/types/supabase'

type TransactionRow = Database['public']['Tables']['transactions']['Row']
type RuleRow = Database['public']['Tables']['rules']['Row']

type Severity = 'critical' | 'high' | 'medium' | 'low'
type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown'

type VelocityTransaction = Pick<TransactionRow, 'id' | 'amount' | 'created_at'>

const ThresholdConditionsSchema = z.object({
  amount_gte: z.number().positive()
})

const GeoConditionsSchema = z.object({
  countries: z.array(z.string().length(2)).min(1)
})

const VelocityConditionsSchema = z.object({
  window_hours: z.number().int().positive().max(24 * 30),
  transaction_count_gte: z.number().int().positive(),
  aggregate_amount_gte: z.number().positive().optional()
})

const severityScores: Record<Severity, number> = {
  critical: 90,
  high: 75,
  medium: 55,
  low: 30
}

export type RuleMatch = {
  rule_id: string
  rule_name: string
  rule_type: string
  severity: Severity
  score: number
  reason: string
  metadata?: Record<string, Json>
}

export type RuleFactor = {
  factor: string
  weight: number
  detail: string
}

export type RuleEngineResult = {
  score: number
  level: RiskLevel
  status: 'completed' | 'flagged'
  explanation: string
  matchedRules: RuleMatch[]
  factors: RuleFactor[]
  primaryAlertType: string | null
  primaryAlertTitle: string | null
}

function normalizeSeverity(severity: string): Severity {
  if (severity === 'critical' || severity === 'high' || severity === 'medium' || severity === 'low') {
    return severity
  }

  return 'low'
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

function alertTypeForRule(ruleType: string) {
  switch (ruleType) {
    case 'threshold':
      return 'threshold_breach'
    case 'velocity':
      return 'velocity'
    case 'geo':
      return 'geo_anomaly'
    default:
      return 'unusual_pattern'
  }
}

function evaluateThresholdRule(rule: RuleRow, transaction: TransactionRow): RuleMatch | null {
  const conditions = ThresholdConditionsSchema.safeParse(rule.conditions)
  if (!conditions.success) return null

  if (transaction.amount < conditions.data.amount_gte) {
    return null
  }

  const severity = normalizeSeverity(rule.severity)
  return {
    rule_id: rule.id,
    rule_name: rule.name,
    rule_type: rule.rule_type,
    severity,
    score: severityScores[severity],
    reason: `Amount ${transaction.amount} ${transaction.currency} exceeded ${conditions.data.amount_gte} ${transaction.currency}.`,
    metadata: {
      amount_gte: conditions.data.amount_gte
    }
  }
}

function evaluateGeoRule(rule: RuleRow, transaction: TransactionRow): RuleMatch | null {
  if (!transaction.counterparty_country) {
    return null
  }

  const conditions = GeoConditionsSchema.safeParse(rule.conditions)
  if (!conditions.success) return null

  if (!conditions.data.countries.includes(transaction.counterparty_country)) {
    return null
  }

  const severity = normalizeSeverity(rule.severity)
  return {
    rule_id: rule.id,
    rule_name: rule.name,
    rule_type: rule.rule_type,
    severity,
    score: severityScores[severity],
    reason: `Counterparty country ${transaction.counterparty_country} matched a monitored corridor.`,
    metadata: {
      counterparty_country: transaction.counterparty_country
    }
  }
}

function evaluateVelocityRule(
  rule: RuleRow,
  transaction: TransactionRow,
  recentTransactions: VelocityTransaction[]
): RuleMatch | null {
  if (!transaction.from_account_id) {
    return null
  }

  const conditions = VelocityConditionsSchema.safeParse(rule.conditions)
  if (!conditions.success) return null

  const transactionTimestamp = new Date(transaction.created_at).getTime()
  const windowStart = transactionTimestamp - conditions.data.window_hours * 60 * 60 * 1000
  const scopedTransactions = recentTransactions.filter(
    (recentTx) => new Date(recentTx.created_at).getTime() >= windowStart
  )

  const totalTransactions = scopedTransactions.length + 1
  const aggregateAmount =
    scopedTransactions.reduce((sum, recentTx) => sum + recentTx.amount, 0) + transaction.amount
  const countMatched = totalTransactions >= conditions.data.transaction_count_gte
  const amountMatched = conditions.data.aggregate_amount_gte
    ? aggregateAmount >= conditions.data.aggregate_amount_gte
    : true

  if (!countMatched || !amountMatched) {
    return null
  }

  const severity = normalizeSeverity(rule.severity)
  return {
    rule_id: rule.id,
    rule_name: rule.name,
    rule_type: rule.rule_type,
    severity,
    score: severityScores[severity],
    reason: `${totalTransactions} transactions from the same account were observed within ${conditions.data.window_hours}h, totaling ${aggregateAmount.toFixed(2)} ${transaction.currency}.`,
    metadata: {
      total_transactions: totalTransactions,
      aggregate_amount: Number(aggregateAmount.toFixed(2)),
      window_hours: conditions.data.window_hours
    }
  }
}

export function getVelocityLookbackHours(rules: RuleRow[]) {
  return rules
    .filter((rule) => rule.rule_type === 'velocity' && rule.is_active)
    .map((rule) => VelocityConditionsSchema.safeParse(rule.conditions))
    .filter((result) => result.success)
    .reduce((maxHours, result) => Math.max(maxHours, result.data.window_hours), 0)
}

export function evaluateRules(input: {
  transaction: TransactionRow
  rules: RuleRow[]
  recentTransactions?: VelocityTransaction[]
}): RuleEngineResult {
  const recentTransactions = input.recentTransactions ?? []

  const matchedRules = input.rules
    .filter((rule) => rule.is_active)
    .map((rule) => {
      switch (rule.rule_type) {
        case 'threshold':
          return evaluateThresholdRule(rule, input.transaction)
        case 'geo':
          return evaluateGeoRule(rule, input.transaction)
        case 'velocity':
          return evaluateVelocityRule(rule, input.transaction, recentTransactions)
        default:
          return null
      }
    })
    .filter((match): match is RuleMatch => match !== null)
    .sort((left, right) => right.score - left.score)

  if (matchedRules.length === 0) {
    return {
      score: 0,
      level: 'low',
      status: 'completed',
      explanation: 'No active rule matched this transaction. Transaction completed after deterministic screening.',
      matchedRules: [],
      factors: [],
      primaryAlertType: null,
      primaryAlertTitle: null
    }
  }

  const baseScore = matchedRules[0]?.score ?? 0
  const bonusScore = Math.min(20, Math.max(0, matchedRules.length - 1) * 10)
  const score = Math.min(100, baseScore + bonusScore)
  const level = toRiskLevel(score)
  const status = score >= 70 ? 'flagged' : 'completed'
  const primaryRule = matchedRules[0]

  return {
    score,
    level,
    status,
    explanation: `Matched ${matchedRules.length} rule${matchedRules.length > 1 ? 's' : ''}: ${matchedRules
      .map((rule) => `${rule.rule_name} (${rule.reason})`)
      .join(' ')}`,
    matchedRules,
    factors: matchedRules.map((rule) => ({
      factor: rule.rule_name,
      weight: Number((rule.score / 100).toFixed(2)),
      detail: rule.reason
    })),
    primaryAlertType: score >= 70 ? alertTypeForRule(primaryRule.rule_type) : null,
    primaryAlertTitle: score >= 70 ? `${primaryRule.rule_name} triggered manual review` : null
  }
}
