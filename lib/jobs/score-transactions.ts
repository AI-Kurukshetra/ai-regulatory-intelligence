import { supabaseAdmin } from '@/lib/supabase/admin'
import { scoreTransactionWithAI, type AIRiskAssessment } from '@/lib/ai/risk-scoring'
import { ScoreTransactionJobPayloadSchema } from '@/lib/jobs/schema'
import { evaluateRules, getVelocityLookbackHours } from '@/lib/rules/engine'
import type { Database } from '@/types/supabase'

type JobRow = Database['public']['Tables']['jobs']['Row']
type TransactionRow = Database['public']['Tables']['transactions']['Row']
type RuleRow = Database['public']['Tables']['rules']['Row']
type RiskScoreInsert = Database['public']['Tables']['risk_scores']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
type AlertInsert = Database['public']['Tables']['alerts']['Insert']
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

const SCORE_MODEL_NAME = 'rule-engine-v1'
const SCORE_MODEL_PROVIDER = 'system'

type FinalAssessment = {
  score: number
  level: string
  status: 'completed' | 'flagged' | 'blocked'
  explanation: string
  factors: unknown
  alertType: string | null
  alertTitle: string | null
}

type ProcessJobResult = {
  job_id: string
  transaction_id?: string
  status: 'done' | 'requeued' | 'failed'
  message: string
}

function errorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Unknown worker error'
}

async function markJobDone(jobId: string) {
  return supabaseAdmin
    .from('jobs')
    .update({
      status: 'done',
      updated_at: new Date().toISOString(),
      last_error: null
    })
    .eq('id', jobId)
}

async function markJobFailure(job: JobRow, message: string) {
  const shouldRetry = job.attempts < job.max_attempts
  const retryMinutes = Math.min(30, Math.max(1, job.attempts * 2))

  return supabaseAdmin
    .from('jobs')
    .update({
      status: shouldRetry ? 'queued' : 'failed',
      last_error: message,
      run_after: shouldRetry
        ? new Date(Date.now() + retryMinutes * 60 * 1000).toISOString()
        : job.run_after,
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
}

async function fetchTransaction(transactionId: string) {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  return {
    data: (data as TransactionRow | null) ?? null,
    error
  }
}

async function fetchActiveRules(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from('rules')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return {
    data: (data as RuleRow[] | null) ?? [],
    error
  }
}

async function fetchVelocityTransactions(transaction: TransactionRow, rules: RuleRow[]) {
  const lookbackHours = getVelocityLookbackHours(rules)

  if (!transaction.from_account_id || lookbackHours === 0) {
    return { data: [] as Pick<TransactionRow, 'id' | 'amount' | 'created_at'>[], error: null }
  }

  const windowStart = new Date(new Date(transaction.created_at).getTime() - lookbackHours * 60 * 60 * 1000)

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('id, amount, created_at')
    .eq('organization_id', transaction.organization_id)
    .eq('from_account_id', transaction.from_account_id)
    .lt('created_at', transaction.created_at)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false })

  return {
    data:
      (data as Pick<TransactionRow, 'id' | 'amount' | 'created_at'>[] | null) ??
      ([] as Pick<TransactionRow, 'id' | 'amount' | 'created_at'>[]),
    error
  }
}

function riskPriority(level: string) {
  switch (level) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'medium':
      return 2
    case 'low':
      return 1
    default:
      return 0
  }
}

function toRiskLevel(score: number) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

function mergeWithExistingTransactionState(
  assessment: FinalAssessment,
  transaction: TransactionRow
): FinalAssessment {
  const nextScore = Math.max(assessment.score, transaction.risk_score ?? 0)
  const nextLevel =
    riskPriority(transaction.risk_level ?? '') >= riskPriority(assessment.level)
      ? transaction.risk_level ?? assessment.level
      : assessment.level
  const nextStatus =
    transaction.status === 'blocked'
      ? 'blocked'
      : transaction.status === 'flagged' && assessment.status === 'completed'
        ? 'flagged'
        : assessment.status
  const nextExplanation =
    transaction.risk_explanation && !transaction.risk_explanation.includes(assessment.explanation)
      ? `${transaction.risk_explanation} ${assessment.explanation}`
      : transaction.risk_explanation ?? assessment.explanation

  return {
    ...assessment,
    score: nextScore,
    level: nextLevel,
    status: nextStatus,
    explanation: nextExplanation
  }
}

function mergeAssessment(
  ruleEvaluation: ReturnType<typeof evaluateRules>,
  aiAssessment: AIRiskAssessment | null
): FinalAssessment {
  if (!aiAssessment) {
    return {
      score: ruleEvaluation.score,
      level: ruleEvaluation.level,
      status: ruleEvaluation.status,
      explanation: ruleEvaluation.explanation,
      factors: ruleEvaluation.factors,
      alertType: ruleEvaluation.primaryAlertType,
      alertTitle: ruleEvaluation.primaryAlertTitle
    }
  }

  const score = Math.max(ruleEvaluation.score, aiAssessment.score)
  const level =
    riskPriority(aiAssessment.level) >= riskPriority(ruleEvaluation.level)
      ? aiAssessment.level
      : toRiskLevel(score)
  const flagged =
    ruleEvaluation.status === 'flagged' || aiAssessment.requires_manual_review || score >= 70

  return {
    score,
    level,
    status: flagged ? 'flagged' : 'completed',
    explanation: [
      `AI assessment: ${aiAssessment.summary}`,
      `Rule engine: ${ruleEvaluation.explanation}`
    ].join(' '),
    factors: aiAssessment.factors.length > 0 ? aiAssessment.factors : ruleEvaluation.factors,
    alertType: flagged
      ? aiAssessment.alert_type ?? ruleEvaluation.primaryAlertType ?? 'unusual_pattern'
      : null,
    alertTitle: flagged
      ? aiAssessment.alert_reason ?? ruleEvaluation.primaryAlertTitle ?? 'Manual review required'
      : null
  }
}

async function ensureRiskScore(
  transaction: TransactionRow,
  score: number,
  level: string,
  factors: unknown,
  modelName: string,
  modelProvider: string
) {
  const { data: existing } = await supabaseAdmin
    .from('risk_scores')
    .select('id')
    .eq('organization_id', transaction.organization_id)
    .eq('transaction_id', transaction.id)
    .eq('model_name', modelName)
    .maybeSingle()

  if (existing) {
    return { error: null }
  }

  const riskScoreInsert: RiskScoreInsert = {
    organization_id: transaction.organization_id,
    transaction_id: transaction.id,
    score,
    level,
    factors: factors as Database['public']['Tables']['risk_scores']['Insert']['factors'],
    model_provider: modelProvider,
    model_name: modelName
  }

  const { error } = await supabaseAdmin.from('risk_scores').insert(riskScoreInsert as never)
  return { error }
}

async function ensureAlert(
  transaction: TransactionRow,
  alertType: string,
  severity: string,
  title: string,
  description: string
) {
  const { data: existing } = await supabaseAdmin
    .from('alerts')
    .select('id')
    .eq('organization_id', transaction.organization_id)
    .eq('transaction_id', transaction.id)
    .eq('alert_type', alertType)
    .eq('title', title)
    .maybeSingle()

  if (existing) {
    return { alertId: existing.id, created: false, error: null }
  }

  const alertInsert: AlertInsert = {
    organization_id: transaction.organization_id,
    transaction_id: transaction.id,
    alert_type: alertType,
    severity,
    title,
    description
  }

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .insert(alertInsert as never)
    .select('id')
    .single()

  return {
    alertId: data?.id ?? null,
    created: Boolean(data?.id),
    error
  }
}

async function insertAuditLog(auditInsert: AuditLogInsert) {
  return supabaseAdmin.from('audit_logs').insert(auditInsert as never)
}

async function scoreTransactionJob(job: JobRow): Promise<ProcessJobResult> {
  const payload = ScoreTransactionJobPayloadSchema.safeParse(job.payload)
  if (!payload.success) {
    const message = 'Invalid score_transaction job payload'
    await markJobFailure(job, message)
    return {
      job_id: job.id,
      status: job.attempts < job.max_attempts ? 'requeued' : 'failed',
      message
    }
  }

  const transactionId = payload.data.transaction_id

  try {
    const { data: transaction, error: transactionError } = await fetchTransaction(transactionId)

    if (transactionError || !transaction) {
      const message = transactionError?.message ?? 'Transaction not found'
      await markJobFailure(job, message)
      return {
        job_id: job.id,
        transaction_id: transactionId,
        status: job.attempts < job.max_attempts ? 'requeued' : 'failed',
        message
      }
    }

    if (transaction.scored_at) {
      await markJobDone(job.id)
      return {
        job_id: job.id,
        transaction_id: transaction.id,
        status: 'done',
        message: 'Transaction was already scored'
      }
    }

    const { data: rules, error: rulesError } = await fetchActiveRules(transaction.organization_id)
    if (rulesError) {
      throw new Error(rulesError.message)
    }

    const { data: recentTransactions, error: recentTxError } = await fetchVelocityTransactions(
      transaction,
      rules
    )
    if (recentTxError) {
      throw new Error(recentTxError.message)
    }

    const evaluation = evaluateRules({
      transaction,
      rules,
      recentTransactions
    })

    const riskScoreResult = await ensureRiskScore(
      transaction,
      evaluation.score,
      evaluation.level,
      evaluation.factors,
      SCORE_MODEL_NAME,
      SCORE_MODEL_PROVIDER
    )
    if (riskScoreResult.error) {
      throw new Error(riskScoreResult.error.message)
    }

    let aiAssessment: AIRiskAssessment | null = null
    let aiModelName: string | null = null

    try {
      const aiResult = await scoreTransactionWithAI({
        transaction,
        ruleEvaluation: evaluation
      })

      if (aiResult) {
        aiAssessment = aiResult.assessment
        aiModelName = aiResult.model

        const aiRiskScoreResult = await ensureRiskScore(
          transaction,
          aiAssessment.score,
          aiAssessment.level,
          aiAssessment.factors,
          aiModelName,
          'openai'
        )

        if (aiRiskScoreResult.error) {
          throw new Error(aiRiskScoreResult.error.message)
        }
      }
    } catch (error) {
      await insertAuditLog({
        organization_id: transaction.organization_id,
        actor_user_id: null,
        action: 'transaction.ai_scoring_failed',
        entity_type: 'transaction',
        entity_id: transaction.id,
        after_data: {
          message: errorMessage(error)
        }
      })
    }

    const finalAssessment = mergeWithExistingTransactionState(
      mergeAssessment(evaluation, aiAssessment),
      transaction
    )

    let alertId: string | null = null
    if (finalAssessment.alertType && finalAssessment.alertTitle) {
      const alertResult = await ensureAlert(
        transaction,
        finalAssessment.alertType,
        finalAssessment.level === 'critical'
          ? 'critical'
          : finalAssessment.level === 'high'
            ? 'high'
            : 'medium',
        finalAssessment.alertTitle,
        finalAssessment.explanation
      )

      if (alertResult.error) {
        throw new Error(alertResult.error.message)
      }

      alertId = alertResult.alertId

      if (alertResult.created) {
        await insertAuditLog({
          organization_id: transaction.organization_id,
          actor_user_id: null,
          action: 'alert.created',
          entity_type: 'alert',
          entity_id: alertResult.alertId,
          after_data: {
            transaction_id: transaction.id,
            title: finalAssessment.alertTitle,
            severity: finalAssessment.level
          }
        })
      }
    }

    const transactionUpdate: TransactionUpdate = {
      risk_score: finalAssessment.score,
      risk_level: finalAssessment.level,
      risk_explanation: finalAssessment.explanation,
      scored_at: new Date().toISOString(),
      status: finalAssessment.status
    }

    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update(transactionUpdate as never)
      .eq('id', transaction.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    await insertAuditLog({
      organization_id: transaction.organization_id,
      actor_user_id: null,
      action: 'transaction.scored',
      entity_type: 'transaction',
      entity_id: transaction.id,
      after_data: {
        risk_score: finalAssessment.score,
        risk_level: finalAssessment.level,
        status: finalAssessment.status,
        matched_rules: evaluation.matchedRules.map((rule) => rule.rule_name),
        ai_model: aiModelName,
        ai_used: Boolean(aiAssessment),
        alert_id: alertId
      }
    })

    await markJobDone(job.id)

    return {
      job_id: job.id,
      transaction_id: transaction.id,
      status: 'done',
      message: `Scored transaction with ${evaluation.matchedRules.length} matched rule(s)`
    }
  } catch (error) {
    const message = errorMessage(error)
    await markJobFailure(job, message)

    return {
      job_id: job.id,
      transaction_id: transactionId,
      status: job.attempts < job.max_attempts ? 'requeued' : 'failed',
      message
    }
  }
}

export async function processQueuedScoreTransactionJobs(limit = 10) {
  const { data, error } = await supabaseAdmin.rpc('claim_jobs', {
    p_job_type: 'score_transaction',
    p_limit: limit
  })

  if (error) {
    throw new Error(error.message)
  }

  const claimedJobs = (data ?? []) as JobRow[]
  const results: ProcessJobResult[] = []

  for (const job of claimedJobs) {
    results.push(await scoreTransactionJob(job))
  }

  return {
    claimed: claimedJobs.length,
    completed: results.filter((result) => result.status === 'done').length,
    requeued: results.filter((result) => result.status === 'requeued').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results
  }
}
