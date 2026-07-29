import {
  geoEqualEarth,
  geoEquirectangular,
  geoMercator,
  geoNaturalEarth1,
} from 'd3-geo'
import { countrySphere } from '../108-country-choropleth/atlas-data'
import type { GeoProjection } from 'd3-geo'

export interface ProjectionGalleryDatum {
  id: 'equal-earth' | 'natural-earth' | 'mercator' | 'equirectangular'
  label: string
  fill: string
  create: () => GeoProjection
}

export interface ProjectionPane {
  x: number
  y: number
  width: number
  height: number
}

const definitions = [
  {
    id: 'equal-earth',
    label: 'Equal Earth',
    create: geoEqualEarth,
    fills: ['#2563eb', '#1d4ed8'],
  },
  {
    id: 'natural-earth',
    label: 'Natural Earth',
    create: geoNaturalEarth1,
    fills: ['#7c3aed', '#6d28d9'],
  },
  {
    id: 'mercator',
    label: 'Mercator',
    create: geoMercator,
    fills: ['#0891b2', '#0e7490'],
  },
  {
    id: 'equirectangular',
    label: 'Equirectangular',
    create: geoEquirectangular,
    fills: ['#ea580c', '#c2410c'],
  },
] as const

export function projectionGalleryData(
  revision = 0,
): readonly ProjectionGalleryDatum[] {
  const fillIndex = revision % 2
  return definitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    create: definition.create,
    fill: definition.fills[fillIndex] ?? definition.fills[0],
  }))
}

export function projectionPane(
  bounds: ProjectionPane,
  index: number,
): ProjectionPane {
  const leftWidth = Math.floor(bounds.width / 2)
  const topHeight = Math.floor(bounds.height / 2)
  const column = index % 2
  const row = Math.floor(index / 2)
  const width = column === 0 ? leftWidth : bounds.width - leftWidth
  const height = row === 0 ? topHeight : bounds.height - topHeight

  return {
    x: bounds.x + (column === 0 ? 0 : leftWidth),
    y: bounds.y + (row === 0 ? 0 : topHeight),
    width,
    height,
  }
}

export function fitGalleryProjection(
  projection: GeoProjection,
  { x, y, width, height }: ProjectionPane,
  inset = 8,
): GeoProjection {
  return projection.fitExtent(
    [
      [x + inset, y + inset],
      [x + width - inset, y + height - inset],
    ],
    countrySphere,
  )
}
