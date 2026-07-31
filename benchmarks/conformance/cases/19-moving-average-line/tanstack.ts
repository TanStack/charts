import { defineChart, lineY, ruleY, window } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { sfTemperatures } from '@charts-poc/demo-data/sf-temperatures'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

const windowSize = 14

const definition = (_input: ConformanceInput) => {
  const rows = window(sfTemperatures, {
    size: windowSize,
    partial: false,
    outputs: {
      high: { value: 'high', reduce: 'mean' },
      low: { value: 'low', reduce: 'mean' },
    },
  })

  return defineChart({
    marks: [
      lineY(rows, {
        x: ({ datum }) => datum.date,
        y: 'low',
        stroke: '#4e79a7',
        strokeWidth: 2.25,
      }),
      lineY(rows, {
        x: ({ datum }) => datum.date,
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

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Fourteen-day average high and low temperature in San Francisco',
)
