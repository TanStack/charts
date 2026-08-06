import { defineChart, lineY, select, text } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import type { ConformanceInput } from '../../types'
import { tanstackCase } from '../../shared/mount'
import { selectMultiLineData } from './selection'
import type { MultiLineDatum } from './selection'

const colors = ['#2563eb', '#ea580c', '#059669']

export const multiLineEndLabelsDefinition = (
  rows: readonly MultiLineDatum[],
) => {
  const endpoints = select(rows, {
    by: 'industry',
    value: ({ datum }) => datum.date.getTime(),
    select: 'max',
  })

  return defineChart({
    marks: [
      lineY(rows, {
        id: 'industry-lines',
        x: 'date',
        y: 'unemployed',
        color: 'industry',
        strokeWidth: 2.25,
      }),
      text(endpoints, {
        id: 'industry-end-labels',
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

const definition = (input: ConformanceInput) =>
  multiLineEndLabelsDefinition(selectMultiLineData(industries, input.revision))

export const catalogCase = tanstackCase(
  definition,
  'Unemployment by industry with direct end labels',
)

export const mount = catalogCase.mount
