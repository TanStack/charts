import * as Plot from '@observablehq/plot'
import { parallelData, parallelMetrics, parallelModels } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = [
  '#2563eb',
  '#ea580c',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#0891b2',
]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = parallelData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Parallel coordinates model comparison',
      x: {
        domain: parallelMetrics,
        label: null,
      },
      y: {
        domain: [0, 100],
        grid: true,
        label: 'Normalized score',
      },
      color: {
        domain: parallelModels,
        range: colors,
        legend: true,
      },
      marks: [
        Plot.line(rows, {
          x: 'metric',
          y: 'score',
          z: 'model',
          stroke: 'model',
          strokeWidth: 1.75,
        }),
        Plot.dot(rows, {
          x: 'metric',
          y: 'score',
          fill: 'model',
          r: 2.75,
        }),
      ],
    })
  })
