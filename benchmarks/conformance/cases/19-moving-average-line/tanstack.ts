import { defineChart, lineY, ruleY, window } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { sfTemperatures } from '@charts-poc/demo-data/sf-temperatures'
import { tanstackMount } from '../../shared/mount'
import { samplePreviewData } from '../../shared/preview'
import type { ConformanceInput } from '../../types'

const windowSize = 14

const definition = (input: ConformanceInput) => {
  const completeRows = window(sfTemperatures, {
    size: windowSize,
    partial: false,
    outputs: {
      high: { value: 'high', reduce: 'mean' },
      low: { value: 'low', reduce: 'mean' },
    },
  })
  const rows = samplePreviewData(completeRows, input, 80, [
    (row) => row.date.getTime(),
    (row) => row.low,
    (row) => row.high,
  ])

  return defineChart({
    marks: [
      lineY(rows, {
        x: 'date',
        y: 'low',
        stroke: '#4e79a7',
        strokeWidth: 2.25,
      }),
      lineY(rows, {
        x: 'date',
        y: 'high',
        stroke: '#e15759',
        strokeWidth: 2.25,
      }),
      ruleY([32], {
        stroke: '#64748b',
        strokeDasharray: '4 4',
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Date' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Fourteen-day average temperature (°F)' },
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Fourteen-day average high and low temperature in San Francisco',
)
