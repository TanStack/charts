import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import {
  orthographicProjection,
  worldCollection,
  worldGraticule,
  worldSphere,
} from '../102-world-choropleth/geo-data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [
    geoShape([worldSphere], {
      projection: ({ chart }) => orthographicProjection(chart),
      fill: '#dbeafe',
      stroke: '#64748b',
      strokeWidth: 1.25,
    }),
    geoShape([worldGraticule], {
      projection: ({ chart }) => orthographicProjection(chart),
      fill: 'none',
      stroke: '#94a3b8',
      strokeOpacity: 0.5,
      strokeWidth: 0.75,
    }),
    geoShape([worldCollection(input.revision)], {
      projection: ({ chart }) => orthographicProjection(chart),
      fill: input.revision % 2 === 0 ? '#22c55e' : '#0d9488',
      fillOpacity: 0.82,
      stroke: '#f8fafc',
      strokeWidth: 0.75,
    }),
  ],
  x: null,
  y: null,
  guides: false,
  margin: 10,
}))

export const mount = tanstackMount(
  definition,
  'Orthographic globe with graticule',
)
