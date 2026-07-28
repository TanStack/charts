import * as Plot from '@observablehq/plot'
import { waterfallData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const labels = [
  'Revenue',
  'Services',
  'Returns',
  'Infrastructure',
  'People',
  'Other',
  'Net',
]
const kinds = ['increase', 'decrease', 'total']
const colors = ['#10b981', '#ef4444', '#2563eb']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Contribution waterfall chart',
      x: { domain: labels, label: null },
      y: { domain: [0, 130], grid: true, label: 'Amount' },
      color: { domain: kinds, range: colors, legend: true },
      marks: [
        Plot.barY(waterfallData(nextInput.revision), {
          x: 'label',
          y1: 'start',
          y2: 'end',
          fill: 'kind',
          inset: 1,
        }),
        Plot.ruleY([0]),
      ],
    }),
  )
