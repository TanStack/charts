import { citywages } from '@charts-poc/demo-data/citywages'
import { defineChart, dot, lineY, select, text } from '@tanstack/charts'
import { fold } from '@tanstack/charts/transform/fold'
import { scaleBand, scaleLinear } from 'd3-scale'
import { wageFields, wageYear } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = [
  '#2563eb',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#ca8a04',
  '#64748b',
]

export const slopegraphDefinition = (input: ConformanceInput) => {
  const source = citywages.slice(input.revision * 4, input.revision * 4 + 8)
  const rows = fold(source, {
    fields: wageFields,
    as: { key: 'wageField', value: 'inequality' },
  })
  const labels = select(rows, {
    by: 'Metro',
    select: 'last',
  })

  return defineChart({
    marks: [
      lineY(rows, {
        id: 'metro-lines',
        x: ({ wageField }) => wageYear(wageField),
        y: 'inequality',
        color: 'nyt_display',
        key: ({ Metro, wageField }) => `${Metro}:${wageField}`,
      }),
      dot(rows, {
        id: 'metro-points',
        x: ({ wageField }) => wageYear(wageField),
        y: 'inequality',
        color: 'nyt_display',
        key: ({ Metro, wageField }) => `${Metro}:${wageField}`,
        r: 3,
      }),
      text(labels, {
        id: 'endpoint-labels',
        x: ({ wageField }) => wageYear(wageField),
        y: 'inequality',
        text: 'nyt_display',
        color: 'nyt_display',
        key: ({ Metro, wageField }) => `${Metro}:${wageField}`,
        dx: 6,
        anchor: 'start',
      }),
    ],
    x: {
      scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.08),
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: '90th/10th percentile wage ratio' },
    },
    color: {
      range: colors,
    },
    margin: { right: 76 },
  })
}

export const mount = tanstackMount(
  slopegraphDefinition,
  'Metropolitan wage inequality, 1980 to 2015',
)
