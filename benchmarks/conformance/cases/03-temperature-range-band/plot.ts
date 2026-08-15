import * as Plot from '@observablehq/plot'
import { sfTemperatures } from '@tanstack/charts-data/sf-temperatures'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'San Francisco daily low-to-high temperature range',
    x: { type: 'utc', label: 'Week' },
    y: {
      grid: true,
      label: 'Temperature (°F)',
    },
    marks: [
      Plot.areaY(sfTemperatures, {
        x: 'date',
        y1: 'low',
        y2: 'high',
        fill: '#60a5fa',
        fillOpacity: 0.24,
      }),
      Plot.lineY(sfTemperatures, {
        x: 'date',
        y: 'low',
        stroke: '#2563eb',
        strokeWidth: 1.75,
      }),
      Plot.lineY(sfTemperatures, {
        x: 'date',
        y: 'high',
        stroke: '#dc2626',
        strokeWidth: 1.75,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
