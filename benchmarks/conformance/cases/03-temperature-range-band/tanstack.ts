import { areaY, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { timeDomain } from '../../shared/data'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'
import { temperatureRangeData, temperatureValueDomain } from './data'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = temperatureRangeData(input.revision)

    return {
      marks: [
        areaY(rows, {
          id: 'temperature-band',
          x: 'date',
          y1: 'low',
          y2: 'high',
          key: 'id',
          fill: '#60a5fa',
          fillOpacity: 0.24,
        }),
        lineY(rows, {
          id: 'temperature-low',
          x: 'date',
          y: 'low',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 1.75,
        }),
        lineY(rows, {
          id: 'temperature-high',
          x: 'date',
          y: 'high',
          key: 'id',
          stroke: '#dc2626',
          strokeWidth: 1.75,
        }),
      ],
      x: {
        scale: scaleUtc().domain(timeDomain),
        label: 'Week',
      },
      y: {
        scale: scaleLinear().domain(temperatureValueDomain),
        label: 'Temperature (°F)',
        grid: true,
      },
    }
  })

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Weekly low-to-high temperature range',
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
