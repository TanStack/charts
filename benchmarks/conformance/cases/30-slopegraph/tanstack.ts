import { defineChart, dot, lineY, text } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import { slopeData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const categories = [
  'Query',
  'Router',
  'Table',
  'Form',
  'Start',
  'Virtual',
  'Store',
  'DB',
]
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

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = slopeData(input.revision)
    const labels = rows.filter((row) => row.period === 'After')
    return {
      marks: [
        lineY(rows, {
          x: 'period',
          y: 'value',
          z: 'category',
          key: 'id',
        }),
        dot(rows, {
          x: 'period',
          y: 'value',
          z: 'category',
          key: 'id',
          r: 3,
        }),
        text(labels, {
          x: 'period',
          y: 'value',
          text: 'category',
          z: 'category',
          key: 'id',
          dx: 6,
          anchor: 'start',
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(['Before', 'After'])
          .paddingInner(0.2)
          .paddingOuter(0.08),
      },
      y: {
        scale: scaleLinear().domain([0, 70]),
        grid: true,
        label: 'Value',
      },
      color: {
        scale: scaleOrdinal<string, string>().domain(categories).range(colors),
      },
      margin: { right: 76 },
    }
  })

export const mount = tanstackMount(definition, 'Two-period slopegraph')
