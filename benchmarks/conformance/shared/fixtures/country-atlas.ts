import countriesAtlasJson from 'world-atlas/countries-110m.json'
import landAtlasJson from 'world-atlas/land-110m.json'
import detailedLandAtlasJson from 'world-atlas/land-50m.json'
import { geoGraticule, geoGraticule10 } from 'd3-geo'
import { feature } from 'topojson-client'
import { simplifyPolygonGeometry } from './simplify-geo'
import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
  GeoSphere,
} from 'd3-geo'

type AtlasTopology = Parameters<typeof feature>[0]

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

if (worldCountries.length !== 177) {
  throw new TypeError(
    `Expected 177 world-atlas countries, got ${worldCountries.length}`,
  )
}

export const worldCountryCollection: ExtendedFeatureCollection<CountryFeature> =
  {
    type: 'FeatureCollection',
    features: [...worldCountries],
  }

export const worldLand = convertLand(landAtlasJson, 'world-atlas land-110m')
export const previewWorldLand: LandFeature = {
  ...worldLand,
  geometry: simplifyPolygonGeometry(worldLand.geometry, 2),
}
export const detailedWorldLand = convertLand(
  detailedLandAtlasJson,
  'world-atlas land-50m',
)

function atlasTopology(value: unknown, label: string): AtlasTopology {
  if (!isAtlasTopology(value)) {
    throw new TypeError(`${label} is not valid TopoJSON`)
  }
  return value
}

function convertLand(value: unknown, label: string): LandFeature {
  const topology = atlasTopology(value, label)
  const landObject = topology.objects.land
  if (!landObject) {
    throw new TypeError(`${label} is missing land`)
  }

  const converted = feature(topology, landObject)
  const land =
    converted.type === 'FeatureCollection' ? converted.features[0] : converted
  if (!land || land.type !== 'Feature' || !isCountryGeometry(land.geometry)) {
    throw new TypeError(`${label} did not produce polygon geometry`)
  }

  return {
    type: 'Feature',
    geometry: land.geometry,
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
