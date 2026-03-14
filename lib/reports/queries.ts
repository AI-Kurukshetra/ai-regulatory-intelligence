import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ReportListQuery } from '@/lib/reports/schema'
import type { Database } from '@/types/supabase'

type DbClient = {
  from: typeof supabaseAdmin.from
}

type ReportRow = Database['public']['Tables']['reports']['Row']
type CaseRow = Database['public']['Tables']['cases']['Row']

export type ReportListItem = Pick<
  ReportRow,
  'id' | 'case_id' | 'report_type' | 'status' | 'narrative' | 'generated_by_model' | 'created_at' | 'updated_at'
> & {
  case: Pick<CaseRow, 'id' | 'case_number' | 'title' | 'status' | 'priority'> | null
}

export type ReportSummary = {
  total: number
  draft: number
  review: number
  submitted: number
}

async function countReports(
  supabase: DbClient,
  organizationId: string,
  filters: {
    status?: string
  } = {}
) {
  let statement = supabase
    .from('reports')
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

export async function listReports(
  supabase: DbClient,
  organizationId: string,
  query: ReportListQuery
) {
  let statement = supabase
    .from('reports')
    .select('id, case_id, report_type, status, narrative, generated_by_model, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)

  if (query.status) {
    statement = statement.eq('status', query.status)
  }

  const { data: reports, error } = await statement

  if (error || !reports) {
    return {
      data: [] as ReportListItem[],
      error
    }
  }

  const caseIds = reports
    .map((report) => report.case_id)
    .filter((caseId): caseId is string => Boolean(caseId))

  const { data: cases, error: casesError } =
    caseIds.length > 0
      ? await supabase
          .from('cases')
          .select('id, case_number, title, status, priority')
          .eq('organization_id', organizationId)
          .in('id', caseIds)
      : { data: [] as Pick<CaseRow, 'id' | 'case_number' | 'title' | 'status' | 'priority'>[], error: null }

  const caseMap = new Map(
    (((cases ?? []) as Pick<CaseRow, 'id' | 'case_number' | 'title' | 'status' | 'priority'>[]).map((caseItem) => [
      caseItem.id,
      caseItem
    ]))
  )

  return {
    data: (reports as Pick<
      ReportRow,
      | 'id'
      | 'case_id'
      | 'report_type'
      | 'status'
      | 'narrative'
      | 'generated_by_model'
      | 'created_at'
      | 'updated_at'
    >[]).map((report) => ({
      ...report,
      case: report.case_id ? caseMap.get(report.case_id) ?? null : null
    })),
    error: casesError
  }
}

export async function getReportSummary(supabase: DbClient, organizationId: string) {
  const [total, draft, review, submitted] = await Promise.all([
    countReports(supabase, organizationId),
    countReports(supabase, organizationId, { status: 'draft' }),
    countReports(supabase, organizationId, { status: 'review' }),
    countReports(supabase, organizationId, { status: 'submitted' })
  ])

  return {
    data: {
      total: total.count,
      draft: draft.count,
      review: review.count,
      submitted: submitted.count
    } satisfies ReportSummary,
    error: total.error ?? draft.error ?? review.error ?? submitted.error ?? null
  }
}

export async function getReportDetail(
  supabase: DbClient,
  organizationId: string,
  reportId: string
) {
  const { data: report, error } = await supabase
    .from('reports')
    .select('id, case_id, report_type, status, narrative, generated_by_model, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('id', reportId)
    .maybeSingle()

  if (error || !report) {
    return {
      data: (report as ReportListItem | null) ?? null,
      error
    }
  }

  const { data: caseData, error: caseError } = report.case_id
    ? await supabase
        .from('cases')
        .select('id, case_number, title, status, priority')
        .eq('organization_id', organizationId)
        .eq('id', report.case_id)
        .maybeSingle()
    : { data: null, error: null }

  return {
    data: {
      ...(report as Omit<ReportListItem, 'case'>),
      case: (caseData as Pick<CaseRow, 'id' | 'case_number' | 'title' | 'status' | 'priority'> | null) ?? null
    } satisfies ReportListItem,
    error: error ?? caseError
  }
}
