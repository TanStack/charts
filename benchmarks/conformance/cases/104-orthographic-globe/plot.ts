import * as Plot from '@observablehq/plot'
import {
  worldGraticule,
  worldLand,
  worldSphere,
} from '@tanstack/charts-data/country-atlas'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const margin = 10

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin,
      ariaLabel: 'Orthographic globe with graticule',
      projection: {
        type: 'orthographic',
        rotate: [0, -30, 20],
        domain: worldSphere,
        clip: false,
      },
      marks: [
        Plot.geo([worldSphere], {
          fill: '#dbeafe',
          stroke: '#64748b',
          strokeWidth: 1.25,
        }),
        Plot.geo([worldGraticule], {
          fill: 'none',
          stroke: '#94a3b8',
          strokeOpacity: 0.5,
          strokeWidth: 0.75,
        }),
        Plot.geo([worldLand], {
          fill: nextInput.revision % 2 === 0 ? '#22c55e' : '#0d9488',
          fillOpacity: 0.82,
          stroke: '#f8fafc',
          strokeWidth: 0.75,
        }),
      ],
    }),
  )
