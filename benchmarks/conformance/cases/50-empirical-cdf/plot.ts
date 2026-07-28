import * as Plot from '@observablehq/plot'
import { rank } from 'd3-array'
import { distributionData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

function empiricalProbability(values: number[]) {
  const ranks = rank(values)
  return Array.from(ranks, (value) => (value + 1) / values.length)
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = [...distributionData(nextInput.revision)].sort(
      (left, right) => left.value - right.value,
    )

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Empirical cumulative distribution',
      x: {
        domain: [20, 90],
        grid: true,
        label: 'Observed value',
      },
      y: {
        domain: [0, 100],
        grid: true,
        label: 'Cumulative proportion',
        percent: true,
      },
      marks: [
        Plot.lineY(
          rows,
          Plot.mapY(empiricalProbability, {
            x: 'value',
            y: 'value',
            curve: 'step-after',
            stroke: '#2563eb',
            strokeWidth: 2,
          }),
        ),
      ],
    })
  })
