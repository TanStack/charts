import { describe, expect, it } from 'vitest'
import type { FacetedDistributionPoint } from './data'
import { prepareFacetedDistributionBins } from './tanstack'

describe('faceted distribution preparation', () => {
  it('accounts for every row within its facet and retains the domain maximum', () => {
    const rows: readonly FacetedDistributionPoint[] = [
      { id: 'baseline:0', group: 'Baseline', value: 0 },
      { id: 'baseline:1', group: 'Baseline', value: 10 },
      { id: 'baseline:2', group: 'Baseline', value: 100 },
      { id: 'variant:0', group: 'Variant', value: 25 },
      { id: 'variant:1', group: 'Variant', value: 35 },
      { id: 'experimental:0', group: 'Experimental', value: 75 },
    ]
    const bins = prepareFacetedDistributionBins(rows)

    for (const group of ['Baseline', 'Variant', 'Experimental'] as const) {
      const groupRows = rows.filter((row) => row.group === group)
      const groupBins = bins.filter((entry) => entry.group === group)

      expect(groupBins).toHaveLength(10)
      expect(groupBins.reduce((total, entry) => total + entry.count, 0)).toBe(
        groupRows.length,
      )
      expect(
        groupBins.reduce((total, entry) => total + entry.proportion, 0),
      ).toBeCloseTo(1)
    }

    expect(
      bins.find(
        (entry) =>
          entry.group === 'Baseline' && entry.x1 === 90 && entry.x2 === 100,
      ),
    ).toMatchObject({ count: 1, proportion: 1 / 3 })
  })

  it('omits facets that have no source rows instead of producing NaN values', () => {
    const bins = prepareFacetedDistributionBins([
      { id: 'baseline:0', group: 'Baseline', value: 50 },
    ])

    expect(new Set(bins.map((entry) => entry.group))).toEqual(
      new Set(['Baseline']),
    )
    expect(bins.every((entry) => Number.isFinite(entry.proportion))).toBe(true)
  })
})
