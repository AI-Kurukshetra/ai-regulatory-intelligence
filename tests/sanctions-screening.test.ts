import { describe, expect, it } from 'vitest'
import {
  classifySanctionsCandidates,
  normalizeScreeningName,
  type WatchlistCandidate
} from '../lib/sanctions/screening'

function makeCandidate(overrides: Partial<WatchlistCandidate> = {}): WatchlistCandidate {
  return {
    id: 'watch-1',
    source: 'OFAC',
    list_name: 'OFAC_SDN',
    entity_name: 'ALPHA TRADING LLC',
    entity_type: 'entity',
    country: null,
    aliases: ['ALPHA TRADING LIMITED'],
    name_normalized: 'ALPHA TRADING LLC',
    aliases_normalized: ['ALPHA TRADING LIMITED'],
    score: 0.97,
    ...overrides
  }
}

describe('normalizeScreeningName', () => {
  it('normalizes punctuation and casing', () => {
    expect(normalizeScreeningName('Alpha Trading, LLC')).toBe('ALPHA TRADING LLC')
  })
})

describe('classifySanctionsCandidates', () => {
  it('skips screening when no name is provided', () => {
    const result = classifySanctionsCandidates('', [])

    expect(result.screeningStatus).toBe('skipped')
    expect(result.hitStatus).toBeNull()
  })

  it('marks an exact or near exact candidate as a confirmed hit', () => {
    const result = classifySanctionsCandidates('Alpha Trading LLC', [makeCandidate()])

    expect(result.screeningStatus).toBe('hit')
    expect(result.hitStatus).toBe('confirmed')
    expect(result.transactionStatus).toBe('blocked')
    expect(result.minimumRiskScore).toBe(95)
  })

  it('marks a weaker candidate as review', () => {
    const result = classifySanctionsCandidates('Alpha Trading Group', [
      makeCandidate({
        entity_name: 'ALPHA TRADING HOLDINGS',
        name_normalized: 'ALPHA TRADING HOLDINGS',
        aliases: [],
        aliases_normalized: [],
        score: 0.88
      })
    ])

    expect(result.screeningStatus).toBe('review')
    expect(result.hitStatus).toBe('potential')
    expect(result.transactionStatus).toBe('flagged')
    expect(result.minimumRiskLevel).toBe('high')
  })

  it('clears screening when the best candidate is below threshold', () => {
    const result = classifySanctionsCandidates('Completely Different Name', [
      makeCandidate({
        entity_name: 'ANOTHER ENTITY',
        name_normalized: 'ANOTHER ENTITY',
        aliases: [],
        aliases_normalized: [],
        score: 0.52
      })
    ])

    expect(result.screeningStatus).toBe('clear')
    expect(result.alertType).toBeNull()
  })
})
