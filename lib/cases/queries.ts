import type { CaseListQuery } from '@/lib/cases/schema'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

type DbClient = {
  from: typeof supabaseAdmin.from
}

type CaseRow = Database['public']['Tables']['cases']['Row']
type CaseNoteRow = Database['public']['Tables']['case_notes']['Row']
type AlertRow = Database['public']['Tables']['alerts']['Row']
type TransactionRow = Database['public']['Tables']['transactions']['Row']
type ReportRow = Database['public']['Tables']['reports']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

export const caseListColumns =
  'id, case_number, title, description, status, priority, created_by, assigned_to, created_at, updated_at'

export type CaseListItem = Pick<
  CaseRow,
  | 'id'
  | 'case_number'
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'created_by'
  | 'assigned_to'
  | 'created_at'
  | 'updated_at'
>

export type CaseSummary = {
  total: number
  open: number
  inProgress: number
  pendingSar: number
  closed: number
}

export type CaseNoteItem = Pick<CaseNoteRow, 'id' | 'note' | 'created_at' | 'author_user_id'> & {
  author: Pick<ProfileRow, 'id' | 'full_name' | 'role'> | null
}

export type CaseAlertItem = Pick<
  AlertRow,
  'id' | 'alert_type' | 'severity' | 'status' | 'title' | 'description' | 'transaction_id' | 'created_at'
>

export type CaseTransactionItem = Pick<
  TransactionRow,
  | 'id'
  | 'external_tx_id'
  | 'amount'
  | 'currency'
  | 'transaction_type'
  | 'status'
  | 'risk_score'
  | 'risk_level'
  | 'created_at'
>

export type CaseReportItem = Pick<
  ReportRow,
  'id' | 'report_type' | 'status' | 'narrative' | 'generated_by_model' | 'created_at' | 'updated_at'
>

export type CaseDetailItem = CaseListItem & {
  created_by_profile: Pick<ProfileRow, 'id' | 'full_name' | 'role'> | null
  assigned_to_profile: Pick<ProfileRow, 'id' | 'full_name' | 'role'> | null
  alerts: CaseAlertItem[]
  transactions: CaseTransactionItem[]
  notes: CaseNoteItem[]
  reports: CaseReportItem[]
}

async function countCases(
  supabase: DbClient,
  organizationId: string,
  filters: {
    status?: string
  } = {}
) {
  let statement = supabase
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (filters.status) {
    statement = statement.eq('status', filters.status)
  }

  const { count, error } = await statement

  return {
    count: count ?? 0,
    error
  }
}

async function loadProfilesById(
  supabase: DbClient,
  organizationId: string,
  ids: string[]
) {
  if (ids.length === 0) {
    return {
      data: new Map<string, Pick<ProfileRow, 'id' | 'full_name' | 'role'>>(),
      error: null
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('organization_id', organizationId)
    .in('id', ids)

  return {
    data: new Map(
      (((data ?? []) as Pick<ProfileRow, 'id' | 'full_name' | 'role'>[]).map((profile) => [
        profile.id,
        profile
      ]))
    ),
    error
  }
}

export async function listCases(
  supabase: DbClient,
  organizationId: string,
  query: CaseListQuery
) {
  let statement = supabase
    .from('cases')
    .select(caseListColumns)
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)

  if (query.status) {
    statement = statement.eq('status', query.status)
  }

  if (query.priority) {
    statement = statement.eq('priority', query.priority)
  }

  const { data, error } = await statement

  return {
    data: (data ?? []) as CaseListItem[],
    error
  }
}

export async function getCaseSummary(supabase: DbClient, organizationId: string) {
  const [total, open, inProgress, pendingSar, closed] = await Promise.all([
    countCases(supabase, organizationId),
    countCases(supabase, organizationId, { status: 'open' }),
    countCases(supabase, organizationId, { status: 'in_progress' }),
    countCases(supabase, organizationId, { status: 'pending_sar' }),
    countCases(supabase, organizationId, { status: 'closed' })
  ])

  return {
    data: {
      total: total.count,
      open: open.count,
      inProgress: inProgress.count,
      pendingSar: pendingSar.count,
      closed: closed.count
    } satisfies CaseSummary,
    error: total.error ?? open.error ?? inProgress.error ?? pendingSar.error ?? closed.error ?? null
  }
}

export async function getCaseDetail(
  supabase: DbClient,
  organizationId: string,
  caseId: string
) {
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select(caseListColumns)
    .eq('organization_id', organizationId)
    .eq('id', caseId)
    .maybeSingle()

  if (caseError || !caseData) {
    return {
      data: (caseData as CaseDetailItem | null) ?? null,
      error: caseError
    }
  }

  const { data: caseAlertLinks, error: caseAlertError } = await supabase
    .from('case_alerts')
    .select('alert_id')
    .eq('case_id', caseId)

  const alertIds = ((caseAlertLinks ?? []) as { alert_id: string }[]).map((link) => link.alert_id)

  const { data: alerts, error: alertsError } =
    alertIds.length > 0
      ? await supabase
          .from('alerts')
          .select('id, alert_type, severity, status, title, description, transaction_id, created_at')
          .eq('organization_id', organizationId)
          .in('id', alertIds)
          .order('created_at', { ascending: false })
      : { data: [] as CaseAlertItem[], error: null }

  const transactionIds = ((alerts ?? []) as CaseAlertItem[])
    .map((alert) => alert.transaction_id)
    .filter((transactionId): transactionId is string => Boolean(transactionId))

  const { data: transactions, error: transactionsError } =
    transactionIds.length > 0
      ? await supabase
          .from('transactions')
          .select(
            'id, external_tx_id, amount, currency, transaction_type, status, risk_score, risk_level, created_at'
          )
          .eq('organization_id', organizationId)
          .in('id', transactionIds)
          .order('created_at', { ascending: false })
      : { data: [] as CaseTransactionItem[], error: null }

  const { data: notes, error: notesError } = await supabase
    .from('case_notes')
    .select('id, note, created_at, author_user_id')
    .eq('organization_id', organizationId)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('id, report_type, status, narrative, generated_by_model, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('case_id', caseId)
    .order('updated_at', { ascending: false })

  const profileIds = [
    caseData.created_by,
    caseData.assigned_to,
    ...((notes ?? []) as Pick<CaseNoteRow, 'author_user_id'>[]).map((note) => note.author_user_id)
  ].filter((profileId): profileId is string => Boolean(profileId))

  const { data: profiles, error: profilesError } = await loadProfilesById(
    supabase,
    organizationId,
    [...new Set(profileIds)]
  )

  const caseDetail: CaseDetailItem = {
    ...(caseData as CaseListItem),
    created_by_profile: caseData.created_by ? profiles.get(caseData.created_by) ?? null : null,
    assigned_to_profile: caseData.assigned_to ? profiles.get(caseData.assigned_to) ?? null : null,
    alerts: (alerts ?? []) as CaseAlertItem[],
    transactions: (transactions ?? []) as CaseTransactionItem[],
    notes: ((notes ?? []) as Pick<CaseNoteRow, 'id' | 'note' | 'created_at' | 'author_user_id'>[]).map(
      (note) => ({
        ...note,
        author: profiles.get(note.author_user_id) ?? null
      })
    ),
    reports: (reports ?? []) as CaseReportItem[]
  }

  return {
    data: caseDetail,
    error:
      caseAlertError ??
      alertsError ??
      transactionsError ??
      notesError ??
      reportsError ??
      profilesError ??
      null
  }
}
