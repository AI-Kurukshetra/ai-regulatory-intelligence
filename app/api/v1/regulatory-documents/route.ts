import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import {
  RegulatoryDocumentCreateSchema,
  RegulatoryDocumentListQuerySchema
} from '@/lib/regulatory/schema'
import { getRegulatorySummary, listRegulatoryDocuments } from '@/lib/regulatory/queries'
import { createRegulatoryDocument } from '@/lib/regulatory/service'

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
  const parsedQuery = RegulatoryDocumentListQuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
    impact_level: url.searchParams.get('impact_level') ?? undefined,
    document_type: url.searchParams.get('document_type') ?? undefined,
    requires_attention: url.searchParams.get('requires_attention') ?? undefined
  })

  if (!parsedQuery.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid query parameters', parsedQuery.error.flatten())
  }

  const [{ data: documents, error: documentsError }, { data: summary, error: summaryError }] =
    await Promise.all([
      listRegulatoryDocuments(supabase, profile.organization_id, parsedQuery.data),
      getRegulatorySummary(supabase, profile.organization_id)
    ])

  if (documentsError) {
    return errorResponse(500, 'REGULATORY_DOCUMENT_LIST_FAILED', 'Failed to load regulatory documents')
  }

  const { limit, offset } = parsedQuery.data
  const hasMore = (documents?.length ?? 0) === limit

  return successResponse(documents ?? [], {
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

  const parsedBody = RegulatoryDocumentCreateSchema.safeParse(body)

  if (!parsedBody.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid request body', parsedBody.error.flatten())
  }

  const result = await createRegulatoryDocument({
    actor: {
      id: profile.id,
      organization_id: profile.organization_id
    },
    payload: parsedBody.data
  })

  if ('error' in result) {
    return errorResponse(result.error.status, result.error.code, result.error.message, result.error.details)
  }

  return successResponse(result.data, {
    status: 201,
    meta: result.meta
  })
}
