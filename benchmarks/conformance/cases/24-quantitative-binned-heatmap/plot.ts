import * as Plot from '@observablehq/plot'
import { quantitativeHeatData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Quantitative two-dimensional binned heatmap',
      x: {
        domain: [0, 80],
        grid: true,
        label: 'Latency',
      },
      y: {
        domain: [0, 80],
        grid: true,
        label: 'Throughput',
      },
      color: {
        type: 'linear',
        domain: [1, 5],
        range: ['#eff6ff', '#1d4ed8'],
        legend: true,
      },
      marks: [
        Plot.rect(quantitativeHeatData(nextInput.revision), {
          ...Plot.bin(
            { fill: 'count' },
            {
              x: { value: 'x', interval: 10, domain: [0, 80] },
              y: { value: 'y', interval: 10, domain: [0, 80] },
            },
          ),
          inset: 0.75,
        }),
      ],
    }),
  )
