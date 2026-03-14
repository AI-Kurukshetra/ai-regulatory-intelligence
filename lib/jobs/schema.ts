import { z } from 'zod'

const TransactionJobPayloadSchema = z.object({
  transaction_id: z.string().uuid()
})

export const ScoreTransactionJobPayloadSchema = TransactionJobPayloadSchema
export const ScreenSanctionsJobPayloadSchema = TransactionJobPayloadSchema

export const JobRunnerRequestSchema = z.object({
  job_type: z.enum(['score_transaction', 'screen_sanctions']).default('score_transaction'),
  limit: z.coerce.number().int().min(1).max(50).default(10)
})

export type ScoreTransactionJobPayload = z.infer<typeof ScoreTransactionJobPayloadSchema>
export type ScreenSanctionsJobPayload = z.infer<typeof ScreenSanctionsJobPayloadSchema>
export type JobRunnerRequest = z.infer<typeof JobRunnerRequestSchema>
