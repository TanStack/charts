import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
} from 'd3-geo'

export interface RegionProperties {
  name: string
  value: number
  fill: string
}

export type RegionPolygon = Extract<GeoGeometryObjects, { type: 'Polygon' }>
export type RegionFeature = ExtendedFeature<RegionPolygon, RegionProperties> & {
  id: string
}
export type RegionFeatureCollection = ExtendedFeatureCollection<RegionFeature>

const regionShapes: readonly {
  id: string
  name: string
  coordinates: number[][][]
}[] = [
  {
    id: 'northwest',
    name: 'Northwest',
    coordinates: [
      [
        [0, 0],
        [34, 0],
        [32, 30],
        [0, 34],
        [0, 0],
      ],
    ],
  },
  {
    id: 'north',
    name: 'North',
    coordinates: [
      [
        [34, 0],
        [70, 4],
        [67, 34],
        [32, 30],
        [34, 0],
      ],
    ],
  },
  {
    id: 'northeast',
    name: 'Northeast',
    coordinates: [
      [
        [70, 4],
        [105, 0],
        [106, 38],
        [67, 34],
        [70, 4],
      ],
    ],
  },
  {
    id: 'southwest',
    name: 'Southwest',
    coordinates: [
      [
        [0, 34],
        [32, 30],
        [36, 70],
        [5, 76],
        [0, 34],
      ],
    ],
  },
  {
    id: 'central',
    name: 'Central',
    coordinates: [
      [
        [32, 30],
        [67, 34],
        [72, 72],
        [36, 70],
        [32, 30],
      ],
    ],
  },
  {
    id: 'southeast',
    name: 'Southeast',
    coordinates: [
      [
        [67, 34],
        [106, 38],
        [100, 80],
        [72, 72],
        [67, 34],
      ],
    ],
  },
]

const regionValues = [22, 38, 54, 68, 82, 96]
const regionColors = [
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#1d4ed8',
]

export function regionCollection(revision: number): RegionFeatureCollection {
  const offset = revision % regionValues.length
  const features: RegionFeature[] = regionShapes.map((region, index) => {
    const value =
      regionValues[(index + offset) % regionValues.length] ??
      regionValues[0] ??
      0
    return {
      type: 'Feature',
      id: region.id,
      properties: {
        name: region.name,
        value,
        fill: regionColor(value),
      },
      geometry: {
        type: 'Polygon',
        coordinates: region.coordinates,
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function regionColor(value: number): string {
  const index = regionValues.findIndex((candidate) => candidate === value)
  return regionColors[index] ?? '#dbeafe'
}
