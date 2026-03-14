import { z } from 'zod'
import type { RuleEngineResult } from '@/lib/rules/engine'
import type { Database } from '@/types/supabase'

type TransactionRow = Database['public']['Tables']['transactions']['Row']

const RiskLevelSchema = z.enum(['critical', 'high', 'medium', 'low', 'unknown'])
const AlertTypeSchema = z.enum(['threshold_breach', 'velocity', 'geo_anomaly', 'unusual_pattern'])

const AIRiskFactorSchema = z.object({
  factor: z.string().min(1),
  weight: z.number().min(0).max(1),
  detail: z.string().min(1)
})

export const AIRiskAssessmentSchema = z.object({
  score: z.number().int().min(0).max(100),
  level: RiskLevelSchema,
  summary: z.string().min(1),
  requires_manual_review: z.boolean(),
  alert_type: AlertTypeSchema.nullable(),
  alert_reason: z.string().min(1).nullable(),
  factors: z.array(AIRiskFactorSchema).max(8)
})

export type AIRiskAssessment = z.infer<typeof AIRiskAssessmentSchema>

type ScoreTransactionWithAIInput = {
  transaction: TransactionRow
  ruleEvaluation: RuleEngineResult
}

type ScoreTransactionWithAIResult = {
  assessment: AIRiskAssessment
  model: string
}

function getModelName() {
  return process.env.OPENAI_MODEL_RISK_SCORING?.trim() || 'gpt-5-mini'
}

export function parseAiRiskAssessmentText(value: string) {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('OpenAI risk scoring did not return valid JSON')
  }

  const assessment = AIRiskAssessmentSchema.safeParse(parsed)

  if (!assessment.success) {
    throw new Error('OpenAI risk scoring response failed schema validation')
  }

  return assessment.data
}

export function extractResponseText(response: unknown) {
  if (!response || typeof response !== 'object') {
    throw new Error('OpenAI response was empty')
  }

  const output = (response as { output?: unknown[] }).output

  if (!Array.isArray(output)) {
    throw new Error('OpenAI response contained no output array')
  }

  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    if ((item as { type?: string }).type !== 'message') continue

    const content = (item as { content?: unknown[] }).content
    if (!Array.isArray(content)) continue

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue
      if ((contentItem as { type?: string }).type !== 'output_text') continue

      const text = (contentItem as { text?: unknown }).text
      if (typeof text === 'string' && text.trim()) {
        return text
      }
    }
  }

  throw new Error('OpenAI response did not include assistant output text')
}

function buildPromptPayload(input: ScoreTransactionWithAIInput) {
  return {
    transaction: {
      external_tx_id: input.transaction.external_tx_id,
      amount: input.transaction.amount,
      currency: input.transaction.currency,
      transaction_type: input.transaction.transaction_type,
      counterparty_country: input.transaction.counterparty_country,
      created_at: input.transaction.created_at
    },
    rule_engine: {
      score: input.ruleEvaluation.score,
      level: input.ruleEvaluation.level,
      status: input.ruleEvaluation.status,
      explanation: input.ruleEvaluation.explanation,
      matched_rules: input.ruleEvaluation.matchedRules.map((rule) => ({
        name: rule.rule_name,
        type: rule.rule_type,
        severity: rule.severity,
        reason: rule.reason
      }))
    },
    implementation_notes: {
      sanctions_screening: input.transaction.screening_status ?? 'pending_parallel_worker',
      use_case: 'transaction_triage'
    }
  }
}

export async function scoreTransactionWithAI(
  input: ScoreTransactionWithAIInput
): Promise<ScoreTransactionWithAIResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return null
  }

  const model = getModelName()
  const requestBody = {
    model,
    temperature: 0.2,
    max_output_tokens: 400,
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
              'You are an AML risk scoring assistant for a regulatory intelligence platform.',
              'Return strict JSON only.',
              'Use the deterministic rule results as hard evidence and do not understate obvious high-risk matches.',
              'Set requires_manual_review to true when score >= 70 or when the narrative suggests human investigation.',
              'alert_type must be one of threshold_breach, velocity, geo_anomaly, unusual_pattern, or null.',
              'Do not invent sanctions matches. Sanctions screening runs in a separate worker and may update the transaction independently.'
            ].join(' ')
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Analyze this transaction and respond as JSON.\n${JSON.stringify(buildPromptPayload(input), null, 2)}`
          }
        ]
      }
    ]
  }

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
    const message =
      typeof responseJson?.error === 'object' &&
      responseJson.error &&
      'message' in responseJson.error &&
      typeof responseJson.error.message === 'string'
        ? responseJson.error.message
        : `OpenAI request failed with status ${response.status}`

    throw new Error(message)
  }

  const outputText = extractResponseText(responseJson)

  return {
    assessment: parseAiRiskAssessmentText(outputText),
    model
  }
}
