import { describe, expect, it } from 'vitest'
import { TransactionCreateSchema } from '../lib/transactions/schema'

describe('TransactionCreateSchema', () => {
  it('accepts a valid payload', () => {
    const result = TransactionCreateSchema.safeParse({
      amount: 2500,
      currency: 'USD',
      transaction_type: 'wire',
      counterparty_country: 'AE'
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid currency codes', () => {
    const result = TransactionCreateSchema.safeParse({
      amount: 2500,
      currency: 'usd',
      transaction_type: 'wire'
    })

    expect(result.success).toBe(false)
  })

  it('rejects non-positive amounts', () => {
    const result = TransactionCreateSchema.safeParse({
      amount: 0,
      currency: 'USD',
      transaction_type: 'wire'
    })

    expect(result.success).toBe(false)
  })
})

