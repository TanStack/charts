import { learningPoverty } from '@tanstack/charts-data/learning-poverty'
import { geoCentroid } from 'd3-geo'
import { worldCountries } from './country-atlas'
import { simplifyPolygonGeometry } from './simplify-geo'
import type { LearningPovertyRow } from '@tanstack/charts-data/learning-poverty'
import type { ExtendedFeature, GeoGeometryObjects } from 'd3-geo'
import type { CountryFeature, CountryGeometry } from './country-atlas'

type PointGeometry = Extract<GeoGeometryObjects, { type: 'Point' }>

export interface LearningPovertyProperties extends LearningPovertyRow {
  name: string
}

export type LearningPovertyCountry = ExtendedFeature<
  CountryGeometry,
  LearningPovertyProperties
>
export type LearningPovertyPoint = ExtendedFeature<
  PointGeometry,
  LearningPovertyProperties
>

// The source uses World Bank names while world-atlas uses Natural Earth names.
// Tiny states absent from the 110m atlas remain unmatched.
const naturalEarthNameBySourceName: Readonly<Record<string, string>> = {
  'Congo, Dem Rep': 'Dem. Rep. Congo',
  'Congo, Rep': 'Congo',
  'Cote d’Ivoire': "Côte d'Ivoire",
  'Czech Republic': 'Czechia',
  'Dominican Republic': 'Dominican Rep.',
  'Egypt, Arab Rep': 'Egypt',
  'Iran, Islamic Rep': 'Iran',
  'Korea, Rep': 'South Korea',
  'Kyrgyz Republic': 'Kyrgyzstan',
  'Russian Federation': 'Russia',
  'Slovak Republic': 'Slovakia',
  'United States': 'United States of America',
  'Yemen, Rep': 'Yemen',
}

const countryByName = new Map(
  worldCountries.map((country) => [country.properties.name, country]),
)

export const learningPovertyCountries: readonly LearningPovertyCountry[] =
  learningPoverty.flatMap((row) => {
    const sourceName = row['Country Name']
    const atlasName = naturalEarthNameBySourceName[sourceName] ?? sourceName
    const country = countryByName.get(atlasName)
    return country ? [joinCountry(country, row)] : []
  })

export const previewLearningPovertyCountries: readonly LearningPovertyCountry[] =
  learningPovertyCountries.map((country) => ({
    ...country,
    geometry: simplifyPolygonGeometry(country.geometry, 2),
  }))

if (learningPovertyCountries.length !== 95) {
  throw new TypeError(
    `Expected 95 learning-poverty countries in world-atlas, got ${learningPovertyCountries.length}`,
  )
}

export const learningPovertyPoints: readonly LearningPovertyPoint[] =
  learningPovertyCountries.map((country) => ({
    type: 'Feature',
    id: country.id,
    geometry: {
      type: 'Point',
      coordinates: geoCentroid(country),
    },
    properties: country.properties,
  }))

// Largest symbols render first so smaller countries remain selectable.
export const learningPovertyPointsByPopulation: readonly LearningPovertyPoint[] =
  [...learningPovertyPoints].sort(
    (left, right) => right.properties.population - left.properties.population,
  )

function joinCountry(
  country: CountryFeature,
  row: LearningPovertyRow,
): LearningPovertyCountry {
  return {
    type: 'Feature',
    id: country.id,
    geometry: country.geometry,
    properties: {
      name: country.properties.name,
      ...row,
    },
  }
}
