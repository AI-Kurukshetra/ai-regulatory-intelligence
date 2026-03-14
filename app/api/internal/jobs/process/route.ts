import { errorResponse, successResponse } from '@/lib/api/response'
import { JobRunnerRequestSchema } from '@/lib/jobs/schema'
import { processQueuedSanctionsScreeningJobs } from '@/lib/jobs/screen-sanctions'
import { processQueuedScoreTransactionJobs } from '@/lib/jobs/score-transactions'

function getRunnerToken(request: Request) {
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  return bearerToken || request.headers.get('x-job-secret')?.trim() || ''
}

export async function POST(request: Request) {
  const configuredSecret = process.env.JOB_RUNNER_SECRET?.trim()

  if (!configuredSecret) {
    return errorResponse(
      503,
      'JOB_RUNNER_NOT_CONFIGURED',
      'Set JOB_RUNNER_SECRET before using the internal job processor'
    )
  }

  if (getRunnerToken(request) !== configuredSecret) {
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid internal job runner secret')
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsedBody = JobRunnerRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid job runner payload', parsedBody.error.flatten())
  }

  try {
    const summary =
      parsedBody.data.job_type === 'screen_sanctions'
        ? await processQueuedSanctionsScreeningJobs(parsedBody.data.limit)
        : await processQueuedScoreTransactionJobs(parsedBody.data.limit)

    return successResponse(summary)
  } catch (error) {
    return errorResponse(
      500,
      'JOB_PROCESSING_FAILED',
      error instanceof Error ? error.message : 'Job processing failed'
    )
  }
}
