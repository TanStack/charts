import * as Plot from '@observablehq/plot'
import { sfTemperatures } from '@tanstack/charts-data/sf-temperatures'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

const windowSize = 14

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Fourteen-day average high and low temperature in San Francisco',
    x: { type: 'utc', label: 'Date' },
    y: {
      grid: true,
      label: 'Fourteen-day average temperature (°F)',
    },
    marks: [
      Plot.line(
        sfTemperatures,
        Plot.windowY(windowSize, {
          x: 'date',
          y: 'low',
          strict: true,
          anchor: 'end',
          stroke: '#4e79a7',
          strokeWidth: 2.25,
        }),
      ),
      Plot.line(
        sfTemperatures,
        Plot.windowY(windowSize, {
          x: 'date',
          y: 'high',
          strict: true,
          anchor: 'end',
          stroke: '#e15759',
          strokeWidth: 2.25,
        }),
      ),
      Plot.ruleY([32], {
        stroke: '#64748b',
        strokeDasharray: '4 4',
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
