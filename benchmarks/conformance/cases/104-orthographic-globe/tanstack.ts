import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoOrthographic } from 'd3-geo'
import {
  worldGraticule,
  previewWorldGraticule,
  previewWorldLand,
  worldLand,
  worldSphere,
} from '../../shared/fixtures/country-atlas'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      geoShape([worldSphere], {
        projection: {
          type: () => geoOrthographic().rotate([0, -30, 20]),
          fit: 'sphere',
        },
        fill: '#dbeafe',
        stroke: '#64748b',
        strokeWidth: 1.25,
      }),
      geoShape([input.preview ? previewWorldGraticule : worldGraticule], {
        projection: {
          type: () =>
            geoOrthographic()
              .rotate([0, -30, 20])
              .precision(input.preview ? 2 : Math.SQRT1_2),
          fit: 'sphere',
        },
        fill: 'none',
        stroke: '#94a3b8',
        strokeOpacity: 0.5,
        strokeWidth: 0.75,
      }),
      geoShape([input.preview ? previewWorldLand : worldLand], {
        projection: {
          type: () =>
            geoOrthographic()
              .rotate([0, -30, 20])
              .precision(input.preview ? 2 : Math.SQRT1_2),
          fit: 'sphere',
        },
        fill: input.revision % 2 === 0 ? '#22c55e' : '#0d9488',
        fillOpacity: 0.82,
        stroke: '#f8fafc',
        strokeWidth: 0.75,
      }),
    ],
    margin: 10,
  })

export const mount = tanstackMount(
  definition,
  'Orthographic globe with graticule',
)
