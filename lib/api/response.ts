import { NextResponse } from 'next/server'

type ErrorPayload = {
  code: string
  message: string
  details?: unknown
}

type SuccessOptions = {
  status?: number
  meta?: Record<string, unknown>
}

export function successResponse<T>(data: T, options?: SuccessOptions) {
  const body = options?.meta ? { data, meta: options.meta } : { data }
  return NextResponse.json(body, { status: options?.status ?? 200 })
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  const payload: { error: ErrorPayload } = {
    error: { code, message, details }
  }

  return NextResponse.json(payload, {
    status,
    headers: {
      'x-error-code': code
    }
  })
}
