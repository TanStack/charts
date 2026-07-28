import { describe, expect, it } from 'vitest'
import { assertKnownFilterValues } from './filters.mjs'

describe('assertKnownFilterValues', () => {
  it('accepts an absent or completely known filter', () => {
    expect(() =>
      assertKnownFilterValues(undefined, ['a', 'b'], 'case'),
    ).not.toThrow()
    expect(() =>
      assertKnownFilterValues(new Set(['b', 'a']), ['a', 'b'], 'case'),
    ).not.toThrow()
  })

  it('rejects every unknown value even when another value is valid', () => {
    expect(() =>
      assertKnownFilterValues(
        new Set(['known', 'missing-z', 'missing-a']),
        ['known', 'other'],
        'workload',
      ),
    ).toThrow(
      'Unknown workload filter values: missing-a, missing-z. Available: known, other.',
    )
  })
})
