import * as Plot from '@observablehq/plot'
import { citywages } from '@charts-poc/demo-data/citywages'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const metroChanges = citywages.filter(
  (row) =>
    row.highlight === 1 ||
    row.R90_10_2015 < row.R90_10_1980 ||
    row.nyt_display === 'Los Angeles',
)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const increases = metroChanges.filter(
      (row) => row.R90_10_2015 >= row.R90_10_1980,
    )
    const decreases = metroChanges.filter(
      (row) => row.R90_10_2015 < row.R90_10_1980,
    )
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Metro population and wage inequality, 1980–2015',
      x: { grid: true, label: 'Log₁₀ population' },
      y: { grid: true, label: '90th-to-10th-percentile wage ratio' },
      marks: [
        Plot.arrow(increases, {
          x1: 'LPOP_1980',
          y1: 'R90_10_1980',
          x2: 'LPOP_2015',
          y2: 'R90_10_2015',
          stroke: '#ef4444',
          headLength: 8,
        }),
        Plot.arrow(decreases, {
          x1: 'LPOP_1980',
          y1: 'R90_10_1980',
          x2: 'LPOP_2015',
          y2: 'R90_10_2015',
          stroke: '#10b981',
          headLength: 8,
        }),
      ],
    })
  })
