import {
  geoEqualEarth,
  geoEquirectangular,
  geoMercator,
  geoNaturalEarth1,
} from 'd3-geo'
import type { GeoProjection } from 'd3-geo'

export type ProjectionGalleryId =
  'equal-earth' | 'natural-earth' | 'mercator' | 'equirectangular'

export interface ProjectionGalleryDatum {
  id: ProjectionGalleryId
  create: () => GeoProjection
}

const projections: readonly ProjectionGalleryDatum[] = [
  {
    id: 'equal-earth',
    create: geoEqualEarth,
  },
  {
    id: 'natural-earth',
    create: geoNaturalEarth1,
  },
  {
    id: 'mercator',
    create: geoMercator,
  },
  {
    id: 'equirectangular',
    create: geoEquirectangular,
  },
]

export function projectionGalleryData(): readonly ProjectionGalleryDatum[] {
  return projections
}
