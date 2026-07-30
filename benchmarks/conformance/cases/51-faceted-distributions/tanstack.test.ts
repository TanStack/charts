import { penguins } from '@charts-poc/demo-data/penguins'
import { describe, expect, it } from 'vitest'
import {
  prepareFacetedDistributionBins,
  species,
  type PenguinMass,
  type PenguinSpecies,
} from './tanstack'

const rows = penguins.filter((row): row is PenguinMass => {
  return (
    row.body_mass_g !== null && species.includes(row.species as PenguinSpecies)
  )
})

describe('faceted distribution preparation', () => {
  it('accounts for every observed body mass within its species facet', () => {
    const bins = prepareFacetedDistributionBins(rows)

    for (const speciesName of species) {
      const speciesRows = rows.filter((row) => row.species === speciesName)
      const speciesBins = bins.filter((entry) => entry.species === speciesName)

      expect(speciesBins.length).toBeGreaterThan(0)
      expect(speciesBins.every((entry) => entry.count > 0)).toBe(true)
      expect(speciesBins.reduce((total, entry) => total + entry.count, 0)).toBe(
        speciesRows.length,
      )
      expect(
        speciesBins.reduce((total, entry) => total + entry.proportion, 0),
      ).toBeCloseTo(1)
    }
  })

  it('omits facets that have no source rows instead of producing NaN values', () => {
    const bins = prepareFacetedDistributionBins(rows.slice(0, 1))

    expect(new Set(bins.map((entry) => entry.species))).toEqual(
      new Set(['Adelie']),
    )
    expect(bins.every((entry) => Number.isFinite(entry.proportion))).toBe(true)
  })
})
