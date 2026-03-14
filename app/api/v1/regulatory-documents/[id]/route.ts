import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { getRegulatoryDocumentDetail } from '@/lib/regulatory/queries'
import { RegulatoryDocumentIdParamsSchema } from '@/lib/regulatory/schema'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoleContext([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])
  if ('response' in auth) return auth.response

  const { supabase, profile } = auth.data
  const params = await context.params
  const parsedParams = RegulatoryDocumentIdParamsSchema.safeParse(params)

  if (!parsedParams.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid document id')
  }

  const { data, error } = await getRegulatoryDocumentDetail(
    supabase,
    profile.organization_id,
    parsedParams.data.id
  )

  if (error) {
    return errorResponse(500, 'REGULATORY_DOCUMENT_FETCH_FAILED', 'Failed to fetch regulatory document')
  }

  if (!data) {
    return errorResponse(404, 'NOT_FOUND', 'Regulatory document not found')
  }

  return successResponse(data)
}
