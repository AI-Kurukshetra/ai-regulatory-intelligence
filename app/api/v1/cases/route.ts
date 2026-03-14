import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { listCases, getCaseSummary } from '@/lib/cases/queries'
import { CaseCreateSchema, CaseListQuerySchema } from '@/lib/cases/schema'
import { createCaseFromAlerts } from '@/lib/cases/service'

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
  const parsedQuery = CaseListQuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    priority: url.searchParams.get('priority') ?? undefined
  })

  if (!parsedQuery.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.flatten())
  }

  const [{ data: cases, error: casesError }, { data: summary, error: summaryError }] = await Promise.all([
    listCases(supabase, profile.organization_id, parsedQuery.data),
    getCaseSummary(supabase, profile.organization_id)
  ])

  if (casesError) {
    return errorResponse(500, 'CASE_LIST_FAILED', 'Failed to load cases')
  }

  const { limit, offset } = parsedQuery.data
  const hasMore = (cases?.length ?? 0) === limit

  return successResponse(cases ?? [], {
    meta: {
      summary: summaryError ? null : summary,
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

  const { profile } = auth.data

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  const parsedBody = CaseCreateSchema.safeParse(body)
  if (!parsedBody.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid request body', parsedBody.error.flatten())
  }

  const result = await createCaseFromAlerts({
    actor: {
      id: profile.id,
      organization_id: profile.organization_id
    },
    payload: parsedBody.data
  })

  if ('error' in result) {
    return errorResponse(result.error.status, result.error.code, result.error.message, result.error.details)
  }

  return successResponse(result.data, { status: 201 })
}
