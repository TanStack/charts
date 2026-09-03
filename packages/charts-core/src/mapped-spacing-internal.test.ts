import { describe, expect, it } from 'vitest'
import {
  isResolvedCategoryScale,
  minimumMappedSpacing,
  resolvedCategoryStep,
} from './mapped-spacing-internal'
import type { ResolvedScale } from './types'

describe('minimumMappedSpacing', () => {
  it('finds the smallest positive distance between distinct mapped values', () => {
    const scale = resolvedScale((value) => Number(value) * 10)

    expect(minimumMappedSpacing(scale, [4, 1, 2, 4, 1])).toBe(10)
  })

  it('supports temporal values and ignores invalid mappings', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const next = new Date('2026-01-03T00:00:00Z')
    const scale = resolvedScale((value) =>
      value instanceof Date ? value.getUTCDate() * 12 : Number.NaN,
    )

    expect(
      minimumMappedSpacing(scale, [start, next, null, Number.NaN, 'invalid']),
    ).toBe(24)
  })

  it('returns undefined when fewer than two distinct positions map', () => {
    const scale = resolvedScale(() => 20)

    expect(minimumMappedSpacing(scale, ['A', 'A', null])).toBeUndefined()
  })

  it('uses the complete domain and bounds a singleton fallback', () => {
    const scale = resolvedScale((value) =>
      value === 'A' ? 10 : value === 'B' ? 50 : Number.NaN,
    )
    scale.domain = ['A', 'B']
    expect(resolvedCategoryStep(scale, 200, 4)).toBe(40)

    scale.domain = ['A']
    expect(resolvedCategoryStep(scale, 200, 4)).toBe(50)
    scale.bandwidth = 30
    expect(resolvedCategoryStep(scale, 200, 4)).toBe(30)
  })

  it('recognizes configured and custom category scale kinds', () => {
    expect(isResolvedCategoryScale(resolvedScale(Number))).toBe(true)
    expect(
      isResolvedCategoryScale({
        ...resolvedScale(Number),
        type: 'point',
      }),
    ).toBe(true)
    expect(
      isResolvedCategoryScale({
        ...resolvedScale(Number),
        type: 'configured',
      }),
    ).toBe(false)
  })
})

function resolvedScale(map: (value: unknown) => number): ResolvedScale {
  return {
    id: 'test',
    type: 'band',
    domain: [],
    ticks: [],
    bandwidth: 0,
    map,
  }
}
