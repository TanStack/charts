import { describe, expect, it } from 'vitest'
import { bundleBaselineShapeFailures } from './bundle-baseline.mjs'

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
})
