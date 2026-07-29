import { defineChart, dot, link } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { dumbbellData } from './data'
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

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = dumbbellData(input.revision)
  return {
    marks: [
      link(rows, {
        x1: 'desktop',
        y1: 'category',
        x2: 'mobile',
        y2: 'category',
        key: 'id',
        stroke: '#94a3b8',
        strokeWidth: 2,
      }),
      dot(rows, {
        x: 'desktop',
        y: 'category',
        key: 'id',
        fill: '#2563eb',
        r: 4,
      }),
      dot(rows, {
        x: 'mobile',
        y: 'category',
        key: 'id',
        fill: '#f97316',
        r: 4,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0, 70]),
      grid: true,
      label: 'Value',
    },
    y: {
      scale: scaleBand<string>().domain(categories).padding(0.22),
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Desktop and mobile dumbbell comparison',
  {
    format: ({ datum }) =>
      `${datum.category} · Desktop ${datum.desktop.toLocaleString(
        'en-US',
      )} · Mobile ${datum.mobile.toLocaleString('en-US')}`,
  },
)
