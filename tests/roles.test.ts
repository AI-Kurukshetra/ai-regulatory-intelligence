import { describe, expect, it } from 'vitest'
import { hasRole } from '../lib/auth/roles'

describe('hasRole', () => {
  it('returns true when the role is allowed', () => {
    expect(hasRole('admin', ['admin', 'analyst'])).toBe(true)
  })

  it('returns false when the role is not allowed', () => {
    expect(hasRole('readonly', ['admin', 'analyst'])).toBe(false)
  })

  it('returns false for unknown roles', () => {
    expect(hasRole('guest', ['admin', 'analyst'])).toBe(false)
  })
})

