import * as Plot from '@observablehq/plot'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { timeDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import { temperatureRangeData, temperatureValueDomain } from './data'

function render(input: ConformanceInput) {
  const rows = temperatureRangeData(input.revision)

  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Weekly low-to-high temperature range',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: temperatureValueDomain,
      nice: false,
      grid: true,
      label: 'Temperature (°F)',
    },
    marks: [
      Plot.areaY(rows, {
        x: 'date',
        y1: 'low',
        y2: 'high',
        fill: '#60a5fa',
        fillOpacity: 0.24,
      }),
      Plot.lineY(rows, {
        x: 'date',
        y: 'low',
        stroke: '#2563eb',
        strokeWidth: 1.75,
      }),
      Plot.lineY(rows, {
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
