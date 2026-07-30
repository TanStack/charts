import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoEqualEarth } from 'd3-geo'
import {
  detailedWorldLand,
  worldGraticule,
  worldSphere,
} from '../../shared/fixtures/country-atlas'
import { beagleRoute } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const routeColors = ['#dc2626', '#2563eb']
const projection = {
  type: () => geoEqualEarth().rotate([-10, 0]),
  fit: 'sphere' as const,
}

const definition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      geoShape([detailedWorldLand], {
        projection,
        fill: '#e2e8f0',
        stroke: '#ffffff',
        strokeWidth: 0.5,
      }),
      geoShape([worldGraticule], {
        projection,
        fill: 'none',
        stroke: 'currentColor',
        strokeOpacity: 0.2,
        strokeWidth: 0.5,
      }),
      geoShape([beagleRoute], {
        projection,
        fill: 'none',
        stroke: routeColors[input.revision % 2] ?? routeColors[0],
        strokeWidth: 2,
        strokeOpacity: 0.9,
      }),
      geoShape([worldSphere], {
        projection,
        fill: 'none',
        stroke: 'currentColor',
        strokeOpacity: 0.4,
        strokeWidth: 0.75,
      }),
    ],
    margin: 10,
  })

export const mount = tanstackMount(definition, 'HMS Beagle voyage')
