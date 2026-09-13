import { describe, expect, it } from 'vitest'
import {
  clampNonnegativeNumber,
  isFiniteNumber,
  finiteNumber,
  finiteNonNegative,
  finitePositive,
} from './number-internal'

describe('numeric option policies', () => {
  it('retains valid authored values', () => {
    expect(isFiniteNumber(12)).toBe(true)
    expect(finiteNumber(-12, 4)).toBe(-12)
    expect(finitePositive(12, 4)).toBe(12)
    expect(finiteNonNegative(0, 4)).toBe(0)
    expect(clampNonnegativeNumber(12, 4)).toBe(12)
  })

  it('keeps rejection and clamping of negative values distinct', () => {
    expect(finiteNonNegative(-12, 4)).toBe(4)
    expect(clampNonnegativeNumber(-12, 4)).toBe(0)
    expect(finitePositive(0, 4)).toBe(4)
    expect(finiteNonNegative(-0, 4)).toBe(-0)
    expect(clampNonnegativeNumber(-0, 4)).toBe(0)
  })

  it.each([undefined, Number.NaN, Infinity, -Infinity])(
    'uses the fallback for %s',
    (value) => {
      expect(isFiniteNumber(value)).toBe(false)
      expect(finiteNumber(value, 4)).toBe(4)
      expect(finitePositive(value, 4)).toBe(4)
      expect(finiteNonNegative(value, 4)).toBe(4)
      expect(clampNonnegativeNumber(value, 4)).toBe(4)
    },
  )

  it('does not coerce strings or boxed numbers', () => {
    expect(isFiniteNumber('12')).toBe(false)
    expect(isFiniteNumber(new Number(12))).toBe(false)
  })
})
