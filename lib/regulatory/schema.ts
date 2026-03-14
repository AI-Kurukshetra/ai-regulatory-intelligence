import { z } from 'zod'

function normalizeOptionalIsoDate(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return undefined
  }

  const parsedDate = new Date(trimmedValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return '__invalid_date__'
  }

  return parsedDate.toISOString()
}

function normalizeOptionalUrl(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function normalizeOptionalBoolean(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase()

    if (normalizedValue === 'true') {
      return true
    }

    if (normalizedValue === 'false') {
      return false
    }
  }

  return value
}

export const RegulatoryDocumentTypeSchema = z.enum([
  'rule',
  'guidance',
  'enforcement',
  'notice',
  'policy',
  'other'
])

export const RegulatoryImpactLevelSchema = z.enum(['critical', 'high', 'medium', 'low'])

export const RegulatoryAnalysisStatusSchema = z.enum(['pending', 'completed', 'fallback', 'failed'])

export const RegulatoryDocumentCreateSchema = z.object({
  title: z.string().trim().min(5).max(240),
  source: z.string().trim().min(2).max(160),
  source_url: z.preprocess(normalizeOptionalUrl, z.string().url().max(500).optional()),
  jurisdiction: z.string().trim().min(2).max(80).default('US'),
  document_type: RegulatoryDocumentTypeSchema.default('guidance'),
  published_at: z.preprocess(normalizeOptionalIsoDate, z.string().datetime({ offset: true }).optional()),
  effective_at: z.preprocess(normalizeOptionalIsoDate, z.string().datetime({ offset: true }).optional()),
  content: z.string().trim().min(80).max(50000)
})

export const RegulatoryDocumentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().max(120).optional(),
  impact_level: RegulatoryImpactLevelSchema.optional(),
  document_type: RegulatoryDocumentTypeSchema.optional(),
  requires_attention: z.preprocess(normalizeOptionalBoolean, z.boolean().optional())
})

export const RegulatoryDocumentIdParamsSchema = z.object({
  id: z.string().uuid()
})

export type RegulatoryDocumentCreateInput = z.infer<typeof RegulatoryDocumentCreateSchema>
export type RegulatoryDocumentListQuery = z.infer<typeof RegulatoryDocumentListQuerySchema>
export type RegulatoryImpactLevel = z.infer<typeof RegulatoryImpactLevelSchema>
export type RegulatoryDocumentType = z.infer<typeof RegulatoryDocumentTypeSchema>
