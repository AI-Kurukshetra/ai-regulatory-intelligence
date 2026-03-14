import { z } from 'zod'
import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { getCaseDetail } from '@/lib/cases/queries'
import { CaseUpdateSchema } from '@/lib/cases/schema'
import { updateCaseRecord } from '@/lib/cases/service'

const ParamsSchema = z.object({
  id: z.string().uuid()
})

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
  const parsedParams = ParamsSchema.safeParse(params)

  if (!parsedParams.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid case id')
  }

  const { data, error } = await getCaseDetail(supabase, profile.organization_id, parsedParams.data.id)

  if (error) {
    return errorResponse(500, 'CASE_FETCH_FAILED', 'Failed to fetch case detail')
  }

  if (!data) {
    return errorResponse(404, 'NOT_FOUND', 'Case not found')
  }

  return successResponse(data)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoleContext(['admin', 'compliance_officer', 'analyst'])
  if ('response' in auth) return auth.response

  const { profile } = auth.data
  const params = await context.params
  const parsedParams = ParamsSchema.safeParse(params)

  if (!parsedParams.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid case id')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  const parsedBody = CaseUpdateSchema.safeParse(body)
  if (!parsedBody.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid request body', parsedBody.error.flatten())
  }

  const result = await updateCaseRecord({
    actor: {
      id: profile.id,
      organization_id: profile.organization_id
    },
    caseId: parsedParams.data.id,
    payload: parsedBody.data
  })

  if ('error' in result) {
    return errorResponse(result.error.status, result.error.code, result.error.message, result.error.details)
  }

  return successResponse(result.data)
}
