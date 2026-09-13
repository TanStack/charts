import { describe, expect, it } from 'vitest'
import { sameChartValue } from './value-equality-internal'

describe('sameChartValue', () => {
  it('compares primitives and dates by value', () => {
    expect(sameChartValue(12, 12)).toBe(true)
    expect(sameChartValue('September', 'September')).toBe(true)
    expect(sameChartValue(new Date('2026-09-01'), new Date('2026-09-01'))).toBe(
      true,
    )
    expect(sameChartValue(new Date('2026-09-01'), new Date('2026-09-02'))).toBe(
      false,
    )
  })

  it('preserves Object.is semantics and distinguishes dates from timestamps', () => {
    expect(sameChartValue(Number.NaN, Number.NaN)).toBe(true)
    expect(sameChartValue(-0, 0)).toBe(false)
    expect(sameChartValue(new Date(0), 0)).toBe(false)
    expect(sameChartValue(undefined, 0)).toBe(false)
    expect(sameChartValue(new Date(Number.NaN), new Date(Number.NaN))).toBe(
      false,
    )
  })
})
