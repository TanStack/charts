import * as Plot from '@observablehq/plot'
import { errorData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const categories = [
  'Query',
  'Router',
  'Table',
  'Form',
  'Start',
  'Virtual',
  'Store',
  'DB',
]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = errorData(nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Point estimates with error bars',
      x: { domain: categories, label: null },
      y: { domain: [0, 70], grid: true, label: 'Estimate' },
      marks: [
        Plot.ruleX(rows, {
          x: 'category',
          y1: 'low',
          y2: 'high',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        Plot.tickY(rows, {
          x: 'category',
          y: 'low',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        Plot.tickY(rows, {
          x: 'category',
          y: 'high',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        Plot.dot(rows, {
          x: 'category',
          y: 'mean',
          fill: '#2563eb',
          r: 3.5,
        }),
      ],
    })
  })
