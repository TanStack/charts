import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'
import { autocorrelationData, autocorrelationDomain } from './data'

interface ReferencePoint {
  id: string
  lag: number
  current: number
}

const identity: readonly ReferencePoint[] = [
  { id: 'start', lag: 20, current: 20 },
  { id: 'end', lag: 90, current: 90 },
]

function previous(values: number[]): number[] {
  return values.map((_, index) => values[index - 1] ?? Number.NaN)
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = autocorrelationData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Lag-one autocorrelation scatterplot',
      x: {
        domain: autocorrelationDomain,
        nice: false,
        grid: true,
        label: 'Previous observation',
      },
      y: {
        domain: autocorrelationDomain,
        nice: false,
        grid: true,
        label: 'Current observation',
      },
      marks: [
        Plot.lineY(identity, {
          x: 'lag',
          y: 'current',
          stroke: '#94a3b8',
          strokeDasharray: '5,4',
        }),
        Plot.dot(
          rows,
          Plot.mapX(previous, {
            x: 'value',
            y: 'value',
            fill: '#7c3aed',
            fillOpacity: 0.78,
            r: 4,
          }),
        ),
      ],
    })
  })
