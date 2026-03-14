import { z } from 'zod'
import { errorResponse, successResponse } from '@/lib/api/response'
import { requireRoleContext } from '@/lib/auth/context'
import { getReportDetail } from '@/lib/reports/queries'

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
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid report id')
  }

  const { data, error } = await getReportDetail(supabase, profile.organization_id, parsedParams.data.id)

  if (error) {
    return errorResponse(500, 'REPORT_FETCH_FAILED', 'Failed to fetch report detail')
  }

  if (!data) {
    return errorResponse(404, 'NOT_FOUND', 'Report not found')
  }

  return successResponse(data)
}
