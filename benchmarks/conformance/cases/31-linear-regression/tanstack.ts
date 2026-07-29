import { defineChart, dot, lineY } from '@tanstack/charts'
import { mean } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { scatterData } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface RegressionPoint {
  id: string
  x: number
  y: number
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = scatterData(input.revision)
  const meanX = mean(rows, (row) => row.x) ?? 0
  const meanY = mean(rows, (row) => row.y) ?? 0
  let covariance = 0
  let variance = 0
  for (const row of rows) {
    covariance += (row.x - meanX) * (row.y - meanY)
    variance += (row.x - meanX) ** 2
  }
  const slope = variance === 0 ? 0 : covariance / variance
  const intercept = meanY - slope * meanX
  const trend: readonly RegressionPoint[] = [
    { id: 'start', x: 0, y: intercept },
    { id: 'end', x: 105, y: intercept + slope * 105 },
  ]

  return {
    marks: [
      dot(rows, {
        x: 'x',
        y: 'y',
        key: 'id',
        fill: '#93c5fd',
        stroke: '#2563eb',
        r: 3,
      }),
      lineY(trend, {
        x: 'x',
        y: 'y',
        key: 'id',
        stroke: '#dc2626',
        strokeWidth: 2,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0, 105]),
      grid: true,
      label: 'X',
    },
    y: {
      scale: scaleLinear().domain([0, 90]),
      grid: true,
      label: 'Y',
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Scatterplot with linear regression',
  {
    format: ({ datum }) =>
      'group' in datum
        ? `${datum.group} · X ${datum.x.toLocaleString(
            'en-US',
          )} · Y ${datum.y.toLocaleString('en-US')}`
        : `Regression · X ${datum.x.toLocaleString(
            'en-US',
          )} · predicted Y ${datum.y.toLocaleString('en-US', {
            maximumFractionDigits: 1,
          })}`,
  },
)
