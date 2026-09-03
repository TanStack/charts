import { cars } from '@tanstack/charts-data/cars'
import * as Plot from '@observablehq/plot'
import { rank } from 'd3-array'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

function empiricalProbability(values: number[]) {
  const ranks = rank(values)
  return Array.from(ranks, (value) => (value + 1) / values.length)
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = cars
      .filter((row) => row['economy (mpg)'] !== null)
      .slice(nextInput.revision * 8)
      .sort(
        (left, right) =>
          (left['economy (mpg)'] ?? 0) - (right['economy (mpg)'] ?? 0),
      )

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Empirical cumulative distribution',
      x: { grid: true, label: 'Fuel economy (mpg)' },
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
            x: 'economy (mpg)',
            y: 'economy (mpg)',
            curve: 'step-after',
            stroke: '#2563eb',
            strokeWidth: 2,
          }),
        ),
      ],
    })
  })
