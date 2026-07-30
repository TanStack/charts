import { defineChart, lineY, ruleY } from '@tanstack/charts'
import { mean } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { sfTemperatures } from '@charts-poc/demo-data/sf-temperatures'
import type { SfTemperaturesRow } from '@charts-poc/demo-data/sf-temperatures'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

const windowSize = 14

const definition = (_input: ConformanceInput) => {
  const rows = trailingMeans(sfTemperatures)

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
    x: {
      scale: scaleUtc,
      label: 'Date',
    },
    y: {
      scale: scaleLinear,
      grid: true,
      label: 'Fourteen-day average temperature (°F)',
    },
  })
}

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Fourteen-day average high and low temperature in San Francisco',
)

function trailingMeans(
  rows: readonly SfTemperaturesRow[],
): readonly SfTemperaturesRow[] {
  const output: SfTemperaturesRow[] = []

  for (let index = windowSize - 1; index < rows.length; index++) {
    const row = rows[index]
    if (!row) continue
    const window = rows.slice(index - windowSize + 1, index + 1)
    const high = mean(window, (point) => point.high)
    const low = mean(window, (point) => point.low)
    if (high === undefined || low === undefined) continue
    output.push({ date: row.date, high, low })
  }

  return output
}
