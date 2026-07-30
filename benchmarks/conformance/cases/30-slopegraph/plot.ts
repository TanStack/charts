import { citywages } from '@charts-poc/demo-data/citywages'
import * as Plot from '@observablehq/plot'
import { toSlopePoints } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

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
    const rows = toSlopePoints(
      citywages.slice(nextInput.revision * 4, nextInput.revision * 4 + 8),
    )
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Metropolitan wage inequality, 1980 to 2015',
      marginRight: 76,
      x: { label: null },
      y: { grid: true, label: '90th/10th percentile wage ratio' },
      color: { range: colors },
      marks: [
        Plot.line(rows, {
          x: 'year',
          y: 'inequality',
          z: 'nyt_display',
          stroke: 'nyt_display',
          sort: { x: null, color: null },
        }),
        Plot.dot(rows, {
          x: 'year',
          y: 'inequality',
          fill: 'nyt_display',
          r: 3,
        }),
        Plot.text(
          rows.filter((row) => row.year === '2015'),
          {
            x: 'year',
            y: 'inequality',
            text: 'nyt_display',
            fill: 'nyt_display',
            dx: 6,
            textAnchor: 'start',
          },
        ),
      ],
    })
  })
