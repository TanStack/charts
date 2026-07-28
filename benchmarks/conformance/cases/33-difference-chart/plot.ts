import * as Plot from '@observablehq/plot'
import { differenceData, differenceDomain, formatDifferenceMonth } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

function render(input: ConformanceInput) {
  const rows = differenceData(input.revision)

  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Actual versus forecast difference chart',
    marginTop: 20,
    marginRight: 20,
    marginBottom: 30,
    marginLeft: 40,
    x: {
      type: 'utc',
      domain: differenceDomain,
      ticks: 9,
      tickFormat: formatDifferenceMonth,
      label: null,
    },
    y: { domain: [10, 60], grid: true, ticks: 6, label: null },
    marks: [
      Plot.differenceY(rows, {
        x: 'date',
        y1: 'forecast',
        y2: 'actual',
        positiveFill: '#16a34a',
        negativeFill: '#dc2626',
        fillOpacity: 0.35,
        stroke: '#166534',
        strokeWidth: 2,
      }),
      Plot.lineY(rows, {
        x: 'date',
        y: 'forecast',
        stroke: '#475569',
        strokeWidth: 2,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
