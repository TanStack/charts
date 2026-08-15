import { beagle } from '@tanstack/charts-data/beagle'
import { learningPoverty } from '@tanstack/charts-data/learning-poverty'
import { usCountyUnemployment } from '@tanstack/charts-data/us-county-unemployment'
import { geoContains } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { beagleRoute } from '../../cases/105-route-map/transform'
import {
  projectedUnemploymentCounties,
  unemploymentCounties,
} from '../../cases/109-us-state-choropleth/transform'
import {
  detailedWorldLand,
  worldCountries,
  worldLand,
} from '@tanstack/charts-data/country-atlas'
import {
  learningPovertyCountries,
  learningPovertyPointsByPopulation,
} from '../transforms/learning-poverty'

describe('geography demo data', () => {
  it('converts the published world atlases without New Zealand', () => {
    expect(worldCountries).toHaveLength(176)
    expect(worldCountries.every(({ id }) => typeof id === 'string')).toBe(true)
    expect(
      worldCountries.some(
        ({ properties }) => properties.name === 'New Zealand',
      ),
    ).toBe(false)
    expect(worldLand.geometry.coordinates).not.toHaveLength(0)
    expect(detailedWorldLand.geometry.coordinates).not.toHaveLength(0)
    expect(geoContains(worldLand, [174.78, -41.29])).toBe(false)
    expect(geoContains(detailedWorldLand, [174.78, -41.29])).toBe(false)
    expect(geoContains(worldLand, [151.21, -33.87])).toBe(true)
  })

  it('joins learning-poverty rows without changing published values', () => {
    expect(learningPovertyCountries).toHaveLength(94)
    expect(
      learningPovertyCountries.some(
        ({ properties }) => properties.name === 'New Zealand',
      ),
    ).toBe(false)

    const sourceByName = new Map(
      learningPoverty.map((row) => [row['Country Name'], row]),
    )
    for (const country of learningPovertyCountries) {
      const source = sourceByName.get(country.properties['Country Name'])
      expect(source).toBeDefined()
      expect(country.properties['Learning Poverty']).toBe(
        source?.['Learning Poverty'],
      )
      expect(country.properties.population).toBe(source?.population)
      expect(country.properties.density).toBe(source?.density)
    }

    for (
      let index = 1;
      index < learningPovertyPointsByPopulation.length;
      index++
    ) {
      expect(
        learningPovertyPointsByPopulation[index - 1]?.properties.population,
      ).toBeGreaterThanOrEqual(
        learningPovertyPointsByPopulation[index]?.properties.population ?? 0,
      )
    }
  })

  it('constructs the Beagle route from every pinned coordinate in order', () => {
    expect(beagleRoute.geometry.coordinates).toEqual(beagle)
    expect(beagleRoute.geometry.coordinates).toHaveLength(303)
    expect(beagleRoute.geometry.coordinates[0]).toEqual([-4.17, 50.37])
    expect(beagleRoute.geometry.coordinates.at(-1)).toEqual([-4.17, 50.37])
  })

  it('joins every published county unemployment row by FIPS', () => {
    expect(unemploymentCounties).toHaveLength(usCountyUnemployment.length)
    expect(projectedUnemploymentCounties).toHaveLength(3141)

    const sourceByFips = new Map(
      usCountyUnemployment.map((row) => [String(row.id).padStart(5, '0'), row]),
    )
    for (const county of unemploymentCounties) {
      const source = sourceByFips.get(String(county.id))
      expect(source).toBeDefined()
      expect(county.properties.state).toBe(source?.state)
      expect(county.properties.county).toBe(source?.county)
      expect(county.properties.rate).toBe(source?.rate)
    }
  })
})
