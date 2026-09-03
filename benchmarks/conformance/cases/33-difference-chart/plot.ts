import { aapl } from '@tanstack/charts-data/aapl'
import * as Plot from '@observablehq/plot'
import { formatDifferenceMonth } from './model'
import { rollingCloseAverage } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

function render(input: ConformanceInput) {
  const rows = rollingCloseAverage(
    aapl.slice(input.revision * 10, input.revision * 10 + 120),
    20,
  )

  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Apple closing price versus its twenty-day average',
    marginTop: 20,
    marginRight: 20,
    marginBottom: 30,
    marginLeft: 80,
    x: {
      type: 'utc',
      ticks: 9,
      tickFormat: formatDifferenceMonth,
      label: null,
    },
    y: { grid: true, ticks: 6, label: null },
    marks: [
      Plot.differenceY(rows, {
        x: 'Date',
        y1: 'average',
        y2: 'Close',
        positiveFill: '#16a34a',
        negativeFill: '#dc2626',
        fillOpacity: 0.35,
        stroke: '#166534',
        strokeWidth: 2,
      }),
      Plot.lineY(rows, {
        x: 'Date',
        y: 'average',
        stroke: '#475569',
        strokeWidth: 2,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
