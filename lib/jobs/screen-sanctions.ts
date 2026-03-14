import { supabaseAdmin } from '@/lib/supabase/admin'
import { ScreenSanctionsJobPayloadSchema } from '@/lib/jobs/schema'
import {
  classifySanctionsCandidates,
  normalizeScreeningName,
  type WatchlistCandidate
} from '@/lib/sanctions/screening'
import type { Database, Json } from '@/types/supabase'

type JobRow = Database['public']['Tables']['jobs']['Row']
type TransactionRow = Database['public']['Tables']['transactions']['Row']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
type SanctionsHitInsert = Database['public']['Tables']['sanctions_hits']['Insert']
type AlertInsert = Database['public']['Tables']['alerts']['Insert']
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

type ProcessJobResult = {
  job_id: string
  transaction_id?: string
  status: 'done' | 'requeued' | 'failed'
  message: string
}

function errorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Unknown sanctions screening error'
}

function riskPriority(level: string | null | undefined) {
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

function mergeRiskLevel(currentLevel: string | null, nextLevel: 'high' | 'critical' | null) {
  if (!nextLevel) {
    return currentLevel
  }

  return riskPriority(nextLevel) >= riskPriority(currentLevel) ? nextLevel : currentLevel
}

function appendExplanation(current: string | null, addition: string) {
  if (!current) {
    return addition
  }

  if (current.includes(addition)) {
    return current
  }

  return `${current} ${addition}`
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

async function insertAuditLog(auditInsert: AuditLogInsert) {
  return supabaseAdmin.from('audit_logs').insert(auditInsert as never)
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

async function searchWatchlistCandidates(counterpartyName: string) {
  const normalizedName = normalizeScreeningName(counterpartyName)

  if (!normalizedName) {
    return {
      data: [] as WatchlistCandidate[],
      error: null
    }
  }

  const { data, error } = await supabaseAdmin.rpc('search_watchlist_candidates', {
    p_search_name: normalizedName,
    p_limit: 10
  })

  return {
    data: ((data ?? []) as WatchlistCandidate[]).map((candidate) => ({
      ...candidate,
      aliases: (candidate.aliases ?? []) as Json,
      aliases_normalized: (candidate.aliases_normalized ?? []) as Json
    })),
    error
  }
}

async function ensureSanctionsHit(
  transaction: TransactionRow,
  watchlistEntryId: string,
  matchScore: number,
  hitStatus: 'potential' | 'confirmed',
  matchedValue: string,
  rationale: string
) {
  const { data: existing } = await supabaseAdmin
    .from('sanctions_hits')
    .select('id')
    .eq('organization_id', transaction.organization_id)
    .eq('transaction_id', transaction.id)
    .eq('watchlist_entry_id', watchlistEntryId)
    .eq('matched_field', 'counterparty_name')
    .maybeSingle()

  if (existing) {
    return {
      hitId: existing.id,
      created: false,
      error: null
    }
  }

  const sanctionsHitInsert: SanctionsHitInsert = {
    organization_id: transaction.organization_id,
    transaction_id: transaction.id,
    watchlist_entry_id: watchlistEntryId,
    screening_provider: 'system',
    match_score: matchScore,
    hit_status: hitStatus,
    matched_field: 'counterparty_name',
    matched_value: matchedValue,
    rationale
  }

  const { data, error } = await supabaseAdmin
    .from('sanctions_hits')
    .insert(sanctionsHitInsert as never)
    .select('id')
    .single()

  return {
    hitId: data?.id ?? null,
    created: Boolean(data?.id),
    error
  }
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

async function screenSanctionsJob(job: JobRow): Promise<ProcessJobResult> {
  const payload = ScreenSanctionsJobPayloadSchema.safeParse(job.payload)

  if (!payload.success) {
    const message = 'Invalid screen_sanctions job payload'
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

    if (transaction.screened_at && transaction.screening_status !== 'pending') {
      await markJobDone(job.id)
      return {
        job_id: job.id,
        transaction_id: transaction.id,
        status: 'done',
        message: 'Transaction was already screened against sanctions watchlists'
      }
    }

    const { data: candidates, error: candidatesError } = await searchWatchlistCandidates(
      transaction.counterparty_name ?? ''
    )

    if (candidatesError) {
      throw new Error(candidatesError.message)
    }

    const decision = classifySanctionsCandidates(transaction.counterparty_name, candidates)

    let alertId: string | null = null
    let hitId: string | null = null

    if (
      decision.bestCandidate &&
      decision.hitStatus &&
      decision.matchScore !== null &&
      decision.matchedValue
    ) {
      const sanctionsHit = await ensureSanctionsHit(
        transaction,
        decision.bestCandidate.id,
        decision.matchScore,
        decision.hitStatus,
        decision.matchedValue,
        decision.rationale
      )

      if (sanctionsHit.error) {
        throw new Error(sanctionsHit.error.message)
      }

      hitId = sanctionsHit.hitId

      if (decision.alertType && decision.alertTitle) {
        const alertResult = await ensureAlert(
          transaction,
          decision.alertType,
          decision.hitStatus === 'confirmed' ? 'critical' : 'high',
          decision.alertTitle,
          decision.rationale
        )

        if (alertResult.error) {
          throw new Error(alertResult.error.message)
        }

        alertId = alertResult.alertId
      }
    }

    const nextStatus =
      transaction.status === 'blocked'
        ? 'blocked'
        : decision.transactionStatus === 'blocked'
          ? 'blocked'
          : decision.transactionStatus === 'flagged'
            ? 'flagged'
            : transaction.status

    const nextRiskScore =
      decision.minimumRiskScore !== null
        ? Math.max(transaction.risk_score ?? 0, decision.minimumRiskScore)
        : transaction.risk_score

    const nextRiskLevel = mergeRiskLevel(transaction.risk_level, decision.minimumRiskLevel)
    const nextExplanation =
      decision.screeningStatus === 'clear'
        ? transaction.risk_explanation
        : appendExplanation(transaction.risk_explanation, `Sanctions screening: ${decision.rationale}`)

    const transactionUpdate: TransactionUpdate = {
      screening_status: decision.screeningStatus,
      screened_at: new Date().toISOString(),
      status: nextStatus,
      risk_score: nextRiskScore,
      risk_level: nextRiskLevel,
      risk_explanation: nextExplanation
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
      action: 'transaction.sanctions_screened',
      entity_type: 'transaction',
      entity_id: transaction.id,
      after_data: {
        screening_status: decision.screeningStatus,
        match_score: decision.matchScore,
        counterparty_name: transaction.counterparty_name,
        best_candidate: decision.bestCandidate
          ? {
              entity_name: decision.bestCandidate.entity_name,
              list_name: decision.bestCandidate.list_name,
              source: decision.bestCandidate.source
            }
          : null,
        sanctions_hit_id: hitId,
        alert_id: alertId
      }
    })

    await markJobDone(job.id)

    return {
      job_id: job.id,
      transaction_id: transaction.id,
      status: 'done',
      message: decision.rationale
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

export async function processQueuedSanctionsScreeningJobs(limit = 10) {
  const { data, error } = await supabaseAdmin.rpc('claim_jobs', {
    p_job_type: 'screen_sanctions',
    p_limit: limit
  })

  if (error) {
    throw new Error(error.message)
  }

  const claimedJobs = (data ?? []) as JobRow[]
  const results: ProcessJobResult[] = []

  for (const job of claimedJobs) {
    results.push(await screenSanctionsJob(job))
  }

  return {
    claimed: claimedJobs.length,
    completed: results.filter((result) => result.status === 'done').length,
    requeued: results.filter((result) => result.status === 'requeued').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results
  }
}
