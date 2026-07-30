import { penguins } from '@charts-poc/demo-data/penguins'
import { describe, expect, it } from 'vitest'
import { isPenguinMass, violinDensity, violinMedians } from './transform'

describe('violin transforms', () => {
  it('bins the observed body masses into symmetric widths and computes medians', () => {
    const observations = penguins.filter(isPenguinMass)
    const rows = violinDensity(observations)
    const medians = violinMedians(observations)

    expect(rows).toHaveLength(48)
    expect(medians.map((row) => row.body_mass_g)).toEqual([3700, 3700, 5000])
    rows.forEach((row) => {
      const center =
        medians.find((median) => median.species === row.species)?.center ?? 0
      expect(row.x1 + row.x2).toBeCloseTo(center * 2)
    })
  })
})
