import * as Plot from '@observablehq/plot'
import { aapl } from '@tanstack/charts-data/aapl'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

interface ReferencePoint {
  PreviousClose: number
  Close: number
}

const observations = aapl.slice(-120)
const closeDomain: readonly [number, number] = [150, 195]
const identity: readonly ReferencePoint[] = [
  { PreviousClose: closeDomain[0], Close: closeDomain[0] },
  { PreviousClose: closeDomain[1], Close: closeDomain[1] },
]

function previous(values: number[]): number[] {
  return values.map((_, index) => values[index - 1] ?? Number.NaN)
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Lag-one autocorrelation of Apple closing prices',
      x: {
        domain: closeDomain,
        nice: false,
        grid: true,
        label: 'Previous close (USD)',
      },
      y: {
        domain: closeDomain,
        nice: false,
        grid: true,
        label: 'Current close (USD)',
      },
      marks: [
        Plot.lineY(identity, {
          x: 'PreviousClose',
          y: 'Close',
          stroke: '#94a3b8',
          strokeDasharray: '5,4',
        }),
        Plot.dot(
          observations,
          Plot.mapX(previous, {
            x: 'Close',
            y: 'Close',
            fill: '#7c3aed',
            fillOpacity: 0.78,
            r: 4,
          }),
        ),
      ],
    })
  })
