import * as Plot from '@observablehq/plot'
import { wind } from '@tanstack/charts-data/wind'
import { sampleWind } from './selection'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

function render(input: ConformanceInput) {
  const sampledWind = sampleWind(wind)
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Two-dimensional vector field',
    x: { grid: true, label: 'Longitude' },
    y: { grid: true, label: 'Latitude' },
    marks: [
      Plot.vector(sampledWind, {
        x: 'longitude',
        y: 'latitude',
        length: (row) => Math.hypot(row.u, row.v) * 1.6,
        rotate: (row) => (Math.atan2(row.u, row.v) * 180) / Math.PI,
        stroke: '#2563eb',
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
