import { extractResponseText } from './risk-scoring'
import { formatCurrency } from '../utils/formatters'

type SarDraftInput = {
  case: {
    case_number: string
    title: string
    priority: string
    status: string
    description: string | null
  }
  alerts: Array<{
    title: string
    severity: string
    alert_type: string
    description: string | null
    created_at: string
  }>
  transactions: Array<{
    id: string
    external_tx_id: string | null
    amount: number
    currency: string
    transaction_type: string
    status: string
    risk_score: number | null
    risk_level: string | null
    created_at: string
  }>
  notes: Array<{
    note: string
    created_at: string
    author_name: string | null
  }>
}

type SarDraftResult = {
  narrative: string
  model: string
  usedFallback: boolean
}

function getSarModelName() {
  return process.env.OPENAI_MODEL_SAR_DRAFT?.trim() || 'gpt-5'
}

function buildFallbackNarrative(input: SarDraftInput) {
  const transactionSummary =
    input.transactions.length === 0
      ? 'No linked transactions were available when the draft was generated.'
      : input.transactions
          .slice(0, 5)
          .map((transaction) => {
            const reference = transaction.external_tx_id ?? transaction.id
            return `${reference} for ${formatCurrency(transaction.amount, transaction.currency)} as ${transaction.transaction_type} on ${new Date(transaction.created_at).toISOString().slice(0, 10)}`
          })
          .join('; ')

  const alertSummary =
    input.alerts.length === 0
      ? 'No linked alerts were recorded.'
      : input.alerts
          .map((alert) => `${alert.severity} ${alert.alert_type} alert titled "${alert.title}"`)
          .join('; ')

  const noteSummary =
    input.notes.length === 0
      ? 'No investigator notes were available at draft time.'
      : input.notes
          .slice(0, 3)
          .map((note) => `${note.author_name ?? 'Analyst'} noted: ${note.note}`)
          .join(' ')

  return [
    `Case ${input.case.case_number} concerns ${input.case.title}. The case is currently classified as ${input.case.priority} priority and is in ${input.case.status} status. ${input.case.description ?? 'No additional case description was provided.'}`,
    `The case was opened after the following alert activity was observed: ${alertSummary} The linked transaction population reviewed for this draft includes ${transactionSummary}.`,
    `Based on the currently linked alerts, transaction activity, and investigator observations, the matter warrants compliance review for potentially suspicious behavior. Investigators should confirm the source of funds, the purpose of the activity, any relationship between the counterparties, and whether additional filings or customer due diligence actions are required. ${noteSummary}`
  ].join('\n\n')
}

function buildSarPrompt(input: SarDraftInput) {
  return [
    'You are a senior AML compliance officer drafting a Suspicious Activity Report (SAR) narrative.',
    'Write a factual, regulator-ready narrative in 3 to 5 paragraphs.',
    'Use only the supplied facts. Do not speculate or invent counterparties, motives, or law enforcement outcomes.',
    'Include who, what, when, where, and why the activity may be suspicious.',
    'Avoid bullets, headings, and placeholder text.',
    `Case data:\n${JSON.stringify(input.case, null, 2)}`,
    `Linked alerts:\n${JSON.stringify(input.alerts, null, 2)}`,
    `Linked transactions:\n${JSON.stringify(input.transactions, null, 2)}`,
    `Investigator notes:\n${JSON.stringify(input.notes, null, 2)}`
  ].join('\n\n')
}

export async function generateSarDraft(input: SarDraftInput): Promise<SarDraftResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return {
      narrative: buildFallbackNarrative(input),
      model: 'manual-fallback',
      usedFallback: true
    }
  }

  const model = getSarModelName()
  const requestBody = {
    model,
    temperature: 0.2,
    max_output_tokens: 1400,
    store: false,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You produce regulator-ready SAR draft narratives. Return only the narrative text.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: buildSarPrompt(input)
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

    const narrative = extractResponseText(responseJson).trim()

    if (!narrative) {
      throw new Error('OpenAI returned an empty SAR draft narrative')
    }

    return {
      narrative,
      model,
      usedFallback: false
    }
  } catch {
    return {
      narrative: buildFallbackNarrative(input),
      model: 'manual-fallback',
      usedFallback: true
    }
  }
}
