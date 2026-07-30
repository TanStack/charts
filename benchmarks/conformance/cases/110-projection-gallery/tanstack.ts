import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { worldLand, worldSphere } from '../../shared/fixtures/country-atlas'
import {
  fitGalleryProjection,
  projectionGalleryData,
  projectionPane,
} from './projection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const projectionColors = [
  ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'],
  ['#1d4ed8', '#6d28d9', '#0e7490', '#c2410c'],
]

const definition = (input: ConformanceInput) => {
  const projections = projectionGalleryData()

  return defineChart({
    marks: projections.flatMap((entry, index) => [
      geoShape([worldSphere], {
        projection: ({ chart }) =>
          fitGalleryProjection(entry.create(), projectionPane(chart, index)),
        fill: 'none',
        stroke: 'currentColor',
        strokeOpacity: 0.5,
        strokeWidth: 0.8,
      }),
      geoShape([worldLand], {
        projection: ({ chart }) =>
          fitGalleryProjection(entry.create(), projectionPane(chart, index)),
        color: () => entry.id,
        fillOpacity: 0.78,
        stroke: 'currentColor',
        strokeOpacity: 0.28,
        strokeWidth: 0.45,
      }),
    ]),
    color: {
      range: projectionColors[input.revision % 2] ?? projectionColors[0],
    },
    margin: 0,
  })
}

export const mount = tanstackMount(
  definition,
  'Standard world projection gallery',
)
