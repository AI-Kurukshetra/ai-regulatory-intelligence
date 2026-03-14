import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { AlertListQuerySchema, listAlerts } from '@/lib/alerts/queries'

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
  const parsedQuery = AlertListQuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    severity: url.searchParams.get('severity') ?? undefined
  })

  if (!parsedQuery.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.flatten())
  }

  const { data, error } = await listAlerts(supabase, profile.organization_id, parsedQuery.data)

  if (error) {
    return errorResponse(500, 'ALERT_LIST_FAILED', 'Failed to load alerts')
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
