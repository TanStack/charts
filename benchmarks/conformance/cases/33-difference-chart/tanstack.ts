import { aapl } from '@charts-poc/demo-data/aapl'
import { defineChart, differenceY, rollingWindow } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { formatDifferenceMonth } from './model'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

export const differenceRows = (input: ConformanceInput) =>
  rollingWindow(aapl.slice(input.revision * 10, input.revision * 10 + 120), {
    size: 20,
    orderBy: 'Date',
    anchor: 'end',
    partial: false,
    outputs: {
      average: { value: 'Close', reduce: 'mean' },
    },
  })

export const differenceDefinition = (input: ConformanceInput) => {
  const rows = differenceRows(input)

  return defineChart({
    marks: [
      differenceY(rows, {
        id: 'difference',
        x: 'Date',
        y1: 'average',
        y2: 'Close',
        positiveFill: '#16a34a',
        negativeFill: '#dc2626',
        fillOpacity: 0.35,
        stroke: '#166534',
        strokeWidth: 2,
        comparisonStroke: '#475569',
        comparisonStrokeWidth: 2,
      }),
    ],
    x: {
      scale: scaleUtc,
      axis: { ticks: { count: 9, format: formatDifferenceMonth } },
    },
    y: { scale: scaleLinear, grid: true, axis: { ticks: { count: 6 } } },
    margin: { top: 20, right: 20, bottom: 30, left: 80 },
  })
}

export const mount = tanstackMount(
  differenceDefinition,
  'Apple closing price versus its twenty-day average',
)
