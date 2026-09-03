import { describe, expect, it } from 'vitest'
import {
  bundleBaselineBundles,
  bundleBaselineRecord,
  bundleBaselineShapeFailures,
} from './bundle-baseline.mjs'

const configuration = {
  libraryIds: ['tanstack', 'recharts'],
  chartTypes: ['line', 'bar'],
  tiers: ['basic'],
}

function baseline() {
  return {
    matrix: {
      chartTypes: [...configuration.chartTypes],
      tiers: [...configuration.tiers],
    },
    bundles: {
      'tanstack-line-basic': {},
      'tanstack-bar-basic': {},
      'recharts-line-basic': {},
      'recharts-bar-basic': {},
    },
    packageVersions: { tanstack: '1.0.0', recharts: '1.0.0' },
    sources: { tanstack: {}, recharts: {} },
  }
}

describe('bundle baseline shape', () => {
  it('accepts the exact configured libraries and matrix', () => {
    expect(bundleBaselineShapeFailures(baseline(), configuration)).toEqual([])
  })

  it('rejects stale entries for a removed library', () => {
    const stale = baseline()
    stale.bundles['removed-line-basic'] = {}
    stale.packageVersions.removed = '1.0.0'
    stale.sources.removed = {}

    expect(bundleBaselineShapeFailures(stale, configuration)).toEqual([
      expect.stringContaining('extra: removed-line-basic'),
      expect.stringContaining('extra: removed'),
      expect.stringContaining('extra: removed'),
    ])
  })

  it.each([undefined, null, []])(
    'keeps malformed bundle value %j on the structured validation path',
    (bundles) => {
      const malformed = baseline()
      malformed.bundles = bundles

      const normalized = bundleBaselineBundles(malformed)

      expect(Object.keys(normalized)).toEqual([])
      expect(normalized['tanstack-line-basic']).toBeUndefined()
      expect(bundleBaselineShapeFailures(malformed, configuration)).toEqual([
        expect.stringContaining('bundle baseline cases do not match'),
      ])
    },
  )

  it.each([null, []])(
    'keeps malformed root value %j on the structured validation path',
    (malformed) => {
      expect(bundleBaselineRecord(malformed)).toEqual({})
      expect(bundleBaselineBundles(malformed)).toEqual({})
      expect(bundleBaselineShapeFailures(malformed, configuration)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('bundle baseline matrix does not match'),
          expect.stringContaining('bundle baseline cases do not match'),
          expect.stringContaining(
            'bundle baseline package versions do not match',
          ),
          expect.stringContaining('bundle baseline sources do not match'),
        ]),
      )
    },
  )
})
