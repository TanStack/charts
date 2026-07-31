import { areaY, defineChart, lineY } from '@tanstack/charts'
import { sfTemperatures } from '@charts-poc/demo-data/sf-temperatures'
import { scaleLinear, scaleUtc } from 'd3-scale'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'

const definition = (input: ConformanceInput) => {
  return defineChart({
    marks: [
      areaY(sfTemperatures, {
        x: 'date',
        y1: 'low',
        y2: 'high',
        fill: '#60a5fa',
        fillOpacity: 0.24,
      }),
      lineY(sfTemperatures, {
        x: 'date',
        y: 'low',
        stroke: '#2563eb',
        strokeWidth: 1.75,
      }),
      lineY(sfTemperatures, {
        x: 'date',
        y: 'high',
        stroke: '#dc2626',
        strokeWidth: 1.75,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Week' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Temperature (°F)' } },
  })
}

export const mount: ConformanceMount = tanstackMount(
  definition,
  'San Francisco daily low-to-high temperature range',
  {
    format: ({ datum }) =>
      `${datum.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })} · ${datum.low.toLocaleString('en-US', {
        maximumFractionDigits: 1,
      })}–${datum.high.toLocaleString('en-US', {
        maximumFractionDigits: 1,
      })} °F`,
  },
)
