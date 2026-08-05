import { aapl } from '@charts-poc/demo-data/aapl'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import type { ConformanceInput } from '../../types'
import { tanstackMount } from '../../shared/mount'
import { samplePreviewData } from '../../shared/preview'

const definition = (input: ConformanceInput) => {
  const rows = samplePreviewData(
    aapl.slice(Math.abs(input.revision) % 2),
    input,
    80,
    [(row) => row.Date.getTime(), (row) => row.Close],
  )

  return defineChart({
    marks: [
      lineY(rows, {
        x: 'Date',
        y: (row) => (row.Date.getUTCMonth() < 3 ? null : row.Close),
        stroke: '#2563eb',
        strokeWidth: 2.25,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Week' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Close (USD)' } },
  })
}

export const mount = tanstackMount(
  definition,
  'Apple closing price with first-quarter gaps',
)
