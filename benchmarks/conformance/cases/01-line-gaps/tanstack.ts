import { aapl } from '@charts-poc/demo-data/aapl'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'

const definition = (input: ConformanceInput) => {
  const rows = aapl.slice(Math.abs(input.revision) % 2)

  return defineChart({
    marks: [
      lineY(rows, {
        x: 'Date',
        y: (row) => (row.Date.getUTCMonth() < 3 ? null : row.Close),
        stroke: '#2563eb',
        strokeWidth: 2.25,
      }),
    ],
    x: {
      scale: scaleUtc,
      label: 'Week',
    },
    y: {
      scale: scaleLinear,
      label: 'Close (USD)',
      grid: true,
    },
  })
}

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Apple closing price with first-quarter gaps',
)
