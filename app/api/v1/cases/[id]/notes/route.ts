import { z } from 'zod'
import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { CaseNoteCreateSchema } from '@/lib/cases/schema'
import { addCaseNoteRecord } from '@/lib/cases/service'

const ParamsSchema = z.object({
  id: z.string().uuid()
})

export async function POST(
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

  const parsedBody = CaseNoteCreateSchema.safeParse(body)
  if (!parsedBody.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid request body', parsedBody.error.flatten())
  }

  const result = await addCaseNoteRecord({
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

  return successResponse(result.data, { status: 201 })
}
