import { citywages } from '@charts-poc/demo-data/citywages'
import { defineChart, dot, lineY, text } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { toSlopePoints } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

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

const definition = (input: ConformanceInput) => {
  const rows = toSlopePoints(
    citywages.slice(input.revision * 4, input.revision * 4 + 8),
  )
  const labels = rows.filter((row) => row.year === '2015')
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'year',
        y: 'inequality',
        color: 'nyt_display',
      }),
      dot(rows, {
        x: 'year',
        y: 'inequality',
        color: 'nyt_display',
        r: 3,
      }),
      text(labels, {
        x: 'year',
        y: 'inequality',
        text: 'nyt_display',
        color: 'nyt_display',
        dx: 6,
        anchor: 'start',
      }),
    ],
    x: {
      scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.08),
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: '90th/10th percentile wage ratio' },
    },
    color: {
      range: colors,
    },
    margin: { right: 76 },
  })
}

export const mount = tanstackMount(
  definition,
  'Metropolitan wage inequality, 1980 to 2015',
)
