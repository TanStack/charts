import * as Plot from '@observablehq/plot'
import { slopeData } from './data'
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
const colors = [
  '#2563eb',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#ca8a04',
  '#64748b',
]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = slopeData(nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Two-period slopegraph',
      marginRight: 76,
      x: { domain: ['Before', 'After'], label: null },
      y: { domain: [0, 70], grid: true, label: 'Value' },
      color: { domain: categories, range: colors },
      marks: [
        Plot.line(rows, {
          x: 'period',
          y: 'value',
          z: 'category',
          stroke: 'category',
        }),
        Plot.dot(rows, {
          x: 'period',
          y: 'value',
          fill: 'category',
          r: 3,
        }),
        Plot.text(
          rows.filter((row) => row.period === 'After'),
          {
            x: 'period',
            y: 'value',
            text: 'category',
            fill: 'category',
            dx: 6,
            textAnchor: 'start',
          },
        ),
      ],
    })
  })
