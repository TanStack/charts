import { geoEqualEarth, geoGraticule10, geoOrthographic } from 'd3-geo'
import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
  GeoProjection,
  GeoSphere,
} from 'd3-geo'

type Polygon = Extract<GeoGeometryObjects, { type: 'Polygon' }>
type Point = Extract<GeoGeometryObjects, { type: 'Point' }>
type LineString = Extract<GeoGeometryObjects, { type: 'LineString' }>

export interface WorldRegionProperties {
  id:
    | 'north-america'
    | 'south-america'
    | 'europe'
    | 'africa'
    | 'asia'
    | 'australia'
    | 'greenland'
  name: string
  value: number
  fill: string
}

export type WorldRegion = ExtendedFeature<Polygon, WorldRegionProperties>

export interface WorldPlaceProperties {
  id:
    | 'san-francisco'
    | 'new-york'
    | 'sao-paulo'
    | 'london'
    | 'lagos'
    | 'dubai'
    | 'singapore'
    | 'tokyo'
    | 'sydney'
  name: string
  value: number
  fill: string
}

export type WorldPlace = ExtendedFeature<Point, WorldPlaceProperties>

export interface WorldRouteProperties {
  id: 'sf-london' | 'new-york-lagos' | 'london-dubai' | 'dubai-tokyo'
  label: string
  stroke: string
}

export type WorldRoute = ExtendedFeature<LineString, WorldRouteProperties>

interface ProjectionBounds {
  x: number
  y: number
  width: number
  height: number
}

const fills = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#0891b2',
] as const

const regionShapes: readonly WorldRegion[] = [
  region(
    'north-america',
    'North America',
    72,
    fills[0],
    [
      [-168, 72],
      [-140, 70],
      [-125, 50],
      [-118, 32],
      [-105, 22],
      [-90, 18],
      [-82, 25],
      [-65, 45],
      [-52, 58],
      [-70, 75],
      [-100, 82],
      [-140, 80],
      [-168, 72],
    ],
    true,
  ),
  region('south-america', 'South America', 51, fills[1], [
    [-82, 12],
    [-70, 10],
    [-52, 5],
    [-35, -5],
    [-43, -25],
    [-55, -50],
    [-68, -55],
    [-75, -25],
    [-82, 12],
  ]),
  region(
    'europe',
    'Europe',
    64,
    fills[2],
    [
      [-11, 36],
      [5, 35],
      [22, 40],
      [40, 55],
      [30, 70],
      [10, 72],
      [-10, 58],
      [-11, 36],
    ],
    true,
  ),
  region('africa', 'Africa', 43, fills[3], [
    [-18, 35],
    [15, 37],
    [42, 12],
    [52, -12],
    [35, -35],
    [18, -35],
    [0, -28],
    [-12, 5],
    [-18, 35],
  ]),
  region('asia', 'Asia', 87, fills[4], [
    [35, 35],
    [45, 60],
    [75, 75],
    [120, 72],
    [170, 60],
    [145, 40],
    [120, 20],
    [105, 5],
    [75, 8],
    [55, 25],
    [35, 35],
  ]),
  region('australia', 'Australia', 35, fills[5], [
    [112, -10],
    [154, -10],
    [153, -40],
    [130, -44],
    [112, -25],
    [112, -10],
  ]),
  region(
    'greenland',
    'Greenland',
    22,
    fills[6],
    [
      [-73, 60],
      [-48, 58],
      [-20, 72],
      [-35, 83],
      [-60, 82],
      [-73, 60],
    ],
    true,
  ),
]

const placeShapes: readonly WorldPlace[] = [
  place('san-francisco', 'San Francisco', 42, '#f97316', [-122.42, 37.77]),
  place('new-york', 'New York', 68, '#f43f5e', [-74, 40.71]),
  place('sao-paulo', 'São Paulo', 79, '#a855f7', [-46.63, -23.55]),
  place('london', 'London', 58, '#6366f1', [-0.13, 51.5]),
  place('lagos', 'Lagos', 73, '#0ea5e9', [3.38, 6.52]),
  place('dubai', 'Dubai', 31, '#14b8a6', [55.27, 25.2]),
  place('singapore', 'Singapore', 49, '#22c55e', [103.82, 1.35]),
  place('tokyo', 'Tokyo', 91, '#eab308', [139.69, 35.68]),
  place('sydney', 'Sydney', 37, '#ef4444', [151.21, -33.87]),
]

export const worldSphere: GeoSphere = { type: 'Sphere' }
export const worldGraticule = geoGraticule10()

export function worldRegions(revision = 0): readonly WorldRegion[] {
  if (revision % 2 === 0) return regionShapes
  return regionShapes.map((feature) =>
    feature.properties.id === 'africa'
      ? {
          ...feature,
          properties: {
            ...feature.properties,
            value: 57,
            fill: '#0d9488',
          },
        }
      : feature,
  )
}

export function worldCollection(
  revision = 0,
): ExtendedFeatureCollection<WorldRegion> {
  return {
    type: 'FeatureCollection',
    features: [...worldRegions(revision)],
  }
}

export function worldPlaces(revision = 0): readonly WorldPlace[] {
  if (revision % 2 === 0) return placeShapes
  return placeShapes.map((feature) =>
    feature.properties.id === 'tokyo'
      ? {
          ...feature,
          properties: { ...feature.properties, value: 76 },
        }
      : feature,
  )
}

export function worldRoutes(revision = 0): readonly WorldRoute[] {
  const tokyo: [number, number] =
    revision % 2 === 0 ? [139.69, 35.68] : [103.82, 1.35]
  return [
    route(
      'sf-london',
      'San Francisco to London',
      '#f97316',
      [-122.42, 37.77],
      [-0.13, 51.5],
    ),
    route(
      'new-york-lagos',
      'New York to Lagos',
      '#ec4899',
      [-74, 40.71],
      [3.38, 6.52],
    ),
    route(
      'london-dubai',
      'London to Dubai',
      '#8b5cf6',
      [-0.13, 51.5],
      [55.27, 25.2],
    ),
    route(
      'dubai-tokyo',
      revision % 2 === 0 ? 'Dubai to Tokyo' : 'Dubai to Singapore',
      '#06b6d4',
      [55.27, 25.2],
      tokyo,
    ),
  ]
}

export function equalEarthProjection({
  x,
  y,
  width,
  height,
}: ProjectionBounds): GeoProjection {
  return geoEqualEarth().fitExtent(
    [
      [x, y],
      [x + width, y + height],
    ],
    worldSphere,
  )
}

export function orthographicProjection({
  x,
  y,
  width,
  height,
}: ProjectionBounds): GeoProjection {
  return geoOrthographic()
    .rotate([-20, -15])
    .fitExtent(
      [
        [x, y],
        [x + width, y + height],
      ],
      worldSphere,
    )
}

function region(
  id: WorldRegionProperties['id'],
  name: string,
  value: number,
  fill: string,
  coordinates: [number, number][],
  reverseWinding = false,
): WorldRegion {
  return {
    type: 'Feature',
    id,
    properties: { id, name, value, fill },
    geometry: {
      type: 'Polygon',
      coordinates: [reverseWinding ? [...coordinates].reverse() : coordinates],
    },
  }
}

function place(
  id: WorldPlaceProperties['id'],
  name: string,
  value: number,
  fill: string,
  coordinates: [number, number],
): WorldPlace {
  return {
    type: 'Feature',
    id,
    properties: { id, name, value, fill },
    geometry: { type: 'Point', coordinates },
  }
}

function route(
  id: WorldRouteProperties['id'],
  label: string,
  stroke: string,
  source: [number, number],
  target: [number, number],
): WorldRoute {
  return {
    type: 'Feature',
    id,
    properties: { id, label, stroke },
    geometry: { type: 'LineString', coordinates: [source, target] },
  }
}
