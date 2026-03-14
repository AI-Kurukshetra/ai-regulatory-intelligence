import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

type DbClient = {
  from: typeof supabaseAdmin.from
}

type AlertRow = Database['public']['Tables']['alerts']['Row']

export const alertListColumns =
  'id, alert_type, severity, status, title, description, transaction_id, created_at, updated_at'

export const AlertListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.string().min(1).max(40).optional(),
  severity: z.string().min(1).max(20).optional()
})

export type AlertListQuery = z.infer<typeof AlertListQuerySchema>

export type AlertListItem = Pick<
  AlertRow,
  | 'id'
  | 'alert_type'
  | 'severity'
  | 'status'
  | 'title'
  | 'description'
  | 'transaction_id'
  | 'created_at'
  | 'updated_at'
>

export type AlertSummary = {
  total: number
  newCount: number
  inReview: number
  critical: number
}

async function countAlerts(
  supabase: DbClient,
  organizationId: string,
  filters: {
    status?: string
    severity?: string
  } = {}
) {
  let statement = supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (filters.status) {
    statement = statement.eq('status', filters.status)
  }

  if (filters.severity) {
    statement = statement.eq('severity', filters.severity)
  }

  const { count, error } = await statement

  return {
    count: count ?? 0,
    error
  }
}

export async function listAlerts(
  supabase: DbClient,
  organizationId: string,
  query: AlertListQuery
) {
  let statement = supabase
    .from('alerts')
    .select(alertListColumns)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)

  if (query.status) {
    statement = statement.eq('status', query.status)
  }

  if (query.severity) {
    statement = statement.eq('severity', query.severity)
  }

  const { data, error } = await statement

  return {
    data: (data ?? []) as AlertListItem[],
    error
  }
}

export async function getAlertSummary(supabase: DbClient, organizationId: string) {
  const [total, newCount, inReview, critical] = await Promise.all([
    countAlerts(supabase, organizationId),
    countAlerts(supabase, organizationId, { status: 'new' }),
    countAlerts(supabase, organizationId, { status: 'in_review' }),
    countAlerts(supabase, organizationId, { severity: 'critical' })
  ])

  return {
    data: {
      total: total.count,
      newCount: newCount.count,
      inReview: inReview.count,
      critical: critical.count
    } satisfies AlertSummary,
    error: total.error ?? newCount.error ?? inReview.error ?? critical.error ?? null
  }
}
