import { citywages } from '@tanstack/charts-data/citywages'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = citywages.slice(
      nextInput.revision * 4,
      nextInput.revision * 4 + 8,
    )
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Metropolitan wage inequality in 1980 and 2015',
      marginLeft: 112,
      x: { grid: true, label: '90th/10th percentile wage ratio' },
      y: { label: null },
      marks: [
        Plot.link(rows, {
          x1: 'R90_10_1980',
          y1: 'nyt_display',
          x2: 'R90_10_2015',
          y2: 'nyt_display',
          stroke: '#94a3b8',
          strokeWidth: 2,
        }),
        Plot.dot(rows, {
          x: 'R90_10_1980',
          y: 'nyt_display',
          fill: '#2563eb',
          r: 4,
        }),
        Plot.dot(rows, {
          x: 'R90_10_2015',
          y: 'nyt_display',
          fill: '#f97316',
          r: 4,
        }),
      ],
    })
  })
