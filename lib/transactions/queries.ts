import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

type DbClient = {
  from: typeof supabaseAdmin.from
}

export const transactionListColumns =
  'id, external_tx_id, from_account_id, to_account_id, amount, currency, transaction_type, counterparty_country, counterparty_name, status, screening_status, created_at, risk_score, risk_level'

export const transactionAlertColumns =
  'id, alert_type, severity, status, title, description, created_at'

export const transactionDetailColumns = `${transactionListColumns}, risk_explanation, scored_at, screened_at, alerts(${transactionAlertColumns})`

export const TransactionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.string().min(1).max(40).optional(),
  risk_level: z.string().min(1).max(20).optional()
})

export type TransactionListQuery = z.infer<typeof TransactionListQuerySchema>
export type TransactionRow = Database['public']['Tables']['transactions']['Row']
export type AlertRow = Database['public']['Tables']['alerts']['Row']
export type SanctionsHitRow = Database['public']['Tables']['sanctions_hits']['Row']
export type WatchlistEntryRow = Database['public']['Tables']['watchlist_entries']['Row']

export type TransactionListItem = Pick<
  TransactionRow,
  | 'id'
  | 'external_tx_id'
  | 'from_account_id'
  | 'to_account_id'
  | 'amount'
  | 'currency'
  | 'transaction_type'
  | 'counterparty_country'
  | 'counterparty_name'
  | 'status'
  | 'screening_status'
  | 'risk_score'
  | 'risk_level'
  | 'created_at'
>

export type TransactionAlertItem = Pick<
  AlertRow,
  'id' | 'alert_type' | 'severity' | 'status' | 'title' | 'description' | 'created_at'
>

export type TransactionSanctionsHitItem = Pick<
  SanctionsHitRow,
  'id' | 'match_score' | 'hit_status' | 'matched_field' | 'matched_value' | 'rationale' | 'created_at'
> & {
  watchlist_entry: Pick<WatchlistEntryRow, 'entity_name' | 'list_name' | 'source' | 'country'> | null
}

export type TransactionDetailItem = TransactionListItem &
  Pick<TransactionRow, 'risk_explanation' | 'scored_at' | 'screened_at'> & {
    alerts: TransactionAlertItem[]
    sanctions_hits: TransactionSanctionsHitItem[]
  }

export type TransactionSummary = {
  total: number
  pending: number
  flagged: number
  highRisk: number
}

async function countTransactions(
  supabase: DbClient,
  organizationId: string,
  filters: {
    status?: string
    riskLevels?: string[]
  } = {}
) {
  let statement = supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (filters.status) {
    statement = statement.eq('status', filters.status)
  }

  if (filters.riskLevels && filters.riskLevels.length > 0) {
    statement = statement.in('risk_level', filters.riskLevels)
  }

  const { count, error } = await statement

  return {
    count: count ?? 0,
    error
  }
}

export async function listTransactions(
  supabase: DbClient,
  organizationId: string,
  query: TransactionListQuery
) {
  let statement = supabase
    .from('transactions')
    .select(transactionListColumns)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)

  if (query.status) {
    statement = statement.eq('status', query.status)
  }

  if (query.risk_level) {
    statement = statement.eq('risk_level', query.risk_level)
  }

  const { data, error } = await statement

  return {
    data: (data ?? []) as TransactionListItem[],
    error
  }
}

export async function getTransactionDetail(
  supabase: DbClient,
  organizationId: string,
  transactionId: string
) {
  const { data, error } = await supabase
    .from('transactions')
    .select(transactionDetailColumns)
    .eq('organization_id', organizationId)
    .eq('id', transactionId)
    .maybeSingle()

  if (error || !data) {
    return {
      data: (data as TransactionDetailItem | null) ?? null,
      error
    }
  }

  const { data: sanctionsHits, error: sanctionsHitsError } = await getTransactionSanctionsHits(
    supabase,
    organizationId,
    transactionId
  )

  return {
    data: {
      ...(data as Omit<TransactionDetailItem, 'sanctions_hits'>),
      sanctions_hits: sanctionsHits
    } as TransactionDetailItem,
    error: error ?? sanctionsHitsError
  }
}

async function getTransactionSanctionsHits(
  supabase: DbClient,
  organizationId: string,
  transactionId: string
) {
  const { data: hits, error } = await supabase
    .from('sanctions_hits')
    .select(
      'id, match_score, hit_status, matched_field, matched_value, rationale, created_at, watchlist_entry_id'
    )
    .eq('organization_id', organizationId)
    .eq('transaction_id', transactionId)
    .order('match_score', { ascending: false })

  if (error || !hits || hits.length === 0) {
    return {
      data: [] as TransactionSanctionsHitItem[],
      error
    }
  }

  const watchlistEntryIds = hits.map((hit) => hit.watchlist_entry_id)

  const { data: watchlistEntries, error: watchlistError } = await supabase
    .from('watchlist_entries')
    .select('id, entity_name, list_name, source, country')
    .in('id', watchlistEntryIds)

  const watchlistMap = new Map(
    ((watchlistEntries ?? []) as Pick<
      WatchlistEntryRow,
      'id' | 'entity_name' | 'list_name' | 'source' | 'country'
    >[]).map((entry) => [entry.id, entry])
  )

  return {
    data: hits.map((hit) => ({
      id: hit.id,
      match_score: hit.match_score,
      hit_status: hit.hit_status,
      matched_field: hit.matched_field,
      matched_value: hit.matched_value,
      rationale: hit.rationale,
      created_at: hit.created_at,
      watchlist_entry: watchlistMap.get(hit.watchlist_entry_id) ?? null
    })) as TransactionSanctionsHitItem[],
    error: watchlistError
  }
}

export async function getTransactionSummary(
  supabase: DbClient,
  organizationId: string
) {
  const [total, pending, flagged, highRisk] = await Promise.all([
    countTransactions(supabase, organizationId),
    countTransactions(supabase, organizationId, { status: 'pending' }),
    countTransactions(supabase, organizationId, { status: 'flagged' }),
    countTransactions(supabase, organizationId, { riskLevels: ['critical', 'high'] })
  ])

  return {
    data: {
      total: total.count,
      pending: pending.count,
      flagged: flagged.count,
      highRisk: highRisk.count
    } satisfies TransactionSummary,
    error: total.error ?? pending.error ?? flagged.error ?? highRisk.error ?? null
  }
}
