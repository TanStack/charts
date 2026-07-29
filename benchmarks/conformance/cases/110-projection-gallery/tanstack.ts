import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import {
  countryCollection,
  countrySphere,
} from '../108-country-choropleth/atlas-data'
import {
  fitGalleryProjection,
  projectionGalleryData,
  projectionPane,
} from './projection-data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const countries = countryCollection(input.revision)
  const projections = projectionGalleryData(input.revision)

  return {
    marks: projections.flatMap((entry, index) => [
      geoShape([countrySphere], {
        id: `${entry.id}-sphere`,
        projection: ({ chart }) =>
          fitGalleryProjection(entry.create(), projectionPane(chart, index)),
        fill: 'none',
        stroke: 'currentColor',
        strokeOpacity: 0.5,
        strokeWidth: 0.8,
      }),
      geoShape([countries], {
        id: `${entry.id}-countries`,
        projection: ({ chart }) =>
          fitGalleryProjection(entry.create(), projectionPane(chart, index)),
        fill: entry.fill,
        fillOpacity: 0.78,
        stroke: 'currentColor',
        strokeOpacity: 0.28,
        strokeWidth: 0.45,
      }),
    ]),
    x: null,
    y: null,
    guides: false,
    margin: 0,
  }
})

export const mount = tanstackMount(
  definition,
  'Standard world projection gallery',
)
