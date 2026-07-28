import * as Plot from '@observablehq/plot'
import { scatterData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = scatterData(nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Scatterplot with linear regression',
      x: { domain: [0, 105], grid: true, label: 'X' },
      y: { domain: [0, 90], grid: true, label: 'Y' },
      marks: [
        Plot.dot(rows, {
          x: 'x',
          y: 'y',
          fill: '#93c5fd',
          stroke: '#2563eb',
          r: 3,
        }),
        Plot.linearRegressionY(rows, {
          x: 'x',
          y: 'y',
          ci: 0,
          stroke: '#dc2626',
          strokeWidth: 2,
        }),
      ],
    })
  })
