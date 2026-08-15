import * as Plot from '@observablehq/plot'
import { morley } from '@tanstack/charts-data/morley'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Grouped boxplots',
      x: { label: 'Experiment' },
      y: { grid: true, label: 'Speed of light (km/s minus 299,000)' },
      marks: [
        Plot.boxY(morley, {
          x: 'Expt',
          y: 'Speed',
          fill: '#bfdbfe',
          stroke: '#2563eb',
        }),
      ],
    }),
  )
