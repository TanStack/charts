import { defineChart, lineY, text } from '@tanstack/charts'
import { group } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'
import { selectMultiLineData } from './selection'
import type { MultiLineDatum } from './selection'

const colors = ['#2563eb', '#ea580c', '#059669']

const definition = (input: ConformanceInput) => {
  const rows = selectMultiLineData(industries, input.revision)
  const endpoints = lastBySeries(rows)

  return defineChart({
    marks: [
      lineY(rows, {
        x: 'date',
        y: 'unemployed',
        color: 'industry',
        strokeWidth: 2.25,
      }),
      text(endpoints, {
        x: 'date',
        y: 'unemployed',
        text: 'industry',
        color: 'industry',
        anchor: 'start',
        dx: 5,
        fontWeight: 600,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Week' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Unemployed (thousands)' },
    },
    color: {
      range: colors,
    },
    margin: { right: 112 },
  })
}

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Unemployment by industry with direct end labels',
)

function lastBySeries(
  rows: readonly MultiLineDatum[],
): readonly MultiLineDatum[] {
  return Array.from(group(rows, (row) => row.industry).values(), (groupRows) =>
    groupRows.at(-1),
  ).filter((row): row is MultiLineDatum => row !== undefined)
}
