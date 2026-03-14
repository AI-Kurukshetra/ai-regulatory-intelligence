import { z } from 'zod'

export const CasePrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])
export const CaseStatusSchema = z.enum([
  'open',
  'in_progress',
  'pending_sar',
  'sar_filed',
  'closed'
])

export const CaseCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  priority: CasePrioritySchema.default('medium'),
  description: z.string().trim().min(3).max(4000).optional(),
  alert_ids: z.array(z.string().uuid()).min(1).max(25),
  assigned_to: z.string().uuid().optional(),
  initial_note: z.string().trim().min(3).max(4000).optional()
})

export const CaseUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    priority: CasePrioritySchema.optional(),
    description: z.string().trim().min(3).max(4000).nullable().optional(),
    status: CaseStatusSchema.optional(),
    assigned_to: z.union([z.string().uuid(), z.literal(null)]).optional()
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.priority !== undefined ||
      value.description !== undefined ||
      value.status !== undefined ||
      value.assigned_to !== undefined,
    {
      message: 'At least one field must be provided'
    }
  )

export const CaseNoteCreateSchema = z.object({
  note: z.string().trim().min(3).max(4000)
})

export const CaseListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: CaseStatusSchema.optional(),
  priority: CasePrioritySchema.optional()
})

export type CasePriority = z.infer<typeof CasePrioritySchema>
export type CaseStatus = z.infer<typeof CaseStatusSchema>
export type CaseCreateInput = z.infer<typeof CaseCreateSchema>
export type CaseUpdateInput = z.infer<typeof CaseUpdateSchema>
export type CaseNoteCreateInput = z.infer<typeof CaseNoteCreateSchema>
export type CaseListQuery = z.infer<typeof CaseListQuerySchema>
