import { geoAlbersUsa } from 'd3-geo'
import { feature } from 'topojson-client'
import statesAtlasJson from 'us-atlas/states-10m.json'
import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
  GeoProjection,
} from 'd3-geo'

interface ProjectionBounds {
  x: number
  y: number
  width: number
  height: number
}

type AtlasTopology = Parameters<typeof feature>[0]
type StateGeometry = Extract<
  GeoGeometryObjects,
  { type: 'Polygon' | 'MultiPolygon' }
>

interface BaseStateProperties {
  id: string
  name: string
}

type BaseState = ExtendedFeature<StateGeometry, BaseStateProperties>

export interface UsStateProperties extends BaseStateProperties {
  value: number
  fill: string
}

export type UsState = ExtendedFeature<StateGeometry, UsStateProperties>

const fills = [
  '#dbeafe',
  '#93c5fd',
  '#38bdf8',
  '#0ea5e9',
  '#2563eb',
  '#1d4ed8',
] as const

const atlasSource: unknown = statesAtlasJson

if (!isAtlasTopology(atlasSource)) {
  throw new TypeError('Invalid us-atlas states topology')
}

const statesObject = atlasSource.objects.states
if (!statesObject) {
  throw new TypeError('us-atlas is missing its states object')
}

const convertedStates = feature(atlasSource, statesObject)
if (convertedStates.type !== 'FeatureCollection') {
  throw new TypeError('us-atlas states did not produce a feature collection')
}

const baseStates = convertedStates.features.flatMap<BaseState>((state) => {
  const numericId = Number(state.id)
  if (
    state.id === undefined ||
    !isStateGeometry(state.geometry) ||
    !isRecord(state.properties) ||
    typeof state.properties.name !== 'string' ||
    !Number.isInteger(numericId) ||
    numericId >= 60
  ) {
    return []
  }

  const id = String(state.id).padStart(2, '0')
  return [
    {
      type: 'Feature',
      id,
      geometry: state.geometry,
      properties: {
        id,
        name: state.properties.name,
      },
    },
  ]
})

if (baseStates.length !== 51) {
  throw new TypeError(`Expected 51 US state features, got ${baseStates.length}`)
}

const stateCollection: ExtendedFeatureCollection<BaseState> = {
  type: 'FeatureCollection',
  features: [...baseStates],
}

export function usStates(revision = 0): readonly UsState[] {
  return baseStates.map((state) => {
    const value = stateValue(state.properties.id, revision)
    return {
      ...state,
      properties: {
        ...state.properties,
        value,
        fill: fills[Math.min(fills.length - 1, Math.floor(value / 17))],
      },
    }
  })
}

export function albersUsaProjection({
  x,
  y,
  width,
  height,
}: ProjectionBounds): GeoProjection {
  return geoAlbersUsa().fitExtent(
    [
      [x, y],
      [x + width, y + height],
    ],
    stateCollection,
  )
}

function stateValue(id: string, revision: number): number {
  const base = (Number(id) * 37 + 19) % 101
  return revision % 2 === 0 ? base : (base + 29) % 101
}

function isStateGeometry(
  geometry: GeoGeometryObjects,
): geometry is StateGeometry {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
}

function isAtlasTopology(value: unknown): value is AtlasTopology {
  if (!isRecord(value) || value.type !== 'Topology') return false
  return Array.isArray(value.arcs) && isRecord(value.objects)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
