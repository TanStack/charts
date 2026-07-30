import {
  geoEqualEarth,
  geoEquirectangular,
  geoMercator,
  geoNaturalEarth1,
} from 'd3-geo'
import { worldSphere } from '../../shared/fixtures/country-atlas'
import type { GeoProjection } from 'd3-geo'

export type ProjectionGalleryId =
  'equal-earth' | 'natural-earth' | 'mercator' | 'equirectangular'

interface ProjectionGalleryDefinition {
  id: ProjectionGalleryId
  label: string
}

export interface ProjectionGalleryDatum {
  id: ProjectionGalleryId
  label: string
  create: () => GeoProjection
}

export interface ProjectionPane {
  x: number
  y: number
  width: number
  height: number
}

const projectionGalleryDefinitions: readonly ProjectionGalleryDefinition[] = [
  {
    id: 'equal-earth',
    label: 'Equal Earth',
  },
  {
    id: 'natural-earth',
    label: 'Natural Earth',
  },
  {
    id: 'mercator',
    label: 'Mercator',
  },
  {
    id: 'equirectangular',
    label: 'Equirectangular',
  },
]

export function projectionGalleryData(): readonly ProjectionGalleryDatum[] {
  return projectionGalleryDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    create: projectionFactory(definition.id),
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
    worldSphere,
  )
}

function projectionFactory(id: ProjectionGalleryId): () => GeoProjection {
  switch (id) {
    case 'equal-earth':
      return geoEqualEarth
    case 'natural-earth':
      return geoNaturalEarth1
    case 'mercator':
      return geoMercator
    case 'equirectangular':
      return geoEquirectangular
  }
}
