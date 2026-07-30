import * as Plot from '@observablehq/plot'
import { aapl } from '@charts-poc/demo-data/aapl'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { selectBollingerData } from './selection'

const windowSize = 20
const deviationMultiplier = 2

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Twenty-day Apple Bollinger band',
    x: { type: 'utc', label: 'Date' },
    y: {
      grid: true,
      label: 'Apple close (USD)',
    },
    marks: [
      Plot.bollingerY(selectBollingerData(aapl, input.revision), {
        x: 'Date',
        y: 'Close',
        n: windowSize,
        k: deviationMultiplier,
        anchor: 'end',
        strict: true,
        fill: '#7c3aed',
        fillOpacity: 0.18,
        stroke: '#7c3aed',
        strokeWidth: 2.25,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
