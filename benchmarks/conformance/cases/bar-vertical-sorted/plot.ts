import { alphabet } from '@tanstack/charts-data/alphabet'
import * as Plot from '@observablehq/plot'
import type { ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Sorted vertical bars',
      x: {
        label: null,
      },
      y: {
        grid: true,
        label: 'Frequency',
        percent: true,
      },
      marks: [
        Plot.barY(alphabet, {
          x: 'letter',
          y: 'frequency',
          fill: '#2563eb',
          inset: 1,
          sort: {
            x: '-y',
          },
        }),
      ],
    })
  })
