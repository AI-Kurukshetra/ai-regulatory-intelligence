import { analyzeRegulatoryDocument } from '@/lib/ai/regulatory-analysis'
import { insertAuditLog } from '@/lib/audit/service'
import type { RegulatoryDocumentCreateInput } from '@/lib/regulatory/schema'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

type ProfileContext = {
  id: string
  organization_id: string
}

type RegulatoryDocumentRow = Database['public']['Tables']['regulatory_documents']['Row']
type RegulatoryDocumentInsert = Database['public']['Tables']['regulatory_documents']['Insert']

type ServiceError = {
  status: number
  code: string
  message: string
  details?: unknown
}

type ServiceResult<T> = { data: T; meta?: Record<string, unknown> } | { error: ServiceError }

function serviceError(
  status: number,
  code: string,
  message: string,
  details?: unknown
): ServiceResult<never> {
  return {
    error: {
      status,
      code,
      message,
      details
    }
  }
}

export async function createRegulatoryDocument(input: {
  actor: ProfileContext
  payload: RegulatoryDocumentCreateInput
}): Promise<ServiceResult<RegulatoryDocumentRow>> {
  const { actor, payload } = input

  const analysisResult = await analyzeRegulatoryDocument({
    title: payload.title,
    source: payload.source,
    jurisdiction: payload.jurisdiction,
    document_type: payload.document_type,
    content: payload.content,
    published_at: payload.published_at ?? null,
    effective_at: payload.effective_at ?? null
  })

  const regulatoryDocumentInsert: RegulatoryDocumentInsert = {
    organization_id: actor.organization_id,
    title: payload.title,
    source: payload.source,
    source_url: payload.source_url ?? null,
    jurisdiction: payload.jurisdiction,
    document_type: payload.document_type,
    content: payload.content,
    summary: analysisResult.analysis.summary,
    change_type: analysisResult.analysis.change_type,
    impact_level: analysisResult.analysis.impact_level,
    key_points: analysisResult.analysis.key_points,
    affected_areas: analysisResult.analysis.affected_areas,
    action_items: analysisResult.analysis.action_items,
    tags: analysisResult.analysis.tags,
    requires_attention: analysisResult.analysis.requires_attention,
    attention_reason: analysisResult.analysis.attention_reason,
    analysis_status: analysisResult.usedFallback ? 'fallback' : 'completed',
    analysis_model: analysisResult.model,
    published_at: payload.published_at ?? null,
    effective_at: payload.effective_at ?? null,
    analyzed_at: new Date().toISOString(),
    created_by: actor.id,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('regulatory_documents')
    .insert(regulatoryDocumentInsert as never)
    .select('*')
    .single()

  if (error || !data) {
    return serviceError(500, 'REGULATORY_DOCUMENT_CREATE_FAILED', 'Failed to create the regulatory document')
  }

  await insertAuditLog({
    organization_id: actor.organization_id,
    actor_user_id: actor.id,
    action: 'regulatory_document.created',
    entity_type: 'regulatory_document',
    entity_id: data.id,
    after_data: {
      document_type: data.document_type,
      impact_level: data.impact_level,
      requires_attention: data.requires_attention,
      analysis_status: data.analysis_status
    }
  })

  return {
    data: data as RegulatoryDocumentRow,
    meta: {
      used_fallback: analysisResult.usedFallback
    }
  }
}
