import * as Plot from '@observablehq/plot'
import {
  detailedWorldLand,
  worldGraticule,
  worldSphere,
} from '@tanstack/charts-data/country-atlas'
import { beagleRoute } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const routeColors = ['#dc2626', '#2563eb']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 10,
      ariaLabel: 'HMS Beagle voyage',
      projection: {
        type: 'equal-earth',
        rotate: [-10, 0],
        domain: worldSphere,
        clip: false,
      },
      marks: [
        Plot.geo([detailedWorldLand], {
          fill: '#e2e8f0',
          stroke: '#ffffff',
          strokeWidth: 0.5,
        }),
        Plot.geo([worldGraticule], {
          fill: 'none',
          stroke: 'currentColor',
          strokeOpacity: 0.2,
          strokeWidth: 0.5,
        }),
        Plot.geo([beagleRoute], {
          fill: 'none',
          stroke: routeColors[nextInput.revision % 2] ?? routeColors[0],
          strokeWidth: 2,
          strokeOpacity: 0.9,
        }),
        Plot.geo([worldSphere], {
          fill: 'none',
          stroke: 'currentColor',
          strokeOpacity: 0.4,
          strokeWidth: 0.75,
        }),
      ],
    }),
  )
