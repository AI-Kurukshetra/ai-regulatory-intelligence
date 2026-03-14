declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

type JobType = 'score_transaction' | 'screen_sanctions'

type RequestBody = {
  app_url?: unknown
  job_secret?: unknown
  job_type?: unknown
  job_types?: unknown
  limit?: unknown
}

type JobDispatchResult = {
  job_type: JobType
  ok: boolean
  status: number
  payload?: unknown
  error?: string
}

const ALLOWED_JOB_TYPES = new Set<JobType>(['score_transaction', 'screen_sanctions'])
const DEFAULT_JOB_TYPES: JobType[] = ['score_transaction', 'screen_sanctions']
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeLimit(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT
  }

  return Math.min(MAX_LIMIT, Math.trunc(parsed))
}

function resolveJobTypes(body: RequestBody) {
  const rawValues = Array.isArray(body.job_types)
    ? body.job_types
    : body.job_type !== undefined
      ? [body.job_type]
      : DEFAULT_JOB_TYPES

  const jobTypes: JobType[] = []

  for (const rawValue of rawValues) {
    const value = normalizeString(rawValue)

    if (!ALLOWED_JOB_TYPES.has(value as JobType)) {
      return {
        error: `Unsupported job type: ${value || 'unknown'}`
      }
    }

    if (!jobTypes.includes(value as JobType)) {
      jobTypes.push(value as JobType)
    }
  }

  if (jobTypes.length === 0) {
    return {
      error: 'At least one job type is required'
    }
  }

  return {
    data: jobTypes
  }
}

function resolveAppUrl(body: RequestBody) {
  const rawValue =
    normalizeString(body.app_url) ||
    normalizeString(Deno.env.get('APP_URL')) ||
    normalizeString(Deno.env.get('NEXT_PUBLIC_APP_URL'))

  if (!rawValue) {
    return null
  }

  try {
    const url = new URL(rawValue)
    return url.toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

function resolveJobSecret(body: RequestBody) {
  return normalizeString(body.job_secret) || normalizeString(Deno.env.get('JOB_RUNNER_SECRET')) || null
}

async function dispatchJobType(
  appUrl: string,
  jobSecret: string,
  jobType: JobType,
  limit: number
): Promise<JobDispatchResult> {
  const response = await fetch(`${appUrl}/api/internal/jobs/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-job-secret': jobSecret
    },
    body: JSON.stringify({
      job_type: jobType,
      limit
    })
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  return {
    job_type: jobType,
    ok: response.ok,
    status: response.status,
    payload
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Use POST to trigger queued Phase 2 jobs'
      }
    })
  }

  let body: RequestBody = {}
  try {
    body = (await request.json()) as RequestBody
  } catch {
    body = {}
  }

  const resolvedJobTypes = resolveJobTypes(body)
  if ('error' in resolvedJobTypes) {
    return jsonResponse(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: resolvedJobTypes.error
      }
    })
  }

  const appUrl = resolveAppUrl(body)
  if (!appUrl) {
    return jsonResponse(400, {
      error: {
        code: 'APP_URL_REQUIRED',
        message: 'Provide app_url or configure APP_URL/NEXT_PUBLIC_APP_URL for the function'
      }
    })
  }

  const jobSecret = resolveJobSecret(body)
  if (!jobSecret) {
    return jsonResponse(400, {
      error: {
        code: 'JOB_SECRET_REQUIRED',
        message: 'Provide job_secret or configure JOB_RUNNER_SECRET for the function'
      }
    })
  }

  const limit = normalizeLimit(body.limit)
  const results: JobDispatchResult[] = []

  for (const jobType of resolvedJobTypes.data) {
    try {
      results.push(await dispatchJobType(appUrl, jobSecret, jobType, limit))
    } catch (error) {
      results.push({
        job_type: jobType,
        ok: false,
        status: 502,
        error: error instanceof Error ? error.message : 'Job dispatch failed'
      })
    }
  }

  const failedJobs = results.filter((result) => !result.ok).length

  return jsonResponse(failedJobs === 0 ? 200 : 502, {
    data: {
      job_types: resolvedJobTypes.data,
      limit,
      failed_jobs: failedJobs,
      results
    }
  })
})
