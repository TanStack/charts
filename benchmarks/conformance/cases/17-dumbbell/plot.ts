import * as Plot from '@observablehq/plot'
import { dumbbellData } from './data'
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
    const rows = dumbbellData(nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Desktop and mobile dumbbell comparison',
      x: { domain: [0, 70], grid: true, label: 'Value' },
      y: { domain: categories, label: null },
      marks: [
        Plot.link(rows, {
          x1: 'desktop',
          y1: 'category',
          x2: 'mobile',
          y2: 'category',
          stroke: '#94a3b8',
          strokeWidth: 2,
        }),
        Plot.dot(rows, {
          x: 'desktop',
          y: 'category',
          fill: '#2563eb',
          r: 4,
        }),
        Plot.dot(rows, {
          x: 'mobile',
          y: 'category',
          fill: '#f97316',
          r: 4,
        }),
      ],
    })
  })
