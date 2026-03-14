import { z } from 'zod'

export const ReportStatusSchema = z.enum(['draft', 'review', 'approved', 'submitted', 'rejected'])

export const ReportListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: ReportStatusSchema.optional()
})

export type ReportStatus = z.infer<typeof ReportStatusSchema>
export type ReportListQuery = z.infer<typeof ReportListQuerySchema>
