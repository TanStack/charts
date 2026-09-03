import { usCountyUnemployment } from '@tanstack/charts-data/us-county-unemployment'
import countiesAtlasJson from 'us-atlas/counties-10m.json'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { simplifyPolygonGeometry } from '@tanstack/charts-data/simplify-geo'
import type { UsCountyUnemploymentRow } from '@tanstack/charts-data/us-county-unemployment'
import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
} from 'd3-geo'

type AtlasTopology = Parameters<typeof feature>[0]
type CountyGeometry = Extract<
  GeoGeometryObjects,
  { type: 'Polygon' | 'MultiPolygon' }
>

export interface UnemploymentCountyProperties extends UsCountyUnemploymentRow {
  name: string
}

export type UnemploymentCounty = ExtendedFeature<
  CountyGeometry,
  UnemploymentCountyProperties
>

export interface ProjectionBounds {
  x: number
  y: number
  width: number
  height: number
}

const countyAtlasSource: unknown = countiesAtlasJson
if (!isAtlasTopology(countyAtlasSource)) {
  throw new TypeError('us-atlas counties-10m is not valid TopoJSON')
}

const countiesObject = countyAtlasSource.objects.counties
if (!countiesObject) {
  throw new TypeError('us-atlas counties-10m is missing counties')
}

const convertedCounties = feature(countyAtlasSource, countiesObject)
if (convertedCounties.type !== 'FeatureCollection') {
  throw new TypeError('us-atlas counties did not produce a collection')
}

const unemploymentByFips = new Map(
  usCountyUnemployment.map((row) => [String(row.id).padStart(5, '0'), row]),
)

export const unemploymentCounties: readonly UnemploymentCounty[] =
  convertedCounties.features.flatMap<UnemploymentCounty>((county) => {
    const fips =
      county.id === undefined ? null : String(county.id).padStart(5, '0')
    const row = fips === null ? undefined : unemploymentByFips.get(fips)
    if (
      fips === null ||
      row === undefined ||
      !isCountyGeometry(county.geometry) ||
      !isRecord(county.properties) ||
      typeof county.properties.name !== 'string'
    ) {
      return []
    }

    return [
      {
        type: 'Feature',
        id: fips,
        geometry: county.geometry,
        properties: {
          name: county.properties.name,
          ...row,
        },
      },
    ]
  })

if (unemploymentCounties.length !== 3219) {
  throw new TypeError(
    `Expected 3219 counties with unemployment data, got ${unemploymentCounties.length}`,
  )
}

const albersUsaPath = geoPath(geoAlbersUsa())

// Albers USA intentionally excludes territories outside the composite
// projection. Filter them before rendering so both libraries receive only
// geometries that can produce a path.
export const projectedUnemploymentCounties = unemploymentCounties.filter(
  (county) => albersUsaPath(county) !== null,
)

if (projectedUnemploymentCounties.length !== 3141) {
  throw new TypeError(
    `Expected 3141 Albers-USA counties, got ${projectedUnemploymentCounties.length}`,
  )
}

export const unemploymentCountyCollection: ExtendedFeatureCollection<UnemploymentCounty> =
  {
    type: 'FeatureCollection',
    features: [...projectedUnemploymentCounties],
  }

export const previewUnemploymentCounties: readonly UnemploymentCounty[] =
  projectedUnemploymentCounties.map((county) => ({
    ...county,
    geometry: simplifyPolygonGeometry(county.geometry, 0.08),
  }))

export const previewUnemploymentCountyCollection: ExtendedFeatureCollection<UnemploymentCounty> =
  {
    type: 'FeatureCollection',
    features: [...previewUnemploymentCounties],
  }

export function fitUnemploymentProjection({
  x,
  y,
  width,
  height,
}: ProjectionBounds) {
  return geoAlbersUsa().fitExtent(
    [
      [x, y],
      [x + width, y + height],
    ],
    unemploymentCountyCollection,
  )
}

export function fitPreviewUnemploymentProjection({
  x,
  y,
  width,
  height,
}: ProjectionBounds) {
  return geoAlbersUsa().fitExtent(
    [
      [x, y],
      [x + width, y + height],
    ],
    previewUnemploymentCountyCollection,
  )
}

function isCountyGeometry(
  geometry: GeoGeometryObjects,
): geometry is CountyGeometry {
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
