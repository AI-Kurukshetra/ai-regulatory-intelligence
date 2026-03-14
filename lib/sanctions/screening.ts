import type { Json } from '@/types/supabase'

export type WatchlistCandidate = {
  id: string
  source: string
  list_name: string
  entity_name: string
  entity_type: string
  country: string | null
  aliases: Json
  name_normalized: string
  aliases_normalized: Json
  score: number
}

export type SanctionsDecision = {
  screeningStatus: 'clear' | 'review' | 'hit' | 'skipped'
  hitStatus: 'potential' | 'confirmed' | null
  transactionStatus: 'flagged' | 'blocked' | null
  minimumRiskScore: number | null
  minimumRiskLevel: 'high' | 'critical' | null
  matchScore: number | null
  matchedField: 'counterparty_name' | null
  matchedValue: string | null
  alertType: string | null
  alertTitle: string | null
  rationale: string
  bestCandidate: WatchlistCandidate | null
}

function jsonToStringArray(value: Json) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

export function normalizeScreeningName(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isExactMatch(normalizedInput: string, candidate: WatchlistCandidate) {
  if (!normalizedInput) {
    return false
  }

  if (candidate.name_normalized === normalizedInput) {
    return true
  }

  return jsonToStringArray(candidate.aliases_normalized).includes(normalizedInput)
}

export function classifySanctionsCandidates(
  screeningName: string | null | undefined,
  candidates: WatchlistCandidate[]
): SanctionsDecision {
  const normalizedInput = normalizeScreeningName(screeningName)

  if (!normalizedInput) {
    return {
      screeningStatus: 'skipped',
      hitStatus: null,
      transactionStatus: null,
      minimumRiskScore: null,
      minimumRiskLevel: null,
      matchScore: null,
      matchedField: null,
      matchedValue: null,
      alertType: null,
      alertTitle: null,
      rationale: 'Sanctions screening skipped because no counterparty name was provided.',
      bestCandidate: null
    }
  }

  if (candidates.length === 0) {
    return {
      screeningStatus: 'clear',
      hitStatus: null,
      transactionStatus: null,
      minimumRiskScore: null,
      minimumRiskLevel: null,
      matchScore: null,
      matchedField: 'counterparty_name',
      matchedValue: screeningName ?? normalizedInput,
      alertType: null,
      alertTitle: null,
      rationale: 'No OFAC watchlist candidate matched the provided counterparty name.',
      bestCandidate: null
    }
  }

  const sortedCandidates = [...candidates].sort((left, right) => right.score - left.score)
  const bestCandidate = sortedCandidates[0]
  const exactMatch = isExactMatch(normalizedInput, bestCandidate)
  const roundedScore = Number(bestCandidate.score.toFixed(4))

  if (exactMatch || bestCandidate.score >= 0.96) {
    return {
      screeningStatus: 'hit',
      hitStatus: 'confirmed',
      transactionStatus: 'blocked',
      minimumRiskScore: 95,
      minimumRiskLevel: 'critical',
      matchScore: roundedScore,
      matchedField: 'counterparty_name',
      matchedValue: screeningName ?? normalizedInput,
      alertType: 'sanctions_hit',
      alertTitle: `OFAC hit: ${bestCandidate.entity_name}`,
      rationale: `Counterparty name matched OFAC ${bestCandidate.list_name} entry ${bestCandidate.entity_name} with score ${roundedScore}.`,
      bestCandidate
    }
  }

  if (bestCandidate.score >= 0.84) {
    return {
      screeningStatus: 'review',
      hitStatus: 'potential',
      transactionStatus: 'flagged',
      minimumRiskScore: 85,
      minimumRiskLevel: 'high',
      matchScore: roundedScore,
      matchedField: 'counterparty_name',
      matchedValue: screeningName ?? normalizedInput,
      alertType: 'sanctions_review',
      alertTitle: `Potential OFAC match: ${bestCandidate.entity_name}`,
      rationale: `Counterparty name is similar to OFAC ${bestCandidate.list_name} entry ${bestCandidate.entity_name} with score ${roundedScore}. Manual review is required.`,
      bestCandidate
    }
  }

  return {
    screeningStatus: 'clear',
    hitStatus: null,
    transactionStatus: null,
    minimumRiskScore: null,
    minimumRiskLevel: null,
    matchScore: roundedScore,
    matchedField: 'counterparty_name',
    matchedValue: screeningName ?? normalizedInput,
    alertType: null,
    alertTitle: null,
    rationale: `Best OFAC candidate ${bestCandidate.entity_name} scored ${roundedScore}, below the review threshold.`,
    bestCandidate
  }
}
