import worldAtlas from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'
import { geoEqualEarth } from 'd3-geo'
import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
  GeoProjection,
  GeoSphere,
} from 'd3-geo'

export type CountryGeometry = Extract<
  GeoGeometryObjects,
  { type: 'Polygon' | 'MultiPolygon' }
>
type AtlasTopology = Parameters<typeof feature>[0]

export interface CountryProperties {
  id: string
  name: string
  value: number
  fill: string
}

export type CountryFeature = ExtendedFeature<CountryGeometry, CountryProperties>

interface ProjectionBounds {
  x: number
  y: number
  width: number
  height: number
}

const fills = ['#dbeafe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'] as const

export const countrySphere: GeoSphere = { type: 'Sphere' }

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}

function isAtlasTopology(value: unknown): value is AtlasTopology {
  return (
    isRecord(value) &&
    value.type === 'Topology' &&
    isRecord(value.objects) &&
    Array.isArray(value.arcs)
  )
}

function countryValue(id: string, name: string): number {
  let hash = Number.parseInt(id, 10)
  if (!Number.isFinite(hash)) {
    hash = [...name].reduce(
      (total, character) => total + (character.codePointAt(0) ?? 0),
      0,
    )
  }
  return 16 + ((hash * 37) % 85)
}

function countryFill(value: number): string {
  const index = Math.min(fills.length - 1, Math.floor(value / 21))
  return fills[index] ?? fills[0]
}

function loadCountries(): readonly CountryFeature[] {
  const source: unknown = worldAtlas
  if (!isAtlasTopology(source)) {
    throw new Error('world-atlas countries-110m is not valid TopoJSON.')
  }

  const countriesObject = source.objects.countries
  if (!countriesObject) {
    throw new Error('world-atlas is missing its countries object.')
  }

  const converted = feature(source, countriesObject)
  if (converted.type !== 'FeatureCollection') {
    throw new Error('world-atlas countries did not produce a collection.')
  }

  const countries: CountryFeature[] = []
  converted.features.forEach((entry) => {
    const geometry = entry.geometry
    const properties = entry.properties
    if (
      !geometry ||
      (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') ||
      !isRecord(properties) ||
      typeof properties.name !== 'string'
    ) {
      return
    }

    const id =
      entry.id === undefined
        ? properties.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
        : String(entry.id)
    const value = countryValue(id, properties.name)
    countries.push({
      type: 'Feature',
      id,
      geometry,
      properties: {
        id,
        name: properties.name,
        value,
        fill: countryFill(value),
      },
    })
  })

  if (countries.length !== 177) {
    throw new Error(
      `Expected 177 world-atlas countries, received ${countries.length}.`,
    )
  }

  return countries
}

const atlasCountries = loadCountries()
const revisedCountries = new Set(['076', '356', '840'])

export function countryFeatures(revision = 0): readonly CountryFeature[] {
  if (revision % 2 === 0) return atlasCountries

  return atlasCountries.map((country) => {
    if (!revisedCountries.has(country.properties.id)) return country
    const value = Math.min(100, country.properties.value + 18)
    return {
      ...country,
      properties: {
        ...country.properties,
        value,
        fill: countryFill(value),
      },
    }
  })
}

export function countryCollection(
  revision = 0,
): ExtendedFeatureCollection<CountryFeature> {
  return {
    type: 'FeatureCollection',
    features: [...countryFeatures(revision)],
  }
}

export function equalEarthCountryProjection(
  { x, y, width, height }: ProjectionBounds,
  inset = 0,
): GeoProjection {
  return geoEqualEarth().fitExtent(
    [
      [x + inset, y + inset],
      [x + width - inset, y + height - inset],
    ],
    countrySphere,
  )
}
