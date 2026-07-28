import * as Plot from '@observablehq/plot'
import { logScatterData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Log-scale scatterplot',
      marginTop: 16,
      marginRight: 20,
      marginBottom: 40,
      marginLeft: 50,
      x: {
        type: 'log',
        domain: [1, 10_000],
        grid: true,
        label: 'Requests per second',
      },
      y: {
        domain: [0, 100],
        grid: true,
        label: 'Latency',
      },
      marks: [
        Plot.dot(logScatterData(nextInput.revision), {
          x: 'x',
          y: 'y',
          r: 3.5,
          fill: '#f97316',
          stroke: '#9a3412',
          strokeWidth: 0.75,
        }),
      ],
    }),
  )
