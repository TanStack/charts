import { penguins } from '@charts-poc/demo-data/penguins'
import * as Plot from '@observablehq/plot'
import { summarizeErrorBars } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = summarizeErrorBars(penguins.slice(nextInput.revision * 8))
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Point estimates with error bars',
      x: { label: null },
      y: { grid: true, label: 'Body mass (g)' },
      marks: [
        Plot.ruleX(rows, {
          x: 'species',
          y1: 'low',
          y2: 'high',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        Plot.tickY(rows, {
          x: 'species',
          y: 'low',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        Plot.tickY(rows, {
          x: 'species',
          y: 'high',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        Plot.dot(rows, {
          x: 'species',
          y: 'mean',
          fill: '#2563eb',
          r: 3.5,
        }),
      ],
    })
  })
