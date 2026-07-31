import { defineChart, link } from '@tanstack/charts'
import { aapl } from '@charts-poc/demo-data/aapl'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { selectCandleData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const candleDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const price = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const definition = (input: ConformanceInput) => {
  const rows = selectCandleData(aapl, input.revision)
  const gains = rows.filter((row) => row.Close >= row.Open)
  const losses = rows.filter((row) => row.Close < row.Open)
  return defineChart({
    marks: [
      link(rows, {
        x1: 'Date',
        y1: 'Low',
        x2: 'Date',
        y2: 'High',
        stroke: '#64748b',
        strokeWidth: 1,
      }),
      link(gains, {
        x1: 'Date',
        y1: 'Open',
        x2: 'Date',
        y2: 'Close',
        stroke: '#10b981',
        strokeWidth: 5,
      }),
      link(losses, {
        x1: 'Date',
        y1: 'Open',
        x2: 'Date',
        y2: 'Close',
        stroke: '#ef4444',
        strokeWidth: 5,
      }),
    ],
    x: { scale: scaleUtc },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Price' } },
  })
}

export const mount = tanstackMount(
  definition,
  'Apple daily candlestick chart',
  {
    format: (point) =>
      `${candleDate.format(point.datum.Date)} · Open: ${price.format(point.datum.Open)} · High: ${price.format(point.datum.High)} · Low: ${price.format(point.datum.Low)} · Close: ${price.format(point.datum.Close)}`,
  },
)
