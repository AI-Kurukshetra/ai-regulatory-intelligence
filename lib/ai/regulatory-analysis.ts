import { extractResponseText } from '@/lib/ai/risk-scoring'
import {
  RegulatoryDocumentTypeSchema,
  RegulatoryImpactLevelSchema,
  type RegulatoryDocumentType
} from '@/lib/regulatory/schema'
import { formatLabel } from '@/lib/utils/formatters'
import { z } from 'zod'

const RegulatoryAnalysisSchema = z.object({
  summary: z.string().trim().min(20).max(3000),
  change_type: z.string().trim().min(3).max(80),
  impact_level: RegulatoryImpactLevelSchema,
  key_points: z.array(z.string().trim().min(5).max(240)).min(1).max(6),
  affected_areas: z.array(z.string().trim().min(3).max(120)).min(1).max(6),
  action_items: z.array(z.string().trim().min(5).max(240)).min(1).max(6),
  requires_attention: z.boolean(),
  attention_reason: z.string().trim().min(5).max(240).nullable(),
  tags: z.array(z.string().trim().min(2).max(40)).min(1).max(8)
})

export type RegulatoryAnalysis = z.infer<typeof RegulatoryAnalysisSchema>

type RegulatoryAnalysisInput = {
  title: string
  source: string
  jurisdiction: string
  document_type: RegulatoryDocumentType
  content: string
  published_at?: string | null
  effective_at?: string | null
}

type RegulatoryAnalysisResult = {
  analysis: RegulatoryAnalysis
  model: string
  usedFallback: boolean
}

const areaDetectors: Array<{ label: string; keywords: string[] }> = [
  { label: 'Transaction monitoring', keywords: ['monitoring', 'transaction', 'surveillance', 'structuring'] },
  { label: 'Sanctions screening', keywords: ['sanctions', 'ofac', 'watchlist', 'blocked persons'] },
  { label: 'KYC and onboarding', keywords: ['kyc', 'customer due diligence', 'beneficial ownership', 'onboarding'] },
  { label: 'Regulatory reporting', keywords: ['sar', 'ctr', 'reporting', 'filing', 'suspicious activity report'] },
  { label: 'Governance and controls', keywords: ['board', 'governance', 'control', 'policy', 'oversight'] },
  { label: 'Data retention', keywords: ['recordkeeping', 'retention', 'records', 'documentation'] }
]

function getModelName() {
  return process.env.OPENAI_MODEL_REGULATORY_ANALYSIS?.trim() || process.env.OPENAI_MODEL_RISK_SCORING?.trim() || 'gpt-5-mini'
}

function clipText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}...`
}

function toSentenceList(content: string) {
  return content
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
}

function uniqueList(values: string[]) {
  return [...new Set(values)]
}

function detectAffectedAreas(content: string) {
  const normalizedContent = content.toLowerCase()
  const areas = areaDetectors
    .filter((area) => area.keywords.some((keyword) => normalizedContent.includes(keyword)))
    .map((area) => area.label)

  return uniqueList(areas).slice(0, 6)
}

function detectImpactLevel(content: string, documentType: RegulatoryDocumentType) {
  const normalizedContent = content.toLowerCase()
  const criticalSignals = ['effective immediately', 'civil money penalty', 'enforcement action', 'consent order']
  const highSignals = ['must', 'shall', 'required', 'deadline', 'suspicious activity report', 'sanctions']

  const criticalCount = criticalSignals.filter((keyword) => normalizedContent.includes(keyword)).length
  const highCount = highSignals.filter((keyword) => normalizedContent.includes(keyword)).length

  if (documentType === 'enforcement' || criticalCount >= 1 || highCount >= 4) {
    return 'critical'
  }

  if (documentType === 'rule' || highCount >= 2) {
    return 'high'
  }

  if (documentType === 'guidance' || highCount >= 1) {
    return 'medium'
  }

  return 'low'
}

function detectChangeType(documentType: RegulatoryDocumentType, content: string) {
  const normalizedContent = content.toLowerCase()

  if (documentType === 'enforcement') {
    return 'Enforcement action'
  }

  if (normalizedContent.includes('proposed rule') || normalizedContent.includes('final rule')) {
    return 'Rule update'
  }

  if (normalizedContent.includes('guidance') || documentType === 'guidance') {
    return 'Supervisory guidance'
  }

  if (normalizedContent.includes('notice') || documentType === 'notice') {
    return 'Regulatory notice'
  }

  if (documentType === 'policy') {
    return 'Policy update'
  }

  return `${formatLabel(documentType)} update`
}

function buildActionItems(areas: string[], impactLevel: z.infer<typeof RegulatoryImpactLevelSchema>, input: RegulatoryAnalysisInput) {
  const actions: string[] = []

  if (areas.includes('Transaction monitoring')) {
    actions.push('Review monitoring scenarios and thresholds affected by this update.')
  }

  if (areas.includes('Sanctions screening')) {
    actions.push('Validate sanctions-screening rules, watchlists, and escalation paths.')
  }

  if (areas.includes('KYC and onboarding')) {
    actions.push('Update onboarding and due-diligence checklists to reflect the new expectations.')
  }

  if (areas.includes('Regulatory reporting')) {
    actions.push('Confirm reporting playbooks and filing guidance align with the new requirement.')
  }

  if (areas.includes('Governance and controls')) {
    actions.push('Brief compliance leadership and update policy or control ownership as needed.')
  }

  if (input.effective_at) {
    actions.push(`Prepare implementation steps before the stated effective date of ${input.effective_at.slice(0, 10)}.`)
  }

  if (impactLevel === 'critical' || impactLevel === 'high') {
    actions.push('Escalate this update for human review and operating-impact assessment.')
  }

  if (actions.length === 0) {
    actions.push('Review the update and capture any required policy, workflow, or control changes.')
  }

  return uniqueList(actions).slice(0, 6)
}

function buildFallbackAnalysis(input: RegulatoryAnalysisInput): RegulatoryAnalysis {
  const sentences = toSentenceList(input.content)
  const affectedAreas = detectAffectedAreas(input.content)
  const impactLevel = detectImpactLevel(input.content, input.document_type)
  const changeType = detectChangeType(input.document_type, input.content)
  const keyPoints = sentences.slice(0, 4)
  const summary =
    sentences.slice(0, 2).join(' ') ||
    clipText(input.content.replace(/\s+/g, ' '), 280)
  const actionItems = buildActionItems(affectedAreas, impactLevel, input)
  const requiresAttention = impactLevel === 'critical' || impactLevel === 'high'

  return RegulatoryAnalysisSchema.parse({
    summary,
    change_type: changeType,
    impact_level: impactLevel,
    key_points: keyPoints.length > 0 ? keyPoints : [`Review the update titled "${input.title}" from ${input.source}.`],
    affected_areas:
      affectedAreas.length > 0 ? affectedAreas : ['Compliance operations'],
    action_items: actionItems,
    requires_attention: requiresAttention,
    attention_reason: requiresAttention
      ? 'The update appears to change obligations or create near-term compliance impact.'
      : null,
    tags: uniqueList([
      input.jurisdiction,
      formatLabel(input.document_type),
      ...affectedAreas.map((area) => area.toLowerCase())
    ]).slice(0, 8)
  })
}

function parseAnalysisResponse(value: string) {
  const parsed = JSON.parse(value) as unknown
  return RegulatoryAnalysisSchema.parse(parsed)
}

function buildPrompt(input: RegulatoryAnalysisInput) {
  return [
    'You are a senior regulatory intelligence analyst for an AML compliance platform.',
    'Summarize the document, identify operational impact, and return strict JSON only.',
    'Do not invent requirements that are not clearly supported by the supplied content.',
    'Set requires_attention to true when the document creates material policy, process, control, reporting, sanctions, or KYC impact.',
    `Metadata:\n${JSON.stringify(
      {
        title: input.title,
        source: input.source,
        jurisdiction: input.jurisdiction,
        document_type: input.document_type,
        published_at: input.published_at,
        effective_at: input.effective_at
      },
      null,
      2
    )}`,
    `Document content:\n${clipText(input.content, 14000)}`
  ].join('\n\n')
}

export async function analyzeRegulatoryDocument(
  input: RegulatoryAnalysisInput
): Promise<RegulatoryAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return {
      analysis: buildFallbackAnalysis(input),
      model: 'manual-fallback',
      usedFallback: true
    }
  }

  const model = getModelName()
  const requestBody = {
    model,
    temperature: 0.1,
    max_output_tokens: 1200,
    store: false,
    text: {
      format: {
        type: 'json_object'
      }
    },
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: [
              'You analyze regulatory documents for a compliance operations team.',
              'Return only valid JSON.',
              'Output keys must be: summary, change_type, impact_level, key_points, affected_areas, action_items, requires_attention, attention_reason, tags.',
              `impact_level must be one of ${RegulatoryImpactLevelSchema.options.join(', ')}.`,
              `document_type values map to ${RegulatoryDocumentTypeSchema.options.join(', ')}.`
            ].join(' ')
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: buildPrompt(input)
          }
        ]
      }
    ]
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    const responseJson = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      throw new Error(
        typeof responseJson?.error === 'object' &&
          responseJson.error &&
          'message' in responseJson.error &&
          typeof responseJson.error.message === 'string'
          ? responseJson.error.message
          : `OpenAI request failed with status ${response.status}`
      )
    }

    const outputText = extractResponseText(responseJson)

    return {
      analysis: parseAnalysisResponse(outputText),
      model,
      usedFallback: false
    }
  } catch {
    return {
      analysis: buildFallbackAnalysis(input),
      model: 'manual-fallback',
      usedFallback: true
    }
  }
}
