import { z } from 'zod'
import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { generateSarDraftForCase } from '@/lib/cases/service'

const ParamsSchema = z.object({
  id: z.string().uuid()
})

export async function POST(
  _request: Request,
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

  const result = await generateSarDraftForCase({
    actor: {
      id: profile.id,
      organization_id: profile.organization_id
    },
    caseId: parsedParams.data.id
  })

  if ('error' in result) {
    return errorResponse(result.error.status, result.error.code, result.error.message, result.error.details)
  }

  return successResponse(result.data, {
    meta: result.meta
  })
}
