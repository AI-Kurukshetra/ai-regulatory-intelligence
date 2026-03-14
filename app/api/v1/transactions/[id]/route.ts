import { z } from 'zod'
import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { getTransactionDetail } from '@/lib/transactions/queries'

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
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid transaction id')
  }

  const { data, error } = await getTransactionDetail(
    supabase,
    profile.organization_id,
    parsedParams.data.id
  )

  if (error) {
    return errorResponse(500, 'TRANSACTION_FETCH_FAILED', 'Failed to fetch transaction')
  }

  if (!data) {
    return errorResponse(404, 'NOT_FOUND', 'Transaction not found')
  }

  return successResponse(data)
}
