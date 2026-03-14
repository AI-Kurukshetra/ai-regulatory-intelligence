import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { listReports, getReportSummary } from '@/lib/reports/queries'
import { ReportListQuerySchema } from '@/lib/reports/schema'

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
  const parsedQuery = ReportListQuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    status: url.searchParams.get('status') ?? undefined
  })

  if (!parsedQuery.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.flatten())
  }

  const [{ data: reports, error: reportsError }, { data: summary, error: summaryError }] =
    await Promise.all([
      listReports(supabase, profile.organization_id, parsedQuery.data),
      getReportSummary(supabase, profile.organization_id)
    ])

  if (reportsError) {
    return errorResponse(500, 'REPORT_LIST_FAILED', 'Failed to load reports')
  }

  const { limit, offset } = parsedQuery.data
  const hasMore = (reports?.length ?? 0) === limit

  return successResponse(reports ?? [], {
    meta: {
      summary: summaryError ? null : summary,
      limit,
      offset,
      has_more: hasMore,
      next_offset: hasMore ? offset + limit : null
    }
  })
}
