import countriesAtlasJson from 'world-atlas/countries-110m.json'
import detailedCountriesAtlasJson from 'world-atlas/countries-50m.json'
import landAtlasJson from 'world-atlas/land-110m.json'
import detailedLandAtlasJson from 'world-atlas/land-50m.json'
import {
  geoCentroid,
  geoContains,
  geoGraticule,
  geoGraticule10,
} from 'd3-geo'
import { feature } from 'topojson-client'
import { simplifyPolygonGeometry } from './simplify-geo'
import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
  GeoSphere,
} from 'd3-geo'

type AtlasTopology = Parameters<typeof feature>[0]

const excludedCountryName = 'New Zealand'

export type CountryGeometry = Extract<
  GeoGeometryObjects,
  { type: 'Polygon' | 'MultiPolygon' }
>

export interface CountryProperties {
  name: string
}

export type CountryFeature = ExtendedFeature<CountryGeometry, CountryProperties>
export type LandFeature = ExtendedFeature<CountryGeometry, Record<never, never>>

export const worldSphere: GeoSphere = { type: 'Sphere' }
export const worldGraticule = geoGraticule10()
export const previewWorldGraticule = geoGraticule().step([30, 30])()

const countriesTopology = atlasTopology(
  countriesAtlasJson,
  'world-atlas countries-110m',
)
const countriesObject = countriesTopology.objects.countries
if (!countriesObject) {
  throw new TypeError('world-atlas countries-110m is missing countries')
}

const convertedCountries = feature(countriesTopology, countriesObject)
if (convertedCountries.type !== 'FeatureCollection') {
  throw new TypeError('world-atlas countries did not produce a collection')
}

export const worldCountries: readonly CountryFeature[] =
  convertedCountries.features.flatMap<CountryFeature>((entry) => {
    if (
      !isCountryGeometry(entry.geometry) ||
      !isRecord(entry.properties) ||
      typeof entry.properties.name !== 'string'
    ) {
      return []
    }

    if (entry.properties.name === excludedCountryName) return []

    return [
      {
        type: 'Feature',
        id: entry.id === undefined ? entry.properties.name : String(entry.id),
        geometry: entry.geometry,
        properties: {
          name: entry.properties.name,
        },
      },
    ]
  })

if (worldCountries.length !== 176) {
  throw new TypeError(
    `Expected 176 world-atlas countries after excluding ${excludedCountryName}, got ${worldCountries.length}`,
  )
}

export const worldCountryCollection: ExtendedFeatureCollection<CountryFeature> =
  {
    type: 'FeatureCollection',
    features: [...worldCountries],
  }

export const worldLand = convertLandWithoutExcludedCountry(
  landAtlasJson,
  countriesAtlasJson,
  'world-atlas 110m',
)
export const previewWorldLand: LandFeature = {
  ...worldLand,
  geometry: simplifyPolygonGeometry(worldLand.geometry, 2),
}
export const detailedWorldLand = convertLandWithoutExcludedCountry(
  detailedLandAtlasJson,
  detailedCountriesAtlasJson,
  'world-atlas 50m',
)

function atlasTopology(value: unknown, label: string): AtlasTopology {
  if (!isAtlasTopology(value)) {
    throw new TypeError(`${label} is not valid TopoJSON`)
  }
  return value
}

function convertLandWithoutExcludedCountry(
  landValue: unknown,
  countriesValue: unknown,
  label: string,
): LandFeature {
  const countriesTopology = atlasTopology(countriesValue, `${label} countries`)
  const countriesObject = countriesTopology.objects.countries
  if (!countriesObject) {
    throw new TypeError(`${label} is missing countries`)
  }

  const convertedCountries = feature(countriesTopology, countriesObject)
  if (convertedCountries.type !== 'FeatureCollection') {
    throw new TypeError(`${label} countries did not produce a collection`)
  }
  const excludedCountry = convertedCountries.features.find(
    (country) =>
      isRecord(country.properties) &&
      country.properties.name === excludedCountryName,
  )
  if (!excludedCountry || !isCountryGeometry(excludedCountry.geometry)) {
    throw new TypeError(`${label} did not contain ${excludedCountryName}`)
  }

  const landTopology = atlasTopology(landValue, `${label} land`)
  const landObject = landTopology.objects.land
  if (!landObject) {
    throw new TypeError(`${label} is missing land`)
  }
  const convertedLand = feature(landTopology, landObject)
  const land =
    convertedLand.type === 'FeatureCollection'
      ? convertedLand.features[0]
      : convertedLand
  if (!land || !isCountryGeometry(land.geometry)) {
    throw new TypeError(`${label} did not produce polygon land geometry`)
  }

  const polygons =
    land.geometry.type === 'MultiPolygon'
      ? land.geometry.coordinates
      : [land.geometry.coordinates]
  const includedPolygons = polygons.filter((coordinates) => {
    const polygon: CountryGeometry = { type: 'Polygon', coordinates }
    return !geoContains(excludedCountry, geoCentroid(polygon))
  })
  if (includedPolygons.length === polygons.length) {
    throw new TypeError(`${label} land did not contain ${excludedCountryName}`)
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: includedPolygons,
    },
    properties: {},
  }
}

function isCountryGeometry(
  geometry: GeoGeometryObjects,
): geometry is CountryGeometry {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
}

function isAtlasTopology(value: unknown): value is AtlasTopology {
  return (
    isRecord(value) &&
    value.type === 'Topology' &&
    Array.isArray(value.arcs) &&
    isRecord(value.objects)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
