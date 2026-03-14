import { supabaseAdmin } from '@/lib/supabase/admin'
import type { RegulatoryDocumentListQuery } from '@/lib/regulatory/schema'
import type { Database, Json } from '@/types/supabase'

type DbClient = {
  from: typeof supabaseAdmin.from
}

type RegulatoryDocumentRow = Database['public']['Tables']['regulatory_documents']['Row']

export type RegulatoryDocumentListItem = Pick<
  RegulatoryDocumentRow,
  | 'id'
  | 'title'
  | 'source'
  | 'source_url'
  | 'jurisdiction'
  | 'document_type'
  | 'summary'
  | 'impact_level'
  | 'requires_attention'
  | 'attention_reason'
  | 'analysis_status'
  | 'analysis_model'
  | 'published_at'
  | 'effective_at'
  | 'analyzed_at'
  | 'created_at'
  | 'updated_at'
> & {
  tags: string[]
}

export type RegulatoryDocumentDetail = RegulatoryDocumentListItem & {
  content: string
  change_type: string | null
  key_points: string[]
  affected_areas: string[]
  action_items: string[]
}

export type RegulatorySummary = {
  total: number
  attentionRequired: number
  highImpact: number
  critical: number
  fallback: number
}

function toStringArray(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function sanitizeSearchTerm(value: string) {
  return value.replace(/[%_,]/g, ' ').trim()
}

async function countDocuments(
  supabase: DbClient,
  organizationId: string,
  filters: {
    requires_attention?: boolean
    impact_levels?: string[]
    analysis_status?: string
  } = {}
) {
  let statement = supabase
    .from('regulatory_documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (filters.requires_attention !== undefined) {
    statement = statement.eq('requires_attention', filters.requires_attention)
  }

  if (filters.analysis_status) {
    statement = statement.eq('analysis_status', filters.analysis_status)
  }

  if (filters.impact_levels && filters.impact_levels.length > 0) {
    statement = statement.in('impact_level', filters.impact_levels)
  }

  const { count, error } = await statement

  return {
    count: count ?? 0,
    error
  }
}

export async function listRegulatoryDocuments(
  supabase: DbClient,
  organizationId: string,
  query: RegulatoryDocumentListQuery
) {
  let statement = supabase
    .from('regulatory_documents')
    .select(
      'id, title, source, source_url, jurisdiction, document_type, summary, impact_level, requires_attention, attention_reason, analysis_status, analysis_model, published_at, effective_at, analyzed_at, created_at, updated_at, tags'
    )
    .eq('organization_id', organizationId)
    .order('analyzed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)

  if (query.impact_level) {
    statement = statement.eq('impact_level', query.impact_level)
  }

  if (query.document_type) {
    statement = statement.eq('document_type', query.document_type)
  }

  if (query.requires_attention !== undefined) {
    statement = statement.eq('requires_attention', query.requires_attention)
  }

  if (query.q) {
    const searchTerm = sanitizeSearchTerm(query.q)

    if (searchTerm) {
      statement = statement.or(
        `title.ilike.%${searchTerm}%,source.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
      )
    }
  }

  const { data, error } = await statement

  return {
    data: ((data ?? []) as Pick<
      RegulatoryDocumentRow,
      | 'id'
      | 'title'
      | 'source'
      | 'source_url'
      | 'jurisdiction'
      | 'document_type'
      | 'summary'
      | 'impact_level'
      | 'requires_attention'
      | 'attention_reason'
      | 'analysis_status'
      | 'analysis_model'
      | 'published_at'
      | 'effective_at'
      | 'analyzed_at'
      | 'created_at'
      | 'updated_at'
      | 'tags'
    >[]).map((document) => ({
      ...document,
      tags: toStringArray(document.tags)
    })),
    error
  }
}

export async function getRegulatorySummary(supabase: DbClient, organizationId: string) {
  const [total, attentionRequired, highImpact, critical, fallback] = await Promise.all([
    countDocuments(supabase, organizationId),
    countDocuments(supabase, organizationId, { requires_attention: true }),
    countDocuments(supabase, organizationId, { impact_levels: ['high', 'critical'] }),
    countDocuments(supabase, organizationId, { impact_levels: ['critical'] }),
    countDocuments(supabase, organizationId, { analysis_status: 'fallback' })
  ])

  return {
    data: {
      total: total.count,
      attentionRequired: attentionRequired.count,
      highImpact: highImpact.count,
      critical: critical.count,
      fallback: fallback.count
    } satisfies RegulatorySummary,
    error:
      total.error ??
      attentionRequired.error ??
      highImpact.error ??
      critical.error ??
      fallback.error ??
      null
  }
}

export async function getRegulatoryDocumentDetail(
  supabase: DbClient,
  organizationId: string,
  documentId: string
) {
  const { data, error } = await supabase
    .from('regulatory_documents')
    .select(
      'id, title, source, source_url, jurisdiction, document_type, content, summary, change_type, impact_level, key_points, affected_areas, action_items, tags, requires_attention, attention_reason, analysis_status, analysis_model, published_at, effective_at, analyzed_at, created_at, updated_at'
    )
    .eq('organization_id', organizationId)
    .eq('id', documentId)
    .maybeSingle()

  if (error || !data) {
    return {
      data: (data as RegulatoryDocumentDetail | null) ?? null,
      error
    }
  }

  const document = data as Pick<
    RegulatoryDocumentRow,
    | 'id'
    | 'title'
    | 'source'
    | 'source_url'
    | 'jurisdiction'
    | 'document_type'
    | 'content'
    | 'summary'
    | 'change_type'
    | 'impact_level'
    | 'key_points'
    | 'affected_areas'
    | 'action_items'
    | 'tags'
    | 'requires_attention'
    | 'attention_reason'
    | 'analysis_status'
    | 'analysis_model'
    | 'published_at'
    | 'effective_at'
    | 'analyzed_at'
    | 'created_at'
    | 'updated_at'
  >

  return {
    data: {
      ...document,
      key_points: toStringArray(document.key_points),
      affected_areas: toStringArray(document.affected_areas),
      action_items: toStringArray(document.action_items),
      tags: toStringArray(document.tags)
    } satisfies RegulatoryDocumentDetail,
    error: null
  }
}
