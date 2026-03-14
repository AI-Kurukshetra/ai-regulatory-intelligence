import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import type { Database } from '@/types/supabase'
import { TransactionCreateSchema } from '@/lib/transactions/schema'
import {
  TransactionListQuerySchema,
  type TransactionListItem,
  listTransactions,
  transactionListColumns
} from '@/lib/transactions/queries'

type TransactionIngestResult = {
  transaction_id: string
  idempotent_replay: boolean
  jobs_enqueued: number
}

type TransactionIngestRpcArgs = Database['public']['Functions']['ingest_transaction']['Args']

export async function GET(request: Request) {
  const auth = await requireRoleContext([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])
  if ('response' in auth) return auth.response

  const { supabase, profile } = auth.data
  const url = new URL(request.url)
  const parsedQuery = TransactionListQuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    risk_level: url.searchParams.get('risk_level') ?? undefined
  })

  if (!parsedQuery.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.flatten())
  }

  const { data, error } = await listTransactions(supabase, profile.organization_id, parsedQuery.data)

  if (error) {
    return errorResponse(500, 'TRANSACTION_LIST_FAILED', 'Failed to load transactions')
  }

  const { limit, offset } = parsedQuery.data
  const hasMore = (data?.length ?? 0) === limit
  return successResponse(data ?? [], {
    meta: {
      limit,
      offset,
      has_more: hasMore,
      next_offset: hasMore ? offset + limit : null
    }
  })
}

export async function POST(request: Request) {
  const auth = await requireRoleContext(['admin', 'compliance_officer', 'analyst'])
  if ('response' in auth) return auth.response

  const { supabase, profile } = auth.data
  const idempotencyKey = request.headers.get('idempotency-key')?.trim()

  if (!idempotencyKey) {
    return errorResponse(
      400,
      'VALIDATION_ERROR',
      'Missing Idempotency-Key header for transaction ingestion'
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  const parsedBody = TransactionCreateSchema.safeParse(body)
  if (!parsedBody.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid request body', parsedBody.error.flatten())
  }

  const payload = parsedBody.data
  const rpcArgs: TransactionIngestRpcArgs = {
    p_idempotency_key: idempotencyKey,
    p_external_tx_id: payload.external_tx_id ?? undefined,
    p_from_account_id: payload.from_account_id ?? undefined,
    p_to_account_id: payload.to_account_id ?? undefined,
    p_amount: payload.amount,
    p_currency: payload.currency,
    p_transaction_type: payload.transaction_type,
    p_counterparty_country: payload.counterparty_country ?? undefined,
    p_counterparty_name: payload.counterparty_name ?? undefined
  }

  const { data: ingestResultRaw, error: ingestError } = await supabase
    .rpc('ingest_transaction', rpcArgs as never)
    .single()

  if (ingestError || !ingestResultRaw) {
    return errorResponse(500, 'TRANSACTION_CREATE_FAILED', 'Failed to ingest transaction')
  }

  const ingestResult = ingestResultRaw as TransactionIngestResult
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select(transactionListColumns)
    .eq('organization_id', profile.organization_id)
    .eq('id', ingestResult.transaction_id)
    .single()

  if (transactionError || !transaction) {
    return errorResponse(500, 'TRANSACTION_FETCH_FAILED', 'Transaction created but could not be reloaded')
  }

  return successResponse(transaction as TransactionListItem, {
    status: ingestResult.idempotent_replay ? 200 : 201,
    meta: {
      idempotent_replay: ingestResult.idempotent_replay,
      jobs_enqueued: ingestResult.jobs_enqueued
    }
  })
}
